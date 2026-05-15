#!/usr/bin/env node
/**
 * analyze-destinations.mjs
 *
 * Outil de maintenance pour grainPorts.json.
 * Se connecte au flux AIS, collecte les destinations des vraquiers,
 * et identifie celles qui ne sont couvertes par aucune cereale.
 *
 * Usage :
 *   node scripts/analyze-destinations.mjs [duree_secondes]
 *   (defaut : 120 secondes)
 *
 * Necessite : VITE_AIS_API_KEY dans .env, Node 22+ (WebSocket natif).
 *
 * Sortie :
 *   - Top destinations non couvertes (avec frequence)
 *   - Top destinations couvertes (avec cereales matchees)
 *   - Taux de couverture global
 *   - Suggestions d'ajouts au JSON
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const envPath = resolve(__dirname, '..', '.env')
let API_KEY = ''
try {
  const envContent = readFileSync(envPath, 'utf-8')
  const match = envContent.match(/VITE_AIS_API_KEY=(.+)/)
  if (match) API_KEY = match[1].trim()
} catch {
  /* ignore */
}

if (!API_KEY) {
  console.error('Erreur : VITE_AIS_API_KEY absente dans .env')
  process.exit(1)
}

const grainPortsPath = resolve(__dirname, '..', 'src', 'data', 'grainPorts.json')
const grainPorts = JSON.parse(readFileSync(grainPortsPath, 'utf-8'))

function normalizeDestination(dest) {
  if (!dest || typeof dest !== 'string') return ''
  return dest.toUpperCase().trim().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

function matchDestination(dest) {
  const normDest = normalizeDestination(dest)
  if (!normDest) return []
  const matches = []
  for (const [grainKey, ports] of Object.entries(grainPorts)) {
    let matched = false
    for (const port of ports) {
      if (matched) break
      for (const alias of port.aliases) {
        const normAlias = normalizeDestination(alias)
        if (!normAlias) continue
        if (normAlias.length <= 2 && normDest.length > 4) continue
        if (normDest.includes(normAlias) || normAlias.includes(normDest)) {
          matches.push({ grain: grainKey, port: port.name })
          matched = true
          break
        }
      }
    }
  }
  return matches
}

const DURATION = parseInt(process.argv[2] || '120', 10) * 1000
const BOUNDING_BOX = [[20, -100], [65, 20]]
const BULK_TYPES = new Set([70, 71, 72, 73, 74, 75, 76, 77, 78, 79])

const destinations = new Map()

console.log(`Connexion au flux AIS pour ${DURATION / 1000}s...`)
console.log(`BoundingBox : ${JSON.stringify(BOUNDING_BOX)}`)
console.log()

const ws = new WebSocket('wss://stream.aisstream.io/v0/stream')
ws.binaryType = 'arraybuffer'
const decoder = new TextDecoder()

ws.addEventListener('open', () => {
  ws.send(
    JSON.stringify({
      APIKey: API_KEY,
      BoundingBoxes: [BOUNDING_BOX],
      FilterMessageTypes: ['ShipStaticData'],
    }),
  )
  console.log('Connecte. Collecte en cours...')

  setTimeout(() => {
    ws.close()
    printReport()
  }, DURATION)
})

ws.addEventListener('message', (event) => {
  try {
    const text = event.data instanceof ArrayBuffer ? decoder.decode(event.data) : event.data
    const msg = JSON.parse(text)
    const inner = msg?.Message?.ShipStaticData
    if (!inner) return
    const shipType = inner.Type
    if (!BULK_TYPES.has(shipType)) return

    const dest = typeof inner.Destination === 'string' ? inner.Destination.trim() : ''
    if (!dest) return

    const norm = normalizeDestination(dest)
    if (!norm) return

    const existing = destinations.get(norm)
    if (existing) {
      existing.count++
    } else {
      const grains = matchDestination(dest)
      destinations.set(norm, {
        raw: dest,
        count: 1,
        grains,
        covered: grains.length > 0,
      })
    }
  } catch {
    /* ignore parse errors */
  }
})

ws.addEventListener('error', () => {
  console.error('Erreur WebSocket')
})

function printReport() {
  const all = [...destinations.entries()]
    .map(([norm, d]) => ({ norm, ...d }))
    .sort((a, b) => b.count - a.count)

  const covered = all.filter((d) => d.covered)
  const uncovered = all.filter((d) => !d.covered)
  const totalMessages = all.reduce((s, d) => s + d.count, 0)
  const coveredMessages = covered.reduce((s, d) => s + d.count, 0)

  console.log('\n' + '='.repeat(70))
  console.log("RAPPORT D'ANALYSE DES DESTINATIONS AIS")
  console.log('='.repeat(70))

  console.log(`\nDestinations uniques : ${all.length}`)
  console.log(`Messages totaux      : ${totalMessages}`)
  console.log(`Couvertes            : ${covered.length} destinations (${coveredMessages} messages)`)
  console.log(`Non couvertes        : ${uncovered.length} destinations`)
  console.log(
    `Taux de couverture   : ${totalMessages ? Math.round((coveredMessages / totalMessages) * 100) : 0}% (en messages)`,
  )

  console.log('\n--- TOP 20 DESTINATIONS NON COUVERTES ---')
  uncovered.slice(0, 20).forEach((d, i) => {
    console.log(`  ${String(i + 1).padStart(2)}. "${d.raw}" (x${d.count})`)
  })

  console.log('\n--- TOP 15 DESTINATIONS COUVERTES ---')
  covered.slice(0, 15).forEach((d, i) => {
    const grainList = d.grains.map((g) => g.grain).join(', ')
    console.log(`  ${String(i + 1).padStart(2)}. "${d.raw}" -> [${grainList}] (x${d.count})`)
  })

  if (uncovered.length > 0) {
    console.log('\n--- SUGGESTIONS ---')
    console.log('Les destinations non couvertes les plus frequentes meritent')
    console.log("d'etre ajoutees a grainPorts.json si elles correspondent")
    console.log('a des ports cerealiers connus.')
    console.log('Pour chaque destination, verifier manuellement :')
    console.log("  1. S'agit-il d'un port cerealier ?")
    console.log('  2. Quelles cereales y transitent ?')
    console.log('  3. Ajouter le port + aliases dans la bonne section du JSON')
  }

  console.log('\n' + '='.repeat(70))
  process.exit(0)
}
