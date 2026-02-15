import { LorcanaCard, CardDatabase } from '../types';

// Local copy in public folder (update periodically from https://lorcanajson.org/files/current/en/allCards.json)
const LOCAL_URL = '/allCards.json';

const CACHE_KEY = 'lorcana_cards_cache';
const CACHE_TIMESTAMP_KEY = 'lorcana_cards_cache_timestamp';
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour cache

class CardDataService {
  private cardsPromise: Promise<CardDatabase> | null = null;
  private currentData: CardDatabase | null = null;

  /**
   * Get card data with caching and fallback
   */
  async getCardData(): Promise<CardDatabase> {
    // If we already have data loaded in memory, return it
    if (this.currentData) {
      return this.currentData;
    }

    // If a fetch is already in progress, wait for it
    if (this.cardsPromise) {
      return this.cardsPromise;
    }

    // Start the fetch process
    this.cardsPromise = this.fetchCardData();
    
    try {
      this.currentData = await this.cardsPromise;
      return this.currentData;
    } finally {
      this.cardsPromise = null;
    }
  }

  private async fetchCardData(): Promise<CardDatabase> {
    // Check localStorage cache first
    const cachedData = this.getCachedData();
    if (cachedData) {
      console.log('Using cached card data');
      return cachedData;
    }

    let data: CardDatabase | null = null;

    // Fetch from local copy
    try {
      console.log('Loading card data...');
      const response = await fetch(LOCAL_URL);

      if (response.ok) {
        data = await response.json() as CardDatabase;
        if (this.validateCardData(data)) {
          console.log(`Loaded ${data.cards.length} cards`);
          this.setCachedData(data);
          return data;
        } else {
          console.error('Card data failed validation');
        }
      } else {
        console.error(`Failed to load card data: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to load card data:', error);
    }

    // Try expired cache as last resort
    const expiredCache = this.getCachedData(true);
    if (expiredCache) {
      console.log('Using expired cache data as last resort');
      return expiredCache;
    }

    // All attempts failed
    throw new Error('Failed to load card data. Please check your internet connection and try again.');
  }

  private validateCardData(data: any): data is CardDatabase {
    return (
      data &&
      Array.isArray(data.cards) &&
      data.cards.length > 0 &&
      data.sets &&
      typeof data.sets === 'object'
    );
  }

  private getCachedData(ignoreExpiry = false): CardDatabase | null {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      const timestamp = localStorage.getItem(CACHE_TIMESTAMP_KEY);
      
      if (!cached || !timestamp) {
        return null;
      }

      const cacheTime = parseInt(timestamp, 10);
      const now = Date.now();
      
      // Check if cache is expired
      if (!ignoreExpiry && (now - cacheTime) > CACHE_DURATION) {
        console.log('Cache expired');
        return null;
      }

      return JSON.parse(cached) as CardDatabase;
    } catch (error) {
      console.error('Failed to read cache:', error);
      return null;
    }
  }

  private setCachedData(data: CardDatabase): void {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(data));
      localStorage.setItem(CACHE_TIMESTAMP_KEY, Date.now().toString());
    } catch (error) {
      console.error('Failed to cache data:', error);
      // If localStorage is full or unavailable, continue without caching
    }
  }

  /**
   * Force refresh the card data from the server
   */
  async refreshCardData(): Promise<CardDatabase> {
    // Clear cache
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(CACHE_TIMESTAMP_KEY);
    
    // Clear memory cache
    this.currentData = null;
    
    // Fetch fresh data
    return this.getCardData();
  }

  /**
   * Get just the cards array
   */
  async getCards(): Promise<LorcanaCard[]> {
    const data = await this.getCardData();
    return data.cards;
  }

  /**
   * Get just the sets data
   */
  async getSets(): Promise<CardDatabase['sets']> {
    const data = await this.getCardData();
    return data.sets;
  }
}

// Export singleton instance
export const cardDataService = new CardDataService();