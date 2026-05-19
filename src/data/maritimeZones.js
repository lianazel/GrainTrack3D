// Zones maritimes selectionnables par l'utilisateur. Les bboxes sont au format
// AISStream : [[minLat, minLon], [maxLat, maxLon]]. Le champ BoundingBoxes de
// l'abonnement WebSocket accepte un tableau, ce qui permet de couvrir plusieurs
// zones simultanement avec une seule connexion.
export const MARITIME_ZONES = [
  { key: 'atlantic-north',    label: 'Atlantique Nord',               emoji: '🌊', bbox: [[20, -100], [65, 20]] },
  { key: 'mediterranean',     label: 'Méditerranée',                  emoji: '🏛️', bbox: [[30, -6], [46, 36]] },
  { key: 'black-sea',         label: 'Mer Noire',                     emoji: '⚓', bbox: [[40, 27], [47, 42]] },
  { key: 'north-sea-baltic',  label: 'Mer du Nord & Baltique',        emoji: '🌬️', bbox: [[48, -5], [66, 30]] },
  { key: 'gulf-caribbean',    label: 'Golfe du Mexique & Caraïbes',   emoji: '🌴', bbox: [[10, -100], [32, -60]] },
  { key: 'persian-gulf',      label: 'Golfe Persique & Mer d\'Arabie', emoji: '🛢️', bbox: [[-10, 40], [32, 75]] },
  { key: 'southeast-asia',    label: 'Asie du Sud-Est',               emoji: '🐉', bbox: [[-10, 95], [25, 145]] },
  { key: 'indian-ocean-west', label: 'Océan Indien Ouest',            emoji: '🌅', bbox: [[-35, 30], [15, 80]] },
]

export const DEFAULT_ZONE_KEYS = ['atlantic-north']
export const MAX_ZONES = 3
export const STORAGE_KEY = 'graintrack3d-zones'
