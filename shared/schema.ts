import { z } from "zod";

// Stream configuration for HLS playback
export const streamConfigSchema = z.object({
  id: z.number(),
  name: z.string(),
  url: z.string().url(),
  delay: z.number(), // Delay in seconds for stream staggering
});

export type StreamConfig = z.infer<typeof streamConfigSchema>;

// Stream health status
export const streamHealthSchema = z.object({
  streamId: z.number(),
  isLive: z.boolean(),
  bitrate: z.number().optional(),
  fps: z.number().optional(),
  lastUpdate: z.string().datetime(),
});

export type StreamHealth = z.infer<typeof streamHealthSchema>;

// Synchronization status for video player
export const syncStatusSchema = z.object({
  streamId: z.number(),
  currentTime: z.number(),
  drift: z.number(), // Drift in seconds from master
  isSynced: z.boolean(), // Within acceptable threshold
  lastSyncTime: z.string().datetime(),
});

export type SyncStatus = z.infer<typeof syncStatusSchema>;

// API response types
export const streamsResponseSchema = z.object({
  streams: z.array(streamConfigSchema),
  rtspSource: z.string(),
});

export type StreamsResponse = z.infer<typeof streamsResponseSchema>;

export const healthResponseSchema = z.object({
  streams: z.array(streamHealthSchema),
  overallHealth: z.enum(["healthy", "degraded", "critical"]),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;
