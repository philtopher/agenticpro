import { IStorage, Artifact, InsertArtifact } from "@shared/schema";

export class ArtifactService {
  constructor(private storage: IStorage) {}

  async createArtifact(artifactData: InsertArtifact): Promise<Artifact> {
    // Check if artifact with same name exists for this task
    const existingArtifacts = await this.storage.getArtifactsByTask(artifactData.taskId);
    const existingArtifact = existingArtifacts.find(a => a.name === artifactData.name);
    
    if (existingArtifact) {
      // Create new version
      const newVersion = existingArtifact.version + 1;
      return await this.storage.createArtifact({
        ...artifactData,
        version: newVersion
      });
    }

    return await this.storage.createArtifact(artifactData);
  }

  async approveArtifact(artifactId: number): Promise<Artifact> {
    return await this.storage.updateArtifact(artifactId, {
      status: "approved"
    });
  }

  async archiveArtifact(artifactId: number): Promise<Artifact> {
    return await this.storage.updateArtifact(artifactId, {
      status: "archived"
    });
  }

  async getArtifactsByType(type: string): Promise<Artifact[]> {
    const artifacts = await this.storage.getArtifacts();
    return artifacts.filter(a => a.type === type);
  }

  async getLatestArtifacts(limit: number = 10): Promise<Artifact[]> {
    return await this.storage.getRecentArtifacts(limit);
  }
}
