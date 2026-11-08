import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, BarChart3, Plus, Minus, Printer, FileText, Image } from 'lucide-react';
import { useDeck } from '../contexts/DeckContext';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../contexts/ProfileContext';
import { useCollection } from '../contexts/CollectionContext';
import { useCardData } from '../contexts/CardDataContext';
import { DECK_RULES } from '../constants';
import CardImage from './CardImage';
import DeckStatistics from './deck/DeckStatistics';
import DeckHeader from './deck/DeckHeader';
import DeckPrintView from './deck/DeckPrintView';
import { Modal } from './ui/Modal';
import CardPhotoSwipe from './CardPhotoSwipe';
import { LorcanaCard } from '../types';
import AvatarEditor from './AvatarEditor';
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
  const { allCards, sets } = useCardData();
  const { currentDeck, decks, fetchDeck, setCurrentDeck, startEditingDeck, getDeckSummary, addCardToDeck, removeCardFromDeck, updateCardQuantity, updateDeck } = useDeck();
  const [authorDisplayName, setAuthorDisplayName] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [sortBy, setSortBy] = useState<'cost' | 'type' | 'color' | 'set' | 'story'>('set');
  const [tooltip, setTooltip] = useState<{ show: boolean; x: number; y: number; content: string }>({
    show: false, x: 0, y: 0, content: ''
  });
  const [isPhotoSwipeOpen, setIsPhotoSwipeOpen] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [printMode, setPrintMode] = useState<'text' | 'images' | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [printFormat, setPrintFormat] = useState<'text' | 'images'>('text');
  const [printGroupBy, setPrintGroupBy] = useState<'none' | 'cost' | 'type' | 'color' | 'set' | 'story'>('set');
  const [printSortPrimary, setPrintSortPrimary] = useState<'name' | 'cost' | 'type' | 'color' | 'set' | 'story'>('name');
  const [printSortSecondary, setPrintSortSecondary] = useState<'name' | 'cost' | 'type' | 'color' | 'set' | 'story'>('cost');
  const [printColumns, setPrintColumns] = useState(4);
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);

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
  
  // Load the deck in the URL: one of yours, or a public deck fetched by id.
  const [deckMissing, setDeckMissing] = useState(false);
  useEffect(() => {
    if (!deckId) return;
    let cancelled = false;
    setDeckMissing(false);
    fetchDeck(deckId).then(deck => {
      if (cancelled) return;
      if (deck) setCurrentDeck(deck);
      else setDeckMissing(true);
    });
    return () => { cancelled = true; };
  }, [deckId, decks, fetchDeck, setCurrentDeck]);

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
  }, [currentDeck, getCardQuantity, allCards]);

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
        case 'color': {
          const colorA = a.color || 'None';
          const colorB = b.color || 'None';
          if (colorA !== colorB) return colorA.localeCompare(colorB);
          return a.name.localeCompare(b.name);
        }
        case 'set':
          if (a.setCode !== b.setCode) {
            const aNum = parseInt(a.setCode);
            const bNum = parseInt(b.setCode);
            if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
            if (!isNaN(aNum)) return -1;
            if (!isNaN(bNum)) return 1;
            return a.setCode.localeCompare(b.setCode);
          }
          if (a.number !== b.number) return a.number - b.number;
          return a.name.localeCompare(b.name);
        case 'story': {
          const storyA = a.story || 'Unknown';
          const storyB = b.story || 'Unknown';
          if (storyA !== storyB) return storyA.localeCompare(storyB);
          return a.name.localeCompare(b.name);
        }
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [cardsWithData, sortBy]);

  // Group cards for display
  const groupedCards = useMemo(() => {
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
        case 'set': {
          const setInfo = sets.find(s => s.code === card.setCode);
          groupKey = setInfo?.name || `Set ${card.setCode}`;
          break;
        }
        case 'story':
          groupKey = card.story || 'Unknown';
          break;
        default:
          groupKey = 'All Cards';
      }

      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(card);
      return acc;
    }, {} as Record<string, CardWithQuantity[]>);
  }, [sortedCards, sortBy, sets]);

  // Sort groups
  const sortedGroups = useMemo(() => {
    return Object.entries(groupedCards).sort(([a], [b]) => {
      if (sortBy === 'cost') {
        const costA = parseInt(a.split(' ')[0]);
        const costB = parseInt(b.split(' ')[0]);
        return costA - costB;
      }
      if (sortBy === 'set') {
        const setA = sets.find(s => s.name === a);
        const setB = sets.find(s => s.name === b);
        if (setA && setB) return setA.number - setB.number;
        if (setA) return -1;
        if (setB) return 1;
        return a.localeCompare(b);
      }
      return a.localeCompare(b);
    });
  }, [groupedCards, sortBy, sets]);

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

  // Print-specific sorting
  const printSortedCards = useMemo(() => {
    const sortFn = (a: CardWithQuantity, b: CardWithQuantity, key: string): number => {
      switch (key) {
        case 'cost': return a.cost - b.cost;
        case 'type': return a.type.localeCompare(b.type);
        case 'color': return (a.color || 'None').localeCompare(b.color || 'None');
        case 'set': {
          const aNum = parseInt(a.setCode);
          const bNum = parseInt(b.setCode);
          if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
          if (!isNaN(aNum)) return -1;
          if (!isNaN(bNum)) return 1;
          return a.setCode.localeCompare(b.setCode);
        }
        case 'story': return (a.story || 'Unknown').localeCompare(b.story || 'Unknown');
        case 'name': default: return a.name.localeCompare(b.name);
      }
    };

    return [...cardsWithData].sort((a, b) => {
      if (printGroupBy !== 'none') {
        const groupResult = sortFn(a, b, printGroupBy);
        if (groupResult !== 0) return groupResult;
      }
      const primary = sortFn(a, b, printSortPrimary);
      if (primary !== 0) return primary;
      const secondary = sortFn(a, b, printSortSecondary);
      if (secondary !== 0) return secondary;
      return a.name.localeCompare(b.name);
    });
  }, [cardsWithData, printGroupBy, printSortPrimary, printSortSecondary]);

  // Print-specific grouping
  const printSortedGroups = useMemo(() => {
    if (printGroupBy === 'none') {
      return [['All Cards', printSortedCards]] as [string, CardWithQuantity[]][];
    }

    const grouped = printSortedCards.reduce((acc, card) => {
      let groupKey: string;
      switch (printGroupBy) {
        case 'cost': groupKey = `${card.cost} Cost`; break;
        case 'type': groupKey = card.type; break;
        case 'color': groupKey = card.color || 'None'; break;
        case 'set': {
          const setInfo = sets.find(s => s.code === card.setCode);
          groupKey = setInfo?.name || `Set ${card.setCode}`;
          break;
        }
        case 'story': groupKey = card.story || 'Unknown'; break;
        default: groupKey = 'All Cards';
      }
      if (!acc[groupKey]) acc[groupKey] = [];
      acc[groupKey].push(card);
      return acc;
    }, {} as Record<string, CardWithQuantity[]>);

    return Object.entries(grouped).sort(([a], [b]) => {
      if (printGroupBy === 'cost') {
        return parseInt(a.split(' ')[0]) - parseInt(b.split(' ')[0]);
      }
      if (printGroupBy === 'set') {
        const setA = sets.find(s => s.name === a);
        const setB = sets.find(s => s.name === b);
        if (setA && setB) return setA.number - setB.number;
        if (setA) return -1;
        if (setB) return 1;
      }
      return a.localeCompare(b);
    });
  }, [printSortedCards, printGroupBy, sets]);

  // Now handle early returns after all hooks
  if (!currentDeck || (deckId && currentDeck.id !== deckId)) {
    if (!deckMissing) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-lorcana-gold" aria-label="Loading deck"></div>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-lorcana-ink mb-2">This deck doesn't exist or isn't public</h2>
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
  // Commenting out unused variable for now
  // const averageCost = cardsWithData.length > 0
  //   ? (cardsWithData.reduce((sum, card) => sum + (card.cost * card.quantity), 0) / totalCards).toFixed(1)
  //   : '0';

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

  const handlePrintClick = () => {
    setShowPrintModal(true);
  };

  const handlePrint = async () => {
    setShowPrintModal(false);
    setPrintMode(printFormat);

    if (printFormat === 'images') {
      const imagePromises = printSortedCards.map(card =>
        new Promise<void>((resolve) => {
          const img = new window.Image();
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = card.images.full;
        })
      );
      await Promise.all(imagePromises);
    }

    setTimeout(() => {
      window.print();
      setPrintMode(null);
    }, 200);
  };

  const handleExportCsv = () => {
    if (!currentDeck) return;
    const headers = ['Set', 'Number', 'Quantity', 'Name', 'Version', 'Full Name', 'Color', 'Cost', 'Type', 'Rarity'];
    const rows = sortedCards.map(card => [
      card.setCode,
      card.number,
      card.quantity,
      card.name,
      card.version || '',
      card.fullName,
      card.color,
      card.cost,
      card.type,
      card.rarity,
    ]);
    const csvContent = [headers, ...rows]
      .map(row => row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${currentDeck.name.replace(/[^a-z0-9]/gi, '_')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveAvatar = async (avatarData: { cardId: number; cropData: { x: number; y: number; scale: number } }) => {
    if (!currentDeck) return;
    try {
      await updateDeck({ ...currentDeck, avatar: avatarData });
      setAvatarEditorOpen(false);
    } catch (error) {
      console.error('Error updating deck avatar:', error);
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
    .sort(([, a], [, b]) => b - a) as [string, number][];

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
        {/* Header - using extracted DeckHeader component */}
        <DeckHeader
          deck={currentDeck}
          summary={summary}
          totalCards={totalCards}
          authorDisplayName={authorDisplayName}
          userId={user?.id}
          copySuccess={copySuccess}
          inkColors={inkColors}
          onBack={onBack}
          onExportToInktable={handleExportToInktable}
          onCopyInktableUrl={handleCopyInktableUrl}
          onEditDeck={() => {
            startEditingDeck(currentDeck.id);
            navigate('/cards');
          }}
          onPrint={handlePrintClick}
          onExportCsv={handleExportCsv}
          getCardImageUrl={getCardImageUrl}
          onViewProfile={handleViewProfile}
          onEditAvatar={() => setAvatarEditorOpen(true)}
        />

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
              <option value="story">Group by Franchise</option>
              <option value="set">Group by Set</option>
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
                          // const stackOffsetUp = (card.quantity - 1) * 12;
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
                                  // Front cards (lowest indices) are coloured for owned copies, rest greyed
                                  const isMissing = index >= ownedCopies;

                                  return (
                                    <div
                                      key={index}
                                      className="absolute top-0 left-0 w-full h-full"
                                      style={{
                                        transform: `translateY(${index * -12}px) translateZ(0)`, // translateZ(0) forces GPU layer
                                        zIndex: card.quantity - index,
                                        filter: [
                                          isMissing ? (index === 0 ? 'grayscale(100%)' : 'grayscale(100%) opacity(0.5)') : '',
                                          index > 0 ? `brightness(${1 - (index * 0.1)})` : '',
                                        ].filter(Boolean).join(' ') || undefined,
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
                                  <div className="absolute top-2 right-2 px-2 py-1 bg-red-600 text-white rounded-sm text-xs font-bold shadow-lg z-50 border border-white">
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

      {/* Print Modal */}
      <Modal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        title="Print Deck"
        titleIcon={<Printer size={24} />}
        size="sm"
      >
        <div className="p-6 space-y-5">
          {/* Format */}
          <div>
            <label className="block text-sm font-medium text-lorcana-ink mb-2">Format</label>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setPrintFormat('text');
                  setPrintGroupBy('set');
                  setPrintSortPrimary('name');
                  setPrintSortSecondary('cost');
                }}
                className={`flex items-center gap-2 px-4 py-2 border-2 rounded-sm transition-colors flex-1 ${
                  printFormat === 'text'
                    ? 'border-lorcana-navy bg-lorcana-navy text-lorcana-gold'
                    : 'border-lorcana-gold bg-lorcana-cream text-lorcana-ink hover:bg-lorcana-gold/20'
                }`}
              >
                <FileText size={16} className="flex-shrink-0" />
                <span className="text-sm font-medium">Text List</span>
              </button>
              <button
                onClick={() => {
                  setPrintFormat('images');
                  setPrintGroupBy('none');
                  setPrintSortPrimary('cost');
                  setPrintSortSecondary('set');
                  setPrintColumns(6);
                }}
                className={`flex items-center gap-2 px-4 py-2 border-2 rounded-sm transition-colors flex-1 ${
                  printFormat === 'images'
                    ? 'border-lorcana-navy bg-lorcana-navy text-lorcana-gold'
                    : 'border-lorcana-gold bg-lorcana-cream text-lorcana-ink hover:bg-lorcana-gold/20'
                }`}
              >
                <Image size={16} className="flex-shrink-0" />
                <span className="text-sm font-medium">Card Images</span>
              </button>
            </div>
          </div>

          {/* Grouping */}
          <div>
            <label className="block text-sm font-medium text-lorcana-ink mb-2">Group by</label>
            <select
              value={printGroupBy}
              onChange={(e) => setPrintGroupBy(e.target.value as any)}
              className="w-full text-sm border-2 border-lorcana-gold rounded-sm px-3 py-2 focus:ring-2 focus:ring-lorcana-gold focus:border-lorcana-navy bg-lorcana-cream"
            >
              <option value="none">No grouping</option>
              <option value="cost">Cost</option>
              <option value="type">Type</option>
              <option value="color">Color</option>
              <option value="story">Franchise</option>
              <option value="set">Set</option>
            </select>
          </div>

          {/* Sorting */}
          <div>
            <label className="block text-sm font-medium text-lorcana-ink mb-2">Sort by</label>
            <div className="flex gap-2">
              <select
                value={printSortPrimary}
                onChange={(e) => setPrintSortPrimary(e.target.value as any)}
                className="flex-1 text-sm border-2 border-lorcana-gold rounded-sm px-3 py-2 focus:ring-2 focus:ring-lorcana-gold focus:border-lorcana-navy bg-lorcana-cream"
              >
                <option value="name">Name</option>
                <option value="cost">Cost</option>
                <option value="type">Type</option>
                <option value="color">Color</option>
                <option value="story">Franchise</option>
                <option value="set">Set</option>
              </select>
              <span className="self-center text-sm text-lorcana-navy">then</span>
              <select
                value={printSortSecondary}
                onChange={(e) => setPrintSortSecondary(e.target.value as any)}
                className="flex-1 text-sm border-2 border-lorcana-gold rounded-sm px-3 py-2 focus:ring-2 focus:ring-lorcana-gold focus:border-lorcana-navy bg-lorcana-cream"
              >
                <option value="name">Name</option>
                <option value="cost">Cost</option>
                <option value="type">Type</option>
                <option value="color">Color</option>
                <option value="story">Franchise</option>
                <option value="set">Set</option>
              </select>
            </div>
          </div>

          {/* Columns (images only) */}
          {printFormat === 'images' && (
            <div>
              <label className="block text-sm font-medium text-lorcana-ink mb-2">Cards per row</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={2}
                  max={6}
                  value={printColumns}
                  onChange={(e) => setPrintColumns(Number(e.target.value))}
                  className="flex-1 accent-lorcana-navy"
                />
                <span className="text-sm font-medium text-lorcana-ink w-6 text-center">{printColumns}</span>
              </div>
            </div>
          )}

          {/* Print button */}
          <button
            onClick={handlePrint}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-lorcana-navy text-lorcana-gold font-medium rounded-sm hover:bg-lorcana-purple transition-colors border-2 border-lorcana-gold"
          >
            <Printer size={18} />
            Print
          </button>
        </div>
      </Modal>

      {/* Print View (rendered into #print-root portal) */}
      {printMode && currentDeck && (
        <DeckPrintView
          deck={currentDeck}
          cards={printSortedCards}
          mode={printMode}
          sortedGroups={printSortedGroups}
          columns={printColumns}
        />
      )}

      {/* Avatar Editor */}
      <AvatarEditor
        isOpen={avatarEditorOpen}
        onClose={() => setAvatarEditorOpen(false)}
        onSave={handleSaveAvatar}
        currentAvatar={currentDeck?.avatar}
      />
    </div>
  );
};

export default DeckSummary;