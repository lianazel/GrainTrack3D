# Écouter les bateaux — Guide d'enrichissement de la base ports/céréales

> *Plus notre base de ports est riche, plus GrainTrack3D devine avec justesse ce que transporte chaque vraquier.*

## Le principe : écouter pour apprendre

Chaque vraquier qui navigue dans le monde émet en continu un signal AIS (Automatic Identification System). Ce signal contient, entre autres, un champ **destination** — un texte libre tapé par l'équipage avant le départ. C'est ce texte que GrainTrack3D utilise pour deviner quelle céréale un navire transporte.

Le problème ? Ce texte est libre. Un marin peut écrire "ROUEN", "FR ROU", "ROUEN FRANCE", ou même "ROU/ANT" pour indiquer qu'il va à Rouen puis Anvers. Notre base `grainPorts.json` contient des **aliases** pour chaque port — des variantes connues que les équipages utilisent. Mais il y en a toujours de nouvelles qu'on n'a pas encore vues.

C'est là qu'intervient le script d'analyse. Son rôle est simple : **écouter le flux AIS en direct, collecter toutes les destinations déclarées par les vraquiers, et repérer celles qu'on ne connaît pas encore**.

## Comment ça marche concrètement

```
┌─────────────────────┐
│  Flux AIS mondial    │    Le script se connecte au même WebSocket
│  (AISStream.io)      │    qu'utilise l'application en production.
└─────────┬───────────┘
          │ WebSocket (5 minutes d'écoute)
          ▼
┌─────────────────────┐
│  Collecte brute      │    Il ne garde que les vraquiers (codes 70-79)
│  des destinations    │    et stocke chaque destination unique avec
│                      │    son nombre d'occurrences.
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Matching contre     │    Chaque destination est comparée aux aliases
│  grainPorts.json     │    de notre base. Résultat : "couverte" ou
│                      │    "non couverte".
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  Rapport             │    Le script affiche :
│  d'analyse           │    - taux de couverture global
│                      │    - top destinations non couvertes
│                      │    - suggestions d'enrichissement
└─────────────────────┘
```

## Lancer une analyse

### Prérequis

- Node.js 22+ (WebSocket natif)
- La clé API AISStream dans le fichier `.env` (`VITE_AIS_API_KEY=...`)

### Commandes

```bash
# Se placer à la racine du projet
cd GrainTrack3D

# Analyse complète : toutes les zones, 5 minutes d'écoute
node scripts/analyze-destinations.mjs 300

# Analyse d'une zone spécifique (2 minutes)
node scripts/analyze-destinations.mjs 120 --zones mediterranean

# Analyse de plusieurs zones (5 minutes)
node scripts/analyze-destinations.mjs 300 --zones mediterranean,black-sea,persian-gulf

# Analyse rapide pour vérifier un ajout récent (1 minute, Atlantique Nord)
node scripts/analyze-destinations.mjs 60 --zones atlantic-north
```

Le premier argument est la **durée de collecte en secondes**. Plus on écoute longtemps, plus on capte de navires différents et plus le rapport est fiable. 5 minutes (300s) est un bon compromis. Pour une analyse approfondie, 10 minutes (600s) donne de meilleurs résultats.

### Zones disponibles

| Clé | Zone |
|-----|------|
| `atlantic-north` | Atlantique Nord |
| `mediterranean` | Méditerranée |
| `black-sea` | Mer Noire |
| `north-sea-baltic` | Mer du Nord & Baltique |
| `gulf-caribbean` | Golfe du Mexique & Caraïbes |
| `persian-gulf` | Golfe Persique & Mer d'Arabie |
| `southeast-asia` | Asie du Sud-Est |
| `indian-ocean-west` | Océan Indien Ouest |

## Lire le rapport

À la fin de l'écoute, le script affiche un rapport structuré. Voici comment le lire :

### Taux de couverture

```
Destinations uniques : 87
Messages totaux      : 312
Couvertes            : 54 destinations (245 messages)
Non couvertes        : 33 destinations
Taux de couverture   : 78% (en messages)
```

Le taux est calculé **en messages** (pas en destinations uniques). Un port très fréquenté qui manque dans la base pèse plus lourd qu'un port obscur vu une seule fois. L'objectif est de dépasser **85% de couverture** sur chaque zone.

### Destinations non couvertes

```
TOP 20 DESTINATIONS NON COUVERTES
   1. "SANTOS" (x14)
   2. "PARANAGUA" (x8)
   3. "CN QHD" (x5)
   ...
```

Ce sont les candidats à l'enrichissement. Les plus fréquents en premier — ce sont ceux qui amélioreront le plus le taux de couverture.

### Destinations couvertes

```
TOP 15 DESTINATIONS COUVERTES
   1. "US HOU" -> [wheat, corn, soybean, sorghum] (x22)
   2. "ROUEN" -> [wheat, barley] (x15)
   ...
```

Permet de vérifier que le matching existant est correct. Si "ROUEN" matche sur du riz, il y a un problème dans la base.

## Enrichir la base

### Étape 1 : Identifier les vrais ports céréaliers

Parmi les destinations non couvertes, toutes ne sont pas des ports céréaliers. Certaines sont des chantiers navals, des zones de mouillage, ou du texte fantaisiste. Pour chaque candidat fréquent :

1. **Vérifier** que c'est un port réel (recherche web rapide)
2. **Confirmer** qu'il traite des céréales ou matières premières agricoles
3. **Identifier** quelles céréales y transitent (blé, maïs, soja, etc.)

### Étape 2 : Ajouter dans grainPorts.json

Le fichier `src/data/grainPorts.json` est organisé par céréale. Chaque port a cette structure :

```json
{
  "name": "Santos",
  "country": "BR",
  "unlocode": "BRSSZ",
  "aliases": ["SANTOS", "BR SSZ", "BRSSZ", "SANT"],
  "role": "export"
}
```

Les champs importants :

- **aliases** : toutes les variantes que les marins écrivent dans le champ destination AIS. Inclure le nom complet, les abréviations courantes, et le format UNLOCODE sans tiret.
- **role** : `export` (le port expédie des céréales), `import` (il en reçoit), ou `both`.
- **unlocode** : le code UN/LOCODE du port (optionnel mais utile pour éviter les doublons).

Le port doit être ajouté dans **chaque section de céréale** qu'il traite. Santos exporte du soja et du sucre ? Il va dans les sections `"soybean"` et `"sugar"`.

### Étape 3 : Vérifier l'amélioration

Relancer le script après les ajouts pour confirmer que le taux de couverture a augmenté :

```bash
node scripts/analyze-destinations.mjs 120
```

Les destinations précédemment "non couvertes" devraient maintenant apparaître dans la colonne "couvertes".

## Bonnes pratiques

### Fréquence recommandée

- **Après l'ajout d'une nouvelle zone géographique** : lancer une analyse de 5-10 minutes sur la zone concernée. Les ports d'Asie du Sud-Est ou du Golfe Persique sont probablement peu couverts aujourd'hui.
- **Une fois par mois** : une analyse globale (`--zones all`, 5 minutes) pour capter les évolutions saisonnières du trafic.
- **Après chaque enrichissement** : une vérification rapide (1-2 minutes) pour valider les ajouts.

### Pièges à éviter

- **Aliases trop courts** (2-3 caractères) : ils provoquent des faux positifs. "ROU" peut matcher "ROUEN" mais aussi "ROUBAIX" ou n'importe quel texte contenant ces lettres. Le script les traite avec une confiance réduite, mais mieux vaut privilégier les aliases de 4+ caractères.
- **Ports multi-céréales** : un port comme Houston traite du blé, du maïs, du soja et du sorgho. Il faut l'ajouter dans les 4 sections — pas seulement celle qu'on a découverte en premier.
- **Destinations fantaisistes** : certains marins écrivent "FOR ORDERS", "TBN" (to be nominated), "DRIFTING", etc. Ce ne sont pas des ports — les ignorer.
- **Destinations composées** : "ROU/ANT" signifie Rouen puis Anvers. Notre matching gère ça partiellement (il trouvera Rouen), mais c'est bon à savoir.

### Convention de commit

Après enrichissement de la base :

```
chore: enrichir grainPorts.json (+X ports, couverture Y%→Z%)
```

## Pourquoi c'est important

Le filtrage par céréale est la fonctionnalité qui différencie GrainTrack3D d'un simple tracker AIS. Mais ce filtrage repose entièrement sur la qualité de notre base `grainPorts.json`. Chaque port manquant, c'est un navire qui apparaît sans badge céréale — ou pire, un navire qui disparaît quand l'utilisateur filtre sur une céréale.

L'enrichissement régulier de cette base est donc un acte de maintenance essentiel. Le script d'analyse est notre outil pour ça : il écoute ce que les bateaux racontent, et nous dit ce qu'on a oublié.

---

*Dernière mise à jour : 19 mai 2026 — GrainTrack3D v1.3.0*
