import React from 'react';
import { ArrowLeft, Edit3, User, ExternalLink, Copy, Check } from 'lucide-react';
import { Deck, DeckSummary } from '../../types';
import { COLOR_ICONS } from '../../constants/icons';
import { DECK_RULES } from '../../constants';

interface DeckHeaderProps {
  deck: Deck;
  summary: DeckSummary;
  totalCards: number;
  authorDisplayName: string;
  userId: string | undefined;
  copySuccess: boolean;
  inkColors: [string, number][];
  onBack: () => void;
  onExportToInktable: () => void;
  onCopyInktableUrl: () => void;
  onEditDeck: () => void;
  getCardImageUrl: (cardId: number) => string;
  onViewProfile: (userId: string) => void;
}

const DeckHeader: React.FC<DeckHeaderProps> = ({
  deck,
  summary,
  totalCards,
  authorDisplayName,
  userId,
  copySuccess,
  inkColors,
  onBack,
  onExportToInktable,
  onCopyInktableUrl,
  onEditDeck,
  getCardImageUrl,
  onViewProfile
}) => {
  const isOwner = userId && deck.userId === userId;

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

  // Avatar component (shared between layouts)
  const Avatar = ({ size = 'lg' }: { size?: 'sm' | 'lg' }) => {
    const sizeClass = size === 'lg' ? 'w-20 h-20' : 'w-16 h-16';
    return (
      <div className={`${sizeClass} rounded-full overflow-hidden border-4 border-lorcana-gold shadow-lg`}>
        {deck.avatar ? (
          <div
            className="w-full h-full"
            style={{
              backgroundImage: `url(${getCardImageUrl(deck.avatar.cardId)})`,
              backgroundSize: `${100 * deck.avatar.cropData.scale}%`,
              backgroundPosition: `${deck.avatar.cropData.x}% ${deck.avatar.cropData.y}%`,
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
    );
  };

  // Ink color icons component
  const InkColors = () => (
    inkColors.length > 0 ? (
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
    ) : null
  );

  // Action buttons component
  const ActionButtons = ({ stacked = false }: { stacked?: boolean }) => (
    <div className={stacked ? 'flex flex-col gap-2' : 'flex items-center space-x-3'}>
      <button
        onClick={onExportToInktable}
        className={`btn-lorcana flex items-center ${stacked ? 'justify-center w-full' : ''} space-x-2`}
        title="Open deck in Inktable"
      >
        <ExternalLink size={16} />
        <span>Play on Inktable</span>
      </button>
      <button
        onClick={onCopyInktableUrl}
        className={`btn-lorcana-navy flex items-center ${stacked ? 'justify-center w-full' : ''} space-x-2 transition-colors ${
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
      {isOwner && (
        <button
          onClick={onEditDeck}
          className={`btn-lorcana-navy flex items-center ${stacked ? 'justify-center w-full' : ''} space-x-2`}
        >
          <Edit3 size={16} />
          <span>Edit Deck</span>
        </button>
      )}
    </div>
  );

  // Deck info component
  const DeckInfo = ({ compact = false }: { compact?: boolean }) => (
    <div>
      <h1 className={`${compact ? 'text-2xl' : 'text-3xl'} font-bold text-lorcana-ink mb-2`}>
        {deck.name}
      </h1>

      {/* Author info for public decks */}
      {deck.userId && deck.userId !== userId && (
        <div className="flex items-center space-x-2 mb-3">
          <span className="text-sm text-lorcana-navy">by</span>
          <button
            onClick={() => onViewProfile(deck.userId!)}
            className="flex items-center space-x-1 text-sm text-lorcana-gold hover:text-lorcana-navy hover:underline transition-colors"
          >
            <User size={14} />
            <span>{authorDisplayName || deck.authorEmail || 'Unknown Author'}</span>
          </button>
        </div>
      )}

      {deck.description && (
        <p className={`text-lorcana-navy mb-4 ${compact ? 'text-sm' : ''}`}>{deck.description}</p>
      )}

      <div className={`flex flex-wrap items-center gap-${compact ? '3' : '4'} text-sm text-lorcana-purple`}>
        <div className="flex items-center space-x-1">
          <span className="font-medium">Cards:</span>
          <span className={`font-semibold ${
            totalCards === DECK_RULES.MAX_CARDS ? 'text-green-600' :
            totalCards > DECK_RULES.MAX_CARDS ? 'text-red-600' : 'text-lorcana-navy'
          }`}>
            {totalCards}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="font-medium">Valid:</span>
          <span className={`font-semibold ${summary.isValid ? 'text-green-600' : 'text-red-600'}`}>
            {summary.isValid ? 'Yes' : 'No'}
          </span>
        </div>
        <div className={compact ? 'w-full' : ''}>
          <span className="font-medium">Last Updated:</span>
          <span className="ml-1">{formatDate(summary.updatedAt)}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mb-6">
      {/* Mobile: Stack buttons vertically */}
      <div className="sm:hidden flex flex-col gap-3 mb-4">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-lorcana-navy hover:text-lorcana-ink transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to {userId ? 'My Decks' : 'Published Decks'}</span>
        </button>
        <ActionButtons stacked />
      </div>

      {/* Desktop: Keep horizontal layout */}
      <div className="hidden sm:flex items-center justify-between mb-4">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-lorcana-navy hover:text-lorcana-ink transition-colors"
        >
          <ArrowLeft size={20} />
          <span>Back to {userId ? 'My Decks' : 'Published Decks'}</span>
        </button>
        <ActionButtons />
      </div>

      <div className="card-lorcana p-4 sm:p-6 art-deco-corner">
        {/* Mobile Layout */}
        <div className="sm:hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <Avatar size="sm" />
              </div>
              <InkColors />
            </div>
          </div>
          <DeckInfo compact />
        </div>

        {/* Desktop Layout */}
        <div className="hidden sm:flex items-start justify-between">
          <div className="flex-shrink-0 mr-6">
            <Avatar size="lg" />
          </div>
          <div className="flex-1">
            <DeckInfo />
          </div>
          <div className="ml-6">
            <InkColors />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeckHeader;
