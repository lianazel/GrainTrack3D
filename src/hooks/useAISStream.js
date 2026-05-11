import { useEffect, useRef } from 'react'
import { useShipStore } from '../stores/useShipStore'
import { parseMessage } from '../utils/aisParser'

const AIS_URL = 'wss://stream.aisstream.io/v0/stream'
const BBOX = [[20, -100], [65, 20]]
const FLUSH_INTERVAL_MS = 1000
const PRUNE_INTERVAL_MS = 60_000
const STALE_AGE_MS = 30 * 60 * 1000
const BACKOFF_MIN_MS = 1000
const BACKOFF_MAX_MS = 30_000
const STABLE_OPEN_MS = 5000

export function useAISStream() {
  const bufferRef = useRef({ positions: new Map(), statics: new Map() })
  const socketRef = useRef(null)
  const backoffRef = useRef(BACKOFF_MIN_MS)
  const reconnectTimerRef = useRef(null)
  const openSinceRef = useRef(0)
  const unmountedRef = useRef(false)

  useEffect(() => {
    const apiKey = import.meta.env.VITE_AIS_API_KEY
    const setStatus = useShipStore.getState().setConnectionStatus
    const applyBatch = useShipStore.getState().applyBatch
    const pruneStale = useShipStore.getState().pruneStale

    if (!apiKey) {
      console.warn(
        '[AIS] VITE_AIS_API_KEY manquante. Cr\u00e9e un fichier .env \u00e0 la racine ' +
          'avec ta cl\u00e9 AISStream.io (voir .env.example). Aucune connexion ne sera tent\u00e9e.',
      )
      setStatus('error')
      return
    }

    unmountedRef.current = false

    const connect = () => {
      if (unmountedRef.current) return
      setStatus('connecting')
      const ws = new WebSocket(AIS_URL)
      socketRef.current = ws

      ws.addEventListener('open', () => {
        openSinceRef.current = Date.now()
        setStatus('open')
        ws.send(
          JSON.stringify({
            APIKey: apiKey,
            BoundingBoxes: [BBOX],
            FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
          }),
        )
        if (import.meta.env.DEV) console.log('[AIS] connected')
      })

      ws.addEventListener('message', (event) => {
        const parsed = parseMessage(event.data)
        if (!parsed) return
        if (parsed.kind === 'position') {
          bufferRef.current.positions.set(parsed.mmsi, parsed.data)
        } else if (parsed.kind === 'static') {
          bufferRef.current.statics.set(parsed.mmsi, parsed.data)
        }
      })

      ws.addEventListener('close', () => {
        socketRef.current = null
        if (unmountedRef.current) return
        const wasStable = openSinceRef.current && Date.now() - openSinceRef.current > STABLE_OPEN_MS
        if (wasStable) backoffRef.current = BACKOFF_MIN_MS
        const delay = backoffRef.current
        backoffRef.current = Math.min(backoffRef.current * 2, BACKOFF_MAX_MS)
        setStatus('reconnecting')
        if (import.meta.env.DEV) console.log(`[AIS] reconnecting in ${delay}ms`)
        reconnectTimerRef.current = setTimeout(connect, delay)
      })

      ws.addEventListener('error', () => {
        // Le close handler se charge du backoff. Pas de log d\u00e9taill\u00e9 pour ne rien fuiter.
        if (import.meta.env.DEV) console.warn('[AIS] socket error')
      })
    }

    const flushInterval = setInterval(() => {
      const buf = bufferRef.current
      if (buf.positions.size === 0 && buf.statics.size === 0) return
      const batch = { positions: buf.positions, statics: buf.statics }
      bufferRef.current = { positions: new Map(), statics: new Map() }
      applyBatch(batch)
      if (import.meta.env.DEV) {
        const s = useShipStore.getState()
        console.log(
          `[AIS] flush: confirmed=${s.ships.size} pending=${s.pendingPositions.size} blacklist=${s.blacklist.size}`,
        )
      }
    }, FLUSH_INTERVAL_MS)

    const pruneInterval = setInterval(() => {
      const pruned = pruneStale(STALE_AGE_MS)
      if (pruned > 0 && import.meta.env.DEV) console.log(`[AIS] pruned ${pruned} stale entries`)
    }, PRUNE_INTERVAL_MS)

    connect()

    return () => {
      unmountedRef.current = true
      clearInterval(flushInterval)
      clearInterval(pruneInterval)
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
      setStatus('idle')
    }
  }, [])
}
