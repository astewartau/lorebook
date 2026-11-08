import type { Ink } from '../types';

const RARITY_FILES: Record<string, string> = {
  Common: 'common.svg', Uncommon: 'uncommon.svg', Rare: 'rare.svg', 'Super Rare': 'super_rare.svg',
  Legendary: 'legendary.svg', Epic: 'epic.png', Enchanted: 'enchanted.png', Iconic: 'iconic.png', Special: 'promo.png',
};

export function InkIcon({ ink, size = 20 }: { ink: Ink | string; size?: number }) {
  return <img src={`/imgs/${ink.toLowerCase()}.svg`} alt={ink} title={ink} width={size} height={size} className="inline-block shrink-0" />;
}

/** One icon per ink; dual-ink cards show both. */
export function InkIcons({ color, size = 18 }: { color: string; size?: number }) {
  if (!color) return null;
  return (
    <span className="inline-flex -space-x-1">
      {color.split('-').map(ink => <InkIcon key={ink} ink={ink} size={size} />)}
    </span>
  );
}

export function RarityIcon({ rarity, size = 16 }: { rarity: string; size?: number }) {
  const file = RARITY_FILES[rarity];
  if (!file) return null;
  // The Uncommon icon is white; darken it on light backgrounds.
  const tone = rarity === 'Uncommon' ? 'brightness-0 opacity-60 dark:brightness-100 dark:opacity-100' : '';
  return <img src={`/imgs/${file}`} alt={rarity} title={rarity} width={size} height={size} className={`inline-block shrink-0 object-contain ${tone}`} />;
}

export function InkableIcon({ inkable, size = 16 }: { inkable: boolean; size?: number }) {
  return (
    <img src={`/imgs/${inkable ? 'inkable' : 'uninkable'}.png`} alt={inkable ? 'Inkable' : 'Not inkable'}
      title={inkable ? 'Inkable' : 'Not inkable'} width={size} height={size} className="inline-block shrink-0 object-contain" />
  );
}
