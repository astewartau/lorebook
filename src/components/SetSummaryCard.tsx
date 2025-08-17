import React from 'react';
import { TrendingUp, Star, Book, Share2, CheckCircle } from 'lucide-react';
import { RARITY_ICONS } from '../constants/icons';

interface SetSummary {
  code: string;
  name: string;
  number: number;
  totalCards: number;
  ownedCards: number;
  ownedPercentage: number;
  totalOwned: number;
  rarityBreakdown: Record<string, { owned: number; playable: number; total: number }>;
}

interface SetSummaryCardProps {
  setData: SetSummary;
  isPublished: boolean;
  isLoading: boolean;
  onNavigate: (path: string) => void;
  onPublish: (code: string, name: string) => void;
  onUnpublish: (code: string) => void;
  getProgressBarColor: (percentage: number) => string;
}

export const SetSummaryCard: React.FC<SetSummaryCardProps> = ({
  setData,
  isPublished,
  isLoading,
  onNavigate,
  onPublish,
  onUnpublish,
  getProgressBarColor
}) => {
  return (
    <div className="card-lorcana p-6 hover:shadow-xl transition-all duration-300 hover:scale-105">
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
          onClick={() => onNavigate(`/collection/binder/${setData.code}`)}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-lorcana-gold text-lorcana-ink font-medium rounded-sm hover:bg-lorcana-gold/90 transition-colors border-2 border-lorcana-gold"
        >
          <Book size={16} />
          <span>View</span>
        </button>
        {isPublished ? (
          <button
            onClick={() => onUnpublish(setData.code)}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white font-medium rounded-sm hover:bg-red-600 transition-colors border-2 border-green-600 hover:border-red-600 disabled:opacity-50"
          >
            <CheckCircle size={16} />
            <span>Unpublish</span>
          </button>
        ) : (
          <button
            onClick={() => onPublish(setData.code, setData.name)}
            disabled={isLoading}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-lorcana-navy text-lorcana-cream font-medium rounded-sm hover:bg-lorcana-purple transition-colors border-2 border-lorcana-navy disabled:opacity-50"
          >
            <Share2 size={16} />
            <span>Publish</span>
          </button>
        )}
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
  );
};