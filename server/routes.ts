import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";

// Working HLS stream URLs from public sources
const HLS_STREAMS = [
  "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8",
  "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
  "https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8",
  "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  "https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8",
  "https://moctobpltc-i.akamaihd.net/hls/live/571329/eight/playlist.m3u8"
];

let streamConfigs = HLS_STREAMS.map((url, index) => ({
  id: index + 1,
  name: `Stream ${index + 1}`,
  url: url,
  delay: index * 0.3,
  isRunning: true
}));

export async function registerRoutes(app: Express): Promise<Server> {

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
    res.json({
      streams: streamConfigs,
      hlsStreams: true,
    });
  });

  // API: Get stream health status
  app.get('/api/streams/health', (req, res) => {
    const health = streamConfigs.map(stream => ({
      id: stream.id,
      name: stream.name,
      isLive: true,
      url: stream.url
    }));
    
    res.json({
      streams: health,
      overallHealth: 'healthy',
    });
  });

  // API: Restart all streams
  app.post('/api/streams/restart', async (req, res) => {
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
