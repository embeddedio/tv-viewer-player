# 04 — Catalogue des Composants Supportes

Ce document detaille chaque type de composant disponible dans le moteur SDUI, avec ses props, styles, et exemples JSON.

---

## 1. `view` — Conteneur

**Composant React Native :** `<View>`

Le bloc de construction fondamental. Conteneur flex qui organise ses enfants.

### Props

Aucune prop specifique. Utilise `style` et `children`.

### Styles supportes

Tous les styles de layout, espacement, bordure, et couleur (voir `02-json-schema-reference.md` section 4).

### Exemple : ligne de tableau

```json
{
  "type": "view",
  "style": {
    "flexDirection": "row",
    "alignItems": "center",
    "paddingVertical": 10,
    "paddingHorizontal": 8,
    "backgroundColor": "#ffffff",
    "borderBottomWidth": 1,
    "borderBottomColor": "#dde4f0"
  },
  "children": [
    { "type": "text", "style": { "flex": 1 }, "children": "Euro" },
    { "type": "text", "style": { "width": 80, "textAlign": "right" }, "children": "10.85" }
  ]
}
```

### Exemple : colonne centree

```json
{
  "type": "view",
  "style": {
    "flex": 1,
    "flexDirection": "column",
    "alignItems": "center",
    "justifyContent": "center",
    "backgroundColor": "#030712"
  },
  "children": [ ... ]
}
```

---

## 2. `text` — Affichage texte

**Composant React Native :** `<Text>`

Affiche du texte. Le contenu est place dans `children` comme une **chaine** (pas un tableau de noeuds).

### Props

| Prop | Type | Defaut | Description |
|------|------|--------|-------------|
| `numberOfLines` | number | illimite | Nombre max de lignes |
| `ellipsizeMode` | string | `"tail"` | Troncature : `"tail"`, `"head"`, `"middle"`, `"clip"` |

### Styles supportes

Tous les styles de texte (section 4.5 du schema) + les styles generaux (padding, margin, etc.).

### Exemple : titre

```json
{
  "type": "text",
  "style": {
    "fontSize": 24,
    "fontWeight": "800",
    "color": "#ffffff",
    "textTransform": "uppercase",
    "letterSpacing": 1
  },
  "children": "Cours des Billets"
}
```

### Exemple : valeur dynamique avec couleur conditionnelle

```json
{
  "type": "text",
  "style": {
    "fontSize": 17,
    "fontWeight": "800",
    "textAlign": "center"
  },
  "children": "$item.buy || '-'",
  "conditional": {
    "if": "$item.buy !== '-'",
    "then": { "style": { "color": "#c0392b" } },
    "else": { "style": { "color": "#94a3b8" } }
  }
}
```

### Exemple : texte avec binding template

```json
{
  "type": "text",
  "style": { "fontSize": 14, "color": "#5e6f84" },
  "children": "Mise a jour : ${$env.date} a ${$env.time}"
}
```

---

## 3. `image` — Image

**Composant React Native :** `<Image>`

Affiche une image locale ou distante.

### Props

| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| `source` | object | Oui | `{ "uri": "..." }` |
| `resizeMode` | string | Non | `"cover"`, `"contain"`, `"stretch"`, `"center"` (defaut: `"cover"`) |

### Styles supportes

`width`, `height`, `borderRadius`, `opacity`, et tous les styles de layout/espacement.

> **Important :** `width` et `height` sont obligatoires pour les images distantes (React Native ne peut pas les deviner).

### Exemple : drapeau de devise

```json
{
  "type": "image",
  "props": {
    "source": { "uri": "${$env.baseUrl}/widgets/tableau-change/assets/${$item.code}.jpg" },
    "resizeMode": "cover"
  },
  "style": {
    "width": 40,
    "height": 28,
    "borderRadius": 4,
    "marginHorizontal": 6
  }
}
```

### Exemple : logo avec fallback conditionnel

```json
{
  "type": "image",
  "props": {
    "source": { "uri": "${$env.baseUrl}${$sources.logo.url}" },
    "resizeMode": "contain"
  },
  "style": { "width": "80%", "height": "80%" },
  "conditional": {
    "if": "$sources.logo.url",
    "else": { "style": { "display": "none" } }
  }
}
```

### Exemple : fallback texte quand l'image n'est pas disponible

Utiliser deux noeuds avec des conditions opposees :

```json
[
  {
    "type": "image",
    "props": { "source": { "uri": "${$env.baseUrl}/widgets/tableau-change/assets/${$item.code}.jpg" }, "resizeMode": "cover" },
    "style": { "width": 40, "height": 28 },
    "conditional": { "if": "$item.hasFlag", "else": { "style": { "display": "none" } } }
  },
  {
    "type": "view",
    "style": { "width": 40, "height": 28, "borderRadius": 14, "backgroundColor": "#334155", "alignItems": "center", "justifyContent": "center" },
    "conditional": { "if": "$item.hasFlag", "then": { "style": { "display": "none" } } },
    "children": [
      { "type": "text", "style": { "color": "#ffffff", "fontSize": 14, "fontWeight": "700" }, "children": "$item.code" }
    ]
  }
]
```

---

## 4. `animated-view` — Conteneur anime

**Composant React Native :** `<Animated.View>`

Enveloppe des enfants avec une animation (defilement, fondu, etc.).

### Props

| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| `animation` | object | Oui | Definition de l'animation |

### Structure d'animation

```json
{
  "type": "loop | timing | sequence",
  "property": "translateX | translateY | opacity | scale | rotate",
  "from": 0,
  "to": -500,
  "duration": 15000,
  "easing": "linear | easeIn | easeOut | easeInOut",
  "delay": 0
}
```

### Exemple : ticker defilant horizontal (boucle infinie)

```json
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
  "style": { "flexDirection": "row" },
  "children": [
    { "type": "text", "children": "EUR: 10.85" },
    { "type": "text", "children": "USD: 10.20" }
  ]
}
```

### Exemple : fondu entrant

```json
{
  "type": "animated-view",
  "props": {
    "animation": {
      "type": "timing",
      "property": "opacity",
      "from": 0,
      "to": 1,
      "duration": 400,
      "easing": "easeInOut"
    }
  },
  "children": [ ... ]
}
```

### Exemple : sequence fondu entrant → attente → fondu sortant

```json
{
  "type": "animated-view",
  "props": {
    "animation": {
      "type": "sequence",
      "steps": [
        { "property": "opacity", "from": 0, "to": 1, "duration": 400, "easing": "easeIn" },
        { "property": "opacity", "from": 1, "to": 1, "duration": 5000 },
        { "property": "opacity", "from": 1, "to": 0, "duration": 300, "easing": "easeOut" }
      ]
    }
  },
  "children": [ ... ]
}
```

---

## 5. `video` — Lecteur video

**Composant React Native :** `VideoViewWrapper` (wrap expo-video)

### Props

| Prop | Type | Defaut | Description |
|------|------|--------|-------------|
| `uri` | string | — | URI de la video (requis) |
| `loop` | boolean | false | Lecture en boucle |
| `muted` | boolean | true | Couper le son |
| `autoplay` | boolean | true | Demarrer automatiquement |
| `contentFit` | string | `"fill"` | `"fill"`, `"contain"`, `"cover"` |

### Styles supportes

`width`, `height`, `flex`, et tous les styles de layout.

### Exemple

```json
{
  "type": "video",
  "props": {
    "uri": "${$env.baseUrl}/uploads/promo.mp4",
    "loop": true,
    "muted": true,
    "contentFit": "fill"
  },
  "style": { "flex": 1 }
}
```

---

## 6. `scroll-view` — Conteneur scrollable

**Composant React Native :** `<ScrollView>`

Permet le defilement de contenu qui depasse la taille du conteneur.

### Props

| Prop | Type | Defaut | Description |
|------|------|--------|-------------|
| `horizontal` | boolean | false | Scroll horizontal au lieu de vertical |
| `showsScrollIndicator` | boolean | false | Afficher la barre de defilement |

### Exemple : tableau scrollable verticalement

```json
{
  "type": "scroll-view",
  "props": { "showsScrollIndicator": false },
  "style": { "flex": 1 },
  "children": [
    {
      "type": "flat-list",
      "props": { "data": "$data", "template": { ... } }
    }
  ]
}
```

---

## 7. `flat-list` — Liste data-driven

**Rendu :** Itere sur un tableau de donnees et rend un `template` pour chaque element.

> Note : Ce n'est pas le composant `<FlatList>` de React Native (qui necessite des refs). C'est un `.map()` sur le tableau avec le template comme rendu. Pour les grandes listes, envelopper dans un `scroll-view`.

### Props

| Prop | Type | Requis | Description |
|------|------|--------|-------------|
| `data` | string (binding) | Oui | Expression vers un tableau (ex: `"$data"`) |
| `template` | UINode | Oui | Noeud rendu pour chaque element |
| `keyExtractor` | string (binding) | Non | Cle unique (ex: `"$item.code"`) |
| `separator` | UINode | Non | Noeud entre les elements |

### Contextes disponibles dans le template

- `$item` — l'element courant du tableau
- `$index` — l'index courant (0, 1, 2, ...)

### Exemple : tableau de devises

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
        "paddingVertical": 10,
        "backgroundColor": "$index % 2 === 0 ? '#ffffff' : '#f4f6fb'"
      },
      "children": [
        {
          "type": "image",
          "props": { "source": { "uri": "${$env.baseUrl}/widgets/tableau-change/assets/${$item.code}.jpg" }, "resizeMode": "cover" },
          "style": { "width": 40, "height": 28, "borderRadius": 4 }
        },
        {
          "type": "text",
          "style": { "flex": 1, "fontSize": 15, "color": "#112033", "paddingLeft": 8 },
          "children": "$item.label"
        },
        {
          "type": "text",
          "style": { "width": 80, "textAlign": "right", "fontSize": 17, "fontWeight": "800", "color": "#c0392b" },
          "children": "$item.buy || '-'"
        }
      ]
    }
  }
}
```

### Exemple avec separateur

```json
{
  "type": "flat-list",
  "props": {
    "data": "$data",
    "template": { ... },
    "separator": {
      "type": "view",
      "style": { "height": 1, "backgroundColor": "#dde4f0" }
    }
  }
}
```

---

## 8. `spacer` — Espace vide

**Rendu :** `<View>` avec une taille fixe.

### Props

| Prop | Type | Defaut | Description |
|------|------|--------|-------------|
| `size` | number | 0 | Taille en pixels |

Le spacer est rendu horizontalement ou verticalement selon le `flexDirection` du parent.

### Exemple

```json
{ "type": "spacer", "props": { "size": 16 } }
```

Equivalent a :
```json
{ "type": "view", "style": { "width": 16, "height": 16 } }
```

---

## 9. Resume des types

| Type | Composant RN | Enfants | Props cles | Usage principal |
|------|-------------|---------|------------|-----------------|
| `view` | `View` | Noeuds | — | Conteneur flex |
| `text` | `Text` | Chaine | `numberOfLines` | Affichage texte |
| `image` | `Image` | — | `source`, `resizeMode` | Images |
| `animated-view` | `Animated.View` | Noeuds | `animation` | Animations |
| `video` | `VideoViewWrapper` | — | `uri`, `loop`, `muted` | Videos |
| `scroll-view` | `ScrollView` | Noeuds | `horizontal` | Scroll |
| `flat-list` | `.map()` | — | `data`, `template` | Listes dynamiques |
| `spacer` | `View` | — | `size` | Espacement |
