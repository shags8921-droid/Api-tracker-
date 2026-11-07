package com.example.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material.icons.filled.AutoAwesome
import androidx.compose.material.icons.filled.Bolt
import androidx.compose.material.icons.filled.Hub
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Shield
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.R
import com.example.ui.theme.CyanNeon
import com.example.ui.theme.EmeraldAccent
import com.example.ui.theme.IndigoPrimary

@Composable
fun WelcomeScreen(
  onGetStarted: () -> Unit,
  onLaunchDemo: () -> Unit,
  modifier: Modifier = Modifier
) {
  val scrollState = rememberScrollState()

  Box(
    modifier = modifier
      .fillMaxSize()
      .background(MaterialTheme.colorScheme.background)
  ) {
    Column(
      modifier = Modifier
        .fillMaxSize()
        .verticalScroll(scrollState)
        .padding(horizontal = 24.dp, vertical = 32.dp),
      horizontalAlignment = Alignment.CenterHorizontally
    ) {
      Spacer(modifier = Modifier.height(16.dp))

      // App Emblem
      Box(
        modifier = Modifier
          .size(108.dp)
          .clip(RoundedCornerShape(26.dp))
          .background(
            Brush.linearGradient(
              listOf(
                Color(0xFF0F172A),
                Color(0xFF1E293B)
              )
            )
          )
          .border(2.dp, CyanNeon.copy(alpha = 0.6f), RoundedCornerShape(26.dp)),
        contentAlignment = Alignment.Center
      ) {
        Image(
          painter = painterResource(id = R.drawable.ic_app_launcher),
          contentDescription = "SitePulse AI Emblem",
          modifier = Modifier.size(88.dp)
        )
      }

      Spacer(modifier = Modifier.height(20.dp))

      // Badges
      Surface(
        shape = CircleShape,
        color = CyanNeon.copy(alpha = 0.12f),
        border = androidx.compose.foundation.BorderStroke(1.dp, CyanNeon.copy(alpha = 0.35f))
      ) {
        Row(
          modifier = Modifier.padding(horizontal = 12.dp, vertical = 6.dp),
          verticalAlignment = Alignment.CenterVertically
        ) {
          Icon(
            imageVector = Icons.Default.AutoAwesome,
            contentDescription = null,
            tint = CyanNeon,
            modifier = Modifier.size(14.dp)
          )
          Spacer(modifier = Modifier.width(6.dp))
          Text(
            text = "INDEPENDENT AI INTEGRATION ENGINE",
            color = CyanNeon,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 0.5.sp
          )
        }
      }

      Spacer(modifier = Modifier.height(14.dp))

      Text(
        text = "SitePulse AI",
        style = MaterialTheme.typography.headlineLarge,
        fontWeight = FontWeight.ExtraBold,
        color = MaterialTheme.colorScheme.onBackground,
        textAlign = TextAlign.Center
      )

      Spacer(modifier = Modifier.height(6.dp))

      Text(
        text = "Intelligent website analyzer that connects to existing websites, inspects authorized OpenAPI capabilities, and natively reproduces management hubs in your Android interface.",
        style = MaterialTheme.typography.bodyMedium,
        color = MaterialTheme.colorScheme.onSurfaceVariant,
        textAlign = TextAlign.Center,
        lineHeight = 21.sp,
        modifier = Modifier.padding(horizontal = 8.dp)
      )

      Spacer(modifier = Modifier.height(28.dp))

      // Key Features Column
      FeaturePillarCard(
        icon = Icons.Default.Hub,
        iconTint = CyanNeon,
        title = "Automated Endpoint Discovery",
        description = "Probes /manifest, /health, /capabilities, and OpenAPI documentation without assuming server support."
      )

      Spacer(modifier = Modifier.height(12.dp))

      FeaturePillarCard(
        icon = Icons.Default.Bolt,
        iconTint = EmeraldAccent,
        title = "Intelligent Hybrid Engine",
        description = "Classifies operations into NATIVE Compose controls or authenticated WEBVIEW fallback with AI confidence scores."
      )

      Spacer(modifier = Modifier.height(12.dp))

      FeaturePillarCard(
        icon = Icons.Default.Shield,
        iconTint = IndigoPrimary,
        title = "Hardware-Backed Security & Approval",
        description = "Android KeyStore AES-GCM credential vault with mandatory confirmation for sensitive or destructive actions."
      )

      Spacer(modifier = Modifier.height(32.dp))

      // Action Buttons
      Button(
        onClick = onGetStarted,
        shape = RoundedCornerShape(14.dp),
        colors = ButtonDefaults.buttonColors(
          containerColor = MaterialTheme.colorScheme.primary,
          contentColor = Color.White
        ),
        modifier = Modifier
          .fillMaxWidth()
          .height(52.dp)
          .testTag("get_started_button")
      ) {
        Text(text = "Connect Website", fontSize = 16.sp, fontWeight = FontWeight.Bold)
        Spacer(modifier = Modifier.width(8.dp))
        Icon(imageVector = Icons.Default.ArrowForward, contentDescription = null, modifier = Modifier.size(18.dp))
      }

      Spacer(modifier = Modifier.height(12.dp))

      OutlinedButton(
        onClick = onLaunchDemo,
        shape = RoundedCornerShape(14.dp),
        modifier = Modifier
          .fillMaxWidth()
          .height(50.dp)
          .testTag("launch_testbed_button")
      ) {
        Icon(imageVector = Icons.Outlined.CheckCircle, contentDescription = null, tint = CyanNeon, modifier = Modifier.size(16.dp))
        Spacer(modifier = Modifier.width(8.dp))
        Text(text = "Load Enterprise Sandbox Testbed", fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
      }

      Spacer(modifier = Modifier.height(24.dp))
    }
  }
}

@Composable
private fun FeaturePillarCard(
  icon: ImageVector,
  iconTint: Color,
  title: String,
  description: String
) {
  Card(
    shape = RoundedCornerShape(14.dp),
    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant.copy(alpha = 0.5f)),
    border = androidx.compose.foundation.BorderStroke(1.dp, MaterialTheme.colorScheme.outline.copy(alpha = 0.2f)),
    modifier = Modifier.fillMaxWidth()
  ) {
    Row(
      modifier = Modifier.padding(14.dp),
      verticalAlignment = Alignment.Top
    ) {
      Box(
        modifier = Modifier
          .size(38.dp)
          .clip(RoundedCornerShape(10.dp))
          .background(iconTint.copy(alpha = 0.15f)),
        contentAlignment = Alignment.Center
      ) {
        Icon(
          imageVector = icon,
          contentDescription = null,
          tint = iconTint,
          modifier = Modifier.size(20.dp)
        )
      }
      Spacer(modifier = Modifier.width(14.dp))
      Column {
        Text(
          text = title,
          fontWeight = FontWeight.Bold,
          fontSize = 14.sp,
          color = MaterialTheme.colorScheme.onSurface
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
          text = description,
          fontSize = 12.sp,
          lineHeight = 17.sp,
          color = MaterialTheme.colorScheme.onSurfaceVariant
        )
      }
    }
  }
}
