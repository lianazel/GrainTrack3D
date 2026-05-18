import grainPorts from '../data/grainPorts.json'

/**
 * Normalise une chaine de destination AIS :
 * uppercase, trim, collapse whitespace multiples, supprime ponctuation parasite.
 */
export function normalizeDestination(dest) {
  if (!dest || typeof dest !== 'string') return ''
  return dest
    .toUpperCase()
    .trim()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Retourne le tableau de ports pour une cereale donnee.
 * @param {string} grainKey - cle de cereale (ex: "wheat")
 * @returns {Array} tableau d'objets port, ou [] si cle inconnue
 */
export function getPortsForGrain(grainKey) {
  return grainPorts[grainKey] ?? []
}

/**
 * Recherche le premier port (et alias) qui matche la destination d'un navire
 * pour la cereale specifiee. Helper interne mutualise par matchShipToGrain
 * et getMatchingGrains.
 *
 * Strategie de matching (bidirectionnelle) :
 * - normalise destination ET chaque alias
 * - match si destination CONTIENT un alias (ex: "EN ROUTE ROUEN" contient "ROUEN")
 * - OU si un alias CONTIENT la destination (ex: alias "NEW ORLEANS" contient "ORLEANS")
 * - Ignore les alias de 2 caracteres ou moins pour eviter les faux positifs
 *   (sauf si la destination normalisee fait elle-meme 2-3 caracteres — cas des codes courts)
 *
 * @param {Object} ship - objet navire du store
 * @param {string} grainKey - cle de cereale
 * @returns {{port: Object, alias: string}|null}
 */
function findMatchingPort(ship, grainKey) {
  const dest = normalizeDestination(ship?.destination)
  if (!dest) return null

  const ports = getPortsForGrain(grainKey)
  for (const port of ports) {
    for (const alias of port.aliases) {
      const normAlias = normalizeDestination(alias)
      if (!normAlias) continue

      if (normAlias.length <= 2 && dest.length > 4) continue

      if (dest.includes(normAlias) || normAlias.includes(dest)) {
        return { port, alias: normAlias }
      }
    }
  }
  return null
}

/**
 * Teste si la destination AIS d'un navire correspond a un port connu
 * pour la cereale specifiee.
 *
 * @param {Object} ship - objet navire du store ({ destination, ... })
 * @param {string} grainKey - cle de cereale
 * @returns {boolean}
 */
export function matchShipToGrain(ship, grainKey) {
  return findMatchingPort(ship, grainKey) !== null
}

// Index lazy : pour chaque port (identifie par unlocode si dispo, sinon name),
// compte combien de cereales le referencent. Sert a evaluer la specialisation
// d'un port. Construit une seule fois au premier appel.
let _portGrainCount = null
function getPortGrainCount(port) {
  if (_portGrainCount === null) {
    _portGrainCount = new Map()
    for (const grainKey of Object.keys(grainPorts)) {
      for (const p of grainPorts[grainKey]) {
        const id = p.unlocode || p.name
        _portGrainCount.set(id, (_portGrainCount.get(id) ?? 0) + 1)
      }
    }
  }
  const id = port.unlocode || port.name
  return _portGrainCount.get(id) ?? 1
}

/**
 * Determine la fiabilite d'un match port/cereale.
 *
 * Regles (cumulatives, la plus basse l'emporte) :
 * - alias court (<= 3 caracteres, ex: "ROU", "DKK") => "low"
 *   (un code de 3 lettres a un risque eleve de collision avec du texte libre AIS)
 * - 1-2 cereales associees au port => "high" (port specialise)
 * - 3-5 cereales => "medium" (port mixte type Rotterdam)
 * - 6+ cereales => "low" (hub generaliste, matching peu informatif)
 *
 * @param {Object} port - objet port de grainPorts.json
 * @param {string} alias - alias normalise qui a matche
 * @returns {"high"|"medium"|"low"}
 */
function computeConfidence(port, alias) {
  if (alias.length <= 3) return 'low'
  const count = getPortGrainCount(port)
  if (count <= 2) return 'high'
  if (count <= 5) return 'medium'
  return 'low'
}

/**
 * Retourne la liste des cereales qui matchent la destination d'un navire,
 * accompagnees de leur niveau de fiabilite.
 * Utile pour l'InfoPanel ("Cereales probables").
 *
 * @param {Object} ship - objet navire du store
 * @returns {{grainKey: string, confidence: "high"|"medium"|"low"}[]}
 */
export function getMatchingGrains(ship) {
  const dest = normalizeDestination(ship?.destination)
  if (!dest) return []

  const matches = []
  for (const grainKey of Object.keys(grainPorts)) {
    const found = findMatchingPort(ship, grainKey)
    if (found) {
      matches.push({
        grainKey,
        confidence: computeConfidence(found.port, found.alias),
      })
    }
  }
  return matches
}
