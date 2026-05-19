#!/usr/bin/env node
/**
 * analyze-destinations.mjs
 *
 * Outil de maintenance pour grainPorts.json.
 * Se connecte au flux AIS, collecte les destinations des vraquiers,
 * et identifie celles qui ne sont couvertes par aucune cereale.
 *
 * Usage :
 *   node scripts/analyze-destinations.mjs [duree_secondes] [--zones <keys>]
 *
 *   duree_secondes : duree de collecte (defaut 120)
 *   --zones        : `all` (defaut, les 8 zones) ou liste de cles separees
 *                    par des virgules. Cles disponibles : voir MARITIME_ZONES.
 *
 * Exemples :
 *   node scripts/analyze-destinations.mjs 300
 *   node scripts/analyze-destinations.mjs 300 --zones all
 *   node scripts/analyze-destinations.mjs 120 --zones mediterranean
 *   node scripts/analyze-destinations.mjs 300 --zones mediterranean,black-sea,persian-gulf
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
import { MARITIME_ZONES } from '../src/data/maritimeZones.js'

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

// Parsing CLI : duree positionnelle + --zones <keys>|<key1>=<key2>...
// Format tolerant : --zones X ou --zones=X. Tout argument non reconnu est
// considere positionnel (la duree est le 1er positionnel).
function parseArgs(argv) {
  const args = argv.slice(2)
  const positional = []
  let zonesArg = null
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--zones') {
      zonesArg = args[++i] ?? null
    } else if (a.startsWith('--zones=')) {
      zonesArg = a.slice('--zones='.length)
    } else {
      positional.push(a)
    }
  }
  return { positional, zonesArg }
}

const { positional, zonesArg } = parseArgs(process.argv)
const DURATION = parseInt(positional[0] || '120', 10) * 1000

// Resolution des zones : 'all' (defaut) ou liste CSV de cles. Toute cle inconnue
// fait sortir le script avec un message explicite pour eviter de scanner
// silencieusement une zone vide.
const zonesValue = zonesArg ?? 'all'
let selectedZoneKeys
if (zonesValue === 'all') {
  selectedZoneKeys = MARITIME_ZONES.map((z) => z.key)
} else {
  selectedZoneKeys = zonesValue.split(',').map((s) => s.trim()).filter(Boolean)
}

if (selectedZoneKeys.length === 0) {
  console.error('Erreur : aucune zone selectionnee. Utiliser --zones all ou --zones <key1,key2>.')
  process.exit(1)
}

const resolvedZones = selectedZoneKeys.map((key) => {
  const z = MARITIME_ZONES.find((zone) => zone.key === key)
  if (!z) {
    console.error(`Erreur : zone inconnue "${key}".`)
    console.error(`Zones disponibles : ${MARITIME_ZONES.map((zone) => zone.key).join(', ')}`)
    process.exit(1)
  }
  return z
})

const BOUNDING_BOXES = resolvedZones.map((z) => z.bbox)
const BULK_TYPES = new Set([70, 71, 72, 73, 74, 75, 76, 77, 78, 79])

const destinations = new Map()

console.log(`Connexion au flux AIS pour ${DURATION / 1000}s...`)
console.log(`Zones (${resolvedZones.length}) :`)
for (const z of resolvedZones) {
  console.log(`  - ${z.key.padEnd(20)} ${z.label}`)
}
console.log()

const ws = new WebSocket('wss://stream.aisstream.io/v0/stream')
ws.binaryType = 'arraybuffer'
const decoder = new TextDecoder()

ws.addEventListener('open', () => {
  ws.send(
    JSON.stringify({
      APIKey: API_KEY,
      BoundingBoxes: BOUNDING_BOXES,
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

  console.log(`\nZones scannees       : ${resolvedZones.map((z) => z.key).join(', ')}`)
  console.log(`Destinations uniques : ${all.length}`)
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
