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
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.ListAlt
import androidx.compose.material.icons.filled.ManageAccounts
import androidx.compose.material.icons.outlined.OpenInBrowser
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ScrollableTabRow
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.local.DiscoveredFeatureEntity
import com.example.data.model.FeatureClassification
import com.example.ui.components.FeatureCard
import com.example.ui.theme.CyanNeon

@Composable
fun ManagerHubScreen(
  features: List<DiscoveredFeatureEntity>,
  onExecuteFeature: (DiscoveredFeatureEntity) -> Unit,
  onInspectFeature: ((DiscoveredFeatureEntity) -> Unit)? = null,
  modifier: Modifier = Modifier
) {
  var selectedTab by remember { mutableStateOf(0) }
  val tabs = listOf("All Manager Ops", "Native Endpoints", "WebView Modules")

  val managerFeatures = features.filter { it.hubId == "hub_manager" || it.hubId.isBlank() }
  val filteredFeatures = when (selectedTab) {
    1 -> managerFeatures.filter { FeatureClassification.fromString(it.classification) == FeatureClassification.NATIVE_READY }
    2 -> managerFeatures.filter { FeatureClassification.fromString(it.classification) == FeatureClassification.WEBVIEW_FALLBACK }
    else -> managerFeatures
  }

  Box(
    modifier = modifier
      .fillMaxSize()
      .background(MaterialTheme.colorScheme.background)
  ) {
    LazyColumn(
      modifier = Modifier
        .fillMaxSize()
        .padding(horizontal = 20.dp, vertical = 16.dp),
      verticalArrangement = Arrangement.spacedBy(14.dp)
    ) {
      item {
        Row(
          modifier = Modifier.fillMaxWidth(),
          verticalAlignment = Alignment.CenterVertically
        ) {
          Box(
            modifier = Modifier
              .size(38.dp)
              .background(CyanNeon.copy(alpha = 0.15f), RoundedCornerShape(10.dp)),
            contentAlignment = Alignment.Center
          ) {
            Icon(
              imageVector = Icons.Default.ManageAccounts,
              contentDescription = null,
              tint = CyanNeon,
              modifier = Modifier.size(22.dp)
            )
          }
          Spacer(modifier = Modifier.width(12.dp))
          Column {
            Text(
              text = "Manager Hub",
              style = MaterialTheme.typography.titleLarge,
              fontWeight = FontWeight.Bold,
              color = MaterialTheme.colorScheme.onBackground
            )
            Text(
              text = "Daily operational workflows, orders feed, catalog & media",
              fontSize = 12.sp,
              color = MaterialTheme.colorScheme.onSurfaceVariant
            )
          }
        }
      }

      // Operational Status Card
      item {
        Card(
          shape = RoundedCornerShape(12.dp),
          colors = CardDefaults.cardColors(containerColor = CyanNeon.copy(alpha = 0.08f)),
          border = androidx.compose.foundation.BorderStroke(1.dp, CyanNeon.copy(alpha = 0.25f)),
          modifier = Modifier.fillMaxWidth()
        ) {
          Row(
            modifier = Modifier.padding(14.dp),
            verticalAlignment = Alignment.CenterVertically
          ) {
            Icon(
              imageVector = Icons.Default.AutoAwesome,
              contentDescription = null,
              tint = CyanNeon,
              modifier = Modifier.size(22.dp)
            )
            Spacer(modifier = Modifier.width(10.dp))
            Column {
              Text(
                text = "Autonomous Hybrid Routing Active",
                fontWeight = FontWeight.Bold,
                fontSize = 13.sp,
                color = CyanNeon
              )
              Spacer(modifier = Modifier.height(2.dp))
              Text(
                text = "Structured JSON data renders in native high-speed Jetpack Compose. Heavy interactive canvas modules automatically open via authenticated WebView.",
                fontSize = 11.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                lineHeight = 16.sp
              )
            }
          }
        }
      }

      // Filter Tabs
      item {
        ScrollableTabRow(
          selectedTabIndex = selectedTab,
          edgePadding = 0.dp,
          containerColor = Color.Transparent,
          divider = {}
        ) {
          tabs.forEachIndexed { idx, title ->
            Tab(
              selected = selectedTab == idx,
              onClick = { selectedTab = idx },
              text = {
                Text(
                  text = title,
                  fontWeight = if (selectedTab == idx) FontWeight.Bold else FontWeight.Medium,
                  fontSize = 13.sp,
                  color = if (selectedTab == idx) CyanNeon else MaterialTheme.colorScheme.onSurfaceVariant
                )
              }
            )
          }
        }
      }

      if (filteredFeatures.isEmpty()) {
        item {
          Card(
            shape = RoundedCornerShape(12.dp),
            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.4f)),
            modifier = Modifier.fillMaxWidth()
          ) {
            Column(
              modifier = Modifier
                .fillMaxWidth()
                .padding(24.dp),
              horizontalAlignment = Alignment.CenterHorizontally
            ) {
              Icon(imageVector = Icons.Default.ListAlt, contentDescription = null, tint = MaterialTheme.colorScheme.onSurfaceVariant, modifier = Modifier.size(32.dp))
              Spacer(modifier = Modifier.height(8.dp))
              Text(
                text = "No Manager Operations Found",
                fontWeight = FontWeight.SemiBold,
                fontSize = 14.sp
              )
              Text(
                text = "Perform discovery to discover operations mapped to Manager Hub.",
                fontSize = 12.sp,
                color = MaterialTheme.colorScheme.onSurfaceVariant
              )
            }
          }
        }
      } else {
        items(filteredFeatures) { feature ->
          FeatureCard(
            feature = feature,
            onExecute = { onExecuteFeature(feature) },
            onInspect = onInspectFeature?.let { cb -> { cb(feature) } }
          )
        }
      }
    }
  }
}
