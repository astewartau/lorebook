import React, { useState, useMemo } from 'react';
import { X, AlertTriangle, Share2, Package, Upload, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from '../contexts/CollectionContext';
import { useAuth } from '../contexts/AuthContext';
import { useCardData } from '../contexts/CardDataContext';
import { useModal } from '../hooks';
import { useBinder } from '../contexts/BinderContext';
import { EmptyCollectionState } from './EmptyCollectionState';
import { SetSummaryCard } from './SetSummaryCard';

interface SetSummary {
  code: string;
  name: string;
  number: number;
  totalCards: number;
  ownedCards: number;
  ownedPercentage: number;
  totalOwned: number; // Total quantity owned including duplicates
  rarityBreakdown: Record<string, { owned: number; playable: number; total: number }>;
}

interface CollectionProps {
  totalCards: number;
  uniqueCards: number;
  onImportClick: () => void;
  onDeleteAllClick: () => void;
}

const Collection: React.FC<CollectionProps> = ({
  totalCards,
  uniqueCards,
  onImportClick,
  onDeleteAllClick
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { getCardQuantity } = useCollection();
  const { allCards, sets } = useCardData();
  const publishModal = useModal<{code: string, name: string}>();
  const { publishedSets: publishedBinders, setSetBinderPublic } = useBinder();
  const [isLoading, setIsLoading] = useState(false);

  // Calculate set summaries
  const setSummaries = useMemo((): SetSummary[] => {
    return sets
      .filter(set => allCards.some(card => card.setCode === set.code))
      .map(set => {
      // Get all cards in this set - each card is individual now
      const setCards = allCards.filter(card => card.setCode === set.code);
      const totalCardsInSet = setCards.length;

      // Calculate owned cards and quantities
      let ownedCards = 0;
      let totalOwnedQuantity = 0;
      const rarityBreakdown: Record<string, { owned: number; playable: number; total: number }> = {};

      setCards.forEach(card => {
        const quantities = getCardQuantity(card.id);
        const totalCardQuantity = quantities.total;
        
        if (totalCardQuantity > 0) {
          ownedCards++;
          totalOwnedQuantity += totalCardQuantity;
        }

        // Track rarity breakdown
        const rarity = card.rarity;
        if (!rarityBreakdown[rarity]) {
          rarityBreakdown[rarity] = { owned: 0, playable: 0, total: 0 };
        }
        rarityBreakdown[rarity].total++;
        
        // Count owned cards
        if (totalCardQuantity > 0) {
          rarityBreakdown[rarity].owned++;
        }
        
        // Playable set (4 or more copies)
        if (totalCardQuantity >= 4) {
          rarityBreakdown[rarity].playable++;
        }
      });

      const ownedPercentage = totalCardsInSet > 0 ? (ownedCards / totalCardsInSet) * 100 : 0;

      return {
        code: set.code,
        name: set.name,
        number: set.number,
        totalCards: totalCardsInSet,
        ownedCards,
        ownedPercentage,
        totalOwned: totalOwnedQuantity,
        rarityBreakdown
      };
    }).sort((a, b) => b.number - a.number); // Sort by set number (newest first)
  }, [getCardQuantity, allCards, sets]);

  const handlePublishClick = (setCode: string, setName: string) => {
    if (!user) {
      // Could show a login modal or redirect instead
      return;
    }
    
    publishModal.open({ code: setCode, name: setName });
  };

  const handleConfirmPublish = async () => {
    if (!user || !publishModal.data) return;
    setIsLoading(true);
    try {
      await setSetBinderPublic(publishModal.data.code, publishModal.data.name, true);
      publishModal.close();
    } catch (error) {
      console.error('Error publishing binder:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnpublish = async (setCode: string) => {
    if (!user) return;
    setIsLoading(true);
    try {
      await setSetBinderPublic(setCode, '', false);
    } catch (error) {
      console.error('Error unpublishing binder:', error);
    } finally {
      setIsLoading(false);
    }
  };


  const getProgressBarColor = (percentage: number) => {
    if (percentage === 100) return 'bg-lorcana-gold';
    if (percentage >= 75) return 'bg-lorcana-navy';
    if (percentage >= 50) return 'bg-lorcana-purple';
    if (percentage >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div>
      {/* Collection Stats and Actions Header */}
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-lorcana-gold/20">
        <div className="flex gap-6 text-sm text-lorcana-ink">
          <div className="flex items-center gap-2">
            <Package size={16} />
            <span>{totalCards} total cards</span>
          </div>
          <div>
            <span>{uniqueCards} unique cards</span>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={onImportClick}
            className="btn-lorcana-gold-sm flex items-center space-x-2"
          >
            <Upload size={14} />
            <span className="hidden sm:inline">Import Dreamborn</span>
            <span className="sm:hidden">Import</span>
          </button>
          
          {totalCards > 0 && (
            <button
              onClick={onDeleteAllClick}
              className="flex items-center space-x-1 px-3 py-1.5 bg-red-600 text-white rounded-sm hover:bg-red-700 transition-colors text-sm"
            >
              <Trash2 size={14} />
              <span className="hidden sm:inline">Delete All</span>
              <span className="sm:hidden">Clear</span>
            </button>
          )}
        </div>
      </div>

      {/* Set Summaries */}
      {totalCards === 0 ? (
        <EmptyCollectionState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {setSummaries.map((setData) => (
            <SetSummaryCard
              key={setData.code}
              setData={setData}
              isPublished={publishedBinders.has(setData.code)}
              isLoading={isLoading}
              onNavigate={navigate}
              onPublish={handlePublishClick}
              onUnpublish={handleUnpublish}
              getProgressBarColor={getProgressBarColor}
            />
          ))}
        </div>
      )}


      {/* Publish Confirmation Modal */}
      {publishModal.isOpen && publishModal.data && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-lorcana-navy border-2 border-lorcana-gold rounded-sm p-6 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="bg-lorcana-gold/20 border border-lorcana-gold p-3 rounded-sm">
                  <Share2 size={24} className="text-lorcana-gold" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-lorcana-cream">Publish Binder</h3>
                  <p className="text-sm text-lorcana-cream/80">Share your collection with the community</p>
                </div>
              </div>
              <button
                onClick={publishModal.close}
                className="text-lorcana-cream/60 hover:text-lorcana-cream transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="bg-lorcana-purple/30 border border-lorcana-gold/30 rounded-sm p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-lorcana-gold flex-shrink-0 mt-0.5" size={16} />
                <div>
                  <h4 className="font-medium text-lorcana-cream mb-1">Publishing your {publishModal.data.name} binder will:</h4>
                  <ul className="text-sm text-lorcana-cream/80 space-y-1">
                    <li>• Make your collection visible to other users</li>
                    <li>• Allow others to view your progress and cards</li>
                    <li>• Share your binder in the Community section</li>
                    <li>• You can unpublish at any time</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <p className="text-lorcana-cream/90 mb-6">
              Are you sure you want to publish your <span className="font-medium text-lorcana-gold">{publishModal.data.name}</span> collection binder?
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={publishModal.close}
                disabled={isLoading}
                className="px-4 py-2 border border-lorcana-gold/50 text-lorcana-cream rounded-sm hover:bg-lorcana-gold/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPublish}
                disabled={isLoading}
                className="px-4 py-2 bg-lorcana-gold text-lorcana-navy rounded-sm hover:bg-lorcana-gold/90 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-lorcana-navy border-t-transparent rounded-full animate-spin"></div>
                    Publishing...
                  </>
                ) : (
                  <>
                    <Share2 size={16} />
                    Publish Binder
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Collection;