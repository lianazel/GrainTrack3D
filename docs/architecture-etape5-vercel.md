# Architecture Étape 5 — Déploiement Vercel

> GrainTrack3D | Date : 2026-05-13 | Statut : À implémenter

## Problématique

L'application se connecte en WebSocket à AISStream.io, ce qui nécessite une clé API. En dev local, la clé est dans `.env` via `VITE_AIS_API_KEY`. En production, cette approche injecterait la clé dans le bundle JS (visible par n'importe qui dans le code source du navigateur).

Objectif : la clé API ne doit jamais apparaître dans le code source déployé ni dans le bundle JS.

## Décision d'architecture

**Approche retenue : serverless function Vercel (endpoint REST).**

La clé API est stockée dans les variables d'environnement côté serveur Vercel (`AIS_API_KEY`). Une serverless function la sert au client via HTTPS. Le client la récupère au montage, puis ouvre le WebSocket vers AISStream directement.

### Approches écartées

| Approche | Raison de rejet |
|---|---|
| Injection au build (`VITE_AIS_API_KEY` en prod) | Clé visible en clair dans le JS bundlé |
| Proxy WebSocket complet côté serveur | Les serverless Vercel ne supportent pas les connexions WebSocket persistantes. Nécessiterait un serveur dédié (Railway, Fly.io), trop complexe pour la v1 |

## Flux de la clé API

### Dev local

```
.env (VITE_AIS_API_KEY)
  → Vite injecte via import.meta.env
    → useAISStream.js lit la clé directement
      → WebSocket vers wss://stream.aisstream.io
```

Aucun changement par rapport au fonctionnement actuel.

### Production Vercel

```
Vercel Env Vars (AIS_API_KEY, côté serveur)
  → api/ais-config.js (serverless function, GET)
    → Navigateur fetch /api/ais-config (HTTPS)
      → useAISStream.js récupère la clé
        → WebSocket vers wss://stream.aisstream.io
```

## Fichiers impactés

### Créations

**`api/ais-config.js`** — Serverless function Vercel

- Méthode : GET uniquement (405 sinon)
- Lit `process.env.AIS_API_KEY`
- Renvoie `{ "key": "..." }` en JSON
- Header `Cache-Control: no-store` (pas de cache CDN)
- Renvoie 500 générique si la clé est absente (ne pas révéler la cause)

**`vercel.json`** — Configuration Vercel

- SPA rewrite : toutes les routes non-API redirigées vers `index.html`
- Le routing `/api/*` est automatique sur Vercel (convention dossier `api/`)

### Modifications

**`src/hooks/useAISStream.js`** — Adaptation du hook WebSocket

- Nouvelle fonction `getApiKey()` async :
  - En dev (`import.meta.env.DEV`) : retourne `import.meta.env.VITE_AIS_API_KEY`
  - En prod : fetch `/api/ais-config`, retourne `data.key`
- Le `useEffect` appelle `getApiKey()` avant `connect()`
- La logique WebSocket (connect, backoff, flush, prune) reste identique
- La clé ne doit jamais être loggée, même en dev

**`.env.example`** — Documentation des variables

- `VITE_AIS_API_KEY` : dev local uniquement
- `AIS_API_KEY` : production Vercel (commenté, référence au Dashboard)

## Sécurité

| Vecteur | Protection |
|---|---|
| Clé dans le repo GitHub | `.env` dans `.gitignore`, clé uniquement dans Vercel Dashboard |
| Clé dans le bundle JS | Aucune variable `VITE_*` en prod, clé servie par serverless function |
| Cache CDN de la clé | Header `Cache-Control: no-store` sur l'endpoint |
| Clé visible dans Network tab | Acceptable : transit HTTPS chiffré, pas d'alternative en architecture SPA |

### Limites connues

La clé transite jusqu'au navigateur via l'appel fetch (visible dans DevTools → Network). C'est inhérent à toute architecture SPA où le client ouvre directement le WebSocket. Pour éliminer complètement cette exposition, il faudrait un serveur backend persistant qui maintient le WebSocket côté serveur — hors scope v1.

## Configuration Vercel (manuelle)

1. Importer le repo `lianazel/GrainTrack3D` dans Vercel
2. Framework preset : **Vite**
3. Settings → Environment Variables → ajouter `AIS_API_KEY`
4. Scope : Production (+ Preview si souhaité)

## Validation post-déploiement

1. `GET /api/ais-config` renvoie `{"key":"..."}` (serverless OK)
2. Globe + navires s'affichent (WebSocket connecté)
3. DevTools → Sources → rechercher la clé dans les JS : absente du bundle
4. DevTools → Network → fetch `/api/ais-config` visible (normal, HTTPS)

## Dépendances

Zéro nouvelle dépendance npm. La serverless function utilise uniquement les API Node.js natives.
