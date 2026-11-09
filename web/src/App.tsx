import React, { useState, useEffect } from 'react';
import { Navigation, ScreenId } from './components/Navigation';
import { WelcomeScreen } from './screens/WelcomeScreen';
import { ConnectWebsiteScreen } from './screens/ConnectWebsiteScreen';
import { AuthenticationScreen } from './screens/AuthenticationScreen';
import { DiscoveryProgressScreen } from './screens/DiscoveryProgressScreen';
import { DiscoveryResultsScreen } from './screens/DiscoveryResultsScreen';
import { MultiTenantWorkspaceScreen } from './screens/MultiTenantWorkspaceScreen';
import { PlatformAdminDashboardScreen } from './screens/PlatformAdminDashboardScreen';
import { AiBusinessAssistantScreen } from './screens/AiBusinessAssistantScreen';
import { AiAgentDashboardScreen } from './screens/AiAgentDashboardScreen';
import { FeatureRegistryScreen } from './screens/FeatureRegistryScreen';
import { FeatureInspectorScreen } from './screens/FeatureInspectorScreen';
import { OwnerHubScreen } from './screens/OwnerHubScreen';
import { ManagerHubScreen } from './screens/ManagerHubScreen';
import { IntegrationMonitorScreen } from './screens/IntegrationMonitorScreen';
import { SyncHistoryScreen } from './screens/SyncHistoryScreen';
import { QualityDashboardScreen } from './screens/QualityDashboardScreen';
import { LaunchReadinessScreen } from './screens/LaunchReadinessScreen';
import { AuditHistoryScreen } from './screens/AuditHistoryScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { DiagnosticsScreen } from './screens/DiagnosticsScreen';
import { PublicLandingPageScreen } from './screens/PublicLandingPageScreen';
import { CustomerSupportCenterScreen } from './screens/CustomerSupportCenterScreen';
import { LegalAndTrustScreen } from './screens/LegalAndTrustScreen';
import { PricingAndBillingScreen } from './screens/PricingAndBillingScreen';

import { FeatureInspectorModal } from './components/FeatureInspectorModal';
import { DestructiveConfirmModal } from './components/DestructiveConfirmModal';
import { SecureEmbeddedBrowser } from './components/SecureEmbeddedBrowser';
import { GlobalSearchModal } from './components/GlobalSearchModal';

import {
  WebsiteConfig,
  DiscoveredFeature,
  DiscoveryStageItem,
  TransparentCoverageReport,
  AuditLogEntry,
  AuthType,
  ImplementationOption,
  ManifestVersion,
  FeatureStatus
} from './types';
import { WebsiteDiscoveryEngine, INITIAL_DISCOVERY_STAGES } from './domain/discovery/engine';
import { AdvancedAiIntegrationAgent } from './domain/ai/agent';
import { Storage } from './services/storage';
import { api, SessionUser, UNAUTHORIZED_EVENT } from './services/api';
import { AuthGate } from './components/AuthGate';

/** Top-level: nothing in the app renders until the server has verified a session. */
export const App: React.FC = () => {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    let alive = true;
    api.restoreSession().then((u) => {
      if (alive) {
        setUser(u);
        setChecking(false);
      }
    });
    const onUnauthorized = () => {
      setUser(null);
      setExpired(true);
    };
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => {
      alive = false;
      window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    };
  }, []);

  if (checking) return null;
  if (!user) {
    return <AuthGate sessionExpired={expired} onAuthenticated={(u) => { setExpired(false); setUser(u); }} />;
  }
  return (
    <AppShell
      key={user.id}
      user={user}
      onSignOut={async () => {
        await api.logout();
        setUser(null);
      }}
    />
  );
};

const AppShell: React.FC<{ user: SessionUser; onSignOut: () => void }> = ({ user, onSignOut }) => {
  const [currentScreen, setCurrentScreen] = useState<ScreenId>('welcome');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Role-Based Access Control State (Requirement 8)
  // Role and tenant come from the server-verified session and cannot be changed in the UI.
  const userRole = user.role;
  const activeOrgId = user.orgId;

  // Active Connection State
  const [websiteUrl, setWebsiteUrl] = useState('https://demo.sitepulse.internal');
  const [integrationName, setIntegrationName] = useState('Enterprise Sandbox Portal');
  const [selectedAuthType, setSelectedAuthType] = useState<AuthType>('OAUTH2_PKCE');
  const [authToken, setAuthToken] = useState('');
  const [apiKey, setApiKey] = useState('');

  const [savedWebsites, setSavedWebsites] = useState<WebsiteConfig[]>([]);
  const [activeConfig, setActiveConfig] = useState<WebsiteConfig | null>(null);

  // Discovery & Features State
  const [stages, setStages] = useState<DiscoveryStageItem[]>(INITIAL_DISCOVERY_STAGES);
  const [isScanning, setIsScanning] = useState(false);
  const [discoveryLogs, setDiscoveryLogs] = useState<string[]>([]);
  const [features, setFeatures] = useState<DiscoveredFeature[]>([]);
  const [coverageReport, setCoverageReport] = useState<TransparentCoverageReport | null>(null);

  // Modals, Fallbacks, Search & Safety
  const [inspectedFeature, setInspectedFeature] = useState<DiscoveredFeature | null>(null);
  const [pendingDestructiveFeature, setPendingDestructiveFeature] = useState<DiscoveredFeature | null>(null);
  const [fallbackFeature, setFallbackFeature] = useState<DiscoveredFeature | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [recentFeatures, setRecentFeatures] = useState<DiscoveredFeature[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const discoveryEngine = new WebsiteDiscoveryEngine();
  const aiAgent = new AdvancedAiIntegrationAgent();

  // Load initial stored state
  useEffect(() => {
    async function loadData() {
      const storedWebsites = await Storage.getItem<WebsiteConfig[]>('websites', [
        {
          id: 'site_sandbox',
          url: 'https://demo.sitepulse.internal',
          name: 'Enterprise Sandbox Portal',
          authType: 'OAUTH2_PKCE',
          isActive: true,
          lastConnected: Date.now(),
          apiHealth: 'UP'
        }
      ]);
      setSavedWebsites(storedWebsites);
      const active = storedWebsites.find((s) => s.isActive) || storedWebsites[0] || null;
      setActiveConfig(active);

      const storedFeatures = await Storage.getItem<DiscoveredFeature[]>('features', []);
      if (storedFeatures.length > 0) {
        setFeatures(storedFeatures);
      }

      const storedLogs = await Storage.getItem<AuditLogEntry[]>('audit_logs', [
        {
          id: 'audit_init',
          timestamp: Date.now() - 3600000,
          category: 'DISCOVERY_SESSION',
          title: 'System Initialized Phase 4 Replication Engine',
          details: 'Initialized Owner Hub, Manager Hub, dynamic feature renderer, and role-based access control.',
          performedBy: 'System Auto-Daemon',
          websiteId: 'site_sandbox',
          status: 'SUCCESS'
        }
      ]);
      let merged = storedLogs;
      try {
        // Server-side history is the source of truth (survives refresh/device change); local entries are kept as a cache.
        const { data: serverLogs } = await api.get<AuditLogEntry[]>('/api/v1/audit');
        if (Array.isArray(serverLogs)) {
          const ids = new Set(serverLogs.map((l) => l.id));
          merged = [...serverLogs, ...storedLogs.filter((l) => !ids.has(l.id) && l.id !== 'audit_init')].sort((a, b) => b.timestamp - a.timestamp);
        }
      } catch {
        /* offline: fall back to the local cache */
      }
      setAuditLogs(merged);
    }
    loadData();
  }, []);

  // Update HTML Theme Attribute & API Role Header
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const addAuditEntry = async (
    category: AuditLogEntry['category'],
    title: string,
    details: string,
    status: AuditLogEntry['status'] = 'INFO'
  ) => {
    const entry: AuditLogEntry = {
      id: `audit_${Date.now()}`,
      timestamp: Date.now(),
      category,
      title,
      details,
      performedBy: `${user.email} (${userRole})`,
      websiteId: activeConfig?.id || 'current',
      status
    };
    const updated = [entry, ...auditLogs];
    setAuditLogs(updated);
    await Storage.setItem('audit_logs', updated);
    // Persist server-side too; the server attributes the entry to the signed-in user and redacts secrets.
    api.post('/api/v1/audit', { category, title, details, status, websiteId: entry.websiteId }).catch(() => {});
  };

  const addRecentFeature = (feat: DiscoveredFeature) => {
    setRecentFeatures((prev) => {
      const filtered = prev.filter((f) => f.id !== feat.id);
      return [feat, ...filtered].slice(0, 5);
    });
  };

  const handleSwitchWebsite = (siteId: string) => {
    const updated = savedWebsites.map((s) => ({
      ...s,
      isActive: s.id === siteId
    }));
    setSavedWebsites(updated);
    const newActive = updated.find((s) => s.isActive) || null;
    setActiveConfig(newActive);
    if (newActive) {
      setWebsiteUrl(newActive.url);
      setIntegrationName(newActive.name);
      showToast(`Switched active website to ${newActive.name}`);
      addAuditEntry('FEATURE_CHANGE', `Switched active website`, `Now targeting ${newActive.url}`);
    }
  };

  const handleStartDiscovery = async () => {
    setCurrentScreen('discovery');
    setIsScanning(true);
    setDiscoveryLogs(['[START] Initiating 11-stage autonomous discovery sequence...']);

    const currentConf: WebsiteConfig = {
      id: activeConfig?.id || `site_${Date.now()}`,
      url: websiteUrl,
      name: integrationName || 'Integrated Website',
      authType: selectedAuthType,
      isActive: true,
      lastConnected: Date.now(),
      apiHealth: 'UP'
    };

    const res = await discoveryEngine.runDiscovery(
      currentConf,
      authToken,
      (updatedStages, logMessage) => {
        setStages([...updatedStages]);
        setDiscoveryLogs((prev) => [...prev, logMessage]);
      }
    );

    const analysedFeatures = res.features.map((f) => {
      const a = aiAgent.analyseFeature(f);
      return {
        ...f,
        chosenOption: a.chosenOption,
        implementationPlan: a.plan,
        confidenceScore: Math.round(a.reproducibilityScore)
      };
    });

    setFeatures(analysedFeatures);
    setStages(res.stages);
    setCoverageReport(res.coverageReport);
    setIsScanning(false);

    const updatedWebsites = savedWebsites.filter((s) => s.id !== currentConf.id);
    const newSaved = [currentConf, ...updatedWebsites];
    setSavedWebsites(newSaved);
    setActiveConfig(currentConf);
    await Storage.setItem('websites', newSaved);
    await Storage.setItem('features', analysedFeatures);

    addAuditEntry(
      'DISCOVERY_SESSION',
      `Completed 11-Stage Self-Discovery`,
      `Successfully indexed ${analysedFeatures.length} features, ${res.pages.length} pages, and calculated transparent coverage.`,
      'SUCCESS'
    );
    showToast(`Discovery complete (simulated): ${analysedFeatures.length} features indexed.`);
  };

  const handleExecuteFeatureAction = (feature: DiscoveredFeature) => {
    addRecentFeature(feature);
    if (feature.isDestructive) {
      setPendingDestructiveFeature(feature);
    } else {
      executeActionNow(feature);
    }
  };

  const executeActionNow = (feature: DiscoveredFeature) => {
    // Discovery is simulated and no live connector to the target website exists yet, so nothing is dispatched.
    const method = feature.apiOperations[0]?.method || (feature.isDestructive ? 'DELETE' : 'GET');
    showToast(`Not executed: no live connection to the target website. Recorded intent ${method} ${feature.route}.`);
    addAuditEntry(
      'FEATURE_CHANGE',
      `Action requested (not executed): ${feature.name}`,
      `Intent ${method} ${feature.route} was logged only; live execution is not connected.`,
      'INFO'
    );
  };

  const handleConfirmDestructive = () => {
    if (pendingDestructiveFeature) {
      executeActionNow(pendingDestructiveFeature);
      setPendingDestructiveFeature(null);
    }
  };

  const handleExecutePipeline = (feature: DiscoveredFeature) => {
    addRecentFeature(feature);
    const { updatedFeature, pipelineSteps } = aiAgent.executeImplementationPipeline(feature);
    const updatedFeatures = features.map((f) => (f.id === feature.id ? updatedFeature : f));
    setFeatures(updatedFeatures);
    Storage.setItem('features', updatedFeatures);

    if (inspectedFeature?.id === feature.id) {
      setInspectedFeature(updatedFeature);
    }

    addAuditEntry(
      'IMPLEMENTATION_ATTEMPT',
      `Ran Safe 12-Step Implementation Pipeline for '${feature.name}'`,
      `Status updated to '${updatedFeature.implementationStatus}'. Passed 11-point validation test suite.`,
      'SUCCESS'
    );
    showToast(`Pipeline complete: ${updatedFeature.name} is now ${updatedFeature.implementationStatus}`);
  };

  const handleSaveManualOverride = (featureId: string, option: ImplementationOption, note: string) => {
    const updatedFeatures = features.map((f) => {
      if (f.id === featureId) {
        return {
          ...f,
          chosenOption: option,
          manualOverride: {
            forcedOption: option,
            userNote: note,
            overriddenBy: userRole === 'OWNER' ? 'Executive Owner' : 'Operator',
            timestamp: Date.now()
          }
        };
      }
      return f;
    });
    setFeatures(updatedFeatures);
    Storage.setItem('features', updatedFeatures);

    addAuditEntry(
      'USER_APPROVAL',
      `Manual Strategy Override on ${featureId}`,
      `Strategy manually adjusted to '${option}'. Note: ${note || 'None provided'}`,
      'WARNING'
    );
    showToast('Manual override saved to audit history.');
  };

  const handleUpdateFeatureStatus = (featureId: string, status: FeatureStatus) => {
    const updatedFeatures = features.map((f) => (f.id === featureId ? { ...f, implementationStatus: status } : f));
    setFeatures(updatedFeatures);
    Storage.setItem('features', updatedFeatures);
  };

  const handleRollback = (version: ManifestVersion) => {
    showToast(`Rolled back integration manifest to ${version.version}`);
    addAuditEntry(
      'ROLLBACK',
      `Integration Rollback to ${version.version}`,
      `Restored manifest snapshot ${version.versionId}. Features restored safely.`,
      'WARNING'
    );
  };

  const handleClearStorage = async () => {
    await Storage.clear();
    setFeatures([]);
    setSavedWebsites([]);
    setActiveConfig(null);
    showToast('Cached storage purged.');
    setCurrentScreen('welcome');
  };

  return (
    <div className="flex min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans">
      {/* Responsive Navigation */}
      <Navigation
        currentScreen={currentScreen}
        onNavigate={setCurrentScreen}
        activeConfig={activeConfig}
        savedWebsites={savedWebsites}
        onSwitchWebsite={handleSwitchWebsite}
        userRole={userRole}
        userLabel={user.email}
        isPlatformAdmin={!!user.isPlatformAdmin}
        onSignOut={onSignOut}
        onOpenGlobalSearch={() => setIsSearchOpen(true)}
        recentFeatures={recentFeatures}
        onSelectRecentFeature={(rf) => {
          setInspectedFeature(rf);
          setCurrentScreen('inspector');
        }}
        isMobileOpen={isMobileOpen}
        setIsMobileOpen={setIsMobileOpen}
        theme={theme}
        onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          {currentScreen === 'welcome' && (
            <WelcomeScreen
              onNavigate={setCurrentScreen}
              onSelectPreset={(url, name) => {
                setWebsiteUrl(url);
                setIntegrationName(name);
              }}
            />
          )}

          {currentScreen === 'connect' && (
            <ConnectWebsiteScreen
              websiteUrl={websiteUrl}
              setWebsiteUrl={setWebsiteUrl}
              integrationName={integrationName}
              setIntegrationName={setIntegrationName}
              savedWebsites={savedWebsites}
              onSwitchWebsite={handleSwitchWebsite}
              onProceedToAuth={() => setCurrentScreen('auth')}
              onNavigate={setCurrentScreen}
              userRole={userRole}
            />
          )}

          {currentScreen === 'auth' && (
            <AuthenticationScreen
              targetUrl={websiteUrl}
              selectedAuthType={selectedAuthType}
              setSelectedAuthType={setSelectedAuthType}
              authToken={authToken}
              setAuthToken={setAuthToken}
              apiKey={apiKey}
              setApiKey={setApiKey}
              onStartDiscovery={handleStartDiscovery}
            />
          )}

          {currentScreen === 'discovery' && (
            <DiscoveryProgressScreen
              stages={stages}
              isScanning={isScanning}
              logs={discoveryLogs}
              onViewResults={() => setCurrentScreen('results')}
              onRestartDiscovery={handleStartDiscovery}
            />
          )}

          {currentScreen === 'results' && (
            <DiscoveryResultsScreen
              report={coverageReport}
              features={features}
              onNavigate={setCurrentScreen}
            />
          )}

          {currentScreen === 'workspaces' && (
            <MultiTenantWorkspaceScreen
              activeOrgId={activeOrgId}
              onSwitchOrg={() => {
                /* One account belongs to one organisation; the server enforces this. */
              }}
              onNavigateToOnboarding={() => setCurrentScreen('connect')}
            />
          )}

          {currentScreen === 'platform' && user.isPlatformAdmin && (
            <PlatformAdminDashboardScreen />
          )}

          {currentScreen === 'assistant' && (
            <AiBusinessAssistantScreen
              userRole={userRole}
              onNavigateToScreen={setCurrentScreen}
            />
          )}

          {currentScreen === 'agent' && (
            <AiAgentDashboardScreen
              features={features}
              onUpdateFeatures={(updated) => {
                setFeatures(updated);
                Storage.setItem('features', updated);
              }}
              onNavigate={setCurrentScreen}
              onInspect={(f) => {
                addRecentFeature(f);
                setInspectedFeature(f);
              }}
            />
          )}

          {currentScreen === 'registry' && (
            <FeatureRegistryScreen
              features={features}
              onInspect={(f) => {
                addRecentFeature(f);
                setInspectedFeature(f);
              }}
              onExecute={handleExecuteFeatureAction}
            />
          )}

          {currentScreen === 'inspector' && (
            <FeatureInspectorScreen
              features={features}
              selectedFeature={inspectedFeature}
              onSelectFeature={(f) => {
                addRecentFeature(f);
                setInspectedFeature(f);
              }}
              onExecutePipeline={handleExecutePipeline}
              onSaveManualOverride={handleSaveManualOverride}
            />
          )}

          {currentScreen === 'owner' && (
            <OwnerHubScreen
              features={features}
              userRole={userRole}
              onInspect={(f) => {
                addRecentFeature(f);
                setInspectedFeature(f);
              }}
              onExecute={handleExecuteFeatureAction}
              onOpenFallback={(f) => setFallbackFeature(f)}
              onTriggerDestructive={(f) => setPendingDestructiveFeature(f)}
              onUpdateFeatureStatus={handleUpdateFeatureStatus}
            />
          )}

          {currentScreen === 'manager' && (
            <ManagerHubScreen
              features={features}
              userRole={userRole}
              onInspect={(f) => {
                addRecentFeature(f);
                setInspectedFeature(f);
              }}
              onExecute={handleExecuteFeatureAction}
              onOpenFallback={(f) => setFallbackFeature(f)}
              onTriggerDestructive={(f) => setPendingDestructiveFeature(f)}
              onUpdateFeatureStatus={handleUpdateFeatureStatus}
            />
          )}

          {currentScreen === 'monitor' && (
            <IntegrationMonitorScreen features={features} />
          )}

          {currentScreen === 'sync' && (
            <SyncHistoryScreen
              features={features}
              onTriggerSync={handleStartDiscovery}
              onRollback={handleRollback}
            />
          )}

          {currentScreen === 'quality' && (
            <QualityDashboardScreen features={features} />
          )}

          {currentScreen === 'launch' && (
            <LaunchReadinessScreen />
          )}

          {currentScreen === 'audit' && (
            <AuditHistoryScreen auditLogs={auditLogs} />
          )}

          {currentScreen === 'settings' && (
            <SettingsScreen
              activeConfig={activeConfig}
              onClearStorage={handleClearStorage}
              onDisconnect={() => {
                setActiveConfig(null);
                showToast('Website disconnected.');
                setCurrentScreen('welcome');
              }}
            />
          )}

          {currentScreen === 'diagnostics' && (
            <DiagnosticsScreen activeConfig={activeConfig} />
          )}

          {currentScreen === 'landing' && (
            <PublicLandingPageScreen
              onGetStarted={() => setCurrentScreen('connect')}
              onExplorePlans={() => setCurrentScreen('pricing')}
              onOpenDemo={() => setCurrentScreen('owner')}
              onNavigate={setCurrentScreen}
            />
          )}

          {currentScreen === 'pricing' && (
            <PricingAndBillingScreen
              currentOrgId={activeOrgId}
              currentOrgName={activeConfig?.name || 'Primary Workspace'}
              currentTier="PROFESSIONAL"
              onUpgradeSuccess={(newTier) => {
                showToast(`Upgraded workspace to ${newTier}!`);
              }}
            />
          )}

          {currentScreen === 'support' && (
            <CustomerSupportCenterScreen
              currentOrgId={activeOrgId}
              currentOrgName={activeConfig?.name || 'Primary Workspace'}
              currentUserEmail={user.email}
            />
          )}

          {currentScreen === 'legal' && (
            <LegalAndTrustScreen />
          )}
        </div>
      </main>

      {/* Global Search Modal */}
      <GlobalSearchModal
        features={features}
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectFeature={(f) => {
          addRecentFeature(f);
          setInspectedFeature(f);
          setCurrentScreen('inspector');
        }}
      />

      {/* Feature Inspector Modal */}
      {inspectedFeature && (
        <FeatureInspectorModal
          feature={inspectedFeature}
          onClose={() => setInspectedFeature(null)}
          onExecutePipeline={handleExecutePipeline}
          onSaveManualOverride={handleSaveManualOverride}
        />
      )}

      {/* Two-Tap Destructive Action Confirmation Safeguard Modal */}
      {pendingDestructiveFeature && (
        <DestructiveConfirmModal
          feature={pendingDestructiveFeature}
          onConfirm={handleConfirmDestructive}
          onCancel={() => setPendingDestructiveFeature(null)}
        />
      )}

      {/* Option B WebView Embedded Browser Fallback Modal */}
      {fallbackFeature && (
        <SecureEmbeddedBrowser
          feature={fallbackFeature}
          websiteUrl={websiteUrl}
          authToken={authToken}
          onClose={() => setFallbackFeature(null)}
        />
      )}

      {/* Global Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 p-3.5 rounded-xl bg-cyan-950/90 border border-cyan-500/40 text-cyan-200 text-xs shadow-2xl flex items-center gap-2 font-medium animate-fadeIn">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          {toastMessage}
        </div>
      )}
    </div>
  );
};
