import { LorcanaCard } from '../types';

// Parse search query into tokens
export interface SearchToken {
  type: 'field' | 'text';
  field?: string;
  value: string;
  operator?: string; // For field searches: ':', '>', '<', '>=', '<=', '!='
}

// Parse GitHub-style search query
export const parseSearchQuery = (query: string): SearchToken[] => {
  const tokens: SearchToken[] = [];
  
  if (!query.trim()) {
    return tokens;
  }
  
  // Split by spaces but preserve quoted strings
  const parts = query.match(/(?:[^\s"]+|"[^"]*")+/g) || [];
  
  for (const part of parts) {
    // Check if this is a field search (field:value, field>value, etc.)
    const fieldMatch = part.match(/^([a-zA-Z]+)([:><=!]+)(.+)$/);
    
    if (fieldMatch) {
      const [, field, operator, value] = fieldMatch;
      // Only create field token if there's actually a meaningful value
      // Require at least 2 characters OR quoted strings OR numbers
      const trimmedValue = value.trim();
      const isQuoted = trimmedValue.startsWith('"') && trimmedValue.endsWith('"');
      const isNumber = /^\d+$/.test(trimmedValue);
      const isBoolean = /^(true|false|yes|no)$/i.test(trimmedValue);
      
      if (trimmedValue && (trimmedValue.length >= 2 || isQuoted || isNumber || isBoolean)) {
        tokens.push({
          type: 'field',
          field: field.toLowerCase(),
          operator: operator,
          value: value.replace(/^"|"$/g, '') // Remove quotes
        });
      } else {
        // Treat as regular text if value is too short or incomplete
        tokens.push({
          type: 'text',
          value: part
        });
      }
    } else {
      // Regular text search
      tokens.push({
        type: 'text',
        value: part.replace(/^"|"$/g, '') // Remove quotes
      });
    }
  }
  
  return tokens;
};

// Normalize text for comparison
const normalizeText = (text: string): string => {
  return text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
};

// Check if card matches field search
const rawFieldValue = (card: LorcanaCard, field: string): string | number | boolean | undefined => {
  let cardValue: any;
  
  // Get card field value
  switch (field) {
    case 'name':
      cardValue = card.name;
      break;
    case 'type':
      cardValue = card.type;
      break;
    case 'story':
    case 'franchise':
      cardValue = card.story || '';
      break;
    case 'color':
    case 'ink':
      cardValue = card.color;
      break;
    case 'rarity':
      cardValue = card.rarity;
      break;
    case 'set':
      cardValue = card.setCode;
      break;
    case 'version':
      cardValue = card.version || '';
      break;
    case 'cost':
      cardValue = card.cost;
      break;
    case 'strength':
      cardValue = card.strength;
      break;
    case 'willpower':
      cardValue = card.willpower;
      break;
    case 'lore':
      cardValue = card.lore;
      break;
    case 'inkwell':
    case 'inkable':
      cardValue = card.inkwell;
      break;
    case 'subtype':
    case 'subtypes':
      cardValue = (card.subtypes || []).join(' ');
      break;
    case 'ability':
    case 'abilities': {
      // Search through all ability text, names, and keywords
      const abilityTexts: string[] = [];
      
      // Add ability names and effect text
      if (card.abilities && Array.isArray(card.abilities)) {
        card.abilities.forEach((ability: any) => {
          if (ability.name) abilityTexts.push(ability.name);
          if (ability.effect) abilityTexts.push(ability.effect);
          if (ability.fullText) abilityTexts.push(ability.fullText);
          if (ability.keyword) abilityTexts.push(ability.keyword);
          if (ability.reminderText) abilityTexts.push(ability.reminderText);
        });
      }
      
      // Add keyword abilities if they exist (some cards have this separate array)
      if ((card as any).keywordAbilities && Array.isArray((card as any).keywordAbilities)) {
        abilityTexts.push(...(card as any).keywordAbilities);
      }
      
      // Also check fullText field which contains all card text
      if ((card as any).fullText) {
        abilityTexts.push((card as any).fullText);
      }
      
      cardValue = abilityTexts.join(' ');
      break;
    }
    default:
      return undefined;
  }
  return cardValue;
};

// Searches run over every card on each keystroke, so each card's normalised
// text is computed once and kept.
const normalizedCache = new WeakMap<LorcanaCard, Map<string, string>>();

const normalizedField = (card: LorcanaCard, key: string, compute: () => string): string => {
  let m = normalizedCache.get(card);
  if (!m) {
    m = new Map();
    normalizedCache.set(card, m);
  }
  let v = m.get(key);
  if (v === undefined) {
    v = normalizeText(compute());
    m.set(key, v);
  }
  return v;
};

const KNOWN_FIELDS = new Set([
  'name', 'type', 'story', 'franchise', 'color', 'ink', 'rarity', 'set', 'version', 'cost', 'strength',
  'willpower', 'lore', 'inkwell', 'inkable', 'subtype', 'subtypes', 'ability', 'abilities',
]);

const matchesFieldSearch = (card: LorcanaCard, field: string, operator: string, value: string, valueNorm: string): boolean => {
  if (!KNOWN_FIELDS.has(field)) return false;
  const cardValue = rawFieldValue(card, field);
  
  // Handle null/undefined values
  if (cardValue === undefined || cardValue === null) {
    return value.toLowerCase() === 'null' || value.toLowerCase() === 'none';
  }
  
  const text = typeof cardValue === 'string' ? normalizedField(card, 'f:' + field, () => cardValue as string) : '';

  // Apply operator
  switch (operator) {
    case ':': // Contains/equals
      if (typeof cardValue === 'string') {
        return text.includes(valueNorm);
      } else if (typeof cardValue === 'number') {
        return cardValue === parseFloat(value);
      } else if (typeof cardValue === 'boolean') {
        return cardValue === (value.toLowerCase() === 'true' || value.toLowerCase() === 'yes');
      }
      return false;
      
    case '=': // Exact equals
      if (typeof cardValue === 'string') {
        return text === valueNorm;
      } else if (typeof cardValue === 'number') {
        return cardValue === parseFloat(value);
      } else if (typeof cardValue === 'boolean') {
        return cardValue === (value.toLowerCase() === 'true');
      }
      return false;
      
    case '>':
      return typeof cardValue === 'number' && cardValue > parseFloat(value);
      
    case '<':
      return typeof cardValue === 'number' && cardValue < parseFloat(value);
      
    case '>=':
      return typeof cardValue === 'number' && cardValue >= parseFloat(value);
      
    case '<=':
      return typeof cardValue === 'number' && cardValue <= parseFloat(value);
      
    case '!=':
    case '!:':
      if (typeof cardValue === 'string') {
        return !text.includes(valueNorm);
      } else if (typeof cardValue === 'number') {
        return cardValue !== parseFloat(value);
      } else if (typeof cardValue === 'boolean') {
        return cardValue !== (value.toLowerCase() === 'true');
      }
      return true;
      
    default:
      return false;
  }
};

// Everything plain words are matched against.
const searchableText = (card: LorcanaCard): string => {
  const parts: string[] = [
    card.name, card.version || '', card.story || '', card.type, card.rarity, card.color, ...(card.subtypes || []),
  ];
  for (const ability of card.abilities ?? []) {
    if (ability.name) parts.push(ability.name);
    if (ability.effect) parts.push(ability.effect);
    if (ability.keyword) parts.push(ability.keyword);
  }
  parts.push(...(card.keywordAbilities ?? []));
  if (card.fullText) parts.push(card.fullText);
  return parts.join(' ');
};

const matchesTextSearch = (card: LorcanaCard, normalizedTokens: string[]): boolean => {
  if (normalizedTokens.length === 0) return true;
  const content = normalizedField(card, 'text', () => searchableText(card));
  return normalizedTokens.every(token => content.includes(token));
};

interface CompiledQuery {
  fields: { field: string; operator: string; value: string; valueNorm: string }[];
  text: string[];
}

// The same query is matched against every card, so parse it once.
let lastQuery: string | null = null;
let lastCompiled: CompiledQuery = { fields: [], text: [] };

const compileQuery = (query: string): CompiledQuery => {
  if (query === lastQuery) return lastCompiled;
  const tokens = parseSearchQuery(query);
  lastCompiled = {
    fields: tokens.filter(t => t.type === 'field').map(t => ({
      field: t.field!, operator: t.operator || ':', value: t.value, valueNorm: normalizeText(t.value),
    })),
    text: tokens.filter(t => t.type === 'text').map(t => normalizeText(t.value)).filter(Boolean),
  };
  lastQuery = query;
  return lastCompiled;
};

// Main search function
export const matchesSmartSearch = (card: LorcanaCard, searchQuery: string): boolean => {
  if (!searchQuery.trim()) return true;
  const q = compileQuery(searchQuery);
  for (const f of q.fields) {
    if (!matchesFieldSearch(card, f.field, f.operator, f.value, f.valueNorm)) return false;
  }
  return matchesTextSearch(card, q.text);
};
