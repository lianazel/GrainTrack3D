import { useShipStore } from '../stores/useShipStore'

const STATUS_LABELS = {
  idle: 'Inactif',
  connecting: 'Connexion…',
  open: 'En ligne',
  reconnecting: 'Reconnexion…',
  error: 'Erreur',
}

export default function HUD() {
  const status = useShipStore((s) => s.connectionStatus)

  return (
    <div className="hud" role="status" aria-live="polite">
      <span className={`hud-badge hud-badge-${status}`} aria-label={STATUS_LABELS[status] ?? status} />
      <span className="hud-status">{STATUS_LABELS[status] ?? status}</span>
    </div>
  )
}
