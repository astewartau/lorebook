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
  onDeleteDeck: () => void;
  onViewDeck: (deckId?: string) => void;
  onStopEditing: () => void;
  onUpdateDeckName: (name: string) => void;
  onUpdateDeckDescription: (description: string) => void;
  deckValidation: { isValid: boolean; errors: string[] };
  navVisible?: boolean;
}

const DeckEditingSidebar: React.FC<DeckEditingSidebarProps> = ({
  isEditingDeck,
  currentDeck,
  sidebarCollapsed,
  setSidebarCollapsed,
  onRemoveCard,
  onUpdateQuantity,
  onDeleteDeck,
  onViewDeck,
  onStopEditing,
  onUpdateDeckName,
  onUpdateDeckDescription,
  deckValidation,
  navVisible = true
}) => {
  if (!isEditingDeck || !currentDeck) {
    return null;
  }

  const totalCards = currentDeck.cards.reduce((sum, card) => sum + card.quantity, 0);

  return (
    <>
      {/* Mobile Deck Button - positioned above mobile navigation, slides down when nav is hidden */}
      <button
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className={`sm:hidden fixed right-4 z-50 px-3 py-2 bg-lorcana-navy text-lorcana-gold border-2 border-lorcana-gold rounded-sm shadow-xl hover:bg-lorcana-purple transition-all duration-300 ease-in-out ${
          navVisible ? 'bottom-20' : 'bottom-6'
        }`}
      >
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Deck</span>
          <span className="text-xs bg-lorcana-gold text-lorcana-navy px-2 py-1 rounded-sm font-bold">
            {totalCards}/60
          </span>
        </div>
      </button>

      {/* Backdrop when expanded - only on mobile/tablet */}
      {!sidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 z-30 lg:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
      
      {/* Deck Sidebar */}
      <div className={`fixed top-0 right-0 h-screen transition-all duration-300 ease-in-out z-40 ${sidebarCollapsed ? 'w-16' : 'w-80'}`}>
        {/* Desktop Collapse/Expand Button - hidden on mobile */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden sm:flex absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-50 w-8 h-12 bg-white border-2 border-lorcana-gold rounded-l-sm shadow-xl hover:bg-lorcana-cream transition-colors items-center justify-center"
        >
          {sidebarCollapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
        
        {/* Sidebar Content */}
        <div className={`h-full transition-all duration-300 ease-in-out ${sidebarCollapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
          <DeckPanel
            deck={currentDeck}
            onRemoveCard={onRemoveCard}
            onUpdateQuantity={onUpdateQuantity}
            onDeleteDeck={onDeleteDeck}
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