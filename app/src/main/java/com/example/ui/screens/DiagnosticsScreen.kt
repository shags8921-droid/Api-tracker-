package com.example.ui.screens

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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BugReport
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Share
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.outlined.ArrowBack
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.local.DiagnosticLogEntity
import com.example.ui.components.HttpMethodBadge
import com.example.ui.theme.CyanNeon
import com.example.ui.theme.EmeraldAccent
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun DiagnosticsScreen(
  diagnosticLogs: List<DiagnosticLogEntity>,
  targetUrl: String,
  onBack: () -> Unit,
  onRerunDiagnostics: () -> Unit,
  modifier: Modifier = Modifier
) {
  var selectedItem by remember { mutableStateOf<DiagnosticLogEntity?>(null) }
  val timeFormat = SimpleDateFormat("HH:mm:ss.SSS", Locale.getDefault())

  Box(
    modifier = modifier
      .fillMaxSize()
      .background(MaterialTheme.colorScheme.background)
  ) {
    Column(
      modifier = Modifier
        .fillMaxSize()
        .padding(horizontal = 20.dp, vertical = 16.dp)
    ) {
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
          IconButton(
            onClick = onBack,
            modifier = Modifier.testTag("diagnostics_back_button")
          ) {
            Icon(imageVector = Icons.Outlined.ArrowBack, contentDescription = "Back")
          }
          Spacer(modifier = Modifier.width(4.dp))
          Column {
            Text(
              text = "Network Diagnostics",
              style = MaterialTheme.typography.titleLarge,
              fontWeight = FontWeight.Bold,
              color = MaterialTheme.colorScheme.onBackground
            )
            Text(
              text = "Raw HTTP status, TLS verification, & latency audits",
              fontSize = 11.sp,
              color = MaterialTheme.colorScheme.onSurfaceVariant
            )
          }
        }

        IconButton(
          onClick = onRerunDiagnostics,
          modifier = Modifier.testTag("rerun_diagnostics_button")
        ) {
          Icon(
            imageVector = Icons.Default.Refresh,
            contentDescription = "Rerun Probes",
            tint = CyanNeon
          )
        }
      }

      Spacer(modifier = Modifier.height(14.dp))

      // Discovery Target Summary Card
      Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)),
        border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)),
        modifier = Modifier.fillMaxWidth()
      ) {
        Column(modifier = Modifier.padding(12.dp)) {
          Text(
            text = "Honest Discovery Principle",
            fontWeight = FontWeight.Bold,
            fontSize = 12.sp,
            color = CyanNeon
          )
          Spacer(modifier = Modifier.height(4.dp))
          Text(
            text = "Target endpoints (/health, /manifest, /capabilities, /openapi.json) are verified with real HTTP probes. 404 or restricted responses are recorded transparently without simulated mocks.",
            fontSize = 11.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            lineHeight = 15.sp
          )
        }
      }

      Spacer(modifier = Modifier.height(14.dp))

      if (diagnosticLogs.isEmpty()) {
        Card(
          shape = RoundedCornerShape(12.dp),
          colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.3f)),
          modifier = Modifier.fillMaxWidth()
        ) {
          Column(
            modifier = Modifier
              .fillMaxWidth()
              .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally
          ) {
            Icon(imageVector = Icons.Default.BugReport, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(36.dp))
            Spacer(modifier = Modifier.height(10.dp))
            Text("No Diagnostic Logs Recorded", fontWeight = FontWeight.Bold, fontSize = 14.sp)
            Text("Probes will appear once a connection or discovery scan is initiated.", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
          }
        }
      } else {
        LazyColumn(
          modifier = Modifier.weight(1f),
          verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
          items(diagnosticLogs) { log ->
            DiagnosticLogRow(
              log = log,
              formattedTime = timeFormat.format(Date(log.timestamp)),
              onClick = { selectedItem = log }
            )
          }
        }
      }
    }

    // Detail Dialog
    selectedItem?.let { log ->
      AlertDialog(
        onDismissRequest = { selectedItem = null },
        title = {
          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
          ) {
            Text(
              text = "Probe Telemetry",
              fontWeight = FontWeight.Bold,
              fontSize = 16.sp
            )
            IconButton(onClick = { selectedItem = null }) {
              Icon(imageVector = Icons.Default.Close, contentDescription = "Close")
            }
          }
        },
        text = {
          Column {
            Text(
              text = "${log.method} ${log.endpointPath}",
              fontFamily = FontFamily.Monospace,
              fontWeight = FontWeight.Bold,
              fontSize = 13.sp,
              color = CyanNeon
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
              text = "Status: HTTP ${log.statusCode} · Latency: ${log.latencyMs}ms",
              fontSize = 12.sp,
              fontWeight = FontWeight.SemiBold,
              color = if (log.isSuccessful) EmeraldAccent else Color(0xFFEF4444)
            )
            Spacer(modifier = Modifier.height(10.dp))
            Text(text = "Message: ${log.message}", fontSize = 12.sp, color = MaterialTheme.colorScheme.onSurface)

            if (log.headersJson.isNotBlank()) {
              Spacer(modifier = Modifier.height(10.dp))
              Text(text = "Headers & Telemetry:", fontSize = 11.sp, fontWeight = FontWeight.Bold)
              Surface(
                shape = RoundedCornerShape(6.dp),
                color = Color(0xFF090D1A),
                modifier = Modifier
                  .fillMaxWidth()
                  .padding(top = 4.dp)
              ) {
                Text(
                  text = log.headersJson,
                  fontFamily = FontFamily.Monospace,
                  fontSize = 10.sp,
                  color = MaterialTheme.colorScheme.onSurfaceVariant,
                  modifier = Modifier.padding(8.dp)
                )
              }
            }
          }
        },
        confirmButton = {
          TextButton(onClick = { selectedItem = null }) {
            Text("Done")
          }
        }
      )
    }
  }
}

@Composable
private fun DiagnosticLogRow(
  log: DiagnosticLogEntity,
  formattedTime: String,
  onClick: () -> Unit
) {
  val (statusColor, statusBg) = if (log.isSuccessful) {
    Pair(EmeraldAccent, EmeraldAccent.copy(alpha = 0.15f))
  } else if (log.statusCode == 404) {
    Pair(Color(0xFFF59E0B), Color(0xFFF59E0B).copy(alpha = 0.15f))
  } else {
    Pair(Color(0xFFEF4444), Color(0xFFEF4444).copy(alpha = 0.15f))
  }

  Surface(
    shape = RoundedCornerShape(10.dp),
    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.15f)),
    modifier = Modifier
      .fillMaxWidth()
      .clickable { onClick() }
  ) {
    Row(
      modifier = Modifier.padding(12.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      Box(
        modifier = Modifier
          .clip(RoundedCornerShape(6.dp))
          .background(statusBg)
          .padding(horizontal = 6.dp, vertical = 3.dp)
      ) {
        Text(
          text = if (log.statusCode > 0) "${log.statusCode}" else "ERR",
          color = statusColor,
          fontFamily = FontFamily.Monospace,
          fontSize = 11.sp,
          fontWeight = FontWeight.Bold
        )
      }

      Spacer(modifier = Modifier.width(10.dp))

      Column(modifier = Modifier.weight(1f)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
          HttpMethodBadge(method = log.method)
          Spacer(modifier = Modifier.width(6.dp))
          Text(
            text = log.endpointPath,
            fontFamily = FontFamily.Monospace,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            color = MaterialTheme.colorScheme.onSurface,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
          )
        }
        Spacer(modifier = Modifier.height(2.dp))
        Text(
          text = log.message,
          fontSize = 11.sp,
          color = MaterialTheme.colorScheme.onSurfaceVariant,
          maxLines = 1,
          overflow = TextOverflow.Ellipsis
        )
      }

      Spacer(modifier = Modifier.width(8.dp))

      Column(horizontalAlignment = Alignment.End) {
        Text(
          text = "${log.latencyMs}ms",
          fontFamily = FontFamily.Monospace,
          fontSize = 11.sp,
          fontWeight = FontWeight.Bold,
          color = MaterialTheme.colorScheme.onSurface
        )
        Text(
          text = formattedTime,
          fontSize = 9.sp,
          color = MaterialTheme.colorScheme.onSurfaceVariant
        )
      }
    }
  }
}
