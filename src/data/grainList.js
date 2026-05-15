/**
 * Liste des 12 cereales suivies.
 * Les cles (key) correspondent aux codes GrainWatch et aux cles de grainPorts.json.
 */
export const GRAIN_LIST = [
  { key: 'wheat',     labelFr: 'Ble',       labelEn: 'Wheat',     emoji: '\u{1F33E}' },
  { key: 'corn',      labelFr: 'Mais',      labelEn: 'Corn',      emoji: '\u{1F33D}' },
  { key: 'rice',      labelFr: 'Riz',       labelEn: 'Rice',      emoji: '\u{1F35A}' },
  { key: 'soybean',   labelFr: 'Soja',      labelEn: 'Soybean',   emoji: '\u{1FAD8}' },
  { key: 'sugar',     labelFr: 'Sucre',     labelEn: 'Sugar',     emoji: '\u{1F36C}' },
  { key: 'barley',    labelFr: 'Orge',      labelEn: 'Barley',    emoji: '\u{1F33E}' },
  { key: 'oats',      labelFr: 'Avoine',    labelEn: 'Oats',      emoji: '\u{1F33E}' },
  { key: 'sorghum',   labelFr: 'Sorgho',    labelEn: 'Sorghum',   emoji: '\u{1F33E}' },
  { key: 'rapeseed',  labelFr: 'Colza',     labelEn: 'Rapeseed',  emoji: '\u{1F33B}' },
  { key: 'groundnut', labelFr: 'Arachide',  labelEn: 'Groundnut', emoji: '\u{1F95C}' },
  { key: 'lentils',   labelFr: 'Lentilles', labelEn: 'Lentils',   emoji: '\u{1FAD8}' },
  { key: 'millet',    labelFr: 'Mil',       labelEn: 'Millet',    emoji: '\u{1F33E}' },
]

/** Lookup rapide par cle */
export const GRAIN_BY_KEY = Object.fromEntries(GRAIN_LIST.map((g) => [g.key, g]))
