import { useShipStore } from '../stores/useShipStore'
import { MARITIME_ZONES, MAX_ZONES } from '../data/maritimeZones'

export default function ZonePicker({ onClose }) {
  const selectedZones = useShipStore((s) => s.selectedZones)
  const setSelectedZones = useShipStore((s) => s.setSelectedZones)

  const stopPropagation = (e) => e.stopPropagation()
  const selectedCount = selectedZones.length
  const limitReached = selectedCount >= MAX_ZONES

  const toggleZone = (zoneKey) => {
    const isActive = selectedZones.includes(zoneKey)
    if (isActive) {
      // Garde-fou : au moins une zone doit rester active pour qu'AISStream
      // ait quelque chose à écouter (sinon flux planétaire massif).
      if (selectedCount <= 1) return
      setSelectedZones(selectedZones.filter((k) => k !== zoneKey))
      return
    }
    if (limitReached) return
    setSelectedZones([...selectedZones, zoneKey])
  }

  return (
    <div
      className="zone-picker"
      role="dialog"
      aria-modal="true"
      aria-label="Sélection des zones maritimes"
      onClick={onClose}
    >
      <div className="zone-picker-content" onClick={stopPropagation}>
        {/* Barre mobile (visible < 600px via CSS). */}
        <button
          type="button"
          className="zone-picker-back-bar"
          onClick={onClose}
          aria-label="Retour"
        >
          ← Retour
        </button>
        {/* Bouton desktop (masqué sur mobile via CSS). */}
        <button
          type="button"
          className="zone-picker-close"
          onClick={onClose}
          aria-label="Fermer"
        >
          ×
        </button>

        <header className="zone-picker-header">
          <h1 className="zone-picker-title">Zones maritimes</h1>
          <p className="zone-picker-lede">
            Choisissez jusqu'à {MAX_ZONES} zones à suivre simultanément. Le
            changement est instantané et votre sélection est mémorisée pour les
            prochaines visites.
          </p>
        </header>

        <ul className="zone-picker-list" role="listbox" aria-multiselectable="true">
          {MARITIME_ZONES.map((zone) => {
            const active = selectedZones.includes(zone.key)
            const disabled = !active && limitReached
            const itemClasses = [
              'zone-picker-item',
              active && 'active',
              disabled && 'disabled',
            ]
              .filter(Boolean)
              .join(' ')
            return (
              <li key={zone.key}>
                <button
                  type="button"
                  className={itemClasses}
                  role="option"
                  aria-selected={active}
                  aria-disabled={disabled}
                  disabled={disabled}
                  onClick={() => toggleZone(zone.key)}
                >
                  <span className="zone-picker-check" aria-hidden="true">
                    {active ? '✓' : ''}
                  </span>
                  <span className="zone-picker-emoji" aria-hidden="true">
                    {zone.emoji}
                  </span>
                  <span className="zone-picker-label">{zone.label}</span>
                </button>
              </li>
            )
          })}
        </ul>

        {limitReached && (
          <p className="zone-picker-limit">
            {MAX_ZONES} zones maximum — décochez-en une pour en activer une autre.
          </p>
        )}
      </div>
    </div>
  )
}
