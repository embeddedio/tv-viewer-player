package expo.modules.devyoldb

import android.os.Environment
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.exception.CodedException
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

class DevyolDbModule : Module() {

    private var dbFile: File? = null
    private var mediaDir: File? = null

    override fun definition() = ModuleDefinition {

        Name("DevyolDb")

        // Initialise à partir du nom de dossier uniquement (ex: "Devyol").
        // Le chemin complet est résolu via Environment.DIRECTORY_DOCUMENTS,
        // ce qui garantit le bon chemin quel que soit le constructeur/ROM.
        AsyncFunction("init") { folderName: String ->
            val docsDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS)
            val dir = File(docsDir, folderName)
            if (!dir.exists()) {
                dir.mkdirs()
            }
            val file = File(dir, "db.json")
            if (!file.exists()) {
                file.writeText("[]")
            }
            mediaDir = dir
            dbFile = file
        }

        // Retourne toutes les entrées du JSON sous forme de liste de maps.
        AsyncFunction("getAll") {
            val file = requireDb()
            val array = JSONArray(file.readText())
            (0 until array.length()).map { i ->
                val obj = array.getJSONObject(i)
                mapOf(
                    "name"     to obj.getString("name"),
                    "path"     to obj.getString("path"),
                    "addedAt"  to obj.getLong("addedAt")
                )
            }
        }

        // Ajoute une entrée. Ignore silencieusement les doublons (même name).
        AsyncFunction("add") { entry: Map<String, Any> ->
            val file = requireDb()
            val name = entry["name"] as? String
                ?: throw CodedException("ERR_INVALID_ENTRY", "Le champ 'name' est requis", null)

            val array = JSONArray(file.readText())
            for (i in 0 until array.length()) {
                if (array.getJSONObject(i).getString("name") == name) return@AsyncFunction
            }

            val obj = JSONObject()
            obj.put("name",    name)
            obj.put("path",    entry["path"] as? String ?: "")
            obj.put("addedAt", (entry["addedAt"] as? Number)?.toLong() ?: System.currentTimeMillis())
            array.put(obj)

            file.writeText(array.toString(2))
        }

        // Supprime l'entrée dont le name correspond.
        AsyncFunction("remove") { name: String ->
            val file = requireDb()
            val array = JSONArray(file.readText())
            val filtered = JSONArray()
            for (i in 0 until array.length()) {
                if (array.getJSONObject(i).getString("name") != name) {
                    filtered.put(array.getJSONObject(i))
                }
            }
            file.writeText(filtered.toString(2))
        }

        // Synchronise db.json avec la liste réelle des fichiers sur disque :
        // - retire les entrées dont le fichier est absent de filesOnDisk
        // - ajoute les fichiers présents dans filesOnDisk mais absents du JSON
        AsyncFunction("sync") { filesOnDisk: List<String> ->
            val file = requireDb()
            val array = JSONArray(file.readText())
            val dir = file.parentFile?.absolutePath ?: ""

            val inDb = mutableSetOf<String>()
            val synced = JSONArray()

            for (i in 0 until array.length()) {
                val obj = array.getJSONObject(i)
                val name = obj.getString("name")
                if (filesOnDisk.contains(name)) {
                    synced.put(obj)
                    inDb.add(name)
                }
            }

            for (name in filesOnDisk) {
                if (!inDb.contains(name)) {
                    val obj = JSONObject()
                    obj.put("name",    name)
                    obj.put("path",    "$dir/$name")
                    obj.put("addedAt", System.currentTimeMillis())
                    synced.put(obj)
                }
            }

            file.writeText(synced.toString(2))
        }
    }

    private fun requireDb(): File =
        dbFile ?: throw CodedException("ERR_NOT_INITIALIZED", "Appelle d'abord DevyolDb.init(folderName)", null)
}
