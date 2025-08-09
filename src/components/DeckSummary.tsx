import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit3, User } from 'lucide-react';
import { useDeck } from '../contexts/DeckContext';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { COLOR_ICONS } from '../constants/icons';

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
  
  // Load public decks if not authenticated
  useEffect(() => {
    if (!user && deckId) {
      loadPublicDecks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, deckId]); // Excluding loadPublicDecks to prevent infinite loop

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

  const totalCards = currentDeck.cards.reduce((sum, card) => sum + card.quantity, 0);
  const averageCost = currentDeck.cards.length > 0 
    ? (currentDeck.cards.reduce((sum, card) => sum + (card.cost * card.quantity), 0) / totalCards).toFixed(1)
    : '0';

  // Group cards by unique card (combining all copies) and sort by cost
  const uniqueCards = currentDeck.cards
    .map(card => ({
      ...card,
      // We'll use the card data as is since it already has quantity
    }))
    .sort((a, b) => {
      // Primary sort: by ink cost (ascending)
      if (a.cost !== b.cost) {
        return a.cost - b.cost;
      }
      // Secondary sort: by name (alphabetical) for cards with same cost
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
      navigate(`/users/${userId}`);
    }
  };

  // Get ink colors for display (now includes individual colors from dual-ink cards)
  const inkColors = Object.entries(summary.inkDistribution)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);

  return (
    <div className="min-h-screen bg-lorcana-cream">
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
                    <span className={`font-semibold ${totalCards === 60 ? 'text-green-600' : totalCards > 60 ? 'text-red-600' : 'text-lorcana-navy'}`}>
                      {totalCards}/60
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <span className="font-medium">Avg Cost:</span>
                    <span className="font-semibold">{averageCost}</span>
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
                        <img
                          key={index}
                          src={card.images.full}
                          alt={card.fullName}
                          className="absolute top-0 left-0 w-full h-auto rounded-sm shadow-md border-2 border-lorcana-gold"
                          style={{
                            transform: `translateY(${index * -12}px)`, // Vertical-only offset, increased to 12px
                            zIndex: card.quantity - index,
                            filter: index > 0 ? `brightness(${1 - (index * 0.1)})` : 'brightness(1)',
                            maxWidth: 'none' // Prevent the image from being constrained
                          }}
                        />
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