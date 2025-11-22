import { spawn, ChildProcess } from 'child_process';
import { mkdirSync, existsSync, rmSync } from 'fs';
import { join } from 'path';

export interface StreamProcess {
  id: number;
  name: string;
  process: ChildProcess | null;
  url: string;
  delay: number;
  isRunning: boolean;
  lastError?: string;
}

export class FFmpegStreamManager {
  private streams: StreamProcess[] = [];
  private rtspUrl: string;
  private outputDir: string;
  private readonly NUM_STREAMS = 6;

  constructor(rtspUrl: string, outputDir: string = 'client/public/streams') {
    this.rtspUrl = rtspUrl;
    this.outputDir = outputDir;
    this.initializeStreams();
  }

  private initializeStreams() {
    // Create output directory if it doesn't exist
    if (!existsSync(this.outputDir)) {
      mkdirSync(this.outputDir, { recursive: true });
    }

    // Initialize stream configurations with staggered delays
    const delays = [0, 0.3, 0.6, 0.9, 1.2, 1.5]; // Seconds

    for (let i = 0; i < this.NUM_STREAMS; i++) {
      const streamId = i + 1;
      this.streams.push({
        id: streamId,
        name: `Stream ${streamId}`,
        process: null,
        url: `/streams/stream${streamId}/playlist.m3u8`,
        delay: delays[i],
        isRunning: false,
      });
    }
  }

  /**
   * Start all FFmpeg processes
   */
  async startAll(): Promise<void> {
    console.log('🎬 Starting FFmpeg stream conversion...');
    console.log(`📡 RTSP Source: ${this.rtspUrl}`);
    
    for (const stream of this.streams) {
      await this.startStream(stream);
      // Small delay between starting streams
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log(`✅ All ${this.NUM_STREAMS} streams started successfully`);
  }

  /**
   * Start a single stream with FFmpeg
   */
  private async startStream(stream: StreamProcess): Promise<void> {
    const streamDir = join(this.outputDir, `stream${stream.id}`);
    
    // Create stream directory
    if (!existsSync(streamDir)) {
      mkdirSync(streamDir, { recursive: true });
    }

    const playlistPath = join(streamDir, 'playlist.m3u8');
    const segmentPath = join(streamDir, 'segment_%d.ts');

    // FFmpeg command for RTSP to HLS conversion
    const ffmpegArgs = [
      '-rtsp_transport', 'tcp',
      '-fflags', 'nobuffer',
      '-reconnect', '1',
      '-reconnect_at_eof', '1',
      '-reconnect_streamed', '1',
      '-reconnect_delay_max', '2',
      '-i', this.rtspUrl,
      '-vsync', '0',
      '-copyts',
      '-c:v', 'copy',
      '-c:a', 'aac',
      '-f', 'hls',
      '-hls_time', '2',
      '-hls_list_size', '6',
      '-hls_flags', 'delete_segments+append_list',
      '-hls_segment_type', 'mpegts',
      '-hls_segment_filename', segmentPath,
      playlistPath
    ];

    // Add delay using input seeking if delay > 0
    if (stream.delay > 0) {
      // Insert delay by using a slightly offset input position
      ffmpegArgs.splice(2, 0, '-itsoffset', stream.delay.toString());
    }

    console.log(`🎥 Starting ${stream.name} (delay: ${stream.delay}s)...`);

    const ffmpegProcess = spawn('ffmpeg', ffmpegArgs, {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    stream.process = ffmpegProcess;
    stream.isRunning = true;

    // Handle stdout
    ffmpegProcess.stdout?.on('data', (data) => {
      // FFmpeg outputs to stderr, but we listen to both
    });

    // Handle stderr (FFmpeg logs here)
    ffmpegProcess.stderr?.on('data', (data) => {
      const message = data.toString();
      // Only log errors or important messages
      if (message.includes('error') || message.includes('Error')) {
        console.error(`⚠️  ${stream.name} FFmpeg:`, message.substring(0, 200));
        stream.lastError = message.substring(0, 500);
      }
    });

    // Handle process exit
    ffmpegProcess.on('exit', (code, signal) => {
      stream.isRunning = false;
      console.log(`🛑 ${stream.name} exited with code ${code}, signal ${signal}`);
      
      // Auto-restart on unexpected exit
      if (code !== 0 && code !== null) {
        console.log(`🔄 Restarting ${stream.name} in 3 seconds...`);
        setTimeout(() => {
          this.startStream(stream);
        }, 3000);
      }
    });

    // Handle errors
    ffmpegProcess.on('error', (err) => {
      console.error(`❌ ${stream.name} process error:`, err.message);
      stream.isRunning = false;
      stream.lastError = err.message;
    });
  }

  /**
   * Stop all streams
   */
  stopAll(): void {
    console.log('🛑 Stopping all streams...');
    
    for (const stream of this.streams) {
      if (stream.process) {
        stream.process.kill('SIGTERM');
        stream.isRunning = false;
      }
    }

    console.log('✅ All streams stopped');
  }

  /**
   * Get stream configurations
   */
  getStreamConfigs() {
    return this.streams.map(s => ({
      id: s.id,
      name: s.name,
      url: s.url,
      delay: s.delay,
    }));
  }

  /**
   * Get stream health status
   */
  getStreamHealth() {
    return this.streams.map(s => ({
      streamId: s.id,
      isLive: s.isRunning,
      lastUpdate: new Date().toISOString(),
      error: s.lastError,
    }));
  }

  /**
   * Cleanup on shutdown
   */
  cleanup(): void {
    this.stopAll();
    
    // Optionally clean up stream files
    // Note: Keeping files for now to allow playback continuation
    console.log('🧹 Cleanup complete');
  }
}
