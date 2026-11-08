package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.unit.sp
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.example.ui.components.DestructiveActionApprovalDialog
import com.example.ui.components.FeatureDetailInspectorDialog
import com.example.ui.navigation.Screen
import com.example.ui.navigation.bottomNavItems
import com.example.ui.screens.AnalysisResultsScreen
import com.example.ui.screens.ConnectWebsiteScreen
import com.example.ui.screens.DashboardScreen
import com.example.ui.screens.DiagnosticsScreen
import com.example.ui.screens.DiscoveryProgressScreen
import com.example.ui.screens.IntegrationSettingsScreen
import com.example.ui.screens.ManagerHubScreen
import com.example.ui.screens.OwnerHubScreen
import com.example.ui.screens.SecureAuthScreen
import com.example.ui.screens.SyncHistoryScreen
import com.example.ui.screens.WebHubScreen
import com.example.ui.screens.WelcomeScreen
import com.example.ui.theme.CyanNeon
import com.example.ui.theme.SitePulseTheme
import com.example.ui.viewmodel.MainViewModel

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    enableEdgeToEdge()
    setContent {
      SitePulseTheme(darkTheme = true) {
        val viewModel: MainViewModel = viewModel()
        SitePulseApp(viewModel = viewModel)
      }
    }
  }
}

@Composable
fun SitePulseApp(viewModel: MainViewModel) {
  val navController = rememberNavController()
  val snackbarHostState = remember { SnackbarHostState() }

  val activeConfig by viewModel.activeConfig.collectAsStateWithLifecycle()
  val savedWebsites by viewModel.savedWebsites.collectAsStateWithLifecycle()
  val features by viewModel.features.collectAsStateWithLifecycle()
  val hubs by viewModel.hubs.collectAsStateWithLifecycle()
  val pages by viewModel.pages.collectAsStateWithLifecycle()
  val assets by viewModel.assets.collectAsStateWithLifecycle()
  val warnings by viewModel.warnings.collectAsStateWithLifecycle()
  val syncLogs by viewModel.syncLogs.collectAsStateWithLifecycle()
  val diagnosticLogs by viewModel.diagnosticLogs.collectAsStateWithLifecycle()
  val discoveryProgress by viewModel.discoveryProgress.collectAsStateWithLifecycle()
  val transparentReport by viewModel.transparentReport.collectAsStateWithLifecycle()

  val websiteUrlInput by viewModel.websiteUrlInput.collectAsStateWithLifecycle()
  val integrationNameInput by viewModel.integrationNameInput.collectAsStateWithLifecycle()
  val selectedAuthType by viewModel.selectedAuthType.collectAsStateWithLifecycle()
  val authTokenInput by viewModel.authTokenInput.collectAsStateWithLifecycle()
  val apiKeyInput by viewModel.apiKeyInput.collectAsStateWithLifecycle()

  val isOAuthInProgress by viewModel.isOAuthInProgress.collectAsStateWithLifecycle()
  val pendingApprovalFeature by viewModel.pendingApprovalFeature.collectAsStateWithLifecycle()
  val inspectedFeature by viewModel.inspectedFeature.collectAsStateWithLifecycle()
  val inspectedFeaturePlan by viewModel.inspectedFeaturePlan.collectAsStateWithLifecycle()
  val feedbackMessage by viewModel.actionFeedbackMessage.collectAsStateWithLifecycle()

  // Handle snackbar messages
  LaunchedEffect(feedbackMessage) {
    feedbackMessage?.let {
      snackbarHostState.showSnackbar(it)
      viewModel.clearFeedbackMessage()
    }
  }

  val navBackStackEntry by navController.currentBackStackEntryAsState()
  val currentRoute = navBackStackEntry?.destination?.route

  val bottomBarRoutes = listOf(
    Screen.Dashboard.route,
    Screen.OwnerHub.route,
    Screen.ManagerHub.route,
    Screen.SyncHistory.route,
    Screen.IntegrationSettings.route
  )

  val showBottomBar = currentRoute in bottomBarRoutes

  // Determine starting destination: if already connected, go straight to Dashboard
  val startDestination = if (activeConfig != null) Screen.Dashboard.route else Screen.Welcome.route

  Scaffold(
    contentWindowInsets = WindowInsets.safeDrawing,
    snackbarHost = { SnackbarHost(hostState = snackbarHostState) },
    bottomBar = {
      if (showBottomBar) {
        NavigationBar(
          containerColor = MaterialTheme.colorScheme.surface,
          contentColor = MaterialTheme.colorScheme.onSurface,
          modifier = Modifier.testTag("main_bottom_nav_bar")
        ) {
          bottomNavItems.forEach { item ->
            val isSelected = currentRoute == item.screen.route
            NavigationBarItem(
              icon = {
                Icon(
                  imageVector = if (isSelected) item.selectedIcon else item.unselectedIcon,
                  contentDescription = item.label
                )
              },
              label = { Text(text = item.label, fontSize = 11.sp) },
              selected = isSelected,
              onClick = {
                if (currentRoute != item.screen.route) {
                  navController.navigate(item.screen.route) {
                    popUpTo(navController.graph.findStartDestination().id) {
                      saveState = true
                    }
                    launchSingleTop = true
                    restoreState = true
                  }
                }
              },
              colors = NavigationBarItemDefaults.colors(
                indicatorColor = CyanNeon.copy(alpha = 0.2f),
                selectedIconColor = CyanNeon,
                selectedTextColor = CyanNeon,
                unselectedIconColor = MaterialTheme.colorScheme.onSurfaceVariant,
                unselectedTextColor = MaterialTheme.colorScheme.onSurfaceVariant
              ),
              modifier = Modifier.testTag(item.testTag)
            )
          }
        }
      }
    }
  ) { innerPadding ->
    Box(modifier = Modifier.fillMaxSize().padding(innerPadding)) {
      NavHost(
        navController = navController,
        startDestination = startDestination,
        modifier = Modifier.fillMaxSize()
      ) {
        // 1. Welcome Screen
        composable(Screen.Welcome.route) {
          WelcomeScreen(
            onGetStarted = { navController.navigate(Screen.ConnectWebsite.route) },
            onLaunchDemo = {
              viewModel.setWebsiteUrl("https://demo.sitepulse.internal")
              viewModel.setIntegrationName("Enterprise Sandbox Portal")
              navController.navigate(Screen.ConnectWebsite.route)
            }
          )
        }

        // 2. Connect Website Screen
        composable(Screen.ConnectWebsite.route) {
          BackHandler {
            if (activeConfig != null) {
              navController.navigate(Screen.Dashboard.route)
            } else {
              navController.navigate(Screen.Welcome.route)
            }
          }
          ConnectWebsiteScreen(
            websiteUrl = websiteUrlInput,
            integrationName = integrationNameInput,
            savedWebsites = savedWebsites,
            onUrlChanged = { viewModel.setWebsiteUrl(it) },
            onNameChanged = { viewModel.setIntegrationName(it) },
            onSwitchWebsite = { viewModel.switchActiveWebsite(it) },
            onProceedToAuth = { navController.navigate(Screen.SecureAuth.route) }
          )
        }

        // 3. Secure Auth Screen
        composable(Screen.SecureAuth.route) {
          BackHandler { navController.popBackStack() }
          SecureAuthScreen(
            targetUrl = websiteUrlInput,
            selectedAuthType = selectedAuthType,
            authToken = authTokenInput,
            apiKey = apiKeyInput,
            isOAuthInProgress = isOAuthInProgress,
            isSessionExpired = viewModel.isCurrentSessionExpired(),
            onAuthTypeSelected = { viewModel.setAuthType(it) },
            onTokenChanged = { viewModel.setAuthToken(it) },
            onApiKeyChanged = { viewModel.setApiKey(it) },
            onStartOAuthPkce = { onDone -> viewModel.startOAuth2PkceFlow(onDone) },
            onRefreshToken = { viewModel.refreshCurrentSession() },
            onStartDiscovery = {
              navController.navigate(Screen.DiscoveryProgress.route)
              viewModel.startDiscovery(onCompleted = {})
            },
            onBack = { navController.popBackStack() }
          )
        }

        // 4. Discovery Progress Screen
        composable(Screen.DiscoveryProgress.route) {
          BackHandler { navController.navigate(Screen.ConnectWebsite.route) }
          DiscoveryProgressScreen(
            progress = discoveryProgress,
            onViewAnalysis = { navController.navigate(Screen.AnalysisResults.route) },
            onRetry = {
              viewModel.startDiscovery {}
            }
          )
        }

        // 5. Analysis Results Screen
        composable(Screen.AnalysisResults.route) {
          BackHandler { navController.navigate(Screen.Dashboard.route) }
          AnalysisResultsScreen(
            report = transparentReport,
            config = activeConfig,
            onOpenDashboard = {
              navController.navigate(Screen.Dashboard.route) {
                popUpTo(Screen.Welcome.route) { inclusive = true }
              }
            }
          )
        }

        // 6. Dashboard Screen
        composable(Screen.Dashboard.route) {
          DashboardScreen(
            config = activeConfig,
            savedWebsites = savedWebsites,
            features = features,
            hubs = hubs,
            pagesCount = pages.size,
            assetsCount = assets.size,
            warningsCount = warnings.size,
            report = transparentReport,
            isSessionExpired = viewModel.isCurrentSessionExpired(),
            onSwitchWebsite = { viewModel.switchActiveWebsite(it) },
            onNavigateToOwnerHub = { navController.navigate(Screen.OwnerHub.route) },
            onNavigateToManagerHub = { navController.navigate(Screen.ManagerHub.route) },
            onNavigateToDiagnostics = { navController.navigate(Screen.Diagnostics.route) },
            onNavigateToConnect = { navController.navigate(Screen.ConnectWebsite.route) },
            onInspectFeature = { viewModel.inspectFeature(it) },
            onExecuteFeature = { viewModel.requestFeatureAction(it) },
            onRefreshSession = { viewModel.refreshCurrentSession() }
          )
        }

        // 7. Owner Hub Screen
        composable(Screen.OwnerHub.route) {
          OwnerHubScreen(
            features = features,
            onExecuteFeature = { viewModel.requestFeatureAction(it) },
            onInspectFeature = { viewModel.inspectFeature(it) }
          )
        }

        // 8. Manager Hub Screen
        composable(Screen.ManagerHub.route) {
          ManagerHubScreen(
            features = features,
            onExecuteFeature = { viewModel.requestFeatureAction(it) },
            onInspectFeature = { viewModel.inspectFeature(it) }
          )
        }

        // 9. Sync History Screen
        composable(Screen.SyncHistory.route) {
          SyncHistoryScreen(
            syncLogs = syncLogs,
            onTriggerSync = {
              navController.navigate(Screen.DiscoveryProgress.route)
              viewModel.startDiscovery {}
            }
          )
        }

        // 10. Integration Settings Screen
        composable(Screen.IntegrationSettings.route) {
          IntegrationSettingsScreen(
            config = activeConfig,
            onDisconnect = {
              viewModel.disconnectWebsite()
              navController.navigate(Screen.Welcome.route) {
                popUpTo(0) { inclusive = true }
              }
            },
            onOpenDiagnostics = { navController.navigate(Screen.Diagnostics.route) },
            onOpenWebHub = { navController.navigate(Screen.WebHub.route) }
          )
        }

        // 11. Diagnostics Screen
        composable(Screen.Diagnostics.route) {
          BackHandler { navController.popBackStack() }
          DiagnosticsScreen(
            diagnosticLogs = diagnosticLogs,
            targetUrl = activeConfig?.url ?: websiteUrlInput,
            onBack = { navController.popBackStack() },
            onRerunDiagnostics = {
              navController.navigate(Screen.DiscoveryProgress.route)
              viewModel.startDiscovery {}
            }
          )
        }

        // 12. Full Web Management Hub Screen
        composable(Screen.WebHub.route) {
          WebHubScreen(
            onBack = { navController.popBackStack() }
          )
        }
      }

      // Destructive Action Approval Dialog
      pendingApprovalFeature?.let { feat ->
        DestructiveActionApprovalDialog(
          feature = feat,
          onConfirm = { viewModel.confirmDestructiveAction() },
          onDismiss = { viewModel.cancelDestructiveAction() }
        )
      }

      // Feature Detail & AI Plan Inspector Dialog
      inspectedFeature?.let { feat ->
        FeatureDetailInspectorDialog(
          feature = feat,
          plan = inspectedFeaturePlan,
          onExecute = { viewModel.requestFeatureAction(feat) },
          onDismiss = { viewModel.clearFeatureInspection() }
        )
      }
    }
  }
}
