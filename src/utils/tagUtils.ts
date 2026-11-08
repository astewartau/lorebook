/**
 * Normalize a tag string:
 * - Force lowercase
 * - Replace spaces with dashes (but preserve colons for categories)
 * - Replace underscores with dashes
 * - Collapse multiple dashes into one
 * - Remove anything that isn't alphanumeric, dash, or colon
 * - Trim leading/trailing dashes
 * - Max 40 characters
 */
export function normalizeTag(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/[^a-z0-9:-]/g, '')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/**
 * Parse a comma/Enter-separated input into an array of normalized, deduplicated tags.
 */
export function parseTags(input: string): string[] {
  const tags = input
    .split(/[,\n]/)
    .map(t => normalizeTag(t.trim()))
    .filter(t => t.length > 0);
  return tags.filter((tag, index) => tags.indexOf(tag) === index);
}

/**
 * Known tag categories with display labels and color schemes.
 * Tags use the format "category:value" (e.g., "franchise:frozen", "class:aggro").
 */
const TAG_CATEGORIES: Record<string, { label: string }> = {
  franchise: { label: 'Franchise' },
  class: { label: 'Class' },
  format: { label: 'Format' },
  archetype: { label: 'Archetype' },
  color: { label: 'Color' },
};


/** Extract the category prefix from a tag, or null if none. */
export function getTagCategory(tag: string): string | null {
  const colonIndex = tag.indexOf(':');
  if (colonIndex <= 0) return null;
  const prefix = tag.slice(0, colonIndex);
  return prefix in TAG_CATEGORIES ? prefix : null;
}

/** Get the display value of a tag (without category prefix if it's a known category). */
export function getTagDisplayName(tag: string): string {
  const category = getTagCategory(tag);
  if (!category) return tag;
  return tag.slice(category.length + 1);
}


/** Get all known category prefixes for autocomplete hints. */
export function getKnownCategories(): string[] {
  return Object.keys(TAG_CATEGORIES);
}

/** Sort tags: categorized tags first (grouped by category), then plain tags. */
export function sortTags(tags: string[]): string[] {
  return [...tags].sort((a, b) => {
    const catA = getTagCategory(a);
    const catB = getTagCategory(b);
    // Both categorized: sort by category then value
    if (catA && catB) {
      if (catA !== catB) return catA.localeCompare(catB);
      return a.localeCompare(b);
    }
    // Categorized before plain
    if (catA) return -1;
    if (catB) return 1;
    return a.localeCompare(b);
  });
}
