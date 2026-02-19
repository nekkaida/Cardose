// Database Backup Service
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);

class BackupService {
  constructor(databasePath, logger = null) {
    this.databasePath = databasePath || path.join(__dirname, '../../data/premiumgiftbox.db');
    this.backupDir = process.env.BACKUP_DIR || path.join(__dirname, '../../backups');
    this.maxBackups = parseInt(process.env.MAX_BACKUPS || '10');
    this.log = logger || { info: console.log, error: console.error, warn: console.warn };
    this.autoBackupInterval = null;
    this.ensureBackupDirectory();
  }

  ensureBackupDirectory() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Create a backup of the database
   */
  async createBackup(description = 'Manual backup') {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFilename = `premiumgiftbox_backup_${timestamp}.db`;
      const backupPath = path.join(this.backupDir, backupFilename);

      // Copy database file
      await fs.promises.copyFile(this.databasePath, backupPath);

      // Get file size
      const stats = await fs.promises.stat(backupPath);
      const sizeInMB = (stats.size / (1024 * 1024)).toFixed(2);

      // Create metadata file
      const metadata = {
        filename: backupFilename,
        timestamp: new Date().toISOString(),
        description,
        size: stats.size,
        sizeMB: sizeInMB,
        originalPath: this.databasePath,
      };

      const metadataPath = path.join(this.backupDir, `${backupFilename}.meta.json`);
      await fs.promises.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

      // Clean up old backups
      await this.cleanupOldBackups();

      return {
        success: true,
        backup: metadata,
      };
    } catch (error) {
      throw new Error(`Backup failed: ${error.message}`);
    }
  }

  /**
   * List all available backups
   */
  async listBackups() {
    try {
      const files = await fs.promises.readdir(this.backupDir);
      const backupFiles = files.filter((f) => f.endsWith('.db'));

      const backups = [];

      for (const file of backupFiles) {
        const metadataPath = path.join(this.backupDir, `${file}.meta.json`);

        let metadata = null;
        if (fs.existsSync(metadataPath)) {
          const metadataContent = await fs.promises.readFile(metadataPath, 'utf8');
          metadata = JSON.parse(metadataContent);
        } else {
          // Create metadata for old backups without metadata file
          const stats = await fs.promises.stat(path.join(this.backupDir, file));
          metadata = {
            filename: file,
            timestamp: stats.mtime.toISOString(),
            description: 'Legacy backup',
            size: stats.size,
            sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
          };
        }

        backups.push(metadata);
      }

      // Sort by timestamp (newest first)
      backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      return backups;
    } catch (error) {
      throw new Error(`Failed to list backups: ${error.message}`);
    }
  }

  /**
   * Restore database from backup
   */
  async restoreBackup(backupFilename) {
    try {
      const backupPath = path.join(this.backupDir, backupFilename);

      // Check if backup exists
      if (!fs.existsSync(backupPath)) {
        throw new Error('Backup file not found');
      }

      // Create a backup of current database before restoring
      await this.createBackup('Pre-restore backup');

      // Copy backup to database location
      await fs.promises.copyFile(backupPath, this.databasePath);

      return {
        success: true,
        message: 'Database restored successfully',
        restoredFrom: backupFilename,
      };
    } catch (error) {
      throw new Error(`Restore failed: ${error.message}`);
    }
  }

  /**
   * Delete a specific backup
   */
  async deleteBackup(backupFilename) {
    try {
      const backupPath = path.join(this.backupDir, backupFilename);
      const metadataPath = path.join(this.backupDir, `${backupFilename}.meta.json`);

      // Delete backup file
      if (fs.existsSync(backupPath)) {
        await fs.promises.unlink(backupPath);
      }

      // Delete metadata file
      if (fs.existsSync(metadataPath)) {
        await fs.promises.unlink(metadataPath);
      }

      return {
        success: true,
        message: 'Backup deleted successfully',
      };
    } catch (error) {
      throw new Error(`Failed to delete backup: ${error.message}`);
    }
  }

  /**
   * Clean up old backups (keep only maxBackups most recent)
   */
  async cleanupOldBackups() {
    try {
      const backups = await this.listBackups();

      if (backups.length > this.maxBackups) {
        const backupsToDelete = backups.slice(this.maxBackups);

        for (const backup of backupsToDelete) {
          await this.deleteBackup(backup.filename);
        }

        return {
          success: true,
          deletedCount: backupsToDelete.length,
        };
      }

      return {
        success: true,
        deletedCount: 0,
      };
    } catch (error) {
      throw new Error(`Cleanup failed: ${error.message}`);
    }
  }

  /**
   * Export database to SQL dump
   */
  async exportToSQL(outputPath = null) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const sqlFilename = `premiumgiftbox_export_${timestamp}.sql`;
      const sqlPath = outputPath || path.join(this.backupDir, sqlFilename);

      // Use sqlite3 command to export database to SQL
      const command = `sqlite3 "${this.databasePath}" .dump`;
      const { stdout } = await execPromise(command);

      await fs.promises.writeFile(sqlPath, stdout);

      const stats = await fs.promises.stat(sqlPath);

      return {
        success: true,
        filepath: sqlPath,
        filename: sqlFilename,
        size: stats.size,
        sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
      };
    } catch (error) {
      throw new Error(`SQL export failed: ${error.message}`);
    }
  }

  /**
   * Get backup statistics
   */
  async getBackupStats() {
    try {
      const backups = await this.listBackups();

      const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
      const totalSizeMB = (totalSize / (1024 * 1024)).toFixed(2);

      const oldestBackup = backups.length > 0 ? backups[backups.length - 1] : null;
      const newestBackup = backups.length > 0 ? backups[0] : null;

      return {
        totalBackups: backups.length,
        totalSize,
        totalSizeMB,
        oldestBackup: oldestBackup
          ? {
              filename: oldestBackup.filename,
              timestamp: oldestBackup.timestamp,
              sizeMB: oldestBackup.sizeMB,
            }
          : null,
        newestBackup: newestBackup
          ? {
              filename: newestBackup.filename,
              timestamp: newestBackup.timestamp,
              sizeMB: newestBackup.sizeMB,
            }
          : null,
        backupDirectory: this.backupDir,
        maxBackups: this.maxBackups,
      };
    } catch (error) {
      throw new Error(`Failed to get backup stats: ${error.message}`);
    }
  }

  /**
   * Start automatic backup interval
   */
  startAutoBackup(intervalHours = 4) {
    if (this.autoBackupInterval) {
      this.stopAutoBackup();
    }

    const intervalMs = intervalHours * 60 * 60 * 1000;

    this.autoBackupInterval = setInterval(async () => {
      try {
        await this.createBackup('Automatic backup');
        this.log.info('Automatic backup created at %s', new Date().toISOString());
      } catch (error) {
        this.log.error('Automatic backup failed: %s', error.message);
      }
    }, intervalMs);

    this.log.info('Automatic backup enabled (every %d hours)', intervalHours);
  }

  /**
   * Stop automatic backup interval
   */
  stopAutoBackup() {
    if (this.autoBackupInterval) {
      clearInterval(this.autoBackupInterval);
      this.autoBackupInterval = null;
      this.log.info('Automatic backup disabled');
    }
  }

  /**
   * Verify backup integrity
   */
  async verifyBackup(backupFilename) {
    try {
      const backupPath = path.join(this.backupDir, backupFilename);

      if (!fs.existsSync(backupPath)) {
        throw new Error('Backup file not found');
      }

      // Check if file is a valid SQLite database
      const command = `sqlite3 "${backupPath}" "PRAGMA integrity_check;"`;
      const { stdout } = await execPromise(command);

      const isValid = stdout.trim() === 'ok';

      return {
        success: true,
        valid: isValid,
        message: isValid ? 'Backup integrity verified' : 'Backup integrity check failed',
      };
    } catch (error) {
      return {
        success: false,
        valid: false,
        message: `Verification failed: ${error.message}`,
      };
    }
  }

  /**
   * Download backup file
   */
  getBackupPath(backupFilename) {
    return path.join(this.backupDir, backupFilename);
  }

  /**
   * Get backup file stream (for download)
   */
  getBackupStream(backupFilename) {
    const backupPath = path.join(this.backupDir, backupFilename);
    if (!fs.existsSync(backupPath)) {
      throw new Error('Backup file not found');
    }
    return fs.createReadStream(backupPath);
  }
}

module.exports = BackupService;
