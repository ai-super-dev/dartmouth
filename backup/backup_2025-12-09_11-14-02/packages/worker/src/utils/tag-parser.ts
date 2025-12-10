/**
 * Parse #keyword syntax from text
 * Example: "This is a message #james-scott #artwork-issue about something"
 * Returns: { tags: ["james-scott", "artwork-issue"], cleanedText: "This is a message about something" }
 */
export function parseTagsFromText(text: string): { tags: string[]; cleanedText: string } {
  // Match #keyword (alphanumeric, hyphens, underscores)
  // But NOT ticket numbers like #123
  // More strict: must start with letter, then letters/numbers/hyphens/underscores (no trailing spaces)
  const tagRegex = /#([a-zA-Z][a-zA-Z0-9\-_]+)/g;
  const tags: string[] = [];
  let match;

  while ((match = tagRegex.exec(text)) !== null) {
    const tag = match[1].trim();
    if (tag && tag.length > 0) {
      tags.push(tag);
    }
  }

  // Remove #keywords from the text (but keep ticket numbers like #123)
  // Use word boundary to avoid removing partial matches
  const cleanedText = text.replace(/#[a-zA-Z][a-zA-Z0-9\-_]+/g, '').replace(/\s+/g, ' ').trim();

  return { tags, cleanedText };
}

/**
 * Format tags as comma-separated string for database storage
 */
export function formatTagsForStorage(tags: string[]): string {
  // Filter out empty strings and trim each tag
  const cleanTags = tags
    .map(t => t.trim())
    .filter(t => t.length > 0);
  
  return cleanTags.length > 0 ? cleanTags.join(', ') : '';
}

