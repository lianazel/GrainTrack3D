import { useShipStore } from '../stores/useShipStore'
import { version as APP_VERSION } from '../../package.json'

const STATUS_LABELS = {
  idle: 'Inactif',
  connecting: 'Connexion…',
  open: 'En ligne',
  reconnecting: 'Reconnexion…',
  error: 'Erreur',
}

export default function HUD() {
  const count = useShipStore((s) => s.ships.size)
  const status = useShipStore((s) => s.connectionStatus)

  return (
    <div className="hud" role="status" aria-live="polite">
      <span className={`hud-badge hud-badge-${status}`} aria-label={STATUS_LABELS[status] ?? status} />
      <span className="hud-count">
        <strong>{count}</strong> vraquier{count > 1 ? 's' : ''}
      </span>
      <span className="hud-version">v{APP_VERSION}</span>
      <span className="hud-status">{STATUS_LABELS[status] ?? status}</span>
    </div>
  )
}
