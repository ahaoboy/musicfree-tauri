package com.ahaoboy.musicfree

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.Settings
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import app.tauri.annotation.Command
import app.tauri.plugin.Invoke

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)

    // Start foreground service to support background audio playback
    startAudioService()

    // Configure WebView to support background audio playback
    configureWebView()
  }

  private fun startAudioService() {
    try {
      val intent = Intent(this, AudioService::class.java)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        startForegroundService(intent)
      } else {
        startService(intent)
      }
    } catch (e: Exception) {
      android.util.Log.e("MainActivity", "Failed to start audio service", e)
    }
  }

  private fun configureWebView() {
    try {
      // Delay execution to ensure WebView is created
      window.decorView.post {
        val webView = findWebView(window.decorView)
        webView?.let { configureWebViewForBackgroundAudio(it) }
      }
    } catch (e: Exception) {
      android.util.Log.e("MainActivity", "Failed to configure WebView", e)
    }
  }

  private fun findWebView(view: android.view.View): WebView? {
    if (view is WebView) {
      return view
    }
    if (view is android.view.ViewGroup) {
      for (i in 0 until view.childCount) {
        val webView = findWebView(view.getChildAt(i))
        if (webView != null) {
          return webView
        }
      }
    }
    return null
  }

  private fun configureWebViewForBackgroundAudio(webView: WebView) {
    webView.settings.apply {
      // Enable media playback
      mediaPlaybackRequiresUserGesture = false

      // Allow mixed content
      mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW

      // Enable JavaScript (usually already enabled)
      javaScriptEnabled = true

      // Enable DOM storage
      domStorageEnabled = true
    }

    // Set WebChromeClient to support media controls
    webView.webChromeClient = object : android.webkit.WebChromeClient() {
      override fun onPermissionRequest(request: android.webkit.PermissionRequest?) {
        request?.grant(request.resources)
      }
    }

    android.util.Log.d("MainActivity", "WebView configured for background audio")
  }

  override fun onPause() {
    super.onPause()
    // CRITICAL: Don't pause WebView, let audio continue playing
    // Note: Don't call webView.onPause()
    android.util.Log.d("MainActivity", "Activity paused, audio should continue")
  }

  override fun onResume() {
    super.onResume()
    // Resume WebView
    try {
      val webView = findWebView(window.decorView)
      webView?.onResume()
      android.util.Log.d("MainActivity", "Activity resumed")
    } catch (e: Exception) {
      android.util.Log.e("MainActivity", "Failed to resume WebView", e)
    }
  }

  override fun onDestroy() {
    super.onDestroy()
    // Stop foreground service
    try {
      val intent = Intent(this, AudioService::class.java)
      stopService(intent)
    } catch (e: Exception) {
      android.util.Log.e("MainActivity", "Failed to stop audio service", e)
    }
  }

  // -- "All files access" permission (Android 11+ / API 30+) --------------

  /** Check whether the app has full external storage access. */
  fun hasAllFilesPermission(): Boolean {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      Environment.isExternalStorageManager()
    } else {
      true
    }
  }

  /** Open system settings so the user can grant "All files access". */
  fun requestAllFilesPermission() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
      try {
        val intent = Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION)
          .apply { data = Uri.parse("package:${packageName}") }
        startActivity(intent)
      } catch (e: Exception) {
        val intent = Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION)
        startActivity(intent)
      }
    }
  }

  // -- Tauri @Command bridge (called from frontend via invoke()) -----------

  @Command
  fun hasAllFilesPermission(invoke: Invoke): Boolean {
    return hasAllFilesPermission()
  }

  @Command
  fun requestAllFilesPermission(invoke: Invoke) {
    requestAllFilesPermission()
    invoke.resolve()
  }
}
