package com.example.data.model

data class DiagnosticItem(
  val id: String = java.util.UUID.randomUUID().toString(),
  val timestamp: Long = System.currentTimeMillis(),
  val targetUrl: String,
  val endpointPath: String,
  val method: String,
  val statusCode: Int,
  val statusText: String,
  val latencyMs: Long,
  val isSuccessful: Boolean,
  val message: String,
  val requestHeaders: Map<String, String> = emptyMap(),
  val responseHeaders: Map<String, String> = emptyMap(),
  val rawPayloadSnippet: String? = null
)

data class SyncLog(
  val id: String = java.util.UUID.randomUUID().toString(),
  val websiteId: String,
  val timestamp: Long = System.currentTimeMillis(),
  val durationMs: Long,
  val status: SyncStatus,
  val stagesSucceeded: Int,
  val totalStages: Int = 10,
  val message: String,
  val manifestVersion: String,
  val featuresDiscovered: Int,
  val nativeCount: Int,
  val webViewCount: Int,
  val needsConfigCount: Int
)

enum class SyncStatus {
  SUCCESS,
  WARNING,
  ERROR
}
