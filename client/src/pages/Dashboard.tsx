import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { VideoPlayer } from "@/components/VideoPlayer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, Pause, RotateCw, Activity } from "lucide-react";
import { VideoSyncManager, type SyncState } from "@/lib/VideoSyncManager";
import type { StreamsResponse } from "@shared/schema";

export default function Dashboard() {
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-16 border-b border-border sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold" data-testid="text-title">Video Monitoring Dashboard</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Sync Health Indicator */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-card border border-card-border">
              <span className={`inline-flex h-2.5 w-2.5 rounded-full bg-${syncHealth.color}`} />
              <span className="text-sm font-medium" data-testid="text-sync-status">{syncHealth.status}</span>
            </div>

            {/* Master Controls */}
            <div className="flex items-center gap-2">
              {!isPlaying ? (
                <Button 
                  onClick={handlePlayAll} 
                  variant="default"
                  data-testid="button-play-all"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Play All
                </Button>
              ) : (
                <Button 
                  onClick={handlePauseAll} 
                  variant="secondary"
                  data-testid="button-pause-all"
                >
                  <Pause className="w-4 h-4 mr-2" />
                  Pause All
                </Button>
              )}
              <Button 
                onClick={handleSyncAll} 
                variant="outline"
                data-testid="button-sync-all"
              >
                <RotateCw className="w-4 h-4 mr-2" />
                Sync All
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Video Grid */}
      <main className="container mx-auto p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="space-y-3">
                <Skeleton className="aspect-video w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="grid-videos">
              {streamsData?.streams.map((stream, index) => (
                <VideoPlayer
                  key={stream.id}
                  stream={stream}
                  isMaster={index === 0}
                  drift={getDriftForStream(stream.id)}
                  onVideoRef={registerVideo}
                />
              ))}
            </div>
          </>
        )}
      </main>

      {/* Control Panel (Bottom Bar) */}
      <div className="fixed bottom-0 left-0 right-0 h-20 border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-6 h-full flex items-center justify-between">
          {/* Sync Information */}
          <div className="flex items-center gap-6">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Active Streams</div>
              <div className="text-lg font-semibold font-mono" data-testid="text-stream-count">
                {streamsData?.streams.length ?? 0} / 6
              </div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Average Drift</div>
              <div className="text-lg font-semibold font-mono" data-testid="text-avg-drift">
                {averageDrift.toFixed(3)}s
              </div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">RTSP Source</div>
              <div className="text-sm font-mono text-muted-foreground truncate max-w-xs" data-testid="text-rtsp-source">
                {streamsData?.rtspSource ?? 'N/A'}
              </div>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-2">
            {streamsData?.streams.map((stream) => {
              const state = syncStates.find(s => s.streamId === stream.id);
              const isSynced = state?.isSynced ?? false;
              
              return (
                <Badge 
                  key={stream.id} 
                  variant={isSynced ? "default" : "secondary"}
                  className="font-mono text-xs"
                  data-testid={`badge-stream-status-${stream.id}`}
                >
                  S{stream.id} {isSynced ? '✓' : '⚠'}
                </Badge>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom padding to prevent content being hidden by control panel */}
      <div className="h-20" />
    </div>
  );
}
