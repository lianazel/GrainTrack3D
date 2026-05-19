import { useMemo } from 'react'
import { useShipStore } from '../stores/useShipStore'
import { GRAIN_BY_KEY } from '../data/grainList'
import { matchShipToGrain } from '../utils/portMatcher'
import { MARITIME_ZONES } from '../data/maritimeZones'

export default function SummaryBanner() {
  const ships = useShipStore((s) => s.ships)
  const selectedGrain = useShipStore((s) => s.selectedGrain)
  const selectedZones = useShipStore((s) => s.selectedZones)

  const count = useMemo(() => {
    if (!selectedGrain) return ships.size
    let n = 0
    for (const ship of ships.values()) {
      if (matchShipToGrain(ship, selectedGrain)) n++
    }
    return n
  }, [ships, selectedGrain])

  // Suffixe zone : nom complet si une seule zone, sinon compteur. Le tooltip
  // (title) liste tous les noms en clair quand on a plusieurs zones.
  const { zoneLabel, zoneTitle } = useMemo(() => {
    if (!selectedZones || selectedZones.length === 0) {
      return { zoneLabel: '', zoneTitle: undefined }
    }
    const labels = selectedZones
      .map((key) => MARITIME_ZONES.find((z) => z.key === key)?.label)
      .filter(Boolean)
    if (labels.length === 1) {
      return { zoneLabel: labels[0], zoneTitle: undefined }
    }
    return {
      zoneLabel: `${labels.length} zones`,
      zoneTitle: labels.join(', '),
    }
  }, [selectedZones])

  const grainInfo = selectedGrain ? GRAIN_BY_KEY[selectedGrain] : null
  const plural = count > 1 ? 's' : ''

  return (
    <div className="summary-banner" role="status" aria-live="polite">
      <span className="summary-banner-dot" aria-hidden="true" />
      <span className="summary-banner-text">
        <strong>{count}</strong> vraquier{plural}
        {grainInfo ? (
          <>
            {' '}
            <span className="summary-banner-grain">
              {grainInfo.emoji} {grainInfo.labelFr}
            </span>
            {' '}en transit
          </>
        ) : (
          ' en transit'
        )}
        {zoneLabel && (
          <>
            {' — '}
            <span className="summary-banner-zone" title={zoneTitle}>
              {zoneLabel}
            </span>
          </>
        )}
      </span>
    </div>
  )
}
