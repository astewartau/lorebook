import { LorcanaCard, CardDatabase } from '../types';

// Built by scripts/cards.mjs. The manifest is tiny and revalidated on every
// load; the file it names is content-hashed, so the browser can cache it.
const MANIFEST_URL = '/data/manifest.json';

class CardDataService {
  private dataPromise: Promise<CardDatabase> | null = null;

  getCardData(): Promise<CardDatabase> {
    if (!this.dataPromise) {
      this.dataPromise = this.fetchCardData().catch(error => {
        this.dataPromise = null;
        throw error;
      });
    }
    return this.dataPromise;
  }

  refreshCardData(): Promise<CardDatabase> {
    this.dataPromise = null;
    return this.getCardData();
  }

  private async fetchCardData(): Promise<CardDatabase> {
    const manifestRes = await fetch(MANIFEST_URL, { cache: 'no-cache' });
    if (!manifestRes.ok) {
      throw new Error(`Card data is missing (${manifestRes.status}). Run "npm run cards" to build it.`);
    }
    const manifest = (await manifestRes.json()) as { file: string };
    const res = await fetch(`/data/${manifest.file}`);
    if (!res.ok) throw new Error(`Failed to load card data: ${res.status} ${res.statusText}`);
    const data = (await res.json()) as CardDatabase;
    if (!Array.isArray(data.cards) || data.cards.length === 0 || typeof data.sets !== 'object') {
      throw new Error('Card data failed validation');
    }
    return data;
  }

  async getCards(): Promise<LorcanaCard[]> {
    return (await this.getCardData()).cards;
  }
}

export const cardDataService = new CardDataService();
