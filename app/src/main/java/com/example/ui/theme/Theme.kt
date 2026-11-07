package com.example.ui.theme

import android.os.Build
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.dynamicDarkColorScheme
import androidx.compose.material3.dynamicLightColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

private val DarkColorScheme =
  darkColorScheme(
    primary = CyanNeon,
    onPrimary = Color(0xFF041829),
    primaryContainer = CyanContainer,
    onPrimaryContainer = Color(0xFFBAE6FD),
    secondary = IndigoPrimary,
    onSecondary = Color.White,
    secondaryContainer = IndigoContainer,
    onSecondaryContainer = Color(0xFFE0E7FF),
    tertiary = EmeraldAccent,
    onTertiary = Color(0xFF022C22),
    tertiaryContainer = EmeraldContainer,
    onTertiaryContainer = Color(0xFFA7F3D0),
    background = BackgroundDark,
    onBackground = Color(0xFFF1F5F9),
    surface = SurfaceDark,
    onSurface = Color(0xFFF1F5F9),
    surfaceVariant = SurfaceVariantDark,
    onSurfaceVariant = Color(0xFFCBD5E1),
    outline = OutlineDark,
    outlineVariant = OutlineVariantDark,
    error = RoseAccent,
    onError = Color.White,
    errorContainer = RoseContainer,
    onErrorContainer = Color(0xFFFFD1D8)
  )

private val LightColorScheme =
  lightColorScheme(
    primary = CyanDark,
    onPrimary = Color.White,
    primaryContainer = CyanContainerLight,
    onPrimaryContainer = Color(0xFF0369A1),
    secondary = IndigoDark,
    onSecondary = Color.White,
    secondaryContainer = IndigoContainerLight,
    onSecondaryContainer = Color(0xFF3730A3),
    tertiary = EmeraldAccent,
    onTertiary = Color.White,
    tertiaryContainer = Color(0xFFD1FAE5),
    onTertiaryContainer = Color(0xFF065F46),
    background = BackgroundLight,
    onBackground = Color(0xFF0F172A),
    surface = SurfaceLight,
    onSurface = Color(0xFF0F172A),
    surfaceVariant = SurfaceVariantLight,
    onSurfaceVariant = Color(0xFF475569),
    outline = OutlineLight,
    outlineVariant = Color(0xFFE2E8F0),
    error = Color(0xFFDC2626),
    onError = Color.White
  )

@Composable
fun SitePulseTheme(
  darkTheme: Boolean = isSystemInDarkTheme(),
  dynamicColor: Boolean = false, // prefer our custom branding for cohesive high-tech aesthetic
  content: @Composable () -> Unit,
) {
  val colorScheme =
    when {
      dynamicColor && Build.VERSION.SDK_INT >= Build.VERSION_CODES.S -> {
        val context = LocalContext.current
        if (darkTheme) dynamicDarkColorScheme(context) else dynamicLightColorScheme(context)
      }
      darkTheme -> DarkColorScheme
      else -> LightColorScheme
    }

  MaterialTheme(colorScheme = colorScheme, typography = Typography, content = content)
}
