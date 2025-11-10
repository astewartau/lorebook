import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { LorcanaCard, CardDatabase } from '../types';
import { cardDataService } from '../services/cardDataService';
import * as cardDataUtils from '../utils/cardDataUtils';

interface CardDataContextType {
  allCards: LorcanaCard[];
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

interface CardDataProviderProps {
  children: ReactNode;
}

export const CardDataProvider: React.FC<CardDataProviderProps> = ({ children }) => {
  const [allCards, setAllCards] = useState<LorcanaCard[]>([]);
  const [sets, setSets] = useState<CardDatabase['sets']>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await cardDataService.getCardData();
      setAllCards(data.cards);
      setSets(data.sets);
    } catch (err) {
      console.error('Failed to load card data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load card data');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await cardDataService.refreshCardData();
      setAllCards(data.cards);
      setSets(data.sets);
    } catch (err) {
      console.error('Failed to refresh card data:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh card data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCardData();
  }, []);

  // Compute derived data using useMemo for performance
  const setsArray = useMemo(() => cardDataUtils.getSetsFromDatabase({ sets, cards: allCards, metadata: { formatVersion: '', generatedOn: '', language: 'en' } }), [sets, allCards]);
  const rarities = useMemo(() => cardDataUtils.getRarities(allCards), [allCards]);
  const colors = useMemo(() => cardDataUtils.getColors(allCards), [allCards]);
  const cardTypes = useMemo(() => cardDataUtils.getCardTypes(allCards), [allCards]);
  const stories = useMemo(() => cardDataUtils.getStories(allCards), [allCards]);
  const subtypes = useMemo(() => cardDataUtils.getSubtypes(allCards), [allCards]);
  const costs = useMemo(() => cardDataUtils.getCosts(allCards), [allCards]);
  const strengthRange = useMemo(() => cardDataUtils.getStrengthRange(allCards), [allCards]);
  const willpowerRange = useMemo(() => cardDataUtils.getWillpowerRange(allCards), [allCards]);
  const loreRange = useMemo(() => cardDataUtils.getLoreRange(allCards), [allCards]);
  const costRange = useMemo(() => cardDataUtils.getCostRange(allCards), [allCards]);

  return (
    <CardDataContext.Provider value={{
      allCards,
      sets: setsArray,
      setsObject: sets,
      isLoading,
      error,
      refreshCardData,
      rarityOrder: cardDataUtils.rarityOrder,
      rarities,
      colors,
      cardTypes,
      stories,
      subtypes,
      costs,
      strengthRange,
      willpowerRange,
      loreRange,
      costRange
    }}>
      {children}
    </CardDataContext.Provider>
  );
};