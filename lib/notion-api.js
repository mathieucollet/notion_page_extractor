/**
 * Notion API Client
 * Handles all interactions with the Notion API
 */

const NOTION_API_VERSION = '2022-06-28';
const NOTION_API_BASE = 'https://api.notion.com/v1';

/**
 * Create a Notion API client
 * @param {string} apiKey - Notion Integration Token
 * @returns {Object} - API client methods
 */
export function createNotionClient(apiKey) {
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Notion-Version': NOTION_API_VERSION,
    'Content-Type': 'application/json'
  };

  /**
   * Make an API request
   */
  async function request(endpoint, options = {}) {
    const url = `${NOTION_API_BASE}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new NotionApiError(
        error.message || `API error: ${response.status}`,
        response.status,
        error.code
      );
    }

    return response.json();
  }

  return {
    /**
     * Get page metadata and properties
     * @param {string} pageId - Page UUID
     * @returns {Promise<Object>} - Page object with properties
     */
    async getPage(pageId) {
      return request(`/pages/${pageId}`);
    },

    /**
     * Get database metadata (for database pages)
     * @param {string} databaseId - Database UUID
     * @returns {Promise<Object>} - Database object
     */
    async getDatabase(databaseId) {
      return request(`/databases/${databaseId}`);
    },

    /**
     * Get all blocks (content) from a page with pagination
     * @param {string} blockId - Page or block UUID
     * @returns {Promise<Array>} - Array of all blocks (recursive)
     */
    async getAllBlocks(blockId) {
      const allBlocks = [];
      let cursor = undefined;

      do {
        const params = new URLSearchParams();
        if (cursor) {
          params.set('start_cursor', cursor);
        }
        params.set('page_size', '100');

        const response = await request(`/blocks/${blockId}/children?${params}`);

        // Process each block and fetch children if needed
        for (const block of response.results) {
          allBlocks.push(block);

          // Recursively fetch children for blocks that have them
          if (block.has_children) {
            const children = await this.getAllBlocks(block.id);
            block.children = children;
          }
        }

        cursor = response.has_more ? response.next_cursor : undefined;
      } while (cursor);

      return allBlocks;
    },

    /**
     * Test the API connection
     * @returns {Promise<Object>} - User info if successful
     */
    async testConnection() {
      return request('/users/me');
    }
  };
}

/**
 * Custom error class for Notion API errors
 */
export class NotionApiError extends Error {
  constructor(message, status, code) {
    super(message);
    this.name = 'NotionApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Extract rich text content to plain string
 * @param {Array} richTextArray - Notion rich_text array
 * @returns {string} - Plain text content
 */
export function richTextToPlain(richTextArray) {
  if (!richTextArray || !Array.isArray(richTextArray)) {
    return '';
  }
  return richTextArray.map(rt => rt.plain_text || '').join('');
}

/**
 * Extract property value to a simple format
 * @param {Object} property - Notion property object
 * @returns {*} - Simplified property value
 */
export function extractPropertyValue(property) {
  if (!property) return null;

  switch (property.type) {
    case 'title':
      return richTextToPlain(property.title);

    case 'rich_text':
      return richTextToPlain(property.rich_text);

    case 'number':
      return property.number;

    case 'select':
      return property.select?.name || null;

    case 'multi_select':
      return property.multi_select?.map(s => s.name) || [];

    case 'status':
      return property.status?.name || null;

    case 'date':
      if (!property.date) return null;
      if (property.date.end) {
        return `${property.date.start} → ${property.date.end}`;
      }
      return property.date.start;

    case 'people':
      return property.people?.map(p => p.name || p.id) || [];

    case 'files':
      return property.files?.map(f => f.name || f.external?.url || f.file?.url) || [];

    case 'checkbox':
      return property.checkbox;

    case 'url':
      return property.url;

    case 'email':
      return property.email;

    case 'phone_number':
      return property.phone_number;

    case 'formula':
      return extractFormulaValue(property.formula);

    case 'relation':
      return property.relation?.map(r => r.id) || [];

    case 'rollup':
      return extractRollupValue(property.rollup);

    case 'created_time':
      return property.created_time;

    case 'created_by':
      return property.created_by?.name || property.created_by?.id;

    case 'last_edited_time':
      return property.last_edited_time;

    case 'last_edited_by':
      return property.last_edited_by?.name || property.last_edited_by?.id;

    case 'unique_id':
      if (property.unique_id) {
        const prefix = property.unique_id.prefix || '';
        return prefix ? `${prefix}-${property.unique_id.number}` : property.unique_id.number;
      }
      return null;

    default:
      return null;
  }
}

function extractFormulaValue(formula) {
  if (!formula) return null;
  switch (formula.type) {
    case 'string': return formula.string;
    case 'number': return formula.number;
    case 'boolean': return formula.boolean;
    case 'date': return formula.date?.start;
    default: return null;
  }
}

function extractRollupValue(rollup) {
  if (!rollup) return null;
  switch (rollup.type) {
    case 'number': return rollup.number;
    case 'date': return rollup.date?.start;
    case 'array': return rollup.array?.map(item => extractPropertyValue(item));
    default: return null;
  }
}
