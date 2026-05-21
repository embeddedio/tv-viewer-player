# 02 — Reference du Schema JSON (ui.json)

Ce document est la **specification complete** du format `ui.json` utilise par le moteur SDUI pour decrire l'interface d'un widget.

---

## 1. Objet racine

```json
{
  "version": 1,
  "widget": "tableau-change",
  "dataSource": { ... },
  "additionalSources": { ... },
  "computed": { ... },
  "root": { ... }
}
```

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `version` | number | Oui | Version du schema. Actuellement `1` |
| `widget` | string | Oui | Identifiant du widget (= nom du dossier) |
| `dataSource` | object | Non | Source de donnees principale |
| `additionalSources` | object | Non | Sources de donnees supplementaires nommees |
| `computed` | object | Non | Valeurs calculees derivees des donnees/layout |
| `root` | object | Oui | Noeud racine de l'arbre UI |

---

## 2. DataSource

```json
{
  "dataSource": {
    "url": "/api/widgets/tableau-change",
    "refreshMs": 30000,
    "transform": "$response.rates"
  }
}
```

| Champ | Type | Requis | Defaut | Description |
|-------|------|--------|--------|-------------|
| `url` | string | Oui | — | Chemin relatif de l'API (resolu contre `baseUrl`) |
| `refreshMs` | number | Non | 30000 | Intervalle de rafraichissement en millisecondes |
| `transform` | string | Non | `$response` | Expression pour extraire les donnees de la reponse |

### additionalSources

Sources supplementaires nommees, accessibles via `$sources.{nom}` :

```json
{
  "additionalSources": {
    "logo": {
      "url": "/logo/info",
      "refreshMs": 60000,
      "transform": "$response.logo"
    }
  }
}
```

Chaque source a la meme structure que `dataSource`.

---

## 3. Noeud UI (UINode)

Chaque noeud de l'arbre UI a cette structure :

```json
{
  "type": "view",
  "style": { ... },
  "props": { ... },
  "children": [ ... ],
  "conditional": { ... }
}
```

| Champ | Type | Requis | Description |
|-------|------|--------|-------------|
| `type` | string | Oui | Type de composant (voir section 6) |
| `style` | object | Non | Styles React Native |
| `props` | object | Non | Props specifiques au composant |
| `children` | array ou string | Non | Noeuds enfants ou contenu texte |
| `conditional` | object | Non | Rendu conditionnel |

### Types supportes

```
"view" | "text" | "image" | "animated-view" | "video" | "scroll-view" | "flat-list" | "spacer"
```

Voir `04-supported-components-catalog.md` pour le detail de chaque type.

---

## 4. Proprietes de style

Les styles suivent la syntaxe `StyleSheet` de React Native. Toutes les valeurs sont des nombres, des chaines, ou des expressions de binding.

### 4.1 Layout

| Propriete | Type | Exemple |
|-----------|------|---------|
| `flex` | number | `1` |
| `flexDirection` | `"row"` ou `"column"` | `"row"` |
| `flexWrap` | `"wrap"` ou `"nowrap"` | `"nowrap"` |
| `alignItems` | string | `"center"` |
| `alignSelf` | string | `"flex-start"` |
| `justifyContent` | string | `"space-between"` |
| `width` | number ou string | `100` ou `"50%"` |
| `height` | number ou string | `200` ou `"100%"` |
| `minWidth` | number | `50` |
| `minHeight` | number | `30` |
| `maxWidth` | number ou string | `"80%"` |
| `maxHeight` | number | `400` |
| `aspectRatio` | number | `1.5` |

### 4.2 Espacement

| Propriete | Type | Exemple |
|-----------|------|---------|
| `padding` | number | `10` |
| `paddingTop` | number | `5` |
| `paddingRight` | number | `8` |
| `paddingBottom` | number | `5` |
| `paddingLeft` | number | `8` |
| `paddingHorizontal` | number | `12` |
| `paddingVertical` | number | `6` |
| `margin` | number | `4` |
| `marginTop` | number | `0` |
| `marginRight` | number | `4` |
| `marginBottom` | number | `2` |
| `marginLeft` | number | `4` |
| `marginHorizontal` | number | `8` |
| `marginVertical` | number | `4` |
| `gap` | number | `8` |

### 4.3 Bordures

| Propriete | Type | Exemple |
|-----------|------|---------|
| `borderWidth` | number | `1` |
| `borderColor` | string (hex) | `"#dde4f0"` |
| `borderRadius` | number | `8` |
| `borderTopWidth` | number | `0` |
| `borderBottomWidth` | number | `1` |
| `borderLeftWidth` | number | `0` |
| `borderRightWidth` | number | `0` |
| `borderTopLeftRadius` | number | `8` |
| `borderTopRightRadius` | number | `8` |
| `borderBottomLeftRadius` | number | `0` |
| `borderBottomRightRadius` | number | `0` |

### 4.4 Couleur et apparence

| Propriete | Type | Exemple |
|-----------|------|---------|
| `backgroundColor` | string (hex) | `"#152238"` |
| `opacity` | number (0-1) | `0.8` |
| `overflow` | `"hidden"` ou `"visible"` | `"hidden"` |

### 4.5 Texte (uniquement sur noeuds `text`)

| Propriete | Type | Exemple |
|-----------|------|---------|
| `color` | string (hex) | `"#ffffff"` |
| `fontSize` | number | `18` |
| `fontWeight` | string | `"700"` |
| `fontStyle` | `"normal"` ou `"italic"` | `"normal"` |
| `textAlign` | string | `"center"` |
| `textDecorationLine` | string | `"underline"` |
| `lineHeight` | number | `24` |
| `letterSpacing` | number | `1.5` |
| `textTransform` | string | `"uppercase"` |

### 4.6 Ombre (Android : elevation)

| Propriete | Type | Exemple |
|-----------|------|---------|
| `elevation` | number | `4` |
| `shadowColor` | string (hex) | `"#000000"` |
| `shadowOffset` | object | `{ "width": 0, "height": 2 }` |
| `shadowOpacity` | number | `0.25` |
| `shadowRadius` | number | `4` |

---

## 5. Expressions de data binding

Les valeurs de style, props, et children peuvent contenir des expressions de binding. Voir `05-data-binding-specification.md` pour la specification complete.

### Resume rapide

| Expression | Contexte | Exemple |
|------------|----------|---------|
| `$data` | Donnees de dataSource | `"$data.rates"` |
| `$item` | Element courant (dans flat-list) | `"$item.code"` |
| `$index` | Index courant (dans flat-list) | `"$index"` |
| `$sources.{nom}` | Source additionnelle | `"$sources.logo.url"` |
| `$env.baseUrl` | URL de base du serveur | `"${$env.baseUrl}/uploads/img.png"` |
| `$env.date` | Date formatee | `"$env.date"` |
| `$props` | Parametres du widget | `"$props.speed"` |
| `$layout` | Dimensions mesurees | `"$layout.width"` |
| `$computed.{nom}` | Valeur calculee | `"$computed.halfWidth"` |

---

## 6. Props specifiques par type de composant

### 6.1 `view`

Pas de props specifiques. Utilise `style` et `children`.

```json
{
  "type": "view",
  "style": { "flex": 1, "flexDirection": "row", "backgroundColor": "#152238" },
  "children": [ ... ]
}
```

### 6.2 `text`

| Prop | Type | Description |
|------|------|-------------|
| `numberOfLines` | number | Limite le nombre de lignes (tronque avec ...) |
| `ellipsizeMode` | string | `"tail"`, `"head"`, `"middle"`, `"clip"` |

Le contenu texte est place dans `children` comme une **chaine** (pas un tableau) :

```json
{
  "type": "text",
  "style": { "fontSize": 18, "color": "#c0392b", "fontWeight": "800" },
  "props": { "numberOfLines": 1, "ellipsizeMode": "tail" },
  "children": "$item.buy"
}
```

### 6.3 `image`

| Prop | Type | Description |
|------|------|-------------|
| `source` | object | `{ "uri": "..." }` — URI de l'image |
| `resizeMode` | string | `"cover"`, `"contain"`, `"stretch"`, `"center"` |

```json
{
  "type": "image",
  "props": {
    "source": { "uri": "${$env.baseUrl}/widgets/tableau-change/assets/${$item.code}.jpg" },
    "resizeMode": "contain"
  },
  "style": { "width": 48, "height": 48, "borderRadius": 5 }
}
```

### 6.4 `animated-view`

| Prop | Type | Description |
|------|------|-------------|
| `animation` | object | Definition de l'animation (voir section 7) |

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
  "children": [ ... ]
}
```

### 6.5 `video`

| Prop | Type | Defaut | Description |
|------|------|--------|-------------|
| `uri` | string | — | URI de la video |
| `loop` | boolean | false | Boucle infinie |
| `muted` | boolean | true | Couper le son |
| `autoplay` | boolean | true | Lecture automatique |
| `contentFit` | string | `"fill"` | `"fill"`, `"contain"`, `"cover"` |

```json
{
  "type": "video",
  "props": {
    "uri": "${$env.baseUrl}/uploads/promo.mp4",
    "loop": true,
    "muted": true
  },
  "style": { "width": "100%", "height": "100%" }
}
```

### 6.6 `scroll-view`

| Prop | Type | Defaut | Description |
|------|------|--------|-------------|
| `horizontal` | boolean | false | Scroll horizontal |
| `showsScrollIndicator` | boolean | false | Afficher la barre de scroll |

```json
{
  "type": "scroll-view",
  "props": { "horizontal": false },
  "style": { "flex": 1 },
  "children": [ ... ]
}
```

### 6.7 `flat-list`

| Prop | Type | Description |
|------|------|-------------|
| `data` | string (binding) | Expression pointant vers un tableau |
| `template` | UINode | Noeud utilise pour chaque element |
| `keyExtractor` | string (binding) | Expression pour la cle unique |
| `separator` | UINode | Noeud separateur entre les elements (optionnel) |

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
        "paddingVertical": 8,
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

A l'interieur du `template`, les expressions `$item` et `$index` sont disponibles.

### 6.8 `spacer`

| Prop | Type | Description |
|------|------|-------------|
| `size` | number | Taille en pixels |

```json
{ "type": "spacer", "props": { "size": 16 } }
```

---

## 7. Definitions d'animation

Les animations sont declarees dans `props.animation` d'un noeud `animated-view`.

### 7.1 Structure

```json
{
  "animation": {
    "type": "loop",
    "property": "translateX",
    "from": 0,
    "to": -500,
    "duration": 15000,
    "easing": "linear"
  }
}
```

| Champ | Type | Description |
|-------|------|-------------|
| `type` | string | `"timing"` (one-shot), `"loop"` (infini), `"sequence"` (enchaine) |
| `property` | string | Propriete animee : `"opacity"`, `"translateX"`, `"translateY"`, `"scale"`, `"rotate"` |
| `from` | number ou string | Valeur de depart (peut etre un binding) |
| `to` | number ou string | Valeur d'arrivee (peut etre un binding) |
| `duration` | number ou string | Duree en ms (peut etre un binding) |
| `easing` | string | `"linear"`, `"easeIn"`, `"easeOut"`, `"easeInOut"` |
| `delay` | number | Delai avant demarrage en ms |

### 7.2 Types d'animation

**`timing`** — animation unique :
```json
{ "type": "timing", "property": "opacity", "from": 0, "to": 1, "duration": 400, "easing": "easeInOut" }
```

**`loop`** — boucle infinie (pour tickers/marquees) :
```json
{ "type": "loop", "property": "translateX", "from": 0, "to": "$computed.negHalfWidth", "duration": "$computed.scrollDuration", "easing": "linear" }
```

**`sequence`** — enchaine plusieurs animations :
```json
{
  "type": "sequence",
  "steps": [
    { "property": "opacity", "from": 0, "to": 1, "duration": 400, "easing": "easeIn" },
    { "property": "opacity", "from": 1, "to": 1, "duration": 5000 },
    { "property": "opacity", "from": 1, "to": 0, "duration": 300, "easing": "easeOut" }
  ]
}
```

### 7.3 Contraintes

- Seules les proprietes compatibles avec `useNativeDriver: true` sont supportees :
  - `opacity`, `translateX`, `translateY`, `scale`, `rotate`
- Les proprietes de layout (`width`, `height`, `flex`) ne sont **pas** animables.
- `rotate` accepte une chaine : `"from": "0deg"`, `"to": "360deg"`

---

## 8. Valeurs calculees (computed)

Le bloc `computed` permet de definir des valeurs derivees des donnees ou du layout :

```json
{
  "computed": {
    "halfWidth": {
      "expr": "$layout.contentWidth / 2"
    },
    "negHalfWidth": {
      "expr": "-($layout.contentWidth / 2)"
    },
    "scrollDuration": {
      "expr": "Math.max(10000, $data.length * 3000) / ($props.speed / 100 || 1)"
    },
    "rowCount": {
      "expr": "$data.length"
    }
  }
}
```

Les valeurs calculees sont accessibles via `$computed.{nom}` dans les styles, props, et animations.

Fonctions mathematiques supportees : `Math.max`, `Math.min`, `Math.round`, `Math.floor`, `Math.ceil`, `Math.abs`.

---

## 9. Rendu conditionnel

Le bloc `conditional` permet de modifier un noeud selon une condition :

```json
{
  "type": "text",
  "style": { "fontSize": 16 },
  "children": "$item.buy",
  "conditional": {
    "if": "$item.buy !== '-'",
    "then": { "style": { "color": "#c0392b", "fontWeight": "800" } },
    "else": { "style": { "color": "#94a3b8", "fontWeight": "400" } }
  }
}
```

Le `then` et `else` sont des **patches** appliques par-dessus le noeud. Les styles sont fusionnes (merge), les props sont fusionnes, les children sont remplaces si specifies.

### Visibilite conditionnelle

Pour masquer un noeud :
```json
{
  "conditional": {
    "if": "$sources.logo.url",
    "else": { "style": { "display": "none" } }
  }
}
```

> Note : React Native ne supporte pas `display: "none"` nativement sur tous les composants. Le moteur SDUI interprete `display: "none"` comme un retour `null` (ne pas rendre le noeud).

---

## 10. Exemple complet — tableau-change

```json
{
  "version": 1,
  "widget": "tableau-change",
  "dataSource": {
    "url": "/api/widgets/tableau-change",
    "refreshMs": 30000,
    "transform": "$response.rates"
  },
  "additionalSources": {
    "logo": {
      "url": "/logo/info",
      "refreshMs": 60000,
      "transform": "$response.logo"
    }
  },
  "root": {
    "type": "view",
    "style": { "flex": 1, "flexDirection": "column", "backgroundColor": "#edf1f7" },
    "children": [
      {
        "type": "view",
        "style": {
          "flexDirection": "row",
          "height": "20%",
          "backgroundColor": "#152238"
        },
        "children": [
          {
            "type": "view",
            "style": { "width": "21%", "alignItems": "center", "justifyContent": "center", "padding": 10 },
            "children": [
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
            ]
          },
          {
            "type": "view",
            "style": { "flex": 1, "justifyContent": "center", "paddingHorizontal": 16 },
            "children": [
              {
                "type": "text",
                "style": { "fontSize": 22, "fontWeight": "800", "color": "#ffffff", "textTransform": "uppercase" },
                "children": "Cours des Billets de Banques Etrangers"
              },
              {
                "type": "text",
                "style": { "fontSize": 14, "color": "rgba(255,255,255,0.7)", "marginTop": 4 },
                "children": "$env.date"
              }
            ]
          }
        ]
      },
      {
        "type": "view",
        "style": {
          "flexDirection": "row",
          "backgroundColor": "#1a2d4a",
          "paddingVertical": 8,
          "paddingHorizontal": 4
        },
        "children": [
          { "type": "text", "style": { "width": "10%", "textAlign": "center", "color": "#ffffff", "fontSize": 13, "fontWeight": "700", "textTransform": "uppercase" }, "children": "Unite" },
          { "type": "view", "style": { "width": "8%" } },
          { "type": "text", "style": { "flex": 1, "color": "#ffffff", "fontSize": 13, "fontWeight": "700", "textTransform": "uppercase" }, "children": "Devises" },
          { "type": "text", "style": { "width": "14%", "textAlign": "center", "color": "#ffffff", "fontSize": 13, "fontWeight": "700", "textTransform": "uppercase" }, "children": "Achat" },
          { "type": "text", "style": { "width": "14%", "textAlign": "center", "color": "#ffffff", "fontSize": 13, "fontWeight": "700", "textTransform": "uppercase" }, "children": "Vente" }
        ]
      },
      {
        "type": "scroll-view",
        "style": { "flex": 1 },
        "children": [
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
                  "paddingHorizontal": 4,
                  "alignItems": "center",
                  "backgroundColor": "$index % 2 === 0 ? '#ffffff' : '#f4f6fb'",
                  "borderBottomWidth": 1,
                  "borderBottomColor": "#dde4f0"
                },
                "children": [
                  {
                    "type": "text",
                    "style": { "width": "10%", "textAlign": "center", "fontSize": 15, "color": "#112033" },
                    "children": "$item.unit || '1'"
                  },
                  {
                    "type": "image",
                    "props": {
                      "source": { "uri": "${$env.baseUrl}/widgets/tableau-change/assets/${$item.code}.jpg" },
                      "resizeMode": "cover"
                    },
                    "style": { "width": 40, "height": 28, "borderRadius": 4, "marginHorizontal": 6 }
                  },
                  {
                    "type": "text",
                    "style": { "flex": 1, "fontSize": 15, "color": "#112033", "fontWeight": "600" },
                    "props": { "numberOfLines": 1, "ellipsizeMode": "tail" },
                    "children": "$item.label"
                  },
                  {
                    "type": "text",
                    "style": { "width": "14%", "textAlign": "center", "fontSize": 17, "fontWeight": "800", "color": "#c0392b" },
                    "children": "$item.buy || '-'"
                  },
                  {
                    "type": "text",
                    "style": { "width": "14%", "textAlign": "center", "fontSize": 17, "fontWeight": "800", "color": "#095fcf" },
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
