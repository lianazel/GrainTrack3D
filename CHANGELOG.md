# Changelog

All notable changes to GrainTrack3D are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/).

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
