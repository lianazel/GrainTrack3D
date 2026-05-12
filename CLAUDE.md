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
- Texture NASA Blue Marble chargée via `useLoader(THREE.TextureLoader, '/textures/earth_daymap.jpg')` ; **ErrorBoundary** retombe sur un material couleur unie `#1e3a5f` si le fichier est absent (texture à déposer manuellement)
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

### Étape 3 — Marqueurs sur le globe (À FAIRE)

**Forme du store à consommer** (fixée par étape 2) :
- `ships: Map<mmsi, { mmsi, lat, lon, speed, course, heading, name, destination, shipType, lastSeen }>`
- Sélecteur Zustand à privilégier : `useShipStore(state => state.ships)` ; renvoie une nouvelle `Map` à chaque batch (1×/s max grâce au throttle hook)

**Travail à faire** :
- `src/utils/geoUtils.js` : fonction `latLonToVector3(lat, lon, radius = 2)` utilisant d3-geo ou trigonométrie directe. Convention sphère Three.js : Y = up. Formule standard : `x = R·cos(lat)·cos(lon)`, `y = R·sin(lat)`, `z = -R·cos(lat)·sin(lon)` (signe Z dépend de l'orientation de la texture — à valider visuellement avec des points de référence connus, ex. Rotterdam ≈ 51.95°N 4.14°E, New Orleans ≈ 29.95°N -90.07°W).
- `src/components/ShipMarkers.jsx` : lit `ships` depuis le store, place les marqueurs en 3D.
  - **Performance** : si > 50 navires simultanés → utiliser `<instancedMesh>` (cf. règle CLAUDE.md "Performance Three.js"). Sinon, mesh individuel acceptable. Avec la bbox actuelle (Atlantique Nord, vraquiers céréaliers), on devrait dépasser 50 → prévoir InstancedMesh dès le départ.
  - Matériau : `meshStandardMaterial` avec `emissive` vert lumineux + `emissiveIntensity` (~1.5), géométrie sphère petite (ex: `sphereGeometry` rayon 0.015).
  - **MAJ in-place** : à chaque batch, mettre à jour les `matrix` des instances existantes plutôt que recréer le mesh (règle CLAUDE.md). Conserver un mapping `mmsi → instanceIndex`.
- Intégrer `<ShipMarkers />` dans `App.jsx` à l'intérieur du `<Canvas>`, après `<Globe />`.

**Validation** :
- Visuellement : les marqueurs apparaissent à des positions plausibles (clusters aux routes maritimes connues, ports majeurs visibles).
- Pas de drop de FPS : ouvrir devtools → Performance, viser 60 fps même avec >100 marqueurs.
- Désactiver/réactiver le `.env` (= simuler perte de flux) : les marqueurs existants restent affichés, prune après 30 min.

### Étape 4 — Interaction & panneau de détails
- Clic sur un marqueur → setSelectedShip dans le store
- Créer InfoPanel.jsx (affiche nom, MMSI, vitesse, cap, destination)
- Animation slide-in/out du panneau
- HUD.jsx : compteur de navires actifs

### Étape 4 — Interaction & panneau de détails
- Clic sur un marqueur → setSelectedShip dans le store
- Créer InfoPanel.jsx (affiche nom, MMSI, vitesse, cap, destination)
- Animation slide-in/out du panneau
- HUD.jsx : compteur de navires actifs

### Étape 5 — API route Vercel & déploiement
- Créer api/ais-proxy.js (serverless function qui proxie vers AISStream)
- Configurer vercel.json (rewrites)
- Adapter le hook WebSocket pour utiliser l'API route en production
- Tester localement avec `vercel dev`
- Déployer sur Vercel

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

## Ressources textures

La texture NASA Blue Marble peut être téléchargée depuis :
- https://visibleearth.nasa.gov/images/73909/december-blue-marble-next-generation-w-topography-and-bathymetry
- Format recommandé : JPEG, résolution 4096x2048 minimum
- Placer dans public/textures/earth_daymap.jpg
