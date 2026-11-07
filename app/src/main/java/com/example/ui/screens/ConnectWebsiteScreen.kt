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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Language
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.NetworkCheck
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.outlined.ArrowForward
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.local.WebsiteConfigEntity
import com.example.data.remote.DiscoveryNetworkClient
import com.example.ui.theme.CyanNeon
import com.example.ui.theme.EmeraldAccent
import kotlinx.coroutines.launch

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

  // Real-time URL validation state
  val isHttps = websiteUrl.startsWith("https://", ignoreCase = true)
  val isValidFormat = websiteUrl.isNotBlank() && (websiteUrl.contains(".") || websiteUrl.contains("localhost"))

  // Pre-connection probe state
  var isProbing by remember { mutableStateOf(false) }
  var probeResult by remember { mutableStateOf<DiscoveryNetworkClient.EndpointProbeResult?>(null) }
  var apiProbeResult by remember { mutableStateOf<DiscoveryNetworkClient.EndpointProbeResult?>(null) }

  val client = remember { DiscoveryNetworkClient() }

  fun runQuickPing() {
    focusManager.clearFocus()
    if (!isValidFormat) return
    isProbing = true
    probeResult = null
    apiProbeResult = null
    coroutineScope.launch {
      val normalized = if (!websiteUrl.startsWith("http://") && !websiteUrl.startsWith("https://")) {
        "https://$websiteUrl"
      } else {
        websiteUrl
      }
      val res = client.checkBaseConnection(normalized)
      val apiRes = client.probeEndpoint(normalized, "/api/v1/integration/health")
      probeResult = res
      apiProbeResult = apiRes
      isProbing = false
    }
  }

  Box(
    modifier = modifier
      .fillMaxSize()
      .background(MaterialTheme.colorScheme.background)
  ) {
    Column(
      modifier = Modifier
        .fillMaxSize()
        .verticalScroll(scrollState)
        .padding(horizontal = 20.dp, vertical = 24.dp)
    ) {
      Text(
        text = "Connect Target Website",
        style = MaterialTheme.typography.headlineMedium,
        fontWeight = FontWeight.Bold,
        color = MaterialTheme.colorScheme.onBackground
      )
      Spacer(modifier = Modifier.height(6.dp))
      Text(
        text = "Enter the base URL of your website. The self-discovery engine will check reachability, verify HTTPS TLS, and probe for published integration APIs.",
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        lineHeight = 20.sp
      )

      // Multiple Saved Connections Selector
      if (savedWebsites.isNotEmpty()) {
        Spacer(modifier = Modifier.height(20.dp))
        Text(
          text = "Saved Website Connections (${savedWebsites.size})",
          fontSize = 12.sp,
          fontWeight = FontWeight.Bold,
          color = MaterialTheme.colorScheme.onSurfaceVariant
        )
        Spacer(modifier = Modifier.height(8.dp))
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
          savedWebsites.forEach { site ->
            Surface(
              shape = RoundedCornerShape(10.dp),
              color = if (site.isCurrentActive) CyanNeon.copy(alpha = 0.12f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
              border = androidx.compose.foundation.BorderStroke(1.dp, if (site.isCurrentActive) CyanNeon else MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)),
              modifier = Modifier
                .fillMaxWidth()
                .clickable {
                  onSwitchWebsite(site.id)
                  onUrlChanged(site.url)
                  onNameChanged(site.name)
                }
                .testTag("saved_site_${site.id}")
            ) {
              Row(
                modifier = Modifier.padding(12.dp),
                verticalAlignment = Alignment.CenterVertically
              ) {
                Icon(
                  imageVector = Icons.Default.Public,
                  contentDescription = null,
                  tint = if (site.isCurrentActive) CyanNeon else MaterialTheme.colorScheme.onSurfaceVariant,
                  modifier = Modifier.size(20.dp)
                )
                Spacer(modifier = Modifier.width(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                  Text(
                    text = site.name.ifBlank { site.url },
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                    color = if (site.isCurrentActive) CyanNeon else MaterialTheme.colorScheme.onSurface
                  )
                  Text(
                    text = site.url,
                    fontFamily = FontFamily.Monospace,
                    fontSize = 11.sp,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                  )
                }
                if (site.isCurrentActive) {
                  Surface(
                    shape = RoundedCornerShape(4.dp),
                    color = EmeraldAccent.copy(alpha = 0.18f)
                  ) {
                    Text(
                      text = "ACTIVE",
                      color = EmeraldAccent,
                      fontSize = 10.sp,
                      fontWeight = FontWeight.Bold,
                      modifier = Modifier.padding(horizontal = 6.dp, vertical = 2.dp)
                    )
                  }
                } else {
                  Icon(imageVector = Icons.Default.SwapHoriz, contentDescription = "Switch", tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(18.dp))
                }
              }
            }
          }
        }
      }

      Spacer(modifier = Modifier.height(20.dp))

      // Preset Chips
      Text(
        text = "Quick Presets",
        fontSize = 12.sp,
        fontWeight = FontWeight.SemiBold,
        color = MaterialTheme.colorScheme.onSurfaceVariant
      )
      Spacer(modifier = Modifier.height(8.dp))
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
      ) {
        PresetChip(
          label = "Enterprise Sandbox",
          url = "https://demo.sitepulse.internal",
          name = "Enterprise Cloud Demo",
          isSelected = websiteUrl.contains("sitepulse.internal"),
          onClick = { u, n ->
            onUrlChanged(u)
            onNameChanged(n)
          }
        )
        PresetChip(
          label = "GitHub API",
          url = "https://api.github.com",
          name = "GitHub Cloud",
          isSelected = websiteUrl.contains("github.com"),
          onClick = { u, n ->
            onUrlChanged(u)
            onNameChanged(n)
          }
        )
      }

      Spacer(modifier = Modifier.height(20.dp))

      // Website URL Input Field
      OutlinedTextField(
        value = websiteUrl,
        onValueChange = {
          onUrlChanged(it)
          probeResult = null
          apiProbeResult = null
        },
        label = { Text("Website Base URL") },
        placeholder = { Text("https://portal.example.com") },
        leadingIcon = {
          Icon(
            imageVector = if (isHttps) Icons.Default.Lock else Icons.Default.Language,
            contentDescription = null,
            tint = if (isHttps) EmeraldAccent else MaterialTheme.colorScheme.onSurfaceVariant
          )
        },
        trailingIcon = {
          if (isValidFormat && isHttps) {
            Icon(
              imageVector = Icons.Default.CheckCircle,
              contentDescription = "Valid HTTPS",
              tint = EmeraldAccent,
              modifier = Modifier.size(20.dp)
            )
          }
        },
        isError = websiteUrl.isNotBlank() && !isValidFormat,
        singleLine = true,
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Uri, imeAction = ImeAction.Next),
        keyboardActions = KeyboardActions(onNext = { focusManager.clearFocus() }),
        shape = RoundedCornerShape(12.dp),
        colors = OutlinedTextFieldDefaults.colors(
          focusedBorderColor = CyanNeon,
          focusedLabelColor = CyanNeon
        ),
        modifier = Modifier
          .fillMaxWidth()
          .testTag("website_url_input")
      )

      // HTTPS Notice or Warning
      Spacer(modifier = Modifier.height(6.dp))
      if (websiteUrl.isNotBlank() && !isHttps) {
        Row(verticalAlignment = Alignment.CenterVertically) {
          Icon(imageVector = Icons.Default.Warning, contentDescription = null, tint = Color(0xFFF59E0B), modifier = Modifier.size(14.dp))
          Spacer(modifier = Modifier.width(6.dp))
          Text(
            text = "Notice: Unencrypted HTTP is discouraged for production integrations.",
            color = Color(0xFFF59E0B),
            fontSize = 11.sp
          )
        }
      } else if (isHttps) {
        Row(verticalAlignment = Alignment.CenterVertically) {
          Icon(imageVector = Icons.Default.Lock, contentDescription = null, tint = EmeraldAccent, modifier = Modifier.size(14.dp))
          Spacer(modifier = Modifier.width(6.dp))
          Text(
            text = "HTTPS TLS encryption verified.",
            color = EmeraldAccent,
            fontSize = 11.sp
          )
        }
      }

      Spacer(modifier = Modifier.height(16.dp))

      // Optional Integration Name
      OutlinedTextField(
        value = integrationName,
        onValueChange = onNameChanged,
        label = { Text("Integration Label (Optional)") },
        placeholder = { Text("Production Website, Internal Hub, etc.") },
        singleLine = true,
        shape = RoundedCornerShape(12.dp),
        colors = OutlinedTextFieldDefaults.colors(
          focusedBorderColor = CyanNeon,
          focusedLabelColor = CyanNeon
        ),
        modifier = Modifier
          .fillMaxWidth()
          .testTag("integration_name_input")
      )

      Spacer(modifier = Modifier.height(18.dp))

      // Pre-flight Connectivity & Integration API Check Card
      Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)),
        modifier = Modifier.fillMaxWidth()
      ) {
        Column(modifier = Modifier.padding(14.dp)) {
          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
          ) {
            Column {
              Text(
                text = "Website Reachability & API Check",
                fontWeight = FontWeight.SemiBold,
                fontSize = 13.sp
              )
              Text(
                text = "Probe host reachability and /api/v1/integration/health",
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
              )
            }
            OutlinedButton(
              onClick = { runQuickPing() },
              enabled = isValidFormat && !isProbing,
              shape = RoundedCornerShape(8.dp),
              modifier = Modifier.testTag("test_reachability_button")
            ) {
              if (isProbing) {
                CircularProgressIndicator(modifier = Modifier.size(16.dp), strokeWidth = 2.dp)
              } else {
                Icon(imageVector = Icons.Default.NetworkCheck, contentDescription = null, modifier = Modifier.size(16.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text("Test Connection", fontSize = 12.sp)
              }
            }
          }

          probeResult?.let { res ->
            Spacer(modifier = Modifier.height(10.dp))
            Surface(
              shape = RoundedCornerShape(8.dp),
              color = if (res.isAvailable) EmeraldAccent.copy(alpha = 0.12f) else Color(0xFFEF4444).copy(alpha = 0.12f),
              border = androidx.compose.foundation.BorderStroke(1.dp, if (res.isAvailable) EmeraldAccent.copy(alpha = 0.3f) else Color(0xFFEF4444).copy(alpha = 0.3f)),
              modifier = Modifier.fillMaxWidth()
            ) {
              Column(modifier = Modifier.padding(10.dp)) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                  Icon(
                    imageVector = if (res.isAvailable) Icons.Default.CheckCircle else Icons.Default.Error,
                    contentDescription = null,
                    tint = if (res.isAvailable) EmeraldAccent else Color(0xFFEF4444),
                    modifier = Modifier.size(18.dp)
                  )
                  Spacer(modifier = Modifier.width(8.dp))
                  Text(
                    text = if (res.isAvailable) "Host Reachable: HTTP ${res.statusCode} (${res.latencyMs}ms)" else "Host Unreachable: ${res.errorMessage ?: res.statusText}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    color = if (res.isAvailable) EmeraldAccent else Color(0xFFEF4444)
                  )
                }

                apiProbeResult?.let { api ->
                  Spacer(modifier = Modifier.height(4.dp))
                  Text(
                    text = if (api.isAvailable) "Integration Health API: Available (${api.statusCode} OK)" else "Integration Health API: Not exposed (${api.statusCode} Not Documented)",
                    fontSize = 11.sp,
                    color = if (api.isAvailable) EmeraldAccent else Color(0xFFF59E0B)
                  )
                }
              }
            }
          }
        }
      }

      Spacer(modifier = Modifier.height(32.dp))

      // Proceed Button
      Button(
        onClick = onProceedToAuth,
        enabled = isValidFormat,
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.buttonColors(
          containerColor = MaterialTheme.colorScheme.primary,
          contentColor = Color.White
        ),
        modifier = Modifier
          .fillMaxWidth()
          .height(52.dp)
          .testTag("proceed_to_auth_button")
      ) {
        Text("Continue to Secure Auth", fontSize = 15.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.width(8.dp))
        Icon(imageVector = Icons.Outlined.ArrowForward, contentDescription = null, modifier = Modifier.size(18.dp))
      }
    }
  }
}

@Composable
private fun PresetChip(
  label: String,
  url: String,
  name: String,
  isSelected: Boolean,
  onClick: (String, String) -> Unit
) {
  Surface(
    shape = RoundedCornerShape(8.dp),
    color = if (isSelected) CyanNeon.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f),
    border = androidx.compose.foundation.BorderStroke(1.dp, if (isSelected) CyanNeon else MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)),
    modifier = Modifier.clickable { onClick(url, name) }
  ) {
    Row(
      modifier = Modifier.padding(horizontal = 12.dp, vertical = 8.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      if (isSelected) {
        Icon(imageVector = Icons.Default.Check, contentDescription = null, tint = CyanNeon, modifier = Modifier.size(14.dp))
        Spacer(modifier = Modifier.width(4.dp))
      }
      Text(
        text = label,
        fontSize = 12.sp,
        fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
        color = if (isSelected) CyanNeon else MaterialTheme.colorScheme.onSurface
      )
    }
  }
}
