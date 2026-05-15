import { useEffect, useMemo, useState } from 'react'
import { useShipStore } from '../stores/useShipStore'
import { getMatchingGrains } from '../utils/portMatcher'
import { GRAIN_BY_KEY } from '../data/grainList'

const fmtNumber = (v, digits = 1, unit = '') =>
  Number.isFinite(v) ? `${v.toFixed(digits)}${unit}` : '—'

const fmtTime = (ms) => {
  if (!Number.isFinite(ms)) return '—'
  try {
    return new Date(ms).toLocaleTimeString()
  } catch {
    return '—'
  }
}

export default function InfoPanel() {
  const ship = useShipStore((s) => (s.selectedMMSI != null ? s.ships.get(s.selectedMMSI) : null))
  const setSelected = useShipStore((s) => s.setSelectedMMSI)

  // On garde le dernier ship visible pendant l'animation de fermeture pour éviter
  // que le contenu disparaisse instantanément avant la fin du slide-out.
  const [lastShip, setLastShip] = useState(null)
  useEffect(() => {
    if (ship) setLastShip(ship)
  }, [ship])

  const open = !!ship
  const display = ship ?? lastShip

  const matchingGrains = useMemo(
    () => (display ? getMatchingGrains(display) : []),
    [display],
  )

  return (
    <aside className={`info-panel ${open ? 'open' : ''}`} aria-hidden={!open}>
      <button
        type="button"
        className="info-panel-close"
        onClick={() => setSelected(null)}
        aria-label="Fermer le panneau"
      >
        ×
      </button>
      {display && (
        <div className="info-panel-body">
          <h2 className="info-panel-name">{display.name || '(nom inconnu)'}</h2>
          <div className="info-panel-mmsi">MMSI {display.mmsi}</div>
          <div className="info-panel-type">
            Type AIS {Number.isFinite(display.shipType) ? display.shipType : '—'}
          </div>

          <dl className="info-panel-stats">
            <div>
              <dt>Vitesse</dt>
              <dd>{fmtNumber(display.speed, 1, ' nd')}</dd>
            </div>
            <div>
              <dt>Cap (COG)</dt>
              <dd>{fmtNumber(display.course, 1, '°')}</dd>
            </div>
            <div>
              <dt>Heading</dt>
              <dd>{fmtNumber(display.heading, 0, '°')}</dd>
            </div>
            <div>
              <dt>Destination</dt>
              <dd>{display.destination || '—'}</dd>
            </div>
            <div>
              <dt>Position</dt>
              <dd>
                {fmtNumber(display.lat, 3, '°')}, {fmtNumber(display.lon, 3, '°')}
              </dd>
            </div>
            <div>
              <dt>Dernier signal</dt>
              <dd>{fmtTime(display.lastSeen)}</dd>
            </div>
          </dl>

          {matchingGrains.length > 0 && (
            <div className="info-panel-grains">
              <h3 className="info-panel-grains-title">Cereales probables</h3>
              <div className="info-panel-grains-list">
                {matchingGrains.map((key) => {
                  const g = GRAIN_BY_KEY[key]
                  return g ? (
                    <span key={key} className="grain-match">
                      {g.emoji} {g.labelFr}
                    </span>
                  ) : null
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </aside>
  )
}
