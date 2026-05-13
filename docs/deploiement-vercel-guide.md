# Guide de déploiement Vercel — GrainTrack3D

> Date : 2026-05-13 | Statut : Réalisé

## Prérequis

- Code poussé sur GitHub (repo `lianazel/GrainTrack3D`, branche `main`)
- Compte Vercel (gratuit, plan Hobby)
- Compte GitHub avec le repo accessible
- Clé API AISStream.io

## Étape 1 — Commit & Push du code

Depuis Ubuntu (WSL), se positionner dans le répertoire du projet :

```bash
cd /mnt/c/JobDirectory/CLAUDE_PROJECTS/_WEB/GrainTrack3D/GrainTrack3D/GrainTrack3D
```

Commiter et pousser les fichiers de l'étape 5 :

```bash
git add -A
git commit -m "feat: Étape 5 — serverless endpoint pour clé AIS + config Vercel"
git push origin main
```

Fichiers concernés par l'étape 5 :

- `api/ais-config.js` (nouveau) — serverless function
- `vercel.json` (nouveau) — configuration SPA routing
- `src/hooks/useAISStream.js` (modifié) — fetch clé en prod
- `.env.example` (modifié) — documentation des variables
- `docs/architecture-etape5-vercel.md` (nouveau) — doc d'architecture

## Étape 2 — Créer le projet sur Vercel

### 2.1 — Accéder au dashboard

1. Aller sur **https://vercel.com/dashboard**
2. Se connecter (compte email ou GitHub)

### 2.2 — Lier GitHub à Vercel

Si le compte Vercel a été créé avec un email (et non via GitHub) :

1. Sur la page "New Project", cliquer sur **"Continue with GitHub"**
2. Vercel affiche "Install the GitHub application for the accounts you wish to Import from"
3. Cliquer sur le bouton **"Install"** (logo GitHub)
4. GitHub redirige vers une page d'autorisation : **"Install Vercel"**
5. Sélectionner **"All repositories"** (donne accès à tous les repos actuels et futurs, plus simple)
6. Vérifier les permissions affichées :
   - Read access to actions and metadata
   - Read and write access to administration, checks, code, commit statuses, issues, pull requests, repository hooks, and workflows
7. Cliquer sur le bouton vert **"Install"** en bas de page

### 2.3 — Importer le repo

Après l'installation, Vercel affiche la liste de tous les repos GitHub :

1. Repérer **GrainTrack3D** dans la liste (icône cadenas = repo privé, ce qui est normal et ne pose aucun problème)
2. Cliquer sur **"Import"** à côté de GrainTrack3D

## Étape 3 — Configurer le projet

Vercel affiche la page "New Project" avec les paramètres détectés automatiquement :

| Paramètre | Valeur | Action |
|---|---|---|
| Importing from GitHub | lianazel/GrainTrack3D, branche main | Aucune — auto-détecté |
| Vercel Team | lianazel's projects (Hobby) | Aucune — correct |
| Project Name | grain-track3-d | Aucune — peut être modifié si souhaité |
| Application Preset | **Vite** | Aucune — auto-détecté correctement |
| Root Directory | ./ | Aucune — correct |

### 3.1 — Ajouter la variable d'environnement

**IMPORTANT : ne pas cliquer sur Deploy avant cette étape.**

1. Cliquer sur la section dépliable **"Environment Variables"**
2. Remplir les champs :
   - **Key** : `AIS_API_KEY`
   - **Value** : coller la clé AISStream.io (la même que `VITE_AIS_API_KEY` dans le `.env` local)
   - **Environments** : laisser **"Production and Preview"**
3. Note : la clé ne sera jamais visible dans le code déployé. Elle est stockée côté serveur Vercel et lue uniquement par la serverless function `api/ais-config.js`

## Étape 4 — Déployer

1. Cliquer sur **"Deploy"**
2. Vercel lance le build (commande `vite build` détectée automatiquement)
3. Le build prend environ 30-60 secondes
4. Si le build réussit, Vercel affiche une page de félicitations avec l'URL du site

## Étape 5 — Vérification post-déploiement

### 5.1 — Tester la serverless function

Ouvrir dans le navigateur :
```
https://grain-track3-d.vercel.app/api/ais-config
```
(Adapter le nom de domaine si le Project Name a été modifié.)

Résultat attendu :
```json
{"key":"votre_clé_ici"}
```

Si erreur 500 `{"error":"Server misconfiguration"}` → la variable `AIS_API_KEY` n'est pas configurée. Aller dans Settings → Environment Variables pour vérifier.

### 5.2 — Tester l'application

1. Ouvrir l'URL principale du site (affichée après le déploiement)
2. Le globe 3D doit s'afficher avec la texture NASA Blue Marble
3. Après quelques secondes, les marqueurs verts des vraquiers doivent apparaître
4. Cliquer sur un marqueur → le panneau InfoPanel doit s'ouvrir

### 5.3 — Vérifier la sécurité

1. Ouvrir DevTools (F12) → onglet **Sources**
2. Chercher la clé API dans les fichiers JS → elle ne doit **PAS** y être
3. Onglet **Network** → le fetch vers `/api/ais-config` est visible (normal, transit HTTPS chiffré)

## Redéploiement

Vercel redéploie automatiquement à chaque `git push` sur la branche `main`. Aucune action manuelle nécessaire.

Pour un redéploiement manuel : Dashboard Vercel → onglet Deployments → bouton "Redeploy".

## Gestion de la variable d'environnement après déploiement

Pour modifier ou vérifier la clé API après le premier déploiement :

1. Dashboard Vercel → sélectionner le projet **grain-track3-d**
2. Aller dans **Settings** → **Environment Variables**
3. Modifier `AIS_API_KEY` si nécessaire
4. **Redéployer** après modification (le changement ne prend effet qu'au prochain build)

## Troubleshooting

| Problème | Cause probable | Solution |
|---|---|---|
| Build échoue | Dépendances manquantes | Vérifier que `package.json` est à jour et que `npm install` n'a pas été ignoré par Vercel |
| Globe s'affiche mais pas de navires | Clé API manquante ou invalide | Vérifier `/api/ais-config` dans le navigateur |
| Erreur 404 sur les routes | SPA routing manquant | Vérifier que `vercel.json` est présent avec le rewrite |
| Erreur 500 sur `/api/ais-config` | Variable `AIS_API_KEY` non définie | Settings → Environment Variables → ajouter/vérifier |
| Navires en dev mais pas en prod | Hook ne fetch pas la clé | Vérifier que `useAISStream.js` a bien le `fetchApiKey()` |

## Coûts

Le plan **Hobby** (gratuit) de Vercel inclut :

- 100 GB de bande passante/mois
- Serverless functions incluses
- Déploiements illimités
- SSL automatique
- Suffisant pour GrainTrack3D en phase de développement et démonstration
