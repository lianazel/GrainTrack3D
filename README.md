# GrainTrack3D

Real-time 3D tracking of bulk carrier vessels on an interactive globe.

**[Live Demo](https://grain-track3-d.vercel.app)** | **[GrainWatch (price monitoring)](https://lianazel.github.io/grainwatch/)**

![GrainTrack3D Globe](https://img.shields.io/badge/status-live-brightgreen) ![License MIT](https://img.shields.io/badge/license-MIT-blue) ![Version](https://img.shields.io/badge/version-1.0.0-orange)

## What is GrainTrack3D?

GrainTrack3D displays bulk carrier vessels (AIS ship types 70-79) in real time on a 3D globe. The application connects to the AISStream.io WebSocket API, filters for grain/bulk carriers only, and renders their positions as glowing markers on a NASA Blue Marble textured Earth.

Part of the **CargoSphere** ecosystem, alongside [GrainWatch](https://lianazel.github.io/grainwatch/) (agricultural commodity price tracking).

### Features

- **Real-time vessel tracking** — 600+ bulk carriers displayed simultaneously via WebSocket
- **Interactive 3D globe** — NASA Blue Marble texture, orbit controls, zoom
- **Vessel details panel** — click any marker to see name, MMSI, speed, course, heading, destination
- **Live HUD** — vessel count, connection status with auto-reconnect indicator
- **Secure API architecture** — API key served via Vercel serverless function, never exposed in client bundle
- **Auto-reconnect** — exponential backoff on WebSocket disconnection, stale vessel pruning (30 min)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite 8 |
| 3D Rendering | Three.js + React Three Fiber + Drei |
| State Management | Zustand (with subscribeWithSelector) |
| AIS Data | AISStream.io (WebSocket, real-time) |
| Deployment | Vercel (SPA + Serverless Function) |
| Geo Projection | Custom trigonometry (lat/lon to 3D sphere) |

## Quick Start

### Prerequisites

- Node.js 18+
- An AISStream.io API key (free at [aisstream.io](https://aisstream.io))

### Installation

```bash
git clone https://github.com/lianazel/GrainTrack3D.git
cd GrainTrack3D
npm install
```

### Configuration

Create a `.env` file at the root:

```
VITE_AIS_API_KEY=your_aisstream_api_key_here
```

### Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) — the globe appears, and vessels start populating within seconds.

## Architecture

```
src/
  App.jsx                  # Main layout: Globe + UI overlay
  components/
    Globe.jsx              # Three.js sphere + NASA Blue Marble texture
    ShipMarkers.jsx        # InstancedMesh for all vessel markers
    InfoPanel.jsx          # Side panel with vessel details
    HUD.jsx                # Vessel count + connection status
  stores/
    useShipStore.js        # Zustand: ships Map, selection, connection
  hooks/
    useAISStream.js        # WebSocket connection, parsing, throttle
  utils/
    geoUtils.js            # lat/lon to Vector3 conversion
    aisParser.js            # AIS message parsing and filtering
api/
  ais-config.js            # Vercel serverless: serves API key securely
```

### API Key Security

In development, the API key is loaded from `.env` via Vite. In production, it is stored in Vercel's server-side environment variables and served through a serverless function (`/api/ais-config`). The key never appears in the client bundle or source code.

See [docs/architecture-etape5-vercel.md](docs/architecture-etape5-vercel.md) for the full security architecture.

## Deployment

The app is deployed on [Vercel](https://vercel.com) with continuous deployment from the `main` branch.

See [docs/deploiement-vercel-guide.md](docs/deploiement-vercel-guide.md) for the step-by-step deployment guide.

## Browser Support

| Browser | Status |
|---|---|
| Chrome | Supported |
| Edge | Supported |
| Firefox | Supported |
| LibreWolf | Not supported (WebGL/WebSocket blocked by default) |

## Roadmap

- [x] 3D globe with NASA Blue Marble texture
- [x] Real-time AIS WebSocket connection
- [x] Vessel markers (InstancedMesh, 600+ vessels)
- [x] Vessel details panel (click interaction)
- [x] HUD with live vessel count
- [x] Vercel deployment with secure API key
- [ ] Filter by destination port
- [ ] Filter by ocean region (dynamic bounding box)
- [ ] GrainWatch integration (iframe with commodity filter)
- [ ] Grain type inference from origin/destination ports

## Contributing

Contributions are welcome! This project follows these conventions:

- **Commits**: `feat:`, `fix:`, `chore:`, `docs:`
- **No extra npm dependencies** without prior discussion
- **Security**: never commit API keys or `.env` files

## License

[MIT](LICENSE) — CargoSphere ecosystem.
