import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

export const useShipStore = create(
  subscribeWithSelector((set, get) => ({
    ships: new Map(),
    pendingPositions: new Map(),
    blacklist: new Set(),
    connectionStatus: 'idle',
    selectedMMSI: null,
    selectedGrain: null,

    setConnectionStatus: (status) => set({ connectionStatus: status }),

    setSelectedMMSI: (mmsi) => set({ selectedMMSI: mmsi }),

    setSelectedGrain: (grain) => set({ selectedGrain: grain }),

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
