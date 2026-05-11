import { Component, Suspense } from 'react'
import { useLoader } from '@react-three/fiber'
import * as THREE from 'three'

const GLOBE_RADIUS = 2
const GLOBE_SEGMENTS = 64
const TEXTURE_URL = '/textures/earth_daymap.jpg'
const FALLBACK_OCEAN_COLOR = '#1e3a5f'

function TexturedSphere() {
  const texture = useLoader(THREE.TextureLoader, TEXTURE_URL)
  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS, GLOBE_SEGMENTS, GLOBE_SEGMENTS]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  )
}

function FallbackSphere() {
  return (
    <mesh>
      <sphereGeometry args={[GLOBE_RADIUS, GLOBE_SEGMENTS, GLOBE_SEGMENTS]} />
      <meshStandardMaterial color={FALLBACK_OCEAN_COLOR} />
    </mesh>
  )
}

class TextureBoundary extends Component {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  render() {
    if (this.state.failed) return <FallbackSphere />
    return (
      <Suspense fallback={<FallbackSphere />}>{this.props.children}</Suspense>
    )
  }
}

export default function Globe() {
  return (
    <TextureBoundary>
      <TexturedSphere />
    </TextureBoundary>
  )
}
