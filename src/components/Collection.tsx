import React, { useState, useMemo } from 'react';
import { Package, Upload, Trash2, TrendingUp, Star, Book, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCollection } from '../contexts/CollectionContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase, TABLES } from '../lib/supabase';
import { allCards, sets } from '../data/allCards';
import { RARITY_ICONS } from '../constants/icons';
import DreambornImport from './DreambornImport';

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
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
    setShowDeleteConfirm(false);
  };

  const handlePublishBinder = async (setCode: string, setName: string) => {
    if (!user) {
      alert('You must be logged in to publish a binder');
      return;
    }

    try {
      // Check if this binder is already published
      const { data: existingBinder, error: checkError } = await supabase
        .from(TABLES.USER_BINDERS)
        .select('id, is_public')
        .eq('user_id', user.id)
        .eq('set_code', setCode)
        .eq('binder_type', 'set')
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "no rows returned", which is expected if binder doesn't exist
        throw checkError;
      }

      if (existingBinder) {
        if (existingBinder.is_public) {
          alert(`${setName} binder is already published!`);
          return;
        } else {
          // Update existing binder to make it public
          const { error: updateError } = await supabase
            .from(TABLES.USER_BINDERS)
            .update({ is_public: true })
            .eq('id', existingBinder.id);

          if (updateError) throw updateError;
          alert(`${setName} binder has been published successfully!`);
          return;
        }
      }

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

      alert(`${setName} binder has been published successfully!`);
    } catch (error) {
      console.error('Error publishing binder:', error);
      alert('Failed to publish binder. Please try again.');
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
              onClick={() => setShowImportModal(true)}
              className="btn-lorcana flex items-center space-x-2"
            >
              <Upload size={16} />
              <span>Import Dreamborn Collection</span>
            </button>
            {totalCards > 0 && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
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
        <div className="bg-white border-2 border-lorcana-gold rounded-sm shadow-lg p-12 text-center art-deco-corner">
          <Package size={48} className="mx-auto text-lorcana-navy mb-4" />
          <h3 className="text-xl font-semibold text-lorcana-ink mb-2">Your collection is empty</h3>
          <p className="text-lorcana-navy mb-6">
            Start building your collection by browsing cards and adding them from the Browse Cards tab.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {setSummaries.map((setData) => (
            <div key={setData.code} className="card-lorcana p-6 hover:shadow-xl transition-all duration-300 hover:scale-105">
              {/* Set Header */}
              <div className="mb-4">
                <h3 className="text-lg font-bold text-lorcana-ink mb-1">{setData.name}</h3>
                <p className="text-sm text-lorcana-navy">Set {setData.number} • {setData.code}</p>
              </div>

              {/* Progress Overview */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-lorcana-ink">Master Set</span>
                  <span className="text-sm font-bold text-lorcana-navy">
                    {setData.ownedCards}/{setData.totalCards} ({setData.ownedPercentage.toFixed(1)}%)
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-lorcana-cream border border-lorcana-gold rounded-sm h-3 mb-3">
                  <div
                    className={`h-3 rounded-sm transition-all duration-300 ${getProgressBarColor(setData.ownedPercentage)}`}
                    style={{ width: `${setData.ownedPercentage}%` }}
                  />
                </div>

                {/* Total Owned */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-1 text-lorcana-navy">
                    <TrendingUp size={14} />
                    <span>Total owned: {setData.totalOwned}</span>
                  </div>
                  {setData.ownedPercentage === 100 && (
                    <div className="flex items-center gap-1 text-lorcana-gold">
                      <Star size={14} />
                      <span className="font-medium">Complete!</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Binder Actions */}
              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => navigate(`/collection/binder/${setData.code}`)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-lorcana-gold text-lorcana-ink font-medium rounded-sm hover:bg-lorcana-gold/90 transition-colors border-2 border-lorcana-gold"
                >
                  <Book size={16} />
                  <span>View</span>
                </button>
                <button
                  onClick={() => handlePublishBinder(setData.code, setData.name)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-lorcana-navy text-lorcana-cream font-medium rounded-sm hover:bg-lorcana-purple transition-colors border-2 border-lorcana-navy"
                >
                  <Share2 size={16} />
                  <span>Publish</span>
                </button>
              </div>

              {/* Rarity Breakdown Table */}
              <div>
                <div className="border-2 border-lorcana-gold rounded-sm overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-lorcana-navy">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-lorcana-gold">Rarity</th>
                        <th className="px-3 py-2 text-center font-medium text-lorcana-gold">Master Set</th>
                        <th className="px-3 py-2 text-center font-medium text-lorcana-gold">Playable Set</th>
                      </tr>
                    </thead>
                    <tbody className="bg-lorcana-purple divide-y divide-lorcana-gold/50">
                      {Object.entries(setData.rarityBreakdown)
                        .filter(([, data]) => data.total > 0)
                        .sort(([a], [b]) => {
                          const rarityOrder = ['Common', 'Uncommon', 'Rare', 'Super Rare', 'Legendary', 'Enchanted', 'Special'];
                          return rarityOrder.indexOf(a) - rarityOrder.indexOf(b);
                        })
                        .map(([rarity, data]) => (
                          <tr key={rarity} className="hover:bg-lorcana-navy transition-colors">
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                {RARITY_ICONS[rarity] && (
                                  <img 
                                    src={RARITY_ICONS[rarity]} 
                                    alt={rarity}
                                    className="w-4 h-4"
                                  />
                                )}
                                <span className="font-medium text-white">{rarity}</span>
                              </div>
                            </td>
                            <td className="px-3 py-2 text-center text-lorcana-cream">
                              {data.owned}/{data.total} ({data.total > 0 ? ((data.owned / data.total) * 100).toFixed(0) : 0}%)
                            </td>
                            <td className="px-3 py-2 text-center text-lorcana-cream">
                              {data.playable}/{data.total} ({data.total > 0 ? ((data.playable / data.total) * 100).toFixed(0) : 0}%)
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <DreambornImport onClose={() => setShowImportModal(false)} />
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
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
                onClick={() => setShowDeleteConfirm(false)}
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
    </div>
  );
};

export default Collection;