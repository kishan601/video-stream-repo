/**
 * VideoSyncManager - Manages synchronization across multiple video players
 * 
 * This class implements a master-slave synchronization pattern where:
 * - One video is designated as the "master" (typically stream 0)
 * - All other videos sync their playback to the master's timeline
 * - Drift is measured and corrected periodically
 * - Playback rate adjustments are used for minor corrections
 * - Direct seeks are used for major drift corrections
 */

export interface VideoElement {
  video: HTMLVideoElement;
  streamId: number;
}

export interface SyncState {
  streamId: number;
  currentTime: number;
  drift: number;
  isSynced: boolean;
}

export class VideoSyncManager {
  private videos: VideoElement[] = [];
  private masterIndex: number = 0;
  private syncInterval: NodeJS.Timeout | null = null;
  private readonly SYNC_CHECK_INTERVAL = 2000; // Check sync every 2 seconds (reduced from 1s for performance)
  private readonly MINOR_DRIFT_THRESHOLD = 0.5; // 500ms (increased from 300ms to reduce corrections)
  private readonly MAJOR_DRIFT_THRESHOLD = 1.5; // 1.5 seconds (increased from 1s to reduce aggressive seeking)
  private onSyncUpdate?: (states: SyncState[]) => void;

  constructor(onSyncUpdate?: (states: SyncState[]) => void) {
    this.onSyncUpdate = onSyncUpdate;
  }

  /**
   * Register a video element for synchronization
   */
  addVideo(video: HTMLVideoElement, streamId: number) {
    this.videos.push({ video, streamId });
  }

  /**
   * Remove all registered videos
   */
  clearVideos() {
    this.videos = [];
  }

  /**
   * Set which video should be the master
   */
  setMaster(index: number) {
    if (index >= 0 && index < this.videos.length) {
      this.masterIndex = index;
    }
  }

  /**
   * Start the synchronization loop
   */
  start() {
    if (this.syncInterval) {
      return; // Already running
    }

    this.syncInterval = setInterval(() => {
      this.sync();
    }, this.SYNC_CHECK_INTERVAL);
  }

  /**
   * Stop the synchronization loop
   */
  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Perform synchronization check and correction
   */
  private sync() {
    if (this.videos.length === 0) return;

    const master = this.videos[this.masterIndex];
    if (!master) return;

    const masterVideo = master.video;
    const masterTime = masterVideo.currentTime;
    const masterPlaying = !masterVideo.paused;

    const syncStates: SyncState[] = [];

    this.videos.forEach((videoElement, index) => {
      const { video, streamId } = videoElement;
      const drift = video.currentTime - masterTime;
      const absDrift = Math.abs(drift);

      // Skip master
      if (index === this.masterIndex) {
        syncStates.push({
          streamId,
          currentTime: video.currentTime,
          drift: 0,
          isSynced: true,
        });
        return;
      }

      // Only sync TIME position, NOT playback state - let each stream play/pause independently
      // This ensures drift correction but preserves individual play/pause control

      // Correct drift
      if (absDrift > this.MAJOR_DRIFT_THRESHOLD) {
        // Major drift: Direct seek
        video.currentTime = masterTime;
        syncStates.push({
          streamId,
          currentTime: video.currentTime,
          drift,
          isSynced: false,
        });
      } else if (absDrift > this.MINOR_DRIFT_THRESHOLD) {
        // Minor drift: Adjust playback rate
        if (drift > 0) {
          // Video is ahead, slow down
          video.playbackRate = 0.98;
        } else {
          // Video is behind, speed up
          video.playbackRate = 1.02;
        }
        
        // Reset playback rate after correction
        setTimeout(() => {
          video.playbackRate = 1.0;
        }, 500);

        syncStates.push({
          streamId,
          currentTime: video.currentTime,
          drift,
          isSynced: false,
        });
      } else {
        // In sync
        video.playbackRate = 1.0;
        syncStates.push({
          streamId,
          currentTime: video.currentTime,
          drift,
          isSynced: true,
        });
      }
    });

    // Notify listeners of sync state updates
    if (this.onSyncUpdate) {
      this.onSyncUpdate(syncStates);
    }
  }

  /**
   * Play all videos
   */
  async playAll() {
    const playPromises = this.videos.map(({ video }) => 
      video.play().catch(() => {
        // Ignore autoplay errors
      })
    );
    await Promise.all(playPromises);
  }

  /**
   * Pause all videos
   */
  pauseAll() {
    this.videos.forEach(({ video }) => video.pause());
  }

  /**
   * Force immediate resynchronization (time position only, preserves individual play/pause state)
   */
  forceSync() {
    if (this.videos.length === 0) return;

    const master = this.videos[this.masterIndex];
    if (!master) return;

    const masterTime = master.video.currentTime;

    // Sync time position only - DO NOT force playback state
    this.videos.forEach(({ video }, index) => {
      if (index !== this.masterIndex) {
        // Force seek to master time
        video.currentTime = masterTime;
        
        // Reset playback rate
        video.playbackRate = 1.0;
      }
    });

    // Trigger immediate sync check to update UI
    this.sync();
  }

  /**
   * Get current sync states for all videos
   */
  getSyncStates(): SyncState[] {
    if (this.videos.length === 0) return [];

    const master = this.videos[this.masterIndex];
    if (!master) return [];

    const masterTime = master.video.currentTime;

    return this.videos.map(({ video, streamId }, index) => {
      const drift = index === this.masterIndex ? 0 : video.currentTime - masterTime;
      const absDrift = Math.abs(drift);
      
      return {
        streamId,
        currentTime: video.currentTime,
        drift,
        isSynced: absDrift < this.MINOR_DRIFT_THRESHOLD,
      };
    });
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.stop();
    this.videos = [];
  }
}
