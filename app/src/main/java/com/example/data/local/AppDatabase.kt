package com.example.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(
  entities = [
    WebsiteConfigEntity::class,
    DiscoveredHubEntity::class,
    DiscoveredFeatureEntity::class,
    DiscoveredPageEntity::class,
    DiscoveredWorkflowEntity::class,
    DiscoveredAssetEntity::class,
    DiscoveryWarningEntity::class,
    SyncHistoryEntity::class,
    DiagnosticLogEntity::class
  ],
  version = 2,
  exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
  abstract fun websiteConfigDao(): WebsiteConfigDao
  abstract fun hubDao(): HubDao
  abstract fun featureDao(): FeatureDao
  abstract fun pageDao(): PageDao
  abstract fun workflowDao(): WorkflowDao
  abstract fun assetDao(): AssetDao
  abstract fun warningDao(): WarningDao
  abstract fun syncHistoryDao(): SyncHistoryDao
  abstract fun diagnosticsDao(): DiagnosticsDao

  companion object {
    @Volatile
    private var INSTANCE: AppDatabase? = null

    fun getDatabase(context: Context): AppDatabase {
      return INSTANCE ?: synchronized(this) {
        val instance = Room.databaseBuilder(
          context.applicationContext,
          AppDatabase::class.java,
          "sitepulse_database.db"
        )
          .fallbackToDestructiveMigration()
          .build()
        INSTANCE = instance
        instance
      }
    }
  }
}
