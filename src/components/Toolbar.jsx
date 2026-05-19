import { useState } from 'react'
import { useShipStore } from '../stores/useShipStore'
import { matchShipToGrain } from '../utils/portMatcher'
import { GRAIN_BY_KEY } from '../data/grainList'
import AboutScreen from './AboutScreen'

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

// Echappement Markdown : protege le delimiteur de cellule | et neutralise
// les sauts de ligne qui casseraient le tableau.
function mdCell(v) {
  if (v == null) return ''
  return String(v).replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}

function exportPNG(date) {
  const canvas = document.querySelector('canvas')
  if (!canvas) return
  // iOS Safari interprete le PNG a fond transparent comme blanc dans Photos
  // et l'apercu. On compose le canvas WebGL sur un fond opaque noir (couleur
  // du body sous le globe) pour obtenir un rendu coherent multi-plateforme.
  const out = document.createElement('canvas')
  out.width = canvas.width
  out.height = canvas.height
  const ctx = out.getContext('2d')
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, out.width, out.height)
  ctx.drawImage(canvas, 0, 0)
  out.toBlob((blob) => {
    if (blob) downloadBlob(blob, `graintrack3d-${date}.png`)
  }, 'image/png')
}

function exportMarkdown(ships, selectedGrain, date) {
  const list = selectedGrain
    ? [...ships.values()].filter((s) => matchShipToGrain(s, selectedGrain))
    : [...ships.values()]

  const grainInfo = selectedGrain ? GRAIN_BY_KEY[selectedGrain] : null
  const title = grainInfo
    ? `# GrainTrack3D — ${date} — ${list.length} vraquiers (${grainInfo.emoji} ${grainInfo.labelFr})`
    : `# GrainTrack3D — ${date} — ${list.length} vraquiers`

  const header = '| MMSI | Nom | Type | Lat | Lon | Vitesse | Cap | Destination |'
  const sep = '| --- | --- | --- | --- | --- | --- | --- | --- |'
  const rows = list.map((s) =>
    `| ${[
      mdCell(s.mmsi),
      mdCell(s.name ?? ''),
      mdCell(s.shipType ?? ''),
      Number.isFinite(s.lat) ? mdCell(s.lat.toFixed(3)) : '',
      Number.isFinite(s.lon) ? mdCell(s.lon.toFixed(3)) : '',
      Number.isFinite(s.speed) ? mdCell(s.speed.toFixed(1)) : '',
      Number.isFinite(s.course) ? mdCell(s.course.toFixed(1)) : '',
      mdCell(s.destination ?? ''),
    ].join(' | ')} |`,
  )

  const md = [title, '', header, sep, ...rows, ''].join('\n')
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' })
  downloadBlob(blob, `graintrack3d-${date}.md`)
}

export default function Toolbar() {
  const ships = useShipStore((s) => s.ships)
  const selectedGrain = useShipStore((s) => s.selectedGrain)
  // Decale la toolbar quand l'InfoPanel est ouvert pour eviter le chevauchement.
  const panelOpen = useShipStore((s) => s.selectedMMSI != null)
  const [open, setOpen] = useState(false)
  const [showAbout, setShowAbout] = useState(false)

  const handlePNG = () => {
    exportPNG(todayISODate())
    setOpen(false)
  }

  const handleMarkdown = () => {
    exportMarkdown(ships, selectedGrain, todayISODate())
    setOpen(false)
  }

  const handleAbout = () => {
    setShowAbout(true)
    setOpen(false)
  }

  return (
    <>
      <div className={`toolbar ${panelOpen ? 'toolbar-shifted' : ''}`}>
        {/* Menu rendu AVANT le bouton dans le DOM : avec flex-direction column,
            il apparait au-dessus du toggle (ouverture vers le haut, attendu
            pour un anchor bottom-right). */}
        {open && (
          <div className="toolbar-menu" role="menu">
            <button
              type="button"
              className="toolbar-menu-item"
              role="menuitem"
              onClick={handlePNG}
            >
              📷 Capture PNG
            </button>
            <button
              type="button"
              className="toolbar-menu-item"
              role="menuitem"
              onClick={handleMarkdown}
            >
              📋 Export Markdown
            </button>
            <button
              type="button"
              className="toolbar-menu-item"
              role="menuitem"
              onClick={handleAbout}
            >
              ℹ️ A propos
            </button>
          </div>
        )}
        <button
          type="button"
          className="toolbar-btn"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Menu d'export"
          onClick={() => setOpen((v) => !v)}
        >
          ⋮
        </button>
      </div>
      {showAbout && <AboutScreen onClose={() => setShowAbout(false)} />}
    </>
  )
}
