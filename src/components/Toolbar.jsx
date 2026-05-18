import { useShipStore } from '../stores/useShipStore'
import { matchShipToGrain } from '../utils/portMatcher'

const CSV_HEADER =
  'MMSI,Name,ShipType,Lat,Lon,Speed,Course,Heading,Destination,LastSeen'

function todayISODate() {
  return new Date().toISOString().slice(0, 10)
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// Echappement CSV minimal RFC 4180 : double-quote englobant si le champ contient
// une virgule, un guillemet ou un saut de ligne ; les guillemets internes sont doubles.
function csvField(v) {
  if (v == null) return ''
  const s = String(v)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function exportPNG(date) {
  // Le canvas R3F est le seul <canvas> de la page. preserveDrawingBuffer=true
  // sur le <Canvas> est indispensable, sinon toBlob retourne un PNG transparent
  // (le buffer WebGL est vide hors frame de rendu).
  const canvas = document.querySelector('canvas')
  if (!canvas) return
  canvas.toBlob((blob) => {
    if (blob) downloadBlob(blob, `graintrack3d-${date}.png`)
  }, 'image/png')
}

function exportCSV(ships, selectedGrain, date) {
  const list = selectedGrain
    ? [...ships.values()].filter((s) => matchShipToGrain(s, selectedGrain))
    : [...ships.values()]

  const rows = list.map((s) =>
    [
      s.mmsi,
      s.name ?? '',
      s.shipType ?? '',
      s.lat ?? '',
      s.lon ?? '',
      s.speed ?? '',
      s.course ?? '',
      s.heading ?? '',
      s.destination ?? '',
      Number.isFinite(s.lastSeen) ? new Date(s.lastSeen).toISOString() : '',
    ]
      .map(csvField)
      .join(','),
  )

  const csv = [CSV_HEADER, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `graintrack3d-${date}.csv`)
}

export default function Toolbar() {
  const ships = useShipStore((s) => s.ships)
  const selectedGrain = useShipStore((s) => s.selectedGrain)
  // Decale la toolbar quand l'InfoPanel est ouvert pour eviter le chevauchement.
  const panelOpen = useShipStore((s) => s.selectedMMSI != null)

  const handleSnapshot = () => {
    const date = todayISODate()
    exportPNG(date)
    exportCSV(ships, selectedGrain, date)
  }

  return (
    <div className={`toolbar ${panelOpen ? 'toolbar-shifted' : ''}`}>
      <button type="button" className="toolbar-btn" onClick={handleSnapshot}>
        📷 Snapshot
      </button>
    </div>
  )
}
