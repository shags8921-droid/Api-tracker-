package com.example.data.security

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.security.KeyStore
import java.security.MessageDigest
import java.security.SecureRandom
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

class SecureCredentialManager(context: Context) {

  private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

  init {
    ensureKeyExists()
  }

  private fun ensureKeyExists() {
    val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
    if (!keyStore.containsAlias(KEY_ALIAS)) {
      val keyGenerator = KeyGenerator.getInstance(
        KeyProperties.KEY_ALGORITHM_AES,
        ANDROID_KEYSTORE
      )
      val spec = KeyGenParameterSpec.Builder(
        KEY_ALIAS,
        KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
      )
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
        .setKeySize(256)
        .build()
      keyGenerator.init(spec)
      keyGenerator.generateKey()
    }
  }

  private fun getSecretKey(): SecretKey {
    val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
    return keyStore.getKey(KEY_ALIAS, null) as SecretKey
  }

  fun saveCredential(key: String, secretValue: String): Boolean {
    if (secretValue.isBlank()) return false
    return try {
      val cipher = Cipher.getInstance(TRANSFORMATION)
      cipher.init(Cipher.ENCRYPT_MODE, getSecretKey())
      val iv = cipher.iv
      val encryptedBytes = cipher.doFinal(secretValue.toByteArray(Charsets.UTF_8))

      val combined = ByteArray(iv.size + encryptedBytes.size)
      System.arraycopy(iv, 0, combined, 0, iv.size)
      System.arraycopy(encryptedBytes, 0, combined, iv.size, encryptedBytes.size)

      val encoded = Base64.encodeToString(combined, Base64.NO_WRAP)
      prefs.edit().putString(key, encoded).apply()
      true
    } catch (e: Exception) {
      false
    }
  }

  fun getCredential(key: String): String? {
    val encoded = prefs.getString(key, null) ?: return null
    return try {
      val combined = Base64.decode(encoded, Base64.NO_WRAP)
      val ivSize = 12 // Standard GCM IV size
      if (combined.size <= ivSize) return null

      val iv = ByteArray(ivSize)
      val encryptedBytes = ByteArray(combined.size - ivSize)
      System.arraycopy(combined, 0, iv, 0, ivSize)
      System.arraycopy(combined, ivSize, encryptedBytes, 0, encryptedBytes.size)

      val cipher = Cipher.getInstance(TRANSFORMATION)
      val spec = GCMParameterSpec(128, iv)
      cipher.init(Cipher.DECRYPT_MODE, getSecretKey(), spec)
      val decryptedBytes = cipher.doFinal(encryptedBytes)
      String(decryptedBytes, Charsets.UTF_8)
    } catch (e: Exception) {
      null
    }
  }

  fun removeCredential(key: String) {
    prefs.edit().remove(key).apply()
  }

  // --- Session Expiration and Refresh Support ---

  fun saveSessionExpiry(siteId: String, expiresInSeconds: Long) {
    val expiryTimestamp = System.currentTimeMillis() + (expiresInSeconds * 1000L)
    prefs.edit().putLong("session_expiry_$siteId", expiryTimestamp).apply()
  }

  fun isSessionExpired(siteId: String): Boolean {
    val expiry = prefs.getLong("session_expiry_$siteId", 0L)
    if (expiry == 0L) return false // No explicit expiry recorded (long-lived / API key)
    return System.currentTimeMillis() > expiry
  }

  fun getSessionExpiryTime(siteId: String): Long {
    return prefs.getLong("session_expiry_$siteId", 0L)
  }

  // --- OAuth 2.0 PKCE Generator (RFC 7636) ---

  data class PkceParameters(
    val codeVerifier: String,
    val codeChallenge: String,
    val state: String
  )

  fun generatePkceParameters(): PkceParameters {
    val secureRandom = SecureRandom()
    val bytes = ByteArray(32)
    secureRandom.nextBytes(bytes)
    val codeVerifier = Base64.encodeToString(bytes, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)

    val digest = MessageDigest.getInstance("SHA-256")
    val hash = digest.digest(codeVerifier.toByteArray(Charsets.US_ASCII))
    val codeChallenge = Base64.encodeToString(hash, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)

    val stateBytes = ByteArray(16)
    secureRandom.nextBytes(stateBytes)
    val state = Base64.encodeToString(stateBytes, Base64.URL_SAFE or Base64.NO_WRAP or Base64.NO_PADDING)

    return PkceParameters(
      codeVerifier = codeVerifier,
      codeChallenge = codeChallenge,
      state = state
    )
  }

  // --- Safe Redaction Utility ---

  fun getMaskedCredential(key: String): String {
    val value = getCredential(key) ?: return "None"
    if (value.length <= 8) return "••••••••"
    return "${value.take(4)}••••${value.takeLast(4)}"
  }

  fun logoutSite(siteId: String) {
    removeCredential("auth_token_$siteId")
    removeCredential("refresh_token_$siteId")
    removeCredential("api_key_$siteId")
    prefs.edit().remove("session_expiry_$siteId").apply()
  }

  fun clearAll() {
    prefs.edit().clear().apply()
  }

  companion object {
    private const val PREFS_NAME = "secure_sitepulse_vault"
    private const val ANDROID_KEYSTORE = "AndroidKeyStore"
    private const val KEY_ALIAS = "SitePulseSecureMasterKey_v1"
    private const val TRANSFORMATION = "AES/GCM/NoPadding"
  }
}
