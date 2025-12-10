/**
 * Parse #keyword syntax from text
 * Example: "This is a message #james-scott #artwork-issue about something"
 * Returns: { tags: ["james-scott", "artwork-issue"], cleanedText: "This is a message about something" }
 */
export function parseTagsFromText(text: string): { tags: string[]; cleanedText: string } {
  // Match #keyword (alphanumeric, hyphens, underscores, spaces between words)
  // But NOT ticket numbers like #123
  const tagRegex = /#([a-zA-Z][a-zA-Z0-9\-_\s]*)/g;
  const tags: string[] = [];
  let match;

  while ((match = tagRegex.exec(text)) !== null) {
    const tag = match[1].trim();
    if (tag) {
      tags.push(tag);
    }
  }

  // Remove #keywords from the text (but keep ticket numbers like #123)
  const cleanedText = text.replace(/#([a-zA-Z][a-zA-Z0-9\-_\s]*)/g, '').trim();

  return { tags, cleanedText };
}

/**
 * Format tags as comma-separated string for database storage
 */
export function formatTagsForStorage(tags: string[]): string {
  return tags.join(', ');
}

/**
 * Parse tags from database storage (comma-separated) to array
 */
export function parseTagsFromStorage(tagsString: string | null | undefined): string[] {
  if (!tagsString) return [];
  return tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0);
}

// Note: renderTextWithTags removed - use parseTagsFromStorage and render in component instead

/**
 * Helper text for users about tag syntax
 */
export const TAG_HELP_TEXT = 'Use #keyword to add tags (e.g., #james-scott, #artwork-issue)';

