import React, { useState, useMemo, useEffect } from 'react';
import { Package, Upload, Trash2, X, AlertTriangle, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from '../contexts/CollectionContext';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../hooks';
import { supabase, TABLES } from '../lib/supabase';
import { allCards, sets } from '../data/allCards';
import DreambornImport from './DreambornImport';
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

const Collection: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    totalCards,
    uniqueCards,
    clearCollection
  } = useCollection();
  const { getCardQuantity } = useCollection();
  const importModal = useModal();
  const deleteConfirmModal = useModal();
  const publishModal = useModal<{code: string, name: string}>();
  const [publishedBinders, setPublishedBinders] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  // Load published binders on mount
  useEffect(() => {
    if (user) {
      loadPublishedBinders();
    }
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadPublishedBinders = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from(TABLES.USER_BINDERS)
        .select('set_code')
        .eq('user_id', user.id)
        .eq('is_public', true);

      if (error) throw error;

      const publishedSetCodes = new Set(data?.map(binder => binder.set_code) || []);
      setPublishedBinders(publishedSetCodes);
    } catch (error) {
      console.error('Error loading published binders:', error);
    }
  };

  // Calculate set summaries
  const setSummaries = useMemo((): SetSummary[] => {
    return sets.map(set => {
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
    }).sort((a, b) => a.number - b.number); // Sort by set number
  }, [getCardQuantity]);

  const handleDeleteAll = async () => {
    await clearCollection();
    deleteConfirmModal.close();
  };

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
      const { code: setCode, name: setName } = publishModal.data;
      
      // Check if this binder is already published
      const { data: existingBinder, error: checkError } = await supabase
        .from(TABLES.USER_BINDERS)
        .select('id, is_public')
        .eq('user_id', user.id)
        .eq('set_code', setCode)
        .eq('binder_type', 'set')
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingBinder) {
        if (!existingBinder.is_public) {
          // Update existing binder to make it public
          const { error: updateError } = await supabase
            .from(TABLES.USER_BINDERS)
            .update({ is_public: true })
            .eq('id', existingBinder.id);

          if (updateError) throw updateError;
        }
      } else {
        // Create new published binder
        const { error: insertError } = await supabase
          .from(TABLES.USER_BINDERS)
          .insert({
            user_id: user.id,
            name: setName,
            description: `My ${setName} collection binder`,
            binder_type: 'set',
            set_code: setCode,
            cards: [],
            is_public: true
          });

        if (insertError) throw insertError;
      }

      // Update local state
      setPublishedBinders(prev => new Set([...Array.from(prev), setCode]));
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
      const { error } = await supabase
        .from(TABLES.USER_BINDERS)
        .update({ is_public: false })
        .eq('user_id', user.id)
        .eq('set_code', setCode)
        .eq('binder_type', 'set');

      if (error) throw error;

      // Update local state
      setPublishedBinders(prev => {
        const newSet = new Set(prev);
        newSet.delete(setCode);
        return newSet;
      });
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
    <div className="space-y-6">
      {/* Collection Stats and Actions */}
      <div className="bg-white border-2 border-lorcana-gold rounded-sm shadow-lg p-6 art-deco-corner">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div className="flex gap-6 text-sm text-lorcana-ink">
            <div className="flex items-center gap-2">
              <Package size={16} />
              <span>{totalCards} total cards</span>
            </div>
            <div>
              <span>{uniqueCards} unique cards</span>
            </div>
          </div>
          <div className="flex space-x-2 mt-4 md:mt-0">
            <button
              onClick={() => importModal.open()}
              className="btn-lorcana flex items-center space-x-2"
            >
              <Upload size={16} />
              <span>Import Dreamborn Collection</span>
            </button>
            {totalCards > 0 && (
              <button
                onClick={() => deleteConfirmModal.open()}
                className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-sm hover:bg-red-700 transition-colors border-2 border-red-700"
              >
                <Trash2 size={16} />
                <span>Delete All</span>
              </button>
            )}
          </div>
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

      {/* Import Modal */}
      {importModal.isOpen && (
        <DreambornImport onClose={importModal.close} />
      )}
      
      {/* Delete Confirmation Modal */}
      {deleteConfirmModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white border-2 border-lorcana-gold rounded-sm p-6 max-w-md w-full mx-4 shadow-2xl art-deco-corner">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-red-100 border border-red-300 p-3 rounded-sm">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-lorcana-ink">Delete All Cards</h3>
                <p className="text-sm text-lorcana-navy">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-lorcana-ink mb-6">
              Are you sure you want to delete all {totalCards} cards from your collection? 
              This will permanently remove all cards and cannot be recovered.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={deleteConfirmModal.close}
                className="btn-lorcana-outline"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                className="px-4 py-2 bg-red-600 text-white rounded-sm hover:bg-red-700 transition-colors border-2 border-red-700"
              >
                Delete All
              </button>
            </div>
          </div>
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