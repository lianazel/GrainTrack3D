# GrainTrack3D

## Contexte

Application de tracking maritime 3D en temps réel.
Suivi des vraquiers céréaliers (codes AIS 70-79) sur un globe interactif.
Première app de l'écosystème CargoSphere (MIT).
Sites liés : GrainWatch (déployé sur GitHub Pages), FuelMapPrice, FuelMapStock.

GrainWatch = suivi des prix agricoles (Vanilla JS, Chart.js, GitHub Pages).
GrainTrack3D = carte 3D des cargos céréaliers en mouvement (React, Three.js, Vercel).
À terme, GrainTrack3D sera intégré comme composant/iframe dans GrainWatch.

## Stack technique

- React 19 + Vite 8
- Three.js + React Three Fiber (@react-three/fiber) + @react-three/drei
- Zustand (state management global — navires, UI, sélection)
- d3-geo (conversion lat/lon → coordonnées 3D sur sphère)
- Déploiement : Vercel (front + serverless function pour proxy API)

## Dépendances à installer

```bash
npm install three @react-three/fiber @react-three/drei zustand d3-geo
```

Aucune autre dépendance n'est nécessaire pour la v1. Ne pas ajouter de librairies supplémentaires sans validation explicite du développeur.

## API AIS

- Source : AISStream.io (WebSocket wss://stream.aisstream.io/v0/stream)
- Clé API : dans .env → VITE_AIS_API_KEY (dev local uniquement)
- En production Vercel : la clé est dans les variables d'environnement côté serveur (AIS_API_KEY), jamais exposée au client
- Filtre : ShipType codes 70-79 (vraquiers/bulk carriers uniquement)
- Throttling : 1 update/seconde maximum côté React (ne pas re-render à chaque message WebSocket)
- MMSI = clé primaire unique de chaque navire (9 chiffres)
- Message type principal : "PositionReport" → contient lat, lon, speed, course, heading
- Message type secondaire : "ShipStaticData" → contient nom du navire, destination, dimensions

## Architecture des fichiers (cible v1)

```
src/
├── App.jsx                  # Layout principal : Globe + UI overlay
├── main.jsx                 # Point d'entrée React
├── components/
│   ├── Globe.jsx            # Sphère Three.js + texture NASA Blue Marble
│   ├── ShipMarkers.jsx      # Instanced meshes pour tous les navires
│   ├── ShipMarker.jsx       # Marqueur individuel (si non-instancé)
│   ├── InfoPanel.jsx        # Panneau latéral détails navire sélectionné
│   └── HUD.jsx              # Compteur navires actifs, légende, contrôles
├── stores/
│   └── useShipStore.js      # Zustand store : ships Map, selectedShip, connection status
├── hooks/
│   ├── useAISStream.js      # Hook WebSocket : connexion, parsing, throttle
│   └── useGeoPosition.js    # Hook conversion lat/lon → Vector3 sur sphère
├── utils/
│   ├── geoUtils.js          # Fonctions d3-geo : projection lat/lon → xyz
│   └── aisParser.js         # Parsing et filtrage des messages AIS
├── styles/
│   └── index.css            # Styles globaux, dark theme, panneau latéral
api/
│   └── ais-proxy.js         # Vercel serverless function : proxy WebSocket AIS
public/
│   └── textures/
│       └── earth_daymap.jpg  # Texture NASA Blue Marble (8K ou 4K)
.env                          # VITE_AIS_API_KEY=xxx (jamais commité)
.env.example                  # VITE_AIS_API_KEY=your_key_here
vercel.json                   # Config rewrites API route
```

## Règles de développement

### Sécurité
- Ne JAMAIS commiter le fichier .env
- La clé API ne doit JAMAIS apparaître dans le code source ni dans les logs console
- En production, la clé transite uniquement via la serverless function Vercel
- Toujours vérifier que .env est dans .gitignore

### Performance Three.js
- Mettre à jour les marqueurs existants plutôt que détruire/recréer (performance GPU)
- Privilégier InstancedMesh pour les marqueurs si > 50 navires simultanés
- useFrame() pour les animations — ne pas utiliser setInterval/setTimeout pour les updates visuels
- Limiter les re-renders React : séparer le state 3D (positions) du state UI (sélection, panneau)

### Flux AIS
- Toujours filtrer le flux AIS sur les codes 70-79 uniquement
- Stocker les navires dans une Map (clé = MMSI) dans Zustand, pas un array
- Throttler les updates du store à 1/seconde max
- Gérer la reconnexion automatique du WebSocket (backoff exponentiel)
- Supprimer les navires qui n'ont pas envoyé de signal depuis > 30 minutes

### Style & UX
- Dark theme par défaut (cohérent avec GrainWatch dark mode)
- Globe réaliste : texture satellite NASA Blue Marble
- Marqueurs : points verts lumineux (emissive material), pulse au survol
- Panneau de détails : slide-in depuis la droite au clic sur un navire
- Responsive : le globe occupe tout le viewport, le panneau est un overlay

## Plan de développement (étapes séquentielles)

### Étape 1 — Scaffold & Globe statique ✅ TERMINÉE
- Dépendances installées via `npm install --ignore-scripts` (three, @react-three/fiber, @react-three/drei, zustand, d3-geo)
- `src/components/Globe.jsx` : sphère rayon **R = 2**, 64 segments, `meshStandardMaterial`
- Texture NASA Blue Marble chargée via `useLoader(THREE.TextureLoader, '/textures/earth_daymap.jpg')` ; **ErrorBoundary** retombe sur un material couleur unie `#1e3a5f` si le fichier est absent. Texture commitée dans `public/textures/earth_daymap.jpg` (5400×2700, 2.5 MB).
- `src/App.jsx` : Canvas R3F plein viewport, camera `[0,0,5]` fov 50, `OrbitControls` (zoom borné 2.5–10, no pan), ambient 0.4 + directional 1.2
- `src/index.css` : `#root` → 100vw/100vh, body noir

### Étape 2 — Store Zustand & Hook WebSocket ✅ TERMINÉE
- `.env.example` créé, `.env` + `.claude/` ajoutés au `.gitignore`
- `src/utils/aisParser.js` : `parseMessage()` pur, gère `PositionReport` + `ShipStaticData`, `BULK_CARRIER_TYPES = {70..79}`, ignore `TrueHeading = 511` (= non disponible AIS)
- `src/stores/useShipStore.js` : Zustand + `subscribeWithSelector`. State = `{ ships: Map, pendingPositions: Map, blacklist: Set, connectionStatus, selectedMMSI }`. Actions = `applyBatch`, `setConnectionStatus`, `setSelectedMMSI`, `pruneStale`
- **Logique de promotion** : positions reçues avant connaissance du type → bufferisées dans `pendingPositions`. À réception de `ShipStaticData` : si type ∈ 70-79 → promotion dans `ships` (merge avec position pending) ; sinon → ajout au `blacklist`
- `src/hooks/useAISStream.js` : WebSocket vers `wss://stream.aisstream.io/v0/stream`, buffer interne (Map MMSI), flush vers store à 1 Hz, backoff exponentiel 1s→30s (reset après 5s stable), `pruneStale(30min)` toutes les 60s, warning gracieux si `VITE_AIS_API_KEY` absente
- BoundingBox actuelle (constante en haut du hook) : Atlantique Nord élargi `[[20,-100],[65,20]]`
- Helper dev : `window.__shipStore = useShipStore` (uniquement en mode DEV)

### Étape 3 — Marqueurs sur le globe ✅ TERMINÉE
- `src/utils/geoUtils.js` : `latLonToVector3(lat, lon, radius = 2)` — trigonométrie directe (pas d3-geo), Y = up. Formule : `x = R·cos(lat)·cos(lon)`, `y = R·sin(lat)`, `z = -R·cos(lat)·sin(lon)`.
- `src/components/ShipMarkers.jsx` : `<instancedMesh>` capacité 5000, `sphereGeometry` rayon 0.015, `meshStandardMaterial` emissive vert + `emissiveIntensity` ~1.5. MAJ in-place des matrices (mapping `mmsi → instanceIndex` conservé entre batches, pas de recréation de mesh).
- `src/App.jsx` : `<ShipMarkers />` intégré dans le `<Canvas>` après `<Globe />`.
- **Fix transport critique** : décodage explicite des frames WebSocket AISStream (`ws.binaryType = 'arraybuffer'` + `TextDecoder`). Sans ça, `event.data` arrivait en `Blob` et `parseMessage` retournait `null` silencieusement → globe vide en apparence sans erreur. Logs DEV ajoutés pour les erreurs serveur AIS + échantillon (≤3) de messages non reconnus.
- `scripts/ais-probe.mjs` : outil standalone Node pour diagnostiquer le flux AIS hors React (utile pour reproduire vite un problème de transport).

### Étape 4 — Interaction & panneau de détails ✅ TERMINÉE
- `src/components/InfoPanel.jsx` : panneau slide-in 320px droite (220ms), affiche nom / MMSI / shipType / vitesse / cap (COG) / heading / destination / position / `lastSeen`. Mémorise `lastShip` pour rester visible pendant l'animation de sortie.
- `src/components/HUD.jsx` : pill flottant top-left avec compteur de navires + badge connexion (5 statuts, animation `pulse` en `connecting`/`reconnecting`).
- `src/components/ShipMarkers.jsx` : handler `onClick` avec reverse map `mmsiByIndex`. **Raycast custom** (hitbox sphère rayon 0.04 par instance) car le raycast triangle-précis par défaut sur des sphères 0.015 à 8 segments rate quasi tous les clics aux distances caméra utilisées.
- `src/App.jsx` : `<Fragment>` + `onPointerMissed` (désélection sur clic dans le vide) + `<OrbitControls makeDefault />` — indispensable pour que R3F voie les `onClick` *en parallèle* des controls, sinon l'OrbitControls capture tous les pointer events.

### Étape 5 — API route Vercel & déploiement ✅ TERMINÉE
- **Production live : https://grain-track3-d.vercel.app** (647 vraquiers temps réel au déploiement initial)
- **Décision d'archi** : la clé API n'est JAMAIS injectée au build (pas de `VITE_AIS_API_KEY` côté prod). Architecture complète documentée dans `docs/architecture-etape5-vercel.md`.
- `api/ais-config.js` : serverless function Vercel, GET-only, lit `process.env.AIS_API_KEY` et renvoie `{ key }` en JSON. Header `Cache-Control: no-store`, 405 sur autre verbe, 500 générique si clé absente (ne révèle pas la cause).
- `vercel.json` : rewrite SPA `"/((?!api/).*)" → "/index.html"` (exclut explicitement `/api/*` du fallback pour que les serverless functions soient routées correctement).
- `src/hooks/useAISStream.js` : helper `fetchApiKey()` async. En dev (`import.meta.env.DEV`) → lit `import.meta.env.VITE_AIS_API_KEY`. En prod → `fetch('/api/ais-config')`. IIFE async dans le `useEffect` avant `connect()`, avec garde `unmountedRef` pour cleanup-safety. `apiKey` capturé en closure (pas de param) → `setTimeout(connect, delay)` du backoff inchangé.
- `.env.example` : documente `VITE_AIS_API_KEY` (dev) et `AIS_API_KEY` (prod, à définir dans Vercel Dashboard → Settings → Environment Variables, scope Production).
- Zéro nouvelle dépendance npm (la serverless function utilise uniquement les API Node natives).

## Release v1.0.0 ✅ EN PLACE

- `package.json` : version `1.0.0`
- `src/components/HUD.jsx` : affiche `v{APP_VERSION}` via import nommé `{ version } from '../../package.json'` (Vite tree-shake les autres clés du JSON). Style `.hud-version` discret gris clair, entre le compteur et le badge de statut.
- `README.md` : présentation publique (live demo, stack, dev local, AIS, déploiement Vercel).
- `CHANGELOG.md` : format Keep a Changelog, entrée `[1.0.0] — 2026-05-13` pour le premier déploiement public.
- Toute incrémentation future de la version : modifier `package.json` (source unique), ajouter une entrée datée dans `CHANGELOG.md`. Le HUD se met à jour automatiquement au build.

## Known issues

- **LibreWolf** : l'app ne fonctionne pas (globe noir / pas de navires). LibreWolf est un fork de Firefox orienté vie privée qui désactive par défaut WebGL et bloque les WebSocket externes (durcissement anti-fingerprinting). Pas de bug applicatif — comportement attendu côté navigateur. **Navigateurs supportés et testés** : Chrome, Edge, Firefox standard.

## Commandes utiles

```bash
npm run dev        # Serveur de dev Vite (http://localhost:5173)
npm run build      # Build production
npm run preview    # Prévisualiser le build
vercel dev         # Dev local avec serverless functions
vercel deploy      # Déployer sur Vercel
```

## Git

- Ne pas faire de commits automatiques
- Signaler quand un commit est recommandé avec un message de commit suggéré
- Les commits sont validés et exécutés par le développeur
- Convention commit messages : `feat:`, `fix:`, `chore:`, `docs:`

## Ressources textures ✅ TERMINÉE

Texture NASA Blue Marble Next Generation (décembre, topographie + bathymétrie)
téléchargée et commitée dans `public/textures/earth_daymap.jpg` (5400×2700, 2.5 MB).

Source actuelle (la page visibleearth.nasa.gov redirige désormais ici) :
- https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry
- URL JPEG directe : `https://assets.science.nasa.gov/content/dam/science/esd/eo/images/bmng/bmng-topography-bathymetry/december/world.topo.bathy.200412.3x5400x2700.jpg`
