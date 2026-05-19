import { useShipStore } from '../stores/useShipStore'
import { GRAIN_LIST } from '../data/grainList'

export default function GrainSelector() {
  const selectedGrain = useShipStore((s) => s.selectedGrain)
  const setSelectedGrain = useShipStore((s) => s.setSelectedGrain)

  const handleChange = (e) => {
    const value = e.target.value
    setSelectedGrain(value || null)
  }

  return (
    <div className="grain-selector">
      <select
        value={selectedGrain ?? ''}
        onChange={handleChange}
        aria-label="Filtrer par cereale"
      >
        <option value="">Toutes les cereales</option>
        {GRAIN_LIST.map((g) => (
          <option key={g.key} value={g.key}>
            {g.emoji} {g.labelFr} ({g.labelEn})
          </option>
        ))}
      </select>
    </div>
  )
}
