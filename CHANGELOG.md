# Changelog

All notable changes to GrainTrack3D are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/).

## [1.3.1] — 2026-05-19

Enrichissement de la base ports/céréales suite à un scan AIS multi-zones de 5 minutes.

### Added

- **16 nouveaux ports céréaliers** dans `src/data/grainPorts.json`, vérifiés via recherches web :
  - **Hub agribulk Europe du Nord** : Antwerp (BEANR), Ghent (BEGNE), Vlissingen (NLVLI), Bremen (DEBRE), Le Havre (FRLEH), Emden (DEEME)
  - **Baltique** : Gdansk (PLGDN), Klaipeda (LTKLJ), Szczecin (PLSZZ)
  - **Méditerranée** : Valencia (ESVLC), Barcelona (ESBCN), Genoa (ITGOA), Trieste (ITTRS), Piraeus (GRPIR)
  - **Moyen-Orient** : Haifa (ILHFA) — Dagon grain terminal (70 % imports IL)
  - **Amérique du Nord** : Tuxpan (MXTUX) — port céréalier côté Golfe du Mexique
- **Script `analyze-destinations.mjs` multi-zones** — argument `--zones all|<csv>` qui mappe vers les bboxes définies dans `maritimeZones.js`. Le rapport affiche désormais les zones scannées en tête.

### Changed

- **Alias `FRURO` ajouté à Rouen** sur les 3 entrées existantes (typo récurrente observée dans le flux AIS pour FRROU).
- **Taux de couverture du matching** : passé de **21 % à 38 %** en messages sur un scan 8-zones × 300 s.

### Fixed

- **Faux positif Haifa → FISHFARMS** — l'alias court `HFA` matchait la sous-chaîne "HFA" présente dans "FIS**HFA**RMS" via la règle de matching par inclusion. Remplacé par `IL HFA` (forme avec espace observée dans les destinations AIS réelles). La règle `length <= 2` du matcher ne couvrait pas les alias 3 caractères.

### Notes

- Aucune nouvelle dépendance npm.
- Sources web consultées : sites officiels des autorités portuaires (Port of Antwerp-Bruges, North Sea Port, Port Gdansk, Valenciaport, HAROPA, etc.), USDA AMS pour Tuxpan, Wikipedia pour les UN/LOCODES.
- 813 destinations uniques collectées sur le scan post-enrichissement, 574 restent non couvertes (placeholders AIS "ORDER"/"FOR ORDERS"/"FISHFARMS" majoritairement).

## [1.3.0] — 2026-05-19

### Added
- Multi-zone geographic selector: 8 maritime zones (Atlantique Nord, Méditerranée, Mer Noire, Mer du Nord & Baltique, Golfe du Mexique & Caraïbes, Golfe Persique & Mer d'Arabie, Asie du Sud-Est, Océan Indien Ouest)
- Zone selection persisted in localStorage, max 3 simultaneous zones
- WebSocket reconnects automatically with new BoundingBoxes on zone change (intentional close pattern)
- Welcome toast on first launch explaining default zone and how to change it
- SummaryBanner shows active zone name(s) with tooltip for multi-zone detail
- Zone picker accessible via toolbar menu "🌍 Zones maritimes"
- Mobile-responsive zone picker (fullscreen with back bar)

### Changed
- useAISStream now reads dynamic BoundingBoxes from Zustand store instead of hardcoded BBOX constant
- Zustand store: added selectedZones state with localStorage read/write
- SummaryBanner: added zone label display with pointer-events: auto for tooltip

## [1.2.0] — 2026-05-18

Étape 7 : améliorations UX (fiabilité du matching, rotation auto, bandeau synthèse, export snapshot) et correctif Google Translate.

### Added

- **Badges céréales à opacité variable** — chaque badge `.grain-match` de l'InfoPanel reflète désormais la fiabilité du matching port/céréale : opacité 1 (port spécialisé, 1-2 céréales), 0.7 (port mixte, 3-5), 0.4 (port généraliste 6+ ou alias court ≤3 caractères). `getMatchingGrains()` retourne `{ grainKey, confidence }` ; nouvel index lazy `getPortGrainCount()` dans `portMatcher.js`.
- **Auto-rotation du globe** — rotation lente automatique au démarrage (`autoRotateSpeed=0.5`), stoppée définitivement au premier `pointerdown` / `wheel` sur le `<Canvas>` (one-shot, ne reprend jamais).
- **SummaryBanner** — bandeau pill centré en haut avec compteur temps réel (`● N vraquiers 🌾 Blé en transit`), pulse vert via la keyframe `hud-pulse` existante, `pointer-events: none` pour ne pas bloquer le globe.
- **Toolbar extensible bottom-right** — conteneur flex column accueillant les futures actions. Premier bouton `📷 Snapshot` exporte simultanément PNG (`canvas.toBlob`) + CSV (10 colonnes, échappement RFC 4180, respecte le filtre `selectedGrain` actif). La toolbar se décale à `right: 340px` quand l'InfoPanel est ouvert (transition 220ms synchro avec le slide du panneau).

### Changed

- **HUD allégé** — compteur de vraquiers et badge céréale retirés (désormais portés par le SummaryBanner). Le HUD ne contient plus que la pastille de statut, le label et la version.
- **`<Canvas>`** — `gl={{ preserveDrawingBuffer: true }}` ajouté ; indispensable pour que `canvas.toBlob()` capture un PNG non-transparent.

### Fixed

- **Google Translate crashe React** — `translate="no"` sur `<html>` + `<meta name="google" content="notranslate" />` dans `index.html`. Empêche les extensions de traduction de muter le DOM géré par React (erreur `insertBefore` NotFoundError sur Chrome).

### Removed

- Classes CSS inutilisées `.hud-count strong` et `.hud-grain-badge` (et leur section de commentaire) supprimées de `src/index.css`.

### Notes

- Aucune nouvelle dépendance npm.
- API publique de `matchShipToGrain(ship, grainKey)` inchangée (booléen) — `GrainSelector`, filtrage `ShipMarkers` et paramètre URL `?grain=xxx` continuent de fonctionner.

## [1.1.1] — 2026-05-18

Security hardening audit — 5 correctifs défensifs.

### Fixed

- **Coordinate bounds validation** — `aisParser.js` rejette désormais les positions hors bornes géographiques (lat ±90, lon ±180) en plus du check `Number.isFinite`
- **Unbounded state growth** — `useShipStore.js` plafonne le Map `ships` à 5 000 entrées (éviction LRU des plus anciens) et le Set `blacklist` à 10 000 entrées (purge FIFO)
- **Infinite reconnection loop** — `useAISStream.js` limite les tentatives de reconnexion WebSocket à 50 max, puis bascule en statut `error` au lieu de boucler indéfiniment
- **Missing security headers** — `vercel.json` inclut désormais CSP (`connect-src` restreint à `wss://stream.aisstream.io`), `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN` (compatible iframe GrainWatch), `X-XSS-Protection`, `Referrer-Policy`

### Security

- Audit complet 4 couches (clé API, WebSocket, frontend React, déploiement Vercel)
- Couches 1 et 4 conformes — aucun correctif nécessaire
- Couches 2 et 3 — 5 défenses manquantes corrigées (aucune faille exploitable, mais hardening préventif)

## [1.1.0] — 2026-05-15

Étape 6 : filtre céréales par port de destination AIS.

### Added

- **Grain filter** — dropdown selector with 12 grains (wheat, corn, rice, soybean, sugar, barley, oats, sorghum, rapeseed, groundnut, lentils, millet) and a "Toutes les céréales" option to display all vessels
- **Port database** — `src/data/grainPorts.json` with ~130 worldwide ports mapped to grain commodities (UNLOCODE, country, aliases, role: export/import/both)
- **Bidirectional destination matching** — `src/utils/portMatcher.js` normalizes AIS destination strings and matches against port aliases, tolerant of abbreviations and free-text
- **HUD enhancement** — filtered vessel count and active grain badge when a filter is selected
- **InfoPanel "Céréales probables" section** — lists all grain commodities matching the selected vessel's destination
- **URL parameter `?grain=xxx`** — pre-selects the grain filter on load for integration with GrainWatch
- **Maintenance tool** — `scripts/analyze-destinations.mjs` (Node 22+ native WebSocket) connects to AIS, collects bulk-carrier destinations, and reports coverage rate plus uncovered destinations as candidates to enrich `grainPorts.json`

### Changed

- `src/stores/useShipStore.js` — added `selectedGrain` state and `setSelectedGrain` action
- `src/components/ShipMarkers.jsx` — instanced rendering now iterates over a `useMemo` filtered list; no instance churn, only matrices and `count` updated
- `src/App.jsx` — reads `?grain=xxx` URL parameter at mount and renders the `<GrainSelector />` overlay

### Notes

- Zero new npm dependencies — pure client-side filtering on existing store data
- AIS `destination` is free-text typed by crews, so matching is approximate by design (false negatives are acceptable)
- Default behavior preserved: with no filter and no URL parameter, all vessels are displayed

## [1.0.0] — 2026-05-13

First public release. Real-time 3D tracking of bulk carrier vessels, deployed on Vercel.

### Added

- **3D Globe** — interactive Earth with NASA Blue Marble texture (5400x2700), orbit controls, zoom (2.5x-10x)
- **Real-time AIS tracking** — WebSocket connection to AISStream.io, filtered for bulk carriers (ship types 70-79)
- **Vessel markers** — InstancedMesh rendering for 600+ simultaneous vessels, emissive green material
- **Info panel** — slide-in panel (320px) with vessel name, MMSI, speed, course, heading, destination, position, last signal
- **HUD** — live vessel count, connection status badge (5 states with pulse animation)
- **Click interaction** — custom raycaster with enlarged hitbox (0.04 radius) for reliable vessel selection
- **Auto-reconnect** — exponential backoff (1s to 30s), reset after 5s stable connection
- **Stale pruning** — vessels with no signal for 30 minutes are automatically removed
- **Vessel promotion system** — positions buffered in `pendingPositions` until vessel type is confirmed via `ShipStaticData`
- **Vercel deployment** — serverless function (`api/ais-config.js`) serves API key securely, SPA routing via `vercel.json`
- **Technical documentation** — architecture doc, Vercel deployment guide

### Security

- API key stored in Vercel server-side environment variables
- Key served via HTTPS-only serverless function, never in client bundle
- `.env` in `.gitignore`, `.env.example` provided for developer onboarding

### Known Issues

- LibreWolf browser not supported (WebGL and external WebSocket blocked by default)
