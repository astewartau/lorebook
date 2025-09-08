import React, { useState, useEffect } from 'react';
import { Trash2, X, Edit3, Check, X as XIcon } from 'lucide-react';
import { Deck } from '../../types';
import DeckStatistics from './DeckStatistics';
import DeckCardList from './DeckCardList';
import { DECK_RULES } from '../../constants';
import { allCards } from '../../data/allCards';

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
            left: imagePreview.x + 10,
            top: imagePreview.y - 200,
          }}
        >
          <img
            src={imagePreview.imageUrl}
            alt="Card preview"
            className="w-48 h-auto rounded-lg shadow-2xl border-2 border-white"
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
                <div className="flex items-center gap-1 flex-1">
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={handleNameKeyPress}
                    className="text-lg font-semibold text-lorcana-ink bg-lorcana-cream border-2 border-lorcana-gold rounded-sm px-2 py-1 flex-1 focus:outline-none focus:ring-2 focus:ring-lorcana-gold"
                    autoFocus
                    maxLength={50}
                  />
                  <button
                    onClick={handleSaveName}
                    className="p-1 text-green-600 hover:bg-green-100 rounded-sm transition-colors"
                    title="Save deck name"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={handleCancelNameEdit}
                    className="p-1 text-red-600 hover:bg-red-100 rounded-sm transition-colors"
                    title="Cancel editing"
                  >
                    <XIcon size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1">
                  <h3 className="text-lg font-semibold text-lorcana-ink truncate">{deck.name}</h3>
                  {onUpdateDeckName && (
                    <button
                      onClick={handleStartEditingName}
                      className="p-1 text-lorcana-navy hover:bg-lorcana-cream rounded-sm transition-colors"
                      title="Edit deck name"
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
            title="Delete deck"
          >
            <Trash2 size={16} />
          </button>
        </div>
        
        {/* Deck Description */}
        <div className="mb-3">
          {isEditingDescription ? (
            <div className="space-y-2">
              <textarea
                value={editedDescription}
                onChange={(e) => setEditedDescription(e.target.value)}
                onKeyDown={handleDescriptionKeyPress}
                className="w-full text-sm text-lorcana-ink bg-lorcana-cream border-2 border-lorcana-gold rounded-sm px-2 py-1 resize-none focus:outline-none focus:ring-2 focus:ring-lorcana-gold"
                placeholder="Add a description for your deck..."
                rows={3}
                maxLength={500}
                autoFocus
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-lorcana-purple">
                  {editedDescription.length}/500 characters
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleSaveDescription}
                    className="p-1 text-green-600 hover:bg-green-100 rounded-sm transition-colors"
                    title="Save description"
                  >
                    <Check size={16} />
                  </button>
                  <button
                    onClick={handleCancelDescriptionEdit}
                    className="p-1 text-red-600 hover:bg-red-100 rounded-sm transition-colors"
                    title="Cancel editing"
                  >
                    <XIcon size={16} />
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
                  title="Edit description"
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
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'statistics'
              ? 'text-lorcana-navy border-b-2 border-lorcana-navy bg-lorcana-cream'
              : 'text-lorcana-purple hover:text-lorcana-navy'
          }`}
        >
          Statistics
        </button>
        <button
          onClick={() => setActiveTab('cards')}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
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
          />
        )}
      </div>

      {/* Action Buttons - Fixed at bottom */}
      {onViewDeck && deck && (
        <div className="border-t-2 border-lorcana-gold p-4 mt-auto flex-shrink-0">
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
    </div>
    </>
  );
};

export default DeckPanel;