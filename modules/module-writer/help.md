# Module Expo Natif — Interface CRUD pour db.json

## Contexte

Dans l'app Devyol, la gestion du fichier `db.json` est actuellement assurée par le serveur Node.js embarqué (`nodejs-mobile`). Ce document décrit une alternative : un module Expo natif en Kotlin qui joue le rôle d'interface directe avec ce fichier JSON, sans passer par HTTP.

---

## Idée principale

Créer un module natif Expo (Kotlin) initialisé avec le chemin du fichier `db.json`, et exposant une API CRUD simple côté JavaScript/TypeScript.

Le module agit comme une **couche d'abstraction** entre le code React Native et le fichier JSON sur le storage externe Android. Il ne remplace pas le serveur Node.js pour l'interface web, mais il prend en charge toute la logique de lecture/écriture du JSON depuis l'app elle-même.

---

## Architecture du module

```
modules/
└── db-module/
    ├── index.ts                        ← API TypeScript exportée
    ├── DbModule.types.ts               ← types partagés (Media, DbEntry...)
    └── android/
        └── src/main/java/
            └── expo/modules/dbmodule/
                ├── DbModule.kt         ← logique principale
                └── DbModulePackage.kt  ← enregistrement Expo
```

---

## API exposée (côté JS)

```ts
import DbModule from './modules/db-module'

// Initialiser avec le chemin absolu du fichier db.json
await DbModule.init('/sdcard/Documents/Devyol/db.json')

// Lire tous les médias
const items: Media[] = await DbModule.getAll()

// Ajouter un média
await DbModule.add({
  name: 'photo.jpg',
  path: '/sdcard/Documents/Devyol/photo.jpg',
  addedAt: Date.now()
})

// Supprimer un média par nom
await DbModule.remove('photo.jpg')

// Synchroniser db.json avec les fichiers réellement présents sur le disque
await DbModule.sync(['photo.jpg', 'banner.png'])
```

---

## Implémentation Kotlin (DbModule.kt)

```kotlin
package expo.modules.dbmodule

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

class DbModule : Module() {

    private var dbFile: File? = null

    override fun definition() = ModuleDefinition {

        Name("DbModule")

        // Initialise le module avec le chemin absolu de db.json
        AsyncFunction("init") { path: String ->
            dbFile = File(path)
            if (!dbFile!!.exists()) {
                dbFile!!.writeText("[]")
            }
        }

        // Retourne la liste complète des entrées
        AsyncFunction("getAll") {
            val file = dbFile ?: throw Exception("DbModule non initialisé")
            val array = JSONArray(file.readText())
            (0 until array.length()).map { i ->
                val obj = array.getJSONObject(i)
                mapOf(
                    "name" to obj.getString("name"),
                    "path" to obj.getString("path"),
                    "addedAt" to obj.getLong("addedAt")
                )
            }
        }

        // Ajoute une entrée (ignore les doublons par nom)
        AsyncFunction("add") { entry: Map<String, Any> ->
            val file = dbFile ?: throw Exception("DbModule non initialisé")
            val array = JSONArray(file.readText())
            val name = entry["name"] as String

            // Vérifie si déjà présent
            for (i in 0 until array.length()) {
                if (array.getJSONObject(i).getString("name") == name) return@AsyncFunction
            }

            val obj = JSONObject()
            obj.put("name", name)
            obj.put("path", entry["path"] as String)
            obj.put("addedAt", (entry["addedAt"] as Number).toLong())
            array.put(obj)
            file.writeText(array.toString(2))
        }

        // Supprime une entrée par nom de fichier
        AsyncFunction("remove") { name: String ->
            val file = dbFile ?: throw Exception("DbModule non initialisé")
            val array = JSONArray(file.readText())
            val newArray = JSONArray()
            for (i in 0 until array.length()) {
                if (array.getJSONObject(i).getString("name") != name) {
                    newArray.put(array.getJSONObject(i))
                }
            }
            file.writeText(newArray.toString(2))
        }

        // Synchronise db.json avec la liste réelle de fichiers sur disque
        // - supprime les entrées dont le fichier n'existe plus
        // - ajoute les fichiers présents mais absents du JSON
        AsyncFunction("sync") { filesOnDisk: List<String> ->
            val file = dbFile ?: throw Exception("DbModule non initialisé")
            val array = JSONArray(file.readText())
            val inDb = mutableSetOf<String>()
            val synced = JSONArray()

            // Garde uniquement ce qui existe sur disque
            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                val name = obj.getString("name")
                if (filesOnDisk.contains(name)) {
                    synced.put(obj)
                    inDb.add(name)
                }
            }

            // Ajoute les fichiers présents sur disque mais absents du JSON
            val dir = file.parentFile
            for (name in filesOnDisk) {
                if (!inDb.contains(name)) {
                    val obj = JSONObject()
                    obj.put("name", name)
                    obj.put("path", "${dir?.absolutePath}/$name")
                    obj.put("addedAt", System.currentTimeMillis())
                    synced.put(obj)
                }
            }

            file.writeText(synced.toString(2))
        }
    }
}
```

---

## Intégration dans le cycle de vie Devyol

```
boot
 └─ checkAccess()
      └─ OUI → initFolder("Devyol")
                 └─ DbModule.init('/sdcard/Documents/Devyol/db.json')
                      └─ DbModule.sync(filesOnDisk)
                           └─ nodejs.start('main.js') → Slideshow
```

Le module remplace les appels à `GET /api/db` et la logique `syncDb()` dans `main.js`. Le serveur Node.js garde uniquement son rôle de serveur HTTP pour l'interface web (upload, liste, suppression depuis le browser).

---

## Comparaison avec l'approche actuelle

| Critère | Node.js (actuel) | Module natif |
|---|---|---|
| Accès au JSON | Via HTTP `localhost:3000/api/db` | Direct (lecture fichier) |
| Disponibilité au boot | Après démarrage Node.js | Immédiat |
| Dépendance réseau locale | Oui | Non |
| Gestion des erreurs | Catch HTTP | Exceptions Kotlin typées |
| Maintenabilité | JS dans nodejs-mobile | Kotlin standard |
| Interface web (upload) | Node.js obligatoire | Node.js toujours nécessaire |

---

## Prérequis

- Expo bare workflow (pas managed)
- `expo-modules-core` installé
- Permission `MANAGE_EXTERNAL_STORAGE` déjà gérée par `StorageModule.kt`
- Kotlin 1.8+

---

## Ce que ce module NE fait pas

- Il ne sert pas les images (c'est le rôle d'Express / `GET /img/:name`)
- Il ne gère pas l'upload depuis le browser (c'est Multer / `POST /api/upload`)
- Il ne vérifie pas les permissions Android (c'est `StorageModule.kt`)

Son rôle est strictement : **lire, écrire, synchroniser `db.json`** depuis le code React Native, sans détour par HTTP.
