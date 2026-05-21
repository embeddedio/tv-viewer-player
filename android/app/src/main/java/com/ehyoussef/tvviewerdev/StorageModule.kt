package com.ehyoussef.tvviewerdev

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import android.util.Base64
import android.util.Log
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeArray
import com.facebook.react.bridge.WritableNativeMap
import java.io.File
import java.io.FileOutputStream
import java.io.IOException
import java.net.NetworkInterface

private const val TAG = "StorageModule"

class StorageModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var folderPath: String? = null

    private fun requireFolder(promise: Promise): File? {
        val p = folderPath
        return if (p != null) File(p)
        else {
            Log.e(TAG, "requireFolder: folderPath is null — initFolder() was not called")
            promise.reject("NO_FOLDER", "initFolder() was not called")
            null
        }
    }

    override fun getName(): String = "StorageModule"

    @ReactMethod
    fun hasAccess(promise: Promise) {
        try {
            // Sur Android 11+ (API 30), MANAGE_EXTERNAL_STORAGE est obligatoire.
            // Cette permission survive à la réinstallation : une fois accordée,
            // l'app peut lire/écrire les fichiers créés par l'ancien UID.
            val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                val isManager = Environment.isExternalStorageManager()
                Log.d(TAG, "hasAccess: isExternalStorageManager=$isManager")
                isManager
            } else {
                true
            }
            promise.resolve(granted)
        } catch (e: Exception) {
            promise.reject("HAS_ACCESS_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun requestAccess(promise: Promise) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                val pkg = reactApplicationContext.packageName
                val pm = reactApplicationContext.packageManager

                val intent1 = Intent(
                    Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION,
                    Uri.parse("package:$pkg")
                ).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }

                val intent2 = Intent(
                    Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION
                ).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }

                val intent3 = Intent(
                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:$pkg")
                ).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }

                val intent4 = Intent(
                    Settings.ACTION_SETTINGS
                ).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }

                when {
                    pm.resolveActivity(intent1, 0) != null ->
                        reactApplicationContext.startActivity(intent1)
                    pm.resolveActivity(intent2, 0) != null ->
                        reactApplicationContext.startActivity(intent2)
                    pm.resolveActivity(intent3, 0) != null ->
                        reactApplicationContext.startActivity(intent3)
                    else ->
                        reactApplicationContext.startActivity(intent4)
                }
            }
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("REQUEST_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun initFolder(folderName: String, promise: Promise) {
        try {
            val isManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) Environment.isExternalStorageManager() else true
            Log.d(TAG, "initFolder: folderName=$folderName isExternalStorageManager=$isManager")
            val docs = Environment.getExternalStoragePublicDirectory(
                Environment.DIRECTORY_DOCUMENTS
            )
            val target = File(docs, folderName)
            folderPath = target.absolutePath
            Log.d(TAG, "initFolder: path=${target.absolutePath} exists=${target.exists()}")

            if (!target.exists() && !target.mkdirs()) {
                throw IOException("Cannot create directory: ${target.absolutePath}")
            }

            // Chmod 0777 sur le dossier et tous ses fichiers pour survivre au changement
            // de UID Android lors d'une réinstallation (nouveau UID non membre de media_rw).
            target.setReadable(true, false)
            target.setWritable(true, false)
            target.setExecutable(true, false)
            target.listFiles()?.forEach { f ->
                f.setReadable(true, false)
                f.setWritable(true, false)
            }

            val files = target.listFiles { f ->
                f.isFile && isMediaFile(f.name)
            } ?: emptyArray()

            val result = WritableNativeMap()
            result.putString("path", target.absolutePath)
            result.putBoolean("isEmpty", files.isEmpty())
            result.putInt("fileCount", files.size)
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("INIT_FOLDER_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun getLocalIp(promise: Promise) {
        try {
            val interfaces = NetworkInterface.getNetworkInterfaces()
            while (interfaces.hasMoreElements()) {
                val iface = interfaces.nextElement()
                if (iface.isLoopback || !iface.isUp) continue
                val addrs = iface.inetAddresses
                while (addrs.hasMoreElements()) {
                    val addr = addrs.nextElement()
                    val ip = addr.hostAddress ?: continue
                    if (!addr.isLoopbackAddress && ip.indexOf(':') < 0) {
                        promise.resolve(ip)
                        return
                    }
                }
            }
            promise.resolve("127.0.0.1")
        } catch (e: Exception) {
            promise.resolve("127.0.0.1")
        }
    }

    @ReactMethod
    fun readFile(filename: String, promise: Promise) {
        Log.d(TAG, "readFile: $filename folderPath=$folderPath")
        try {
            val dir = requireFolder(promise) ?: return
            val file = File(dir, filename)
            if (!file.exists()) {
                Log.w(TAG, "readFile: NOT_FOUND $filename")
                promise.reject("NOT_FOUND", "$filename not found")
                return
            }
            val content = file.readText(Charsets.UTF_8)
            Log.d(TAG, "readFile: OK $filename len=${content.length}")
            promise.resolve(content)
        } catch (e: Exception) {
            Log.e(TAG, "readFile: FAILED $filename: ${e.message}", e)
            promise.reject("READ_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun writeFile(filename: String, content: String, promise: Promise) {
        val isManager = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) Environment.isExternalStorageManager() else true
        Log.d(TAG, "writeFile: $filename len=${content.length} folderPath=$folderPath isManager=$isManager")
        try {
            val dir = requireFolder(promise) ?: return
            val target = File(dir, filename)
            Log.d(TAG, "writeFile: target=${target.absolutePath} parentWritable=${target.parentFile?.canWrite()}")
            target.writeText(content, Charsets.UTF_8)
            Log.d(TAG, "writeFile: OK $filename")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "writeFile: FAILED $filename: ${e.message}", e)
            promise.reject("WRITE_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun deleteFile(filename: String, promise: Promise) {
        Log.d(TAG, "deleteFile: $filename folderPath=$folderPath")
        try {
            val dir = requireFolder(promise) ?: return
            val file = File(dir, filename)
            if (!file.exists()) { Log.d(TAG, "deleteFile: $filename not found (idempotent)"); promise.resolve(true); return }
            val deleted = file.delete()
            Log.d(TAG, "deleteFile: $filename deleted=$deleted")
            promise.resolve(deleted)
        } catch (e: Exception) {
            Log.e(TAG, "deleteFile: FAILED $filename: ${e.message}", e)
            promise.reject("DELETE_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun listAllFiles(promise: Promise) {
        Log.d(TAG, "listAllFiles: folderPath=$folderPath")
        try {
            val dir = requireFolder(promise) ?: return
            val files = dir.listFiles { f -> f.isFile && !f.name.endsWith(".json") } ?: emptyArray()
            Log.d(TAG, "listAllFiles: found ${files.size} files")
            val arr = WritableNativeArray()
            files.sortedBy { it.name }.forEach { f ->
                val item = WritableNativeMap()
                item.putString("name", f.name)
                item.putDouble("size", f.length().toDouble())
                arr.pushMap(item)
            }
            promise.resolve(arr)
        } catch (e: Exception) {
            Log.e(TAG, "listAllFiles: FAILED: ${e.message}", e)
            promise.reject("LIST_FAILED", e.message, e)
        }
    }

    @ReactMethod
    fun saveImageBase64(filename: String, base64Data: String, promise: Promise) {
        Log.d(TAG, "saveImageBase64: $filename folderPath=$folderPath")
        try {
            val dir = requireFolder(promise) ?: return
            val bytes = Base64.decode(base64Data, Base64.DEFAULT)
            FileOutputStream(File(dir, filename)).use { it.write(bytes) }
            Log.d(TAG, "saveImageBase64: OK $filename ${bytes.size} bytes")
            promise.resolve(true)
        } catch (e: Exception) {
            Log.e(TAG, "saveImageBase64: FAILED $filename: ${e.message}", e)
            promise.reject("SAVE_IMAGE_FAILED", e.message, e)
        }
    }

    private fun isMediaFile(name: String): Boolean {
        val lower = name.lowercase()
        return lower.endsWith(".jpg") || lower.endsWith(".jpeg") ||
                lower.endsWith(".png") || lower.endsWith(".webp") ||
                lower.endsWith(".gif") || lower.endsWith(".bmp") ||
                lower.endsWith(".svg") || lower.endsWith(".mp4") ||
                lower.endsWith(".m4v") || lower.endsWith(".mov") ||
                lower.endsWith(".avi") || lower.endsWith(".mkv") ||
                lower.endsWith(".webm") || lower.endsWith(".mp3") ||
                lower.endsWith(".aac") || lower.endsWith(".wav")
    }
}
