import React, { memo, useMemo } from 'react';
import { MoreHorizontal, Edit, Eye, Copy, Trash2, Globe, GlobeLock } from 'lucide-react';
import { Deck, DeckSummary, LorcanaCard } from '../../types';
import { COLOR_ICONS } from '../../constants/icons';
import { toLookup } from '../../utils/deckValidation';
import { TagPills } from '../deck/TagPill';
import AvatarImage from '../AvatarImage';

function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

interface DeckTableRowProps {
  deck: Deck;
  summary: DeckSummary | null;
  allCards: LorcanaCard[];
  isMyDeck: boolean;
  authorName?: string;
  onView: () => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onPublish?: () => void;
  onUnpublish?: () => void;
}

const DeckTableRow = memo<DeckTableRowProps>(({
  deck,
  summary,
  allCards,
  isMyDeck,
  authorName,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onPublish,
  onUnpublish,
}) => {
  const [showActions, setShowActions] = React.useState(false);

  const inkColors = useMemo(() => {
    if (summary) {
      return Object.entries(summary.inkDistribution).filter(([, count]) => count > 0).sort(([, a], [, b]) => b - a);
    }
    // Compute from cards directly (for public decks without summary)
    const dist: Record<string, number> = {};
    deck.cards?.forEach(entry => {
      const card = allCards.find(c => c.id === entry.cardId);
      if (!card?.color) return;
      const colors = card.color.includes('-') ? card.color.split('-') : [card.color];
      colors.forEach(color => {
        dist[color] = (dist[color] || 0) + entry.quantity;
      });
    });
    return Object.entries(dist).filter(([, count]) => count > 0).sort(([, a], [, b]) => b - a);
  }, [summary, deck.cards, allCards]);

  const cardCount = summary?.cardCount ?? deck.cards.reduce((s, c) => s + c.quantity, 0);

  // Determine format by checking if all cards are core-legal
  const lookup = toLookup(allCards);
  const isCoreLegal = deck.cards.every(entry => lookup.get(entry.cardId)?.legal.core ?? false);

  return (
    <tr
      onClick={onView}
      className="border-b border-lorcana-gold/20 hover:bg-lorcana-cream/50 cursor-pointer transition-colors group"
    >
      {/* Avatar + Colors */}
      <td className="py-1.5 px-2 sm:px-3">
        <div className="flex items-center gap-2">
          {deck.avatar ? (
            <AvatarImage
              cardId={deck.avatar.cardId}
              cropData={deck.avatar.cropData}
              className="w-8 h-8 rounded-md flex-shrink-0"
            />
          ) : (
            <img src="/imgs/lorebook-icon-profile.png" alt="Default Avatar" className="w-8 h-8 rounded-md flex-shrink-0 object-cover" />
          )}
          <div className="flex gap-0.5">
            {inkColors.map(([color]) => (
              COLOR_ICONS[color] ? (
                <img key={color} src={COLOR_ICONS[color]} alt={color} className="w-5 h-5" title={color} />
              ) : null
            ))}
          </div>
        </div>
      </td>

      {/* Name */}
      <td className="py-2 px-2 sm:px-3">
        <div className="font-medium text-lorcana-ink truncate max-w-[200px] sm:max-w-none">
          {deck.name}
        </div>
        {!isMyDeck && authorName && (
          <div className="text-xs text-lorcana-navy truncate">{authorName}</div>
        )}
      </td>

      {/* Card Count */}
      <td className="py-2 px-2 sm:px-3 text-center">
        <span className={`text-sm font-medium ${cardCount < 60 ? 'text-red-500' : 'text-lorcana-navy'}`}>
          {cardCount}
        </span>
      </td>

      {/* Format - hidden on mobile */}
      <td className="py-2 px-2 sm:px-3 hidden sm:table-cell">
        <span className={`text-xs px-2 py-0.5 rounded-full ${
          isCoreLegal
            ? 'bg-lorcana-gold/20 text-lorcana-ink'
            : 'bg-lorcana-navy/10 text-lorcana-navy'
        }`}>
          {isCoreLegal ? 'Core' : 'Infinity'}
        </span>
      </td>

      {/* Tags - hidden on small */}
      <td className="py-2 px-2 sm:px-3 hidden md:table-cell">
        {deck.tags && deck.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap max-w-[200px]">
            <TagPills tags={deck.tags.slice(0, 3)} />
            {deck.tags.length > 3 && (
              <span className="text-xs text-lorcana-navy">+{deck.tags.length - 3}</span>
            )}
          </div>
        )}
      </td>

      {/* Updated - hidden on small */}
      <td className="py-2 px-2 sm:px-3 hidden lg:table-cell text-xs text-lorcana-navy whitespace-nowrap">
        {formatRelativeTime(deck.updatedAt)}
      </td>

      {/* Actions */}
      {isMyDeck && (
        <td className="py-2 px-2 sm:px-3 text-right relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowActions(!showActions);
            }}
            className="p-1 rounded hover:bg-lorcana-cream transition-colors text-lorcana-navy"
          >
            <MoreHorizontal size={16} />
          </button>
          {showActions && (
            <>
              <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setShowActions(false); }} />
              <div className="absolute right-0 top-full z-20 bg-white border-2 border-lorcana-gold rounded-lg shadow-lg py-1 min-w-[140px]">
                <button onClick={(e) => { e.stopPropagation(); setShowActions(false); onView(); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-lorcana-cream flex items-center gap-2">
                  <Eye size={14} /> View
                </button>
                {onEdit && (
                  <button onClick={(e) => { e.stopPropagation(); setShowActions(false); onEdit(); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-lorcana-cream flex items-center gap-2">
                    <Edit size={14} /> Edit
                  </button>
                )}
                {onDuplicate && (
                  <button onClick={(e) => { e.stopPropagation(); setShowActions(false); onDuplicate(); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-lorcana-cream flex items-center gap-2">
                    <Copy size={14} /> Duplicate
                  </button>
                )}
                {onPublish && !deck.isPublic && (
                  <button onClick={(e) => { e.stopPropagation(); setShowActions(false); onPublish(); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-lorcana-cream flex items-center gap-2">
                    <Globe size={14} /> Publish
                  </button>
                )}
                {onUnpublish && deck.isPublic && (
                  <button onClick={(e) => { e.stopPropagation(); setShowActions(false); onUnpublish(); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-lorcana-cream flex items-center gap-2">
                    <GlobeLock size={14} /> Unpublish
                  </button>
                )}
                {onDelete && (
                  <button onClick={(e) => { e.stopPropagation(); setShowActions(false); onDelete(); }} className="w-full text-left px-3 py-1.5 text-sm hover:bg-lorcana-cream text-red-500 flex items-center gap-2">
                    <Trash2 size={14} /> Delete
                  </button>
                )}
              </div>
            </>
          )}
        </td>
      )}
    </tr>
  );
});

DeckTableRow.displayName = 'DeckTableRow';

interface DeckTableViewProps {
  decks: Deck[];
  allCards: LorcanaCard[];
  isMyDeck: boolean;
  getDeckSummary: (deckId: string) => DeckSummary | null;
  deckProfiles?: Record<string, string>;
  onView: (deckId: string) => void;
  onEdit?: (deckId: string) => void;
  onDuplicate?: (deckId: string) => void;
  onDelete?: (deckId: string) => void;
  onPublish?: (deckId: string) => void;
  onUnpublish?: (deckId: string) => void;
}

const DeckTableView: React.FC<DeckTableViewProps> = ({
  decks,
  allCards,
  isMyDeck,
  getDeckSummary,
  deckProfiles,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
  onPublish,
  onUnpublish,
}) => {
  if (decks.length === 0) return null;

  return (
    <div className="card-lorcana overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-lorcana-gold/40 text-left text-xs text-lorcana-navy uppercase tracking-wide">
            <th className="py-2 px-2 sm:px-3 w-28">Deck</th>
            <th className="py-2 px-2 sm:px-3">Name</th>
            <th className="py-2 px-2 sm:px-3 text-center w-16">Cards</th>
            <th className="py-2 px-2 sm:px-3 hidden sm:table-cell w-20">Format</th>
            <th className="py-2 px-2 sm:px-3 hidden md:table-cell">Tags</th>
            <th className="py-2 px-2 sm:px-3 hidden lg:table-cell w-20">Updated</th>
            {isMyDeck && <th className="py-2 px-2 sm:px-3 w-10"></th>}
          </tr>
        </thead>
        <tbody>
          {decks.map(deck => (
            <DeckTableRow
              key={deck.id}
              deck={deck}
              summary={isMyDeck ? getDeckSummary(deck.id) : null}
              allCards={allCards}
              isMyDeck={isMyDeck}
              authorName={!isMyDeck ? (deckProfiles?.[deck.userId!] || deck.ownerName || 'Unknown') : undefined}
              onView={() => onView(deck.id)}
              onEdit={onEdit ? () => onEdit(deck.id) : undefined}
              onDuplicate={onDuplicate ? () => onDuplicate(deck.id) : undefined}
              onDelete={onDelete ? () => onDelete(deck.id) : undefined}
              onPublish={onPublish ? () => onPublish(deck.id) : undefined}
              onUnpublish={onUnpublish ? () => onUnpublish(deck.id) : undefined}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default DeckTableView;
