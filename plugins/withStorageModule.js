// plugins/withStorageModule.js
// Génère StorageModule.kt + StoragePackage.kt et les enregistre dans MainApplication.kt
// automatiquement à chaque expo prebuild, pour ne pas perdre ces fichiers au --clean.
const { withMainApplication, withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

const STORAGE_MODULE_KT = `package com.tvviewer.app

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.Settings
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableNativeMap
import java.io.File
import java.io.IOException
import java.net.NetworkInterface

class StorageModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "StorageModule"

    @ReactMethod
    fun hasAccess(promise: Promise) {
        try {
            val granted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                if (Environment.isExternalStorageManager()) {
                    true
                } else {
                    // Première installation (dossier vide ou absent) → pas besoin de permission.
                    // Reinstall avec fichiers existants non lisibles → demander MANAGE_EXTERNAL_STORAGE.
                    canAccessStorage()
                }
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
                    Uri.parse("package:\$pkg")
                ).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }

                val intent2 = Intent(
                    Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION
                ).apply { addFlags(Intent.FLAG_ACTIVITY_NEW_TASK) }

                val intent3 = Intent(
                    Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:\$pkg")
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
            val docs = Environment.getExternalStoragePublicDirectory(
                Environment.DIRECTORY_DOCUMENTS
            )
            val target = File(docs, folderName)

            if (!target.exists() && !target.mkdirs()) {
                throw IOException("Cannot create directory: \${target.absolutePath}")
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

    private fun canAccessStorage(): Boolean {
        return try {
            val docs = Environment.getExternalStoragePublicDirectory(
                Environment.DIRECTORY_DOCUMENTS
            )
            val folder = File(docs, "tv-viewer")

            // Pas encore de dossier → première installation → OK sans permission
            if (!folder.exists()) return true

            val files = folder.listFiles()
            // Dossier vide → OK sans permission
            if (files.isNullOrEmpty()) return true

            // Dossier non vide → tester la lecture d'un fichier existant.
            // Si EACCES → reinstall avec données d'un autre UID → permission requise.
            val testFile = files.firstOrNull { it.isFile } ?: return true
            java.io.FileInputStream(testFile).use { it.read() }
            true
        } catch (e: Exception) {
            false
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
`;

const STORAGE_PACKAGE_KT = `package com.tvviewer.app

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class StoragePackage : ReactPackage {
    override fun createNativeModules(
        reactContext: ReactApplicationContext
    ): List<NativeModule> = listOf(StorageModule(reactContext))

    override fun createViewManagers(
        reactContext: ReactApplicationContext
    ): List<ViewManager<*, *>> = emptyList()
}
`;

function withStorageKotlinFiles(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const androidSrc = path.join(
        cfg.modRequest.platformProjectRoot,
        'app', 'src', 'main', 'java', 'com', 'tvviewer', 'player'
      );
      fs.mkdirSync(androidSrc, { recursive: true });
      fs.writeFileSync(path.join(androidSrc, 'StorageModule.kt'), STORAGE_MODULE_KT, 'utf8');
      fs.writeFileSync(path.join(androidSrc, 'StoragePackage.kt'), STORAGE_PACKAGE_KT, 'utf8');
      return cfg;
    },
  ]);
}

function withStoragePackageRegistration(config) {
  return withMainApplication(config, (cfg) => {
    let contents = cfg.modResults.contents;

    if (contents.includes('StoragePackage()')) {
      return cfg;
    }

    // Ajoute l'import après l'import ReactNativeHostWrapper
    contents = contents.replace(
      /(import expo\.modules\.ReactNativeHostWrapper)/,
      '$1\nimport com.tvviewer.app.StoragePackage'
    );

    // Ajoute add(StoragePackage()) dans le bloc apply {}
    contents = contents.replace(
      /(PackageList\(this\)\.packages\.apply \{)([\s\S]*?)(\})/,
      (match, open, body, close) => {
        if (body.includes('StoragePackage()')) return match;
        return `${open}\n              add(StoragePackage())${body}${close}`;
      }
    );

    cfg.modResults.contents = contents;
    return cfg;
  });
}

function withBundleInAllBuilds(config) {
  return withDangerousMod(config, [
    'android',
    (cfg) => {
      const buildGradlePath = path.join(
        cfg.modRequest.platformProjectRoot,
        'app', 'build.gradle'
      );
      let contents = fs.readFileSync(buildGradlePath, 'utf8');

      if (!contents.includes('debuggableVariants = []')) {
        contents = contents.replace(
          /\/\/ debuggableVariants = \["liteDebug", "prodDebug"\]/,
          'debuggableVariants = [] // bundle JS dans tous les builds, y compris debug'
        );
        fs.writeFileSync(buildGradlePath, contents, 'utf8');
      }

      return cfg;
    },
  ]);
}

module.exports = function withStorageModule(config) {
  config = withStorageKotlinFiles(config);
  config = withStoragePackageRegistration(config);
  config = withBundleInAllBuilds(config);
  return config;
};
