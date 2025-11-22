// Storage interface - not needed for streaming dashboard
// Streams are managed by FFmpegStreamManager

export interface IStorage {
  // Empty interface - no persistence needed for this app
}

export class MemStorage implements IStorage {
  constructor() {
    // No storage needed
  }
}

export const storage = new MemStorage();
