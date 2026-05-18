import { useMemo } from 'react'
import { useShipStore } from '../stores/useShipStore'
import { GRAIN_BY_KEY } from '../data/grainList'
import { matchShipToGrain } from '../utils/portMatcher'

export default function SummaryBanner() {
  const ships = useShipStore((s) => s.ships)
  const selectedGrain = useShipStore((s) => s.selectedGrain)

  const count = useMemo(() => {
    if (!selectedGrain) return ships.size
    let n = 0
    for (const ship of ships.values()) {
      if (matchShipToGrain(ship, selectedGrain)) n++
    }
    return n
  }, [ships, selectedGrain])

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
      </span>
    </div>
  )
}
