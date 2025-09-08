import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit3, User } from 'lucide-react';
import { useDeck } from '../contexts/DeckContext';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { COLOR_ICONS } from '../constants/icons';
import { DECK_RULES } from '../constants';
import CardImage from './CardImage';
import { allCards } from '../data/allCards';
import { LorcanaCard } from '../types';

interface DeckSummaryProps {
  onBack: () => void;
  onEditDeck: (deckId?: string) => void;
}

const DeckSummary: React.FC<DeckSummaryProps> = ({ onBack, onEditDeck }) => {
  const { deckId } = useParams<{ deckId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { loadUserProfile } = useProfile();
  const { currentDeck, decks, publicDecks, setCurrentDeck, startEditingDeck, getDeckSummary, loadPublicDecks } = useDeck();
  const [authorDisplayName, setAuthorDisplayName] = useState<string>('');
  
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

  // Look up actual card data and combine with quantities
  const cardsWithData: (LorcanaCard & { quantity: number })[] = currentDeck.cards
    .map(entry => {
      const card = allCards.find(c => c.id === entry.cardId);
      if (!card) {
        console.error(`Card ${entry.cardId} not found in allCards`);
        return null;
      }
      return { ...card, quantity: entry.quantity };
    })
    .filter(card => card !== null) as (LorcanaCard & { quantity: number })[];

  const totalCards = cardsWithData.reduce((sum, card) => sum + card.quantity, 0);
  const averageCost = cardsWithData.length > 0 
    ? (cardsWithData.reduce((sum, card) => sum + (card.cost * card.quantity), 0) / totalCards).toFixed(1)
    : '0';

  // Sort by cost
  const uniqueCards = cardsWithData.sort((a, b) => {
    if (a.cost !== b.cost) {
      return a.cost - b.cost;
    }
    return a.name.localeCompare(b.name);
  });

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

  const getCardImageUrl = (cardId: number) => {
    // Find the actual card to get the image URL
    const card = allCards.find(c => c.id === cardId);
    if (!card) return '';
    
    return card.images.full;
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
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onBack}
              className="flex items-center space-x-2 text-lorcana-navy hover:text-lorcana-ink transition-colors"
            >
              <ArrowLeft size={20} />
              <span>Back to {user ? 'My Decks' : 'Published Decks'}</span>
            </button>
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

          <div className="card-lorcana p-6 art-deco-corner">
            <div className="flex items-start justify-between">
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

        {/* Cards Grid */}
        {uniqueCards.length === 0 ? (
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
          <div className="card-lorcana p-6 art-deco-corner">
            <h2 className="text-xl font-semibold text-lorcana-ink mb-4">Deck Contents</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2">
              {uniqueCards.map((card) => {
                // Calculate exact space needed for vertical-only stacking
                const stackOffsetUp = (card.quantity - 1) * 12; // Increased from 8px to 12px
                
                return (
                  <div 
                    key={card.id} 
                    className="relative"
                    style={{ 
                      // Reserve space for the vertical stacking effect only
                      paddingTop: `${stackOffsetUp}px`,
                      marginBottom: `${stackOffsetUp}px`
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
                      {Array.from({ length: card.quantity }, (_, index) => (
                        <div
                          key={index}
                          className="absolute top-0 left-0 w-full h-full"
                          style={{
                            transform: `translateY(${index * -12}px)`, // Vertical-only offset, increased to 12px
                            zIndex: card.quantity - index,
                            filter: index > 0 ? `brightness(${1 - (index * 0.1)})` : 'brightness(1)'
                          }}
                        >
                          <CardImage
                            card={card}
                            className="w-full h-full rounded-sm shadow-md border-2 border-lorcana-gold"
                          />
                        </div>
                      ))}
                      
                      {/* Quantity badge at bottom-right */}
                      <div className="absolute bottom-2 right-2 w-8 h-8 bg-lorcana-navy text-lorcana-gold rounded-sm flex items-center justify-center text-sm font-bold shadow-lg z-50 border-2 border-lorcana-gold">
                        {card.quantity}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DeckSummary;