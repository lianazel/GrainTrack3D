# Lessons

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
