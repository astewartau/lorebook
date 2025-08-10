import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import DeckPanel from '../deck/DeckPanel';
import { Deck } from '../../types';

interface DeckEditingSidebarProps {
  isEditingDeck: boolean;
  currentDeck: Deck | null;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  onRemoveCard: (cardId: number) => void;
  onUpdateQuantity: (cardId: number, quantity: number) => void;
  onClearDeck: () => void;
  onViewDeck: (deckId?: string) => void;
  onStopEditing: () => void;
  onUpdateDeckName: (name: string) => void;
  onUpdateDeckDescription: (description: string) => void;
  deckValidation: { isValid: boolean; errors: string[] };
}

const DeckEditingSidebar: React.FC<DeckEditingSidebarProps> = ({
  isEditingDeck,
  currentDeck,
  sidebarCollapsed,
  setSidebarCollapsed,
  onRemoveCard,
  onUpdateQuantity,
  onClearDeck,
  onViewDeck,
  onStopEditing,
  onUpdateDeckName,
  onUpdateDeckDescription,
  deckValidation
}) => {
  if (!isEditingDeck || !currentDeck) {
    return null;
  }

  return (
    <>
      {/* Backdrop when expanded - only on mobile/tablet */}
      {!sidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 z-30 lg:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
      
      {/* Deck Sidebar */}
      <div className={`fixed top-0 right-0 h-screen transition-all duration-300 ease-in-out z-40 ${sidebarCollapsed ? 'w-16' : 'w-80'}`}>
        {/* Collapse/Expand Button */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-50 w-8 h-12 bg-white border-2 border-lorcana-gold rounded-l-sm shadow-xl hover:bg-lorcana-cream transition-colors flex items-center justify-center"
        >
          {sidebarCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
        
        {/* Sidebar Content */}
        <div className={`h-full transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <DeckPanel
            deck={currentDeck}
            onRemoveCard={onRemoveCard}
            onUpdateQuantity={onUpdateQuantity}
            onClearDeck={onClearDeck}
            onViewDeck={onViewDeck}
            onStopEditing={onStopEditing}
            onUpdateDeckName={onUpdateDeckName}
            onUpdateDeckDescription={onUpdateDeckDescription}
            validation={deckValidation}
            isCollapsed={sidebarCollapsed}
          />
        </div>
      </div>
    </>
  );
};

export default DeckEditingSidebar;