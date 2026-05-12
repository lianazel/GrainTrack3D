// Diagnostic standalone : ouvre le WS AISStream comme le fait le hook React
// et imprime tout ce qui arrive pendant 10s. Ne logue jamais la clé API.
import { readFileSync } from 'node:fs'

const env = readFileSync('.env', 'utf8')
const apiKey = env.match(/^VITE_AIS_API_KEY=(.+)$/m)?.[1]?.trim()
if (!apiKey) {
  console.error('No VITE_AIS_API_KEY in .env')
  process.exit(1)
}

const BBOX = [
  [20, -100],
  [65, 20],
]

const ws = new WebSocket('wss://stream.aisstream.io/v0/stream')
ws.binaryType = 'arraybuffer'
const decoder = new TextDecoder()
const counts = { raw: 0, byType: {} }
const samples = []

ws.addEventListener('open', () => {
  console.log('[probe] open')
  ws.send(
    JSON.stringify({
      APIKey: apiKey,
      BoundingBoxes: [BBOX],
      FilterMessageTypes: ['PositionReport', 'ShipStaticData'],
    }),
  )
})

ws.addEventListener('message', (event) => {
  counts.raw++
  let env
  try {
    const text = event.data instanceof ArrayBuffer ? decoder.decode(event.data) : event.data
    env = JSON.parse(text)
  } catch {
    if (samples.length < 2) samples.push({ kind: 'parse-fail', raw: String(event.data).slice(0, 200) })
    return
  }
  const type = env?.MessageType ?? '(none)'
  counts.byType[type] = (counts.byType[type] ?? 0) + 1
  if (env?.error || env?.Error) {
    console.warn('[probe] server error:', env.error || env.Error)
  }
  if (samples.length < 2) {
    samples.push({ type, keys: Object.keys(env ?? {}), envelope: env })
  }
})

ws.addEventListener('close', (e) => {
  console.log(`[probe] close code=${e.code} reason=${e.reason || '(none)'}`)
})

ws.addEventListener('error', () => {
  console.warn('[probe] error event')
})

setTimeout(() => {
  console.log('[probe] counts:', counts)
  console.log('[probe] samples:')
  for (const s of samples) console.dir(s, { depth: 4 })
  ws.close()
  process.exit(0)
}, 10_000)
