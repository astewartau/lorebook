import React, { useMemo, useCallback, memo } from 'react';
import { Plus, Minus } from 'lucide-react';
import { LorcanaCard } from '../../types';
import { useCollection } from '../../contexts/CollectionContext';
import { useAuth } from '../../contexts/AuthContext';
import { canHaveNormal } from '../../utils/cardDataUtils';

interface CardListViewProps {
  cards: LorcanaCard[];
  onQuantityChange: (card: LorcanaCard, normalChange: number, foilChange: number) => void;
  staleCardIds: Set<number>;
  rarityIconMap: Record<string, string>;
  colorIconMap: Record<string, string>;
  sets: Array<{code: string; name: string; number: number}>;
  onCardClick?: (card: LorcanaCard) => void;
}

interface CardRowProps {
  card: LorcanaCard;
  setNumber: number;
  quantities: { normal: number; foil: number; total: number };
  isStale: boolean;
  isLoggedIn: boolean;
  rarityIconMap: Record<string, string>;
  colorIconMap: Record<string, string>;
  onQuantityChange: (card: LorcanaCard, normalChange: number, foilChange: number) => void;
  onCardClick?: (card: LorcanaCard) => void;
}

// Memoized card row component - only re-renders when its specific props change
const CardRow = memo<CardRowProps>(({
  card,
  setNumber,
  quantities,
  isStale,
  isLoggedIn,
  rarityIconMap,
  colorIconMap,
  onQuantityChange,
  onCardClick
}) => {
  const handleClick = useCallback(() => {
    onCardClick?.(card);
  }, [onCardClick, card]);

  const handleNormalDecrement = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onQuantityChange(card, -1, 0);
  }, [onQuantityChange, card]);

  const handleNormalIncrement = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onQuantityChange(card, 1, 0);
  }, [onQuantityChange, card]);

  const handleFoilDecrement = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onQuantityChange(card, 0, -1);
  }, [onQuantityChange, card]);

  const handleFoilIncrement = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onQuantityChange(card, 0, 1);
  }, [onQuantityChange, card]);

  const stopPropagation = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      className={`
        group cursor-pointer transition-colors
        ${isStale ? 'bg-yellow-50' : 'bg-white hover:bg-lorcana-cream/50'}
      `}
      onClick={handleClick}
    >
      {/* Desktop layout */}
      <div className={`hidden md:grid gap-2 px-3 py-2 items-center ${isLoggedIn ? 'md:grid-cols-[60px_60px_40px_50px_40px_40px_1fr_80px_80px]' : 'md:grid-cols-[60px_60px_40px_50px_40px_40px_1fr]'}`}>
        {/* Set Number */}
        <div className="text-center text-sm text-lorcana-ink/70">
          {setNumber || '-'}
        </div>

        {/* Card Number */}
        <div className="text-center text-sm text-lorcana-ink/70">
          {card.number}
        </div>

        {/* Rarity Icon */}
        <div className="flex justify-center">
          {rarityIconMap[card.rarity] ? (
            <img
              src={rarityIconMap[card.rarity]}
              alt={card.rarity}
              title={card.rarity}
              className="w-5 h-5 object-contain"
            />
          ) : (
            <span className="text-xs text-lorcana-ink/50">{card.rarity[0]}</span>
          )}
        </div>

        {/* Ink Color(s) */}
        <div className="flex justify-center gap-0.5">
          {colorIconMap[card.color] ? (
            <img
              src={colorIconMap[card.color]}
              alt={card.color}
              title={card.color}
              className="w-5 h-5 object-contain"
            />
          ) : (
            <span className="text-xs text-lorcana-ink/50">-</span>
          )}
        </div>

        {/* Ink Cost */}
        <div className="text-center text-sm font-medium text-lorcana-ink">
          {card.cost}
        </div>

        {/* Inkability */}
        <div className="flex justify-center" title={card.inkwell ? "Inkable" : "Not Inkable"}>
          <img
            src={card.inkwell ? "/imgs/inkable.png" : "/imgs/uninkable.png"}
            alt={card.inkwell ? "Inkable" : "Not Inkable"}
            className="w-5 h-5 object-contain"
          />
        </div>

        {/* Name and Version */}
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-medium text-lorcana-ink truncate">
              {card.name}
            </span>
            {card.version && (
              <span className="text-sm text-lorcana-ink/60 truncate">
                - {card.version}
              </span>
            )}
            {isStale && (
              <span className="text-xs text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded" title="Syncing...">
                •
              </span>
            )}
          </div>
        </div>

        {/* Normal Quantity Controls */}
        {isLoggedIn && (
          canHaveNormal(card.rarity) ? (
            <div className="flex items-center justify-center gap-1" onClick={stopPropagation}>
              <button
                onClick={handleNormalDecrement}
                disabled={quantities.normal <= 0}
                className="w-6 h-6 flex items-center justify-center text-red-600 hover:text-red-800 hover:bg-red-100 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors rounded"
                aria-label={`Remove normal copy of ${card.name}`}
              >
                <Minus size={14} />
              </button>
              <span className="w-6 text-center text-sm font-medium text-lorcana-ink">
                {quantities.normal}
              </span>
              <button
                onClick={handleNormalIncrement}
                className="w-6 h-6 flex items-center justify-center text-green-600 hover:text-green-800 hover:bg-green-100 transition-colors rounded"
                aria-label={`Add normal copy of ${card.name}`}
              >
                <Plus size={14} />
              </button>
            </div>
          ) : (
            <div className="text-center text-sm text-lorcana-ink/30">—</div>
          )
        )}

        {/* Foil Quantity Controls */}
        {isLoggedIn && (
          <div className="flex items-center justify-center gap-1" onClick={stopPropagation}>
            <button
              onClick={handleFoilDecrement}
              disabled={quantities.foil <= 0}
              className="w-6 h-6 flex items-center justify-center text-red-600 hover:text-red-800 hover:bg-red-100 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors rounded"
              aria-label={`Remove foil copy of ${card.name}`}
            >
              <Minus size={14} />
            </button>
            <span className="w-6 text-center text-sm font-medium text-purple-700">
              {quantities.foil}
            </span>
            <button
              onClick={handleFoilIncrement}
              className="w-6 h-6 flex items-center justify-center text-green-600 hover:text-green-800 hover:bg-green-100 transition-colors rounded"
              aria-label={`Add foil copy of ${card.name}`}
            >
              <Plus size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Mobile layout */}
      <div className="md:hidden px-3 py-3">
        <div className="flex items-start gap-3">
          {/* Card info */}
          <div className="flex-1 min-w-0">
            {/* Name row */}
            <div className="flex items-center gap-2">
              <span className="font-medium text-lorcana-ink truncate">
                {card.name}
              </span>
              {isStale && (
                <span className="text-xs text-yellow-600 bg-yellow-100 px-1.5 py-0.5 rounded">
                  •
                </span>
              )}
            </div>
            {card.version && (
              <div className="text-sm text-lorcana-ink/60 truncate">
                {card.version}
              </div>
            )}
            {/* Meta row */}
            <div className="flex items-center gap-3 mt-1 text-sm text-lorcana-ink/70">
              <span>S{setNumber}/{card.number}</span>
              {rarityIconMap[card.rarity] && (
                <img
                  src={rarityIconMap[card.rarity]}
                  alt={card.rarity}
                  className="w-4 h-4 object-contain"
                />
              )}
              {colorIconMap[card.color] && (
                <img
                  src={colorIconMap[card.color]}
                  alt={card.color}
                  className="w-4 h-4 object-contain"
                />
              )}
              <span className="font-medium">{card.cost}⬡</span>
              <img
                src={card.inkwell ? "/imgs/inkable.png" : "/imgs/uninkable.png"}
                alt={card.inkwell ? "Inkable" : "Not Inkable"}
                className="w-4 h-4 object-contain"
              />
            </div>
          </div>

          {/* Quantity controls */}
          {isLoggedIn && (
            <div className="flex flex-col gap-1" onClick={stopPropagation}>
              {/* Normal - only for cards that have normal versions */}
              {canHaveNormal(card.rarity) && (
                <div className="flex items-center gap-1 bg-lorcana-cream rounded border border-lorcana-gold px-1 py-0.5">
                  <button
                    onClick={handleNormalDecrement}
                    disabled={quantities.normal <= 0}
                    className="w-6 h-6 flex items-center justify-center text-red-600 disabled:text-gray-300 disabled:cursor-not-allowed"
                    aria-label={`Remove normal copy`}
                  >
                    <Minus size={12} />
                  </button>
                  <span className="w-5 text-center text-xs font-medium">
                    {quantities.normal}
                  </span>
                  <button
                    onClick={handleNormalIncrement}
                    className="w-6 h-6 flex items-center justify-center text-green-600"
                    aria-label={`Add normal copy`}
                  >
                    <Plus size={12} />
                  </button>
                </div>
              )}
              {/* Foil */}
              <div className="flex items-center gap-1 bg-gradient-to-r from-purple-50 via-pink-50 to-blue-50 rounded border border-purple-300 px-1 py-0.5">
                <button
                  onClick={handleFoilDecrement}
                  disabled={quantities.foil <= 0}
                  className="w-6 h-6 flex items-center justify-center text-red-600 disabled:text-gray-300 disabled:cursor-not-allowed"
                  aria-label={`Remove foil copy`}
                >
                  <Minus size={12} />
                </button>
                <span className="w-5 text-center text-xs font-medium text-purple-700">
                  {quantities.foil}
                </span>
                <button
                  onClick={handleFoilIncrement}
                  className="w-6 h-6 flex items-center justify-center text-green-600"
                  aria-label={`Add foil copy`}
                >
                  <Plus size={12} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

CardRow.displayName = 'CardRow';

const CardListView: React.FC<CardListViewProps> = ({
  cards,
  onQuantityChange,
  staleCardIds,
  rarityIconMap,
  colorIconMap,
  sets,
  onCardClick
}) => {
  const { getCardQuantity } = useCollection();
  const { user } = useAuth();
  const isLoggedIn = !!user;

  // Memoize set code to number map for O(1) lookups
  const setNumberMap = useMemo(() => {
    const map = new Map<string, number>();
    sets.forEach(set => map.set(set.code, set.number));
    return map;
  }, [sets]);

  // Pre-compute all card data to avoid repeated lookups during render
  const cardData = useMemo(() => {
    return cards.map(card => ({
      card,
      setNumber: setNumberMap.get(card.setCode) ?? 0,
      quantities: getCardQuantity(card.id),
      isStale: staleCardIds.has(card.id)
    }));
  }, [cards, setNumberMap, getCardQuantity, staleCardIds]);

  // Split cards into columns for wider screens
  const columnData = useMemo(() => {
    const columns: typeof cardData[] = [[], []];
    cardData.forEach((data, index) => {
      columns[index % 2].push(data);
    });
    return columns;
  }, [cardData]);

  const renderHeader = useCallback((columnIndex: number) => (
    <div
      key={`header-${columnIndex}`}
      className={`hidden md:grid gap-2 px-3 py-2 bg-lorcana-navy text-lorcana-gold text-sm font-semibold border-b-2 border-lorcana-gold ${columnIndex === 0 ? 'rounded-tl-sm' : ''} ${isLoggedIn ? 'md:grid-cols-[60px_60px_40px_50px_40px_40px_1fr_80px_80px]' : 'md:grid-cols-[60px_60px_40px_50px_40px_40px_1fr]'}`}
    >
      <div className="text-center">Set</div>
      <div className="text-center">#</div>
      <div className="text-center">Rar</div>
      <div className="text-center">Ink</div>
      <div className="text-center">Cost</div>
      <div className="text-center" title="Inkable">Ink?</div>
      <div>Name</div>
      {isLoggedIn && (
        <>
          <div className="text-center">Normal</div>
          <div className="text-center">Foil</div>
        </>
      )}
    </div>
  ), [isLoggedIn]);

  const renderListColumn = useCallback((columnCards: typeof cardData, columnIndex: number) => (
    <div key={columnIndex} className="flex-1 min-w-0">
      {renderHeader(columnIndex)}
      <div className="divide-y divide-lorcana-gold/30">
        {columnCards.map(({ card, setNumber, quantities, isStale }) => (
          <CardRow
            key={card.id}
            card={card}
            setNumber={setNumber}
            quantities={quantities}
            isStale={isStale}
            isLoggedIn={isLoggedIn}
            rarityIconMap={rarityIconMap}
            colorIconMap={colorIconMap}
            onQuantityChange={onQuantityChange}
            onCardClick={onCardClick}
          />
        ))}
      </div>
    </div>
  ), [renderHeader, isLoggedIn, rarityIconMap, colorIconMap, onQuantityChange, onCardClick]);

  if (cards.length === 0) {
    return (
      <div className="text-center py-8 text-lorcana-ink/50">
        No cards to display
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 2 columns on xl+ */}
      <div className="hidden xl:flex xl:gap-4">
        {columnData.map((col, index) => renderListColumn(col, index))}
      </div>

      {/* Single column for smaller screens */}
      <div className="xl:hidden">
        {renderListColumn(cardData, 0)}
      </div>
    </div>
  );
};

export default memo(CardListView);
