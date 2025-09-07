export interface LorcanaCard {
  id: number;
  name: string;
  version?: string;
  fullName: string;
  setCode: string;
  number: number;
  rarity: 'Common' | 'Uncommon' | 'Rare' | 'Super Rare' | 'Legendary' | 'Enchanted' | 'Special';
  color: 'Amber' | 'Amethyst' | 'Emerald' | 'Ruby' | 'Sapphire' | 'Steel' | '';
  cost: number;
  type: 'Character' | 'Action' | 'Item' | 'Song' | 'Location';
  strength?: number;
  willpower?: number;
  lore?: number;
  inkwell: boolean;
  abilities?: any[];
  flavorText?: string;
  artists?: string[];
  images: {
    full: string;
    thumbnail: string;
    foilMask?: string;
  };
  story?: string;
  subtypes?: string[];
  foilTypes?: string[];
  promoGrouping?: string;
}

export interface CollectionCard extends LorcanaCard {
  quantity: number;
  foil: boolean;
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

export interface Deck {
  id: string;
  name: string;
  description?: string;
  cards: DeckCardEntry[];
  createdAt: Date;
  updatedAt: Date;
  isPublic?: boolean;
  userId?: string;
  authorEmail?: string;
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
  id: string;
  userId: string;
  displayName: string;
  fullName?: string;
  location?: string;
  bio?: string;
  avatarUrl?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}


export interface FilterOptions {
  search: string;
  sets: string[];
  colors: string[];
  colorMatchMode: 'any' | 'only' | 'dual-only'; // Color filtering mode
  rarities: string[];
  types: string[];
  stories: string[];
  subtypes: string[];
  costs: number[];
  costMin: number;
  costMax: number;
  strengthMin: number;
  strengthMax: number;
  willpowerMin: number;
  willpowerMax: number;
  loreMin: number;
  loreMax: number;
  inkwellOnly: boolean | null;
  hasEnchanted: boolean | null;
  hasSpecial: boolean | null;
  includeIllumineerQuest: boolean;
  collectionFilter: 'all' | 'owned' | 'not-owned';
  cardCountOperator: 'eq' | 'gte' | 'lte' | null;
  cardCountValue: number;
}

export interface SortOption {
  field: 'name' | 'cost' | 'rarity' | 'set' | 'number' | 'color' | 'type' | 'story' | 'strength' | 'willpower' | 'lore';
  direction: 'asc' | 'desc';
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
  }>;
  cards: LorcanaCard[];
}