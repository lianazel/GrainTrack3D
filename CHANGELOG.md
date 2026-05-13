# Changelog

All notable changes to GrainTrack3D are documented in this file.

Format based on [Keep a Changelog](https://keepachangelog.com/).

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
