package com.tvviewer.app

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.net.Uri
import android.os.Build
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.modules.core.DeviceEventManagerModule

class LauncherConfigModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName() = "LauncherConfig"

    private val configReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context, intent: Intent) {
            val map = Arguments.createMap().apply {
                putString("updateEndpoint", intent.getStringExtra("updateEndpoint") ?: "")
                putString("remoteServerUrl", intent.getStringExtra("remoteServerUrl") ?: "")
            }
            reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit("serverConfigChanged", map)
        }
    }

    init {
        val filter = IntentFilter("com.tvviewer.ACTION_SERVER_CHANGED")
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            reactContext.registerReceiver(configReceiver, filter, Context.RECEIVER_NOT_EXPORTED)
        } else {
            @Suppress("UnspecifiedRegisterReceiverFlag")
            reactContext.registerReceiver(configReceiver, filter)
        }
    }

    @ReactMethod
    fun getServerConfig(promise: Promise) {
        try {
            val uri = Uri.parse("content://com.tvviewer.launcher.config/config")
            val cursor = reactContext.contentResolver.query(uri, null, null, null, null)
            cursor?.use {
                if (it.moveToFirst()) {
                    val map = Arguments.createMap().apply {
                        putString("updateEndpoint", it.getString(it.getColumnIndexOrThrow("updateEndpoint")))
                        putString("remoteServerUrl", it.getString(it.getColumnIndexOrThrow("remoteServerUrl")))
                    }
                    promise.resolve(map)
                } else {
                    promise.resolve(null)
                }
            } ?: promise.resolve(null)
        } catch (e: Exception) {
            promise.resolve(null)
        }
    }

    override fun invalidate() {
        super.invalidate()
        try { reactContext.unregisterReceiver(configReceiver) } catch (_: Exception) {}
    }
}
