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

/**
 * Parse tags from database storage (comma-separated) to array
 */
export function parseTagsFromStorage(tagsString: string | null | undefined): string[] {
  if (!tagsString) return [];
  return tagsString.split(',').map(t => t.trim()).filter(t => t.length > 0);
}

/**
 * Render text with clickable tag badges
 * This is for display purposes - shows @tag {keyword} as a badge
 */
export function renderTextWithTags(text: string, onTagClick?: (tag: string) => void): (string | JSX.Element)[] {
  const tagRegex = /@tag\s*\{([^}]+)\}/gi;
  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match;

  while ((match = tagRegex.exec(text)) !== null) {
    const tag = match[1].trim();
    const startIndex = match.index;
    const endIndex = tagRegex.lastIndex;

    // Add preceding text
    if (startIndex > lastIndex) {
      parts.push(text.substring(lastIndex, startIndex));
    }

    // Add clickable tag badge
    parts.push(
      <span
        key={`tag-${startIndex}`}
        onClick={() => onTagClick?.(tag)}
        className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-sm rounded cursor-pointer hover:bg-blue-200 transition-colors"
      >
        <span className="text-xs">#</span>
        {tag}
      </span>
    );

    lastIndex = endIndex;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

/**
 * Helper text for users about tag syntax
 */
export const TAG_HELP_TEXT = 'Use @tag {keyword} to add tags (e.g., @tag {James Scott}, @tag {Product Issue})';

