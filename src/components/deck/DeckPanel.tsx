import React, { useState, useEffect } from 'react';
import { Trash2, Edit3, Check, X as XIcon, ExternalLink } from 'lucide-react';
import { Deck, LorcanaCard } from '../../types';
import DeckStatistics from './DeckStatistics';
import DeckCardList from './DeckCardList';
import CardPhotoSwipe from '../CardPhotoSwipe';
import { DECK_RULES } from '../../constants';
import { useCardData } from '../../contexts/CardDataContext';
import { exportToInktable, validateInktableExport } from '../../utils/inktableExport';

interface DeckPanelProps {
  deck: Deck;
  onRemoveCard: (cardId: number) => void;
  onUpdateQuantity: (cardId: number, quantity: number) => void;
  onDeleteDeck: () => void;
  onViewDeck?: (deckId?: string) => void;
  onStopEditing?: () => void;
  onUpdateDeckName?: (name: string) => void;
  onUpdateDeckDescription?: (description: string) => void;
  validation: { isValid: boolean; errors: string[] };
  isCollapsed?: boolean;
}

const DeckPanel: React.FC<DeckPanelProps> = ({
  deck,
  onRemoveCard,
  onUpdateQuantity,
  onDeleteDeck,
  onViewDeck,
  onStopEditing,
  onUpdateDeckName,
  onUpdateDeckDescription,
  validation,
  isCollapsed = false
}) => {
  const { allCards } = useCardData();
  const [activeTab, setActiveTab] = useState<'statistics' | 'cards'>('statistics');
  const [imagePreview, setImagePreview] = useState<{
    show: boolean;
    x: number;
    y: number;
    imageUrl: string;
  }>({ show: false, x: 0, y: 0, imageUrl: '' });

  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(deck.name);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [editedDescription, setEditedDescription] = useState(deck.description || '');
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  // State for custom tooltip
  const [tooltip, setTooltip] = useState<{
    show: boolean;
    x: number;
    y: number;
    content: string;
  }>({ show: false, x: 0, y: 0, content: '' });

  // State for photo swipe gallery
  const [isPhotoSwipeOpen, setIsPhotoSwipeOpen] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  // Update editedName and editedDescription when deck changes
  useEffect(() => {
    setEditedName(deck.name);
    setEditedDescription(deck.description || '');
  }, [deck.name, deck.description]);

  const handleStartEditingName = () => {
    setIsEditingName(true);
    setEditedName(deck.name);
  };

  const handleSaveName = () => {
    if (editedName.trim() && editedName.trim() !== deck.name && onUpdateDeckName) {
      onUpdateDeckName(editedName.trim());
    }
    setIsEditingName(false);
  };

  const handleCancelNameEdit = () => {
    setEditedName(deck.name);
    setIsEditingName(false);
  };

  const handleNameKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveName();
    } else if (e.key === 'Escape') {
      handleCancelNameEdit();
    }
  };

  const handleStartEditingDescription = () => {
    setIsEditingDescription(true);
    setEditedDescription(deck.description || '');
  };

  const handleSaveDescription = () => {
    if (editedDescription !== (deck.description || '') && onUpdateDeckDescription) {
      onUpdateDeckDescription(editedDescription.trim());
    }
    setIsEditingDescription(false);
  };

  const handleCancelDescriptionEdit = () => {
    setEditedDescription(deck.description || '');
    setIsEditingDescription(false);
  };

  const handleDescriptionKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.shiftKey === false) {
      e.preventDefault();
      handleSaveDescription();
    } else if (e.key === 'Escape') {
      handleCancelDescriptionEdit();
    }
  };

  const totalCards = deck.cards.reduce((sum, card) => sum + card.quantity, 0);
  const averageCost = deck.cards.length > 0 
    ? (deck.cards.reduce((sum, entry) => {
        const card = allCards.find(c => c.id === entry.cardId);
        return sum + ((card?.cost || 0) * entry.quantity);
      }, 0) / totalCards).toFixed(1)
    : '0';

  const handleTooltipShow = (x: number, y: number, content: string) => {
    setTooltip({ show: true, x, y, content });
  };

  const handleTooltipHide = () => {
    setTooltip({ show: false, x: 0, y: 0, content: '' });
  };

  const handleImagePreview = (show: boolean, x?: number, y?: number, imageUrl?: string) => {
    setImagePreview({
      show,
      x: x || 0,
      y: y || 0,
      imageUrl: imageUrl || ''
    });
  };

  // Create flattened array of cards for photo swipe (matching sidebar display order)
  // This replicates the sorting/grouping logic from DeckCardList (grouped by cost)
  const deckCardsForPhotoSwipe: LorcanaCard[] = (() => {
    // Get cards with data
    const cardsWithData = deck.cards
      .map(entry => allCards.find(c => c.id === entry.cardId))
      .filter((card): card is LorcanaCard => card !== undefined);

    // Sort by set/number first
    const sorted = [...cardsWithData].sort((a, b) => {
      if (a.setCode !== b.setCode) return a.setCode.localeCompare(b.setCode);
      if (a.number !== b.number) return a.number - b.number;
      return a.name.localeCompare(b.name);
    });

    // Group cards by cost
    const grouped = sorted.reduce((acc, card) => {
      const groupKey = `${card.cost} Cost`;
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(card);
      return acc;
    }, {} as Record<string, LorcanaCard[]>);

    // Sort groups by cost and flatten
    const sortedGroups = Object.entries(grouped).sort(([a], [b]) => {
      const costA = parseInt(a.split(' ')[0]);
      const costB = parseInt(b.split(' ')[0]);
      return costA - costB;
    });

    // Flatten into single array
    return sortedGroups.flatMap(([, cards]) => cards);
  })();

  // Create map of card quantities for PhotoSwipe
  const cardQuantitiesMap = (() => {
    const map = new Map<number, number>();
    deck.cards.forEach(entry => {
      map.set(entry.cardId, entry.quantity);
    });
    return map;
  })();

  const handleCardClick = (cardId: number) => {
    const cardIndex = deckCardsForPhotoSwipe.findIndex(c => c.id === cardId);
    setCurrentCardIndex(cardIndex >= 0 ? cardIndex : 0);
    setIsPhotoSwipeOpen(true);
  };

  const handlePhotoSwipeClose = () => {
    setIsPhotoSwipeOpen(false);
  };

  const handlePhotoSwipeAddCard = (card: LorcanaCard) => {
    const deckCard = deck.cards.find(c => c.cardId === card.id);
    const currentQuantity = deckCard?.quantity || 0;
    onUpdateQuantity(card.id, currentQuantity + 1);
  };

  const handlePhotoSwipeRemoveCard = (cardId: number) => {
    const deckCard = deck.cards.find(c => c.cardId === cardId);
    if (deckCard) {
      const newQuantity = deckCard.quantity - 1;
      onUpdateQuantity(cardId, newQuantity);

      // Close PhotoSwipe if we just removed the last copy
      if (newQuantity === 0) {
        setIsPhotoSwipeOpen(false);
      }
    }
  };

  const handleDeleteDeck = () => {
    setShowDeleteConfirmation(true);
  };

  const confirmDeleteDeck = () => {
    onDeleteDeck();
    setShowDeleteConfirmation(false);
  };

  const cancelDeleteDeck = () => {
    setShowDeleteConfirmation(false);
  };

  const handleExportToInktable = () => {
    const validation = validateInktableExport(deck, allCards);
    if (!validation.valid) {
      console.error('Deck validation failed:', validation.errors);
      alert(`Cannot export deck: ${validation.errors.join(', ')}`);
      return;
    }
    
    exportToInktable(deck, allCards);
  };

  return (
    <>
      {/* Custom Tooltip */}
      {tooltip.show && (
        <div
          className="fixed z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded shadow-lg pointer-events-none"
          style={{
            left: tooltip.x - 50, // Center the tooltip
            top: tooltip.y,
            transform: 'translateX(-50%)'
          }}
        >
          {tooltip.content}
        </div>
      )}

      {/* Image Preview */}
      {imagePreview.show && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: imagePreview.x - 320, // Position to the left of cursor with some margin
            top: imagePreview.y - 150, // Center vertically around cursor
          }}
        >
          <img
            src={imagePreview.imageUrl}
            alt="Card preview"
            className="w-64 h-auto rounded-lg shadow-2xl border-2 border-white" // Increased from w-48 to w-64
          />
        </div>
      )}

      <div className="w-full bg-white shadow-xl border-l-2 border-lorcana-gold flex flex-col h-screen overflow-hidden">
        {/* Header */}
      <div className="p-4 border-b-2 border-lorcana-gold flex-shrink-0">
        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            {/* Editable deck name */}
            <div className="flex items-center gap-2 flex-1">
              {isEditingName ? (
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={handleNameKeyPress}
                    onBlur={() => {
                      // Auto-save on blur if there are changes
                      if (editedName.trim() && editedName.trim() !== deck.name) {
                        handleSaveName();
                      }
                    }}
                    className="text-lg font-semibold text-lorcana-ink bg-lorcana-cream border-2 border-lorcana-gold rounded-sm px-2 py-1 flex-1 focus:outline-none focus:ring-2 focus:ring-lorcana-gold"
                    autoFocus
                    maxLength={50}
                    aria-label="Deck name"
                  />
                  <button
                    onClick={handleSaveName}
                    className="px-2 py-1 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-sm transition-colors flex items-center gap-1"
                    aria-label="Save deck name"
                  >
                    <Check size={14} />
                    <span className="hidden sm:inline">Save</span>
                  </button>
                  <button
                    onClick={handleCancelNameEdit}
                    className="px-2 py-1 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-sm transition-colors"
                    aria-label="Cancel editing deck name"
                  >
                    <span className="hidden sm:inline">Cancel</span>
                    <XIcon size={14} className="sm:hidden" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1">
                  <h3 className="text-lg font-semibold text-lorcana-ink truncate">{deck.name}</h3>
                  {onUpdateDeckName && (
                    <button
                      onClick={handleStartEditingName}
                      className="p-1 text-lorcana-navy hover:bg-lorcana-cream rounded-sm transition-colors"
                      aria-label="Edit deck name"
                    >
                      <Edit3 size={14} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleDeleteDeck}
            className="p-2 text-red-600 hover:bg-red-100 rounded-sm transition-colors"
            aria-label="Delete deck"
          >
            <Trash2 size={16} />
          </button>
        </div>
        
        {/* Deck Description */}
        <div className="mb-3">
          {isEditingDescription ? (
            <div className="space-y-2 bg-lorcana-cream/50 p-2 rounded-sm border border-lorcana-gold/30">
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                onKeyDown={handleDescriptionKeyPress}
                className="w-full text-sm text-lorcana-ink bg-white border-2 border-lorcana-gold rounded-sm px-2 py-1 resize-none focus:outline-none focus:ring-2 focus:ring-lorcana-gold"
                placeholder="Add a description for your deck..."
                rows={3}
                maxLength={500}
                autoFocus
                aria-label="Deck description"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-lorcana-purple">
                  {editedDescription.length}/500 characters
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancelDescriptionEdit}
                    className="px-2 py-1 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-sm transition-colors"
                    aria-label="Cancel editing description"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveDescription}
                    className="px-2 py-1 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-sm transition-colors flex items-center gap-1"
                    aria-label="Save description"
                  >
                    <Check size={14} />
                    Save
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <div className="flex-1 min-h-[1.5rem]">
                {deck.description ? (
                  <p className="text-sm text-lorcana-navy leading-relaxed">{deck.description}</p>
                ) : (
                  <p className="text-sm text-lorcana-purple italic">No description</p>
                )}
              </div>
              {onUpdateDeckDescription && (
                <button
                  onClick={handleStartEditingDescription}
                  className="p-1 text-lorcana-navy hover:bg-lorcana-cream rounded-sm transition-colors flex-shrink-0"
                  aria-label="Edit description"
                >
                  <Edit3 size={14} />
                </button>
              )}
            </div>
          )}
        </div>
        
        {/* Card Count */}
        <div className="mb-3">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium text-lorcana-navy">
              Cards: {totalCards}/{DECK_RULES.MIN_CARDS}
            </span>
            <span className="text-sm text-lorcana-purple">
              Avg: {averageCost}
            </span>
          </div>
          <div className="w-full bg-lorcana-cream border-2 border-lorcana-gold rounded-sm h-2">
            <div
              className={`h-2 rounded-sm transition-all ${
                totalCards === DECK_RULES.MAX_CARDS ? 'bg-green-500' : totalCards > DECK_RULES.MAX_CARDS ? 'bg-red-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min((totalCards / DECK_RULES.MAX_CARDS) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Validation Status */}
        {!validation.isValid && validation.errors.length > 0 && (
          <div className="mb-3 p-2 bg-red-50 border-2 border-red-300 rounded-sm">
            <ul className="text-xs text-red-600 space-y-1">
              {validation.errors.map((error, index) => (
                <li key={index}>• {error}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Tab Navigation */}
      <div className="flex border-b-2 border-lorcana-gold flex-shrink-0">
        <button
          onClick={() => setActiveTab('statistics')}
          className={`flex-1 px-3 py-3 text-sm font-medium transition-colors ${
            activeTab === 'statistics'
              ? 'text-lorcana-navy border-b-2 border-lorcana-navy bg-lorcana-cream'
              : 'text-lorcana-purple hover:text-lorcana-navy'
          }`}
        >
          Stats
        </button>
        <button
          onClick={() => setActiveTab('cards')}
          className={`flex-1 px-3 py-3 text-sm font-medium transition-colors ${
            activeTab === 'cards'
              ? 'text-lorcana-navy border-b-2 border-lorcana-navy bg-lorcana-cream'
              : 'text-lorcana-purple hover:text-lorcana-navy'
          }`}
        >
          Cards
        </button>
      </div>

      {/* Tab Content - Scrollable Area */}
      <div className="flex-1 overflow-y-auto">
        {/* Statistics Tab */}
        {activeTab === 'statistics' && (
          <DeckStatistics 
            deck={deck} 
            onTooltipShow={handleTooltipShow}
            onTooltipHide={handleTooltipHide}
          />
        )}

        {/* Cards Tab */}
        {activeTab === 'cards' && (
          <DeckCardList
            deck={deck}
            onRemoveCard={onRemoveCard}
            onUpdateQuantity={onUpdateQuantity}
            onImagePreview={handleImagePreview}
            onCardClick={handleCardClick}
            groupBy="cost"
          />
        )}
      </div>

      {/* Action Buttons - Fixed at bottom */}
      {onViewDeck && deck && (
        <div className="border-t-2 border-lorcana-gold p-4 mt-auto flex-shrink-0">
          <div className="flex flex-col space-y-2">
            {/* Inktable Export Button */}
            <button
              onClick={handleExportToInktable}
              className="btn-lorcana flex justify-center items-center space-x-2 font-medium"
              title="Play deck on Inktable"
            >
              <ExternalLink size={16} />
              <span>Play on Inktable</span>
            </button>
            
            <div className="flex space-x-2">
              <button
                onClick={() => onViewDeck?.(deck.id)}
                className="btn-lorcana-navy flex-1 justify-center space-x-2 font-medium"
              >
                <span>View Deck</span>
              </button>
              {onStopEditing && (
                <button
                  onClick={onStopEditing}
                  className="btn-lorcana flex-1 justify-center space-x-2 font-medium"
                >
                  <span>Save & Close</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white border-2 border-lorcana-gold rounded-sm shadow-2xl max-w-md w-full p-6 art-deco-corner">
            <h3 className="text-lg font-bold text-lorcana-ink mb-4">Delete Deck</h3>
            <p className="text-lorcana-navy mb-6">
              Are you sure you want to delete "<strong>{deck.name}</strong>"? This action cannot be undone.
            </p>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={cancelDeleteDeck}
                className="px-4 py-2 bg-lorcana-cream text-lorcana-navy border-2 border-lorcana-gold rounded-sm hover:bg-lorcana-gold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteDeck}
                className="px-4 py-2 bg-red-600 text-white border-2 border-red-700 rounded-sm hover:bg-red-700 transition-colors"
              >
                Delete Deck
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Card Photo Slider */}
      <CardPhotoSwipe
        cards={deckCardsForPhotoSwipe}
        currentCardIndex={currentCardIndex}
        isOpen={isPhotoSwipeOpen}
        onClose={handlePhotoSwipeClose}
        galleryID="deck-panel-gallery"
        cardQuantities={cardQuantitiesMap}
        onAddCard={handlePhotoSwipeAddCard}
        onRemoveCard={handlePhotoSwipeRemoveCard}
      />
    </div>
    </>
  );
};

export default DeckPanel;