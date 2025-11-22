# 🎥 Video Streaming Dashboard

A professional synchronized multi-stream monitoring dashboard built with React and HLS technology. Monitor up to 6 live video streams simultaneously with real-time synchronization.

## ✨ Features

- **6 Synchronized Video Streams** - RTSP source converted to 6 distinct HLS streams
- **Real-Time Synchronization** - Maintains <300ms drift across all streams
- **Master-Slave Control** - Unified playback controls affecting all streams
- **Professional Monitoring UI** - Dark theme inspired by professional control panels
- **Stream Health Monitoring** - Real-time status indicators and drift visualization
- **Responsive Design** - Works on desktop (3×2 grid), tablet (2×3), and mobile (stack)
- **Auto-Reconnection** - Handles stream interruptions gracefully
- **Individual Controls** - Each stream has play/pause/reload/fullscreen controls

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **hls.js** for HLS playback
- **Custom VideoSyncManager** for synchronization
- **TanStack Query** for data fetching
- **Tailwind CSS** + shadcn/ui components

### Backend
- **Express.js** server
- **FFmpeg** for RTSP → HLS conversion
- **6 Concurrent FFmpeg Processes** with staggered segment delays
- **Static HLS File Serving** with proper CORS headers

### Streaming Pipeline
```
RTSP Source (rtsp://13.60.76.79:8554/live)
    ↓
FFmpeg Process Manager
    ↓
┌────────────────────────────────────────┐
│  Stream 1 (0.0s delay) - MASTER        │
│  Stream 2 (0.3s delay)                 │
│  Stream 3 (0.6s delay)                 │
│  Stream 4 (0.9s delay)                 │
│  Stream 5 (1.2s delay)                 │
│  Stream 6 (1.5s delay)                 │
└────────────────────────────────────────┘
    ↓
HLS Playlists (.m3u8) + Segments (.ts)
    ↓
React Dashboard with Synchronized Playback
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20.x or higher
- **FFmpeg** (installed automatically on Replit)
- **RTSP Stream Source** (default: rtsp://13.60.76.79:8554/live)

### Installation

```bash
# Install dependencies
npm install

# Start the application
npm run dev
```

The application will be available at `http://localhost:5000`

### Environment Variables

Optional configuration via environment variables:

```bash
# RTSP source URL (defaults to provided test stream)
RTSP_URL=rtsp://13.60.76.79:8554/live

# Server port (defaults to 5000)
PORT=5000
```

## 📖 How It Works

### RTSP → HLS Conversion

The backend uses FFmpeg to convert the single RTSP stream into 6 distinct HLS streams:

1. **FFmpeg Process Manager** spawns 6 concurrent FFmpeg processes
2. Each process has a **staggered delay** (0s, 0.3s, 0.6s, 0.9s, 1.2s, 1.5s)
3. FFmpeg converts RTSP to HLS with these parameters:
   - **Segment Duration**: 2 seconds
   - **Playlist Size**: 6 segments
   - **Auto-delete old segments** to save disk space
   - **TCP transport** for reliability
   - **Auto-reconnect** on network errors

### Synchronization Logic

The `VideoSyncManager` class handles stream synchronization:

1. **Master-Slave Pattern**: Stream 1 is designated as the master
2. **Drift Detection**: Every 1 second, measure time difference from master
3. **Drift Correction**:
   - **< 0.1s**: In sync (no correction needed)
   - **0.1s - 0.3s**: Minor drift (adjust playback rate temporarily)
   - **> 0.3s**: Major drift (direct seek to master time)
4. **Playback State Sync**: Play/pause state synced across all streams

### API Endpoints

#### GET `/api/streams`
Get stream configuration
```json
{
  "streams": [
    {
      "id": 1,
      "name": "Stream 1",
      "url": "/streams/stream1/playlist.m3u8",
      "delay": 0
    },
    ...
  ],
  "rtspSource": "rtsp://13.60.76.79:8554/live"
}
```

#### GET `/api/streams/health`
Get stream health status
```json
{
  "streams": [
    {
      "streamId": 1,
      "isLive": true,
      "lastUpdate": "2025-01-21T10:30:00.000Z"
    },
    ...
  ],
  "overallHealth": "healthy"
}
```

#### POST `/api/streams/restart`
Restart all FFmpeg processes
```json
{
  "success": true,
  "message": "All streams restarted"
}
```

## 🎨 UI Components

### Video Player Card
- **16:9 Aspect Ratio** video container
- **Live Badge** with pulsing animation
- **Sync Status Indicator** (color-coded: green/yellow/red)
- **Drift Display** in monospace font (e.g., "+0.15s")
- **Control Bar** with play/pause, reload, fullscreen buttons
- **Beautiful Loading/Error States** with retry functionality

### Dashboard Layout
- **Sticky Header** with sync health and master controls
- **Responsive Grid** (3×2 on desktop, 2×3 on tablet, stack on mobile)
- **Fixed Bottom Panel** showing stream stats and status badges
- **Dark Theme** optimized for monitoring scenarios

## 🧪 Testing

The application includes comprehensive test IDs for automated testing:

```javascript
// Main dashboard elements
data-testid="text-title"
data-testid="text-sync-status"
data-testid="button-play-all"
data-testid="button-pause-all"
data-testid="button-sync-all"

// Individual stream elements
data-testid="card-stream-{id}"
data-testid="video-player-{id}"
data-testid="badge-live-{id}"
data-testid="text-stream-name-{id}"
data-testid="text-drift-{id}"
data-testid="button-play-pause-{id}"
```

## 📝 Technical Notes

### HLS Configuration
- **Segment Duration**: 2 seconds (balance between latency and reliability)
- **Playlist Size**: 6 segments (12 seconds of video buffer)
- **Delete Old Segments**: Enabled to prevent disk space issues
- **Transport**: TCP for better reliability over UDP

### Synchronization Accuracy
- **Same-page sync**: ~100-300ms achievable
- **Factors affecting sync**: Network conditions, browser performance, segment alignment
- **Perfect audio sync (<20ms)**: Not possible due to HLS segment boundaries

### Browser Compatibility
- **Modern Browsers**: Full support via hls.js
- **Safari**: Native HLS support (no hls.js needed)
- **Mobile**: Tested on iOS Safari and Chrome

## 🚢 Deployment

### Vercel / Netlify

1. **Build Command**: `npm run build`
2. **Output Directory**: `dist`
3. **Environment Variables**: Set `RTSP_URL` in deployment settings

**Important**: FFmpeg-based streaming requires a server environment. For static deployments, you'll need to:
- Deploy backend separately (e.g., on Render, Railway, or Replit)
- Point frontend to backend API URL

### Replit (Recommended)

This project is optimized for Replit deployment:
- FFmpeg is automatically available
- Port 5000 is configured
- Workflow handles both frontend and backend

Simply click "Run" and the application will start!

## 📚 Development

### Project Structure
```
├── client/
│   ├── public/
│   │   └── streams/          # HLS output directory
│   └── src/
│       ├── components/
│       │   └── VideoPlayer.tsx
│       ├── lib/
│       │   └── VideoSyncManager.ts
│       └── pages/
│           └── Dashboard.tsx
├── server/
│   ├── ffmpeg-manager.ts     # FFmpeg process management
│   ├── routes.ts             # API endpoints
│   └── app.ts                # Express setup
└── shared/
    └── schema.ts             # TypeScript types
```

### Adding More Streams

To add more than 6 streams, modify:
1. `server/ffmpeg-manager.ts`: Update `NUM_STREAMS` constant
2. Add additional delays to the `delays` array
3. Grid layout will automatically adjust (may need CSS tweaks)

## 🤝 Contributing

This is an assignment project, but suggestions are welcome!

## 📄 License

MIT License - Feel free to use for learning and demonstration purposes.

## 🙏 Acknowledgments

- **Reference Design**: Inspired by https://monitor.theun1t.com/
- **hls.js**: Amazing HLS playback library
- **FFmpeg**: The Swiss Army knife of video processing
- **shadcn/ui**: Beautiful, accessible UI components

---

**Built with ❤️ for the Video Streaming Dashboard Assignment**
