package com.svayam.vikas

import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.WebSettings
import android.webkit.WebView
import com.getcapacitor.BridgeActivity

/**
 * SvayamVikās — Main Android Activity
 *
 * Extends BridgeActivity (Capacitor's base) and adds:
 * - Full hardware acceleration for WebGL / Three.js
 * - Immersive fullscreen mode (hides status + nav bars)
 * - Optimised WebView flags for game performance
 * - Prevents screen from sleeping during gameplay
 */
class MainActivity : BridgeActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // ── Fullscreen Immersive Mode ──────────────────────────────────────────
        // Hides status bar AND navigation bar. Player swipes from edge to reveal.
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        )

        // ── Hardware Acceleration (CRITICAL for WebGL) ─────────────────────────
        window.setFlags(
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        )

        // ── Prevent Screen Sleep During Gameplay ───────────────────────────────
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        // ── Dark background during load (no white flash) ───────────────────────
        window.decorView.setBackgroundColor(android.graphics.Color.parseColor("#020409"))

        // Configure WebView after bridge initializes
        configureWebView()
    }

    private fun configureWebView() {
        val webView: WebView = bridge.webView

        webView.settings.apply {
            // ── Performance ────────────────────────────────────────────────────
            javaScriptEnabled            = true
            domStorageEnabled            = true     // needed for game state storage
            databaseEnabled              = true
            cacheMode                    = WebSettings.LOAD_DEFAULT

            // ── WebGL Specific ─────────────────────────────────────────────────
            // Hardware acceleration is set at Activity level (above)
            // These ensure the WebView doesn't limit GPU usage:
            setRenderPriority(WebSettings.RenderPriority.HIGH)

            // ── Media / Fonts ──────────────────────────────────────────────────
            allowFileAccess              = false     // security: disable file:// access
            allowContentAccess           = true
            loadsImagesAutomatically     = true
            mediaPlaybackRequiresUserGesture = false // allow audio autoplay for game

            // ── Zoom ───────────────────────────────────────────────────────────
            setSupportZoom(false)
            builtInZoomControls          = false
            displayZoomControls          = false

            // ── User Agent ─────────────────────────────────────────────────────
            // Append game identifier so your CF Worker can verify requests
            userAgentString = userAgentString + " SvayamVikas/1.0 Android"

            // ── Mixed Content ──────────────────────────────────────────────────
            mixedContentMode = WebSettings.MIXED_CONTENT_NEVER_ALLOW
        }

        // Remove default WebView scroll bars (clean game look)
        webView.isVerticalScrollBarEnabled  = false
        webView.isHorizontalScrollBarEnabled = false

        // Enable hardware layer for the WebView itself
        webView.setLayerType(View.LAYER_TYPE_HARDWARE, null)
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) {
            // Re-apply immersive mode when window regains focus
            window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
            )
        }
    }
}
