class ImageLoadQueue {
  private queue: Array<{ url: string; callback: () => void }> = [];
  private activeLoads = 0;
  private maxConcurrent = 3;
  private loadedCache = new Set<string>();

  addToQueue(url: string, callback: () => void) {
    // If already loaded, call callback immediately
    if (this.loadedCache.has(url)) {
      callback();
      return;
    }

    // Add to queue
    this.queue.push({ url, callback });
    this.processQueue();
  }

  private processQueue() {
    while (this.activeLoads < this.maxConcurrent && this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) continue;

      this.activeLoads++;
      
      const img = new Image();
      
      img.onload = () => {
        this.activeLoads--;
        this.loadedCache.add(item.url);
        item.callback();
        this.processQueue();
      };

      img.onerror = () => {
        this.activeLoads--;
        // Still call callback on error to prevent hanging
        item.callback();
        this.processQueue();
      };

      img.src = item.url;
    }
  }

  clearQueue() {
    this.queue = [];
  }

  isLoaded(url: string): boolean {
    return this.loadedCache.has(url);
  }

  markAsLoaded(url: string): void {
    this.loadedCache.add(url);
  }
}

// Singleton instance
export const imageLoadQueue = new ImageLoadQueue();