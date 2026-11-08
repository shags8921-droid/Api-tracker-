package com.example.ui.screens

import android.annotation.SuppressLint
import android.graphics.Bitmap
import android.view.ViewGroup
import android.webkit.WebChromeClient
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import com.example.ui.theme.CyanNeon

@OptIn(ExperimentalMaterial3Api::class)
@SuppressLint("SetJavaScriptEnabled")
@Composable
fun WebHubScreen(
  onBack: () -> Unit,
  modifier: Modifier = Modifier
) {
  var webView: WebView? by remember { mutableStateOf(null) }
  var isLoading by remember { mutableStateOf(true) }
  var progress by remember { mutableFloatStateOf(0f) }
  var pageTitle by remember { mutableStateOf("SitePulse Web Management Hub") }

  BackHandler {
    if (webView?.canGoBack() == true) {
      webView?.goBack()
    } else {
      onBack()
    }
  }

  Column(
    modifier = modifier
      .fillMaxSize()
      .background(MaterialTheme.colorScheme.background)
  ) {
    TopAppBar(
      title = {
        Column {
          Text(
            text = pageTitle,
            fontSize = 15.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1
          )
          Text(
            text = "24 Discovered Modules & Cloud Workspaces",
            fontSize = 11.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
          )
        }
      },
      navigationIcon = {
        IconButton(
          onClick = {
            if (webView?.canGoBack() == true) {
              webView?.goBack()
            } else {
              onBack()
            }
          },
          modifier = Modifier.testTag("webhub_back_button")
        ) {
          Icon(
            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
            contentDescription = "Back",
            tint = CyanNeon
          )
        }
      },
      actions = {
        IconButton(
          onClick = { webView?.reload() },
          modifier = Modifier.testTag("webhub_reload_button")
        ) {
          Icon(
            imageVector = Icons.Default.Refresh,
            contentDescription = "Reload",
            tint = MaterialTheme.colorScheme.onSurface
          )
        }
        IconButton(
          onClick = onBack,
          modifier = Modifier.testTag("webhub_close_button")
        ) {
          Icon(
            imageVector = Icons.Default.Close,
            contentDescription = "Close",
            tint = MaterialTheme.colorScheme.onSurfaceVariant
          )
        }
      },
      colors = TopAppBarDefaults.topAppBarColors(
        containerColor = MaterialTheme.colorScheme.surface
      )
    )

    if (isLoading) {
      LinearProgressIndicator(
        progress = { progress },
        modifier = Modifier
          .fillMaxWidth()
          .height(2.dp),
        color = CyanNeon
      )
    }

    Box(
      modifier = Modifier
        .fillMaxSize()
        .weight(1f)
    ) {
      AndroidView(
        factory = { context ->
          WebView(context).apply {
            layoutParams = ViewGroup.LayoutParams(
              ViewGroup.LayoutParams.MATCH_PARENT,
              ViewGroup.LayoutParams.MATCH_PARENT
            )
            settings.apply {
              javaScriptEnabled = true
              domStorageEnabled = true
              allowFileAccess = true
              allowContentAccess = true
              databaseEnabled = true
              useWideViewPort = true
              loadWithOverviewMode = true
              cacheMode = WebSettings.LOAD_DEFAULT
            }
            webViewClient = object : WebViewClient() {
              override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                super.onPageStarted(view, url, favicon)
                isLoading = true
              }

              override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                isLoading = false
                view?.title?.let {
                  if (it.isNotBlank()) pageTitle = it
                }
              }

              override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
              ) {
                super.onReceivedError(view, request, error)
                isLoading = false
              }
            }
            webChromeClient = object : WebChromeClient() {
              override fun onProgressChanged(view: WebView?, newProgress: Int) {
                super.onProgressChanged(view, newProgress)
                progress = newProgress / 100f
                if (newProgress == 100) isLoading = false
              }

              override fun onReceivedTitle(view: WebView?, title: String?) {
                super.onReceivedTitle(view, title)
                if (!title.isNullOrBlank()) {
                  pageTitle = title
                }
              }
            }
            loadUrl("file:///android_asset/web/index.html")
            webView = this
          }
        },
        update = {
          webView = it
        },
        modifier = Modifier
          .fillMaxSize()
          .testTag("native_web_hub_view")
      )
    }
  }
}
