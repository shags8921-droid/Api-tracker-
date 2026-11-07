package com.example.data.model

data class IntegrationManifest(
  val version: String = "1.0.0",
  val websiteUrl: String,
  val websiteName: String = "",
  val generatedAt: Long = System.currentTimeMillis(),
  val hubs: List<DiscoveredHub> = emptyList(),
  val features: List<DiscoveredFeatureRecord> = emptyList(),
  val endpoints: List<EndpointDefinition> = emptyList(),
  val pages: List<DiscoveredPage> = emptyList(),
  val workflows: List<DiscoveredWorkflow> = emptyList(),
  val permissions: List<DiscoveredPermission> = emptyList(),
  val assets: List<DiscoveredAsset> = emptyList(),
  val capabilities: List<String> = emptyList(),
  val securityScheme: String = "Bearer",
  val healthStatus: String = "UP",
  val openApiSpecAvailable: Boolean = false,
  val requiresApprovalForDestructive: Boolean = true,
  val warnings: List<DiscoveryWarning> = emptyList()
)

data class DiscoveredHub(
  val hubId: String,
  val name: String,
  val description: String,
  val accessiblePages: List<String> = emptyList(),
  val availableFeatures: List<String> = emptyList(),
  val requiredPermissions: List<String> = emptyList(),
  val supportedOperations: List<String> = emptyList(),
  val associatedWorkflows: List<String> = emptyList(),
  val isAuthorizedForUser: Boolean = true,
  val type: HubType = HubType.GENERAL
)

data class DiscoveredFeatureRecord(
  val featureId: String,
  val name: String,
  val description: String,
  val hubId: String,
  val route: String,
  val apiOperations: List<String> = emptyList(),
  val permissions: List<String> = emptyList(),
  val assets: List<String> = emptyList(),
  val integrationStatus: FeatureClassification = FeatureClassification.NEEDS_CONFIGURATION,
  val discoverySource: String = "INTEGRATION_API",
  val lastVerified: String = ""
)

data class DiscoveredPage(
  val id: String,
  val path: String,
  val title: String,
  val isProtected: Boolean = false,
  val source: String = "INTEGRATION_API",
  val httpStatus: Int = 200
)

data class DiscoveredWorkflow(
  val id: String,
  val name: String,
  val description: String,
  val steps: List<String> = emptyList(),
  val requiredPermissions: List<String> = emptyList()
)

data class DiscoveredPermission(
  val key: String,
  val description: String,
  val isGrantedToUser: Boolean = true
)

data class DiscoveredAsset(
  val id: String,
  val url: String,
  val type: String, // e.g. "LOGO", "FAVICON", "MEDIA", "STYLE"
  val isAuthorized: Boolean = true
)

data class DiscoveryWarning(
  val id: String = java.util.UUID.randomUUID().toString(),
  val endpoint: String,
  val message: String,
  val severity: String = "WARNING", // "WARNING", "INFO", "CRITICAL"
  val timestamp: Long = System.currentTimeMillis()
)

data class EndpointDefinition(
  val id: String,
  val path: String,
  val httpMethod: String,
  val summary: String,
  val description: String = "",
  val hubId: String,
  val classification: FeatureClassification = FeatureClassification.NATIVE_READY,
  val recommendedMode: String = "NATIVE_READY",
  val confidenceScore: Float = 0.85f,
  val requiresAuth: Boolean = true,
  val isDestructive: Boolean = false,
  val parameters: List<EndpointParameter> = emptyList(),
  val responseType: String = "application/json",
  val status: String = "VERIFIED",
  val recommendationReason: String = ""
)

data class EndpointParameter(
  val name: String,
  val type: String,
  val required: Boolean,
  val description: String = ""
)

data class AiImplementationPlan(
  val featureId: String,
  val recommendedStrategy: FeatureClassification,
  val nativeFeasibilityScore: Int, // 0 - 100
  val rationale: String,
  val missingPrerequisites: List<String> = emptyList(),
  val actionSteps: List<String> = emptyList(),
  val webViewFallbackUrl: String? = null
)
