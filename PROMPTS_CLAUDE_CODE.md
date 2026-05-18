# GrainTrack3D — Prompts Claude Code

Guide de 14 prompts prêts à copier-coller dans Claude Code.
Chaque prompt suit la structure : **Contexte → Comportement → Contraintes**.

---

## Bloc 1 — Fiabilité des données céréales

### Point 1 · Badges à opacité variable
> Difficulté : Rapide · Fichiers : `portMatcher.js`, `InfoPanel.jsx`, `index.css`

```
Dans InfoPanel.jsx, les badges céréales (classe .grain-match) s'affichent
tous avec la même opacité. Je veux une opacité variable selon la fiabilité
du matching port/céréale :

- 100% opacité : le port est spécialisé pour cette céréale (listé sous
  1-2 céréales seulement dans grainPorts.json, ex: Rouen → wheat)
- 70% opacité : port mixte (listé sous 3-5 céréales, ex: Rotterdam)
- 40% opacité : destination vague ou matching approximatif (alias court,
  ou port listé sous 6+ céréales)

Implémentation attendue :
1. Dans portMatcher.js, modifier getMatchingGrains() pour qu'il retourne
   des objets { grainKey, confidence } au lieu de simples strings.
   confidence = "high" | "medium" | "low" basé sur le nombre de céréales
   associées au port matché.
2. Dans InfoPanel.jsx, appliquer un style inline opacity sur chaque
   badge .grain-match selon la confidence (high=1, medium=0.7, low=0.4).
3. Dans index.css, pas de changement nécessaire — l'opacité est inline.

Contraintes :
- Ne pas casser le filtre GrainSelector qui utilise matchShipToGrain()
- Ne pas ajouter de dépendance npm
- Garder la compatibilité avec le paramètre URL ?grain=xxx
```

---

### Point 2 · Icône de source sur chaque badge
> Difficulté : Rapide · Fichiers : `portMatcher.js`, `InfoPanel.jsx`, `index.css`

```
Suite au point 1 (les badges ont maintenant une confidence high/medium/low),
ajouter un petit indicateur visuel de la source du matching sur chaque
badge céréale dans InfoPanel.jsx :

- Port ultra-spécialisé (confidence high) : petit cercle plein ● en vert
  (#22c55e) positionné en haut à droite du badge, 6px de diamètre
- Port mixte (confidence medium) : cercle demi-plein ◐ ou petit diamant ◆
  en jaune (#eab308)
- Destination non résolue / vague (confidence low) : cercle vide ○ en
  gris (#9ca3af)

Implémentation :
1. Dans InfoPanel.jsx, à l'intérieur de chaque <span className="grain-match">,
   ajouter un petit <span> positionné en absolute top-right avec le picto
   correspondant à la confidence.
2. Dans index.css, ajouter le style .grain-match { position: relative }
   et .grain-match-indicator { position: absolute; top: -3px; right: -3px;
   font-size: 6px; }.

Contraintes :
- Les pictos sont des caractères Unicode, pas de SVG ni d'images
- Le badge doit rester lisible et compact
- Ne pas toucher à portMatcher.js (le point 1 a déjà ajouté la confidence)
```

---

### Point 3 · Score de confiance explicite
> Difficulté : Moyen · Fichiers : `portMatcher.js`, `InfoPanel.jsx`, `index.css`

```
Ajouter un score de confiance visuel sous la section "Céréales probables"
dans InfoPanel.jsx.

Affichage cible (une seule ligne sous les badges) :
  ■■■■■■■□□□ Confiance 72% — Port de Rotterdam identifié, hub céréalier majeur

Le score est calculé dans portMatcher.js en fonction de :
- Spécificité du port (combien de céréales il traite) : poids 40%
- Qualité du match destination AIS (exact UNLOCODE > nom complet > alias
  partiel) : poids 40%
- Rôle du port (export > both > import pour un cargo en transit) : poids 20%

Implémentation :
1. Dans portMatcher.js, créer une fonction computeConfidenceScore(ship)
   qui retourne { score: 0-100, reason: string }. La reason est une
   phrase courte expliquant le scoring (ex: "Port de Rouen — export blé
   spécialisé" ou "Destination 'CONT' — trop vague pour identifier un port").
2. Dans InfoPanel.jsx, sous la div .info-panel-grains-list, ajouter un
   composant ConfidenceBar qui affiche la barre de carrés (10 carrés,
   remplis proportionnellement au score) + le pourcentage + la reason.
3. Dans index.css, ajouter les styles pour .confidence-bar (flex, gap 2px)
   et .confidence-square (8px × 8px, border-radius 1px). Carré plein =
   #22c55e, carré vide = rgba(255,255,255,0.1).

Contraintes :
- Le score s'affiche uniquement si au moins une céréale est matchée
- Si aucune destination n'est déclarée par le navire, ne pas afficher
  la barre du tout
- Ne pas ajouter de dépendance npm
```

---

## Bloc 2 — Connexion GrainWatch <-> GrainTrack3D

### Point 4 · Bandeau de synthèse global
> Difficulté : Rapide · Fichiers : `App.jsx`, nouveau `SummaryBanner.jsx`, `index.css`, `useShipStore.js`

```
Ajouter un bandeau de synthèse en haut du globe affichant un résumé
temps réel du type :
  "17 vraquiers blé en transit · $253/t · ▲18%"

Le bandeau est visible sans interaction, positionné en haut centre de
l'écran (au-dessus du globe, en overlay).

Implémentation :
1. Créer src/components/SummaryBanner.jsx :
   - Lit ships et selectedGrain depuis useShipStore
   - Si un grain est sélectionné : affiche le nombre de vraquiers filtrés
     + le nom de la céréale
   - Si aucun grain sélectionné : affiche le total de vraquiers
   - Zone prix : pour l'instant, afficher un placeholder "—" (l'intégration
     GrainWatch API viendra au point 6)
   - Le composant se met à jour automatiquement via Zustand
2. Dans App.jsx, ajouter <SummaryBanner /> dans le fragment, après le Canvas.
3. Dans index.css, ajouter .summary-banner :
   - position: fixed; top: 16px; left: 50%; transform: translateX(-50%)
   - background: rgba(0,0,0,0.7); backdrop-filter: blur(8px)
   - border-radius: 999px; padding: 8px 20px
   - font-size: 14px; color: #e6e6ec; z-index: 20
   - Pointer-events: none (ne bloque pas les clics sur le globe)

Contraintes :
- Le bandeau ne doit jamais chevaucher le HUD (top-left) ni le GrainSelector
- Zero dépendance npm supplémentaire
- Responsive : le bandeau peut se tronquer avec text-overflow sur petits écrans
```

---

### Point 5 · Lien bidirectionnel céréale → cours
> Difficulté : Moyen · Fichiers : `InfoPanel.jsx`, `grainList.js`, `index.css`

```
Rendre les badges céréales cliquables dans InfoPanel.jsx : un clic sur
un badge ouvre GrainWatch sur la page de la céréale correspondante dans
un nouvel onglet.

GrainWatch est déployé sur GitHub Pages. L'URL cible pour chaque céréale :
  https://[username].github.io/GrainWatch/?commodity={grainKey}

Implémentation :
1. Dans grainList.js, ajouter un champ grainWatchUrl à chaque entrée
   de GRAIN_LIST. Pour l'instant, utiliser un template :
   grainWatchUrl: 'https://devnetasimov451.github.io/GrainWatch/?commodity={key}'
   (on affinera l'URL exacte plus tard).
2. Dans InfoPanel.jsx, remplacer le <span className="grain-match"> par
   un <a> (ou un span avec onClick + window.open). Au clic, ouvrir
   grainWatchUrl dans un nouvel onglet (target="_blank", rel="noopener").
3. Dans index.css, ajouter un style hover sur .grain-match :
   cursor: pointer, légère augmentation de luminosité (brightness 1.2),
   underline discret.

Contraintes :
- Le clic sur le badge ne doit PAS déclencher la fermeture de l'InfoPanel
  (stopPropagation si nécessaire)
- L'URL GrainWatch doit être facilement modifiable (constante ou champ
  dans grainList.js, pas hardcodée dans le JSX)
- Ne pas casser l'opacité variable ajoutée au point 1
```

---

### Point 6 · Mini-prix inline dans le panneau cargo
> Difficulté : Ambitieux · Fichiers : `InfoPanel.jsx`, nouveau `hooks/useGrainPrices.js`, `useShipStore.js`

```
Afficher le cours live de chaque céréale directement dans les badges du
panneau InfoPanel, sous la forme :
  🌾 Blé · $253/t · ▲17.9% (6M)

Cela nécessite une source de données prix. GrainWatch expose ses données
via un fichier JSON statique sur GitHub Pages (pas d'API dynamique).

Implémentation :
1. Créer src/hooks/useGrainPrices.js :
   - Au montage, fetch le fichier JSON de GrainWatch qui contient les
     prix actuels (URL à déterminer — pour le dev, utiliser un fichier
     mock src/data/mockPrices.json avec la structure :
     { "wheat": { "price": 253, "currency": "USD", "unit": "t",
       "change6m": 17.9 }, ... })
   - Cache les prix dans un state React (ou dans le store Zustand)
   - Refresh toutes les 5 minutes (les prix agri ne bougent pas à la
     seconde)
   - Expose un hook : const price = useGrainPrice('wheat')
     → { price, currency, unit, change6m, loading, error }
2. Dans InfoPanel.jsx, après chaque badge céréale, afficher le prix
   inline si disponible. Format : "$253/t · ▲17.9%". Flèche verte si
   positif, rouge si négatif.
3. Si le prix n'est pas disponible (loading ou error), afficher juste
   le badge céréale sans prix (pas de loader).

Contraintes :
- Le fetch prix ne doit JAMAIS bloquer l'affichage du panneau
- Commencer avec mockPrices.json, on branchera la vraie URL GrainWatch
  plus tard
- Ne pas ajouter de dépendance npm (fetch natif suffit)
- Le panneau ne doit pas s'élargir : le prix est compact, une ligne max
```

---

## Bloc 3 — Expérience Globe 3D

### Point 7 · Auto-rotation douce au démarrage
> Difficulté : Rapide · Fichiers : `App.jsx`

```
Faire tourner le globe lentement au démarrage, puis stopper la rotation
dès que l'utilisateur interagit (clic, drag, scroll).

OrbitControls de @react-three/drei a déjà les props nécessaires :
- autoRotate={true} : active la rotation automatique
- autoRotateSpeed={0.5} : vitesse lente (défaut drei = 2, trop rapide)

Implémentation :
1. Dans App.jsx, ajouter un state React : const [userInteracted, setUserInteracted] = useState(false)
2. Sur le <Canvas>, ajouter onPointerDown={() => setUserInteracted(true)}
   et onWheel={() => setUserInteracted(true)}
3. Sur <OrbitControls>, ajouter :
   autoRotate={!userInteracted}
   autoRotateSpeed={0.5}

C'est tout. Environ 5 lignes de changement dans App.jsx uniquement.

Contraintes :
- Ne pas toucher à Globe.jsx ni ShipMarkers.jsx
- La rotation s'arrête au premier clic/drag/scroll et ne reprend JAMAIS
- autoRotateSpeed entre 0.3 et 0.8 (pas plus rapide)
- Le onPointerMissed existant (désélection navire) doit continuer à
  fonctionner normalement
```

---

### Point 8 · Cluster de marqueurs au dézoom
> Difficulté : Moyen · Fichiers : `ShipMarkers.jsx`, `geoUtils.js`, nouveau `utils/clustering.js`

```
Quand le globe est dézoomé (caméra loin), les marqueurs proches se
chevauchent. Regrouper les marqueurs proches en un seul cercle affichant
le compte (ex: cercle avec "5").

Implémentation :
1. Créer src/utils/clustering.js :
   - Fonction clusterShips(ships[], cameraDistance) :
     - Si cameraDistance < 4 (zoom proche) : pas de clustering, retourner
       les ships tels quels
     - Si cameraDistance >= 4 : regrouper les navires dont les positions
       3D (après latLonToVector3) sont à moins de `threshold` distance
       les uns des autres. threshold = 0.15 * (cameraDistance / 5)
     - Algorithme simple : parcours séquentiel, chaque navire est assigné
       au premier cluster à portée, ou crée un nouveau cluster
     - Retour : array de { lat, lon, count, ships[] }
2. Dans ShipMarkers.jsx :
   - Récupérer la distance caméra via useThree() → camera.position.length()
   - Appeler clusterShips() dans le useMemo existant
   - Pour les clusters de count=1 : marqueur normal (point vert)
   - Pour les clusters de count>1 : utiliser un <Billboard> drei avec
     un <Text> affichant le nombre, dans un cercle légèrement plus grand
3. Dans geoUtils.js : pas de changement.

Contraintes :
- Le clustering doit être recalculé quand la caméra bouge (utiliser
  useFrame pour lire la distance, mais throttler le recalcul à 500ms)
- Un clic sur un cluster pourrait zoomer dessus (nice-to-have, pas
  obligatoire pour la v1)
- Ne pas casser le onClick existant sur les marqueurs individuels
- Performance : le clustering doit tourner en < 5ms pour 1000 navires
```

---

### Point 9 · Zone de trafic intense (heatmap)
> Difficulté : Moyen · Fichiers : nouveau `components/TrafficHeatmap.jsx`, `App.jsx`, `HUD.jsx`

```
Ajouter une heatmap subtile sur le globe montrant les zones de forte
concentration de vraquiers (Manche, Bosphore, détroit de Malacca, etc.).

Implémentation :
1. Créer src/components/TrafficHeatmap.jsx :
   - Lit les positions de tous les navires depuis useShipStore
   - Divise le globe en cellules de grille (ex: 2° × 2° lat/lon)
   - Pour chaque cellule ayant >= 2 navires, placer un disque semi-
     transparent sur le globe à cette position
   - Couleur : dégradé du jaune (2 navires) au rouge (10+ navires),
     opacité 0.15 à 0.35
   - Utiliser un <instancedMesh> avec des CircleGeometry aplaties sur
     la surface du globe (orientées selon la normale à la sphère)
2. Dans App.jsx, ajouter <TrafficHeatmap /> dans le Canvas, entre
   <Globe /> et <ShipMarkers /> (la heatmap est sous les marqueurs).
3. Dans HUD.jsx, ajouter un toggle (petit bouton ou checkbox) pour
   activer/désactiver la heatmap. Stocker l'état dans useShipStore
   (nouveau champ showHeatmap, défaut: true).

Contraintes :
- La heatmap doit se mettre à jour avec les positions temps réel
  (mais throttlée, recalcul max toutes les 5 secondes)
- Les disques doivent être plaqués sur la sphère (pas flottants)
- Performance : pas plus de 500 instances de disques
- Ne pas ajouter de dépendance npm (pas de lib heatmap externe)
- Le toggle doit être discret et ne pas encombrer le HUD
```

---

### Point 10 · Trails de trajectoire
> Difficulté : Ambitieux · Fichiers : `useShipStore.js`, `useAISStream.js`, nouveau `components/ShipTrails.jsx`, `App.jsx`

```
Afficher une traînée semi-transparente derrière chaque marqueur, basée
sur les dernières positions connues du navire.

Implémentation :
1. Dans useShipStore.js :
   - Ajouter un champ `positionHistory` dans chaque objet navire : un
     array de { lat, lon, timestamp } limité aux 20 dernières positions.
   - Dans applyBatch, quand on met à jour un navire avec une nouvelle
     position, push la position précédente dans positionHistory (FIFO,
     max 20 entrées). Seulement si la nouvelle position est différente
     de la dernière (tolérance 0.001°).
2. Créer src/components/ShipTrails.jsx :
   - Pour chaque navire ayant >= 2 positions dans son historique,
     tracer une ligne 3D (THREE.Line ou drei <Line>) passant par les
     positions historiques converties en Vector3.
   - Couleur : vert (#00ff88) avec opacité dégressive (la position la
     plus ancienne = opacité 0.05, la plus récente = 0.4).
   - Utiliser vertexColors sur un BufferGeometry pour le dégradé
     d'opacité le long de la ligne.
   - Optimisation : ne tracer les trails que pour les navires visibles
     (filtre grain actif) et limiter à 200 trails max.
3. Dans App.jsx, ajouter <ShipTrails /> dans le Canvas après <ShipMarkers />.

Contraintes :
- Le positionHistory ne doit PAS faire exploser la mémoire : max 20
  points par navire, et les navires prunés perdent leur historique
- Les trails doivent être légèrement au-dessus du globe (radius + 0.003)
  pour ne pas z-fight avec la texture
- Performance : utiliser un seul BufferGeometry partagé si possible,
  pas un Line par navire
- Ne pas ajouter de dépendance npm
```

---

## Bloc 4 — Valeur métier

### Point 11 · Export snapshot PNG/CSV
> Difficulté : Rapide · Fichiers : `App.jsx` ou nouveau `components/ExportButton.jsx`, `index.css`

```
Ajouter un bouton "Snapshot" qui exporte :
- Une capture PNG du globe (canvas Three.js)
- Un fichier CSV de tous les cargos actuellement visibles

Implémentation :
1. Créer src/components/ExportButton.jsx :
   - Bouton positionné en bas-droite de l'écran (fixed, z-index 20)
   - Style : même esthétique que le HUD (fond semi-transparent, texte
     clair, border-radius)
   - Au clic, exécuter deux exports :

   a) PNG : récupérer le canvas Three.js via
      document.querySelector('canvas'). Appeler canvas.toDataURL('image/png')
      puis créer un lien <a download="graintrack3d-snapshot.png"> et
      le cliquer programmatiquement.
      IMPORTANT : pour que toDataURL fonctionne, le Canvas R3F doit avoir
      gl={{ preserveDrawingBuffer: true }} dans App.jsx.

   b) CSV : lire ships depuis useShipStore. Générer un CSV avec colonnes :
      MMSI, Name, ShipType, Lat, Lon, Speed, Course, Heading, Destination,
      LastSeen (ISO string). Créer un Blob text/csv et le télécharger
      comme "graintrack3d-cargos.csv".

2. Dans App.jsx :
   - Ajouter gl={{ preserveDrawingBuffer: true }} au <Canvas>
   - Ajouter <ExportButton /> dans le fragment

3. Dans index.css, ajouter .export-btn styles.

Contraintes :
- preserveDrawingBuffer a un léger coût GPU — c'est acceptable
- Le CSV respecte le filtre grain actif (si un grain est sélectionné,
  n'exporter que les navires filtrés)
- Ne pas ajouter de dépendance npm (pas de lib csv)
- Le nom des fichiers inclut la date : graintrack3d-2024-01-15-snapshot.png
```

---

### Point 12 · Filtre par route maritime
> Difficulté : Moyen · Fichiers : nouveau `data/maritimeRoutes.js`, `useShipStore.js`, nouveau `components/RouteFilter.jsx`, `ShipMarkers.jsx`, `App.jsx`

```
Permettre de filtrer les navires par détroit / route maritime.

Routes à définir :
- Manche : lat 49-51, lon -2 à 2
- Bosphore : lat 40.9-41.3, lon 28.8-29.2
- Suez : lat 29.5-31.5, lon 32-33
- Gibraltar : lat 35.5-36.5, lon -6 à -5
- Malacca : lat 1-4, lon 100-104

Implémentation :
1. Créer src/data/maritimeRoutes.js : export d'un array d'objets
   { id, name, bbox: { latMin, latMax, lonMin, lonMax } }
2. Dans useShipStore.js, ajouter selectedRoute (null par défaut) et
   setSelectedRoute action.
3. Créer src/components/RouteFilter.jsx : dropdown similaire à
   GrainSelector, positionné sous le GrainSelector. Options : "Toutes
   les routes" + les 5 routes ci-dessus.
4. Dans ShipMarkers.jsx, modifier le useMemo visibleShips pour aussi
   filtrer par selectedRoute (vérifier si lat/lon du navire est dans
   la bbox de la route).
5. Dans HUD.jsx, afficher le nom de la route active à côté du grain badge.
6. Dans App.jsx, ajouter <RouteFilter /> dans l'overlay et lire le
   paramètre URL ?route=xxx.

Contraintes :
- Le filtre route est combinable avec le filtre grain (AND logique)
- La bbox est approximative — c'est volontaire
- Ne pas ajouter de dépendance npm
- Les routes sont facilement extensibles (juste ajouter une entrée
  dans maritimeRoutes.js)
```

---

### Point 13 · Alerte de congestion portuaire
> Difficulté : Moyen · Fichiers : nouveau `components/CongestionAlerts.jsx`, `utils/portMatcher.js`, `App.jsx`, `index.css`

```
Détecter quand plusieurs vraquiers déclarent le même port de destination
et afficher une alerte flottante :
  "⚠ Rotterdam : 8 vraquiers en approche"

Implémentation :
1. Dans portMatcher.js, ajouter une fonction :
   getCongestionAlerts(ships: Map, threshold = 5) → array de
   { portName, count, ships[] }
   - Normaliser les destinations de tous les navires
   - Regrouper par destination normalisée
   - Retourner les groupes ayant count >= threshold, triés par count desc
   - Matcher les destinations avec grainPorts.json pour afficher le vrai
     nom du port quand possible (sinon afficher la destination brute AIS)

2. Créer src/components/CongestionAlerts.jsx :
   - Lit ships depuis useShipStore
   - Appelle getCongestionAlerts() dans un useMemo (recalcul quand ships change)
   - Affiche une liste d'alertes en bas-gauche de l'écran (fixed)
   - Chaque alerte : pill arrondi, fond rgba(234,179,8,0.15), bordure
     jaune, icône ⚠, texte "Rotterdam : 8 vraquiers"
   - Max 3 alertes visibles (les plus congestionnés)
   - Au clic sur une alerte, filtrer les navires vers ce port (nice-to-have)

3. Dans App.jsx, ajouter <CongestionAlerts /> dans le fragment.
4. Dans index.css, ajouter les styles .congestion-alerts et .congestion-pill.

Contraintes :
- Le seuil par défaut est 5, mais doit être facilement modifiable
  (constante en haut du fichier)
- Ne pas recalculer à chaque render : throttler à 5 secondes
- Performance : le regroupement doit être O(n) sur le nombre de navires
- Ne pas ajouter de dépendance npm
```

---

### Point 14 · Compteur historique J-7
> Difficulté : Ambitieux · Fichiers : nouveau `api/ship-history.js`, nouveau `hooks/useShipHistory.js`, `HUD.jsx` ou nouveau composant

```
ATTENTION : ce point nécessite un stockage persistant côté serveur.
C'est un changement d'architecture significatif.

Afficher combien de vraquiers distincts ont été vus sur une zone donnée
au cours des 7 derniers jours.

Implémentation proposée (Vercel KV ou fichier JSON sur stockage) :

Option A — Vercel KV (recommandé, gratuit tier) :
1. Créer api/ship-history.js (serverless function Vercel) :
   - POST /api/ship-history : reçoit { mmsi, lat, lon, timestamp }
     et stocke dans Vercel KV avec TTL 7 jours
   - GET /api/ship-history?latMin=X&latMax=X&lonMin=X&lonMax=X :
     retourne le count de MMSI distincts vus dans la bbox sur 7 jours
   - Sécuriser avec un token simple (header X-API-Token)

2. Dans useAISStream.js, après chaque flush, envoyer un batch POST
   des positions au endpoint /api/ship-history (fire-and-forget,
   pas de await bloquant).

3. Créer src/hooks/useShipHistory.js :
   - Hook qui fetch GET /api/ship-history pour la bbox visible
   - Refresh toutes les 60 secondes
   - Retourne { count7d, loading }

4. Afficher dans le HUD ou dans un composant dédié :
   "327 vraquiers sur 7j" sous le compteur temps réel.

Option B — Sans backend (plus simple mais limité) :
- Stocker les MMSI vus dans localStorage avec timestamp
- Compter les MMSI vus sur 7 jours
- Limité au navigateur de l'utilisateur (pas partagé)

Je te recommande de commencer par l'Option B pour valider l'UX,
puis migrer vers l'Option A quand l'infrastructure est prête.

Contraintes :
- L'envoi des positions au backend ne doit JAMAIS ralentir l'app
  (fire-and-forget, catch silencieux)
- Le compteur 7j est un "nice-to-have" — s'il échoue, l'app doit
  fonctionner normalement sans lui
- Vercel KV : attention au quota gratuit (256MB, 30k requests/jour)
- Ne pas stocker de données personnelles (MMSI n'est pas une donnée
  personnelle, c'est un identifiant de navire public)
```

---

## Conseils généraux pour Claude Code

### Structure d'un bon prompt
1. **Nommer les fichiers** : "Dans `InfoPanel.jsx`" vaut mieux que "dans le panneau"
2. **Donner des seuils concrets** : "opacité 0.4" pas "opacité faible"
3. **Lister les contraintes** : ce qu'il ne faut PAS casser
4. **Un seul point à la fois** : ne pas mélanger plusieurs features

### Mots-clés utiles
- "Ne pas ajouter de dépendance npm" → empêche les ajouts non désirés
- "Contraintes :" → section que Claude Code respecte très bien
- "Implémentation attendue :" → guide pas à pas sans ambiguïté
- "Nice-to-have" → Claude Code fait le minimum d'abord, l'optionnel après

### Si Claude Code fait une erreur
- Dire : "Reviens en arrière sur [fichier]. Le problème c'est [description]."
- Être factuel : "Le filtre grain ne fonctionne plus après ta modif" plutôt que "c'est cassé"
- Copier-coller l'erreur console si il y en a une

### Ordre recommandé
Commencer par les points "Rapide" pour prendre confiance :
7 → 1 → 2 → 4 → 11 → 3 → 5 → 8 → 9 → 12 → 13 → 6 → 10 → 14
