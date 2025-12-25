import { createHash } from 'crypto';

export interface Checkpoint {
  id: string;           // toolCallId
  filePath: string;
  beforeContent: string;
  afterContent: string;
  beforeHash: string;   // SHA-256 of beforeContent
  afterHash: string;    // SHA-256 of afterContent
  timestamp: number;
}

/**
 * In-memory checkpoint store for file state tracking.
 * Enables reliable revert operations with conflict detection.
 */
class CheckpointStore {
  private checkpoints: Map<string, Checkpoint> = new Map();
  private fileCheckpoints: Map<string, string[]> = new Map(); // filePath -> checkpointIds

  /**
   * Compute SHA-256 hash of content
   */
  computeHash(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * Create a new checkpoint before an edit operation
   */
  createCheckpoint(
    id: string,
    filePath: string,
    beforeContent: string,
    afterContent: string
  ): Checkpoint {
    const checkpoint: Checkpoint = {
      id,
      filePath,
      beforeContent,
      afterContent,
      beforeHash: this.computeHash(beforeContent),
      afterHash: this.computeHash(afterContent),
      timestamp: Date.now(),
    };

    this.checkpoints.set(id, checkpoint);

    // Track checkpoints per file
    const fileCheckpointIds = this.fileCheckpoints.get(filePath) || [];
    fileCheckpointIds.push(id);
    this.fileCheckpoints.set(filePath, fileCheckpointIds);

    return checkpoint;
  }

  /**
   * Get a checkpoint by ID
   */
  getCheckpoint(id: string): Checkpoint | undefined {
    return this.checkpoints.get(id);
  }

  /**
   * Get all checkpoints for a file (ordered by timestamp)
   */
  getCheckpointsForFile(filePath: string): Checkpoint[] {
    const ids = this.fileCheckpoints.get(filePath) || [];
    return ids
      .map(id => this.checkpoints.get(id))
      .filter((cp): cp is Checkpoint => cp !== undefined)
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Verify if current file content matches expected state
   * Returns true if safe to revert
   */
  verifyFileState(
    checkpointId: string,
    currentContent: string
  ): { 
    safe: boolean; 
    reason?: string;
    checkpoint?: Checkpoint;
    currentHash?: string;
  } {
    const checkpoint = this.checkpoints.get(checkpointId);
    
    if (!checkpoint) {
      return { 
        safe: false, 
        reason: 'Checkpoint not found' 
      };
    }

    const currentHash = this.computeHash(currentContent);

    // Safe if current content matches the after-edit state
    if (currentHash === checkpoint.afterHash) {
      return { 
        safe: true, 
        checkpoint,
        currentHash 
      };
    }

    // Also safe if someone already reverted it (matches before state)
    if (currentHash === checkpoint.beforeHash) {
      return { 
        safe: false, 
        reason: 'File appears to already be reverted',
        checkpoint,
        currentHash
      };
    }

    // Conflict: file was modified after the edit
    return {
      safe: false,
      reason: 'File was modified after this edit. Current content does not match expected state.',
      checkpoint,
      currentHash,
    };
  }

  /**
   * Remove a checkpoint after successful revert or accept
   */
  removeCheckpoint(id: string): boolean {
    const checkpoint = this.checkpoints.get(id);
    if (!checkpoint) return false;

    this.checkpoints.delete(id);

    // Clean up file tracking
    const fileCheckpointIds = this.fileCheckpoints.get(checkpoint.filePath);
    if (fileCheckpointIds) {
      const filtered = fileCheckpointIds.filter(cpId => cpId !== id);
      if (filtered.length === 0) {
        this.fileCheckpoints.delete(checkpoint.filePath);
      } else {
        this.fileCheckpoints.set(checkpoint.filePath, filtered);
      }
    }

    return true;
  }

  /**
   * Get all checkpoints (for debugging/listing)
   */
  getAllCheckpoints(): Checkpoint[] {
    return Array.from(this.checkpoints.values())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Clear all checkpoints (for cleanup)
   */
  clear(): void {
    this.checkpoints.clear();
    this.fileCheckpoints.clear();
  }

  /**
   * Get statistics
   */
  getStats(): { totalCheckpoints: number; filesTracked: number } {
    return {
      totalCheckpoints: this.checkpoints.size,
      filesTracked: this.fileCheckpoints.size,
    };
  }
}

// Singleton instance
export const checkpointStore = new CheckpointStore();

// Re-export the class for testing
export { CheckpointStore };

