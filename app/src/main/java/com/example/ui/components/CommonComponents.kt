package com.example.ui.components

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Close
import androidx.compose.material.icons.filled.Error
import androidx.compose.material.icons.filled.HourglassEmpty
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.outlined.OpenInBrowser
import androidx.compose.material.icons.outlined.PlayArrow
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.local.DiscoveredFeatureEntity
import com.example.data.model.AiImplementationPlan
import com.example.data.model.FeatureClassification
import com.example.data.model.StageState
import com.example.data.model.StageStatus
import com.example.ui.theme.ClassificationNeedsConfig
import com.example.ui.theme.ClassificationUnavailable
import com.example.ui.theme.ClassificationWebView
import com.example.ui.theme.CyanNeon
import com.example.ui.theme.EmeraldAccent

@Composable
fun ClassificationBadge(
  classification: String,
  modifier: Modifier = Modifier
) {
  val classificationEnum = FeatureClassification.fromString(classification)
  val (color, bgColor, label) = when (classificationEnum) {
    FeatureClassification.NATIVE_READY -> Triple(EmeraldAccent, EmeraldAccent.copy(alpha = 0.15f), "NATIVE READY")
    FeatureClassification.WEBVIEW_FALLBACK -> Triple(ClassificationWebView, ClassificationWebView.copy(alpha = 0.15f), "WEBVIEW")
    FeatureClassification.NEEDS_CONFIGURATION -> Triple(ClassificationNeedsConfig, ClassificationNeedsConfig.copy(alpha = 0.15f), "NEEDS CONFIG")
    FeatureClassification.UNAVAILABLE -> Triple(ClassificationUnavailable, ClassificationUnavailable.copy(alpha = 0.15f), "UNAVAILABLE")
  }

  Box(
    modifier = modifier
      .clip(RoundedCornerShape(6.dp))
      .background(bgColor)
      .border(1.dp, color.copy(alpha = 0.4f), RoundedCornerShape(6.dp))
      .padding(horizontal = 8.dp, vertical = 3.dp)
  ) {
    Text(
      text = label,
      color = color,
      fontSize = 11.sp,
      fontWeight = FontWeight.Bold,
      letterSpacing = 0.5.sp
    )
  }
}

@Composable
fun HttpMethodBadge(
  method: String,
  modifier: Modifier = Modifier
) {
  val color = when (method.uppercase()) {
    "GET" -> EmeraldAccent
    "POST" -> CyanNeon
    "PUT" -> Color(0xFFF59E0B)
    "DELETE" -> Color(0xFFEF4444)
    else -> MaterialTheme.colorScheme.primary
  }

  Box(
    modifier = modifier
      .clip(RoundedCornerShape(4.dp))
      .background(color.copy(alpha = 0.18f))
      .padding(horizontal = 6.dp, vertical = 2.dp)
  ) {
    Text(
      text = method.uppercase(),
      color = color,
      fontSize = 11.sp,
      fontFamily = FontFamily.Monospace,
      fontWeight = FontWeight.Bold
    )
  }
}

@Composable
fun FeatureCard(
  feature: DiscoveredFeatureEntity,
  onExecute: () -> Unit,
  onInspect: (() -> Unit)? = null,
  modifier: Modifier = Modifier
) {
  val classificationEnum = FeatureClassification.fromString(feature.classification)

  Card(
    modifier = modifier
      .fillMaxWidth()
      .testTag("feature_card_${feature.id}"),
    shape = RoundedCornerShape(12.dp),
    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.6f)),
    border = androidx.compose.foundation.BorderStroke(
      width = 1.dp,
      color = if (feature.isDestructive) Color(0xFFEF4444).copy(alpha = 0.4f) else MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)
    )
  ) {
    Column(modifier = Modifier.padding(14.dp)) {
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
          HttpMethodBadge(method = feature.httpMethod)
          Spacer(modifier = Modifier.width(8.dp))
          Text(
            text = feature.path,
            color = MaterialTheme.colorScheme.onSurface,
            fontFamily = FontFamily.Monospace,
            fontSize = 13.sp,
            fontWeight = FontWeight.Medium,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f, fill = false)
          )
        }
        ClassificationBadge(classification = feature.classification)
      }

      Spacer(modifier = Modifier.height(8.dp))

      Text(
        text = feature.summary,
        color = MaterialTheme.colorScheme.onSurface,
        fontSize = 14.sp,
        fontWeight = FontWeight.SemiBold
      )

      if (feature.description.isNotBlank()) {
        Spacer(modifier = Modifier.height(4.dp))
        Text(
          text = feature.description,
          color = MaterialTheme.colorScheme.onSurfaceVariant,
          fontSize = 12.sp,
          maxLines = 2,
          overflow = TextOverflow.Ellipsis
        )
      }

      if (feature.recommendationReason.isNotBlank()) {
        Spacer(modifier = Modifier.height(6.dp))
        Text(
          text = "AI Reason: ${feature.recommendationReason}",
          color = CyanNeon.copy(alpha = 0.9f),
          fontSize = 11.sp,
          lineHeight = 15.sp
        )
      }

      Spacer(modifier = Modifier.height(10.dp))

      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        if (feature.isDestructive) {
          Row(verticalAlignment = Alignment.CenterVertically) {
            Icon(
              imageVector = Icons.Default.Warning,
              contentDescription = "Destructive",
              tint = Color(0xFFEF4444),
              modifier = Modifier.size(16.dp)
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(
              text = "Approval Required",
              color = Color(0xFFEF4444),
              fontSize = 11.sp,
              fontWeight = FontWeight.Bold
            )
          }
        } else {
          Text(
            text = "Confidence ${(feature.confidenceScore * 100).toInt()}%",
            color = MaterialTheme.colorScheme.onSurfaceVariant,
            fontSize = 11.sp
          )
        }

        Row(verticalAlignment = Alignment.CenterVertically) {
          if (onInspect != null) {
            OutlinedButton(
              onClick = onInspect,
              shape = RoundedCornerShape(8.dp),
              modifier = Modifier
                .padding(end = 8.dp)
                .testTag("inspect_feature_button_${feature.id}")
            ) {
              Icon(imageVector = Icons.Outlined.Info, contentDescription = null, modifier = Modifier.size(14.dp))
              Spacer(modifier = Modifier.width(4.dp))
              Text("Inspect", fontSize = 11.sp)
            }
          }

          val buttonLabel = when (classificationEnum) {
            FeatureClassification.NATIVE_READY -> "Run Action"
            FeatureClassification.WEBVIEW_FALLBACK -> "Open WebView"
            FeatureClassification.NEEDS_CONFIGURATION -> "Configure"
            FeatureClassification.UNAVAILABLE -> "Unavailable"
          }

          val isEnabled = classificationEnum != FeatureClassification.UNAVAILABLE

          Button(
            onClick = onExecute,
            enabled = isEnabled,
            shape = RoundedCornerShape(8.dp),
            colors = ButtonDefaults.buttonColors(
              containerColor = if (feature.isDestructive) Color(0xFFEF4444) else MaterialTheme.colorScheme.primary,
              contentColor = Color.White
            ),
            modifier = Modifier.testTag("action_button_${feature.id}")
          ) {
            Icon(
              imageVector = if (classificationEnum == FeatureClassification.WEBVIEW_FALLBACK) Icons.Outlined.OpenInBrowser else Icons.Outlined.PlayArrow,
              contentDescription = null,
              modifier = Modifier.size(14.dp)
            )
            Spacer(modifier = Modifier.width(4.dp))
            Text(text = buttonLabel, fontSize = 12.sp, fontWeight = FontWeight.SemiBold)
          }
        }
      }
    }
  }
}

@Composable
fun FeatureDetailInspectorDialog(
  feature: DiscoveredFeatureEntity,
  plan: AiImplementationPlan?,
  onExecute: () -> Unit,
  onDismiss: () -> Unit
) {
  val scrollState = rememberScrollState()

  AlertDialog(
    onDismissRequest = onDismiss,
    title = {
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Column(modifier = Modifier.weight(1f)) {
          Text(
            text = "Feature Inspector",
            fontWeight = FontWeight.Bold,
            fontSize = 17.sp,
            color = MaterialTheme.colorScheme.onSurface
          )
          Text(
            text = "Verified Discovery Record & AI Implementation Plan",
            fontSize = 11.sp,
            color = MaterialTheme.colorScheme.onSurfaceVariant
          )
        }
        IconButton(onClick = onDismiss) {
          Icon(imageVector = Icons.Default.Close, contentDescription = "Close")
        }
      }
    },
    text = {
      Column(
        modifier = Modifier
          .fillMaxWidth()
          .verticalScroll(scrollState)
      ) {
        // Structured Discovery Record (Requirement 6)
        Text(
          text = "DISCOVERED RESOURCE RECORD",
          fontSize = 11.sp,
          fontWeight = FontWeight.Bold,
          color = CyanNeon,
          letterSpacing = 0.5.sp
        )
        Spacer(modifier = Modifier.height(6.dp))
        Surface(
          shape = RoundedCornerShape(8.dp),
          color = MaterialTheme.colorScheme.surfaceVariant,
          modifier = Modifier.fillMaxWidth()
        ) {
          Column(modifier = Modifier.padding(12.dp)) {
            InspectorRow("Feature ID", feature.id)
            InspectorRow("Name", feature.summary)
            InspectorRow("Description", feature.description.ifBlank { "None documented" })
            InspectorRow("Hub ID", feature.hubId)
            InspectorRow("Route", feature.path)
            InspectorRow("API Operations", feature.apiOperationsJson.ifBlank { "${feature.httpMethod} ${feature.path}" })
            InspectorRow("Permissions", feature.permissionsJson.ifBlank { "Public / Standard Session" })
            InspectorRow("Assets", feature.assetsJson.ifBlank { "None referenced" })
            InspectorRow("Discovery Source", feature.discoverySource)
            InspectorRow("Last Verified", feature.lastVerified.ifBlank { "Recently verified" })
          }
        }

        Spacer(modifier = Modifier.height(16.dp))

        // AI Implementation Plan (Requirement 7)
        Text(
          text = "AI ANALYSIS & IMPLEMENTATION PLAN",
          fontSize = 11.sp,
          fontWeight = FontWeight.Bold,
          color = EmeraldAccent,
          letterSpacing = 0.5.sp
        )
        Spacer(modifier = Modifier.height(6.dp))
        Surface(
          shape = RoundedCornerShape(8.dp),
          color = EmeraldAccent.copy(alpha = 0.08f),
          border = androidx.compose.foundation.BorderStroke(1.dp, EmeraldAccent.copy(alpha = 0.3f)),
          modifier = Modifier.fillMaxWidth()
        ) {
          Column(modifier = Modifier.padding(12.dp)) {
            Row(
              modifier = Modifier.fillMaxWidth(),
              horizontalArrangement = Arrangement.SpaceBetween,
              verticalAlignment = Alignment.CenterVertically
            ) {
              Text(
                text = "Strategy: ${plan?.recommendedStrategy?.label ?: feature.classification}",
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                color = EmeraldAccent
              )
              Text(
                text = "Feasibility: ${plan?.nativeFeasibilityScore ?: 90}%",
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp,
                color = CyanNeon
              )
            }
            Spacer(modifier = Modifier.height(6.dp))
            Text(
              text = plan?.rationale ?: "Direct native reproduction with verified REST schema.",
              fontSize = 12.sp,
              color = MaterialTheme.colorScheme.onSurface,
              lineHeight = 16.sp
            )

            plan?.actionSteps?.let { steps ->
              if (steps.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(text = "Action Steps:", fontSize = 11.sp, fontWeight = FontWeight.Bold)
                steps.forEach { step ->
                  Row(modifier = Modifier.padding(vertical = 2.dp), verticalAlignment = Alignment.Top) {
                    Icon(imageVector = Icons.Default.Check, contentDescription = null, tint = EmeraldAccent, modifier = Modifier.size(14.dp).padding(top = 2.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(text = step, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                  }
                }
              }
            }
          }
        }
      }
    },
    confirmButton = {
      Button(
        onClick = {
          onDismiss()
          onExecute()
        },
        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
      ) {
        Text("Trigger Feature")
      }
    },
    dismissButton = {
      OutlinedButton(onClick = onDismiss) {
        Text("Done")
      }
    }
  )
}

@Composable
private fun InspectorRow(label: String, value: String) {
  Row(
    modifier = Modifier
      .fillMaxWidth()
      .padding(vertical = 3.dp),
    horizontalArrangement = Arrangement.SpaceBetween
  ) {
    Text(text = label, fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
    Text(
      text = value,
      fontSize = 11.sp,
      fontFamily = FontFamily.Monospace,
      fontWeight = FontWeight.Medium,
      color = MaterialTheme.colorScheme.onSurface,
      maxLines = 1,
      overflow = TextOverflow.Ellipsis,
      modifier = Modifier.padding(start = 8.dp)
    )
  }
}

@Composable
fun StageProgressCard(
  stageState: StageState,
  modifier: Modifier = Modifier
) {
  val (statusIcon, iconTint) = when (stageState.status) {
    StageStatus.COMPLETED -> Pair(Icons.Default.CheckCircle, EmeraldAccent)
    StageStatus.WARNING -> Pair(Icons.Default.Warning, Color(0xFFF59E0B))
    StageStatus.FAILED -> Pair(Icons.Default.Error, Color(0xFFEF4444))
    StageStatus.IN_PROGRESS -> Pair(null, CyanNeon)
    StageStatus.PENDING -> Pair(Icons.Default.HourglassEmpty, MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.4f))
    StageStatus.SKIPPED -> Pair(Icons.Outlined.CheckCircle, MaterialTheme.colorScheme.onSurfaceVariant)
  }

  val transition = rememberInfiniteTransition(label = "pulse")
  val pulseAlpha by transition.animateFloat(
    initialValue = 0.4f,
    targetValue = 1f,
    animationSpec = infiniteRepeatable(tween(700), RepeatMode.Reverse),
    label = "pulseAlpha"
  )

  Card(
    modifier = modifier.fillMaxWidth(),
    shape = RoundedCornerShape(10.dp),
    colors = CardDefaults.cardColors(
      containerColor = if (stageState.status == StageStatus.IN_PROGRESS)
        MaterialTheme.colorScheme.primaryContainer.copy(alpha = 0.25f)
      else
        MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)
    ),
    border = androidx.compose.foundation.BorderStroke(
      width = 1.dp,
      color = if (stageState.status == StageStatus.IN_PROGRESS) CyanNeon.copy(alpha = 0.5f) else MaterialTheme.colorScheme.outline.copy(alpha = 0.15f)
    )
  ) {
    Row(
      modifier = Modifier
        .fillMaxWidth()
        .padding(12.dp),
      verticalAlignment = Alignment.CenterVertically
    ) {
      Box(
        modifier = Modifier.size(28.dp),
        contentAlignment = Alignment.Center
      ) {
        if (stageState.status == StageStatus.IN_PROGRESS) {
          CircularProgressIndicator(
            modifier = Modifier.size(22.dp),
            strokeWidth = 2.5.dp,
            color = CyanNeon
          )
        } else if (statusIcon != null) {
          Icon(
            imageVector = statusIcon,
            contentDescription = stageState.status.name,
            tint = iconTint,
            modifier = Modifier.size(22.dp)
          )
        }
      }

      Spacer(modifier = Modifier.width(12.dp))

      Column(modifier = Modifier.weight(1f)) {
        Row(
          modifier = Modifier.fillMaxWidth(),
          horizontalArrangement = Arrangement.SpaceBetween,
          verticalAlignment = Alignment.CenterVertically
        ) {
          Text(
            text = "${stageState.stage.stepNumber}. ${stageState.stage.title}",
            color = if (stageState.status == StageStatus.IN_PROGRESS) CyanNeon else MaterialTheme.colorScheme.onSurface,
            fontWeight = FontWeight.SemiBold,
            fontSize = 13.sp
          )
          if (stageState.latencyMs > 0) {
            Text(
              text = "${stageState.latencyMs}ms",
              color = MaterialTheme.colorScheme.onSurfaceVariant,
              fontSize = 11.sp,
              fontFamily = FontFamily.Monospace
            )
          }
        }

        Text(
          text = if (stageState.details.isNotBlank()) stageState.details else stageState.stage.description,
          color = MaterialTheme.colorScheme.onSurfaceVariant,
          fontSize = 11.sp,
          maxLines = 2,
          overflow = TextOverflow.Ellipsis,
          modifier = Modifier.alpha(if (stageState.status == StageStatus.IN_PROGRESS) pulseAlpha else 1f)
        )
      }
    }
  }
}

@Composable
fun DestructiveActionApprovalDialog(
  feature: DiscoveredFeatureEntity,
  onConfirm: () -> Unit,
  onDismiss: () -> Unit
) {
  AlertDialog(
    onDismissRequest = onDismiss,
    icon = {
      Icon(
        imageVector = Icons.Default.Warning,
        contentDescription = "Warning",
        tint = Color(0xFFEF4444),
        modifier = Modifier.size(36.dp)
      )
    },
    title = {
      Text(
        text = "Security Approval Required",
        fontWeight = FontWeight.Bold,
        fontSize = 18.sp,
        color = Color(0xFFEF4444)
      )
    },
    text = {
      Column {
        Text(
          text = "The AI agent detected that this action performs a sensitive or irreversible operation on the website:",
          fontSize = 13.sp,
          color = MaterialTheme.colorScheme.onSurface
        )
        Spacer(modifier = Modifier.height(10.dp))
        Surface(
          shape = RoundedCornerShape(8.dp),
          color = MaterialTheme.colorScheme.surfaceVariant,
          modifier = Modifier.fillMaxWidth()
        ) {
          Column(modifier = Modifier.padding(10.dp)) {
            Text(
              text = feature.summary,
              fontWeight = FontWeight.Bold,
              fontSize = 14.sp
            )
            Text(
              text = "${feature.httpMethod} ${feature.path}",
              fontFamily = FontFamily.Monospace,
              fontSize = 12.sp,
              color = CyanNeon
            )
          }
        }
        Spacer(modifier = Modifier.height(10.dp))
        Text(
          text = "Do you grant explicit authorization to execute this action?",
          fontSize = 12.sp,
          fontWeight = FontWeight.Medium,
          color = MaterialTheme.colorScheme.onSurfaceVariant
        )
      }
    },
    confirmButton = {
      Button(
        onClick = onConfirm,
        colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444)),
        modifier = Modifier.testTag("confirm_destructive_button")
      ) {
        Text("Authorize & Run", color = Color.White, fontWeight = FontWeight.Bold)
      }
    },
    dismissButton = {
      OutlinedButton(
        onClick = onDismiss,
        modifier = Modifier.testTag("cancel_destructive_button")
      ) {
        Text("Cancel")
      }
    }
  )
}
