# TV-Viewer — Guide du stockage externe Android

## Le problème de départ

L'app écrit ses données (séquences, config, médias) dans le dossier public Android :

```
/storage/emulated/0/Documents/tv-viewer/
```

Ce dossier **survit à la désinstallation** — c'est voulu. Mais Android 12+ (Scoped Storage) impose une règle stricte : chaque fichier appartient à l'UID de l'app qui l'a créé. Quand tu désinstalles et reinstalles, Android attribue un **nouvel UID**. L'ancien UID disparaît. Les fichiers JSON restent sur le disque mais sont bloqués pour le nouveau UID.

```
Installation 1  →  UID 10094  →  crée sequences.json  (propriétaire 10094)
adb uninstall   →  UID 10094 libéré
Installation 2  →  UID 10170  →  lit sequences.json   →  EACCES (refusé)
```

---

## Pourquoi les images passent mais pas les JSON

Android distingue deux catégories de fichiers sur le stockage externe :

| Type | Accès après reinstall | Raison |
|---|---|---|
| Images, vidéos, audio | ✅ accessible | Indexés par **MediaStore**, partagés entre UIDs |
| Fichiers JSON, config | ❌ bloqué | Non indexés par MediaStore, propriété stricte de l'UID |

C'est pour ça que devyol fonctionne après reinstall : ses images passent par MediaStore. Les fichiers JSON de tv-viewer, eux, sont bloqués par le MediaProvider Android.

---

## La seule vraie solution : MANAGE_EXTERNAL_STORAGE

`MANAGE_EXTERNAL_STORAGE` est la permission "gestionnaire de fichiers" d'Android. Elle donne accès à **tous** les fichiers du stockage externe, peu importe l'UID propriétaire. C'est la seule façon légale de lire des fichiers JSON appartenant à un ancien UID.

Ni Expo, ni React Native n'ont de module officiel pour cette permission. Le module natif Kotlin `StorageModule.kt` est la seule voie correcte.

---

## Ce qui a été implémenté

### 1. Architecture plate (flat storage)

Tous les fichiers dans le même dossier racine, pas de sous-dossiers :

```
/storage/emulated/0/Documents/tv-viewer/
  ├── sequences.json
  ├── auth.json
  ├── config.json
  ├── metadata.json
  └── [fichiers médias]
```

### 2. Handshake node-ready

Node.js signale sa disponibilité **avant** que React Native envoie le chemin de stockage. Élimine la race condition au démarrage.

```
Node.js  →  "node-ready"
React Native  →  "storage-path: /sdcard/Documents/tv-viewer"
Node.js  →  démarre le serveur
```

### 3. safeWriteFile()

Quand Node.js essaie d'écrire un fichier appartenant à l'ancien UID, il obtient EACCES. `safeWriteFile()` gère ça :

```javascript
// Si writeFile échoue avec EACCES :
// 1. Supprime l'ancien fichier (vérifie le droit sur le RÉPERTOIRE, pas le fichier)
// 2. Recrée un nouveau fichier avec le nouveau UID comme propriétaire
```

### 4. hasAccess() intelligent (StorageModule.kt)

L'écran de permission n'apparaît **que si nécessaire** :

- Dossier absent ou vide → première installation → **pas d'écran**
- Dossier non vide, fichiers lisibles → relance normale → **pas d'écran**
- Dossier non vide, fichiers illisibles → reinstall avec données → **écran affiché une fois**

### 5. process.umask(0) dans Node.js

Les nouveaux fichiers créés par Node.js utilisent le mode `0666` au lieu de `0660`. Cela n'aide pas pour les fichiers déjà existants d'un ancien UID (FUSE force 0660 de toute façon), mais c'est la bonne pratique.

---

## Ce qu'il faut éviter absolument

### ❌ Ne pas essayer de chmod via Kotlin natif

```kotlin
// NE PAS FAIRE — FUSE intercepte et ignore
file.setReadable(true, false)
file.setWritable(true, false)
```

FUSE (le système de fichiers virtuel d'Android pour le stockage externe) intercepte tous les appels `chmod`. Ils n'ont aucun effet sur les permissions réelles des fichiers. On a essayé, ça ne marche pas.

### ❌ Ne pas utiliser canWriteToDocuments() comme test de permission

```kotlin
// TROMPEUR — créer un nouveau fichier marche TOUJOURS
// même sans MANAGE_EXTERNAL_STORAGE
val testFile = File(docs, ".test")
testFile.createNewFile()  // ← succès même sans permission
testFile.delete()
return true  // ← faux positif !
```

Ce test ne vérifie pas si les fichiers existants sont lisibles. L'app pense avoir accès alors qu'elle ne peut pas lire `sequences.json`.

### ❌ Ne pas stocker les fichiers JSON en stockage interne

Le stockage interne (`/data/data/com.../files/`) est **effacé à la désinstallation**. Les séquences planifiées seraient perdues à chaque reinstall.

### ❌ Ne pas utiliser expo-media-library ou PermissionsAndroid pour Documents/

Ces APIs gèrent uniquement les médias (images, vidéos) via MediaStore. Elles n'ont aucun effet sur les fichiers JSON dans `Documents/`.

### ❌ Ne pas ignorer FUSE dans les décisions d'architecture

Sur Android 11+ avec FUSE activé :
- Les permissions Unix classiques sont partiellement gérées par le MediaProvider
- Un fichier `0660` appartenant à UID A est inaccessible à UID B, même en lecture
- Un fichier `0666` créé via FUSE reste `0660` — FUSE force ses propres permissions
- `chmod` via shell ou JNI n'a aucun effet sur les fichiers passant par FUSE

---

## Comportement attendu par scénario

| Scénario | Écran permission | Séquences affichées |
|---|---|---|
| Première installation | ❌ Non | Aucune (normal) |
| `yarn run android` (mise à jour) | ❌ Non | ✅ Toutes |
| Relance de l'app | ❌ Non | ✅ Toutes |
| `adb uninstall` + reinstall | ✅ Une fois | ✅ Après accord |
| Accord permission + relance | ❌ Non | ✅ Toutes |

---

## Fichiers clés à ne pas modifier sans comprendre

| Fichier | Rôle |
|---|---|
| `StorageModule.kt` | Module natif — hasAccess, initFolder, requestAccess |
| `plugins/withStorageModule.js` | **Source de vérité** — régénère StorageModule.kt au prebuild |
| `server/main.js` | Bootstrap Node.js — handshake node-ready + umask(0) |
| `server/lib/config.js` | Chemins de stockage — EXTERNAL_BASE = TV_STORAGE_PATH |
| `server/lib/utils.js` | safeWriteFile() — écriture sûre cross-UID |

> **Important** : toujours modifier `plugins/withStorageModule.js` en même temps que `StorageModule.kt`. Le plugin régénère le fichier Kotlin à chaque `expo prebuild --clean`, donc si tu ne mets pas à jour le plugin, tes changements dans le .kt sont écrasés.
