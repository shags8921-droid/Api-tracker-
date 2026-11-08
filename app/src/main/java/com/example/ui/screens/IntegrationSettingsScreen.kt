package com.example.ui.screens

import androidx.compose.foundation.background
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
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.DeleteForever
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.outlined.BugReport
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.local.WebsiteConfigEntity
import com.example.ui.theme.CyanNeon

@Composable
fun IntegrationSettingsScreen(
  config: WebsiteConfigEntity?,
  onDisconnect: () -> Unit,
  onOpenDiagnostics: () -> Unit,
  onOpenWebHub: () -> Unit = {},
  modifier: Modifier = Modifier
) {
  val scrollState = rememberScrollState()
  var showDisconnectConfirm by remember { mutableStateOf(false) }
  var requireApprovalForDestructive by remember { mutableStateOf(true) }
  var autoSyncEnabled by remember { mutableStateOf(true) }

  Box(
    modifier = modifier
      .fillMaxSize()
      .background(MaterialTheme.colorScheme.background)
  ) {
    Column(
      modifier = Modifier
        .fillMaxSize()
        .verticalScroll(scrollState)
        .padding(horizontal = 20.dp, vertical = 20.dp),
      verticalArrangement = Arrangement.spacedBy(16.dp)
    ) {
      Text(
        text = "Integration Settings",
        style = MaterialTheme.typography.titleLarge,
        fontWeight = FontWeight.Bold,
        color = MaterialTheme.colorScheme.onBackground
      )
      Text(
        text = "Runtime parameters, security policies & database controls",
        fontSize = 12.sp,
        color = MaterialTheme.colorScheme.onSurfaceVariant
      )

      // Connection Info Card
      Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)),
        modifier = Modifier.fillMaxWidth()
      ) {
        Column(modifier = Modifier.padding(16.dp)) {
          Text(
            text = "Active Website Configuration",
            fontWeight = FontWeight.Bold,
            fontSize = 14.sp
          )
          Spacer(modifier = Modifier.height(10.dp))
          SettingInfoRow(label = "Label", value = config?.name ?: "None")
          SettingInfoRow(label = "Endpoint URL", value = config?.url ?: "Not Connected")
          SettingInfoRow(label = "Manifest Version", value = "v${config?.manifestVersion ?: "N/A"}")
          SettingInfoRow(label = "Security Protocol", value = config?.securityLevel ?: "None")
        }
      }

      // Safeguards & Policies
      Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)),
        modifier = Modifier.fillMaxWidth()
      ) {
        Column(modifier = Modifier.padding(16.dp)) {
          Text(
            text = "Security & Execution Policies",
            fontWeight = FontWeight.Bold,
            fontSize = 14.sp
          )
          Spacer(modifier = Modifier.height(12.dp))

          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
          ) {
            Column(modifier = Modifier.weight(1f)) {
              Text(
                text = "Destructive Action Safeguards",
                fontWeight = FontWeight.SemiBold,
                fontSize = 13.sp
              )
              Text(
                text = "Enforce two-tap dialog approval for DELETE and revocation actions",
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
              )
            }
            Switch(
              checked = requireApprovalForDestructive,
              onCheckedChange = { requireApprovalForDestructive = it },
              colors = SwitchDefaults.colors(checkedThumbColor = CyanNeon, checkedTrackColor = CyanNeon.copy(alpha = 0.3f)),
              modifier = Modifier.testTag("destructive_safeguard_switch")
            )
          }

          Spacer(modifier = Modifier.height(12.dp))

          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
          ) {
            Column(modifier = Modifier.weight(1f)) {
              Text(
                text = "Background Auto-Sync",
                fontWeight = FontWeight.SemiBold,
                fontSize = 13.sp
              )
              Text(
                text = "WorkManager checks manifest updates every 30 minutes",
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
              )
            }
            Switch(
              checked = autoSyncEnabled,
              onCheckedChange = { autoSyncEnabled = it },
              colors = SwitchDefaults.colors(checkedThumbColor = CyanNeon, checkedTrackColor = CyanNeon.copy(alpha = 0.3f)),
              modifier = Modifier.testTag("auto_sync_switch")
            )
          }
        }
      }

      // Quick Tools
      Button(
        onClick = onOpenWebHub,
        shape = RoundedCornerShape(12.dp),
        colors = ButtonDefaults.buttonColors(containerColor = CyanNeon.copy(alpha = 0.2f), contentColor = CyanNeon),
        modifier = Modifier
          .fillMaxWidth()
          .height(48.dp)
          .testTag("open_web_hub_button")
      ) {
        Icon(imageVector = Icons.Default.Settings, contentDescription = null, tint = CyanNeon, modifier = Modifier.size(18.dp))
        Spacer(modifier = Modifier.width(8.dp))
        Text("Launch Full Web Hub (24 Discovered Modules)", fontWeight = FontWeight.Bold, fontSize = 13.sp)
      }

      OutlinedButton(
        onClick = onOpenDiagnostics,
        shape = RoundedCornerShape(12.dp),
        modifier = Modifier
          .fillMaxWidth()
          .height(48.dp)
          .testTag("open_diagnostics_from_settings_button")
      ) {
        Icon(imageVector = Icons.Outlined.BugReport, contentDescription = null, tint = CyanNeon, modifier = Modifier.size(18.dp))
        Spacer(modifier = Modifier.width(8.dp))
        Text("View Network Diagnostics & Raw Payloads", fontSize = 13.sp)
      }

      Spacer(modifier = Modifier.height(8.dp))

      // Danger Zone
      Card(
        shape = RoundedCornerShape(14.dp),
        colors = CardDefaults.cardColors(containerColor = Color(0xFFEF4444).copy(alpha = 0.08f)),
        border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEF4444).copy(alpha = 0.3f)),
        modifier = Modifier.fillMaxWidth()
      ) {
        Column(modifier = Modifier.padding(16.dp)) {
          Text(
            text = "Danger Zone",
            fontWeight = FontWeight.Bold,
            color = Color(0xFFEF4444),
            fontSize = 14.sp
          )
          Spacer(modifier = Modifier.height(4.dp))
          Text(
            text = "Disconnecting will erase all cached endpoints, discovered hubs, and hardware-stored authentication credentials.",
            fontSize = 11.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
          )
          Spacer(modifier = Modifier.height(12.dp))
          Button(
            onClick = { showDisconnectConfirm = true },
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
            shape = RoundedCornerShape(10.dp),
            modifier = Modifier
              .fillMaxWidth()
              .testTag("disconnect_website_button")
          ) {
            Icon(imageVector = Icons.Default.DeleteForever, contentDescription = null, modifier = Modifier.size(16.dp))
            Spacer(modifier = Modifier.width(6.dp))
            Text("Disconnect & Wipe Local Storage", fontWeight = FontWeight.Bold, fontSize = 13.sp)
          }
        }
      }
    }

    if (showDisconnectConfirm) {
      AlertDialog(
        onDismissRequest = { showDisconnectConfirm = false },
        title = { Text("Confirm Disconnection", fontWeight = FontWeight.Bold) },
        text = {
          Text("Are you sure you want to disconnect this website and wipe all local SQLite records and secure credentials?")
        },
        confirmButton = {
          Button(
            onClick = {
              showDisconnectConfirm = false
              onDisconnect()
            },
            colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))
          ) {
            Text("Disconnect", color = Color.White)
          }
        },
        dismissButton = {
          TextButton(onClick = { showDisconnectConfirm = false }) {
            Text("Cancel")
          }
        }
      )
    }
  }
}

@Composable
private fun SettingInfoRow(label: String, value: String) {
  Row(
    modifier = Modifier
      .fillMaxWidth()
      .padding(vertical = 4.dp),
    horizontalArrangement = Arrangement.SpaceBetween
  ) {
    Text(text = label, fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
    Text(
      text = value,
      fontSize = 12.sp,
      fontWeight = FontWeight.Medium,
      fontFamily = FontFamily.Monospace,
      color = MaterialTheme.colorScheme.onSurface
    )
  }
}
