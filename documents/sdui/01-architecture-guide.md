# 01 — Guide d'Architecture SDUI

## 1. Vue d'ensemble

TV Viewer utilise deux modes de rendu pour afficher du contenu dans les zones :

```
Sequence (serveur)
  └─ Zone
       ├─ Media (image, video, audio)  →  FullscreenPlaylist (natif)
       ├─ Widget natif                  →  CurrencyTickerBand / MessageMarquee (natif)
       └─ Widget HTML                   →  WidgetWebView (WebView)  ← a remplacer
```

Le systeme SDUI remplace le chemin **Widget HTML → WebView** par un rendu **100% natif** pilote par un fichier JSON (`ui.json`).

```
Avant :  widget HTML (index.html + app.js + styles.css)  →  WebView
Apres :  widget JSON (ui.json)                           →  NativeWidgetRenderer (natif)
```

---

## 2. Problemes du systeme actuel (WebView)

| Probleme | Impact |
|----------|--------|
| Chaque WebView consomme ~50 MB de RAM | Limite le nombre de widgets simultanees sur Android TV |
| Pas d'acces aux animations natives | Les transitions sont saccadees |
| Communication limitee (postMessage) | Pas de partage d'etat avec l'app |
| Rendu HTML/CSS distinct du reste de l'app | Incoherence visuelle possible |
| Temps de chargement du WebView | Ecran blanc pendant 1-2 secondes au demarrage |

---

## 3. Architecture SDUI

### 3.1 Cycle de vie d'un widget

```
  [1] Developpement        [2] Conversion         [3] Deploiement        [4] Rendu
  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
  │  Composant   │      │              │      │  ui.json     │      │  Native      │
  │  React       │ ──── │  IA convertit│ ──── │  place dans  │ ──── │  Widget      │
  │  Native      │      │  en JSON     │      │  server/     │      │  Renderer    │
  │  (.tsx)      │      │              │      │  widgets/    │      │              │
  └──────────────┘      └──────────────┘      └──────────────┘      └──────────────┘
     App de dev           Claude / LLM         yarn sync:server        App de prod
```

**Etape 1 — Developpement** : Le developpeur cree un composant React Native dans une app de developpement dediee. Il utilise uniquement les primitives supportees (View, Text, Image, etc.).

**Etape 2 — Conversion** : L'IA (Claude ou autre LLM) convertit le composant `.tsx` en un fichier `ui.json` selon le schema SDUI. Voir `07-ai-conversion-tutorial.md`.

**Etape 3 — Deploiement** : Le fichier `ui.json` est place dans `server/widgets/{nom}/`. Apres `yarn sync:server` et rebuild (ou futur upload ZIP), le widget est disponible.

**Etape 4 — Rendu** : L'app React Native detecte la presence de `ui.json`, le telecharge, recupere les donnees de l'API, et rend le widget nativement via `NativeWidgetRenderer`.

### 3.2 Point d'integration

Le changement se fait dans un seul fichier : `components/ZoneContent.tsx`.

**Avant** (ligne 134-138) :
```tsx
// Fallback WebView pour tableau-change et autres
return (
  <Animated.View style={[styles.fadeWrap, { opacity: cycleFade }]}>
    <WidgetWebView baseUrl={baseUrl} widgetType={currentItem.widgetType} widgetItem={currentItem} />
  </Animated.View>
);
```

**Apres** :
```tsx
// Rendu natif SDUI si ui.json existe, sinon fallback WebView
return (
  <Animated.View style={[styles.fadeWrap, { opacity: cycleFade }]}>
    <NativeWidgetRenderer
      baseUrl={baseUrl}
      widgetType={currentItem.widgetType}
      widgetItem={currentItem}
      fallback={<WidgetWebView baseUrl={baseUrl} widgetType={currentItem.widgetType} widgetItem={currentItem} />}
    />
  </Animated.View>
);
```

### 3.3 Strategie de fallback

La migration est **incrementale**. Le moteur SDUI verifie si `ui.json` existe :

1. Fetch `{baseUrl}/widgets/{widgetType}/ui.json`
2. Si reponse 200 → parser le JSON → rendu natif
3. Si reponse 404 ou erreur → afficher le `fallback` (WebView)

Cela permet de migrer les widgets un par un sans casser les existants.

---

## 4. Structure des fichiers widget

```
server/widgets/{nom}/
  widget.json          # Metadonnees (label, description, apiEndpoint)
  ui.json              # NOUVEAU : definition SDUI pour rendu natif
  index.html           # CONSERVE : fallback WebView
  app.js               # CONSERVE : fallback WebView
  styles.css           # CONSERVE : fallback WebView
  assets/              # Partage entre HTML et SDUI (drapeaux, images)
```

| Fichier | Role | Requis |
|---------|------|--------|
| `widget.json` | Metadonnees pour `GET /api/widgets` | Oui |
| `ui.json` | Definition SDUI pour rendu natif | Non (fallback WebView) |
| `index.html` | Point d'entree HTML (fallback) | Non si ui.json existe |
| `assets/` | Images partagees | Optionnel |

---

## 5. Pipeline de rendu detaille

```
NativeWidgetRenderer
  │
  ├─ [1] Fetch ui.json
  │     GET /widgets/{type}/ui.json
  │     → Parse JSON → stocke la definition
  │
  ├─ [2] Fetch donnees
  │     GET {dataSource.url}  (ex: /api/widgets/tableau-change)
  │     → Applique dataSource.transform
  │     → Stocke dans contexte $data
  │
  ├─ [3] Fetch sources additionnelles
  │     GET {additionalSources.logo.url}  (ex: /logo/info)
  │     → Stocke dans contexte $sources.logo
  │
  ├─ [4] Resoudre les bindings
  │     Remplace $data.*, $item.*, $env.*, $sources.*
  │     dans les children, styles, props
  │
  ├─ [5] Rendre l'arbre de composants
  │     Parcourt recursivement root → cree View, Text, Image...
  │     flat-list → itere sur $data avec template
  │
  └─ [6] Rafraichissement
        setInterval(fetchData, dataSource.refreshMs)
        → Re-resout les bindings → React re-rend
```

---

## 6. Registre de composants

Le moteur SDUI maintient un registre qui mappe les `type` du JSON vers les composants React Native :

| Type JSON | Composant React Native | Usage |
|-----------|----------------------|-------|
| `view` | `View` | Conteneur flex |
| `text` | `Text` | Affichage texte |
| `image` | `Image` | Images statiques/distantes |
| `animated-view` | `Animated.View` | Conteneur anime |
| `video` | `VideoViewWrapper` | Lecture video |
| `scroll-view` | `ScrollView` | Conteneur scrollable |
| `flat-list` | Rendu via `.map()` | Liste data-driven |
| `spacer` | `View` (taille fixe) | Espace vide |

Ce registre est **ferme** : seuls ces types sont supportes. Tout autre type est ignore. Pour ajouter un nouveau type, il faut modifier le moteur SDUI dans l'APK.

---

## 7. Flux de donnees complet

```
Admin UI                  Serveur Node.js              App React Native
   │                           │                             │
   │  POST /api/sequences      │                             │
   │  (zone avec widgetType    │                             │
   │   "tableau-change")       │                             │
   │ ─────────────────────────>│                             │
   │                           │  bridge: sequences-updated  │
   │                           │ ───────────────────────────>│
   │                           │                             │
   │                           │  GET /api/app/sequences     │
   │                           │<─────────────────────────── │
   │                           │                             │
   │                           │  → Scheduler resout la      │
   │                           │    sequence active           │
   │                           │  → LayoutRenderer rend      │
   │                           │    les zones                 │
   │                           │  → ZoneContent dispatch     │
   │                           │    au NativeWidgetRenderer   │
   │                           │                             │
   │                           │  GET /widgets/tableau-       │
   │                           │      change/ui.json         │
   │                           │<─────────────────────────── │
   │                           │                             │
   │                           │  GET /api/widgets/          │
   │                           │      tableau-change         │
   │                           │<─────────────────────────── │
   │                           │                             │
   │                           │  → Rendu natif avec         │
   │                           │    donnees bindees           │
```

---

## 8. Documents lies

| Document | Contenu |
|----------|---------|
| `02-json-schema-reference.md` | Specification complete du format ui.json |
| `03-widget-development-guide.md` | Comment creer un nouveau widget |
| `04-supported-components-catalog.md` | Catalogue de tous les composants supportes |
| `05-data-binding-specification.md` | Systeme de binding de donnees |
| `06-migration-guide.md` | Migration des widgets HTML existants |
| `07-ai-conversion-tutorial.md` | Instructions pour l'IA de conversion |
