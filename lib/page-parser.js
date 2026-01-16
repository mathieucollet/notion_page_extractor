/**
 * Extracts Notion page ID from various URL formats
 *
 * Supported formats:
 * - https://www.notion.so/workspace/Page-Title-abc123def456...
 * - https://www.notion.so/Page-Title-abc123def456...
 * - https://notion.so/abc123def456...
 * - https://www.notion.so/workspace/abc123def456?v=...
 * - Direct page ID (32 hex chars with or without dashes)
 */

/**
 * Extract page ID from a Notion URL or direct ID
 * @param {string} input - Notion URL or page ID
 * @returns {string|null} - Formatted page ID (with dashes) or null if invalid
 */
export function extractPageId(input) {
  if (!input || typeof input !== 'string') {
    return null;
  }

  input = input.trim();

  // Pattern for 32 hex characters (with or without dashes)
  const uuidWithDashes = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
  const uuidWithoutDashes = /^[a-f0-9]{32}$/i;

  // If it's already a valid UUID format
  if (uuidWithDashes.test(input)) {
    return input.toLowerCase();
  }

  if (uuidWithoutDashes.test(input)) {
    return formatAsUuid(input);
  }

  // Try to extract from URL
  try {
    const url = new URL(input);

    // Check if it's a Notion domain
    if (!url.hostname.includes('notion.so') && !url.hostname.includes('notion.site')) {
      return null;
    }

    // Get the pathname and extract the last segment
    const pathname = url.pathname;
    const segments = pathname.split('/').filter(s => s.length > 0);

    if (segments.length === 0) {
      return null;
    }

    // The page ID is usually in the last segment
    const lastSegment = segments[segments.length - 1];

    // Remove query parameters that might be attached
    const cleanSegment = lastSegment.split('?')[0];

    // Try to find 32 hex chars at the end (after the last dash in title-id format)
    // Format: "Page-Title-abc123def456789..."
    const idMatch = cleanSegment.match(/([a-f0-9]{32})$/i);
    if (idMatch) {
      return formatAsUuid(idMatch[1]);
    }

    // Try UUID with dashes format
    const uuidMatch = cleanSegment.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i);
    if (uuidMatch) {
      return uuidMatch[1].toLowerCase();
    }

    // Check if the segment itself is a valid ID (without title prefix)
    if (uuidWithoutDashes.test(cleanSegment)) {
      return formatAsUuid(cleanSegment);
    }

    return null;
  } catch {
    // Not a valid URL, check if it could be a raw ID with title prefix
    const idMatch = input.match(/([a-f0-9]{32})$/i);
    if (idMatch) {
      return formatAsUuid(idMatch[1]);
    }

    return null;
  }
}

/**
 * Format 32 hex chars as UUID with dashes
 * @param {string} hex - 32 character hex string
 * @returns {string} - Formatted UUID
 */
function formatAsUuid(hex) {
  hex = hex.toLowerCase();
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Check if a URL is a Notion page URL
 * @param {string} url - URL to check
 * @returns {boolean}
 */
export function isNotionUrl(url) {
  if (!url || typeof url !== 'string') {
    return false;
  }

  try {
    const parsed = new URL(url);
    return parsed.hostname.includes('notion.so') || parsed.hostname.includes('notion.site');
  } catch {
    return false;
  }
}
