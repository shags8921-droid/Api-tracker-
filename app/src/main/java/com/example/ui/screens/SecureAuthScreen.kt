package com.example.ui.screens

import androidx.compose.animation.AnimatedVisibility
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Key
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.material.icons.outlined.ArrowBack
import androidx.compose.material.icons.outlined.OpenInBrowser
import androidx.compose.material.icons.outlined.PlayArrow
import androidx.compose.material.icons.outlined.Shield
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.data.model.AuthType
import com.example.ui.theme.CyanNeon
import com.example.ui.theme.EmeraldAccent

@Composable
fun SecureAuthScreen(
  targetUrl: String,
  selectedAuthType: AuthType,
  authToken: String,
  apiKey: String,
  isOAuthInProgress: Boolean,
  isSessionExpired: Boolean,
  onAuthTypeSelected: (AuthType) -> Unit,
  onTokenChanged: (String) -> Unit,
  onApiKeyChanged: (String) -> Unit,
  onStartOAuthPkce: (() -> Unit) -> Unit,
  onRefreshToken: () -> Unit,
  onStartDiscovery: () -> Unit,
  onBack: () -> Unit,
  modifier: Modifier = Modifier
) {
  val scrollState = rememberScrollState()
  var isTokenVisible by remember { mutableStateOf(false) }
  var isApiKeyVisible by remember { mutableStateOf(false) }

  Box(
    modifier = modifier
      .fillMaxSize()
      .background(MaterialTheme.colorScheme.background)
  ) {
    Column(
      modifier = Modifier
        .fillMaxSize()
        .verticalScroll(scrollState)
        .padding(horizontal = 20.dp, vertical = 24.dp)
    ) {
      Row(verticalAlignment = Alignment.CenterVertically) {
        IconButton(
          onClick = onBack,
          modifier = Modifier.testTag("auth_back_button")
        ) {
          Icon(imageVector = Icons.Outlined.ArrowBack, contentDescription = "Back")
        }
        Spacer(modifier = Modifier.width(4.dp))
        Text(
          text = "Authorised Authentication",
          style = MaterialTheme.typography.titleLarge,
          fontWeight = FontWeight.Bold,
          color = MaterialTheme.colorScheme.onBackground
        )
      }

      Spacer(modifier = Modifier.height(10.dp))

      Text(
        text = "Target Host: $targetUrl",
        fontFamily = FontFamily.Monospace,
        fontSize = 12.sp,
        color = CyanNeon
      )

      // Session Expiration Warning
      if (isSessionExpired) {
        Spacer(modifier = Modifier.height(12.dp))
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
              Text("Access token expired. Refresh token or re-authenticate.", fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
            OutlinedButton(
              onClick = onRefreshToken,
              modifier = Modifier.testTag("refresh_token_button")
            ) {
              Icon(imageVector = Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(14.dp))
              Spacer(modifier = Modifier.width(4.dp))
              Text("Refresh", fontSize = 11.sp)
            }
          }
        }
      }

      Spacer(modifier = Modifier.height(16.dp))

      // Security Guarantee Card
      Card(
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = EmeraldAccent.copy(alpha = 0.08f)),
        border = androidx.compose.foundation.BorderStroke(1.dp, EmeraldAccent.copy(alpha = 0.25f)),
        modifier = Modifier.fillMaxWidth()
      ) {
        Row(
          modifier = Modifier.padding(14.dp),
          verticalAlignment = Alignment.Top
        ) {
          Icon(
            imageVector = Icons.Outlined.Shield,
            contentDescription = "Shield",
            tint = EmeraldAccent,
            modifier = Modifier.size(24.dp)
          )
          Spacer(modifier = Modifier.width(12.dp))
          Column {
            Text(
              text = "Authorised Auth & Hardware Vault",
              fontWeight = FontWeight.Bold,
              fontSize = 13.sp,
              color = EmeraldAccent
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
              text = "Supports OAuth 2.0 PKCE, bearer tokens, and secure headers. Credentials encrypted via Android KeyStore AES-256-GCM. Tokens are never exposed in logs or plaintext.",
              fontSize = 11.sp,
              lineHeight = 16.sp,
              color = MaterialTheme.colorScheme.onSurfaceVariant
            )
          }
        }
      }

      Spacer(modifier = Modifier.height(20.dp))

      Text(
        text = "Select Authentication Mechanism",
        fontSize = 14.sp,
        fontWeight = FontWeight.SemiBold,
        color = MaterialTheme.colorScheme.onSurface
      )
      Spacer(modifier = Modifier.height(8.dp))

      // Auth Type Selector
      Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        AuthType.entries.forEach { type ->
          val isSelected = type == selectedAuthType
          Surface(
            shape = RoundedCornerShape(10.dp),
            color = if (isSelected) CyanNeon.copy(alpha = 0.12f) else MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f),
            border = androidx.compose.foundation.BorderStroke(1.dp, if (isSelected) CyanNeon else MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)),
            modifier = Modifier
              .fillMaxWidth()
              .clickable { onAuthTypeSelected(type) }
              .testTag("auth_type_${type.name}")
          ) {
            Row(
              modifier = Modifier.padding(horizontal = 14.dp, vertical = 12.dp),
              verticalAlignment = Alignment.CenterVertically
            ) {
              Icon(
                imageVector = if (type == AuthType.OAUTH2_PKCE) Icons.Outlined.OpenInBrowser else if (type == AuthType.API_KEY) Icons.Default.Key else Icons.Default.Lock,
                contentDescription = null,
                tint = if (isSelected) CyanNeon else MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(18.dp)
              )
              Spacer(modifier = Modifier.width(12.dp))
              Text(
                text = type.label,
                fontSize = 13.sp,
                fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium,
                color = if (isSelected) CyanNeon else MaterialTheme.colorScheme.onSurface,
                modifier = Modifier.weight(1f)
              )
              if (isSelected) {
                Icon(imageVector = Icons.Default.Check, contentDescription = null, tint = CyanNeon, modifier = Modifier.size(18.dp))
              }
            }
          }
        }
      }

      Spacer(modifier = Modifier.height(20.dp))

      // Inputs based on selected AuthType
      if (selectedAuthType == AuthType.OAUTH2_PKCE) {
        Card(
          shape = RoundedCornerShape(12.dp),
          colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
          border = androidx.compose.foundation.BorderStroke(1.dp, CyanNeon.copy(alpha = 0.3f)),
          modifier = Modifier.fillMaxWidth()
        ) {
          Column(modifier = Modifier.padding(14.dp)) {
            Text(
              text = "OAuth 2.0 PKCE Authorization Code Flow",
              fontWeight = FontWeight.Bold,
              fontSize = 13.sp,
              color = CyanNeon
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
              text = "Generates a cryptographically random Code Verifier & SHA-256 Code Challenge to authenticate securely without exposing client secrets.",
              fontSize = 11.sp,
              color = MaterialTheme.colorScheme.onSurfaceVariant,
              lineHeight = 15.sp
            )
            Spacer(modifier = Modifier.height(12.dp))

            Button(
              onClick = { onStartOAuthPkce {} },
              enabled = !isOAuthInProgress,
              shape = RoundedCornerShape(10.dp),
              colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.primary),
              modifier = Modifier
                .fillMaxWidth()
                .testTag("launch_oauth_pkce_button")
            ) {
              if (isOAuthInProgress) {
                CircularProgressIndicator(modifier = Modifier.size(16.dp), color = Color.White, strokeWidth = 2.dp)
                Spacer(modifier = Modifier.width(8.dp))
                Text("Authenticating...")
              } else {
                Icon(imageVector = Icons.Outlined.OpenInBrowser, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(8.dp))
                Text("Authorise via Browser / PKCE", fontWeight = FontWeight.Bold)
              }
            }
          }
        }
      } else if (selectedAuthType == AuthType.BEARER_TOKEN || selectedAuthType == AuthType.CUSTOM_HEADER) {
        OutlinedTextField(
          value = authToken,
          onValueChange = onTokenChanged,
          label = { Text("Bearer / Access Token") },
          placeholder = { Text("eyJhbGciOi...") },
          visualTransformation = if (isTokenVisible) VisualTransformation.None else PasswordVisualTransformation(),
          trailingIcon = {
            IconButton(onClick = { isTokenVisible = !isTokenVisible }) {
              Icon(
                imageVector = if (isTokenVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                contentDescription = "Toggle visibility"
              )
            }
          },
          singleLine = true,
          shape = RoundedCornerShape(12.dp),
          colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = CyanNeon,
            focusedLabelColor = CyanNeon
          ),
          modifier = Modifier
            .fillMaxWidth()
            .testTag("auth_token_input")
        )
      } else {
        OutlinedTextField(
          value = apiKey,
          onValueChange = onApiKeyChanged,
          label = { Text("API Key Header (X-API-KEY)") },
          placeholder = { Text("sk_live_...") },
          visualTransformation = if (isApiKeyVisible) VisualTransformation.None else PasswordVisualTransformation(),
          trailingIcon = {
            IconButton(onClick = { isApiKeyVisible = !isApiKeyVisible }) {
              Icon(
                imageVector = if (isApiKeyVisible) Icons.Default.VisibilityOff else Icons.Default.Visibility,
                contentDescription = "Toggle visibility"
              )
            }
          },
          singleLine = true,
          shape = RoundedCornerShape(12.dp),
          colors = OutlinedTextFieldDefaults.colors(
            focusedBorderColor = CyanNeon,
            focusedLabelColor = CyanNeon
          ),
          modifier = Modifier
            .fillMaxWidth()
            .testTag("api_key_input")
        )
      }

      Spacer(modifier = Modifier.height(32.dp))

      // Start Discovery Button
      Button(
        onClick = onStartDiscovery,
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.buttonColors(
          containerColor = MaterialTheme.colorScheme.primary,
          contentColor = Color.White
        ),
        modifier = Modifier
          .fillMaxWidth()
          .height(52.dp)
          .testTag("start_discovery_button")
      ) {
        Icon(imageVector = Icons.Outlined.PlayArrow, contentDescription = null, modifier = Modifier.size(18.dp))
        Spacer(modifier = Modifier.width(8.dp))
        Text("Execute 11-Stage Self-Discovery", fontSize = 15.sp, fontWeight = FontWeight.Bold)
      }

      Spacer(modifier = Modifier.height(14.dp))

      Text(
        text = "The engine will sequentially probe health, manifest, OpenAPI documentation, hubs, feature registry, pages/sitemap, components, workflows, permissions, assets, and compare manifests.",
        fontSize = 11.sp,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        lineHeight = 16.sp
      )
    }
  }
}
