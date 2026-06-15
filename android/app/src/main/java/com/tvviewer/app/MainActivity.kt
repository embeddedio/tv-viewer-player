package com.tvviewer.app

import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.widget.Toast
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {

    private val uiHandler = Handler(Looper.getMainLooper())

    // ── Maintien 5 s pour quitter ─────────────────────────────────────────────

    private val HOLD_MS = 5_000L
    private var holdActive = false
    private var toastProgress: Toast? = null

    private val quitRunnable = Runnable {
        holdActive = false
        toastProgress?.cancel()
        // Lancer le launcher (home app par défaut)
        val home = Intent(Intent.ACTION_MAIN).apply {
            addCategory(Intent.CATEGORY_HOME)
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        startActivity(home)
    }

    /** Consomme BACK et HOME. Démarre le timer 5 s à la première pression. */
    override fun onKeyDown(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK || keyCode == KeyEvent.KEYCODE_HOME) {
            if (event?.repeatCount == 0 && !holdActive) {
                holdActive = true
                toastProgress = Toast.makeText(this, "Maintenir 5 s pour quitter…", Toast.LENGTH_LONG)
                toastProgress?.show()
                uiHandler.postDelayed(quitRunnable, HOLD_MS)
            }
            return true // bloquer
        }
        return super.onKeyDown(keyCode, event)
    }

    /** Annule le timer si relâché avant 5 s. */
    override fun onKeyUp(keyCode: Int, event: KeyEvent?): Boolean {
        if (keyCode == KeyEvent.KEYCODE_BACK || keyCode == KeyEvent.KEYCODE_HOME) {
            if (holdActive) {
                uiHandler.removeCallbacks(quitRunnable)
                toastProgress?.cancel()
                holdActive = false
            }
            return true
        }
        return super.onKeyUp(keyCode, event)
    }

    // ── Ne jamais quitter via le mécanisme React Native ───────────────────────

    override fun invokeDefaultOnBackPressed() {
        // Intentionnellement vide — le back est géré exclusivement par onKeyDown/onKeyUp
    }

    // ── Cycle de vie ──────────────────────────────────────────────────────────

    override fun onCreate(savedInstanceState: Bundle?) {
        setTheme(R.style.AppTheme)
        super.onCreate(null)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        setupVisibilityListener()
        hideSystemUI()
    }

    override fun onResume() {
        super.onResume()
        hideSystemUI()
        // Annuler tout hold en cours si l'app revient au premier plan
        uiHandler.removeCallbacks(quitRunnable)
        toastProgress?.cancel()
        holdActive = false
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemUI()
    }

    @Suppress("DEPRECATION")
    private fun setupVisibilityListener() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) return
        window.decorView.setOnSystemUiVisibilityChangeListener { visibility ->
            if (visibility and View.SYSTEM_UI_FLAG_FULLSCREEN == 0) {
                uiHandler.removeCallbacksAndMessages(null)
                uiHandler.postDelayed({ hideSystemUI() }, 150)
            }
        }
    }

    private fun hideSystemUI() {
        val controller = WindowCompat.getInsetsController(window, window.decorView)
        controller.hide(WindowInsetsCompat.Type.systemBars())
        controller.systemBarsBehavior = WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.R) {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                    or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                    or View.SYSTEM_UI_FLAG_FULLSCREEN
            )
        }
    }

    override fun getMainComponentName(): String = "main"

    override fun createReactActivityDelegate(): ReactActivityDelegate {
        return ReactActivityDelegateWrapper(
            this,
            BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
            object : DefaultReactActivityDelegate(
                this,
                mainComponentName,
                fabricEnabled
            ) {}
        )
    }
}
