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
  private maxConcurrent = 4;
  private maxRetries = 3;
  private registeredImages: Map<string, LoadRequest> = new Map();

  private constructor() {
    // Initialize priority queues
    for (let i = 1; i <= 8; i++) {
      this.queue.set(i as ImagePriority, []);
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
    // Check if already loaded
    const state = this.loadStates.get(url);
    if (state?.isLoaded) {
      onLoad(url);
      return;
    }

    // Calculate priority
    const priority = this.calculatePriority(imageType, isInViewport, state?.hasFailed);

    // Create or update request
    const request: LoadRequest = {
      url,
      priority,
      imageType,
      cardId,
      onLoad,
      onError,
      retryCount: state?.retryCount || 0,
      isInViewport,
      hasFailed: state?.hasFailed
    };

    // Remove from old priority queue if exists
    const existingRequest = this.registeredImages.get(url);
    if (existingRequest) {
      this.removeFromQueue(existingRequest);
    }

    // Add to new priority queue
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
      img.src = '';
      this.activeLoads.delete(url);
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
    // Start new loads up to max concurrent
    while (this.activeLoads.size < this.maxConcurrent) {
      const request = this.getNextRequest();
      if (!request) break;

      // Skip if already loading
      if (this.activeLoads.has(request.url)) continue;

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

      // Callback
      request.onLoad(request.url);

      // Process next
      this.processQueue();
    };

    img.onerror = () => {
      const retryCount = request.retryCount + 1;

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
        const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000);
        setTimeout(() => {
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
        request.onError(request.url);

        // If thumbnail failed completely, prioritize full image
        if (request.imageType === 'regular-thumbnail' && request.isInViewport) {
          const fullImageUrl = request.url.replace('/thumbnail/', '/full/');
          this.updateFailedThumbnailPriority(fullImageUrl);
        }

        this.processQueue();
      }
    };

    // Determine which URL to use based on retry count
    let imageUrl = request.url;
    
    // After first failure, try CorsProxy.io for subsequent retries
    if (request.retryCount > 0) {
      imageUrl = `https://corsproxy.io/?${encodeURIComponent(request.url)}`;
    }

    // Start loading
    img.src = imageUrl;
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

  // Clear all queues and states (useful for cleanup)
  clear(): void {
    // Cancel all active loads
    this.activeLoads.forEach((img, url) => {
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