import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import { FFmpegStreamManager } from "./ffmpeg-manager";

// RTSP source URL - update this with your actual RTSP stream
const RTSP_URL = process.env.RTSP_URL || "rtsp://wowzaec2demo.streaming.media.azure.com/videoondemand/BigBuckBunny_115k.mov";

let streamManager: FFmpegStreamManager | null = null;

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize FFmpeg stream manager
  streamManager = new FFmpegStreamManager(RTSP_URL);

  // Serve static HLS files
  app.use('/streams', express.static('client/public/streams', {
    setHeaders: (res) => {
      // CORS headers for HLS streaming
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      
      // Cache control for different file types
      if (res.req?.url?.endsWith('.m3u8')) {
        // Playlist files should not be cached
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      } else if (res.req?.url?.endsWith('.ts')) {
        // Segments can be cached briefly
        res.setHeader('Cache-Control', 'public, max-age=10');
      }
    }
  }));

  // API: Get stream configuration
  app.get('/api/streams', (req, res) => {
    if (!streamManager) {
      return res.status(503).json({ error: 'Stream manager not initialized' });
    }

    const streams = streamManager.getStreamConfigs();
    res.json({
      streams,
      rtspSource: RTSP_URL,
    });
  });

  // API: Get stream health status
  app.get('/api/streams/health', (req, res) => {
    if (!streamManager) {
      return res.status(503).json({ error: 'Stream manager not initialized' });
    }

    const health = streamManager.getStreamHealth();
    const allHealthy = health.every(h => h.isLive);
    const anyHealthy = health.some(h => h.isLive);
    
    let overallHealth: 'healthy' | 'degraded' | 'critical';
    if (allHealthy) {
      overallHealth = 'healthy';
    } else if (anyHealthy) {
      overallHealth = 'degraded';
    } else {
      overallHealth = 'critical';
    }

    res.json({
      streams: health,
      overallHealth,
    });
  });

  // API: Restart all streams
  app.post('/api/streams/restart', async (req, res) => {
    if (!streamManager) {
      return res.status(503).json({ error: 'Stream manager not initialized' });
    }

    try {
      streamManager.stopAll();
      await new Promise(resolve => setTimeout(resolve, 2000));
      await streamManager.startAll();
      res.json({ success: true, message: 'All streams restarted' });
    } catch (error) {
      console.error('Error restarting streams:', error);
      res.status(500).json({ error: 'Failed to restart streams' });
    }
  });

  const httpServer = createServer(app);

  // Start FFmpeg streams when server starts
  console.log('🚀 Initializing video streaming pipeline...');
  
  // Start streams after a short delay to ensure server is ready
  setTimeout(async () => {
    try {
      await streamManager?.startAll();
    } catch (error) {
      console.error('❌ Failed to start streams:', error);
      console.log('💡 Tip: Ensure RTSP source is accessible and FFmpeg is installed');
    }
  }, 2000);

  // Cleanup on process exit
  const cleanup = () => {
    console.log('\n🛑 Shutting down stream manager...');
    streamManager?.cleanup();
    process.exit(0);
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
  process.on('exit', () => {
    streamManager?.cleanup();
  });

  return httpServer;
}
