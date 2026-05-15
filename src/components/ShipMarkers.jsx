import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useShipStore } from '../stores/useShipStore'
import { GLOBE_RADIUS, latLonToVector3 } from '../utils/geoUtils'
import { matchShipToGrain } from '../utils/portMatcher'

const MAX_INSTANCES = 5000
const MARKER_RADIUS = GLOBE_RADIUS * 1.005
const MARKER_GEOMETRY_RADIUS = 0.015
// Rayon utilisé uniquement pour le hit-testing. Plus large que la géométrie visible
// pour que les clics ne demandent pas une précision pixel. ~2.5× la taille visuelle.
const HITBOX_RADIUS = 0.04

// Buffers Three.js partagés par instancedHitboxRaycast. Une seule InstancedMesh
// utilise cette fonction, donc la mutation partagée est sans risque.
const _localMatrix = new THREE.Matrix4()
const _worldMatrix = new THREE.Matrix4()
const _hitSphere = new THREE.Sphere()
const _hitPoint = new THREE.Vector3()

// Override du raycast : test sphère/rayon par instance avec un rayon élargi.
// Three.js par défaut fait un raycast triangle-précis sur la géométrie source
// (0.015 × 8 segments = triangles minuscules) ce qui rend les clics quasi
// impossibles aux distances de caméra utilisées (~3 unités world).
function instancedHitboxRaycast(raycaster, intersects) {
  if (!this.count) return
  const matrixWorld = this.matrixWorld
  for (let i = 0; i < this.count; i++) {
    this.getMatrixAt(i, _localMatrix)
    _worldMatrix.multiplyMatrices(matrixWorld, _localMatrix)
    _hitSphere.center.setFromMatrixPosition(_worldMatrix)
    _hitSphere.radius = HITBOX_RADIUS
    if (!raycaster.ray.intersectSphere(_hitSphere, _hitPoint)) continue
    const distance = raycaster.ray.origin.distanceTo(_hitPoint)
    if (distance < raycaster.near || distance > raycaster.far) continue
    intersects.push({
      distance,
      point: _hitPoint.clone(),
      instanceId: i,
      object: this,
    })
  }
}

export default function ShipMarkers() {
  const ships = useShipStore((s) => s.ships)
  const selectedGrain = useShipStore((s) => s.selectedGrain)
  const setSelected = useShipStore((s) => s.setSelectedMMSI)
  const meshRef = useRef(null)
  const mmsiByIndexRef = useRef([])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const vec = useMemo(() => new THREE.Vector3(), [])

  const visibleShips = useMemo(() => {
    if (!selectedGrain) return [...ships.values()]
    return [...ships.values()].filter((ship) => matchShipToGrain(ship, selectedGrain))
  }, [ships, selectedGrain])

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh) return
    const map = mmsiByIndexRef.current
    let i = 0
    for (const ship of visibleShips) {
      if (i >= MAX_INSTANCES) break
      if (!Number.isFinite(ship.lat) || !Number.isFinite(ship.lon)) continue
      latLonToVector3(ship.lat, ship.lon, MARKER_RADIUS, vec)
      dummy.position.copy(vec)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      map[i] = ship.mmsi
      i++
    }
    map.length = i
    mesh.count = i
    mesh.instanceMatrix.needsUpdate = true
  }, [visibleShips, dummy, vec])

  const handleClick = (e) => {
    if (e.instanceId == null) return
    const mmsi = mmsiByIndexRef.current[e.instanceId]
    if (mmsi == null) return
    // stopPropagation : sinon onPointerMissed du Canvas peut firer dans la même frame
    // et désélectionner immédiatement.
    e.stopPropagation()
    setSelected(mmsi)
  }

  // frustumCulled=false : la bbox du mesh de base est centrée à l'origine et trompe
  // Three quand on tourne le globe, ce qui peut culler tout l'instancedMesh.
  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, MAX_INSTANCES]}
      frustumCulled={false}
      raycast={instancedHitboxRaycast}
      onClick={handleClick}
    >
      <sphereGeometry args={[MARKER_GEOMETRY_RADIUS, 8, 8]} />
      <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={1.5} />
    </instancedMesh>
  )
}
