import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { LorcanaCard, CardDatabase } from '../types';
import { cardDataService } from '../services/cardDataService';
import fallbackCardData from '../data/allCards.json';

interface CardDataContextType {
  allCards: LorcanaCard[];
  sets: CardDatabase['sets'];
  isLoading: boolean;
  error: string | null;
  refreshCardData: () => Promise<void>;
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
  const [allCards, setAllCards] = useState<LorcanaCard[]>((fallbackCardData as CardDatabase).cards);
  const [sets, setSets] = useState<CardDatabase['sets']>((fallbackCardData as CardDatabase).sets);
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
      // Keep using fallback data if load fails
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

  return (
    <CardDataContext.Provider value={{ allCards, sets, isLoading, error, refreshCardData }}>
      {children}
    </CardDataContext.Provider>
  );
};