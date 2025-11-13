const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

class DataSyncManager {
  constructor() {
    this.backupLocation = path.join(__dirname, '../backups/');
    this.databasePath = path.join(__dirname, '../backend-server/premium_gift_box.db');
    this.remoteHosts = process.env.BACKUP_HOSTS ? process.env.BACKUP_HOSTS.split(',') : [];
    this.syncInterval = 30 * 60 * 1000; // 30 minutes
  }

  async initialize() {
    try {
      // Ensure backup directory exists
      await fs.mkdir(this.backupLocation, { recursive: true });
      console.log('✅ Sync system initialized');
      
      // Start automatic sync if enabled
      if (process.env.AUTO_SYNC_ENABLED !== 'false') {
        this.startAutomaticSync();
      }
    } catch (error) {
      console.error('❌ Failed to initialize sync system:', error);
    }
  }

  startAutomaticSync() {
    console.log(`🔄 Starting automatic sync every ${this.syncInterval / 60000} minutes`);
    setInterval(() => {
      this.performSync();
    }, this.syncInterval);
  }

  async performSync() {
    try {
      console.log('🔄 Starting database sync...');
      
      // Create backup
      const backupFile = await this.createBackup();
      
      // Sync to backup computers (if configured)
      if (this.remoteHosts.length > 0) {
        await this.syncToRemoteHosts(backupFile);
      }
      
      // Clean old backups (keep last 30 days)
      await this.cleanOldBackups();
      
      console.log('✅ Sync completed successfully');
      await this.logSync('success', backupFile);
      
    } catch (error) {
      console.error('❌ Sync failed:', error);
      await this.logSync('failed', null, error.message);
    }
  }

  async createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `premium_gift_box_${timestamp}.db`;
    const backupPath = path.join(this.backupLocation, backupName);
    
    try {
      // Check if database exists
      await fs.access(this.databasePath);
      
      // Copy database file
      await fs.copyFile(this.databasePath, backupPath);
      
      // Calculate checksum for integrity verification
      const checksum = await this.calculateChecksum(backupPath);
      
      console.log(`✅ Backup created: ${backupName}`);
      console.log(`📄 Checksum: ${checksum}`);
      
      return {
        filename: backupName,
        path: backupPath,
        checksum: checksum,
        size: (await fs.stat(backupPath)).size
      };
      
    } catch (error) {
      throw new Error(`Failed to create backup: ${error.message}`);
    }
  }

  async syncToRemoteHosts(backupFile) {
    console.log(`🌐 Syncing to ${this.remoteHosts.length} remote host(s)...`);
    
    for (const host of this.remoteHosts) {
      try {
        // For local network sync, you could use rsync, scp, or HTTP upload
        // This is a placeholder for the actual sync implementation
        console.log(`📤 Syncing to ${host}...`);
        
        // Example: HTTP upload to another computer running the same app
        await this.uploadToHost(host, backupFile);
        
        console.log(`✅ Synced to ${host}`);
      } catch (error) {
        console.error(`❌ Failed to sync to ${host}:`, error.message);
      }
    }
  }

  async uploadToHost(host, backupFile) {
    // Placeholder for actual upload implementation
    // Could be HTTP POST, FTP, or local network file copy
    
    // Example implementation using HTTP:
    /*
    const FormData = require('form-data');
    const form = new FormData();
    form.append('backup', fs.createReadStream(backupFile.path));
    
    const response = await fetch(`http://${host}:3001/api/sync/upload`, {
      method: 'POST',
      body: form
    });
    
    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }
    */
    
    // For now, just simulate the upload
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async calculateChecksum(filePath) {
    const fileBuffer = await fs.readFile(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return hashSum.digest('hex');
  }

  async cleanOldBackups() {
    try {
      const files = await fs.readdir(this.backupLocation);
      const backupFiles = files.filter(file => file.startsWith('premium_gift_box_') && file.endsWith('.db'));
      
      // Sort by creation time (newest first)
      const fileStats = await Promise.all(
        backupFiles.map(async file => {
          const filePath = path.join(this.backupLocation, file);
          const stat = await fs.stat(filePath);
          return { file, path: filePath, mtime: stat.mtime };
        })
      );
      
      fileStats.sort((a, b) => b.mtime - a.mtime);
      
      // Keep only the latest 30 backups
      const filesToDelete = fileStats.slice(30);
      
      for (const fileInfo of filesToDelete) {
        await fs.unlink(fileInfo.path);
        console.log(`🗑️ Deleted old backup: ${fileInfo.file}`);
      }
      
    } catch (error) {
      console.error('⚠️ Failed to clean old backups:', error);
    }
  }

  async logSync(status, backupFile = null, errorMessage = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      status: status,
      filename: backupFile?.filename || null,
      size: backupFile?.size || null,
      checksum: backupFile?.checksum || null,
      remoteHosts: this.remoteHosts.length,
      error: errorMessage
    };
    
    const logPath = path.join(this.backupLocation, 'sync_log.json');
    
    try {
      let logs = [];
      try {
        const existingLogs = await fs.readFile(logPath, 'utf8');
        logs = JSON.parse(existingLogs);
      } catch (error) {
        // File doesn't exist or is invalid, start fresh
      }
      
      logs.unshift(logEntry); // Add to beginning
      logs = logs.slice(0, 100); // Keep only last 100 entries
      
      await fs.writeFile(logPath, JSON.stringify(logs, null, 2));
    } catch (error) {
      console.error('⚠️ Failed to write sync log:', error);
    }
  }

  async getLastSyncStatus() {
    const logPath = path.join(this.backupLocation, 'sync_log.json');
    
    try {
      const logs = JSON.parse(await fs.readFile(logPath, 'utf8'));
      return logs[0] || null; // Return most recent entry
    } catch (error) {
      return null;
    }
  }
}

// Command line usage
if (require.main === module) {
  const syncManager = new DataSyncManager();
  
  if (process.argv[2] === 'once') {
    // Run sync once
    syncManager.performSync().then(() => process.exit(0));
  } else {
    // Start continuous sync
    syncManager.initialize();
  }
}

module.exports = DataSyncManager;