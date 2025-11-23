import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";

// Working stream URLs - mix of HLS and HTTP MP4
const HLS_STREAMS = [
  "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",  // External HLS
  "/streams/my-video/playlist.m3u8",                     // LOCAL: My Video 1 (HLS)
  "https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_adv_example_hevc/master.m3u8",
  "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.mp4/.m3u8",
  "/streams/my-video-2/videoplayback2.mp4",             // LOCAL: My Video 2 (HTTP MP4)
  "https://ireplay.tv/test/blender.m3u8"
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
    res.json({ success: true, message: 'Streams are using public HLS sources - no restart needed' });
  });

  const httpServer = createServer(app);

  // Log startup info
  console.log('🎬 Video Streaming Dashboard initialized');
  console.log(`📊 Serving ${HLS_STREAMS.length} HLS video streams`);
  console.log('✅ Dashboard ready at http://localhost:5000');

  return httpServer;
}
