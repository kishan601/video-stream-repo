import { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCw, Maximize2, Volume2, VolumeX } from "lucide-react";
import type { StreamConfig } from "@shared/schema";

// Detect if URL is a local VOD file or live stream
const isLocalVOD = (url: string): boolean => {
  return url.includes('/streams/') || url.startsWith('/');
};

// Get HLS config based on stream type
const getHlsConfig = (url: string) => {
  const isVOD = isLocalVOD(url);
  
  if (isVOD) {
    // VOD settings: balance between buffering and performance
    return {
      enableWorker: true,
      lowLatencyMode: false,
      backBufferLength: 60,
      maxBufferLength: 40,
      maxMaxBufferLength: 80,
      liveSyncDuration: 10,
      liveMaxLatencyDuration: 20,
    };
  } else {
    // Live stream settings: prioritize low latency for real-time
    return {
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: 30,
      maxBufferLength: 25,
      maxMaxBufferLength: 50,
      liveSyncDuration: 3,
      liveMaxLatencyDuration: 10,
    };
  }
};

interface VideoPlayerProps {
  stream: StreamConfig;
  isMaster?: boolean;
  drift?: number;
  onVideoRef?: (streamId: number, video: HTMLVideoElement | null) => void;
  className?: string;
  isMobile?: boolean;
}

export function VideoPlayer({ 
  stream, 
  isMaster = false, 
  drift = 0,
  onVideoRef,
  className = "",
  isMobile = false
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isLive, setIsLive] = useState(false);
  const [showLoadingText, setShowLoadingText] = useState(true);
  const [isMuted, setIsMuted] = useState(!isMaster);

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

    // Check if this is an MP4 file (not an HLS stream)
    const isMP4 = stream.url.endsWith('.mp4');

    if (isMP4) {
      // Direct MP4 playback - no HLS.js needed
      video.src = stream.url;
      
      const handleLoadedMetadata = () => {
        setShowLoadingText(false);
        setIsLoading(false);
        setIsLive(true);
        setHasError(false);
      };

      const handleError = () => {
        console.error(`Media error on stream ${stream.id}`);
        setShowLoadingText(false);
        setHasError(true);
        setIsLive(false);
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('error', handleError);

      return () => {
        clearTimeout(loadingTimer);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('error', handleError);
      };
    } else if (Hls.isSupported()) {
      // HLS stream playback
      const hls = new Hls(getHlsConfig(stream.url));

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
      hlsRef.current = null;
    }

    const isMP4 = stream.url.endsWith('.mp4');

    if (isMP4) {
      // Reload MP4 file
      video.src = stream.url;
      video.load();
      
      const handleLoadedMetadata = () => {
        setIsLoading(false);
        setIsLive(true);
        video.play().catch(() => {});
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      };

      video.addEventListener('loadedmetadata', handleLoadedMetadata);
    } else {
      // Reload HLS stream
      const hls = new Hls(getHlsConfig(stream.url));

      hls.loadSource(stream.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        setIsLive(true);
        video.play().catch(() => {});
      });

      hlsRef.current = hls;
    }
  };

  const handleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (video.requestFullscreen) {
      video.requestFullscreen();
    }
  };

  const handleVolumeToggle = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isMuted) {
      video.muted = false;
      setIsMuted(false);
    } else {
      video.muted = true;
      setIsMuted(true);
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
    <Card className={`overflow-hidden backdrop-blur-sm border-glass shadow-glass card-hover-lift ${className}`} data-testid={`card-stream-${stream.id}`}>
      {/* Video Container */}
      <div className="relative aspect-video bg-cinema-dark">
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
                className="flex items-center gap-1.5 px-2 py-1 shadow-glow-red badge-animate"
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
      <div className={`flex items-center justify-between px-3 border-t border-card-border ${isMobile ? "py-1.5 h-8" : "px-4 py-2 h-10"}`}>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`font-medium ${isMobile ? "text-xs" : "text-sm"}`} data-testid={`text-stream-name-${stream.id}`}>
            {isMobile ? `S${stream.id}` : stream.name}
          </span>
          {isMaster && !isMobile && (
            <Badge variant="outline" className="text-xs px-1.5 py-0.5">
              MASTER
            </Badge>
          )}
        </div>
        {!isMobile && (
          <div className="flex items-center gap-2">
            <span 
              className={`inline-flex h-2 w-2 rounded-full bg-${syncStatus.color}`}
              data-testid={`indicator-sync-${stream.id}`}
            />
            <span className="text-xs font-mono text-muted-foreground" data-testid={`text-drift-${stream.id}`}>
              {drift >= 0 ? '+' : ''}{drift.toFixed(2)}s
            </span>
          </div>
        )}
      </div>

      {/* Control Bar */}
      <div className={`flex items-center gap-1.5 border-t border-glass bg-glass/30 backdrop-blur-sm ${isMobile ? "px-2 py-1.5 h-9" : "px-4 py-2 h-12 gap-2"}`}>
        <Button
          onClick={handlePlayPause}
          variant="ghost"
          size={isMobile ? "sm" : "icon"}
          disabled={isLoading || hasError}
          data-testid={`button-play-pause-${stream.id}`}
          className={`hover-glow button-ripple ${isMobile ? "h-7 w-7" : ""}`}
        >
          {isPlaying ? (
            <Pause className="w-3.5 h-3.5" />
          ) : (
            <Play className="w-3.5 h-3.5" />
          )}
        </Button>
        <Button
          onClick={handleVolumeToggle}
          variant="ghost"
          size={isMobile ? "sm" : "icon"}
          disabled={isLoading || hasError}
          data-testid={`button-volume-${stream.id}`}
          className={`hover-glow button-ripple ${isMobile ? "h-7 w-7" : ""}`}
        >
          {isMuted ? (
            <VolumeX className="w-3.5 h-3.5" />
          ) : (
            <Volume2 className="w-3.5 h-3.5" />
          )}
        </Button>
        <Button
          onClick={handleReload}
          variant="ghost"
          size={isMobile ? "sm" : "icon"}
          disabled={isLoading}
          data-testid={`button-reload-stream-${stream.id}`}
          className={`hover-glow button-ripple ${isMobile ? "h-7 w-7" : ""}`}
        >
          <RotateCw className="w-3.5 h-3.5" />
        </Button>
        {!isMobile && (
          <>
            <Button
              onClick={handleFullscreen}
              variant="ghost"
              size="icon"
              disabled={isLoading || hasError}
              data-testid={`button-fullscreen-${stream.id}`}
              className="hover-glow button-ripple"
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
            <div className="ml-auto text-xs text-muted-foreground">
              {syncStatus.label}
            </div>
          </>
        )}
      </div>
    </Card>
  );
}
