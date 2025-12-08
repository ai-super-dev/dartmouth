/**
 * Parse @tag {keywords} syntax from text
 * Example: "This is a message @tag {James Scott} about something"
 * Returns: { tags: ["James Scott"], cleanedText: "This is a message about something" }
 */
export function parseTagsFromText(text: string): { tags: string[]; cleanedText: string } {
  const tagRegex = /@tag\s*\{([^}]+)\}/gi;
  const tags: string[] = [];
  let match;

  while ((match = tagRegex.exec(text)) !== null) {
    const tag = match[1].trim();
    if (tag) {
      tags.push(tag);
    }
  }

  // Remove @tag {keywords} from the text
  const cleanedText = text.replace(tagRegex, '').trim();

  return { tags, cleanedText };
}

/**
 * Format tags as comma-separated string for database storage
 */
export function formatTagsForStorage(tags: string[]): string {
  return tags.join(', ');
}

