import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCw, Maximize2 } from "lucide-react";
import type { StreamConfig } from "@shared/schema";

interface VideoPlayerProps {
  stream: StreamConfig;
  isMaster?: boolean;
  drift?: number;
  onVideoRef?: (streamId: number, video: HTMLVideoElement | null) => void;
  className?: string;
}

export function VideoPlayer({ 
  stream, 
  isMaster = false, 
  drift = 0,
  onVideoRef,
  className = ""
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [showLoadingText, setShowLoadingText] = useState(true);

  // Register video ref with parent
  useEffect(() => {
    if (onVideoRef && videoRef.current) {
      onVideoRef(stream.id, videoRef.current);
      return () => {
        onVideoRef(stream.id, null);
      };
    }
  }, [stream.id, onVideoRef]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Hide loading text after 2 seconds (show briefly, then switch to badges)
    const loadingTimer = setTimeout(() => {
      setShowLoadingText(false);
    }, 2000);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90,
        liveSyncDuration: 3,
        liveMaxLatencyDuration: 10,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });

      hls.loadSource(stream.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setShowLoadingText(false);
        setIsLoading(false);
        setIsLive(true);
        setHasError(false);
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error(`HLS Error on stream ${stream.id}:`, data);
        setShowLoadingText(false);
        if (data.fatal) {
          setHasError(true);
          setIsLive(false);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log("Network error, attempting recovery...");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log("Media error, attempting recovery...");
              hls.recoverMediaError();
              break;
            default:
              console.log("Fatal error, destroying HLS instance");
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native HLS support (Safari)
      video.src = stream.url;
      video.addEventListener('loadedmetadata', () => {
        setShowLoadingText(false);
        setIsLoading(false);
        setIsLive(true);
      });
    } else {
      setHasError(true);
      setIsLoading(false);
      setShowLoadingText(false);
    }

    // Track play/pause state
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      clearTimeout(loadingTimer);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [stream.url, stream.id]);

  const handlePlayPause = async () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      if (video.paused) {
        await video.play();
      } else {
        video.pause();
      }
    } catch (err) {
      console.error("Play/pause error:", err);
    }
  };

  const handleReload = () => {
    const video = videoRef.current;
    if (!video) return;
    
    setIsLoading(true);
    setHasError(false);
    
    if (hlsRef.current) {
      hlsRef.current.destroy();
    }

    // Recreate HLS instance
    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      liveSyncDuration: 3,
      liveMaxLatencyDuration: 10,
    });

    hls.loadSource(stream.url);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      setIsLoading(false);
      setIsLive(true);
      video.play().catch(() => {});
    });

    hlsRef.current = hls;
  };

  const handleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (video.requestFullscreen) {
      video.requestFullscreen();
    }
  };

  const getSyncStatus = () => {
    const absDrift = Math.abs(drift);
    if (absDrift < 0.1) return { label: "In Sync", color: "status-online" };
    if (absDrift < 0.3) return { label: "Minor Drift", color: "status-away" };
    return { label: "Major Drift", color: "status-busy" };
  };

  const syncStatus = getSyncStatus();

  return (
    <Card className={`overflow-hidden ${className}`} data-testid={`card-stream-${stream.id}`}>
      {/* Video Container */}
      <div className="relative aspect-video bg-neutral-900">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          playsInline
          muted={!isMaster}
          data-testid={`video-player-${stream.id}`}
        />
        
        {/* Loading Animation - Shows briefly on initial load */}
        {showLoadingText && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-muted-foreground border-t-foreground"></div>
            <p className="text-xs text-muted-foreground font-medium">Loading Streams...</p>
          </div>
        )}

        {/* No Signal / Live Badge Overlay - Shows after initial loading text */}
        {!showLoadingText && (
          <div className="absolute top-3 right-3">
            {(isLoading || hasError) ? (
              <Badge 
                variant="secondary" 
                className="flex items-center gap-1.5 px-2 py-1"
                data-testid={`badge-no-signal-${stream.id}`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="inline-flex rounded-full h-2 w-2 bg-muted-foreground"></span>
                </span>
                <span className="text-xs font-semibold">NO SIGNAL</span>
              </Badge>
            ) : isLive ? (
              <Badge 
                variant="destructive" 
                className="flex items-center gap-1.5 px-2 py-1"
                data-testid={`badge-live-${stream.id}`}
              >
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span className="text-xs font-semibold">LIVE</span>
              </Badge>
            ) : null}
          </div>
        )}
      </div>

      {/* Info Bar */}
      <div className="flex items-center justify-between px-4 py-2 h-10 border-t border-card-border">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium" data-testid={`text-stream-name-${stream.id}`}>
            {stream.name}
          </span>
          {isMaster && (
            <Badge variant="outline" className="text-xs px-1.5 py-0.5">
              MASTER
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span 
            className={`inline-flex h-2 w-2 rounded-full bg-${syncStatus.color}`}
            data-testid={`indicator-sync-${stream.id}`}
          />
          <span className="text-xs font-mono text-muted-foreground" data-testid={`text-drift-${stream.id}`}>
            {drift >= 0 ? '+' : ''}{drift.toFixed(2)}s
          </span>
        </div>
      </div>

      {/* Control Bar */}
      <div className="flex items-center gap-2 px-4 py-2 h-12 border-t border-card-border">
        <Button
          onClick={handlePlayPause}
          variant="ghost"
          size="icon"
          disabled={isLoading || hasError}
          data-testid={`button-play-pause-${stream.id}`}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </Button>
        <Button
          onClick={handleReload}
          variant="ghost"
          size="icon"
          disabled={isLoading}
          data-testid={`button-reload-stream-${stream.id}`}
        >
          <RotateCw className="w-4 h-4" />
        </Button>
        <Button
          onClick={handleFullscreen}
          variant="ghost"
          size="icon"
          disabled={isLoading || hasError}
          data-testid={`button-fullscreen-${stream.id}`}
        >
          <Maximize2 className="w-4 h-4" />
        </Button>
        <div className="ml-auto text-xs text-muted-foreground">
          {syncStatus.label}
        </div>
      </div>
    </Card>
  );
}
