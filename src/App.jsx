import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Globe from './components/Globe'
import ShipMarkers from './components/ShipMarkers'
import HUD from './components/HUD'
import InfoPanel from './components/InfoPanel'
import GrainSelector from './components/GrainSelector'
import SummaryBanner from './components/SummaryBanner'
import { useAISStream } from './hooks/useAISStream'
import { useShipStore } from './stores/useShipStore'
import { GRAIN_LIST } from './data/grainList'

if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__shipStore = useShipStore
}

export default function App() {
  useAISStream()
  const setSelected = useShipStore((s) => s.setSelectedMMSI)
  const setSelectedGrain = useShipStore((s) => s.setSelectedGrain)

  // Rotation auto au demarrage, stoppee definitivement des la 1ere interaction.
  // One-shot : on ne reprend jamais l'autoRotate apres, meme si l'utilisateur cesse d'interagir.
  const [userInteracted, setUserInteracted] = useState(false)
  const stopAutoRotate = () => setUserInteracted(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const grainParam = params.get('grain')
    if (grainParam && GRAIN_LIST.some((g) => g.key === grainParam)) {
      setSelectedGrain(grainParam)
    }
  }, [setSelectedGrain])

  return (
    <>
      <Canvas
        camera={{ position: [0, 0, 5], fov: 50 }}
        onPointerMissed={() => setSelected(null)}
        onPointerDown={stopAutoRotate}
        onWheel={stopAutoRotate}
      >
        <ambientLight intensity={0.4} />
        <directionalLight position={[5, 3, 5]} intensity={1.2} />
        <Globe />
        <ShipMarkers />
        <OrbitControls
          makeDefault
          enablePan={false}
          minDistance={2.5}
          maxDistance={10}
          autoRotate={!userInteracted}
          autoRotateSpeed={0.5}
        />
      </Canvas>
      <HUD />
      <SummaryBanner />
      <GrainSelector />
      <InfoPanel />
    </>
  )
}
