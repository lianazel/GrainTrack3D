import { useMemo } from 'react'
import { useShipStore } from '../stores/useShipStore'
import { GRAIN_BY_KEY } from '../data/grainList'
import { matchShipToGrain } from '../utils/portMatcher'
import { version as APP_VERSION } from '../../package.json'

const STATUS_LABELS = {
  idle: 'Inactif',
  connecting: 'Connexion…',
  open: 'En ligne',
  reconnecting: 'Reconnexion…',
  error: 'Erreur',
}

export default function HUD() {
  const ships = useShipStore((s) => s.ships)
  const selectedGrain = useShipStore((s) => s.selectedGrain)
  const status = useShipStore((s) => s.connectionStatus)

  const filteredCount = useMemo(() => {
    if (!selectedGrain) return ships.size
    let count = 0
    for (const ship of ships.values()) {
      if (matchShipToGrain(ship, selectedGrain)) count++
    }
    return count
  }, [ships, selectedGrain])

  const grainInfo = selectedGrain ? GRAIN_BY_KEY[selectedGrain] : null

  return (
    <div className="hud" role="status" aria-live="polite">
      <span className={`hud-badge hud-badge-${status}`} aria-label={STATUS_LABELS[status] ?? status} />
      <span className="hud-count">
        <strong>{filteredCount}</strong> vraquier{filteredCount > 1 ? 's' : ''}
        {grainInfo && (
          <span className="hud-grain-badge">
            {' '}{grainInfo.emoji} {grainInfo.labelFr}
          </span>
        )}
      </span>
      <span className="hud-version">v{APP_VERSION}</span>
      <span className="hud-status">{STATUS_LABELS[status] ?? status}</span>
    </div>
  )
}
