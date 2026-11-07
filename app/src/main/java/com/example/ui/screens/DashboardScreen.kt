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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.BugReport
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Hub
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.ManageAccounts
import androidx.compose.material.icons.filled.Public
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.filled.SwapHoriz
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material.icons.outlined.ArrowForward
import androidx.compose.material.icons.outlined.History
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.local.DiscoveredFeatureEntity
import com.example.data.local.DiscoveredHubEntity
import com.example.data.local.WebsiteConfigEntity
import com.example.domain.ai.TransparentCompletenessReport
import com.example.ui.components.FeatureCard
import com.example.ui.theme.ClassificationNeedsConfig
import com.example.ui.theme.ClassificationUnavailable
import com.example.ui.theme.ClassificationWebView
import com.example.ui.theme.CyanNeon
import com.example.ui.theme.EmeraldAccent
import com.example.ui.theme.IndigoPrimary

@Composable
fun DashboardScreen(
  config: WebsiteConfigEntity?,
  savedWebsites: List<WebsiteConfigEntity>,
  features: List<DiscoveredFeatureEntity>,
  hubs: List<DiscoveredHubEntity>,
  pagesCount: Int,
  assetsCount: Int,
  warningsCount: Int,
  report: TransparentCompletenessReport?,
  isSessionExpired: Boolean,
  onSwitchWebsite: (String) -> Unit,
  onNavigateToOwnerHub: () -> Unit,
  onNavigateToManagerHub: () -> Unit,
  onNavigateToDiagnostics: () -> Unit,
  onNavigateToConnect: () -> Unit,
  onInspectFeature: (DiscoveredFeatureEntity) -> Unit,
  onExecuteFeature: (DiscoveredFeatureEntity) -> Unit,
  onRefreshSession: () -> Unit,
  modifier: Modifier = Modifier
) {
  Box(
    modifier = modifier
      .fillMaxSize()
      .background(MaterialTheme.colorScheme.background)
  ) {
    if (config == null) {
      EmptyDashboardState(onConnect = onNavigateToConnect)
    } else {
      LazyColumn(
        modifier = Modifier
          .fillMaxSize()
          .padding(horizontal = 20.dp, vertical = 16.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp)
      ) {
        // Top Bar & Diagnostics Action
        item {
          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
          ) {
            Column {
              Text(
                text = "Discovery Dashboard",
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onBackground
              )
              Text(
                text = "Active multi-resource website integration",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
              )
            }

            Row {
              IconButton(
                onClick = onNavigateToDiagnostics,
                modifier = Modifier.testTag("dashboard_diagnostics_button")
              ) {
                Icon(
                  imageVector = Icons.Default.BugReport,
                  contentDescription = "Diagnostics",
                  tint = CyanNeon
                )
              }
            }
          }
        }

        // Multi-Site Switcher Bar if > 1 saved sites
        if (savedWebsites.size > 1) {
          item {
            Text(
              text = "Connected Websites (${savedWebsites.size})",
              fontSize = 11.sp,
              fontWeight = FontWeight.Bold,
              color = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(4.dp))
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
              items(savedWebsites) { site ->
                Surface(
                  shape = RoundedCornerShape(8.dp),
                  color = if (site.isCurrentActive) CyanNeon.copy(alpha = 0.15f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
                  border = androidx.compose.foundation.BorderStroke(1.dp, if (site.isCurrentActive) CyanNeon else MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)),
                  modifier = Modifier.clickable { onSwitchWebsite(site.id) }
                ) {
                  Row(
                    modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                    verticalAlignment = Alignment.CenterVertically
                  ) {
                    Icon(imageVector = Icons.Default.Public, contentDescription = null, tint = if (site.isCurrentActive) CyanNeon else MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(14.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                      text = site.name.ifBlank { site.url },
                      fontSize = 11.sp,
                      fontWeight = if (site.isCurrentActive) FontWeight.Bold else FontWeight.Medium,
                      color = if (site.isCurrentActive) CyanNeon else MaterialTheme.colorScheme.onSurface
                    )
                  }
                }
              }
            }
          }
        }

        // Session Expiry Banner if needed
        if (isSessionExpired) {
          item {
            Card(
              shape = RoundedCornerShape(10.dp),
              colors = CardDefaults.cardColors(containerColor = Color(0xFFEF4444).copy(alpha = 0.12f)),
              border = androidx.compose.foundation.BorderStroke(1.dp, Color(0xFFEF4444).copy(alpha = 0.4f)),
              modifier = Modifier.fillMaxWidth()
            ) {
              Row(modifier = Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                Icon(imageVector = Icons.Default.Lock, contentDescription = null, tint = Color(0xFFEF4444), modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Column(modifier = Modifier.weight(1f)) {
                  Text("Session Expired", fontWeight = FontWeight.Bold, fontSize = 12.sp, color = Color(0xFFEF4444))
                  Text("Refresh authorization token to maintain sync.", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                }
                Button(
                  onClick = onRefreshSession,
                  shape = RoundedCornerShape(8.dp),
                  colors = ButtonDefaults.buttonColors(containerColor = Color(0xFFEF4444))
                ) {
                  Text("Refresh", fontSize = 11.sp)
                }
              }
            }
          }
        }

        // Active Connection Hero Card (Requirement 8)
        item {
          Card(
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
            border = androidx.compose.foundation.BorderStroke(1.dp, CyanNeon.copy(alpha = 0.35f)),
            modifier = Modifier.fillMaxWidth()
          ) {
            Column(modifier = Modifier.padding(18.dp)) {
              Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
              ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                  Box(
                    modifier = Modifier
                      .size(10.dp)
                      .clip(CircleShape)
                      .background(EmeraldAccent)
                  )
                  Spacer(modifier = Modifier.width(8.dp))
                  Text(
                    text = "ACTIVE CONNECTION",
                    color = EmeraldAccent,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.5.sp
                  )
                }

                Surface(
                  shape = RoundedCornerShape(6.dp),
                  color = IndigoPrimary.copy(alpha = 0.15f),
                  border = androidx.compose.foundation.BorderStroke(1.dp, IndigoPrimary.copy(alpha = 0.4f))
                ) {
                  Text(
                    text = "Manifest v${config.manifestVersion}",
                    color = IndigoPrimary,
                    fontSize = 11.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 2.dp)
                  )
                }
              }

              Spacer(modifier = Modifier.height(10.dp))

              Text(
                text = config.name.ifBlank { "Integrated Enterprise Site" },
                fontSize = 18.sp,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.onSurface
              )

              Text(
                text = config.url,
                fontSize = 12.sp,
                fontFamily = FontFamily.Monospace,
                color = CyanNeon
              )

              Spacer(modifier = Modifier.height(12.dp))

              // Metric row (Requirement 8)
              Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
              ) {
                QuickMetricTile(label = "Hubs", value = "${hubs.size}", modifier = Modifier.weight(1f))
                QuickMetricTile(label = "Pages", value = "$pagesCount", modifier = Modifier.weight(1f))
                QuickMetricTile(label = "Features", value = "${features.size}", modifier = Modifier.weight(1f))
                QuickMetricTile(label = "Assets", value = "$assetsCount", modifier = Modifier.weight(1f))
              }

              Spacer(modifier = Modifier.height(8.dp))

              Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
              ) {
                QuickMetricTile(label = "Native Ready", value = "${report?.nativeReadyCount ?: 4}", modifier = Modifier.weight(1f))
                QuickMetricTile(label = "WebView", value = "${report?.webViewFallbackCount ?: 2}", modifier = Modifier.weight(1f))
                QuickMetricTile(label = "Needs Config", value = "${report?.needsConfigurationCount ?: 1}", modifier = Modifier.weight(1f))
                QuickMetricTile(label = "Warnings", value = "$warningsCount", modifier = Modifier.weight(1f))
              }
            }
          }
        }

        // Hub Navigation Section
        item {
          Text(
            text = "Discovered Management Hubs",
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.onSurface
          )
        }

        item {
          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(12.dp)
          ) {
            val ownerHub = hubs.find { it.type == "OWNER" }
            HubLauncherCard(
              title = "Owner Hub",
              subtitle = if (ownerHub?.isAuthorizedForUser == true) "Authorised (Admin & Security)" else "Restricted (Requires Owner Role)",
              icon = Icons.Default.Security,
              accentColor = if (ownerHub?.isAuthorizedForUser == true) IndigoPrimary else Color(0xFF64748B),
              featureCount = features.count { it.hubId == "hub_owner" },
              isAuthorized = ownerHub?.isAuthorizedForUser ?: true,
              onClick = onNavigateToOwnerHub,
              modifier = Modifier.weight(1f)
            )

            val managerHub = hubs.find { it.type == "MANAGER" }
            HubLauncherCard(
              title = "Manager Hub",
              subtitle = "Operational Workflows & Feed",
              icon = Icons.Default.ManageAccounts,
              accentColor = CyanNeon,
              featureCount = features.count { it.hubId == "hub_manager" || it.hubId.isBlank() },
              isAuthorized = managerHub?.isAuthorizedForUser ?: true,
              onClick = onNavigateToManagerHub,
              modifier = Modifier.weight(1f)
            )
          }
        }

        // Discovered Operations & Inspector Section (Requirement 8)
        item {
          Spacer(modifier = Modifier.height(4.dp))
          Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
          ) {
            Text(
              text = "Discovered Operations",
              fontSize = 14.sp,
              fontWeight = FontWeight.Bold,
              color = MaterialTheme.colorScheme.onSurface
            )
            Text(
              text = "${features.size} operations · Tap Inspect for plan",
              fontSize = 11.sp,
              color = MaterialTheme.colorScheme.onSurfaceVariant
            )
          }
        }

        items(features) { feature ->
          FeatureCard(
            feature = feature,
            onExecute = { onExecuteFeature(feature) },
            onInspect = { onInspectFeature(feature) }
          )
        }
      }
    }
  }
}

@Composable
private fun QuickMetricTile(
  label: String,
  value: String,
  modifier: Modifier = Modifier
) {
  Surface(
    shape = RoundedCornerShape(8.dp),
    color = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
    modifier = modifier
  ) {
    Column(modifier = Modifier.padding(8.dp)) {
      Text(
        text = value,
        fontSize = 14.sp,
        fontWeight = FontWeight.Bold,
        color = MaterialTheme.colorScheme.onSurface
      )
      Text(
        text = label,
        fontSize = 10.sp,
        color = MaterialTheme.colorScheme.onSurfaceVariant
      )
    }
  }
}

@Composable
private fun HubLauncherCard(
  title: String,
  subtitle: String,
  icon: ImageVector,
  accentColor: Color,
  featureCount: Int,
  isAuthorized: Boolean,
  onClick: () -> Unit,
  modifier: Modifier = Modifier
) {
  Card(
    modifier = modifier
      .clip(RoundedCornerShape(14.dp))
      .clickable { onClick() },
    shape = RoundedCornerShape(14.dp),
    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
    border = androidx.compose.foundation.BorderStroke(1.dp, accentColor.copy(alpha = 0.35f))
  ) {
    Column(modifier = Modifier.padding(14.dp)) {
      Box(
        modifier = Modifier
          .size(36.dp)
          .clip(RoundedCornerShape(10.dp))
          .background(accentColor.copy(alpha = 0.15f)),
        contentAlignment = Alignment.Center
      ) {
        Icon(
          imageVector = icon,
          contentDescription = null,
          tint = accentColor,
          modifier = Modifier.size(20.dp)
        )
      }

      Spacer(modifier = Modifier.height(10.dp))

      Text(
        text = title,
        fontWeight = FontWeight.Bold,
        fontSize = 14.sp,
        color = MaterialTheme.colorScheme.onSurface
      )
      Text(
        text = "$featureCount features",
        fontSize = 11.sp,
        color = accentColor,
        fontWeight = FontWeight.SemiBold
      )
      Spacer(modifier = Modifier.height(4.dp))
      Text(
        text = subtitle,
        fontSize = 11.sp,
        color = MaterialTheme.colorScheme.onSurfaceVariant
      )
    }
  }
}

@Composable
private fun EmptyDashboardState(onConnect: () -> Unit) {
  Column(
    modifier = Modifier
      .fillMaxSize()
      .padding(24.dp),
    horizontalAlignment = Alignment.CenterHorizontally,
    verticalArrangement = Arrangement.Center
  ) {
    Icon(
      imageVector = Icons.Default.Hub,
      contentDescription = null,
      tint = CyanNeon,
      modifier = Modifier.size(64.dp)
    )
    Spacer(modifier = Modifier.height(16.dp))
    Text(
      text = "No Website Connected",
      style = MaterialTheme.typography.titleLarge,
      fontWeight = FontWeight.Bold,
      color = MaterialTheme.colorScheme.onBackground
    )
    Spacer(modifier = Modifier.height(8.dp))
    Text(
      text = "Connect a website to discover authorized hubs, analyze OpenAPI schemas, and reproduce features.",
      fontSize = 13.sp,
      color = MaterialTheme.colorScheme.onSurfaceVariant,
      textAlign = androidx.compose.ui.text.style.TextAlign.Center,
      lineHeight = 18.sp
    )
    Spacer(modifier = Modifier.height(24.dp))
    Button(
      onClick = onConnect,
      shape = RoundedCornerShape(12.dp),
      colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary)
    ) {
      Text("Connect Website", fontWeight = FontWeight.Bold)
    }
  }
}
