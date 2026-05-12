import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useShipStore } from '../stores/useShipStore'
import { GLOBE_RADIUS, latLonToVector3 } from '../utils/geoUtils'

const MAX_INSTANCES = 5000
const MARKER_RADIUS = GLOBE_RADIUS * 1.005
const MARKER_GEOMETRY_RADIUS = 0.015

export default function ShipMarkers() {
  const ships = useShipStore((s) => s.ships)
  const meshRef = useRef(null)
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const vec = useMemo(() => new THREE.Vector3(), [])

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    let i = 0
    for (const ship of ships.values()) {
      if (i >= MAX_INSTANCES) break
      if (!Number.isFinite(ship.lat) || !Number.isFinite(ship.lon)) continue
      latLonToVector3(ship.lat, ship.lon, MARKER_RADIUS, vec)
      dummy.position.copy(vec)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      i++
    }
    mesh.count = i
    mesh.instanceMatrix.needsUpdate = true
  }, [ships, dummy, vec])

  // frustumCulled=false : la bbox du mesh de base est centrée à l'origine et trompe
  // Three quand on tourne le globe, ce qui peut culler tout l'instancedMesh.
  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, MAX_INSTANCES]}
      frustumCulled={false}
    >
      <sphereGeometry args={[MARKER_GEOMETRY_RADIUS, 8, 8]} />
      <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={1.5} />
    </instancedMesh>
  )
}
