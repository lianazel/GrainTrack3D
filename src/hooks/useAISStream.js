import { useEffect, useRef } from 'react'
import { useShipStore } from '../stores/useShipStore'
import { parseMessage } from '../utils/aisParser'
import { MARITIME_ZONES } from '../data/maritimeZones'

const AIS_URL = 'wss://stream.aisstream.io/v0/stream'
const FLUSH_INTERVAL_MS = 1000
const PRUNE_INTERVAL_MS = 60_000
const STALE_AGE_MS = 30 * 60 * 1000
const BACKOFF_MIN_MS = 1000
const BACKOFF_MAX_MS = 30_000
const STABLE_OPEN_MS = 5000
const MAX_RECONNECT_ATTEMPTS = 50

// AISStream envoie ses frames en binaire (pas en texte). On force arraybuffer
// et on décode explicitement, sinon event.data est un Blob qui fait silencieusement
// échouer JSON.parse.
const TEXT_DECODER = new TextDecoder('utf-8')

// Récupère la clé AISStream. Dev : injectée par Vite via .env. Prod : servie par
// la serverless function /api/ais-config (la clé n'est jamais bundlée dans le JS).
async function fetchApiKey() {
  if (import.meta.env.DEV) {
    return import.meta.env.VITE_AIS_API_KEY
  }
  const res = await fetch('/api/ais-config')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  return data?.key
}

// Resout les keys utilisateur en bboxes AISStream. Garde-fou : si aucune zone
// connue n'est trouvée (clé corrompue dans localStorage par exemple), on retombe
// sur la première zone du catalogue pour ne pas envoyer un BoundingBoxes vide
// (AISStream renvoie alors un flux planétaire massif).
function zonesToBboxes(zoneKeys) {
  const bboxes = zoneKeys
    .map((key) => MARITIME_ZONES.find((z) => z.key === key)?.bbox)
    .filter(Boolean)
  if (bboxes.length === 0) return [MARITIME_ZONES[0].bbox]
  return bboxes
}

export function useAISStream() {
  const bufferRef = useRef({ positions: new Map(), statics: new Map() })
  const socketRef = useRef(null)
  const backoffRef = useRef(BACKOFF_MIN_MS)
  const reconnectTimerRef = useRef(null)
  const openSinceRef = useRef(0)
  const unmountedRef = useRef(false)
  const rxRef = useRef({ raw: 0, parsedPos: 0, parsedStatic: 0, sampleLogged: 0 })
  const reconnectAttemptsRef = useRef(0)
  // Flag utilisé par le close handler pour distinguer une déconnexion réseau
  // (qui doit déclencher le backoff exponentiel) d'une fermeture volontaire
  // due à un changement de zone (qui doit reconnecter immédiatement).
  const intentionalCloseRef = useRef(false)

  useEffect(() => {
    const setStatus = useShipStore.getState().setConnectionStatus
    const applyBatch = useShipStore.getState().applyBatch
    const pruneStale = useShipStore.getState().pruneStale

    unmountedRef.current = false
    let flushInterval = null
    let pruneInterval = null
    let apiKey = null
    let unsubscribeZones = null

    const connect = () => {
      if (!apiKey) return
      if (unmountedRef.current) return
      setStatus('connecting')
      const ws = new WebSocket(AIS_URL)
      ws.binaryType = 'arraybuffer'
      socketRef.current = ws

      // Lecture au moment du connect : si la sélection a changé pendant un
      // backoff, on prend la valeur courante (et pas une closure périmée).
      const bboxes = zonesToBboxes(useShipStore.getState().selectedZones)

      ws.addEventListener('open', () => {
        openSinceRef.current = Date.now()
        reconnectAttemptsRef.current = 0
        setStatus('open')
        ws.send(
          JSON.stringify({
            APIKey: apiKey,
            BoundingBoxes: bboxes,
            FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
          }),
        )
        if (import.meta.env.DEV) console.log('[AIS] connected', bboxes.length, 'bbox(es)')
      })

      ws.addEventListener('message', (event) => {
        rxRef.current.raw++
        const raw = event.data instanceof ArrayBuffer ? TEXT_DECODER.decode(event.data) : event.data
        const parsed = parseMessage(raw)
        if (parsed?.kind === 'position') {
          rxRef.current.parsedPos++
          bufferRef.current.positions.set(parsed.mmsi, parsed.data)
          return
        }
        if (parsed?.kind === 'static') {
          rxRef.current.parsedStatic++
          bufferRef.current.statics.set(parsed.mmsi, parsed.data)
          return
        }
        // Non-parsable : remonter l'info en DEV pour ne pas laisser le flux opaque.
        // AISStream renvoie ses erreurs serveur (clé invalide, bbox malformée) ainsi.
        if (import.meta.env.DEV) {
          try {
            const env = JSON.parse(raw)
            if (env && (env.error || env.Error)) {
              console.warn('[AIS] server error:', env.error || env.Error)
            } else if (rxRef.current.sampleLogged < 3) {
              rxRef.current.sampleLogged++
              console.warn('[AIS] unrecognized message sample:', env)
            }
          } catch {
            /* non-JSON, ignore */
          }
        }
      })

      ws.addEventListener('close', () => {
        socketRef.current = null
        if (unmountedRef.current) return
        // Fermeture volontaire (changement de zone) : ne pas déclencher le
        // backoff. Le subscriber rappellera connect() lui-même juste après.
        if (intentionalCloseRef.current) {
          intentionalCloseRef.current = false
          return
        }
        reconnectAttemptsRef.current++
        if (reconnectAttemptsRef.current > MAX_RECONNECT_ATTEMPTS) {
          console.warn(`[AIS] abandon après ${MAX_RECONNECT_ATTEMPTS} tentatives de reconnexion`)
          setStatus('error')
          return
        }
        const wasStable = openSinceRef.current && Date.now() - openSinceRef.current > STABLE_OPEN_MS
        if (wasStable) backoffRef.current = BACKOFF_MIN_MS
        const delay = backoffRef.current
        backoffRef.current = Math.min(backoffRef.current * 2, BACKOFF_MAX_MS)
        setStatus('reconnecting')
        if (import.meta.env.DEV) console.log(`[AIS] reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`)
        reconnectTimerRef.current = setTimeout(connect, delay)
      })

      ws.addEventListener('error', () => {
        // Le close handler se charge du backoff. Pas de log détaillé pour ne rien fuiter.
        if (import.meta.env.DEV) console.warn('[AIS] socket error')
      })
    }

    ;(async () => {
      let key
      try {
        key = await fetchApiKey()
      } catch (err) {
        if (unmountedRef.current) return
        console.warn('[AIS] échec récupération clé API:', err.message)
        setStatus('error')
        return
      }
      if (unmountedRef.current) return
      if (!key) {
        console.warn(
          '[AIS] clé API manquante. Dev : créer .env avec VITE_AIS_API_KEY (voir .env.example). ' +
            'Prod : définir AIS_API_KEY dans Vercel Dashboard. Aucune connexion ne sera tentée.',
        )
        setStatus('error')
        return
      }
      apiKey = key

      flushInterval = setInterval(() => {
        const buf = bufferRef.current
        if (buf.positions.size === 0 && buf.statics.size === 0) return
        const batch = { positions: buf.positions, statics: buf.statics }
        bufferRef.current = { positions: new Map(), statics: new Map() }
        applyBatch(batch)
        if (import.meta.env.DEV) {
          const s = useShipStore.getState()
          const rx = rxRef.current
          console.log(
            `[AIS] flush rx=${rx.raw} parsed=${rx.parsedPos}p/${rx.parsedStatic}s confirmed=${s.ships.size} pending=${s.pendingPositions.size} blacklist=${s.blacklist.size}`,
          )
        }
      }, FLUSH_INTERVAL_MS)

      pruneInterval = setInterval(() => {
        const pruned = pruneStale(STALE_AGE_MS)
        if (pruned > 0 && import.meta.env.DEV) console.log(`[AIS] pruned ${pruned} stale entries`)
      }, PRUNE_INTERVAL_MS)

      // Observer les changements de zones : ferme proprement la connexion
      // courante (sans backoff) et reconnecte avec la nouvelle bbox set. La
      // souscription est posée après la récupération de la clé pour éviter
      // qu'un changement précoce ne déclenche un connect() sans apiKey.
      unsubscribeZones = useShipStore.subscribe(
        (state) => state.selectedZones,
        () => {
          if (unmountedRef.current) return
          // Annuler un éventuel reconnect en attente.
          if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current)
            reconnectTimerRef.current = null
          }
          // Reset backoff et compteur — c'est un changement utilisateur, pas un échec réseau.
          backoffRef.current = BACKOFF_MIN_MS
          reconnectAttemptsRef.current = 0
          // Vider le buffer pour ne pas pousser des messages d'une zone qui n'est plus active.
          bufferRef.current = { positions: new Map(), statics: new Map() }
          // Fermer le socket courant en marquant la fermeture comme intentionnelle.
          if (socketRef.current) {
            intentionalCloseRef.current = true
            socketRef.current.close()
            socketRef.current = null
          }
          connect()
        },
      )

      connect()
    })()

    return () => {
      unmountedRef.current = true
      if (unsubscribeZones) unsubscribeZones()
      if (flushInterval) clearInterval(flushInterval)
      if (pruneInterval) clearInterval(pruneInterval)
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      if (socketRef.current) {
        socketRef.current.close()
        socketRef.current = null
      }
      setStatus('idle')
    }
  }, [])
}
