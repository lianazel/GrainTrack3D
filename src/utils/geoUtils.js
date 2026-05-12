import * as THREE from 'three'

export const GLOBE_RADIUS = 2
const DEG2RAD = Math.PI / 180

// `target` est réutilisable pour éviter d'allouer un Vector3 par navire à chaque flush.
// Signe du Z : orientation canonique d'une SphereGeometry Three.js avec texture
// equirectangulaire par défaut (méridien 0° en +X, longitude croît vers l'est).
export function latLonToVector3(lat, lon, radius = GLOBE_RADIUS, target = new THREE.Vector3()) {
  const phi = lat * DEG2RAD
  const lambda = lon * DEG2RAD
  const cosPhi = Math.cos(phi)
  target.set(
    radius * cosPhi * Math.cos(lambda),
    radius * Math.sin(phi),
    -radius * cosPhi * Math.sin(lambda),
  )
  return target
}
