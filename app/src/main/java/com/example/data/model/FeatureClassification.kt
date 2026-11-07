package com.example.data.model

enum class FeatureClassification(
  val label: String,
  val description: String
) {
  NATIVE_READY(
    label = "Native Ready",
    description = "The app can safely implement the feature natively using verified APIs."
  ),
  WEBVIEW_FALLBACK(
    label = "WebView Fallback",
    description = "The original authenticated website page must be used because native replication is incomplete or requires complex web canvas."
  ),
  NEEDS_CONFIGURATION(
    label = "Needs Configuration",
    description = "More API documentation, permission information or server support is required."
  ),
  UNAVAILABLE(
    label = "Unavailable",
    description = "The feature cannot currently be integrated due to missing endpoints or restricted scope."
  );

  companion object {
    fun fromString(value: String): FeatureClassification {
      val normalized = value.trim().uppercase()
      return when {
        normalized == "NATIVE" || normalized == "NATIVE_READY" -> NATIVE_READY
        normalized == "WEBVIEW" || normalized == "WEBVIEW_FALLBACK" -> WEBVIEW_FALLBACK
        normalized == "NEEDS_CONFIGURATION" || normalized == "CONFIG" -> NEEDS_CONFIGURATION
        normalized == "UNAVAILABLE" -> UNAVAILABLE
        else -> entries.find { it.name.equals(normalized, ignoreCase = true) } ?: NEEDS_CONFIGURATION
      }
    }
  }
}

enum class ResourceDiscoveryStatus(val label: String) {
  SUCCESSFULLY_DISCOVERED("Successfully Discovered"),
  PARTIALLY_DISCOVERED("Partially Discovered"),
  NOT_ACCESSIBLE("Not Accessible (401/403)"),
  NOT_DOCUMENTED("Not Documented (404)"),
  NOT_SUPPORTED("Not Supported")
}

enum class DiscoverySource(val label: String) {
  INTEGRATION_API("Integration API (/api/v1/integration/*)"),
  OPENAPI_SPEC("OpenAPI 3.0 Documentation"),
  SITEMAP_FALLBACK("Public sitemap.xml fallback"),
  PAGE_METADATA("Page HTML Metadata"),
  WEBSITE_EXPORT("Authorized Website Export JSON")
}

enum class HubType {
  OWNER,
  MANAGER,
  GENERAL
}

enum class AuthType(val label: String) {
  OAUTH2_PKCE("OAuth 2.0 PKCE (Authorization Code Flow)"),
  BEARER_TOKEN("Bearer Token (JWT / Authorized Token)"),
  API_KEY("API Key & Secret Header"),
  BASIC_AUTH("Basic Authentication"),
  CUSTOM_HEADER("Custom Authorized Header")
}
