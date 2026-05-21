# 07 — Tutoriel de Conversion IA

Ce document explique a une IA (Claude ou autre LLM) comment convertir un composant React Native `.tsx` en fichier `ui.json` SDUI.

---

## 1. Format d'entree

L'IA recoit un fichier `.tsx` complet contenant un composant React Native qui utilise uniquement les primitives supportees. Le composant suit le pattern decrit dans `03-widget-development-guide.md`.

---

## 2. Regles de conversion

### Regle 1 : JSX → Noeud JSON

Chaque element JSX correspond a un noeud JSON :

| JSX | JSON |
|-----|------|
| `<View style={...}>` | `{ "type": "view", "style": {...}, "children": [...] }` |
| `<Text style={...}>{contenu}</Text>` | `{ "type": "text", "style": {...}, "children": "contenu" }` |
| `<Image source={{uri}} style={...} resizeMode="cover" />` | `{ "type": "image", "props": { "source": { "uri": "..." }, "resizeMode": "cover" }, "style": {...} }` |
| `<Animated.View>` | `{ "type": "animated-view", "props": { "animation": {...} }, "children": [...] }` |
| `<ScrollView>` | `{ "type": "scroll-view", "children": [...] }` |
| `<VideoView>` | `{ "type": "video", "props": { "uri": "...", "loop": true } }` |

### Regle 2 : StyleSheet → Style inline

Convertir les references StyleSheet en objets de style inline sur chaque noeud.

**Avant (TSX) :**
```tsx
<View style={styles.header}>
  <Text style={styles.title}>Titre</Text>
</View>

const styles = StyleSheet.create({
  header: { height: "20%", backgroundColor: "#152238", flexDirection: "row" },
  title: { fontSize: 22, fontWeight: "800", color: "#fff" },
});
```

**Apres (JSON) :**
```json
{
  "type": "view",
  "style": { "height": "20%", "backgroundColor": "#152238", "flexDirection": "row" },
  "children": [
    { "type": "text", "style": { "fontSize": 22, "fontWeight": "800", "color": "#ffffff" }, "children": "Titre" }
  ]
}
```

**Merge de styles :** Si le JSX a `style={[styles.base, styles.override, { color: "red" }]}`, fusionner dans l'ordre (les derniers ecrasent les premiers).

### Regle 3 : Fetch → DataSource

Identifier les appels `fetch()` et `setInterval` :

**Avant (TSX) :**
```tsx
useEffect(() => {
  fetch(`${BASE_URL}/api/widgets/mon-widget`)
    .then(r => r.json())
    .then(d => setData(d.rates));
  const interval = setInterval(fetchData, 30000);
  return () => clearInterval(interval);
}, []);
```

**Apres (JSON) :**
```json
{
  "dataSource": {
    "url": "/api/widgets/mon-widget",
    "refreshMs": 30000,
    "transform": "$response.rates"
  }
}
```

- L'URL est extraite du `fetch()` (chemin relatif, sans `BASE_URL`)
- Le `refreshMs` vient du `setInterval`
- Le `transform` correspond a l'extraction de donnees (`.rates`, `.items`, etc.)

### Regle 4 : `.map()` → `flat-list`

**Avant (TSX) :**
```tsx
{data.map((item, index) => (
  <View key={item.code} style={[styles.row, { backgroundColor: index % 2 === 0 ? "#fff" : "#f4f6fb" }]}>
    <Text style={styles.label}>{item.label}</Text>
    <Text style={styles.value}>{item.buy}</Text>
  </View>
))}
```

**Apres (JSON) :**
```json
{
  "type": "flat-list",
  "props": {
    "data": "$data",
    "keyExtractor": "$item.code",
    "template": {
      "type": "view",
      "style": {
        "flexDirection": "row",
        "backgroundColor": "$index % 2 === 0 ? '#ffffff' : '#f4f6fb'"
      },
      "children": [
        { "type": "text", "style": { "flex": 1 }, "children": "$item.label" },
        { "type": "text", "style": { "color": "#c0392b" }, "children": "$item.buy" }
      ]
    }
  }
}
```

- `data.map(...)` → `flat-list` avec `data: "$data"`
- `key={item.code}` → `keyExtractor: "$item.code"`
- `item.X` → `$item.X`
- `index` → `$index`

### Regle 5 : useState → $data

Les variables d'etat remplies par l'API deviennent des references `$data.*` :

| TSX | JSON |
|-----|------|
| `data` (tableau de l'API) | `$data` |
| `data.length` | `$data.length` |
| `data[0].code` | `$data[0].code` |
| `logo?.url` | `$sources.logo.url` |

### Regle 6 : Animated → Animation

**Avant (TSX) :**
```tsx
const scrollX = useRef(new Animated.Value(0)).current;

useEffect(() => {
  Animated.loop(
    Animated.timing(scrollX, {
      toValue: -contentWidth / 2,
      duration: Math.max(10000, items.length * 3000),
      easing: Easing.linear,
      useNativeDriver: true,
    })
  ).start();
}, [contentWidth]);

// Dans le JSX :
<Animated.View style={{ transform: [{ translateX: scrollX }] }}>
```

**Apres (JSON) :**
```json
{
  "computed": {
    "negHalfWidth": { "expr": "-($layout.contentWidth / 2)" },
    "scrollDuration": { "expr": "Math.max(10000, $data.length * 3000)" }
  },
  "root": {
    "type": "animated-view",
    "props": {
      "animation": {
        "type": "loop",
        "property": "translateX",
        "from": 0,
        "to": "$computed.negHalfWidth",
        "duration": "$computed.scrollDuration",
        "easing": "linear"
      }
    }
  }
}
```

### Regle 7 : Conditions → conditional

**Avant (TSX) :**
```tsx
{logo?.url ? (
  <Image source={{ uri: `${BASE_URL}${logo.url}` }} style={styles.logo} resizeMode="contain" />
) : (
  <View style={styles.fallback}><Text>M</Text></View>
)}
```

**Apres (JSON) :**
```json
[
  {
    "type": "image",
    "props": { "source": { "uri": "${$env.baseUrl}${$sources.logo.url}" }, "resizeMode": "contain" },
    "style": { "width": "80%", "height": "80%" },
    "conditional": { "if": "$sources.logo.url", "else": { "style": { "display": "none" } } }
  },
  {
    "type": "view",
    "style": { "alignItems": "center", "justifyContent": "center" },
    "conditional": { "if": "$sources.logo.url", "then": { "style": { "display": "none" } } },
    "children": [
      { "type": "text", "children": "M" }
    ]
  }
]
```

Pour un ternaire simple sur une valeur :
```tsx
<Text style={{ color: item.buy !== '-' ? '#c0392b' : '#94a3b8' }}>{item.buy}</Text>
```

```json
{
  "type": "text",
  "children": "$item.buy",
  "conditional": {
    "if": "$item.buy !== '-'",
    "then": { "style": { "color": "#c0392b" } },
    "else": { "style": { "color": "#94a3b8" } }
  }
}
```

### Regle 8 : Props du composant → $props

**Avant (TSX) :**
```tsx
function MonWidget({ speed = 100, fontSize = 0 }: Props) {
  const textSize = fontSize > 0 ? fontSize : 16;
```

**Apres (JSON) :**
```json
"style": { "fontSize": "$props.fontSize || 16" }
```

Les props du composant sont accessibles via `$props.*`.

---

## 3. Processus etape par etape

### Etape 1 : Lire le composant entier

Identifier :
- Le nom du composant
- Les props et leurs valeurs par defaut
- Les imports (quels composants RN sont utilises)

### Etape 2 : Identifier les sources de donnees

Chercher :
- Les appels `fetch()` → noter les URLs et les transforms
- Les `setInterval` → noter les durees
- Les sources multiples (donnees + logo + autres)

### Etape 3 : Construire la racine

```json
{
  "version": 1,
  "widget": "nom-du-widget",
  "dataSource": { ... },
  "additionalSources": { ... },
  "computed": { ... },
  "root": { ... }
}
```

### Etape 4 : Convertir le JSX principal

Partir du `return (...)` du composant et convertir chaque element top-down :
1. Element racine → noeud `root`
2. Pour chaque enfant, creer un noeud dans `children`
3. Resoudre les styles depuis `StyleSheet.create`
4. Remplacer les references dynamiques par des bindings

### Etape 5 : Convertir les `.map()` en `flat-list`

Pour chaque `.map()` sur un tableau de donnees :
1. Creer un noeud `flat-list`
2. Le contenu du `.map()` callback devient le `template`
3. Remplacer `item.X` par `$item.X`
4. Remplacer `index` par `$index`

### Etape 6 : Extraire les animations

Pour chaque `Animated.*` :
1. Identifier la propriete animee (via `transform` ou `opacity`)
2. Identifier le type (timing, loop, sequence)
3. Extraire from, to, duration, easing
4. Ajouter dans `computed` si les valeurs dependent du layout

### Etape 7 : Convertir les conditions

Pour chaque ternaire ou `&&` :
1. Creer un bloc `conditional` sur le noeud
2. Exprimer la condition avec des bindings

### Etape 8 : Valider

Voir la checklist en section 5.

---

## 4. Exemple complet : Conversion de CurrencyTickerBand

### Source (resume du composant)

Le composant `CurrencyTickerBand.tsx` :
- Recoit `items`, `baseUrl`, `speed`, `fontSize` en props
- Fetch `/api/widgets/tableau-change` toutes les 30s
- Mesure la hauteur du conteneur via `onLayout`
- Calcule la taille du texte dynamiquement
- Duplique les items pour un defilement infini
- Utilise `Animated.loop` avec `translateX`

### Conversion

```json
{
  "version": 1,
  "widget": "ticker-band",
  "dataSource": {
    "url": "/api/widgets/tableau-change",
    "refreshMs": 30000,
    "transform": "$response.rates"
  },
  "computed": {
    "textSize": {
      "expr": "$props.fontSize > 0 ? $props.fontSize : Math.max(14, Math.round($layout.height * 0.35))"
    },
    "iconSize": {
      "expr": "$props.fontSize > 0 ? Math.max(20, Math.round($props.fontSize * 1.6)) : Math.max(20, Math.round($layout.height * 0.55))"
    },
    "scrollDuration": {
      "expr": "Math.max(10000, $data.length * 3000) / ($props.speed / 100 || 1)"
    },
    "negHalfWidth": {
      "expr": "-($layout.contentWidth / 2)"
    }
  },
  "root": {
    "type": "view",
    "style": { "flex": 1, "overflow": "hidden", "backgroundColor": "#0f172a", "justifyContent": "center" },
    "children": [
      {
        "type": "animated-view",
        "props": {
          "animation": {
            "type": "loop",
            "property": "translateX",
            "from": 0,
            "to": "$computed.negHalfWidth",
            "duration": "$computed.scrollDuration",
            "easing": "linear"
          }
        },
        "style": { "flexDirection": "row", "alignItems": "center" },
        "children": [
          {
            "type": "flat-list",
            "props": {
              "data": "$data",
              "keyExtractor": "$item.code",
              "template": {
                "type": "view",
                "style": { "flexDirection": "row", "alignItems": "center", "marginRight": 32 },
                "children": [
                  {
                    "type": "image",
                    "props": {
                      "source": { "uri": "${$env.baseUrl}/widgets/tableau-change/assets/${$item.code}.jpg" },
                      "resizeMode": "cover"
                    },
                    "style": { "width": "$computed.iconSize", "height": "$computed.iconSize", "borderRadius": 4, "marginRight": 8 }
                  },
                  {
                    "type": "text",
                    "style": { "fontSize": "$computed.textSize", "fontWeight": "800", "color": "#f8fafc", "marginRight": 12 },
                    "children": "$item.code"
                  },
                  {
                    "type": "text",
                    "style": { "fontSize": "$computed.textSize", "fontWeight": "800", "color": "#4ade80", "marginRight": 6 },
                    "children": "$item.buy || '-'"
                  },
                  {
                    "type": "text",
                    "style": { "fontSize": "$computed.textSize", "color": "#94a3b8", "marginRight": 6 },
                    "children": "/"
                  },
                  {
                    "type": "text",
                    "style": { "fontSize": "$computed.textSize", "fontWeight": "800", "color": "#f87171" },
                    "children": "$item.sell || '-'"
                  }
                ]
              }
            }
          }
        ]
      }
    ]
  }
}
```

> Note : La duplication des items pour le defilement infini est geree automatiquement par le moteur SDUI quand il detecte une animation `loop` sur un `flat-list` parent.

---

## 5. Exemple simple : Widget horloge (statique)

Un widget sans donnees API, affichant simplement l'heure.

### Source TSX

```tsx
export default function ClockWidget() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#030712" }}>
      <Text style={{ fontSize: 72, fontWeight: "800", color: "#ffffff" }}>
        {new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
      </Text>
      <Text style={{ fontSize: 24, color: "#94a3b8", marginTop: 8 }}>
        {new Date().toLocaleDateString("fr-FR")}
      </Text>
    </View>
  );
}
```

### Conversion JSON

```json
{
  "version": 1,
  "widget": "horloge",
  "root": {
    "type": "view",
    "style": { "flex": 1, "alignItems": "center", "justifyContent": "center", "backgroundColor": "#030712" },
    "children": [
      {
        "type": "text",
        "style": { "fontSize": 72, "fontWeight": "800", "color": "#ffffff" },
        "children": "$env.time"
      },
      {
        "type": "text",
        "style": { "fontSize": 24, "color": "#94a3b8", "marginTop": 8 },
        "children": "$env.date"
      }
    ]
  }
}
```

Pas de `dataSource` car le widget est statique. `$env.time` et `$env.date` sont mis a jour automatiquement par le moteur.

---

## 6. Cas limites et limitations

### 6.1 `onLayout` pour mesures

Si le composant utilise `onLayout` pour mesurer les dimensions, utiliser `$layout.width` et `$layout.height` dans les expressions `computed`.

### 6.2 Duplication pour defilement infini

Les composants comme `TickerMarquee` dupliquent les items (`[...items, ...items]`) pour creer l'illusion de defilement continu. Le moteur SDUI gere cela automatiquement pour les `flat-list` enfants d'un `animated-view` avec animation `loop`.

### 6.3 useRef et valeurs imperatives

Les `useRef` pour les timers, players video, etc. sont geres par le moteur SDUI. Ne pas les convertir — les declarer via les props du composant (`loop`, `autoplay`, etc.).

### 6.4 Logique complexe

Si le composant a une logique trop complexe pour etre exprimee en JSON (plus de 2 niveaux de conditions, transformations de donnees avancees), **deplacer la logique cote serveur** dans l'API endpoint. Le JSON ne doit contenir que de la presentation.

### 6.5 Composants non supportes

Si le composant utilise un element non supporte (ex: `TouchableOpacity`, `Modal`, `TextInput`), il ne peut pas etre converti en SDUI. Garder le composant natif ou le simplifier.

### 6.6 Styles dynamiques complexes

Les styles qui dependent de calculs complexes doivent etre exprimes via `computed` :

```json
"computed": {
  "dynamicFontSize": { "expr": "Math.max(14, Math.round($layout.height * 0.35))" }
}
```

Puis referencees : `"fontSize": "$computed.dynamicFontSize"`.

---

## 7. Checklist de validation pour l'IA

Apres conversion, verifier :

### Structure
- [ ] Le JSON est valide (pas de virgules en trop, pas de commentaires)
- [ ] `version` est `1`
- [ ] `widget` correspond au nom du dossier
- [ ] `root` est present et contient un noeud valide

### Types
- [ ] Chaque `type` est dans la liste : `view`, `text`, `image`, `animated-view`, `video`, `scroll-view`, `flat-list`, `spacer`
- [ ] Les `text` ont `children` en chaine (pas en tableau)
- [ ] Les `image` ont `props.source.uri` et `width`/`height` dans `style`

### Bindings
- [ ] Tout `$item.*` est dans un `template` de `flat-list`
- [ ] Tout `$index` est dans un `template` de `flat-list`
- [ ] Tout `$data.*` correspond a un `dataSource`
- [ ] Tout `$sources.*` correspond a un `additionalSources`
- [ ] Tout `$computed.*` est defini dans `computed`
- [ ] Les template literals `${...}` sont correctement fermes
- [ ] Les expressions ternaires ont 3 parties (condition ? valeur_then : valeur_else)

### Styles
- [ ] Toutes les couleurs sont en hexadecimal (`"#rrggbb"`)
- [ ] Tous les `fontSize` sont des nombres (pas de `"16px"`)
- [ ] Pas de proprietes CSS non supportees (`display: flex`, `grid`, `position: fixed`)
- [ ] `fontWeight` est une chaine (`"700"`, pas `700`)

### Donnees
- [ ] `dataSource.url` est un chemin relatif (commence par `/`)
- [ ] `dataSource.transform` est une expression valide
- [ ] `refreshMs` est un nombre positif

### Animations
- [ ] `property` est dans : `opacity`, `translateX`, `translateY`, `scale`, `rotate`
- [ ] `easing` est dans : `linear`, `easeIn`, `easeOut`, `easeInOut`
- [ ] `duration` est un nombre positif (ou une expression calculee)

---

## 8. Prompt type pour l'IA

Voici le prompt a utiliser pour demander une conversion :

```
Convertis le composant React Native suivant en fichier ui.json SDUI pour le projet TV Viewer.

Regles :
- Schema version 1
- Utilise les types : view, text, image, animated-view, video, scroll-view, flat-list, spacer
- Convertis les fetch() en dataSource avec url relative et transform
- Convertis les .map() en flat-list avec $item et $index
- Convertis les Animated en animation objects
- Convertis les conditions en conditional
- Convertis les StyleSheet en styles inline
- Les couleurs en hex, les fontSize en nombres
- Remplace BASE_URL par $env.baseUrl dans les URIs
- Remplace les state variables par $data, $sources, $props
- Deplace la logique complexe dans computed

Fichier source :
[coller le .tsx ici]
```
