# Lessons

## InstancedMesh + onClick : hitbox custom raycast obligatoire (2026-05-12)

**Contexte** : Étape 4, clic sur les marqueurs (InstancedMesh, sphères 0.015 × 8 segments, à ~3 unités de la caméra) ne déclenchait rien. `onPointerMissed` non plus. Premier réflexe : `<OrbitControls makeDefault />` — **nécessaire** mais **pas suffisant** ici.

**Cause** : le raycast Three.js par défaut sur Mesh fait un test triangle-précis. Avec des sphères 0.015 × 8 segments, les triangles font ~0.005 unités. À une distance caméra de ~3, ça correspond à un cône angulaire microscopique : le pointeur souris doit traverser un triangle pour fire `onClick`. En pratique, taux de hit ≈ 0.

**Règles** :
1. Toujours mettre `makeDefault` sur les controls drei dès qu'on veut des `onClick` sur des meshes. Sans ça, R3F ne sait pas que les controls sont actifs et l'event system rate les clics.
2. Pour `InstancedMesh` avec géométrie visuellement petite, override `raycast` avec un test sphère/rayon par instance et un rayon de hitbox plus généreux (~2–3× la géométrie visible). Buffers Three (`Matrix4`, `Sphere`, `Vector3`) réutilisés au module scope, push dans `intersects` avec `instanceId` + `distance` + `object: this`.
3. Le diag clé : ajouter un `console.log` dans le handler `onClick`. S'il ne fire jamais, c'est forcément le raycast ou les controls qui interceptent. S'il fire avec `instanceId` foireux, c'est le reverse mapping.

Voir `src/components/ShipMarkers.jsx` pour le pattern.

## WebSocket.binaryType & parsers silencieux (2026-05-12)

**Contexte** : Le hook `useAISStream` recevait 1000+ messages/10s mais n'en parsait aucun. Aucun log d'erreur. Cause : AISStream envoie ses frames en **binaire** (pas texte). `event.data` était un `Blob`, et `parseMessage` retournait `null` sans bruit dessus.

**Règle** :
1. Pour tout `new WebSocket(...)` qui consomme du JSON, forcer `ws.binaryType = 'arraybuffer'` et décoder via `TextDecoder` avant `JSON.parse`. Ne pas supposer que `event.data` est une string. Certains serveurs (AISStream) envoient leurs JSON en frame binaire.
2. Tout parser de transport (`parseMessage`, etc.) doit logger en DEV ce qu'il ne reconnaît pas — au minimum un échantillon. Un parser silencieux + un transport opaque = bug invisible. Le pattern minimal :
   ```js
   if (!parsed && import.meta.env.DEV) {
     // log error envelope OR sample (throttled à 3)
   }
   ```

**Comment diagnostiquer ce genre de bug** : écrire un script Node standalone (`scripts/ais-probe.mjs` ici) qui ouvre le même WebSocket avec la même subscription et imprime tout pendant 10s. Évite d'avoir à dépendre d'une console navigateur et donne une réponse en une commande.
