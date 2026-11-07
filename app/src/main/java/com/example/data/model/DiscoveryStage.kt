package com.example.data.model

enum class DiscoveryStage(
  val stepNumber: Int,
  val title: String,
  val description: String,
  val targetEndpoint: String?
) {
  CHECK_HEALTH(
    stepNumber = 1,
    title = "Check Integration Health",
    description = "Pinging API gateway & health monitor",
    targetEndpoint = "/api/v1/integration/health"
  ),
  RETRIEVE_MANIFEST(
    stepNumber = 2,
    title = "Retrieve Integration Manifest",
    description = "Querying published integration manifest and version info",
    targetEndpoint = "/api/v1/integration/manifest"
  ),
  RETRIEVE_OPENAPI(
    stepNumber = 3,
    title = "Retrieve OpenAPI Documentation",
    description = "Reading OpenAPI 3.0 / Swagger schema specifications",
    targetEndpoint = "/api/v1/openapi.json"
  ),
  RETRIEVE_HUBS(
    stepNumber = 4,
    title = "Retrieve Available Hubs",
    description = "Discovering Owner Hub, Manager Hub & capability registry",
    targetEndpoint = "/api/v1/integration/capabilities"
  ),
  RETRIEVE_FEATURE_REGISTRY(
    stepNumber = 5,
    title = "Retrieve Feature Registry",
    description = "Enumerating registered features and functional units",
    targetEndpoint = "/api/v1/integration/features"
  ),
  RETRIEVE_PAGES_AND_ROUTES(
    stepNumber = 6,
    title = "Retrieve Pages & Routes",
    description = "Discovering routes with public sitemap.xml fallback",
    targetEndpoint = "/api/v1/integration/pages"
  ),
  RETRIEVE_COMPONENTS(
    stepNumber = 7,
    title = "Retrieve Component Metadata",
    description = "Inspecting UI components and form specifications",
    targetEndpoint = "/api/v1/integration/components"
  ),
  RETRIEVE_WORKFLOWS(
    stepNumber = 8,
    title = "Retrieve Workflows",
    description = "Reading business logic procedures and operational sequences",
    targetEndpoint = "/api/v1/integration/workflows"
  ),
  RETRIEVE_PERMISSIONS(
    stepNumber = 9,
    title = "Retrieve Permission Mappings",
    description = "Checking RBAC user authorizations & role scopes",
    targetEndpoint = "/api/v1/integration/permissions"
  ),
  RETRIEVE_ASSETS(
    stepNumber = 10,
    title = "Retrieve Asset References",
    description = "Locating authorized brand logos, icons, styles & CDN media",
    targetEndpoint = "/api/v1/integration/assets"
  ),
  COMPARE_MANIFEST(
    stepNumber = 11,
    title = "Compare Manifest & Verify",
    description = "Diffing against previously stored manifests and calculating completeness",
    targetEndpoint = null
  )
}

enum class StageStatus {
  PENDING,
  IN_PROGRESS,
  COMPLETED,
  WARNING,
  FAILED,
  SKIPPED
}

data class StageState(
  val stage: DiscoveryStage,
  val status: StageStatus = StageStatus.PENDING,
  val details: String = "",
  val latencyMs: Long = 0L,
  val timestamp: Long = System.currentTimeMillis(),
  val httpStatus: Int? = null,
  val discoveryStatus: ResourceDiscoveryStatus = ResourceDiscoveryStatus.NOT_DOCUMENTED
)
