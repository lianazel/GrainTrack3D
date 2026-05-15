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
 * Teste si la destination AIS d'un navire correspond a un port connu
 * pour la cereale specifiee.
 *
 * Strategie de matching (bidirectionnelle) :
 * - normalise destination ET chaque alias
 * - match si destination CONTIENT un alias (ex: "EN ROUTE ROUEN" contient "ROUEN")
 * - OU si un alias CONTIENT la destination (ex: alias "NEW ORLEANS" contient "ORLEANS")
 * - Ignore les alias de 2 caracteres ou moins pour eviter les faux positifs
 *   (sauf si la destination normalisee fait elle-meme 2-3 caracteres — cas des codes courts)
 *
 * @param {Object} ship - objet navire du store ({ destination, ... })
 * @param {string} grainKey - cle de cereale
 * @returns {boolean}
 */
export function matchShipToGrain(ship, grainKey) {
  const dest = normalizeDestination(ship?.destination)
  if (!dest) return false

  const ports = getPortsForGrain(grainKey)
  for (const port of ports) {
    for (const alias of port.aliases) {
      const normAlias = normalizeDestination(alias)
      if (!normAlias) continue

      if (normAlias.length <= 2 && dest.length > 4) continue

      if (dest.includes(normAlias) || normAlias.includes(dest)) {
        return true
      }
    }
  }
  return false
}

/**
 * Retourne la liste des cles de cereales qui matchent la destination d'un navire.
 * Utile pour l'InfoPanel ("Cereales probables").
 *
 * @param {Object} ship - objet navire du store
 * @returns {string[]} tableau de grain keys (peut etre vide)
 */
export function getMatchingGrains(ship) {
  const dest = normalizeDestination(ship?.destination)
  if (!dest) return []

  const matches = []
  for (const grainKey of Object.keys(grainPorts)) {
    if (matchShipToGrain(ship, grainKey)) {
      matches.push(grainKey)
    }
  }
  return matches
}
