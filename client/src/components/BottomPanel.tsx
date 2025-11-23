import { Badge } from "@/components/ui/badge";
import type { StreamsResponse } from "@shared/schema";
import type { SyncState } from "@/lib/VideoSyncManager";

interface BottomPanelProps {
  streamsData: StreamsResponse | undefined;
  syncStates: SyncState[];
  averageDrift: number;
}

export function BottomPanel({ streamsData, syncStates, averageDrift }: BottomPanelProps) {
  return (
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
  );
}
