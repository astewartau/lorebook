import { memo } from 'react';
import { Link } from 'react-router-dom';
import { Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import type { Deck } from '../../types';
import { useCardData } from '../../contexts/CardDataContext';
import { Menu, MenuItem, MenuSeparator } from '../../ui/Menu';
import { checkDeck, deckInks, relativeDate, totalCards } from './deckLogic';
import { DeckArt, InkRow, StatusBadge, TagList, VisibilityBadge } from './DeckBits';

interface Props {
  deck: Deck;
  /** Show the author (public decks) instead of public/private. */
  showAuthor?: boolean;
  onTag?: (tag: string) => void;
  onEdit?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  eager?: boolean;
}

function DeckTileImpl({ deck, showAuthor, onTag, onEdit, onDuplicate, onDelete, eager }: Props) {
  const { cardsById } = useCardData();
  const inks = deckInks(deck.cards, cardsById);
  const check = checkDeck(deck, cardsById);
  const count = totalCards(deck.cards);
  const hasMenu = onEdit || onDuplicate || onDelete;

  return (
    <article className="group relative panel overflow-hidden flex flex-col shadow-card hover:shadow-pop hover:border-accent-fill/50 transition-shadow">
      <DeckArt deck={deck} eager={eager} className="aspect-[16/9] border-b border-line" />
      <div className="flex-1 flex flex-col gap-2 p-3.5 pt-3">
        <div className="flex items-start gap-2">
          <h3 className="flex-1 min-w-0 font-display text-lg font-semibold leading-snug">
            <Link to={`/decks/${deck.id}`} className="line-clamp-2 break-words after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
              {deck.name}
            </Link>
          </h3>
          {hasMenu && (
            <div className="relative z-10 -mr-1.5 -mt-1">
              <Menu label={`Actions for ${deck.name}`} triggerClassName="icon-btn h-9 w-9" trigger={<MoreHorizontal size={18} />}>
                {close => (
                  <>
                    {onEdit && <MenuItem onClick={() => { close(); onEdit(); }}><Pencil size={16} /> Edit cards</MenuItem>}
                    {onDuplicate && <MenuItem onClick={() => { close(); onDuplicate(); }}><Copy size={16} /> Duplicate</MenuItem>}
                    {onDelete && <><MenuSeparator /><MenuItem danger onClick={() => { close(); onDelete(); }}><Trash2 size={16} /> Delete</MenuItem></>}
                  </>
                )}
              </Menu>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <InkRow inks={inks} size={20} />
          <span className="text-sm text-muted tabular-nums">{count} card{count === 1 ? '' : 's'}</span>
          <StatusBadge check={check} className="ml-auto" />
        </div>
        {deck.tags && deck.tags.length > 0 && (
          <div className="relative z-10 w-fit max-w-full">
            <TagList tags={deck.tags} max={3} onTag={onTag} />
          </div>
        )}
        <div className="mt-auto pt-1 flex items-center gap-2 text-xs text-muted">
          {showAuthor ? (
            <Link to={`/u/${deck.userId}`} className="relative z-10 truncate hover:text-accent hover:underline">by {deck.ownerName ?? 'Unknown'}</Link>
          ) : <VisibilityBadge isPublic={deck.isPublic} />}
          <span aria-hidden>·</span>
          <time dateTime={deck.updatedAt.toISOString()} title={deck.updatedAt.toLocaleString()} className="whitespace-nowrap">Updated {relativeDate(deck.updatedAt)}</time>
        </div>
      </div>
    </article>
  );
}

export const DeckTile = memo(DeckTileImpl);

export function DeckGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 grid-cols-1 min-[480px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">{children}</div>;
}
