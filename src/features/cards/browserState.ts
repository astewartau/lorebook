// The card browser's state lives in the URL, so every view can be shared,
// bookmarked and restored with Back. This module is the only place that
// knows the URL format.

import type { Ink } from '../../types';

export const INKS: Ink[] = ['Amber', 'Amethyst', 'Emerald', 'Ruby', 'Sapphire', 'Steel'];
export const TYPES = ['Character', 'Action', 'Item', 'Location'] as const;
export const RARITIES = ['Common', 'Uncommon', 'Rare', 'Super Rare', 'Legendary', 'Epic', 'Enchanted', 'Iconic', 'Special'] as const;
/** Cost chips; the last one means "this or more". */
export const COSTS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
export const COST_MAX_CHIP = COSTS[COSTS.length - 1];

export type InkMode = 'any' | 'only' | 'dual';
export type Owned = 'any' | 'owned' | 'missing' | 'playset' | 'short';
export type SortField = 'set' | 'name' | 'cost' | 'ink' | 'rarity' | 'type' | 'owned';
export type Group = 'none' | 'set' | 'ink' | 'cost' | 'type' | 'rarity';
export type View = 'grid' | 'list';
export type Mode = 'browse' | 'collect';

export interface BrowserState {
  q: string;
  format: 'core' | 'infinity';
  inks: Ink[];
  inkMode: InkMode;
  costs: number[];
  types: string[];
  rarities: string[];
  sets: string[];
  stories: string[];
  subtypes: string[];
  inkable: 'any' | 'yes' | 'no';
  owned: Owned;
  sort: SortField;
  dir: 'asc' | 'desc';
  group: Group;
  view: View;
  mode: Mode;
}

export const DEFAULT_STATE: BrowserState = {
  q: '',
  format: 'core',
  inks: [],
  inkMode: 'any',
  costs: [],
  types: [],
  rarities: [],
  sets: [],
  stories: [],
  subtypes: [],
  inkable: 'any',
  owned: 'any',
  sort: 'set',
  dir: 'desc',
  group: 'none',
  view: 'grid',
  mode: 'browse',
};

const LISTS = ['inks', 'costs', 'types', 'rarities', 'sets', 'stories', 'subtypes'] as const;
type ListKey = typeof LISTS[number];

// URL parameter names; lists repeat the parameter (?ink=Amber&ink=Steel).
const PARAM: Record<keyof BrowserState, string> = {
  q: 'q', format: 'format', inks: 'ink', inkMode: 'inkMode', costs: 'cost', types: 'type', rarities: 'rarity',
  sets: 'set', stories: 'story', subtypes: 'subtype', inkable: 'inkable', owned: 'owned', sort: 'sort',
  dir: 'dir', group: 'group', view: 'view', mode: 'mode',
};

function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return value !== null && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}

export function parseState(params: URLSearchParams): BrowserState {
  const d = DEFAULT_STATE;
  return {
    q: params.get('q') ?? '',
    format: oneOf(params.get('format'), ['core', 'infinity'], d.format),
    inks: params.getAll('ink').filter((i): i is Ink => (INKS as string[]).includes(i)),
    inkMode: oneOf(params.get('inkMode'), ['any', 'only', 'dual'], d.inkMode),
    costs: params.getAll('cost').map(Number).filter(n => Number.isInteger(n) && n >= 0),
    types: params.getAll('type'),
    rarities: params.getAll('rarity'),
    sets: params.getAll('set'),
    stories: params.getAll('story'),
    subtypes: params.getAll('subtype'),
    inkable: oneOf(params.get('inkable'), ['any', 'yes', 'no'], d.inkable),
    owned: oneOf(params.get('owned'), ['any', 'owned', 'missing', 'playset', 'short'], d.owned),
    sort: oneOf(params.get('sort'), ['set', 'name', 'cost', 'ink', 'rarity', 'type', 'owned'], d.sort),
    dir: oneOf(params.get('dir'), ['asc', 'desc'], d.dir),
    group: oneOf(params.get('group'), ['none', 'set', 'ink', 'cost', 'type', 'rarity'], d.group),
    view: oneOf(params.get('view'), ['grid', 'list'], d.view),
    mode: oneOf(params.get('mode'), ['browse', 'collect'], d.mode),
  };
}

/** Only values that differ from the defaults go into the URL. */
export function serializeState(state: BrowserState): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of Object.keys(PARAM) as (keyof BrowserState)[]) {
    const value = state[key];
    if ((LISTS as readonly string[]).includes(key)) {
      for (const v of value as (string | number)[]) params.append(PARAM[key], String(v));
    } else if (value !== DEFAULT_STATE[key]) {
      params.set(PARAM[key], String(value));
    }
  }
  return params;
}

/** Filters the user set (not search, sort, view or mode). */
export function activeFilterCount(s: BrowserState): number {
  return LISTS.reduce((n, k) => n + (s[k as ListKey] as unknown[]).length, 0)
    + (s.inkable !== 'any' ? 1 : 0)
    + (s.owned !== 'any' ? 1 : 0)
    + (s.inkMode !== 'any' ? 1 : 0);
}

export function clearFilters(s: BrowserState): BrowserState {
  return { ...DEFAULT_STATE, format: s.format, sort: s.sort, dir: s.dir, group: s.group, view: s.view, mode: s.mode };
}

export function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter(v => v !== value) : [...list, value];
}
