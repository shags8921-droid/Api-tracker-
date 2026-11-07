package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.outlined.Analytics
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.StageStatus
import com.example.domain.discovery.DiscoveryEngine
import com.example.ui.components.StageProgressCard
import com.example.ui.theme.CyanNeon
import com.example.ui.theme.EmeraldAccent

@Composable
fun DiscoveryProgressScreen(
  progress: DiscoveryEngine.DiscoveryProgress?,
  onViewAnalysis: () -> Unit,
  onRetry: () -> Unit,
  modifier: Modifier = Modifier
) {
  val stages = progress?.stages ?: emptyList()
  val completedStages = stages.count { it.status == StageStatus.COMPLETED || it.status == StageStatus.WARNING }
  val totalStages = 11
  val progressFraction = (completedStages.toFloat() / totalStages.toFloat()).coerceIn(0f, 1f)

  Box(
    modifier = modifier
      .fillMaxSize()
      .background(MaterialTheme.colorScheme.background)
  ) {
    Column(
      modifier = Modifier
        .fillMaxSize()
        .padding(horizontal = 20.dp, vertical = 20.dp)
    ) {
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Column {
          Text(
            text = "Self-Discovery Pipeline",
            style = MaterialTheme.typography.titleLarge,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onBackground
          )
          Text(
            text = "Stage $completedStages of $totalStages tasks executed",
            fontSize = 12.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
          )
        }

        Surface(
          shape = RoundedCornerShape(8.dp),
          color = if (progress?.isComplete == true) EmeraldAccent.copy(alpha = 0.15f) else CyanNeon.copy(alpha = 0.15f),
          border = androidx.compose.foundation.BorderStroke(1.dp, if (progress?.isComplete == true) EmeraldAccent else CyanNeon)
        ) {
          Text(
            text = if (progress?.isComplete == true) "COMPLETE" else if (progress?.isFailed == true) "FAILED" else "ACTIVE",
            color = if (progress?.isComplete == true) EmeraldAccent else if (progress?.isFailed == true) Color(0xFFEF4444) else CyanNeon,
            fontWeight = FontWeight.Bold,
            fontSize = 11.sp,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 4.dp)
          )
        }
      }

      Spacer(modifier = Modifier.height(14.dp))

      // Linear Progress bar strictly tied to actual completed stages
      LinearProgressIndicator(
        progress = { progressFraction },
        modifier = Modifier
          .fillMaxWidth()
          .height(6.dp)
          .clip(RoundedCornerShape(3.dp)),
        color = if (progress?.isComplete == true) EmeraldAccent else CyanNeon,
        trackColor = MaterialTheme.colorScheme.surfaceVariant
      )

      Spacer(modifier = Modifier.height(16.dp))

      // Failure Alert if any
      if (progress?.isFailed == true) {
        Card(
          shape = RoundedCornerShape(10.dp),
          colors = CardDefaults.cardColors(containerColor = Color(0xFFEF4444).copy(alpha = 0.12f)),
          border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEF4444).copy(alpha = 0.4f)),
          modifier = Modifier.fillMaxWidth()
        ) {
          Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(imageVector = Icons.Default.Error, contentDescription = null, tint = Color(0xFFEF4444), modifier = Modifier.size(20.dp))
            Spacer(modifier = Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f)) {
              Text("Discovery Halted", fontWeight = FontWeight.Bold, color = Color(0xFFEF4444), fontSize = 13.sp)
              Text(
                text = progress.failureReason ?: "Network error",
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
              )
            }
            OutlinedButton(
              onClick = onRetry,
              modifier = Modifier.testTag("retry_discovery_button")
            ) {
              Icon(imageVector = Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(14.dp))
              Spacer(modifier = Modifier.width(4.dp))
              Text("Retry", fontSize = 11.sp)
            }
          }
        }
        Spacer(modifier = Modifier.height(14.dp))
      }

      // Stage list
      LazyColumn(
        modifier = Modifier.weight(1f),
        verticalArrangement = Arrangement.spacedBy(8.dp)
      ) {
        items(stages) { stageState ->
          StageProgressCard(stageState = stageState)
        }

        // Live Diagnostic Log telemetry
        progress?.logs?.let { logs ->
          if (logs.isNotEmpty()) {
            item {
              Spacer(modifier = Modifier.height(8.dp))
              Text(
                text = "Live Network Telemetry (${logs.size} Verified Probes)",
                fontSize = 12.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurfaceVariant
              )
              Spacer(modifier = Modifier.height(6.dp))
              Card(
                shape = RoundedCornerShape(8.dp),
                colors = CardDefaults.cardColors(containerColor = Color(0xFF070B14)),
                border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)),
                modifier = Modifier.fillMaxWidth()
              ) {
                Column(modifier = Modifier.padding(10.dp)) {
                  logs.takeLast(4).forEach { item ->
                    Text(
                      text = "${item.method} ${item.endpointPath} -> HTTP ${item.statusCode} (${item.latencyMs}ms)",
                      fontFamily = FontFamily.Monospace,
                      fontSize = 11.sp,
                      color = if (item.isSuccessful) EmeraldAccent else if (item.statusCode == 404) Color(0xFFF59E0B) else Color(0xFFEF4444)
                    )
                  }
                }
              }
            }
          }
        }
      }

      Spacer(modifier = Modifier.height(14.dp))

      // Bottom Navigation / Action Button
      if (progress?.isComplete == true) {
        Button(
          onClick = onViewAnalysis,
          shape = RoundedCornerShape(12.dp),
          colors = ButtonDefaults.buttonColors(containerColor = EmeraldAccent, contentColor = Color.White),
          modifier = Modifier
            .fillMaxWidth()
            .height(50.dp)
            .testTag("view_analysis_results_button")
        ) {
          Icon(imageVector = Icons.Outlined.Analytics, contentDescription = null, modifier = Modifier.size(18.dp))
          Spacer(modifier = Modifier.width(8.dp))
          Text("Inspect Transparent Discovery Analysis", fontSize = 14.sp, fontWeight = FontWeight.Bold)
        }
      }
    }
  }
}
