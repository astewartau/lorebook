import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit3, User, ExternalLink, Copy, Check, Package, BarChart3, Plus, Minus } from 'lucide-react';
import { useDeck } from '../contexts/DeckContext';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { useCollection } from '../contexts/CollectionContext';
import { useCardData } from '../contexts/CardDataContext';
import { COLOR_ICONS } from '../constants/icons';
import { DECK_RULES } from '../constants';
import CardImage from './CardImage';
import DeckStatistics from './deck/DeckStatistics';
import CardPhotoSwipe from './CardPhotoSwipe';
import { LorcanaCard } from '../types';
import { exportToInktable, copyInktableUrl, validateInktableExport } from '../utils/inktableExport';

interface DeckSummaryProps {
  onBack: () => void;
  onEditDeck: (deckId?: string) => void;
}

const DeckSummary: React.FC<DeckSummaryProps> = ({ onBack, onEditDeck }) => {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loadUserProfile } = useProfile();
  const { getCardQuantity } = useCollection();
  const { allCards } = useCardData();
  const { currentDeck, decks, publicDecks, setCurrentDeck, startEditingDeck, getDeckSummary, loadPublicDecks, addCardToDeck, removeCardFromDeck, updateCardQuantity } = useDeck();
  const [authorDisplayName, setAuthorDisplayName] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [sortBy, setSortBy] = useState<'cost' | 'type' | 'color' | 'set'>('set');
  const [tooltip, setTooltip] = useState<{ show: boolean; x: number; y: number; content: string }>({
    show: false, x: 0, y: 0, content: ''
  });
  const [isPhotoSwipeOpen, setIsPhotoSwipeOpen] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  
  // Load author profile when deck changes
  useEffect(() => {
    if (currentDeck?.userId && currentDeck.userId !== user?.id) {
      loadUserProfile(currentDeck.userId).then(profile => {
        if (profile) {
          setAuthorDisplayName(profile.displayName);
        }
      });
    } else {
      setAuthorDisplayName('');
    }
  }, [currentDeck, user, loadUserProfile]);
  
  // Load public decks if not authenticated (only once)
  useEffect(() => {
    if (!user && deckId && publicDecks.length === 0) {
      loadPublicDecks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Only when auth state changes, not deckId

  // Load deck from URL parameter (check both user decks and public decks)
  useEffect(() => {
    if (deckId) {
      const deck = decks.find(d => d.id === deckId) || publicDecks.find(d => d.id === deckId);
      if (deck) {
        setCurrentDeck(deck);
      }
    }
  }, [deckId, decks, publicDecks, setCurrentDeck]);

  // Look up actual card data and combine with quantities and collection info
  type CardWithQuantity = LorcanaCard & {
    quantity: number;
    owned: number;
    missing: number;
  };

  const cardsWithData: CardWithQuantity[] = useMemo(() => {
    if (!currentDeck) return [];

    // Helper function to get total owned quantity for a card by fullName across all variants
    const getCardQuantityByFullName = (fullName: string): number => {
      // Find all cards with the same fullName (different variants, sets, promos, etc.)
      const cardVariants = allCards.filter(c => c.fullName === fullName);

      // Sum up owned quantities across all variants
      return cardVariants.reduce((total, variant) => {
        const owned = getCardQuantity(variant.id);
        return total + owned.total;
      }, 0);
    };

    return currentDeck.cards
      .map(entry => {
        const card = allCards.find(c => c.id === entry.cardId);
        if (!card) {
          console.error(`Card ${entry.cardId} not found in allCards`);
          return null;
        }
        // Use fullName-based matching instead of exact ID matching
        const totalOwnedAcrossVariants = getCardQuantityByFullName(card.fullName);
        return {
          ...card,
          quantity: entry.quantity,
          owned: Math.min(totalOwnedAcrossVariants, entry.quantity),
          missing: Math.max(0, entry.quantity - totalOwnedAcrossVariants)
        };
      })
      .filter(card => card !== null) as CardWithQuantity[];
  }, [currentDeck, getCardQuantity]);

  // Sort cards based on selected criteria
  const sortedCards = useMemo(() => {
    return [...cardsWithData].sort((a, b) => {
      switch (sortBy) {
        case 'cost':
          if (a.cost !== b.cost) return a.cost - b.cost;
          return a.name.localeCompare(b.name);
        case 'type':
          if (a.type !== b.type) return a.type.localeCompare(b.type);
          return a.name.localeCompare(b.name);
        case 'color':
          const colorA = a.color || 'None';
          const colorB = b.color || 'None';
          if (colorA !== colorB) return colorA.localeCompare(colorB);
          return a.name.localeCompare(b.name);
        case 'set':
          if (a.setCode !== b.setCode) return a.setCode.localeCompare(b.setCode);
          if (a.number !== b.number) return a.number - b.number;
          return a.name.localeCompare(b.name);
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [cardsWithData, sortBy]);

  // Group cards for display (when not using set ordering)
  const groupedCards = useMemo(() => {
    if (sortBy === 'set') {
      // For set ordering, don't group - just return all cards in one group
      return { 'All Cards': sortedCards };
    }

    return sortedCards.reduce((acc, card) => {
      let groupKey: string;
      switch (sortBy) {
        case 'cost':
          groupKey = `${card.cost} Cost`;
          break;
        case 'type':
          groupKey = card.type;
          break;
        case 'color':
          groupKey = card.color || 'None';
          break;
        default:
          groupKey = 'All Cards';
      }

      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(card);
      return acc;
    }, {} as Record<string, CardWithQuantity[]>);
  }, [sortedCards, sortBy]);

  // Sort groups
  const sortedGroups = useMemo(() => {
    return Object.entries(groupedCards).sort(([a], [b]) => {
      if (sortBy === 'cost') {
        const costA = parseInt(a.split(' ')[0]);
        const costB = parseInt(b.split(' ')[0]);
        return costA - costB;
      }
      return a.localeCompare(b);
    });
  }, [groupedCards, sortBy]);

  const handleCardClick = (card: LorcanaCard) => {
    // Create a flattened array of unique cards in the current display order
    const uniqueDisplayedCards: LorcanaCard[] = [];
    sortedGroups.forEach(([, cards]) => {
      cards.forEach(card => {
        // Add each unique card only once
        uniqueDisplayedCards.push(card);
      });
    });

    const cardIndex = uniqueDisplayedCards.findIndex(c => c.id === card.id);
    setCurrentCardIndex(cardIndex >= 0 ? cardIndex : 0);
    setIsPhotoSwipeOpen(true);
  };

  const handlePhotoSwipeClose = () => {
    setIsPhotoSwipeOpen(false);
  };

  // Create flattened array of unique cards for PhotoSwipe
  const uniqueDisplayedCards = useMemo(() => {
    const cards: LorcanaCard[] = [];
    sortedGroups.forEach(([, groupCards]) => {
      groupCards.forEach(card => {
        // Add each unique card only once
        cards.push(card);
      });
    });
    return cards;
  }, [sortedGroups]);

  // Create map of card quantities for PhotoSwipe
  const cardQuantitiesMap = useMemo(() => {
    if (!currentDeck) return undefined;
    const map = new Map<number, number>();
    currentDeck.cards.forEach(entry => {
      map.set(entry.cardId, entry.quantity);
    });
    return map;
  }, [currentDeck]);

  // Now handle early returns after all hooks
  if (!currentDeck) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-lorcana-ink mb-2">No deck selected</h2>
          <button
            onClick={onBack}
            className="btn-lorcana-navy"
          >
            Back to {user ? 'My Decks' : 'Published Decks'}
          </button>
        </div>
      </div>
    );
  }

  const summary = getDeckSummary(currentDeck.id);
  if (!summary) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-lorcana-ink mb-2">Deck not found</h2>
          <button
            onClick={onBack}
            className="btn-lorcana-navy"
          >
            Back to {user ? 'My Decks' : 'Published Decks'}
          </button>
        </div>
      </div>
    );
  }

  const totalCards = cardsWithData.reduce((sum, card) => sum + card.quantity, 0);
  const averageCost = cardsWithData.length > 0
    ? (cardsWithData.reduce((sum, card) => sum + (card.cost * card.quantity), 0) / totalCards).toFixed(1)
    : '0';

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewProfile = async (userId: string) => {
    if (!userId) return;
    
    // Check if user has a public profile
    const profile = await loadUserProfile(userId);
    if (profile && profile.isPublic) {
      navigate(`/community/${userId}`);
    }
  };

  const handleExportToInktable = () => {
    if (!currentDeck) return;
    
    const validation = validateInktableExport(currentDeck, allCards);
    if (!validation.valid) {
      console.error('Deck validation failed:', validation.errors);
      alert(`Cannot export deck: ${validation.errors.join(', ')}`);
      return;
    }
    
    // Use a proper display name, fallback to deck name
    const displayName = authorDisplayName || user?.email || currentDeck.name;
    exportToInktable(currentDeck, allCards, displayName);
  };

  const handleCopyInktableUrl = async () => {
    if (!currentDeck) return;
    
    const validation = validateInktableExport(currentDeck, allCards);
    if (!validation.valid) {
      console.error('Deck validation failed:', validation.errors);
      alert(`Cannot export deck: ${validation.errors.join(', ')}`);
      return;
    }
    
    // Use a proper display name, fallback to deck name
    const displayName = authorDisplayName || user?.email || currentDeck.name;
    const success = await copyInktableUrl(currentDeck, allCards, displayName);
    if (success) {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } else {
      alert('Failed to copy link to clipboard');
    }
  };

  const getCardImageUrl = (cardId: number) => {
    // Find the actual card to get the image URL
    const card = allCards.find(c => c.id === cardId);
    if (!card) return '';

    return card.images.full;
  };

  // Deck editing handlers
  const handleAddCardToDeck = (card: LorcanaCard) => {
    if (!currentDeck) return;
    const deckCard = currentDeck.cards.find(c => c.cardId === card.id);
    const currentQuantity = deckCard?.quantity || 0;
    const totalCards = currentDeck.cards.reduce((sum, c) => sum + c.quantity, 0);
    const maxCopies = (card.name === 'Dalmatian Puppy' && card.version === 'Tail Wagger') ? 99 : DECK_RULES.MAX_COPIES_PER_CARD;

    if (currentQuantity < maxCopies && totalCards < DECK_RULES.MAX_CARDS) {
      addCardToDeck(card, currentDeck.id);
    }
  };

  const handleRemoveCardFromDeck = (cardId: number) => {
    if (!currentDeck) return;
    const deckCard = currentDeck.cards.find(c => c.cardId === cardId);
    if (!deckCard) return;

    const newQuantity = deckCard.quantity - 1;
    if (newQuantity === 0) {
      removeCardFromDeck(cardId, currentDeck.id);
      setIsPhotoSwipeOpen(false); // Close PhotoSwipe when card is removed
    } else {
      updateCardQuantity(cardId, newQuantity, currentDeck.id);
    }
  };

  // Get ink colors for display (now includes individual colors from dual-ink cards)
  const inkColors = Object.entries(summary.inkDistribution)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);

  return (
    <div className="min-h-screen bg-lorcana-cream">
      
      {/* Deck Sub-tabs */}
      <div className="bg-lorcana-cream border-b border-lorcana-gold/20">
        <div className="container mx-auto px-2 sm:px-4">
          <div className="flex justify-between items-center">
            <div className="flex space-x-1">
              <button
                onClick={() => navigate('/decks')}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors ${
                  currentDeck?.userId === user?.id
                    ? 'border-lorcana-gold text-lorcana-navy font-medium'
                    : 'border-transparent text-lorcana-purple hover:text-lorcana-navy'
                }`}
              >
                <span>My Decks</span>
              </button>
              <button
                onClick={() => navigate('/decks')}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2 transition-colors ${
                  currentDeck?.userId !== user?.id
                    ? 'border-lorcana-gold text-lorcana-navy font-medium'
                    : 'border-transparent text-lorcana-purple hover:text-lorcana-navy'
                }`}
              >
                <span>Published Decks</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6">
          {/* Mobile: Stack buttons vertically */}
          <div className="sm:hidden flex flex-col gap-3 mb-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-lorcana-navy hover:text-lorcana-ink transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back to {user ? 'My Decks' : 'Published Decks'}</span>
            </button>
            <div className="flex flex-col gap-2">
              <button
                onClick={handleExportToInktable}
                className="btn-lorcana flex items-center justify-center space-x-2 w-full"
                title="Open deck in Inktable"
              >
                <ExternalLink size={16} />
                <span>Play on Inktable</span>
              </button>
              <button
                onClick={handleCopyInktableUrl}
                className={`btn-lorcana-navy flex items-center justify-center space-x-2 w-full transition-colors ${
                  copySuccess ? 'bg-green-600 hover:bg-green-700' : ''
                }`}
                title="Copy Inktable link to clipboard"
              >
                {copySuccess ? (
                  <>
                    <Check size={16} />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy size={16} />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
              {user && currentDeck.userId === user.id && (
                <button
                  onClick={() => {
                    startEditingDeck(currentDeck.id);
                    navigate('/cards');
                  }}
                  className="btn-lorcana-navy flex items-center justify-center space-x-2 w-full"
                >
                  <Edit3 size={16} />
                  <span>Edit Deck</span>
                </button>
              )}
            </div>
          </div>

          {/* Desktop: Keep horizontal layout */}
          <div className="hidden sm:flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-lorcana-navy hover:text-lorcana-ink transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back to {user ? 'My Decks' : 'Published Decks'}</span>
            </button>
            <div className="flex items-center space-x-3">
              {/* Inktable Export Buttons */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleExportToInktable}
                  className="btn-lorcana flex items-center space-x-2"
                  title="Open deck in Inktable"
                >
                  <ExternalLink size={16} />
                  <span>Play on Inktable</span>
                </button>
                <button
                  onClick={handleCopyInktableUrl}
                  className={`btn-lorcana-navy flex items-center space-x-2 transition-colors ${
                    copySuccess ? 'bg-green-600 hover:bg-green-700' : ''
                  }`}
                  title="Copy Inktable link to clipboard"
                >
                  {copySuccess ? (
                    <>
                      <Check size={16} />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>

              {user && currentDeck.userId === user.id && (
                <button
                  onClick={() => {
                    startEditingDeck(currentDeck.id);
                    navigate('/cards');
                  }}
                  className="btn-lorcana-navy flex items-center space-x-2"
                >
                  <Edit3 size={16} />
                  <span>Edit Deck</span>
                </button>
              )}
            </div>
          </div>

          <div className="card-lorcana p-4 sm:p-6 art-deco-corner">
            {/* Mobile Layout */}
            <div className="sm:hidden">
              {/* Avatar and Ink Colors side by side */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-lorcana-gold shadow-lg">
                      {currentDeck.avatar ? (
                        <div
                          className="w-full h-full"
                          style={{
                            backgroundImage: `url(${getCardImageUrl(currentDeck.avatar.cardId)})`,
                            backgroundSize: `${100 * currentDeck.avatar.cropData.scale}%`,
                            backgroundPosition: `${currentDeck.avatar.cropData.x}% ${currentDeck.avatar.cropData.y}%`,
                            backgroundRepeat: 'no-repeat'
                          }}
                        />
                      ) : (
                        <img
                          src="/imgs/lorebook-icon-profile.png"
                          alt="Default Avatar"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  </div>

                  {/* Ink Colors */}
                  {inkColors.length > 0 && (
                    <div className="flex items-center space-x-2">
                      {inkColors.map(([color]) => (
                        <div
                          key={color}
                          className="relative w-10 h-10 flex items-center justify-center"
                          title={`${color}: ${summary.inkDistribution[color]} cards`}
                        >
                          {COLOR_ICONS[color] ? (
                            <img
                              src={COLOR_ICONS[color]}
                              alt={color}
                              className="w-full h-full drop-shadow-lg"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-lorcana-gold border-2 border-white shadow-lg" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Title and info below */}
              <div>
                <h1 className="text-2xl font-bold text-lorcana-ink mb-2">{currentDeck.name}</h1>

                {/* Author info for public decks */}
                {currentDeck.userId && currentDeck.userId !== user?.id && (
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="text-sm text-lorcana-navy">by</span>
                    <button
                      onClick={() => handleViewProfile(currentDeck.userId!)}
                      className="flex items-center space-x-1 text-sm text-lorcana-gold hover:text-lorcana-navy hover:underline transition-colors"
                    >
                      <User size={14} />
                      <span>{authorDisplayName || currentDeck.authorEmail || 'Unknown Author'}</span>
                    </button>
                  </div>
                )}

                {currentDeck.description && (
                  <p className="text-lorcana-navy mb-4 text-sm">{currentDeck.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-3 text-sm text-lorcana-purple">
                  <div className="flex items-center space-x-1">
                    <span className="font-medium">Cards:</span>
                    <span className={`font-semibold ${totalCards === DECK_RULES.MAX_CARDS ? 'text-green-600' : totalCards > DECK_RULES.MAX_CARDS ? 'text-red-600' : 'text-lorcana-navy'}`}>
                      {totalCards}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="font-medium">Valid:</span>
                    <span className={`font-semibold ${summary.isValid ? 'text-green-600' : 'text-red-600'}`}>
                      {summary.isValid ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div className="w-full">
                    <span className="font-medium">Last Updated:</span>
                    <span className="ml-1">{formatDate(summary.updatedAt)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Layout */}
            <div className="hidden sm:flex items-start justify-between">
              {/* Avatar area */}
              <div className="flex-shrink-0 mr-6">
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-lorcana-gold shadow-lg">
                  {currentDeck.avatar ? (
                    <div
                      className="w-full h-full"
                      style={{
                        backgroundImage: `url(${getCardImageUrl(currentDeck.avatar.cardId)})`,
                        backgroundSize: `${100 * currentDeck.avatar.cropData.scale}%`,
                        backgroundPosition: `${currentDeck.avatar.cropData.x}% ${currentDeck.avatar.cropData.y}%`,
                        backgroundRepeat: 'no-repeat'
                      }}
                    />
                  ) : (
                    <img
                      src="/imgs/lorebook-icon-profile.png"
                      alt="Default Avatar"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              </div>

              <div className="flex-1">
                <h1 className="text-3xl font-bold text-lorcana-ink mb-2">{currentDeck.name}</h1>

                {/* Author info for public decks */}
                {currentDeck.userId && currentDeck.userId !== user?.id && (
                  <div className="flex items-center space-x-2 mb-3">
                    <span className="text-sm text-lorcana-navy">by</span>
                    <button
                      onClick={() => handleViewProfile(currentDeck.userId!)}
                      className="flex items-center space-x-1 text-sm text-lorcana-gold hover:text-lorcana-navy hover:underline transition-colors"
                    >
                      <User size={14} />
                      <span>{authorDisplayName || currentDeck.authorEmail || 'Unknown Author'}</span>
                    </button>
                  </div>
                )}

                {currentDeck.description && (
                  <p className="text-lorcana-navy mb-4">{currentDeck.description}</p>
                )}

                <div className="flex flex-wrap items-center gap-4 text-sm text-lorcana-purple">
                  <div className="flex items-center space-x-1">
                    <span className="font-medium">Cards:</span>
                    <span className={`font-semibold ${totalCards === DECK_RULES.MAX_CARDS ? 'text-green-600' : totalCards > DECK_RULES.MAX_CARDS ? 'text-red-600' : 'text-lorcana-navy'}`}>
                      {totalCards}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="font-medium">Valid:</span>
                    <span className={`font-semibold ${summary.isValid ? 'text-green-600' : 'text-red-600'}`}>
                      {summary.isValid ? 'Yes' : 'No'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium">Last Updated:</span>
                    <span className="ml-1">{formatDate(summary.updatedAt)}</span>
                  </div>
                </div>
              </div>

              {/* Ink Colors */}
              {inkColors.length > 0 && (
                <div className="flex items-center space-x-2 ml-6">
                  {inkColors.map(([color]) => (
                    <div
                      key={color}
                      className="relative w-10 h-10 flex items-center justify-center"
                      title={`${color}: ${summary.inkDistribution[color]} cards`}
                    >
                      {COLOR_ICONS[color] ? (
                        <img
                          src={COLOR_ICONS[color]}
                          alt={color}
                          className="w-full h-full drop-shadow-lg"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-lorcana-gold border-2 border-white shadow-lg" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sorting Controls */}
        <div className="card-lorcana p-4 mb-6 art-deco-corner">
          <div className="flex items-center space-x-2">
            <Package size={16} className="text-lorcana-purple" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-sm border-2 border-lorcana-gold rounded-sm px-3 py-2 focus:ring-2 focus:ring-lorcana-gold focus:border-lorcana-navy bg-lorcana-cream"
            >
              <option value="cost">Group by Cost</option>
              <option value="type">Group by Type</option>
              <option value="color">Group by Color</option>
              <option value="set">Order by Set</option>
            </select>
          </div>
        </div>

        {/* Main Content - Side by Side Layout */}
        {sortedCards.length === 0 ? (
          <div className="card-lorcana p-12 text-center art-deco-corner">
            <h3 className="text-xl font-semibold text-lorcana-ink mb-2">Empty Deck</h3>
            <p className="text-lorcana-navy mb-6">This deck doesn't have any cards yet.</p>
            {user && currentDeck.userId === user.id && (
              <button
                onClick={() => {
                  startEditingDeck(currentDeck.id);
                  navigate('/cards');
                }}
                className="btn-lorcana-navy px-6 py-3"
              >
                Start Building
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Deck Contents - Takes up 2/3 of space on large screens */}
            <div className="xl:col-span-2">
              <div className="card-lorcana p-6 art-deco-corner">
                <h2 className="text-xl font-semibold text-lorcana-ink mb-4">Deck Contents</h2>
                <div className="space-y-4">
                  {sortedGroups.map(([groupName, cards]) => (
                    <div key={groupName}>
                      {/* Only show group header if it's not "All Cards" (i.e., when we're actually grouping) */}
                      {groupName !== 'All Cards' && (
                        <h3 className="text-lg font-medium text-lorcana-navy mb-3 border-b border-lorcana-gold pb-1">
                          {groupName} ({cards.reduce((sum, card) => sum + card.quantity, 0)} cards)
                        </h3>
                      )}
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-4 2xl:grid-cols-5 gap-2">
                        {cards.map((card) => {
                          // Calculate exact space needed for vertical-only stacking
                          const stackOffsetUp = (card.quantity - 1) * 12;
                          const ownedCopies = card.owned;
                          const missingCopies = card.missing;
                          // Use fixed padding for alignment (max 4 copies = 36px)
                          const maxStackOffset = 36;

                          return (
                            <div
                              key={card.id}
                              className="relative"
                              style={{
                                // Reserve consistent space for all cards to align buttons
                                paddingTop: `${maxStackOffset}px`,
                                marginBottom: `${maxStackOffset}px`
                              }}
                            >
                              {/* Container that defines the actual space needed */}
                              <div
                                className="relative"
                                style={{
                                  width: '100%',
                                  paddingBottom: '140%', // Typical card aspect ratio
                                  position: 'relative'
                                }}
                              >
                                {Array.from({ length: card.quantity }, (_, index) => {
                                  // Show missing copies in greyscale (the first 'missing' number of copies)
                                  const isMissing = index < missingCopies;

                                  return (
                                    <div
                                      key={index}
                                      className={`absolute top-0 left-0 w-full h-full ${isMissing ? 'grayscale' : ''}`}
                                      style={{
                                        transform: `translateY(${index * -12}px) translateZ(0)`, // translateZ(0) forces GPU layer
                                        zIndex: card.quantity - index,
                                        filter: index > 0 ? `brightness(${1 - (index * 0.1)})` : undefined,
                                      }}
                                    >
                                      <div
                                        className="cursor-pointer w-full h-full"
                                        onClick={() => handleCardClick(card)}
                                      >
                                        <CardImage
                                          card={card}
                                          className="w-full h-full rounded-sm shadow-md border-2 border-lorcana-gold"
                                        />
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* Quantity badge at bottom-right */}
                                <div className="absolute bottom-2 right-2 w-8 h-8 bg-lorcana-navy text-lorcana-gold rounded-sm flex items-center justify-center text-sm font-bold shadow-lg z-50 border-2 border-lorcana-gold">
                                  {card.quantity}
                                </div>

                                {/* Ownership indicator */}
                                {missingCopies > 0 && (
                                  <div className="absolute top-2 left-2 px-2 py-1 bg-red-600 text-white rounded-sm text-xs font-bold shadow-lg z-50 border border-white">
                                    {ownedCopies}/{card.quantity}
                                  </div>
                                )}
                              </div>

                              {/* Deck editing controls - only show if user owns the deck */}
                              {user && currentDeck.userId === user.id && (
                                <div className="mt-2 flex justify-center">
                                  <div className="flex items-center justify-between px-2 py-1 bg-lorcana-cream rounded-sm border-2 border-lorcana-gold">
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemoveCardFromDeck(card.id);
                                      }}
                                      disabled={card.quantity <= 0}
                                      className="w-6 h-6 flex items-center justify-center text-red-600 hover:text-red-800 hover:bg-red-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors rounded-sm"
                                    >
                                      <Minus size={12} />
                                    </button>

                                    <span className="text-sm font-semibold text-lorcana-ink px-3">
                                      {card.quantity}
                                    </span>

                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddCardToDeck(card);
                                      }}
                                      disabled={
                                        card.quantity >= ((card.name === 'Dalmatian Puppy' && card.version === 'Tail Wagger') ? 99 : DECK_RULES.MAX_COPIES_PER_CARD) ||
                                        currentDeck.cards.reduce((sum, c) => sum + c.quantity, 0) >= DECK_RULES.MAX_CARDS
                                      }
                                      className="w-6 h-6 flex items-center justify-center text-green-600 hover:text-green-800 hover:bg-green-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors rounded-sm"
                                    >
                                      <Plus size={12} />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Statistics Sidebar - Takes up 1/3 of space on large screens */}
            <div className="xl:col-span-1">
              <div className="card-lorcana p-4 art-deco-corner">
                <div className="flex items-center space-x-2 mb-4">
                  <BarChart3 size={20} className="text-lorcana-purple" />
                  <h2 className="text-lg font-semibold text-lorcana-ink">Statistics</h2>
                </div>
                <DeckStatistics
                  deck={currentDeck}
                  onTooltipShow={(x, y, content) => setTooltip({ show: true, x, y, content })}
                  onTooltipHide={() => setTooltip({ show: false, x: 0, y: 0, content: '' })}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {tooltip.show && (
        <div
          className="fixed z-50 bg-lorcana-navy text-lorcana-gold text-sm px-3 py-2 rounded-sm shadow-lg border border-lorcana-gold pointer-events-none"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y - 40}px`, // Position above cursor
            transform: 'translateX(-50%)'
          }}
        >
          {tooltip.content}
        </div>
      )}

      {/* Card Photo Slider */}
      <CardPhotoSwipe
        cards={uniqueDisplayedCards}
        currentCardIndex={currentCardIndex}
        isOpen={isPhotoSwipeOpen}
        onClose={handlePhotoSwipeClose}
        galleryID="deck-summary-gallery"
        cardQuantities={cardQuantitiesMap}
        onAddCard={user && currentDeck?.userId === user.id ? handleAddCardToDeck : undefined}
        onRemoveCard={user && currentDeck?.userId === user.id ? handleRemoveCardFromDeck : undefined}
      />
    </div>
  );
};

export default DeckSummary;