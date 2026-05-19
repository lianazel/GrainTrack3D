import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { DEFAULT_ZONE_KEYS, STORAGE_KEY } from '../data/maritimeZones'

// Limites de sécurité — défense contre la croissance illimitée du state
const MAX_SHIPS = 5000
const MAX_BLACKLIST = 10000

// Lecture défensive de localStorage : peut throw en mode privé Firefox/Safari ou
// si l'utilisateur a désactivé le stockage local. Tout JSON invalide ou non-tableau
// retombe sur la zone par défaut pour éviter un démarrage sans aucun abonnement AIS.
function readZonesFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_ZONE_KEYS
    const parsed = JSON.parse(raw)
    if (
      Array.isArray(parsed) &&
      parsed.length > 0 &&
      parsed.every((k) => typeof k === 'string')
    ) {
      return parsed
    }
    return DEFAULT_ZONE_KEYS
  } catch {
    return DEFAULT_ZONE_KEYS
  }
}

function writeZonesToStorage(zoneKeys) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(zoneKeys))
  } catch {
    /* stockage local indisponible — la sélection reste valable pour la session */
  }
}

export const useShipStore = create(
  subscribeWithSelector((set, get) => ({
    ships: new Map(),
    pendingPositions: new Map(),
    blacklist: new Set(),
    connectionStatus: 'idle',
    selectedMMSI: null,
    selectedGrain: null,
    selectedZones: readZonesFromStorage(),

    setConnectionStatus: (status) => set({ connectionStatus: status }),

    setSelectedMMSI: (mmsi) => set({ selectedMMSI: mmsi }),

    setSelectedGrain: (grain) => set({ selectedGrain: grain }),

    // Changement de zones : on persiste le choix et on vide immédiatement les
    // navires + positions en attente. Le hook WebSocket observe selectedZones
    // et déclenche une reconnexion en arrière-plan avec la nouvelle bbox set.
    setSelectedZones: (zoneKeys) => {
      writeZonesToStorage(zoneKeys)
      set({
        selectedZones: zoneKeys,
        ships: new Map(),
        pendingPositions: new Map(),
      })
    },

    applyBatch: ({ positions, statics }) => {
      const { ships, pendingPositions, blacklist } = get()
      const nextShips = new Map(ships)
      const nextPending = new Map(pendingPositions)
      const nextBlacklist = new Set(blacklist)

      for (const [mmsi, staticData] of statics) {
        if (nextBlacklist.has(mmsi)) continue
        if (staticData.isBulkCarrier) {
          const existing = nextShips.get(mmsi)
          const pendingPos = nextPending.get(mmsi)
          const base = existing ?? pendingPos ?? {}
          nextShips.set(mmsi, {
            ...base,
            mmsi,
            name: staticData.name,
            destination: staticData.destination,
            shipType: staticData.shipType,
            lastSeen: base.lastSeen ?? Date.now(),
          })
          nextPending.delete(mmsi)
        } else {
          nextBlacklist.add(mmsi)
          nextPending.delete(mmsi)
          nextShips.delete(mmsi)
        }
      }

      for (const [mmsi, pos] of positions) {
        if (nextBlacklist.has(mmsi)) continue
        const confirmed = nextShips.get(mmsi)
        if (confirmed) {
          nextShips.set(mmsi, {
            ...confirmed,
            lat: pos.lat,
            lon: pos.lon,
            speed: pos.speed,
            course: pos.course,
            heading: pos.heading,
            lastSeen: pos.timestamp,
          })
        } else {
          nextPending.set(mmsi, {
            mmsi,
            lat: pos.lat,
            lon: pos.lon,
            speed: pos.speed,
            course: pos.course,
            heading: pos.heading,
            lastSeen: pos.timestamp,
          })
        }
      }

      // Évincer les navires les plus anciens si on dépasse MAX_SHIPS
      if (nextShips.size > MAX_SHIPS) {
        const sorted = [...nextShips.entries()].sort(
          (a, b) => (a[1].lastSeen ?? 0) - (b[1].lastSeen ?? 0),
        )
        const excess = nextShips.size - MAX_SHIPS
        for (let i = 0; i < excess; i++) nextShips.delete(sorted[i][0])
      }

      // Plafonner le blacklist (FIFO — les premières entrées insérées sont les plus anciennes)
      if (nextBlacklist.size > MAX_BLACKLIST) {
        const it = nextBlacklist.values()
        let toRemove = nextBlacklist.size - MAX_BLACKLIST
        while (toRemove-- > 0) {
          nextBlacklist.delete(it.next().value)
        }
      }

      set({
        ships: nextShips,
        pendingPositions: nextPending,
        blacklist: nextBlacklist,
      })
    },

    pruneStale: (maxAgeMs) => {
      const cutoff = Date.now() - maxAgeMs
      const { ships, pendingPositions } = get()
      const nextShips = new Map()
      const nextPending = new Map()
      let pruned = 0
      for (const [mmsi, ship] of ships) {
        if (ship.lastSeen >= cutoff) nextShips.set(mmsi, ship)
        else pruned++
      }
      for (const [mmsi, pos] of pendingPositions) {
        if (pos.lastSeen >= cutoff) nextPending.set(mmsi, pos)
        else pruned++
      }
      if (pruned > 0) {
        set({ ships: nextShips, pendingPositions: nextPending })
      }
      return pruned
    },
  })),
)
