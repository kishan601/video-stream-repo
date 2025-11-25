import { useEffect, useRef, useState, useCallback, lazy, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Pause, RotateCw, Activity } from "lucide-react";
import { VideoSyncManager, type SyncState } from "@/lib/VideoSyncManager";
import { useIsMobile } from "@/hooks/useMediaQuery";
import type { StreamsResponse } from "@shared/schema";

// Lazy load bottom panel for performance
const BottomPanel = lazy(() => 
  import("@/components/BottomPanel").then(m => ({ default: m.BottomPanel }))
);

export default function Dashboard() {
  const isMobile = useIsMobile();
  const syncManagerRef = useRef<VideoSyncManager | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [syncStates, setSyncStates] = useState<SyncState[]>([]);
  const videoRefsMap = useRef<Map<number, HTMLVideoElement>>(new Map());

  // Fetch stream configuration
  const { data: streamsData, isLoading, error } = useQuery<StreamsResponse>({
    queryKey: ['/api/streams'],
  });

  // Callback to register video elements
  const registerVideo = useCallback((streamId: number, video: HTMLVideoElement | null) => {
    if (video) {
      videoRefsMap.current.set(streamId, video);
    } else {
      videoRefsMap.current.delete(streamId);
    }
  }, []);

  // Initialize sync manager when all videos are loaded
  useEffect(() => {
    if (!streamsData?.streams || videoRefsMap.current.size !== streamsData.streams.length) {
      return;
    }

    // Create sync manager with callback
    const syncManager = new VideoSyncManager((states) => {
      setSyncStates(states);
    });

    // Register all video elements
    streamsData.streams.forEach((stream) => {
      const video = videoRefsMap.current.get(stream.id);
      if (video) {
        syncManager.addVideo(video, stream.id);
      }
    });

    // Set first stream as master
    syncManager.setMaster(0);

    // Start sync loop
    syncManager.start();

    syncManagerRef.current = syncManager;

    return () => {
      syncManager.destroy();
      syncManagerRef.current = null;
    };
  }, [streamsData?.streams]);

  const handlePlayAll = async () => {
    if (syncManagerRef.current) {
      await syncManagerRef.current.playAll();
      setIsPlaying(true);
    }
  };

  const handlePauseAll = () => {
    if (syncManagerRef.current) {
      syncManagerRef.current.pauseAll();
      setIsPlaying(false);
    }
  };

  const handleSyncAll = () => {
    if (syncManagerRef.current) {
      syncManagerRef.current.forceSync();
    }
  };

  const getDriftForStream = (streamId: number): number => {
    const state = syncStates.find(s => s.streamId === streamId);
    return state?.drift ?? 0;
  };

  const getOverallSyncHealth = (): { status: string; color: string } => {
    if (syncStates.length === 0) return { status: "Initializing", color: "muted" };
    
    const maxDrift = Math.max(...syncStates.map(s => Math.abs(s.drift)));
    
    if (maxDrift < 0.1) return { status: "Excellent Sync", color: "status-online" };
    if (maxDrift < 0.3) return { status: "Good Sync", color: "status-away" };
    return { status: "Needs Sync", color: "status-busy" };
  };

  const syncHealth = getOverallSyncHealth();
  const averageDrift = syncStates.length > 0 
    ? syncStates.reduce((sum, s) => sum + Math.abs(s.drift), 0) / syncStates.length 
    : 0;

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-destructive text-5xl">⚠</div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Connection Error</h1>
            <p className="text-sm text-muted-foreground">
              Unable to connect to the streaming server. Please ensure the backend is running.
            </p>
          </div>
          <Button onClick={() => window.location.reload()} data-testid="button-reload-page">
            <RotateCw className="w-4 h-4 mr-2" />
            Reload Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-animated">
      {/* Header */}
      <header className="h-14 md:h-16 border-b border-glass header-glow sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-3 md:px-6 h-full flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <Activity className="w-5 h-5 md:w-6 md:h-6 text-primary flex-shrink-0" />
            <h1 className="text-lg md:text-2xl font-bold truncate text-gradient-cyan text-title-pulse" data-testid="text-title">
              {isMobile ? "Video Dashboard" : "Video Monitoring Dashboard"}
            </h1>
          </div>

          {!isMobile && (
            <div className="flex items-center gap-4">
              {/* Sync Health Indicator */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-card border border-glass shadow-glass badge-animate hover-glow">
                <span className={`inline-flex h-2.5 w-2.5 rounded-full bg-${syncHealth.color} animate-pulse`} />
                <span className="text-sm font-medium" data-testid="text-sync-status">{syncHealth.status}</span>
              </div>

              {/* Master Controls */}
              <div className="flex items-center gap-2">
                {!isPlaying ? (
                  <Button 
                    onClick={handlePlayAll} 
                    variant="default"
                    size="sm"
                    data-testid="button-play-all"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Play All
                  </Button>
                ) : (
                  <Button 
                    onClick={handlePauseAll} 
                    variant="secondary"
                    size="sm"
                    data-testid="button-pause-all"
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Pause All
                  </Button>
                )}
                <Button 
                  onClick={handleSyncAll} 
                  variant="outline"
                  size="sm"
                  data-testid="button-sync-all"
                >
                  <RotateCw className="w-4 h-4 mr-2" />
                  Sync
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Video Grid */}
      <main className={`container mx-auto px-2 md:px-6 ${isMobile ? "pb-28" : "pb-24"}`}>
        {isLoading ? (
          <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"} gap-4 md:gap-6 py-6`}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-video w-full rounded-lg skeleton-animated" />
                <Skeleton className="h-8 w-full rounded-md skeleton-animated" />
                <Skeleton className="h-10 w-full rounded-md skeleton-animated" />
              </div>
            ))}
          </div>
        ) : (
          <div className={`grid ${isMobile ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"} gap-4 md:gap-6 py-6`} data-testid="grid-videos">
            {streamsData?.streams.map((stream, index) => (
              <VideoPlayer
                key={stream.id}
                stream={stream}
                isMaster={index === 0}
                drift={getDriftForStream(stream.id)}
                onVideoRef={registerVideo}
                isMobile={isMobile}
              />
            ))}
          </div>
        )}
      </main>

      {/* Control Panel (Bottom Bar) - Lazy loaded on desktop only */}
      {!isMobile && (
        <Suspense fallback={null}>
          <BottomPanel 
            streamsData={streamsData}
            syncStates={syncStates}
            averageDrift={averageDrift}
          />
        </Suspense>
      )}

      {/* Mobile Control Panel - Simplified */}
      {isMobile && !isLoading && (
        <div className="fixed bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
          <div className="flex items-center justify-between px-3 py-3 gap-2">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="text-xs">
                <div className="text-muted-foreground">Streams</div>
                <div className="text-sm font-semibold font-mono">{streamsData?.streams.length ?? 0} / 6</div>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              {!isPlaying ? (
                <Button onClick={handlePlayAll} variant="default" size="sm" data-testid="button-play-all-mobile">
                  <Play className="w-4 h-4" />
                </Button>
              ) : (
                <Button onClick={handlePauseAll} variant="secondary" size="sm" data-testid="button-pause-all-mobile">
                  <Pause className="w-4 h-4" />
                </Button>
              )}
              <Button onClick={handleSyncAll} variant="outline" size="sm" data-testid="button-sync-all-mobile">
                <RotateCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
