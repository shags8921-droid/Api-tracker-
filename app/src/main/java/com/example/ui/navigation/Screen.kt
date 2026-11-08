package com.example.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BugReport
import androidx.compose.material.icons.filled.Dashboard
import androidx.compose.material.icons.filled.History
import androidx.compose.material.icons.filled.ManageAccounts
import androidx.compose.material.icons.filled.Security
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.outlined.Dashboard
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.ManageAccounts
import androidx.compose.material.icons.outlined.Security
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.ui.graphics.vector.ImageVector

sealed class Screen(val route: String, val title: String) {
  object Welcome : Screen("welcome", "Welcome")
  object ConnectWebsite : Screen("connect_website", "Connect Website")
  object SecureAuth : Screen("secure_auth", "Secure Authentication")
  object DiscoveryProgress : Screen("discovery_progress", "Discovery Pipeline")
  object AnalysisResults : Screen("analysis_results", "Analysis Results")
  object Dashboard : Screen("dashboard", "Dashboard")
  object OwnerHub : Screen("owner_hub", "Owner Hub")
  object ManagerHub : Screen("manager_hub", "Manager Hub")
  object SyncHistory : Screen("sync_history", "Sync History")
  object IntegrationSettings : Screen("integration_settings", "Settings")
  object Diagnostics : Screen("diagnostics", "Diagnostics")
  object WebHub : Screen("web_hub", "Web Management Hub")
}

data class BottomNavItem(
  val screen: Screen,
  val label: String,
  val selectedIcon: ImageVector,
  val unselectedIcon: ImageVector,
  val testTag: String
)

val bottomNavItems = listOf(
  BottomNavItem(
    screen = Screen.Dashboard,
    label = "Dashboard",
    selectedIcon = Icons.Filled.Dashboard,
    unselectedIcon = Icons.Outlined.Dashboard,
    testTag = "bottom_nav_dashboard"
  ),
  BottomNavItem(
    screen = Screen.OwnerHub,
    label = "Owner Hub",
    selectedIcon = Icons.Filled.Security,
    unselectedIcon = Icons.Outlined.Security,
    testTag = "bottom_nav_owner_hub"
  ),
  BottomNavItem(
    screen = Screen.ManagerHub,
    label = "Manager Hub",
    selectedIcon = Icons.Filled.ManageAccounts,
    unselectedIcon = Icons.Outlined.ManageAccounts,
    testTag = "bottom_nav_manager_hub"
  ),
  BottomNavItem(
    screen = Screen.SyncHistory,
    label = "Sync",
    selectedIcon = Icons.Filled.History,
    unselectedIcon = Icons.Outlined.History,
    testTag = "bottom_nav_sync"
  ),
  BottomNavItem(
    screen = Screen.IntegrationSettings,
    label = "Settings",
    selectedIcon = Icons.Filled.Settings,
    unselectedIcon = Icons.Outlined.Settings,
    testTag = "bottom_nav_settings"
  )
)
