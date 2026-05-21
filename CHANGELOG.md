# TV Viewer — Aperçu & Changelog

---

## Aperçu de l'application

### Qu'est-ce que c'est ?

**TV Viewer** est un système d'affichage dynamique (digital signage) pour boîtiers Android TV (XM32, Android 10–14). Il est conçu pour les bureaux de change au Maroc : les écrans affichent les taux de change, des vidéos/images planifiées, et des messages, gérés à distance depuis une interface web.

---

### Architecture globale

```
┌─────────────────────────────────────────────────────────────┐
│                   Boîtier Android TV (XM32)                 │
│                                                             │
│  ┌──────────────────┐      ┌───────────────────────────┐   │
│  │   App TV         │◄────►│   Serveur Node.js embarqué │   │
│  │  (React Native)  │bridge│   port 3000               │   │
│  │                  │      │   config / sequences /     │   │
│  │  Affiche le      │      │   médias / auth            │   │
│  │  contenu planifié│      └───────────┬───────────────┘   │
│  └──────────────────┘                  │ HTTP               │
│                                        ▼                    │
│                          ┌─────────────────────────┐        │
│                          │   Interface Admin Web   │        │
│                          │   (React + Tailwind)    │        │
│                          │   http://<IP>:3000      │        │
│                          └─────────────────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

| Couche | Technologie | Rôle |
|--------|-------------|------|
| **App TV** | React Native (react-native-tvos) | Affichage du contenu sur l'écran |
| **Serveur embarqué** | Node.js (nodejs-mobile-react-native) | API HTTP, planification, persistance |
| **Interface admin** | React 19 + Vite + Tailwind CSS | Gestion contenu, médias, plannings |

---

### Stockage des données

Toutes les données persistent dans `/storage/emulated/0/Documents/tv-viewer/` — stockage externe, **survit à la désinstallation** de l'app.

```
Documents/tv-viewer/
├── data/
│   ├── config.json       — orientation, configuration du ticker
│   ├── sequences.json    — toutes les séquences planifiées
│   ├── metadata.json     — métadonnées des fichiers médias uploadés
│   └── auth.json         — hash du mot de passe admin
├── uploads/              — vidéos et images uploadées via l'admin
└── tv-schedule.json      — planning allumage/extinction HDMI-CEC
```

**Flux d'écriture** (Node.js ne peut pas écrire dans Documents directement) :
```
Node.js (JSON en mémoire)
  → android-bridge-fs.js
    → App.tsx (bridge listener)
      → NativeModules.StoragePermission.writeTextFile()
        → Kotlin : Os.open(O_WRONLY|O_TRUNC)  ← update in-place, sans EEXIST
                   FileOutputStream            ← création de nouveaux fichiers
          → Documents/tv-viewer/data/*.json ✓
```

**Flux de lecture au démarrage** :
```
Kotlin readTextFile() → App.tsx
  → env vars TV_INIT_CONFIG / TV_INIT_SEQUENCES / TV_INIT_AUTH / TV_INIT_METADATA
    → Node.js charge tout en mémoire au boot
      → Serveur HTTP prêt → App TV fetch les données
```

---

### Démarrage de l'app (séquence complète)

```
1. App.tsx monte
2. Lecture du chemin stocké (SharedPreferences)
   └── Si absent → chemin par défaut : /storage/emulated/0/Documents/tv-viewer
3. initializeStorage() via Kotlin
   └── Crée dossiers uploads/ + data/ si absents
   └── Crée fichiers JSON par défaut si absents (config, sequences, metadata)
4. Lecture des 4 fichiers JSON via Kotlin readTextFile()
5. Lancement du serveur Node.js embarqué (main.js)
6. Envoi des données JSON + tempDir via bridge message "storage-path"
7. Node.js initialise sa mémoire (config, séquences, auth)
8. Node.js envoie "server-ready" → App TV sort du SplashScreen
9. useScheduler démarre, fetch /api/sequences toutes les X secondes
10. Layout actif s'affiche
```

---

### Écrans de l'app TV

#### SplashScreen
- Fond noir + logo centré
- Spinner pendant le boot Node.js
- Adresse IP affichée une fois le serveur prêt
- Disparaît en fade après 1,5 s

#### Écran d'accueil (fallback — aucune séquence active)
- Logo plein écran si configuré
- Sinon : logo + "Bienvenue" + bouton diagnostic "Test écriture Documents"

#### Écran d'affichage principal
Rendu du layout actif selon la séquence planifiée :

| Layout | Structure |
|--------|-----------|
| `fullscreen` | Zone unique plein écran |
| `two-columns` | 2 zones côte à côte |
| `two-rows` | 2 zones empilées verticalement |
| `grid-2x2` | 4 zones en grille 2×2 |

Chaque zone peut être de type :
- **`playlist`** — défilement de médias (vidéos/images) avec transition fade, ou widgets
- **`ticker`** — bandeau défilant horizontal de taux de change
- **`logo`** — image statique
- **`empty`** — écran noir

---

### Widgets

#### `tableau-change` — Taux de change
- Tableau achat/vente des principales devises
- 3 variantes : `simple` (scraping BestChange), `bkam` (taux officiels BKAM), `combined`
- Drapeaux des devises : USD, EUR, GBP, CAD, CHF, SAR, AED, GIP, MAD…
- Rafraîchissement automatique toutes les 30 min
- Options : `fontScale`, `logoSize`, `headerWeight`

#### `TickerMarquee` — Bandeau défilant
- Bande horizontale bas d'écran avec taux achat/vente
- Vitesse, hauteur, espacement inter-items configurables
- Cache local persisté entre redémarrages

#### `MessageMarquee` — Texte défilant
- Texte personnalisé, sens configurable (gauche→droite ou droite→gauche)

---

### Système de planification

#### Séquence `continue`
- Diffusion en boucle permanente
- Plusieurs séquences tournent en round-robin selon `loopOrder`
- Chaque séquence a une durée `loopDurationSec`
- Actives tant qu'aucune séquence `custom` ne prime

#### Séquence `custom`
- Planifiée sur dates (`startDate` / `endDate`), horaires (`startTime` / `endTime`), jours
- Priorité 0–100 pour gérer les conflits entre séquences simultanées
- Dès qu'une custom est active, elle prend le dessus sur les continues

#### Résolution (côté serveur, à chaque tick)
```
1. Séquences custom dont la plage date+heure+jour correspond maintenant
2. Si plusieurs → prendre la plus récente (startDate la plus haute)
3. Sinon → séquences continue en round-robin (loopOrder + loopDurationSec)
4. Résultat envoyé à l'app via bridge "display-schedule-updated"
```

---

### Interface d'administration web (`http://<IP>:3000`)

Accessible depuis n'importe quel navigateur sur le même réseau. Mot de passe par défaut : `admin`.

#### Login
- Formulaire mot de passe, cookie de session 24 h

#### Dashboard
- Séquence active en temps réel avec aperçu des zones
- Éditeur du ticker (items, vitesse, espacement, hauteur)
- Stats système : CPU, RAM, disque, uptime

#### Planification
- Liste de toutes les séquences
- Éditeur de séquence :
  - Choix de layout (4 templates ou layout personnalisé)
  - Onglets par zone (zone1, zone2, audio)
  - Ajout d'items : fichier média, widget, message texte
  - Durée par item, options de style
  - Planification : dates, heures, jours de la semaine
- Réorganisation des séquences continue par ordre de priorité

#### Médias
- Upload vidéo/image (mp4, m4v, mov, avi, mkv, webm, jpg, png, gif, webp)
- Liste des fichiers avec taille et durée
- Suppression individuelle ou par lot

#### Configuration
- Orientation de l'écran (4 rotations)
- Upload / suppression du logo
- Changement du mot de passe admin
- Planning HDMI-CEC allumage/extinction par jour de la semaine

---

### API principales (port 3000)

| Méthode | Route | Rôle |
|---------|-------|------|
| GET | `/api/sequences` | Liste toutes les séquences |
| POST | `/api/sequences` | Crée une séquence |
| PUT | `/api/sequences/:id` | Met à jour une séquence |
| DELETE | `/api/sequences/:id` | Supprime une séquence |
| GET | `/api/active-sequence` | Séquence actuellement active |
| GET | `/settings` | Config complète (orientation, ticker) |
| POST | `/upload` | Upload d'un fichier média |
| GET | `/uploads/:file` | Sert un fichier uploadé |
| GET | `/api/system-stats` | CPU / RAM / disque / uptime |
| GET | `/api/network-info` | Adresses IP réseau |
| POST | `/auth/login` | Authentification |

---

### Commandes de développement

```bash
yarn install          # Installation des dépendances (une seule fois)
yarn start            # Metro bundler — rechargement à chaud JS uniquement
yarn sync:server      # Rebuild admin UI + copie server/ → nodejs-assets/
yarn android          # Build APK complet + installation (~5 min)
```

> Modification de `server/` → `yarn sync:server && yarn android`
> Modification widgets RN uniquement → `yarn start` suffit

---

# Changelog — Admin UI Migration & Améliorations

## Changements récents — Widget TableauChange & config écran

### Widget TableauChange : fetch direct côté React Native
- Déplacé la récupération des taux dans le widget React Native au lieu d'utiliser les endpoints `/api/widgets/...` du serveur Node
- Créé `widgets/TableauChange/scrapers.ts` avec scraping direct de :
  - `https://bestchangetanger.com/cours-des-billets-de-banques-etrangers/`
  - `https://www.bkam.ma/Marches/Principaux-indicateurs/Marche-des-changes/Cours-de-change/Cours-de-reference`
- Aligné le parseur React Native sur la logique existante côté `server/lib/widget-tableau-change.js` et `server/lib/widget-bkam.js`
- Ajouté des headers HTTP de type navigateur pour améliorer la compatibilité avec BestChange
- Ajouté la remontée d'erreur visible dans le widget au lieu de masquer les erreurs par un simple `Aucune donnee disponible`
- Changé le rafraîchissement direct distant du widget à `30 min`

### Widget TableauChange : rendu et assets
- Uniformisé la taille des noms de devises sur toute la colonne pour éviter que chaque ligne auto-scale différemment
- Supprimé l'usage du logo distant `/logo/info` dans ce widget ; le composant utilise désormais son fallback local
- Corrigé la résolution des drapeaux pour normaliser les codes avec suffixe, ex. `CHF-1` → `CHF`
- Ajouté `GIP` dans le mapping des drapeaux locaux

### Config écran : réalignement admin/app TV
- Corrigé le contrat entre le menu `Configuration` de l'admin et l'app TV
- `server/views/src/context/AppContext.jsx` recharge maintenant la config écran via `GET /settings` au lieu de `GET /rotation`
- Ajouté `screenConfig` dans le contexte admin pour conserver la config complète de l'écran
- Corrigé `POST /settings` dans `server/server.js` pour accepter et propager `ticker.itemGap`
- Corrigé le broadcast `display-settings` pour inclure aussi `itemGap`

### Tentative annulée
- Une refactorisation temporaire avait déplacé des métadonnées/API widget dans `server/widgets/tableau-change/`
- Cette approche a ensuite été annulée pour respecter la décision de garder le scraping des taux directement dans le widget React Native

---

## Migration Admin UI : Vanilla JS → React (Vite + Tailwind)

### Phase 0 — Scaffolding
- Créé `server-ui/` (renommé ensuite `server/views/`) avec Vite + React 19 + Tailwind CSS 3
- Fichiers fondation : `api.js`, `constants.js`, `utils.js`, `utils/layoutTree.js`
- Contexts : `AuthContext.jsx` (auth + login/logout), `AppContext.jsx` (media, sequences, layouts, orientation, logo)
- `App.jsx` avec HashRouter, auth gate, 4 routes
- `Login.jsx` — page de connexion
- Composants UI : `Button`, `Card`, `Alert` (toast), `Modal`, `Spinner`, `FormGroup`
- Layout : `Nav.jsx` (sticky + hamburger mobile), `PageShell.jsx`
- Shared : `LayoutMiniPreview.jsx` (preview récursive), `MediaThumb.jsx`

### Phase 1 — Configuration
- `ConfigurationPage.jsx`, `OrientationCard.jsx`, `LogoCard.jsx`, `PasswordCard.jsx`

### Phase 2 — Medias
- `MediasPage.jsx`, `UploadZone.jsx` (drag-drop), `MediaTable.jsx`

### Phase 3 — Dashboard
- `DashboardPage.jsx`, `DashSidebar.jsx`, `DashPreview.jsx`, `DashZonePlayer.jsx`, `DashTicker.jsx`

### Phase 4 — Planification
- `PlanificationPage.jsx`, `SeqForm.jsx`, `ZoneTabs.jsx`, `ZoneItemsList.jsx`, `ZoneItem.jsx`
- `SourceSidebar.jsx`, `AddItemModal.jsx`
- `LayoutModal/` : `LayoutModal.jsx`, `LayoutPicker.jsx`, `LayoutEditor.jsx`, `LayoutEditorZone.jsx`, `LayoutDivider.jsx`

### Phase 5 — Finalisation
- Modifié `server/server.js` : route `/assets/*` pour servir les fichiers buildés (JS/CSS)
- Modifié `server/lib/utils.js` : ajout MIME types `.js` et `.css`
- Modifié `sync-node-server.sh` : build UI avant copie
- Modifié `.gitignore` : ajout `server/views/node_modules/`, `server/public/assets/`
- Modifié `package.json` : script `build:admin`
- Mis à jour `CLAUDE.md`

---

## Conversion TypeScript → JavaScript
- L'utilisateur a demandé du JavaScript, pas TypeScript
- Supprimé tous les fichiers `.ts/.tsx`, `tsconfig.json`, deps TS
- Recréé les 44 fichiers en `.js/.jsx` sans annotations de type
- Mis à jour `tailwind.config.js` (content glob `{js,jsx}`), `index.html` (entry `/src/main.jsx`)
- Renommé `vite.config.ts` → `vite.config.js`, simplifié build script

---

## Déplacement server-ui/ → server/views/
- `mv server-ui server/views`
- Mis à jour `vite.config.js` : outDir `../public`
- Mis à jour `sync-node-server.sh` : UI_DIR pointe vers `server/views`, utilise `rsync --exclude='views/'`
- Mis à jour `package.json` : `"build:admin": "cd server/views && npm run build"`
- Mis à jour `.gitignore` : `server/views/node_modules/`
- Mis à jour `CLAUDE.md` : toutes les références

---

## Corrections et améliorations post-migration

### Fix numéros de zones décalés (+1)
- **Problème** : les numéros de zone utilisaient un compteur séquentiel au lieu de l'id réel (`zone1` → 1)
- **Fichiers modifiés** :
  - `ZoneTabs.jsx` — extrait numéro depuis `z.id`
  - `LayoutEditorZone.jsx` — reçoit `zoneId` en prop, affiche le vrai numéro
  - `LayoutEditor.jsx` — passe `zoneId={node.id}`
  - `LayoutMiniPreview.jsx` — extrait numéro depuis `node.id`
  - `PlanificationPage.jsx` — extrait numéro depuis `selectedZoneId`

### Calendrier auto-open sur clic
- **Fichier** : `SeqForm.jsx`
- Ajouté `onClick={e => e.target.showPicker()}` sur les 4 inputs date/time

### Formulaire compact + layout à droite
- **Fichier** : `SeqForm.jsx`
- Réorganisé : champs en grille à gauche, layout preview à droite avec bordure verticale
- Réduit padding, taille texte, margins pour gagner de l'espace

### Suppression boutons "Nouvelle" et "Supprimer" du formulaire
- **Fichier** : `SeqForm.jsx`, `PlanificationPage.jsx`
- Retiré les boutons et les props `onCreate`/`onDelete` de SeqForm

### Fix divider drag dans l'éditeur de layout
- **Problème** : les zones et dividers étaient wrappés dans `<div className="contents">`, cassant `previousElementSibling`/`nextElementSibling` et `parentElement.getBoundingClientRect()`
- **Fichiers modifiés** :
  - `LayoutEditor.jsx` — remplacé le wrapper `contents` par `flatMap` (zones et dividers enfants directs du flex container)
  - `LayoutDivider.jsx` — réécrit : capture `totalSize`/`totalFlex` au mousedown, utilise `parentElement` correctement

### Séquences créées uniquement au clic "Enregistrer"
- **Problème** : naviguer vers Planification ou cliquer "Nouvelle séquence" créait immédiatement la séquence via API
- **Fichiers modifiés** :
  - `PlanificationPage.jsx` — ajout état `draft` local, `startNewDraft()` au lieu de `createSequence()`, `saveSeq` gère POST (nouveau) ou PUT (existant)
  - `SeqForm.jsx` — reçoit prop `isNew`, bouton affiche "Créer" ou "Enregistrer", layout apply ne sauvegarde pas si brouillon

### Champs formulaire largeur égale
- **Fichier** : `SeqForm.jsx`
- Changé `grid-cols-[1fr_auto]` → `grid-cols-2` pour que tous les champs aient la même largeur

---

## Fix build Android — MainApplication.kt

### Erreur `Unresolved reference 'ReactNativeApplicationEntryPoint'`
- **Problème** : `MainApplication.kt` importait `ReactNativeApplicationEntryPoint.loadReactNative` qui n'existe pas dans le fork `react-native-tvos@0.81`. Ce symbole appartient au template React Native standard mais n'a pas été porté dans la variante TV.
- **Fichier modifié** : `android/app/src/main/java/com/ehyoussef/tvviewerdev/MainApplication.kt`
  - Supprimé l'import `com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative`
  - Remplacé `loadReactNative(this)` par `DefaultNewArchitectureEntryPoint.load()` (déjà importé, API équivalente)
- **⚠️ Fix non permanent** : un `yarn prebuild:tv` écrase `android/` et régénère ce fichier avec le mauvais template. Solution définitive : créer un config plugin Expo (`plugins/withMainApplication.js`) qui applique ce patch automatiquement à chaque prebuild.
