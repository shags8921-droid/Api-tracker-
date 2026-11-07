package com.example

import com.example.data.model.DiscoveredFeatureRecord
import com.example.data.model.DiscoveryStage
import com.example.data.model.EndpointDefinition
import com.example.data.model.FeatureClassification
import com.example.data.model.ResourceDiscoveryStatus
import com.example.domain.ai.AiIntegrationAgent
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class ExampleUnitTest {
  @Test
  fun addition_isCorrect() {
    assertEquals(4, 2 + 2)
  }

  @Test
  fun ai_agent_detects_destructive_operations() {
    val agent = AiIntegrationAgent()
    val isDestructive1 = agent.detectDestructiveOperation("POST", "/api/v1/admin/users/revoke", "Revoke user access")
    val isDestructive2 = agent.detectDestructiveOperation("DELETE", "/api/v1/orders/123", "Remove order")
    val isSafe = agent.detectDestructiveOperation("GET", "/api/v1/catalog/items", "Fetch items")

    assertTrue(isDestructive1)
    assertTrue(isDestructive2)
    assertFalse(isSafe)
  }

  @Test
  fun ai_agent_classifies_verified_json_endpoint_as_native_ready() {
    val agent = AiIntegrationAgent()
    val analysis = agent.classifyEndpoint(
      path = "/api/v1/orders/live",
      method = "GET",
      summary = "Orders stream",
      description = "Real time orders",
      parameters = emptyList(),
      responseType = "application/json",
      requiresAuth = true,
      isEndpointReachable = true
    )
    assertEquals(FeatureClassification.NATIVE_READY, analysis.classification)
    assertTrue(analysis.confidence >= 0.85f)
  }

  @Test
  fun ai_agent_classifies_interactive_canvas_as_webview_fallback() {
    val agent = AiIntegrationAgent()
    val analysis = agent.classifyEndpoint(
      path = "/editor/visual-canvas",
      method = "GET",
      summary = "Drag and drop layout builder",
      description = "Heavy canvas web app editor",
      parameters = emptyList(),
      responseType = "text/html",
      requiresAuth = true,
      isEndpointReachable = true
    )
    assertEquals(FeatureClassification.WEBVIEW_FALLBACK, analysis.classification)
  }

  @Test
  fun transparent_report_strictly_bounds_completeness_without_exhaustive_evidence() {
    val agent = AiIntegrationAgent()
    val endpoints = listOf(
      EndpointDefinition(
        id = "ep1",
        path = "/api/v1/integration/health",
        httpMethod = "GET",
        summary = "Health status",
        hubId = "hub_owner",
        classification = FeatureClassification.NATIVE_READY
      ),
      EndpointDefinition(
        id = "ep2",
        path = "/api/v1/integration/manifest",
        httpMethod = "GET",
        summary = "Manifest",
        hubId = "hub_owner",
        classification = FeatureClassification.NATIVE_READY
      )
    )

    val report = agent.generateTransparentCompletenessReport(
      endpoints = endpoints,
      pagesCount = 6,
      totalPagesExpected = 8,
      featuresCount = 10,
      assetsCount = 4,
      permissionsCount = 5,
      inaccessibleCount = 0,
      undocumentedCount = 0,
      statusBreakdown = mapOf(ResourceDiscoveryStatus.SUCCESSFULLY_DISCOVERED to 2),
      isExhaustiveEvidenceSupplied = false
    )

    // Requirement 9: Never display 100% completion unless the website provides sufficient evidence
    assertTrue("Calculated completeness must be strictly bounded below 100%", report.completenessPercentage < 100)
    assertFalse(report.isEvidenceExhaustive)
    assertNotNull(report.healthRating)
  }

  @Test
  fun discovery_stage_sequence_contains_11_stages_with_target_endpoints() {
    val stages = DiscoveryStage.entries
    assertEquals(11, stages.size)
    assertEquals(1, stages.first().stepNumber)
    assertEquals(11, stages.last().stepNumber)

    assertEquals("/api/v1/integration/health", DiscoveryStage.CHECK_HEALTH.targetEndpoint)
    assertEquals("/api/v1/integration/manifest", DiscoveryStage.RETRIEVE_MANIFEST.targetEndpoint)
    assertEquals("/api/v1/openapi.json", DiscoveryStage.RETRIEVE_OPENAPI.targetEndpoint)
    assertEquals("/api/v1/integration/assets", DiscoveryStage.RETRIEVE_ASSETS.targetEndpoint)
  }

  @Test
  fun ai_agent_generates_detailed_implementation_plan() {
    val agent = AiIntegrationAgent()
    val record = DiscoveredFeatureRecord(
      featureId = "feat_billing_upgrade",
      name = "Plan Upgrade",
      description = "Upgrades team plan",
      hubId = "hub_owner",
      route = "/api/v1/billing/upgrade",
      apiOperations = listOf("POST /api/v1/billing/upgrade"),
      permissions = listOf("owner:billing"),
      integrationStatus = FeatureClassification.NATIVE_READY
    )

    val plan = agent.generateImplementationPlan(record)
    assertEquals(FeatureClassification.NATIVE_READY, plan.recommendedStrategy)
    assertTrue(plan.nativeFeasibilityScore >= 80)
    assertTrue(plan.actionSteps.isNotEmpty())
    assertTrue(plan.missingPrerequisites.isNotEmpty())
  }
}
