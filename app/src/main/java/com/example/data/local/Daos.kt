package com.example.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import androidx.room.Transaction
import kotlinx.coroutines.flow.Flow

@Dao
interface WebsiteConfigDao {
  @Query("SELECT * FROM website_configs WHERE isCurrentActive = 1 LIMIT 1")
  fun getActiveConfig(): Flow<WebsiteConfigEntity?>

  @Query("SELECT * FROM website_configs ORDER BY lastSyncTime DESC")
  fun getAllSavedConfigs(): Flow<List<WebsiteConfigEntity>>

  @Query("SELECT * FROM website_configs WHERE id = :id LIMIT 1")
  suspend fun getConfigById(id: String): WebsiteConfigEntity?

  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun insertOrUpdateConfig(config: WebsiteConfigEntity)

  @Query("UPDATE website_configs SET isCurrentActive = 0")
  suspend fun deactivateAllConfigs()

  @Transaction
  suspend fun switchActiveConfig(id: String) {
    deactivateAllConfigs()
    activateConfig(id)
  }

  @Query("UPDATE website_configs SET isCurrentActive = 1 WHERE id = :id")
  suspend fun activateConfig(id: String)

  @Query("DELETE FROM website_configs WHERE id = :id")
  suspend fun deleteConfig(id: String)

  @Query("DELETE FROM website_configs")
  suspend fun clearConfigs()
}

@Dao
interface HubDao {
  @Query("SELECT * FROM discovered_hubs WHERE websiteId = :websiteId ORDER BY orderIndex ASC")
  fun getHubsForWebsite(websiteId: String): Flow<List<DiscoveredHubEntity>>

  @Query("SELECT * FROM discovered_hubs WHERE websiteId = :websiteId AND type = :type ORDER BY orderIndex ASC")
  fun getHubsByType(websiteId: String, type: String): Flow<List<DiscoveredHubEntity>>

  @Query("SELECT * FROM discovered_hubs WHERE websiteId = :websiteId AND isAuthorizedForUser = 1 ORDER BY orderIndex ASC")
  fun getAuthorizedHubs(websiteId: String): Flow<List<DiscoveredHubEntity>>

  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun insertHubs(hubs: List<DiscoveredHubEntity>)

  @Query("DELETE FROM discovered_hubs WHERE websiteId = :websiteId")
  suspend fun clearHubsForWebsite(websiteId: String)
}

@Dao
interface FeatureDao {
  @Query("SELECT * FROM discovered_features WHERE websiteId = :websiteId")
  fun getFeaturesForWebsite(websiteId: String): Flow<List<DiscoveredFeatureEntity>>

  @Query("SELECT * FROM discovered_features WHERE hubId = :hubId")
  fun getFeaturesByHub(hubId: String): Flow<List<DiscoveredFeatureEntity>>

  @Query("SELECT * FROM discovered_features WHERE websiteId = :websiteId AND classification = :classification")
  fun getFeaturesByClassification(websiteId: String, classification: String): Flow<List<DiscoveredFeatureEntity>>

  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun insertFeatures(features: List<DiscoveredFeatureEntity>)

  @Query("DELETE FROM discovered_features WHERE websiteId = :websiteId")
  suspend fun clearFeaturesForWebsite(websiteId: String)
}

@Dao
interface PageDao {
  @Query("SELECT * FROM discovered_pages WHERE websiteId = :websiteId")
  fun getPagesForWebsite(websiteId: String): Flow<List<DiscoveredPageEntity>>

  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun insertPages(pages: List<DiscoveredPageEntity>)

  @Query("DELETE FROM discovered_pages WHERE websiteId = :websiteId")
  suspend fun clearPages(websiteId: String)
}

@Dao
interface WorkflowDao {
  @Query("SELECT * FROM discovered_workflows WHERE websiteId = :websiteId")
  fun getWorkflowsForWebsite(websiteId: String): Flow<List<DiscoveredWorkflowEntity>>

  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun insertWorkflows(workflows: List<DiscoveredWorkflowEntity>)

  @Query("DELETE FROM discovered_workflows WHERE websiteId = :websiteId")
  suspend fun clearWorkflows(websiteId: String)
}

@Dao
interface AssetDao {
  @Query("SELECT * FROM discovered_assets WHERE websiteId = :websiteId")
  fun getAssetsForWebsite(websiteId: String): Flow<List<DiscoveredAssetEntity>>

  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun insertAssets(assets: List<DiscoveredAssetEntity>)

  @Query("DELETE FROM discovered_assets WHERE websiteId = :websiteId")
  suspend fun clearAssets(websiteId: String)
}

@Dao
interface WarningDao {
  @Query("SELECT * FROM discovery_warnings WHERE websiteId = :websiteId ORDER BY timestamp DESC")
  fun getWarningsForWebsite(websiteId: String): Flow<List<DiscoveryWarningEntity>>

  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun insertWarnings(warnings: List<DiscoveryWarningEntity>)

  @Query("DELETE FROM discovery_warnings WHERE websiteId = :websiteId")
  suspend fun clearWarnings(websiteId: String)
}

@Dao
interface SyncHistoryDao {
  @Query("SELECT * FROM sync_history ORDER BY timestamp DESC LIMIT 50")
  fun getRecentSyncHistory(): Flow<List<SyncHistoryEntity>>

  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun insertSyncLog(log: SyncHistoryEntity)

  @Query("DELETE FROM sync_history")
  suspend fun clearHistory()
}

@Dao
interface DiagnosticsDao {
  @Query("SELECT * FROM diagnostic_logs ORDER BY timestamp DESC LIMIT 100")
  fun getDiagnosticLogs(): Flow<List<DiagnosticLogEntity>>

  @Insert(onConflict = OnConflictStrategy.REPLACE)
  suspend fun insertDiagnosticLog(log: DiagnosticLogEntity)

  @Query("DELETE FROM diagnostic_logs")
  suspend fun clearLogs()
}
