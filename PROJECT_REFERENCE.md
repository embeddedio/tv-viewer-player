# Référence Complète du Projet — TV Signage "medchange" v3

> Document de référence détaillé de chaque dossier et fichier du projet.
> Utilisé pour cibler rapidement le fichier à modifier lors d'une intervention.

---

## Arborescence Générale

```
v3/
├── App.tsx                              # Point d'entrée React Native (628 lignes)
├── layouts.ts                           # Définitions des templates de layout (51 lignes)
├── package.json                         # Dépendances et scripts npm (40 lignes)
├── app.json                             # Configuration Expo (44 lignes)
├── tsconfig.json                        # Configuration TypeScript (5 lignes)
├── metro.config.js                      # Configuration Metro bundler (25 lignes)
├── eas.json                             # Configuration EAS Build (22 lignes)
├── sync-node-server.sh                  # Script de sync server → nodejs-assets (17 lignes)
├── help.txt                             # Historique des modifications (22 lignes)
├── README.md                            # Documentation du projet (53 lignes)
├── Cahier_Des_Charges_TV_Signage_Node_Android_v3.md  # Spécifications complètes
├── .gitignore                           # Fichiers ignorés par Git (22 lignes)
│
├── components/                          # Composants React Native
│   ├── FullscreenPlaylist.tsx           # Lecteur de médias plein écran (164 lignes)
│   ├── LayoutRenderer.tsx              # Rendu multi-zones (88 lignes)
│   ├── ZoneContent.tsx                 # Contenu par zone (142 lignes)
│   ├── TickerMarquee.tsx               # Bandeau défilant devises (217 lignes)
│   ├── TickerIcon.tsx                  # Icône de devise (59 lignes)
│   └── VideoViewWrapper.tsx            # Wrapper lecteur vidéo (53 lignes)
│
├── server/                              # Serveur Node.js embarqué
│   ├── server.js                       # Serveur HTTP principal (1300 lignes)
│   ├── main.js                         # Point d'entrée Node.js mobile (11 lignes)
│   ├── package.json                    # Métadonnées serveur, 0 dépendances (7 lignes)
│   ├── lib/                            # Modules serveur
│   │   ├── config.js                   # Gestion configuration & persistance (430 lignes)
│   │   ├── media.js                    # Upload/suppression/listing médias (461 lignes)
│   │   ├── layouts.js                  # Templates de layouts côté serveur (33 lignes)
│   │   ├── auth.js                     # Authentification & sessions (160 lignes)
│   │   ├── bridge.js                   # Communication vers React Native (26 lignes)
│   │   ├── utils.js                    # Utilitaires (Mutex, MIME, cookies) (170 lignes)
│   │   ├── currency.js                 # Scraping cours de devises (191 lignes)
│   │   └── scheduler.js               # Planification par jour (33 lignes)
│   ├── public/
│   │   └── index.html                  # Interface admin web SPA (609 lignes)
│   ├── data/
│   │   ├── config.json                 # Configuration active (orientation, ticker)
│   │   ├── metadata.json              # Métadonnées des fichiers uploadés
│   │   └── auth.json                   # Hash mot de passe & secret session
│   └── uploads/                        # Stockage des médias uploadés
│
├── nodejs-assets/
│   └── nodejs-project/                 # ⚠️ MIROIR de server/ — NE JAMAIS ÉDITER ICI
│       └── (même structure que server/)
│
├── android/                            # Projet natif Android
│   ├── app/
│   │   ├── build.gradle               # Config build de l'app (192 lignes)
│   │   └── src/main/
│   │       ├── AndroidManifest.xml     # Permissions & activités
│   │       └── java/com/ehyoussef/medchange/
│   │           ├── MainActivity.kt     # Activité React Native principale
│   │           └── MainApplication.kt  # Initialisation app + Expo
│   ├── build.gradle                    # Config Gradle racine
│   ├── settings.gradle                 # Plugins Gradle & autolinking
│   └── gradle.properties              # Propriétés JVM, architectures, Hermes
│
├── assets/
│   └── images/                         # Icônes TV (bannière Android TV, Apple TV)
│
├── ios/                                # Projet natif iOS (Apple TV)
└── node_modules/                       # Dépendances installées
```

---

## FICHIERS RACINE

---

### `App.tsx` — Point d'entrée principal (628 lignes)

**Rôle :** Composant React Native principal. Démarre le serveur Node.js, récupère toute la configuration via HTTP, écoute les messages bridge pour les mises à jour temps réel, et orchestre l'affichage.

**Types définis :**
```typescript
type TickerItem = {
  code: string; label: string; icon?: string;
  buy?: number | string; sell?: number | string;
  buyLabel?: string; sellLabel?: string;
}
```

**Constantes :**
- `DEFAULT_TICKER_ITEMS` — 3 devises par défaut (USD, EUR, GBP)
- `DEFAULT_TICKER_CONFIG` — `{ heightPercent: 10, itemGap: 28, scale: 90, speed: 100 }`
- `TICKER_CACHE_FILE` — Chemin fichier cache pour les données ticker

**State (useState) :**

| Variable | Type | Description |
|----------|------|-------------|
| `deviceIp` | `string` | Toujours `"127.0.0.1"` |
| `tickerConfig` | `object` | Config du ticker (hauteur, gap, scale, speed, items) |
| `tickerHeightPx` | `number` | Hauteur calculée du ticker en pixels |
| `playlist` | `Array` | Liste des médias (name, category, duration) |
| `currentIndex` | `number` | Index courant dans la playlist |
| `logoInfo` | `{url, name} \| null` | URL et nom du logo actif |
| `activeDisplay` | `ActiveDisplay \| null` | Configuration layout active (layoutId + zones) |
| `layoutRotation` | `string` | Orientation écran (portrait-up/down, landscape-left/right) |
| `screenDimensions` | `{width, height}` | Dimensions fenêtre courantes |

**Refs (useRef) :**

| Ref | Description |
|-----|-------------|
| `nodeServerStartedRef` | Flag empêchant le double démarrage du serveur |
| `timerRef` | setTimeout pour avancement média |
| `retryTimerRef` | Timer de retry pour les appels API |
| `videoRef` | Référence au composant VideoView |

**Endpoints HTTP appelés :**

| Endpoint | Méthode | Données récupérées |
|----------|---------|-------------------|
| `/settings` | GET | Orientation + config ticker |
| `/devises` | GET | Cours des devises |
| `/content` | GET | Playlist des médias |
| `/api/active-display` | GET | Layout actif + configuration zones |
| `/logo/info` | GET | URL et nom du logo |
| `/uploads/{filename}` | GET | Fichiers médias (images/vidéos) |

**Messages bridge écoutés :**

| Type message | Action |
|-------------|--------|
| `server-ready` | Déclenche le fetch de toutes les configs |
| `server-error` | Log l'erreur serveur |
| `logo-updated` | Relance `fetchLogo()` |
| `display-settings` | Met à jour orientation + ticker config |
| `display-rotation` | Met à jour l'orientation seule |
| `display-ecart` | Met à jour l'espacement ticker |
| `display-devises` | Met à jour la liste des devises |
| `display-content` | Met à jour la playlist |
| `display-layout` | Met à jour le layout actif |

**Logique principale :**
1. **Démarrage serveur Node.js** — Au mount, via `nodejs-mobile-react-native`
2. **Chargement cache** — Charge les données ticker depuis le fichier cache
3. **Polling 60s** — Boucle de sécurité qui re-fetch `/api/active-display`
4. **Fetch initial** — Quand `server-ready` reçu, fetch settings + devises + content + display + logo
5. **Retry 3s** — En cas d'échec réseau, retry automatique après 3 secondes
6. **Calcul rotation** — Applique des transforms CSS selon l'orientation choisie

**Quand modifier ce fichier :**
- Ajouter un nouveau type de données à récupérer du serveur
- Modifier la logique de rotation/orientation
- Changer le comportement au démarrage
- Ajouter un nouveau message bridge à écouter
- Modifier le layout global de l'app (composants enfants affichés)

---

### `layouts.ts` — Templates de layout (51 lignes)

**Rôle :** Définit les 5 templates de disposition d'écran et les types TypeScript associés. Miroir de `server/lib/layouts.js` côté serveur.

**Templates disponibles :**

| ID | Label | Direction | Zones |
|----|-------|-----------|-------|
| `fullscreen` | Plein écran | column | `main` (flex: 1) |
| `two-columns` | Deux colonnes (50/50) | row | `left` (1), `right` (1) |
| `big-small` | Grande + petite (70/30) | row | `left` (7), `right` (3) |
| `content-banner` | Contenu + bandeau bas (80/20) | column | `top` (8), `bottom` (2) |
| `three-columns` | Trois colonnes | row | `left` (1), `center` (1), `right` (1) |

**Types exportés :**

| Type | Description |
|------|-------------|
| `LayoutId` | Union des clés de templates (`"fullscreen" \| "two-columns" \| ...`) |
| `ZoneType` | `"playlist" \| "ticker" \| "logo" \| "empty"` |
| `ZoneConfig` | `{ type: ZoneType, fileNames?: string[] }` |
| `LayoutTemplate` | Structure template (label, direction, zones avec flex) |
| `ActiveDisplay` | `{ layoutId: LayoutId, zones: Record<string, ZoneConfig> }` |

**⚠️ Important :** Les templates doivent rester synchronisés avec `server/lib/layouts.js`.

**Quand modifier ce fichier :**
- Ajouter un nouveau template de layout
- Modifier les proportions d'un layout existant
- Ajouter un nouveau type de zone

---

### `package.json` — Dépendances et scripts (40 lignes)

**Nom :** `medchange` | **Version :** `1.0.0` | **Privé :** oui

**Scripts :**

| Commande | Action |
|----------|--------|
| `yarn start` | `EXPO_TV=1 expo start` — Serveur dev avec support TV |
| `yarn android` | `EXPO_TV=1 expo run:android` — Build + run Android TV |
| `yarn ios` | `EXPO_TV=1 expo run:ios` — Build + run Apple TV |
| `yarn web` | `expo start --web` — Version web |
| `yarn prebuild:tv` | `EXPO_TV=1 expo prebuild --clean` — Prebuild TV (obligatoire avant 1er build natif) |
| `yarn prebuild` | `expo prebuild --clean` — Prebuild mobile |
| `yarn sync:server` | `./sync-node-server.sh` — Sync server/ → nodejs-assets/ |

**Dépendances principales :**

| Package | Version | Rôle |
|---------|---------|------|
| `react` | 19.1.0 | Framework UI |
| `react-native` | `react-native-tvos@0.81-stable` | Fork TV de React Native |
| `expo` | ^54.0.20 | Plateforme de build |
| `nodejs-mobile-react-native` | ^18.20.4 | Runtime Node.js embarqué |
| `expo-video` | ~3.0.15 | Lecteur vidéo (VideoView) |
| `expo-av` | ~16.0.8 | Support audio/vidéo |

**DevDependencies :**
- `typescript ~5.9.2`, `@react-native-tvos/config-tv ^0.1.4`, `@types/react ~19.1.10`

**Section expo :** Exclut `react-native` de l'install Expo (pour utiliser le fork TV).

---

### `app.json` — Configuration Expo (44 lignes)

**Package :** `com.ehyoussef.medchange`

**Plugins :**
- `@react-native-tvos/config-tv` — Avec images TV (bannière Android 400x240, icônes Apple TV)
- `expo-video` — Support vidéo

**Paramètres clés :**
- `newArchEnabled: true` — Nouvelle architecture React Native (Fabric)
- `edgeToEdgeEnabled: true` — Affichage bord à bord
- Splash screen : `icon-1920x720.png`
- EAS project ID : `0c3150d0-0cb6-48b7-8b81-84d05b0b74f8`

---

### `metro.config.js` — Bundler Metro (25 lignes)

**Rôle :** Configuration du bundler JavaScript Metro.

**État actuel :** Utilise la config Expo par défaut. Le code pour les extensions TV-spécifiques (`.tv.tsx`, `.ios.tv.tsx`, `.android.tv.tsx`) est **commenté** car il impacte les performances du bundling.

---

### `eas.json` — EAS Build (22 lignes)

**Profiles de build :**
- `development` — Client de développement, distribution interne
- `preview` — Distribution interne pour tests
- `production` — Auto-increment des versions

---

### `sync-node-server.sh` — Script de synchronisation (17 lignes)

**Rôle :** Copie intégralement `server/` vers `nodejs-assets/nodejs-project/`. Supprime l'ancienne copie avant de copier.

**⚠️ Obligatoire :** À exécuter après chaque modification dans `server/`.

---

### `help.txt` — Historique des modifications (22 lignes)

**Dernière mise à jour :** 2025-12-18

**Changements documentés :**
- Boot receiver Android (auto-démarrage au boot)
- Crash handler (auto-restart après 2s via AlarmManager)
- Migration vidéo expo-video → expo-av (puis retour à expo-video)
- Gestion rotation globale dans App.tsx

---

## DOSSIER `components/`

---

### `FullscreenPlaylist.tsx` — Lecteur de médias (164 lignes)

**Rôle :** Affiche les médias (images, vidéos, audio) en plein écran avec transitions de fondu et avancement automatique dans la playlist.

**Props :**

| Prop | Type | Description |
|------|------|-------------|
| `items` | `Array<{name, originalName?, category, duration}>` | Liste des médias |
| `baseUrl` | `string` | URL de base pour les médias (`http://127.0.0.1:3000/uploads/`) |
| `index` | `number` | Index courant |
| `setIndex` | `(i: number) => void` | Setter pour changer l'index |
| `videoRef` | `Ref<VideoView>` | Référence au player vidéo |
| `timerRef` | `Ref<setTimeout>` | Référence au timer d'avancement |
| `rotation?` | `string` | Rotation (ignorée, gérée par le parent) |

**Détection du type de média :**
- **Images :** `.png, .jpg, .jpeg, .gif, .webp, .bmp, .svg`
- **Vidéos :** `.mp4, .m4v, .mov, .avi, .mkv, .webm`
- **Audio :** `.mp3, .aac, .wav, .flac, .ogg`

**Logique clé :**
1. **Fonction advance()** — Fondu sortant (120ms) → incrémente index (boucle) → fondu entrant (220ms)
2. **Timer de durée** — setTimeout basé sur `item.duration` → appelle advance()
3. **Erreur vidéo** — Appelle advance() pour passer au média suivant
4. **Rendu conditionnel** — `Animated.Image` pour images, `VideoViewWrapper` pour vidéos, `Text` pour audio

**Quand modifier ce fichier :**
- Changer les animations de transition
- Modifier les durées de fondu
- Ajouter un nouveau type de média supporté
- Modifier le comportement en cas d'erreur

---

### `LayoutRenderer.tsx` — Rendu multi-zones (88 lignes)

**Rôle :** Rend les layouts multi-zones en utilisant les templates définis dans `layouts.ts`. Chaque zone est déléguée à `ZoneContent`.

**Props :**

| Prop | Type | Description |
|------|------|-------------|
| `layoutId` | `LayoutId \| null` | ID du template de layout |
| `activeDisplay` | `ActiveDisplay \| null` | Configuration complète (layout + zones) |
| `playlist` | `Array` | Playlist des médias |
| `tickerConfig` | `object` | Configuration du ticker |
| `tickerItems` | `any[]` | Éléments du ticker (devises) |
| `logoInfo` | `object \| null` | Info du logo |
| `baseUrl` | `string` | URL de base des médias |
| `rotation?` | `string` | Orientation |

**Logique :**
1. Résout le template depuis `LAYOUT_TEMPLATES` (défaut : `fullscreen`)
2. Applique `flexDirection` (row ou column) selon le template
3. Mappe chaque zone du template → composant `ZoneContent` avec sa config

**Quand modifier ce fichier :**
- Changer la logique de résolution des layouts
- Ajouter des propriétés globales aux zones
- Modifier le style conteneur des layouts

---

### `ZoneContent.tsx` — Contenu par zone (142 lignes)

**Rôle :** Rend le contenu d'une zone individuelle selon son type configuré (playlist, ticker, logo, ou vide).

**Props :**

| Prop | Type | Description |
|------|------|-------------|
| `zoneConfig` | `ZoneConfig` | Type de zone + fichiers optionnels |
| `playlist` | `Array` | Playlist complète |
| `tickerConfig` | `object` | Config ticker |
| `tickerItems` | `any[]` | Éléments devises |
| `logoInfo` | `object \| null` | Info logo |
| `baseUrl` | `string` | URL de base |
| `rotation?` | `string` | Orientation |

**State interne :** `currentIndex` (index de lecture propre à la zone)

**Rendu par type de zone :**

| Type | Composant | Description |
|------|-----------|-------------|
| `playlist` | `FullscreenPlaylist` | Filtre la playlist par `fileNames` si spécifié. Si pas de fichiers, affiche le logo. |
| `ticker` | `TickerMarquee` | Bandeau défilant avec devises, utilise scale/speed/itemGap du config |
| `logo` | `Image` | Logo affiché à 90% avec padding |
| `empty` | `View` | Zone noire vide |

**Quand modifier ce fichier :**
- Ajouter un nouveau type de zone (ex: `webpage`, `marquee`)
- Modifier la logique de filtrage playlist par zone
- Changer le comportement quand une zone n'a pas de contenu

---

### `TickerMarquee.tsx` — Bandeau défilant (217 lignes)

**Rôle :** Affiche un bandeau défilant en boucle infinie avec les cours des devises (code, prix achat, prix vente).

**Props :**

| Prop | Type | Description |
|------|------|-------------|
| `items` | `TickerItem[]` | Liste des devises |
| `scale` | `number` | Facteur d'échelle (0.1 à 5) |
| `itemGap` | `number` | Espacement entre items |
| `speed` | `number` | Vitesse (100 = normal) |

**State :** `contentWidth` (largeur mesurée du contenu), `duplicated` (items doublés pour boucle sans coupure)

**Logique d'animation :**
1. Mesure la largeur du contenu (`onLayout`)
2. Duplique les items pour un défilement continu
3. Calcule la durée : `baseDuration = contentWidth * 25` (min 8000ms), divisée par `speed/100`
4. `Animated.loop()` avec interpolation de 0 à `-contentWidth/2`

**Couleurs :**
- Achat : `#4ade80` (vert)
- Vente : `#f87171` (rouge)
- Label : `#94a3b8` (gris)
- Code : `#f8fafc` (blanc)

**Quand modifier ce fichier :**
- Changer le style visuel du ticker
- Modifier la formule de vitesse
- Ajouter des champs affichés (ex: variation, pourcentage)

---

### `TickerIcon.tsx` — Icône devise (59 lignes)

**Rôle :** Affiche l'icône d'une devise : image URL ou fallback texte.

**Props :** `value?` (URL ou symbole), `fallback` (texte de secours), `scale` (multiplicateur)

**Logique :** Taille = 48 × scale. Si `value` contient `https:`, `http:` ou `data:` → `Image`. Sinon → `Text` avec le premier caractère.

---

### `VideoViewWrapper.tsx` — Wrapper vidéo (53 lignes)

**Rôle :** Encapsule `expo-video` VideoView avec configuration par défaut pour l'affichage signalétique.

**Props :** `uri` (URL vidéo), `onError` (callback erreur), `rotation?` (inutilisé)

**Configuration fixe :**
- `autoPlay: true`, `isLooping: true`, `isMuted: true`
- `nativeControls: false`, `allowsFullscreen: false`, `allowsPictureInPicture: false`

**Gestion erreur :** `onStatusUpdate` vérifie les erreurs et appelle `onError()`.

---

## DOSSIER `server/`

> ⚠️ **Zéro dépendances externes** — Utilise uniquement les modules intégrés de Node.js (http, https, fs, path, crypto).
> Après modification, toujours exécuter `yarn sync:server`.

---

### `server/server.js` — Serveur HTTP principal (1300 lignes)

**Rôle :** Serveur HTTP monolithique gérant toutes les routes REST, la logique métier, et la communication avec l'app.

**⚠️ Note :** Ce fichier coexiste avec les modules de `lib/`. Il contient la version originale monolithique. Les modules `lib/` sont la version refactorée. Le fichier `server.js` charge les modules de `lib/` et les utilise.

**Constantes :**
- `MAX_BODY_SIZE` : 60 Mo
- `DEFAULT_DURATION` : 10 secondes par média
- `CURRENCY_REFRESH_MS` : 30 minutes

**Routes API :**

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/` | Sert l'interface admin (index.html) |
| GET | `/files` | Liste tous les fichiers uploadés avec métadonnées |
| GET | `/content` | Retourne le contenu/playlist du DB en mémoire |
| GET | `/devises` | Retourne les éléments du ticker (devises) |
| GET | `/rotation` | Retourne l'orientation actuelle |
| GET | `/ecart` | Retourne l'espacement entre items ticker |
| GET | `/settings` | Retourne la config complète de l'app |
| GET | `/logo/info` | Retourne les infos du logo actif |
| GET | `/uploads/:path` | Sert un fichier uploadé |
| GET | `/api/active-display` | Retourne la config d'affichage active |
| GET | `/api/auth/status` | Retourne le statut d'authentification |
| POST | `/upload` | Upload d'un média ou logo (base64) |
| POST | `/delete` | Supprime un fichier média |
| POST | `/files/update` | Met à jour les métadonnées des fichiers |
| POST | `/content` | Met à jour le contenu dans le DB |
| POST | `/devises` | Met à jour les items devises |
| POST | `/rotation` | Change l'orientation |
| POST | `/ecart` | Change l'espacement ticker |
| POST | `/settings` | Écrit la configuration complète |
| POST | `/logo/delete` | Supprime le logo actif |
| POST | `/api/login` | Connexion admin |
| POST | `/api/logout` | Déconnexion |
| POST | `/api/change-password` | Changement de mot de passe |
| POST | `/api/schedule` | Sauvegarde la planification |

**Messages bridge émis :**

| Type | Déclencheur |
|------|-------------|
| `server-ready` | Serveur démarré |
| `display-content` | Playlist modifiée |
| `display-devises` | Liste devises modifiée |
| `display-rotation` | Orientation modifiée |
| `display-ecart` | Espacement ticker modifié |
| `display-settings` | Configuration modifiée |
| `logo-updated` | Logo uploadé/supprimé |
| `display-layout` | Layout actif modifié |
| `server-error` | Erreur serveur |

**Base de données en mémoire (`db`) :**
```javascript
{
  rotation: string,       // Orientation
  ecart: number,          // Espacement items ticker
  tickerItems: Array,     // Items devises
  content: Array           // Métadonnées fichiers (playlist)
}
```

**Quand modifier ce fichier :**
- Ajouter une nouvelle route API
- Modifier la logique de réponse d'une route existante
- Changer le port du serveur (3000)
- Ajouter un nouveau type de message bridge

---

### `server/main.js` — Point d'entrée Node.js Mobile (11 lignes)

**Rôle :** Initialise le bridge `rn-bridge` et charge `server.js`. Intercepte les erreurs de démarrage et les envoie à l'app React Native.

```javascript
const rnBridge = require('rn-bridge');
// require('./server') → démarre le serveur
// try/catch → sendToApp('server-error', ...) si erreur
```

**Quand modifier ce fichier :**
- Changer le fichier serveur chargé
- Ajouter de la logique d'initialisation avant le serveur

---

### `server/lib/config.js` — Gestion de la configuration (430 lignes)

**Rôle :** Module central de gestion de la configuration. Lecture/écriture des fichiers JSON, validation, sanitisation.

**Exports principaux :**

| Export | Description |
|--------|-------------|
| `db` | Base de données en mémoire |
| `initDB()` | Initialise le DB depuis les fichiers JSON |
| `loadJsonSafeAsync()` / `loadJsonSafeSync()` | Chargement JSON sécurisé |
| `persistConfigPartialAsync(partial)` | Sauvegarde partielle de la config |
| `writeConfigAsync(data)` | Réécriture complète de la config |
| `getAppConfigAsync()` | Retourne la config actuelle |
| `readRawConfigAsync()` | Lecture brute du fichier config |
| `updateOrientation(value)` | Met à jour l'orientation |
| `updateTickerSettings(settings)` | Met à jour le ticker |
| `broadcastDisplaySettings()` | Envoie la config à l'app via bridge |
| `getContent/setContent` | Getter/setter contenu |
| `getDevises/setDevises` | Getter/setter devises |
| `getRotation/setRotation` | Getter/setter orientation |
| `getEcart/setEcart` | Getter/setter espacement |
| `sanitizeOrientation()` | Valide les valeurs d'orientation |
| `sanitizeTicker()` | Valide les bornes du ticker |
| `sanitizeTickerItems()` | Valide les items devises |

**Structure config par défaut :**
```javascript
{
  orientation: 'portrait-up',
  ticker: {
    heightPercent: 10,    // Bornes: 5-100
    itemGap: 28,          // Bornes: 0-200
    scale: 90,            // Bornes: 10-500
    speed: 100,           // Bornes: 10-1000
    items: [...]
  },
  display: {
    layoutId: 'fullscreen',
    zones: { main: { type: 'playlist' } }
  },
  schedule: {
    enabled: false,
    default: { layoutId: 'fullscreen', zones: {...} },
    days: { monday: null, tuesday: null, ... }
  }
}
```

**Fichiers persistés :** `data/config.json`, `data/metadata.json`

**Quand modifier ce fichier :**
- Ajouter un nouveau paramètre de configuration
- Modifier les bornes de validation (ticker, orientation)
- Ajouter un nouveau champ au DB en mémoire
- Changer la logique de persistance

---

### `server/lib/media.js` — Gestion des médias (461 lignes)

**Rôle :** Upload, suppression, listing et service des fichiers médias et du logo.

**Exports principaux :**

| Export | Description |
|--------|-------------|
| `handleUpload(req, res)` | Upload d'un média ou logo (base64) |
| `handleDelete(req, res)` | Suppression d'un fichier |
| `handleLogoDelete(req, res)` | Suppression du logo actif |
| `handleUpdateFiles(req, res)` | Mise à jour des métadonnées |
| `listFilesAsync(req, res)` | Liste des fichiers avec métadonnées |
| `getCurrentLogoAsync(req, res)` | Info du logo actif |
| `serveUpload(req, res, filePath)` | Sert un fichier avec bon MIME type |
| `serveIndexHtml(req, res)` | Sert l'interface admin |
| `refreshContentAsync()` | Rafraîchit le contenu depuis les fichiers |

**Fonctions internes :**
- `saveLogoFileAsync()` — Sauvegarde logo avec préfixe `logo-{timestamp}-`
- `removeCurrentLogoAsync()` — Supprime tous les fichiers logo
- `readMetadataAsync()` / `writeMetadataAsync()` — Lecture/écriture metadata.json
- `syncMetadataAsync()` — Synchronise métadonnées avec le filesystem
- `appendToMetadataAsync()` / `removeFromMetadataAsync()` — Ajouter/supprimer entrées

**Nommage des fichiers :**
- Logos : `logo-{timestamp}-{nom-sanitisé}`
- Médias : `{catégorie}-{timestamp}-{random}-{ext}`

**Extensions autorisées :**
- Images : `.png, .jpg, .jpeg, .gif, .webp, .bmp, .svg`
- Vidéos : `.mp4, .m4v, .mov, .avi, .mkv, .webm`
- Audio : `.mp3, .aac, .wav, .flac, .ogg`

**Taille max upload :** 60 Mo

**Quand modifier ce fichier :**
- Ajouter un nouveau type de fichier supporté
- Modifier la logique d'upload (nom, validation, stockage)
- Changer la limite de taille
- Modifier la gestion du logo

---

### `server/lib/auth.js` — Authentification (160 lignes)

**Rôle :** Gestion de l'authentification par mot de passe avec sessions.

**Caractéristiques :**
- Hachage HMAC-SHA256
- Sessions en mémoire (Map) avec expiration 24h
- Nettoyage des sessions expirées toutes les heures
- Mot de passe par défaut : `"medchange"`
- Longueur minimum : 4 caractères
- Cookie : `mc_session` (HttpOnly, SameSite=Strict)

**Exports :**

| Export | Description |
|--------|-------------|
| `initAuth()` | Initialise depuis `data/auth.json` ou crée un défaut |
| `login(password)` | Retourne un token de session |
| `logout(token)` | Invalide la session |
| `changePassword(current, new)` | Change le mot de passe (min 4 chars) |
| `requireAuth(req)` | Vérifie que la requête est authentifiée |
| `getAuthStatus(req)` | Retourne le statut d'auth |
| `cleanupExpiredSessions()` | Nettoie les sessions expirées |

**Fichier persisté :** `data/auth.json`
```javascript
{
  passwordHash: string,        // Hash HMAC-SHA256
  sessionSecret: string,       // Clé secrète pour le hachage
  isDefaultPassword: boolean   // true si mot de passe par défaut
}
```

---

### `server/lib/bridge.js` — Communication vers l'app (26 lignes)

**Rôle :** Envoie des messages JSON à l'app React Native via `rn-bridge`.

**Export unique :** `sendToApp(type, payload)` — Stringifie `{ type, ...payload }` et l'envoie via `rnBridge.channel.send()`. Échoue silencieusement si le bridge n'est pas disponible (exécution locale).

---

### `server/lib/utils.js` — Utilitaires (170 lignes)

**Rôle :** Fonctions utilitaires partagées par tous les modules serveur.

**Exports :**

| Export | Description |
|--------|-------------|
| `Mutex` | Classe d'exclusion mutuelle (file d'attente de Promises) |
| `configLock` | Instance Mutex pour les opérations config |
| `metadataLock` | Instance Mutex pour les opérations metadata |
| `sanitizeFilename(name)` | Supprime caractères spéciaux des noms de fichiers |
| `getExtension(name)` | Extrait l'extension (minuscule) |
| `readRequestBody(req, maxSize)` | Lit le body HTTP avec limite (défaut 60 Mo) |
| `getMimeType(filename)` | Détermine le type MIME selon l'extension |
| `sendHtml(res, html)` | Envoie HTML avec header no-store |
| `sendJson(res, data, status)` | Envoie réponse JSON |
| `notFound(res)` | Envoie 404 |
| `parseCookies(req)` | Parse le header Cookie |
| `setCookieHeader(res, name, value, opts)` | Définit un cookie HttpOnly/SameSite=Strict |
| `clearCookieHeader(res, name)` | Supprime un cookie |

**Types MIME supportés :** PNG, JPEG, GIF, WebP, SVG, MP4, M4V, MOV, AVI, MKV, WebM, MP3, AAC, WAV, FLAC, OGG, PDF.

---

### `server/lib/currency.js` — Scraping devises (191 lignes)

**Rôle :** Récupère les cours des devises depuis `bestchangetanger.com` et les formate pour le ticker.

**Exports :**
- `refreshCurrencyTicker()` — Fetch HTTPS + parsing HTML → met à jour `db.tickerItems`
- `startCurrencyTickerScheduler()` — Lance un refresh toutes les 30 minutes

**Fonctions internes :**
- `fetchCurrencyHtml(url, redirectCount)` — Fetch HTTPS avec suivi de redirections (max 3)
- `extractTableHtml(html)` — Extrait le premier `<table>` du HTML
- `parseCurrencyRows(tableHtml)` — Parse les `<tr>` / `<td>` du tableau
- `formatCurrencies(rows)` — Formate les données extraites
- `mapCurrenciesToTickerItems(currencies)` — Convertit en format TickerItem

**Format de sortie par devise :**
```javascript
{
  code: "EUR",
  label: "Europe : Euro - EUR",
  icon: "https://bestchangetanger.com/...",
  buyLabel: "Achat",
  sellLabel: "Vente",
  buy: "10.52",
  sell: "11.16"
}
```

---

### `server/lib/scheduler.js` — Planification (33 lignes)

**Rôle :** Détermine la configuration d'affichage active en fonction du jour de la semaine.

**Export unique :** `resolveActiveDisplay(config)` — Si schedule désactivé, retourne la config d'affichage par défaut. Sinon, vérifie si le jour courant a une config spécifique, sinon utilise le défaut.

**Retourne :** `{ layoutId, zones, ticker }`

---

### `server/lib/layouts.js` — Templates de layout (33 lignes)

**Rôle :** Miroir serveur de `layouts.ts`. Définit les mêmes 5 templates de layout.

**⚠️ Doit rester synchronisé avec `layouts.ts` côté frontend.**

---

### `server/public/index.html` — Interface admin web (609 lignes)

**Rôle :** Application web monopage (SPA) pour l'administration du système de signalétique. Aucune dépendance externe — HTML/CSS/JS pur.

**Thème :** Dark (fond `#030712`), accents cyan/bleu gradient.

**Authentification :**
- Page de login avec champ mot de passe
- Indicateur si mot de passe par défaut
- Changement de mot de passe
- Session 24h via cookie

**Onglets :**

| Onglet | Contenu |
|--------|---------|
| **Médias** | Zone drag-and-drop upload, grille de fichiers (nom, catégorie, taille, durée), suppression, upload/suppression logo |
| **Affichage** | Sélecteur orientation (4 choix), paramètres ticker (hauteur %, échelle, vitesse, espacement), planification par jour avec activation/désactivation |
| **Paramètres** | Formulaire changement mot de passe, aperçu JSON de la configuration |

**Endpoints appelés :**
- `GET /api/auth/status`, `POST /api/login`, `POST /api/logout`, `POST /api/change-password`
- `GET /files`, `POST /upload`, `POST /delete`
- `GET /logo/info`, `POST /logo/delete`
- `GET /settings`, `POST /settings`
- `POST /api/schedule`

**Quand modifier ce fichier :**
- Modifier l'interface d'administration
- Ajouter un onglet ou une fonctionnalité admin
- Changer le style visuel
- Ajouter un nouveau widget configurable

---

### `server/data/config.json` — Configuration active (119 lignes)

**Structure :**
```json
{
  "orientation": "portrait-up",
  "ticker": {
    "heightPercent": 10,
    "itemGap": 28,
    "scale": 90,
    "speed": 100,
    "items": [/* 12 devises avec cours achat/vente */]
  }
}
```

**Contient :** Orientation écran + configuration complète du ticker avec les derniers cours récupérés (EUR, USD, CAD, GBP, CHF, SAR, KWD, AED, QAR, BHD, JPY...).

---

### `server/data/metadata.json` — Métadonnées médias (7 lignes)

**Structure :** Tableau d'objets `{ name, originalName, duration }` — un par fichier uploadé. La durée par défaut est 10 secondes.

---

## DOSSIER `android/`

---

### `android/app/src/main/java/com/ehyoussef/medchange/MainActivity.kt`

**Rôle :** Activité React Native principale. Gère le splash screen Expo, le composant principal React Native ("main"), et la compatibilité du bouton retour Android 12+.

**Points clés :**
- Composant principal : `"main"` (correspond à l'entry RN)
- Utilise `ReactActivityDelegateWrapper` d'Expo
- Support nouvelle architecture (Fabric) via `BuildConfig.IS_NEW_ARCHITECTURE_ENABLED`
- Back button : `moveTaskToBack` pour Android ≤ R, comportement par défaut pour Android S+

---

### `android/app/src/main/java/com/ehyoussef/medchange/MainApplication.kt`

**Rôle :** Initialise React Native et les modules Expo au démarrage de l'application Android.

**Points clés :**
- Entry JS : `.expo/.virtual-metro-entry`
- Autolink tous les packages React Native via `PackageList`
- Developer support en mode DEBUG uniquement
- Dispatche les événements lifecycle aux modules Expo

**⚠️ Note :** `BootReceiver.kt` n'existe plus dans le projet actuel (il est mentionné dans help.txt mais le fichier n'est pas présent).

---

### `android/app/src/main/AndroidManifest.xml`

**Permissions déclarées :**
- `INTERNET` — Accès réseau
- `MODIFY_AUDIO_SETTINGS` / `RECORD_AUDIO` — Audio
- `READ_EXTERNAL_STORAGE` / `WRITE_EXTERNAL_STORAGE` — Fichiers
- `SYSTEM_ALERT_WINDOW` — Fenêtres superposées
- `VIBRATE` — Vibration

**Configuration Activity :**
- `launchMode="singleTask"` — Une seule instance
- `configChanges` — Gère clavier, orientation, taille écran sans recréer l'activité
- Intent MAIN + LAUNCHER → Visible sur l'écran d'accueil

**Expo Updates :** Désactivé (`ENABLED = false`)

---

### `android/build.gradle` — Gradle racine

Plugins : Android Gradle, React Native Gradle, Kotlin. Repositories : Google, Maven Central, JitPack.

---

### `android/app/build.gradle` — Build app (192 lignes)

**Configuration clé :**
- Package : `com.ehyoussef.medchange`
- Version : `1.0.0` (versionCode 1)
- ABI splits : `armeabi-v7a`, `arm64-v8a`, `x86_64` (pas de universal APK)
- Hermes JS engine activé
- Nouvelle architecture React Native activée
- Support GIF et WebP activé
- Minification en release : configurable via propriété
- **⚠️ Release signé avec debug.keystore** — À remplacer pour la production

---

### `android/gradle.properties`

- JVM : 2048 Mo heap, 512 Mo metaspace
- Builds parallèles activés
- AndroidX activé
- Architectures : `armeabi-v7a, arm64-v8a, x86, x86_64`
- `newArchEnabled=true`, `hermesEnabled=true`, `edgeToEdgeEnabled=true`
- GIF activé, WebP activé, WebP animé désactivé

---

### `android/settings.gradle`

Résolution dynamique des plugins React Native et Expo depuis `node_modules`. Autolinking des modules natifs. Nom du projet : `medchange`.

---

## DOSSIER `nodejs-assets/nodejs-project/`

> **⚠️ MIROIR AUTOMATIQUE de `server/`**
>
> Ce dossier est une copie exacte de `server/`, créée par `sync-node-server.sh`.
> **NE JAMAIS modifier les fichiers ici directement.**
> Toujours modifier dans `server/` puis exécuter `yarn sync:server`.

---

## DIAGRAMME DE FLUX DES DONNÉES

```
┌─────────────────────────────────────────────────────────┐
│                   APPAREIL ANDROID TV                   │
│                                                         │
│  ┌─────────────┐    Bridge JSON     ┌────────────────┐ │
│  │  App.tsx     │◄─────────────────►│  Node.js       │ │
│  │  (React      │                   │  Server :3000  │ │
│  │   Native)    │    HTTP REST      │                │ │
│  │             │◄──────────────────►│  server.js     │ │
│  │             │  127.0.0.1:3000    │  + lib/*.js    │ │
│  └──────┬──────┘                    └───────┬────────┘ │
│         │                                   │          │
│  ┌──────┴──────┐                    ┌───────┴────────┐ │
│  │Components  │                    │ Persistence    │ │
│  │             │                    │                │ │
│  │ Layout      │                    │ data/          │ │
│  │ Renderer    │                    │ ├ config.json  │ │
│  │   └ Zone    │                    │ ├ metadata.json│ │
│  │     Content │                    │ └ auth.json    │ │
│  │             │                    │                │ │
│  │ Fullscreen  │                    │ uploads/       │ │
│  │ Playlist    │                    │ └ (médias)     │ │
│  │             │                    │                │ │
│  │ Ticker      │                    │ public/        │ │
│  │ Marquee     │                    │ └ index.html   │ │
│  └─────────────┘                    └───────┬────────┘ │
│                                             │          │
└─────────────────────────────────────────────┼──────────┘
                                              │
                              HTTP :3000      │
                              ┌───────────────┘
                              ▼
                    ┌─────────────────┐
                    │  Navigateur     │
                    │  Admin          │
                    │  (réseau local) │
                    └─────────────────┘
```

---

## INDEX RAPIDE — OÙ MODIFIER QUOI ?

| Besoin | Fichier(s) à modifier |
|--------|----------------------|
| Ajouter un template de layout | `layouts.ts` + `server/lib/layouts.js` |
| Nouveau type de zone | `layouts.ts` (type) + `components/ZoneContent.tsx` (rendu) |
| Modifier le ticker | `components/TickerMarquee.tsx` (affichage) + `server/lib/currency.js` (données) |
| Ajouter une route API | `server/server.js` |
| Modifier l'upload de médias | `server/lib/media.js` |
| Changer la config par défaut | `server/lib/config.js` |
| Modifier l'interface admin | `server/public/index.html` |
| Ajouter un message bridge | `server/lib/bridge.js` (envoi) + `App.tsx` (écoute) |
| Modifier l'authentification | `server/lib/auth.js` |
| Changer la logique de rotation | `App.tsx` (transforms CSS, lignes ~483-528) |
| Modifier le lecteur vidéo | `components/VideoViewWrapper.tsx` |
| Changer les transitions média | `components/FullscreenPlaylist.tsx` |
| Ajouter une permission Android | `android/app/src/main/AndroidManifest.xml` |
| Modifier le splash screen | `app.json` (images) + `MainActivity.kt` |
| Changer la planification | `server/lib/scheduler.js` + `server/lib/config.js` (structure schedule) |
| Ajouter un nouveau champ config | `server/lib/config.js` (défaut + persistance) + `App.tsx` (fetch) + `server/public/index.html` (UI) |
