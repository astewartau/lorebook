type ImagePriority = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

type ImageType = 'regular-thumbnail' | 'regular-full' | 'enchanted-thumbnail' | 'enchanted-full';

interface LoadRequest {
  url: string;
  priority: ImagePriority;
  imageType: ImageType;
  cardId: string;
  onLoad: (url: string) => void;
  onError: (url: string) => void;
  retryCount: number;
  isInViewport: boolean;
  hasFailed?: boolean;
  // New: Store multiple callbacks for the same URL
  callbacks: Array<{
    onLoad: (url: string) => void;
    onError: (url: string) => void;
    cardId: string;
  }>;
}

interface LoadState {
  isLoading: boolean;
  isLoaded: boolean;
  hasFailed: boolean;
  retryCount: number;
}

class ImageLoadManager {
  private static instance: ImageLoadManager;
  private queue: Map<ImagePriority, LoadRequest[]> = new Map();
  private activeLoads: Map<string, HTMLImageElement> = new Map();
  private loadStates: Map<string, LoadState> = new Map();
  private maxConcurrent = 6;
  private maxRetries = 2;
  private registeredImages: Map<string, LoadRequest> = new Map();
  private debug = true; // Enable debug logging

  private constructor() {
    // Initialize priority queues
    for (let i = 1; i <= 8; i++) {
      this.queue.set(i as ImagePriority, []);
    }
    
    if (this.debug) {
      console.log('[ImageLoadManager] Instance created');
    }
  }

  static getInstance(): ImageLoadManager {
    if (!ImageLoadManager.instance) {
      ImageLoadManager.instance = new ImageLoadManager();
    }
    return ImageLoadManager.instance;
  }

  calculatePriority(
    imageType: ImageType,
    isInViewport: boolean,
    hasFailed: boolean = false
  ): ImagePriority {
    if (isInViewport) {
      if (imageType === 'regular-thumbnail') return 1;
      if (imageType === 'regular-full' && hasFailed) return 2;
      if (imageType === 'enchanted-thumbnail') return 3;
      if (imageType === 'regular-full' && !hasFailed) return 5; // After enchanted thumbnails
      if (imageType === 'enchanted-full') return 5;
    } else {
      if (imageType === 'regular-thumbnail') return 4;
      if (imageType === 'enchanted-thumbnail') return 6;
      if (imageType === 'regular-full') return 7;
      if (imageType === 'enchanted-full') return 8;
    }
    return 8; // Default to lowest priority
  }

  registerImage(
    url: string,
    imageType: ImageType,
    cardId: string,
    isInViewport: boolean,
    onLoad: (url: string) => void,
    onError: (url: string) => void
  ): void {
    if (this.debug) {
      console.log(`[ImageLoadManager] Registering image: ${url.split('/').pop()} (${imageType}, viewport: ${isInViewport}, cardId: ${cardId})`);
    }

    // Check if already loaded
    const state = this.loadStates.get(url);
    if (state?.isLoaded) {
      if (this.debug) {
        console.log(`[ImageLoadManager] Already loaded: ${url.split('/').pop()}`);
      }
      onLoad(url);
      return;
    }

    // Check if this URL is already registered
    const existingRequest = this.registeredImages.get(url);
    
    if (existingRequest) {
      // Add callback to existing request instead of creating new one
      existingRequest.callbacks.push({ onLoad, onError, cardId });
      
      // Update priority if this request has higher priority
      const newPriority = this.calculatePriority(imageType, isInViewport, state?.hasFailed);
      if (newPriority < existingRequest.priority) {
        // Remove from old queue
        this.removeFromQueue(existingRequest);
        
        // Update priority and viewport status
        existingRequest.priority = newPriority;
        existingRequest.isInViewport = existingRequest.isInViewport || isInViewport;
        
        // Add back to queue with new priority
        this.addToQueue(existingRequest);
        
        if (this.debug) {
          console.log(`[ImageLoadManager] Updated priority for ${url.split('/').pop()} from ${existingRequest.priority} to ${newPriority}, ${existingRequest.callbacks.length} total callbacks`);
        }
      } else {
        if (this.debug) {
          console.log(`[ImageLoadManager] Added callback to existing request for ${url.split('/').pop()}, ${existingRequest.callbacks.length} total callbacks`);
        }
      }
      
      // Process queue in case priority changed
      this.processQueue();
      return;
    }

    // Calculate priority for new request
    const priority = this.calculatePriority(imageType, isInViewport, state?.hasFailed);

    if (this.debug) {
      console.log(`[ImageLoadManager] New request with priority ${priority} for ${url.split('/').pop()}`);
    }

    // Create new request with callbacks array
    const request: LoadRequest = {
      url,
      priority,
      imageType,
      cardId,
      onLoad, // Keep original for compatibility
      onError, // Keep original for compatibility
      retryCount: state?.retryCount || 0,
      isInViewport,
      hasFailed: state?.hasFailed,
      callbacks: [{ onLoad, onError, cardId }]
    };

    // Add to registry and queue
    this.registeredImages.set(url, request);
    this.addToQueue(request);

    // Process queue
    this.processQueue();
  }

  updatePriority(url: string, isInViewport: boolean): void {
    const request = this.registeredImages.get(url);
    if (!request) return;

    const state = this.loadStates.get(url);
    const newPriority = this.calculatePriority(
      request.imageType,
      isInViewport,
      state?.hasFailed
    );

    if (newPriority !== request.priority) {
      // Remove from old queue
      this.removeFromQueue(request);

      // Update request
      request.priority = newPriority;
      request.isInViewport = isInViewport;

      // Add to new queue
      this.addToQueue(request);

      // Process queue
      this.processQueue();
    }
  }

  cancelLoad(url: string): void {
    // Remove from queue
    const request = this.registeredImages.get(url);
    if (request) {
      this.removeFromQueue(request);
      this.registeredImages.delete(url);
    }

    // Cancel active load
    const img = this.activeLoads.get(url);
    if (img) {
      // Properly abort the image loading
      img.onload = null;
      img.onerror = null;
      img.src = '';
      this.activeLoads.delete(url);
      
      // Process next item in queue since we freed up a slot
      this.processQueue();
    }
  }

  // New method to cancel a specific callback instead of the whole URL
  cancelCallback(url: string, cardId: string): void {
    const request = this.registeredImages.get(url);
    if (request && request.callbacks.length > 1) {
      // Remove only this callback, keep others
      request.callbacks = request.callbacks.filter(cb => cb.cardId !== cardId);
      if (this.debug) {
        console.log(`[ImageLoadManager] Removed callback for ${cardId}, ${request.callbacks.length} callbacks remaining for ${url.split('/').pop()}`);
      }
    } else if (request && request.callbacks.length === 1) {
      // This was the last callback, cancel the whole request
      this.cancelLoad(url);
    }
  }

  private addToQueue(request: LoadRequest): void {
    const priorityQueue = this.queue.get(request.priority);
    if (priorityQueue && !priorityQueue.some(r => r.url === request.url)) {
      priorityQueue.push(request);
    }
  }

  private removeFromQueue(request: LoadRequest): void {
    const priorityQueue = this.queue.get(request.priority);
    if (priorityQueue) {
      const index = priorityQueue.findIndex(r => r.url === request.url);
      if (index !== -1) {
        priorityQueue.splice(index, 1);
      }
    }
  }

  private getNextRequest(): LoadRequest | null {
    // Check each priority level in order
    for (let priority = 1; priority <= 8; priority++) {
      const priorityQueue = this.queue.get(priority as ImagePriority);
      if (priorityQueue && priorityQueue.length > 0) {
        return priorityQueue.shift()!;
      }
    }
    return null;
  }

  private processQueue(): void {
    if (this.debug) {
      const totalQueued = Array.from(this.queue.values()).reduce((sum, queue) => sum + queue.length, 0);
      console.log(`[ImageLoadManager] Processing queue: ${this.activeLoads.size}/${this.maxConcurrent} active, ${totalQueued} queued, ${this.registeredImages.size} registered`);
    }

    // Start new loads up to max concurrent
    while (this.activeLoads.size < this.maxConcurrent) {
      const request = this.getNextRequest();
      if (!request) {
        if (this.debug && this.activeLoads.size === 0) {
          console.log('[ImageLoadManager] No requests in queue');
        }
        break;
      }

      // Skip if already loading
      if (this.activeLoads.has(request.url)) {
        if (this.debug) {
          console.log(`[ImageLoadManager] Skipping already loading: ${request.url.split('/').pop()}`);
        }
        continue;
      }

      if (this.debug) {
        console.log(`[ImageLoadManager] Starting load: ${request.url.split('/').pop()} (priority ${request.priority})`);
      }
      this.loadImage(request);
    }
  }

  private loadImage(request: LoadRequest): void {
    // Update state
    this.loadStates.set(request.url, {
      isLoading: true,
      isLoaded: false,
      hasFailed: false,
      retryCount: request.retryCount
    });

    // Create image element
    const img = new Image();
    this.activeLoads.set(request.url, img);

    img.onload = () => {
      if (this.debug) {
        console.log(`[ImageLoadManager] ✅ Loaded: ${request.url.split('/').pop()}, calling ${request.callbacks.length} callbacks`);
      }

      // Update state
      this.loadStates.set(request.url, {
        isLoading: false,
        isLoaded: true,
        hasFailed: false,
        retryCount: 0
      });

      // Clean up
      this.activeLoads.delete(request.url);
      this.registeredImages.delete(request.url);

      // Call all registered callbacks
      request.callbacks.forEach(callback => {
        callback.onLoad(request.url);
      });

      // Process next
      this.processQueue();
    };

    img.onerror = () => {
      const retryCount = request.retryCount + 1;

      if (this.debug) {
        console.log(`[ImageLoadManager] ❌ Failed: ${request.url.split('/').pop()} (attempt ${retryCount}/${this.maxRetries})`);
      }

      // Update state
      this.loadStates.set(request.url, {
        isLoading: false,
        isLoaded: false,
        hasFailed: true,
        retryCount
      });

      // Clean up active load
      this.activeLoads.delete(request.url);

      if (retryCount < this.maxRetries) {
        // Retry with exponential backoff
        const delay = Math.min(500 * Math.pow(2, retryCount - 1), 3000);
        setTimeout(() => {
          // Check if request is still registered (might have been cancelled)
          if (!this.registeredImages.has(request.url)) {
            return;
          }
          
          request.retryCount = retryCount;
          
          // If this is a thumbnail that failed, bump up the priority of the full image
          if (request.imageType === 'regular-thumbnail' && request.isInViewport) {
            // Update priority for this failed thumbnail's corresponding full image
            const fullImageUrl = request.url.replace('/thumbnail/', '/full/');
            this.updateFailedThumbnailPriority(fullImageUrl);
          }

          this.addToQueue(request);
          this.processQueue();
        }, delay);
      } else {
        // Max retries exceeded
        this.registeredImages.delete(request.url);
        
        // Call all registered error callbacks
        request.callbacks.forEach(callback => {
          callback.onError(request.url);
        });

        // If thumbnail failed completely, prioritize full image
        if (request.imageType === 'regular-thumbnail' && request.isInViewport) {
          const fullImageUrl = request.url.replace('/thumbnail/', '/full/');
          this.updateFailedThumbnailPriority(fullImageUrl);
        }

        this.processQueue();
      }
    };

    // Start loading - no CORS proxy fallback as it causes OpaqueResponseBlocking
    img.src = request.url;
  }

  private updateFailedThumbnailPriority(fullImageUrl: string): void {
    const fullRequest = this.registeredImages.get(fullImageUrl);
    if (fullRequest && fullRequest.isInViewport) {
      this.removeFromQueue(fullRequest);
      fullRequest.priority = 2; // Bump to priority 2
      fullRequest.hasFailed = true;
      this.addToQueue(fullRequest);
    }
  }

  isLoaded(url: string): boolean {
    return this.loadStates.get(url)?.isLoaded || false;
  }

  isLoading(url: string): boolean {
    return this.loadStates.get(url)?.isLoading || false;
  }

  hasFailed(url: string): boolean {
    return this.loadStates.get(url)?.hasFailed || false;
  }

  // Clear stale requests that are no longer registered
  clearStaleRequests(): void {
    if (this.debug) {
      console.log('[ImageLoadManager] Clearing stale requests...');
    }

    let staleCancelled = 0;

    // Cancel active loads that are no longer registered
    this.activeLoads.forEach((img, url) => {
      if (!this.registeredImages.has(url)) {
        if (this.debug) {
          console.log(`[ImageLoadManager] Cancelling stale active load: ${url.split('/').pop()}`);
        }
        img.onload = null;
        img.onerror = null;
        img.src = '';
        this.activeLoads.delete(url);
        staleCancelled++;
      }
    });

    // Remove stale requests from queues
    let staleQueued = 0;
    for (let i = 1; i <= 8; i++) {
      const queue = this.queue.get(i as ImagePriority);
      if (queue) {
        const originalLength = queue.length;
        // Filter out requests that are no longer registered
        const filteredQueue = queue.filter(request => this.registeredImages.has(request.url));
        this.queue.set(i as ImagePriority, filteredQueue);
        staleQueued += originalLength - filteredQueue.length;
      }
    }

    if (this.debug && (staleCancelled > 0 || staleQueued > 0)) {
      console.log(`[ImageLoadManager] Cleared ${staleCancelled} stale active loads, ${staleQueued} stale queued requests`);
    }

    // Process queue to start new loads
    this.processQueue();
  }

  // Clear all queues and states (useful for cleanup)
  clear(): void {
    // Cancel all active loads
    this.activeLoads.forEach((img, url) => {
      img.onload = null;
      img.onerror = null;
      img.src = '';
    });
    this.activeLoads.clear();

    // Clear queues
    for (let i = 1; i <= 8; i++) {
      this.queue.set(i as ImagePriority, []);
    }

    // Clear states
    this.registeredImages.clear();
    this.loadStates.clear();
  }

  // Get queue statistics for debugging
  getQueueStats(): { priority: number; count: number }[] {
    const stats: { priority: number; count: number }[] = [];
    for (let i = 1; i <= 8; i++) {
      const count = this.queue.get(i as ImagePriority)?.length || 0;
      if (count > 0) {
        stats.push({ priority: i, count });
      }
    }
    return stats;
  }
}

export default ImageLoadManager;
export type { ImageType, ImagePriority };