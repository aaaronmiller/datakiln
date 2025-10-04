import { promises as fs } from 'fs';
import * as path from 'path';
import { ArtifactStore, Artifact } from '../types/execution.js';

export class FileArtifactStore implements ArtifactStore {
  private readonly artifactsDir: string;

  constructor(dataDir: string = './data') {
    this.artifactsDir = path.join(dataDir, 'artifacts');
  }

  async store(artifact: Artifact): Promise<string> {
    await this.ensureDirectoryExists();

    const artifactPath = path.join(this.artifactsDir, `${artifact.id}.json`);

    // Create artifact with metadata
    const artifactData = {
      ...artifact,
      storedAt: Date.now()
    };

    await fs.writeFile(artifactPath, JSON.stringify(artifactData, null, 2), 'utf-8');

    return artifact.id;
  }

  async retrieve(ref: string): Promise<Artifact> {
    const artifactPath = path.join(this.artifactsDir, `${ref}.json`);

    try {
      const data = await fs.readFile(artifactPath, 'utf-8');
      const artifactData = JSON.parse(data);

      // Remove storage metadata before returning
      const { storedAt, ...artifact } = artifactData;
      return artifact;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error(`Artifact ${ref} not found`);
      }
      throw error;
    }
  }

  async list(): Promise<string[]> {
    await this.ensureDirectoryExists();

    try {
      const files = await fs.readdir(this.artifactsDir);
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => f.replace('.json', ''));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async delete(ref: string): Promise<void> {
    const artifactPath = path.join(this.artifactsDir, `${ref}.json`);

    try {
      await fs.unlink(artifactPath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
    }
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.access(this.artifactsDir);
    } catch {
      await fs.mkdir(this.artifactsDir, { recursive: true });
    }
  }
}