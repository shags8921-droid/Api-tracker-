package com.example.data.remote

import com.example.data.model.DiagnosticItem
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.FormBody
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import java.net.ConnectException
import java.net.SocketTimeoutException
import java.net.UnknownHostException
import java.util.concurrent.TimeUnit
import java.util.regex.Pattern
import javax.net.ssl.SSLHandshakeException

class DiscoveryNetworkClient(
  private val okHttpClient: OkHttpClient = OkHttpClient.Builder()
    .connectTimeout(8, TimeUnit.SECONDS)
    .readTimeout(10, TimeUnit.SECONDS)
    .writeTimeout(8, TimeUnit.SECONDS)
    .followRedirects(true)
    .build()
) {

  data class EndpointProbeResult(
    val endpointPath: String,
    val isAvailable: Boolean,
    val statusCode: Int,
    val statusText: String,
    val latencyMs: Long,
    val body: String?,
    val headers: Map<String, String>,
    val errorMessage: String? = null,
    val errorType: String? = null
  )

  suspend fun checkBaseConnection(baseUrl: String): EndpointProbeResult = withContext(Dispatchers.IO) {
    val startTime = System.currentTimeMillis()
    try {
      val request = Request.Builder()
        .url(baseUrl)
        .head()
        .header("User-Agent", "SitePulse-AI-Discovery-Engine/2.0 (Android)")
        .build()

      val response: Response = okHttpClient.newCall(request).execute()
      val latency = System.currentTimeMillis() - startTime
      val headerMap = sanitizeHeaders(response.headers.toMultimap().mapValues { it.value.joinToString(", ") })

      EndpointProbeResult(
        endpointPath = "/",
        isAvailable = response.isSuccessful,
        statusCode = response.code,
        statusText = response.message.ifBlank { if (response.isSuccessful) "OK" else "Status ${response.code}" },
        latencyMs = latency,
        body = null,
        headers = headerMap
      )
    } catch (e: Exception) {
      val latency = System.currentTimeMillis() - startTime
      val (errType, errMsg) = categorizeNetworkException(e)
      EndpointProbeResult(
        endpointPath = "/",
        isAvailable = false,
        statusCode = 0,
        statusText = "Connection Failed",
        latencyMs = latency,
        body = null,
        headers = emptyMap(),
        errorMessage = errMsg,
        errorType = errType
      )
    }
  }

  suspend fun probeEndpoint(
    baseUrl: String,
    endpointPath: String,
    authToken: String? = null,
    apiKey: String? = null
  ): EndpointProbeResult = withContext(Dispatchers.IO) {
    val cleanBase = baseUrl.trimEnd('/')
    val cleanPath = if (endpointPath.startsWith("/")) endpointPath else "/$endpointPath"
    val fullUrl = "$cleanBase$cleanPath"
    val startTime = System.currentTimeMillis()

    try {
      val requestBuilder = Request.Builder()
        .url(fullUrl)
        .get()
        .header("User-Agent", "SitePulse-AI-Discovery-Engine/2.0 (Android)")
        .header("Accept", "application/json, text/plain, text/html, application/xml, */*")

      if (!authToken.isNullOrBlank()) {
        requestBuilder.header("Authorization", if (authToken.startsWith("Bearer ")) authToken else "Bearer $authToken")
      }
      if (!apiKey.isNullOrBlank()) {
        requestBuilder.header("X-API-KEY", apiKey)
      }

      val response: Response = okHttpClient.newCall(requestBuilder.build()).execute()
      val latency = System.currentTimeMillis() - startTime
      val bodyString = response.body?.string()
      val headerMap = sanitizeHeaders(response.headers.toMultimap().mapValues { it.value.joinToString(", ") })

      EndpointProbeResult(
        endpointPath = cleanPath,
        isAvailable = response.isSuccessful,
        statusCode = response.code,
        statusText = if (response.isSuccessful) "OK" else "HTTP ${response.code}: ${response.message}",
        latencyMs = latency,
        body = bodyString,
        headers = headerMap
      )
    } catch (e: Exception) {
      val latency = System.currentTimeMillis() - startTime
      val (errType, errMsg) = categorizeNetworkException(e)
      EndpointProbeResult(
        endpointPath = cleanPath,
        isAvailable = false,
        statusCode = 0,
        statusText = "Unreachable",
        latencyMs = latency,
        body = null,
        headers = emptyMap(),
        errorMessage = errMsg,
        errorType = errType
      )
    }
  }

  /**
   * Additional Discovery Method: Parses public sitemap.xml if /api/v1/integration/pages is 404
   */
  suspend fun fetchSitemapUrls(baseUrl: String): List<String> = withContext(Dispatchers.IO) {
    val sitemapProbe = probeEndpoint(baseUrl, "/sitemap.xml")
    if (!sitemapProbe.isAvailable || sitemapProbe.body.isNullOrBlank()) {
      return@withContext emptyList()
    }

    val urls = mutableListOf<String>()
    try {
      val locPattern = Pattern.compile("<loc>(.*?)</loc>", Pattern.CASE_INSENSITIVE)
      val matcher = locPattern.matcher(sitemapProbe.body)
      while (matcher.find()) {
        val url = matcher.group(1)?.trim()
        if (!url.isNullOrBlank()) {
          urls.add(url)
        }
      }
    } catch (e: Exception) {
      e.printStackTrace()
    }
    urls.take(30) // sample reasonable top pages
  }

  /**
   * Additional Discovery Method: Public HTML metadata extraction (e.g., page title, OpenGraph tags)
   */
  suspend fun fetchHtmlMetadata(baseUrl: String): Map<String, String> = withContext(Dispatchers.IO) {
    val rootProbe = probeEndpoint(baseUrl, "/")
    if (rootProbe.body.isNullOrBlank()) return@withContext emptyMap()

    val metadata = mutableMapOf<String, String>()
    try {
      val html = rootProbe.body
      val titlePattern = Pattern.compile("<title>(.*?)</title>", Pattern.CASE_INSENSITIVE or Pattern.DOTALL)
      val titleMatcher = titlePattern.matcher(html)
      if (titleMatcher.find()) {
        metadata["title"] = titleMatcher.group(1)?.trim().orEmpty()
      }

      val metaDescPattern = Pattern.compile("<meta\\s+name=[\"']description[\"']\\s+content=[\"'](.*?)[\"']", Pattern.CASE_INSENSITIVE)
      val metaMatcher = metaDescPattern.matcher(html)
      if (metaMatcher.find()) {
        metadata["description"] = metaMatcher.group(1)?.trim().orEmpty()
      }
    } catch (e: Exception) {
      e.printStackTrace()
    }
    metadata
  }

  /**
   * OAuth 2.0 PKCE Authorization Code Exchange
   */
  suspend fun exchangePkceCode(
    tokenEndpointUrl: String,
    code: String,
    codeVerifier: String,
    clientId: String,
    redirectUri: String
  ): EndpointProbeResult = withContext(Dispatchers.IO) {
    val startTime = System.currentTimeMillis()
    try {
      val formBody = FormBody.Builder()
        .add("grant_type", "authorization_code")
        .add("client_id", clientId)
        .add("code", code)
        .add("code_verifier", codeVerifier)
        .add("redirect_uri", redirectUri)
        .build()

      val request = Request.Builder()
        .url(tokenEndpointUrl)
        .post(formBody)
        .header("User-Agent", "SitePulse-AI-Discovery-Engine/2.0 (Android)")
        .header("Accept", "application/json")
        .build()

      val response: Response = okHttpClient.newCall(request).execute()
      val latency = System.currentTimeMillis() - startTime
      val bodyString = response.body?.string()
      val headerMap = sanitizeHeaders(response.headers.toMultimap().mapValues { it.value.joinToString(", ") })

      EndpointProbeResult(
        endpointPath = "/token",
        isAvailable = response.isSuccessful,
        statusCode = response.code,
        statusText = response.message,
        latencyMs = latency,
        body = bodyString,
        headers = headerMap
      )
    } catch (e: Exception) {
      val latency = System.currentTimeMillis() - startTime
      val (errType, errMsg) = categorizeNetworkException(e)
      EndpointProbeResult(
        endpointPath = "/token",
        isAvailable = false,
        statusCode = 0,
        statusText = "Token Exchange Failed",
        latencyMs = latency,
        body = null,
        headers = emptyMap(),
        errorMessage = errMsg,
        errorType = errType
      )
    }
  }

  private fun categorizeNetworkException(e: Exception): Pair<String, String> {
    return when (e) {
      is SSLHandshakeException -> Pair("SSL_ERROR", "TLS/SSL Certificate negotiation failed: ${e.message}")
      is UnknownHostException -> Pair("DNS_UNRESOLVED", "Could not resolve hostname DNS. Verify spelling or connectivity.")
      is ConnectException -> Pair("CONNECTION_REFUSED", "Server port refused connection. Verify server is online.")
      is SocketTimeoutException -> Pair("TIMEOUT", "Connection or read timed out after 8s. Server may be overloaded.")
      else -> Pair("NETWORK_ERROR", e.localizedMessage ?: "Unknown network exception")
    }
  }

  /**
   * Redacts sensitive authorization tokens, cookies, and keys from headers before logging
   */
  private fun sanitizeHeaders(rawHeaders: Map<String, String>): Map<String, String> {
    val sanitized = mutableMapOf<String, String>()
    val sensitiveKeys = listOf("authorization", "cookie", "set-cookie", "x-api-key", "token", "secret")
    for ((key, value) in rawHeaders) {
      if (sensitiveKeys.any { key.equals(it, ignoreCase = true) }) {
        sanitized[key] = "[REDACTED FOR SECURITY]"
      } else {
        sanitized[key] = value
      }
    }
    return sanitized
  }

  fun toDiagnosticItem(baseUrl: String, result: EndpointProbeResult): DiagnosticItem {
    return DiagnosticItem(
      targetUrl = baseUrl,
      endpointPath = result.endpointPath,
      method = "GET",
      statusCode = result.statusCode,
      statusText = result.statusText,
      latencyMs = result.latencyMs,
      isSuccessful = result.isAvailable,
      message = result.errorMessage ?: "Probe completed with status ${result.statusCode}",
      responseHeaders = result.headers,
      rawPayloadSnippet = result.body?.take(400)
    )
  }
}
