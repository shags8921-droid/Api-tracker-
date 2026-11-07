package com.example.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "website_configs")
data class WebsiteConfigEntity(
  @PrimaryKey val id: String,
  val url: String,
  val name: String,
  val manifestVersion: String,
  val lastSyncTime: Long,
  val status: String,
  val autoSyncEnabled: Boolean = true,
  val syncIntervalMinutes: Int = 30,
  val authType: String = "BEARER_TOKEN",
  val securityLevel: String = "TLS_VERIFIED",
  val openApiUrl: String = "",
  val isConnected: Boolean = true,
  val isCurrentActive: Boolean = true,
  val authMetadataJson: String = ""
)

@Entity(tableName = "discovered_hubs")
data class DiscoveredHubEntity(
  @PrimaryKey val id: String,
  val websiteId: String,
  val type: String,
  val title: String,
  val description: String,
  val iconName: String,
  val orderIndex: Int,
  val permissionsJson: String,
  val accessiblePagesJson: String = "",
  val workflowsJson: String = "",
  val supportedOperationsJson: String = "",
  val isAuthorizedForUser: Boolean = true
)

@Entity(tableName = "discovered_features")
data class DiscoveredFeatureEntity(
  @PrimaryKey val id: String, // featureId
  val websiteId: String,
  val hubId: String,
  val path: String,
  val httpMethod: String,
  val summary: String,
  val description: String,
  val route: String = "",
  val classification: String,
  val recommendedMode: String,
  val confidenceScore: Float,
  val requiresAuth: Boolean,
  val isDestructive: Boolean,
  val parametersJson: String,
  val apiOperationsJson: String = "",
  val permissionsJson: String = "",
  val assetsJson: String = "",
  val discoverySource: String = "INTEGRATION_API",
  val lastVerified: String = "",
  val recommendationReason: String = ""
)

@Entity(tableName = "discovered_pages")
data class DiscoveredPageEntity(
  @PrimaryKey val id: String,
  val websiteId: String,
  val path: String,
  val title: String,
  val isProtected: Boolean = false,
  val source: String = "INTEGRATION_API",
  val httpStatus: Int = 200
)

@Entity(tableName = "discovered_workflows")
data class DiscoveredWorkflowEntity(
  @PrimaryKey val id: String,
  val websiteId: String,
  val name: String,
  val description: String,
  val stepsJson: String,
  val requiredPermissionsJson: String
)

@Entity(tableName = "discovered_assets")
data class DiscoveredAssetEntity(
  @PrimaryKey val id: String,
  val websiteId: String,
  val url: String,
  val type: String,
  val isAuthorized: Boolean = true
)

@Entity(tableName = "discovery_warnings")
data class DiscoveryWarningEntity(
  @PrimaryKey val id: String,
  val websiteId: String,
  val endpoint: String,
  val message: String,
  val severity: String = "WARNING",
  val timestamp: Long = System.currentTimeMillis()
)

@Entity(tableName = "sync_history")
data class SyncHistoryEntity(
  @PrimaryKey val id: String,
  val websiteId: String,
  val timestamp: Long,
  val durationMs: Long,
  val status: String,
  val stagesSucceeded: Int,
  val message: String,
  val manifestVersion: String,
  val nativeCount: Int,
  val webViewCount: Int,
  val needsConfigCount: Int
)

@Entity(tableName = "diagnostic_logs")
data class DiagnosticLogEntity(
  @PrimaryKey val id: String,
  val websiteId: String,
  val timestamp: Long,
  val endpointPath: String,
  val method: String,
  val statusCode: Int,
  val latencyMs: Long,
  val isSuccessful: Boolean,
  val message: String,
  val headersJson: String
)
