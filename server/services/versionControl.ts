import { IStorage } from '../storage';
import { Artifact, InsertArtifact } from '@shared/schema';
import * as fs from 'fs-extra';
import * as path from 'path';

export interface ArtifactVersion {
  id: string;
  artifactId: number;
  version: string;
  content: string;
  filePath?: string;
  changedBy: string;
  changeMessage: string;
  createdAt: Date;
  metadata: any;
}

export class VersionControlService {
  private versionsDir: string;
  
  constructor(private storage: IStorage) {
    this.versionsDir = path.join(process.cwd(), 'artifact_versions');
    this.ensureVersionsDirectory();
  }

  private async ensureVersionsDirectory(): Promise<void> {
    try {
      await fs.ensureDir(this.versionsDir);
    } catch (error) {
      console.error('Error creating versions directory:', error);
    }
  }

  async createArtifactVersion(artifact: Artifact, changeMessage: string, changedBy: string): Promise<ArtifactVersion> {
    // Generate version number
    const existingVersions = await this.getArtifactVersions(artifact.id);
    const nextVersion = this.generateNextVersion(existingVersions);
    
    // Create version record
    const version: ArtifactVersion = {
      id: `v_${artifact.id}_${Date.now()}`,
      artifactId: artifact.id,
      version: nextVersion,
      content: artifact.content,
      filePath: artifact.filePath,
      changedBy,
      changeMessage,
      createdAt: new Date(),
      metadata: {
        originalMetadata: artifact.metadata,
        fileSize: artifact.filePath ? (await fs.stat(artifact.filePath)).size : 0,
        contentHash: this.generateContentHash(artifact.content)
      }
    };

    // Store version file if artifact has file content
    if (artifact.filePath && await fs.pathExists(artifact.filePath)) {
      await this.storeVersionFile(version, artifact.filePath);
    }

    // Store version metadata (in production, this would go to a versions table)
    await this.storeVersionMetadata(version);
    
    console.log(`📦 Created version ${nextVersion} for artifact ${artifact.name}`);
    return version;
  }

  private generateNextVersion(existingVersions: ArtifactVersion[]): string {
    if (existingVersions.length === 0) {
      return '1.0.0';
    }

    // Sort versions and get the latest
    const sortedVersions = existingVersions.sort((a, b) => 
      this.compareVersions(b.version, a.version)
    );
    
    const latestVersion = sortedVersions[0].version;
    const [major, minor, patch] = latestVersion.split('.').map(Number);
    
    // Increment patch version
    return `${major}.${minor}.${patch + 1}`;
  }

  private compareVersions(v1: string, v2: string): number {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      
      if (part1 > part2) return 1;
      if (part1 < part2) return -1;
    }
    
    return 0;
  }

  private generateContentHash(content: string): string {
    // Simple hash function for content identification
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  private async storeVersionFile(version: ArtifactVersion, originalFilePath: string): Promise<void> {
    const versionFileName = `${version.id}_${path.basename(originalFilePath)}`;
    const versionFilePath = path.join(this.versionsDir, versionFileName);
    
    await fs.copy(originalFilePath, versionFilePath);
    version.filePath = versionFilePath;
  }

  private async storeVersionMetadata(version: ArtifactVersion): Promise<void> {
    // In production, this would store to a database table
    // For now, we'll store as JSON files
    const metadataFile = path.join(this.versionsDir, `${version.id}_metadata.json`);
    await fs.writeJSON(metadataFile, version, { spaces: 2 });
  }

  async getArtifactVersions(artifactId: number): Promise<ArtifactVersion[]> {
    try {
      const files = await fs.readdir(this.versionsDir);
      const metadataFiles = files.filter(f => f.includes(`_${artifactId}_`) && f.endsWith('_metadata.json'));
      
      const versions: ArtifactVersion[] = [];
      for (const file of metadataFiles) {
        const filePath = path.join(this.versionsDir, file);
        const version = await fs.readJSON(filePath);
        versions.push(version);
      }
      
      return versions.sort((a, b) => this.compareVersions(b.version, a.version));
    } catch (error) {
      console.error('Error reading artifact versions:', error);
      return [];
    }
  }

  async getArtifactVersion(artifactId: number, version: string): Promise<ArtifactVersion | null> {
    const versions = await this.getArtifactVersions(artifactId);
    return versions.find(v => v.version === version) || null;
  }

  async restoreArtifactVersion(artifactId: number, version: string): Promise<boolean> {
    try {
      const versionData = await this.getArtifactVersion(artifactId, version);
      if (!versionData) {
        console.error(`Version ${version} not found for artifact ${artifactId}`);
        return false;
      }

      // Get current artifact
      const artifact = await this.storage.getArtifacts().then(arts => 
        arts.find(a => a.id === artifactId)
      );
      
      if (!artifact) {
        console.error(`Artifact ${artifactId} not found`);
        return false;
      }

      // Create backup of current version first
      await this.createArtifactVersion(artifact, `Backup before restore to ${version}`, 'system');

      // Restore content
      await this.storage.updateArtifact(artifactId, {
        content: versionData.content,
        updatedAt: new Date(),
        metadata: {
          ...artifact.metadata,
          restoredFromVersion: version,
          restoredAt: new Date().toISOString()
        }
      });

      // Restore file if it exists
      if (versionData.filePath && artifact.filePath) {
        if (await fs.pathExists(versionData.filePath)) {
          await fs.copy(versionData.filePath, artifact.filePath);
        }
      }

      console.log(`♻️ Restored artifact ${artifactId} to version ${version}`);
      return true;
    } catch (error) {
      console.error('Error restoring artifact version:', error);
      return false;
    }
  }

  async compareVersions(artifactId: number, version1: string, version2: string): Promise<{
    version1: ArtifactVersion;
    version2: ArtifactVersion;
    differences: string[];
  } | null> {
    try {
      const v1 = await this.getArtifactVersion(artifactId, version1);
      const v2 = await this.getArtifactVersion(artifactId, version2);
      
      if (!v1 || !v2) {
        return null;
      }

      const differences = this.generateDifferences(v1.content, v2.content);
      
      return {
        version1: v1,
        version2: v2,
        differences
      };
    } catch (error) {
      console.error('Error comparing versions:', error);
      return null;
    }
  }

  private generateDifferences(content1: string, content2: string): string[] {
    const lines1 = content1.split('\n');
    const lines2 = content2.split('\n');
    const differences: string[] = [];
    
    const maxLines = Math.max(lines1.length, lines2.length);
    
    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i] || '';
      const line2 = lines2[i] || '';
      
      if (line1 !== line2) {
        differences.push(`Line ${i + 1}: "${line1}" → "${line2}"`);
      }
    }
    
    return differences;
  }

  async getVersionHistory(artifactId: number): Promise<{
    artifact: Artifact | null;
    versions: ArtifactVersion[];
    totalVersions: number;
  }> {
    const artifacts = await this.storage.getArtifacts();
    const artifact = artifacts.find(a => a.id === artifactId) || null;
    const versions = await this.getArtifactVersions(artifactId);
    
    return {
      artifact,
      versions,
      totalVersions: versions.length
    };
  }

  async autoVersionOnUpdate(artifact: Artifact, changeMessage: string, changedBy: string): Promise<void> {
    // Automatically create version when artifact is updated
    await this.createArtifactVersion(artifact, changeMessage, changedBy);
  }

  async cleanupOldVersions(artifactId: number, keepCount: number = 10): Promise<void> {
    try {
      const versions = await this.getArtifactVersions(artifactId);
      
      if (versions.length <= keepCount) {
        return; // Nothing to cleanup
      }

      // Sort versions by date (newest first) and keep only the specified count
      const sortedVersions = versions.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      const versionsToDelete = sortedVersions.slice(keepCount);
      
      for (const version of versionsToDelete) {
        // Delete version file
        if (version.filePath && await fs.pathExists(version.filePath)) {
          await fs.remove(version.filePath);
        }
        
        // Delete metadata file
        const metadataFile = path.join(this.versionsDir, `${version.id}_metadata.json`);
        if (await fs.pathExists(metadataFile)) {
          await fs.remove(metadataFile);
        }
      }
      
      console.log(`🧹 Cleaned up ${versionsToDelete.length} old versions for artifact ${artifactId}`);
    } catch (error) {
      console.error('Error cleaning up old versions:', error);
    }
  }

  async getVersionStats(): Promise<{
    totalVersions: number;
    artifactsWithVersions: number;
    storageSize: number;
  }> {
    try {
      const files = await fs.readdir(this.versionsDir);
      const metadataFiles = files.filter(f => f.endsWith('_metadata.json'));
      
      let totalSize = 0;
      const artifactIds = new Set<number>();
      
      for (const file of files) {
        const filePath = path.join(this.versionsDir, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
        
        if (file.endsWith('_metadata.json')) {
          // Extract artifact ID from filename
          const parts = file.split('_');
          if (parts.length >= 2) {
            const artifactId = parseInt(parts[1]);
            if (!isNaN(artifactId)) {
              artifactIds.add(artifactId);
            }
          }
        }
      }
      
      return {
        totalVersions: metadataFiles.length,
        artifactsWithVersions: artifactIds.size,
        storageSize: totalSize
      };
    } catch (error) {
      console.error('Error getting version stats:', error);
      return {
        totalVersions: 0,
        artifactsWithVersions: 0,
        storageSize: 0
      };
    }
  }
}