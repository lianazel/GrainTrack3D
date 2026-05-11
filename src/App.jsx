import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Globe from './components/Globe'
import { useAISStream } from './hooks/useAISStream'
import { useShipStore } from './stores/useShipStore'

if (import.meta.env.DEV && typeof window !== 'undefined') {
  window.__shipStore = useShipStore
}

export default function App() {
  useAISStream()

  return (
    <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} />
      <Globe />
      <OrbitControls enablePan={false} minDistance={2.5} maxDistance={10} />
    </Canvas>
  )
}
