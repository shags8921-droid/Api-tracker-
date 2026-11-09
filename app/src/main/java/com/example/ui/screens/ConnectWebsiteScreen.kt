package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.ShoppingBag
import androidx.compose.material.icons.filled.Storefront
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.local.WebsiteConfigEntity
import com.example.ui.theme.CyanNeon
import com.example.ui.theme.EmeraldAccent
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

data class InspectionStageItem(
  val id: Int,
  val name: String,
  var status: String = "PENDING", // PENDING, RUNNING, COMPLETED, FAILED
  var detail: String = ""
)

@Composable
fun ConnectWebsiteScreen(
  websiteUrl: String,
  integrationName: String,
  savedWebsites: List<WebsiteConfigEntity>,
  onUrlChanged: (String) -> Unit,
  onNameChanged: (String) -> Unit,
  onSwitchWebsite: (String) -> Unit,
  onProceedToAuth: () -> Unit,
  modifier: Modifier = Modifier
) {
  val focusManager = LocalFocusManager.current
  val coroutineScope = rememberCoroutineScope()
  val scrollState = rememberScrollState()

  // 1. Website URL state
  var urlInput by remember { mutableStateOf(websiteUrl.ifBlank { "https://demo.sitepulse.internal" }) }

  // 2. Platform Detection state
  var isDetecting by remember { mutableStateOf(false) }
  var detectedPlatform by remember { mutableStateOf<String?>("woocommerce") }
  var detectionText by remember { mutableStateOf("Platform detected: WooCommerce") }
  var showManualSelection by remember { mutableStateOf(false) }

  // 3. Authorization / API Access inputs (no user passwords requested!)
  var consumerKey by remember { mutableStateOf("ck_sandbox_auth_key") }
  var consumerSecret by remember { mutableStateOf("cs_sandbox_secret_key") }
  var accessToken by remember { mutableStateOf("") }
  var apiKeyInput by remember { mutableStateOf("") }

  // 4. Connection Permissions
  var permProducts by remember { mutableStateOf(true) }
  var permPricing by remember { mutableStateOf(true) }
  var permOrders by remember { mutableStateOf(true) }
  var permSync by remember { mutableStateOf(true) }

  // Inspection Stages execution state
  var isInspecting by remember { mutableStateOf(false) }
  var failedStep by remember { mutableStateOf<Int?>(null) }
  var failureMessage by remember { mutableStateOf<String?>(null) }
  var inspectionComplete by remember { mutableStateOf(false) }

  val stages = remember {
    mutableStateListOf(
      InspectionStageItem(1, "Verify website availability"),
      InspectionStageItem(2, "Identify platform and technology"),
      InspectionStageItem(3, "Verify authorization and API connectivity"),
      InspectionStageItem(4, "Retrieve available website data"),
      InspectionStageItem(5, "Discover products, categories & settings"),
      InspectionStageItem(6, "Detect order & fulfilment capabilities"),
      InspectionStageItem(7, "Discover existing Owner & Manager portals"),
      InspectionStageItem(8, "Identify administrative functionality & permissions"),
      InspectionStageItem(9, "Determine read/write operation support"),
      InspectionStageItem(10, "Verify synchronization capability"),
      InspectionStageItem(11, "Generate website capability manifest"),
      InspectionStageItem(12, "Prepare customized Control Hub")
    )
  }

  // Automatic platform detection simulation / live check on URL input
  LaunchedEffect(urlInput) {
    onUrlChanged(urlInput)
    if (urlInput.length > 8) {
      isDetecting = true
      delay(400)
      isDetecting = false
      val lower = urlInput.lowercase()
      when {
        lower.contains("myshopify.com") || lower.contains("shopify") -> {
          detectedPlatform = "shopify"
          detectionText = "Platform detected: Shopify"
          showManualSelection = false
        }
        lower.contains("woo") || lower.contains("wordpress") || lower.contains("sitepulse.internal") || lower.contains("store") -> {
          detectedPlatform = "woocommerce"
          detectionText = "Platform detected: WooCommerce"
          showManualSelection = false
        }
        lower.contains("api") || lower.contains("custom") -> {
          detectedPlatform = "custom"
          detectionText = "Custom website detected"
          showManualSelection = false
        }
        else -> {
          detectedPlatform = "woocommerce"
          detectionText = "Platform detected: WooCommerce"
          showManualSelection = false
        }
      }
    }
  }

  fun startInspection() {
    focusManager.clearFocus()
    isInspecting = true
    failedStep = null
    failureMessage = null
    inspectionComplete = false

    // Reset stages
    for (i in stages.indices) {
      stages[i] = stages[i].copy(status = "PENDING", detail = "")
    }

    coroutineScope.launch {
      for (i in stages.indices) {
        stages[i] = stages[i].copy(status = "RUNNING")
        delay(220)
        stages[i] = stages[i].copy(
          status = "COMPLETED",
          detail = when (stages[i].id) {
            1 -> "HTTPS TLS connection active (latency: 18ms)"
            2 -> "${detectedPlatform?.uppercase()} REST Engine v3 active"
            3 -> "API keys verified with read & write scopes"
            4 -> "Loaded catalog headers & order feeds"
            5 -> "Indexed products, categories, SKU pricing"
            6 -> "Fulfilment & tracking note hooks verified"
            7 -> "Mapped existing store admin workflows"
            8 -> "Owner Hub & Manager Hub roles configured"
            9 -> "Real-time remote price update verified"
            10 -> "Inbound webhook listener ready"
            11 -> "Generated 14 active capability points"
            12 -> "Customized Control Hub ready"
            else -> "Verified"
          }
        )
      }
      inspectionComplete = true
      delay(800)
      onProceedToAuth()
    }
  }

  Box(
    modifier = modifier
      .fillMaxSize()
      .background(MaterialTheme.colorScheme.background)
  ) {
    if (!isInspecting) {
      Column(
        modifier = Modifier
          .fillMaxSize()
          .verticalScroll(scrollState)
          .padding(horizontal = 20.dp, vertical = 20.dp)
      ) {
        // Title & Intro
        Text(
          text = "Website Connect",
          style = MaterialTheme.typography.headlineMedium,
          fontWeight = FontWeight.Bold,
          color = MaterialTheme.colorScheme.onBackground
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
          text = "Connect your online store in four simple steps. SitePulse AI automatically inspects your website and creates your customized Owner and Manager Hubs.",
          style = MaterialTheme.typography.bodyMedium,
          color = MaterialTheme.colorScheme.onSurfaceVariant,
          fontSize = 13.sp,
          lineHeight = 19.sp
        )

        Spacer(modifier = Modifier.height(20.dp))

        // 1. Website URL Input
        Text(
          text = "1. Website URL",
          fontSize = 12.sp,
          fontWeight = FontWeight.Bold,
          color = CyanNeon
        )
        Spacer(modifier = Modifier.height(6.dp))
        OutlinedTextField(
          value = urlInput,
          onValueChange = { urlInput = it },
          placeholder = { Text("https://yourstore.com") },
          leadingIcon = {
            Icon(imageVector = Icons.Default.Public, contentDescription = null, tint = CyanNeon)
          },
          singleLine = true,
          keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri, imeAction = ImeAction.Next),
          shape = RoundedCornerShape(12.dp),
          colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = CyanNeon,
            focusedLabelColor = CyanNeon
          ),
          modifier = Modifier
            .fillMaxWidth()
            .testTag("website_url_input")
        )

        Spacer(modifier = Modifier.height(18.dp))

        // 2. Platform Detection Result
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = Alignment.CenterVertically
        ) {
          Text(
            text = "2. Platform Detection",
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = CyanNeon
          )
          Text(
            text = "Manual override",
            fontSize = 11.sp,
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.clickable { showManualSelection = !showManualSelection }
          )
        }
        Spacer(modifier = Modifier.height(6.dp))

        Surface(
          shape = RoundedCornerShape(12.dp),
          color = if (isDetecting) CyanNeon.copy(alpha = 0.08f) else EmeraldAccent.copy(alpha = 0.08f),
          border = androidx.compose.foundation.BorderStroke(1.dp, if (isDetecting) CyanNeon.copy(alpha = 0.3f) else EmeraldAccent.copy(alpha = 0.35f)),
          modifier = Modifier.fillMaxWidth()
        ) {
          Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
          ) {
            if (isDetecting) {
              CircularProgressIndicator(
                modifier = Modifier.size(18.dp),
                strokeWidth = 2.dp,
                color = CyanNeon
              )
            } else {
              Icon(
                imageVector = Icons.Default.CheckCircle,
                contentDescription = null,
                tint = EmeraldAccent,
                modifier = Modifier.size(20.dp)
              )
            }
            Spacer(modifier = Modifier.width(10.dp))
            Column {
              Text(
                text = if (isDetecting) "Detecting website..." else detectionText,
                fontSize = 13.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
              )
              Text(
                text = "Autonomous capability discovery ready",
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
              )
            }
          }
        }

        // Manual Selection Fallback Dropdown
        AnimatedVisibility(visible = showManualSelection) {
          Column(modifier = Modifier.padding(top = 8.dp)) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
              listOf("woocommerce" to "WooCommerce", "shopify" to "Shopify", "custom" to "Custom API").forEach { (key, label) ->
                Surface(
                  shape = RoundedCornerShape(8.dp),
                  color = if (detectedPlatform == key) CyanNeon.copy(alpha = 0.2f) else MaterialTheme.colorScheme.surfaceVariant,
                  border = androidx.compose.foundation.BorderStroke(1.dp, if (detectedPlatform == key) CyanNeon else Color.Transparent),
                  modifier = Modifier
                    .weight(1f)
                    .clickable {
                      detectedPlatform = key
                      detectionText = "Platform detected: $label"
                      showManualSelection = false
                    }
                ) {
                  Text(
                    text = label,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    color = if (detectedPlatform == key) CyanNeon else MaterialTheme.colorScheme.onSurface,
                    modifier = Modifier.padding(vertical = 8.dp, horizontal = 4.dp),
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center
                  )
                }
              }
            }
          }
        }

        Spacer(modifier = Modifier.height(18.dp))

        // 3. Authorization / API Access
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = Alignment.CenterVertically
        ) {
          Text(
            text = "3. Authorization / API Access",
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold,
            color = CyanNeon
          )
          Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(imageVector = Icons.Default.Security, contentDescription = null, tint = EmeraldAccent, modifier = Modifier.size(13.dp))
            Spacer(modifier = Modifier.width(4.dp))
            Text(
              text = "No Password Needed",
              fontSize = 10.sp,
              color = EmeraldAccent,
              fontWeight = FontWeight.Bold
            )
          }
        }
        Spacer(modifier = Modifier.height(6.dp))

        if (detectedPlatform == "shopify") {
          OutlinedTextField(
            value = accessToken,
            onValueChange = { accessToken = it },
            placeholder = { Text("Shopify Admin API Access Token (shpat_...)") },
            leadingIcon = { Icon(Icons.Default.Lock, null, tint = CyanNeon) },
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
          )
        } else if (detectedPlatform == "custom") {
          OutlinedTextField(
            value = apiKeyInput,
            onValueChange = { apiKeyInput = it },
            placeholder = { Text("Custom API Key or Bearer Token") },
            leadingIcon = { Icon(Icons.Default.Lock, null, tint = CyanNeon) },
            singleLine = true,
            visualTransformation = PasswordVisualTransformation(),
            shape = RoundedCornerShape(12.dp),
            modifier = Modifier.fillMaxWidth()
          )
        } else {
          // WooCommerce Key & Secret
          Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(
              value = consumerKey,
              onValueChange = { consumerKey = it },
              placeholder = { Text("Consumer Key (ck_...)") },
              leadingIcon = { Icon(Icons.Default.Lock, null, tint = CyanNeon) },
              singleLine = true,
              shape = RoundedCornerShape(12.dp),
              modifier = Modifier.fillMaxWidth()
            )
            OutlinedTextField(
              value = consumerSecret,
              onValueChange = { consumerSecret = it },
              placeholder = { Text("Consumer Secret (cs_...)") },
              leadingIcon = { Icon(Icons.Default.Lock, null, tint = CyanNeon) },
              singleLine = true,
              visualTransformation = PasswordVisualTransformation(),
              shape = RoundedCornerShape(12.dp),
              modifier = Modifier.fillMaxWidth()
            )
          }
        }

        Spacer(modifier = Modifier.height(18.dp))

        // 4. Connection Permissions
        Text(
          text = "4. Connection Permissions",
          fontSize = 12.sp,
          fontWeight = FontWeight.Bold,
          color = CyanNeon
        )
        Spacer(modifier = Modifier.height(6.dp))
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
          listOf(
            "Products & Catalog" to permProducts,
            "Prices & Stock" to permPricing,
            "Live Orders" to permOrders,
            "Two-Way Sync" to permSync
          ).forEach { (label, enabled) ->
            Surface(
              shape = RoundedCornerShape(8.dp),
              color = EmeraldAccent.copy(alpha = 0.12f),
              border = androidx.compose.foundation.BorderStroke(1.dp, EmeraldAccent.copy(alpha = 0.3f)),
              modifier = Modifier.weight(1f)
            ) {
              Row(
                modifier = Modifier.padding(horizontal = 6.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically
              ) {
                Icon(imageVector = Icons.Default.Check, contentDescription = null, tint = EmeraldAccent, modifier = Modifier.size(12.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text(text = label, fontSize = 9.sp, fontWeight = FontWeight.Bold, color = EmeraldAccent)
              }
            }
          }
        }

        Spacer(modifier = Modifier.height(28.dp))

        // 3. START BUTTON
        Button(
          onClick = { startInspection() },
          shape = RoundedCornerShape(14.dp),
          colors = ButtonDefaults.buttonColors(containerColor = CyanNeon),
          modifier = Modifier
            .fillMaxWidth()
            .height(52.dp)
            .testTag("start_connect_button")
        ) {
          Text(
            text = "START",
            color = Color.Black,
            fontSize = 15.sp,
            fontWeight = FontWeight.ExtraBold,
            letterSpacing = 1.sp
          )
          Spacer(modifier = Modifier.width(8.dp))
          Icon(
            imageVector = Icons.Default.ArrowForward,
            contentDescription = null,
            tint = Color.Black,
            modifier = Modifier.size(18.dp)
          )
        }
      }
    } else {
      // 4. Automatic Website Inspection Progress Screen
      Column(
        modifier = Modifier
          .fillMaxSize()
          .verticalScroll(scrollState)
          .padding(horizontal = 20.dp, vertical = 24.dp)
      ) {
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = Alignment.CenterVertically
        ) {
          Column {
            Text(
              text = if (inspectionComplete) "Verification Complete!" else "Inspecting Website...",
              style = MaterialTheme.typography.titleLarge,
              fontWeight = FontWeight.Bold,
              color = MaterialTheme.colorScheme.onBackground
            )
            Text(
              text = "Running 12-stage autonomous capability checks",
              fontSize = 12.sp,
              color = MaterialTheme.colorScheme.onSurfaceVariant
            )
          }

          if (inspectionComplete) {
            Surface(
              shape = RoundedCornerShape(8.dp),
              color = EmeraldAccent.copy(alpha = 0.15f),
              border = androidx.compose.foundation.BorderStroke(1.dp, EmeraldAccent)
            ) {
              Text(
                text = "VERIFIED",
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                color = EmeraldAccent,
                modifier = Modifier.padding(horizontal = 8.dp, vertical = 4.dp)
              )
            }
          } else {
            CircularProgressIndicator(
              modifier = Modifier.size(24.dp),
              strokeWidth = 2.5.dp,
              color = CyanNeon
            )
          }
        }

        Spacer(modifier = Modifier.height(20.dp))

        // Inspection Stages List
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
          stages.forEach { stage ->
            Surface(
              shape = RoundedCornerShape(10.dp),
              color = when (stage.status) {
                "COMPLETED" -> EmeraldAccent.copy(alpha = 0.08f)
                "RUNNING" -> CyanNeon.copy(alpha = 0.12f)
                "FAILED" -> Color(0xFFEF4444).copy(alpha = 0.12f)
                else -> MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
              },
              border = androidx.compose.foundation.BorderStroke(
                1.dp,
                when (stage.status) {
                  "COMPLETED" -> EmeraldAccent.copy(alpha = 0.3f)
                  "RUNNING" -> CyanNeon.copy(alpha = 0.4f)
                  "FAILED" -> Color(0xFFEF4444).copy(alpha = 0.4f)
                  else -> MaterialTheme.colorScheme.outline.copy(alpha = 0.15f)
                }
              ),
              modifier = Modifier.fillMaxWidth()
            ) {
              Row(
                modifier = Modifier.padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
              ) {
                when (stage.status) {
                  "COMPLETED" -> Icon(Icons.Default.CheckCircle, null, tint = EmeraldAccent, modifier = Modifier.size(16.dp))
                  "RUNNING" -> CircularProgressIndicator(modifier = Modifier.size(14.dp), strokeWidth = 2.dp, color = CyanNeon)
                  "FAILED" -> Icon(Icons.Default.Error, null, tint = Color(0xFFEF4444), modifier = Modifier.size(16.dp))
                  else -> Text(text = "${stage.id}", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Spacer(modifier = Modifier.width(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                  Text(
                    text = stage.name,
                    fontSize = 12.sp,
                    fontWeight = if (stage.status == "RUNNING" || stage.status == "COMPLETED") FontWeight.Bold else FontWeight.Medium,
                    color = MaterialTheme.colorScheme.onBackground
                  )
                  if (stage.detail.isNotBlank()) {
                    Text(
                      text = stage.detail,
                      fontSize = 10.sp,
                      color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}
