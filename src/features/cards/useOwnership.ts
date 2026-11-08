import { useCallback, useMemo } from 'react';
import { useCardData } from '../../contexts/CardDataContext';
import { useCollection } from '../../contexts/CollectionContext';

/** Owned copies per card id, and per full name across all printings. */
export function useOwnership() {
  const { getCardQuantity, collection } = useCollection();
  const { cardsById } = useCardData();

  const byName = useMemo(() => {
    const m = new Map<string, number>();
    for (const e of collection) {
      const name = cardsById.get(e.cardId)?.fullName;
      if (name) m.set(name, (m.get(name) ?? 0) + e.quantityNormal + e.quantityFoil);
    }
    return m;
  }, [collection, cardsById]);

  const nameQuantity = useCallback((fullName: string) => byName.get(fullName) ?? 0, [byName]);
  return { quantity: getCardQuantity, nameQuantity };
}
