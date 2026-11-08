import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { LorcanaCard, CardDatabase } from '../types';
import { cardDataService } from '../services/cardDataService';
import * as cardDataUtils from '../utils/cardDataUtils';

interface CardDataContextType {
  allCards: LorcanaCard[];
  cardsById: ReadonlyMap<number, LorcanaCard>;
  getCard: (id: number) => LorcanaCard | undefined;
  sets: Array<{ code: string; name: string; number: number }>;
  setsObject: CardDatabase['sets'];
  isLoading: boolean;
  error: string | null;
  refreshCardData: () => Promise<void>;
  // Derived data - computed from current card data
  rarityOrder: string[];
  rarities: string[];
  colors: string[];
  cardTypes: string[];
  stories: string[];
  subtypes: string[];
  costs: number[];
  strengthRange: { min: number; max: number };
  willpowerRange: { min: number; max: number };
  loreRange: { min: number; max: number };
  costRange: { min: number; max: number };
}

const CardDataContext = createContext<CardDataContextType | undefined>(undefined);

export const useCardData = () => {
  const context = useContext(CardDataContext);
  if (!context) {
    throw new Error('useCardData must be used within a CardDataProvider');
  }
  return context;
};

const EMPTY_SETS: CardDatabase['sets'] = {};

export const CardDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<CardDatabase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (refresh: boolean) => {
    setIsLoading(true);
    setError(null);
    try {
      setData(await (refresh ? cardDataService.refreshCardData() : cardDataService.getCardData()));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load card data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(false);
  }, [load]);

  const refreshCardData = useCallback(() => load(true), [load]);

  const value = useMemo<CardDataContextType>(() => {
    const allCards = data?.cards ?? [];
    const setsObject = data?.sets ?? EMPTY_SETS;
    const cardsById = new Map(allCards.map(c => [c.id, c]));
    return {
      allCards,
      cardsById,
      getCard: (id: number) => cardsById.get(id),
      sets: cardDataUtils.getSetsFromDatabase({ sets: setsObject, cards: allCards, metadata: { formatVersion: '', generatedOn: '', language: 'en' } }),
      setsObject,
      isLoading,
      error,
      refreshCardData,
      rarityOrder: cardDataUtils.rarityOrder,
      rarities: cardDataUtils.getRarities(allCards),
      colors: cardDataUtils.getColors(allCards),
      cardTypes: cardDataUtils.getCardTypes(allCards),
      stories: cardDataUtils.getStories(allCards),
      subtypes: cardDataUtils.getSubtypes(allCards),
      costs: cardDataUtils.getCosts(allCards),
      strengthRange: cardDataUtils.getStrengthRange(allCards),
      willpowerRange: cardDataUtils.getWillpowerRange(allCards),
      loreRange: cardDataUtils.getLoreRange(allCards),
      costRange: cardDataUtils.getCostRange(allCards),
    };
  }, [data, isLoading, error, refreshCardData]);

  return <CardDataContext.Provider value={value}>{children}</CardDataContext.Provider>;
};
