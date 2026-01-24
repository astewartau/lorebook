import React from 'react';
import { Edit, Eye, Copy, Trash2, Upload } from 'lucide-react';
import { Deck } from '../types';
import { COLOR_ICONS } from '../constants/icons';
import AvatarImage from './AvatarImage';

interface DeckCardProps {
  deck: Deck;
  summary: {
    cardCount: number;
    inkDistribution: Record<string, number>;
    isValid: boolean;
    updatedAt: Date;
  };
  onView: (deckId: string) => void;
  onEdit: (deckId: string) => void;
  onDuplicate: (deckId: string) => void;
  onDelete: (deckId: string) => void;
  onExport: (deckId: string) => void;
  onPublish?: (deckId: string) => void;
  onUnpublish?: (deckId: string) => void;
  onEditAvatar?: (deckId: string) => void;
}

const DeckCard: React.FC<DeckCardProps> = ({
  deck,
  summary,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onExport,
  onPublish,
  onUnpublish,
  onEditAvatar
}) => {
  const getInkColorBg = (color: string) => {
    switch (color) {
      case 'Amber': return 'bg-yellow-400';
      case 'Amethyst': return 'bg-purple-400';
      case 'Emerald': return 'bg-green-400';
      case 'Ruby': return 'bg-red-400';
      case 'Sapphire': return 'bg-blue-400';
      case 'Steel': return 'bg-gray-400';
      default: return 'bg-gray-300';
    }
  };


  const inkColors = Object.entries(summary.inkDistribution)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);
  

  return (
    <div className="card-lorcana art-deco-corner group">
      {/* Header with deck name and status */}
      <div className="p-4 border-b border-lorcana-gold/20">
        <div className="flex items-start justify-between mb-2">
          {/* Avatar area */}
          <div className="flex-shrink-0 mr-3">
            <div className="relative">
              {deck.avatar ? (
                <AvatarImage
                  cardId={deck.avatar.cardId}
                  cropData={deck.avatar.cropData}
                  className="w-16 h-16 rounded-full border-2 border-lorcana-gold cursor-pointer group-hover:border-lorcana-navy transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditAvatar?.(deck.id);
                  }}
                />
              ) : (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditAvatar?.(deck.id);
                  }}
                  className="w-16 h-16 rounded-full border-2 border-lorcana-gold overflow-hidden hover:border-lorcana-navy transition-all group/avatar"
                  aria-label="Add deck avatar"
                >
                  <img
                    src="/imgs/lorebook-icon-profile.png"
                    alt="Default Avatar"
                    className="w-full h-full object-cover group-hover/avatar:opacity-70 transition-opacity"
                  />
                </button>
              )}
            </div>
          </div>
          
          <div className="flex-1 min-w-0 mr-3">
            <h3 
              className="text-lg font-bold text-lorcana-ink cursor-pointer hover:text-lorcana-navy transition-colors truncate"
              onClick={() => onView(deck.id)}
            >
              {deck.name}
            </h3>
            
            {/* Toggle switch for publish status */}
            {(onPublish || onUnpublish) && (
              <div className="flex items-center mt-2 space-x-2">
                <span className="text-xs text-lorcana-navy" id={`public-label-${deck.id}`}>Public:</span>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={deck.isPublic}
                    onChange={(e) => {
                      e.stopPropagation();
                      if (deck.isPublic && onUnpublish) {
                        onUnpublish(deck.id);
                      } else if (!deck.isPublic && onPublish) {
                        onPublish(deck.id);
                      }
                    }}
                    aria-label={`Make deck ${deck.isPublic ? 'private' : 'public'}`}
                    aria-describedby={`public-label-${deck.id}`}
                  />
                  <span className="toggle-slider" aria-hidden="true"></span>
                </label>
              </div>
            )}
          </div>
          
          {/* Card count and ink colors in top-right */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            <div className="flex items-center space-x-1 text-lorcana-navy">
              <Copy size={14} />
              <span className="text-xs font-medium">{summary?.cardCount || 0}</span>
            </div>
            
            {/* Ink color icons */}
            {inkColors.length > 0 && (
              <div className="flex space-x-1">
                {inkColors.map(([color]) => (
                  <div 
                    key={color} 
                    className="flex items-center"
                    title={color}
                  >
                    {COLOR_ICONS[color] ? (
                      <img 
                        src={COLOR_ICONS[color]} 
                        alt={color}
                        className="w-6 h-6"
                      />
                    ) : (
                      <div className={`w-5 h-5 rounded-full ${getInkColorBg(color)} border-2 border-white shadow-sm`} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {deck.description && (
          <p className="text-sm text-lorcana-navy line-clamp-2">{deck.description}</p>
        )}
      </div>

      {/* Action buttons */}
      <div className="p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onView(deck.id);
            }}
            className="btn-lorcana-gold-sm flex items-center gap-1 flex-1 min-w-0 justify-center"
          >
            <Eye size={14} />
            <span className="truncate">View</span>
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(deck.id);
            }}
            className="btn-lorcana-navy-sm flex items-center gap-1 flex-1 min-w-0 justify-center"
          >
            <Edit size={14} />
            <span className="truncate">Edit</span>
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(deck.id);
            }}
            className="btn-lorcana-navy-sm flex items-center gap-1"
            aria-label="Duplicate deck"
          >
            <Copy size={14} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onExport(deck.id);
            }}
            className="btn-lorcana-navy-sm flex items-center gap-1"
            aria-label="Export deck"
          >
            <Upload size={14} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(deck.id);
            }}
            className="btn-lorcana-navy-sm flex items-center gap-1 hover:bg-red-500 hover:text-white hover:border-red-500"
            aria-label="Delete deck"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeckCard;