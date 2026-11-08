export type Ink = 'Amber' | 'Amethyst' | 'Emerald' | 'Ruby' | 'Sapphire' | 'Steel';

export interface LorcanaCard {
  id: number;
  name: string;
  version?: string;
  fullName: string;
  setCode: string;
  number: number;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Super Rare' | 'Legendary' | 'Enchanted' | 'Special';
  /** One ink, two joined by '-' for dual-ink cards, or '' for none. */
  color: Ink | `${Ink}-${Ink}` | '';
  cost: number;
  type: 'Character' | 'Action' | 'Item' | 'Song' | 'Location';
  strength?: number;
  willpower?: number;
  lore?: number;
  inkwell: boolean;
  colors?: string[];
  moveCost?: number;
  abilities?: CardAbility[];
  keywordAbilities?: string[];
  effects?: string[];
  fullText?: string;
  flavorText?: string;
  artists?: string[];
  images: {
    full: string;
    thumbnail: string;
  };
  story?: string;
  subtypes?: string[];
  foilTypes?: string[];
  promoGrouping?: string;
  variant?: string;
  /** Names this card also counts as (e.g. Flotsam & Jetsam). */
  names?: string[];
  /** Overrides the 4-copy limit: absent means 4, null means any number. */
  maxCopiesInDeck?: number | null;
  legal: { core: boolean; infinity: boolean };
}

export interface CardAbility {
  type: string;
  name?: string;
  effect?: string;
  keyword?: string;
  keywordValue?: string;
  fullText?: string;
}

// Card ID based collection with foil support
export interface CollectionCardEntry {
  cardId: number; // Unique card ID
  quantityNormal: number; // Normal (non-foil) quantity
  quantityFoil: number; // Foil quantity
}

export interface DeckCardEntry {
  cardId: number;
  quantity: number;
}

export interface BinderCardEntry {
  cardId: number;
  quantity: number;
}

export interface CustomBinder {
  id: string;
  name: string;
  description?: string;
  kind: 'set' | 'custom';
  setCode?: string;
  cards: BinderCardEntry[];
  isPublic: boolean;
  userId: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Deck {
  id: string;
  name: string;
  description?: string;
  /** Long-form guide in Markdown. */
  guide?: string;
  cards: DeckCardEntry[];
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
  isPublic?: boolean;
  userId?: string;
  ownerName?: string;
  version?: number;
  avatar?: {
    cardId: number;
    cropData: {
      x: number;
      y: number;
      scale: number;
    };
  };
}

export interface DeckSummary {
  id: string;
  name: string;
  description?: string;
  cardCount: number;
  inkDistribution: Record<string, number>;
  isValid: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile {
  userId: string;
  displayName: string;
  fullName?: string;
  location?: string;
  bio?: string;
  avatarCardId?: number;
  avatarCropData?: { x: number; y: number; scale: number };
  isPublic: boolean;
  activeCollectionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CardDatabase {
  metadata: {
    formatVersion: string;
    generatedOn: string;
    language: string;
  };
  sets: Record<string, {
    prereleaseDate: string | null;
    releaseDate: string | null;
    hasAllCards: boolean;
    type: string;
    number: number;
    name: string;
    legal: { core: boolean; infinity: boolean };
  }>;
  cards: LorcanaCard[];
}