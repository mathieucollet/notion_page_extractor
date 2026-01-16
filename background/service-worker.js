/**
 * Service Worker - Background script for the extension
 * Handles API calls, message passing, and orchestration
 */

import { extractPageId } from '../lib/page-parser.js';
import { createNotionClient } from '../lib/notion-api.js';
import { convertToToon } from '../lib/toon-converter.js';

// Storage keys
const STORAGE_KEY_API = 'notion_api_key';

/**
 * Get API key from storage
 */
async function getApiKey() {
  const result = await chrome.storage.local.get(STORAGE_KEY_API);
  return result[STORAGE_KEY_API] || null;
}

/**
 * Save API key to storage
 */
async function saveApiKey(apiKey) {
  await chrome.storage.local.set({ [STORAGE_KEY_API]: apiKey });
}

/**
 * Extract page data and convert to TOON
 */
async function extractPageToToon(url) {
  // Get API key
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new Error('API key not configured. Please set your Notion API key in the extension options.');
  }

  // Extract page ID from URL
  const pageId = extractPageId(url);
  if (!pageId) {
    throw new Error('Could not extract page ID from URL. Make sure you are on a valid Notion page.');
  }

  // Create API client
  const client = createNotionClient(apiKey);

  // Fetch page data and blocks in parallel
  const [page, blocks] = await Promise.all([
    client.getPage(pageId),
    client.getAllBlocks(pageId)
  ]);

  // Convert to TOON format
  const toon = convertToToon(page, blocks);

  return {
    pageId,
    title: extractTitle(page),
    toon
  };
}

/**
 * Extract title from page
 */
function extractTitle(page) {
  if (!page.properties) return 'Untitled';

  for (const [, prop] of Object.entries(page.properties)) {
    if (prop.type === 'title' && prop.title) {
      return prop.title.map(t => t.plain_text || '').join('') || 'Untitled';
    }
  }
  return 'Untitled';
}

/**
 * Test API connection
 */
async function testApiConnection(apiKey) {
  const client = createNotionClient(apiKey);
  const user = await client.testConnection();
  return {
    success: true,
    user: user.name || user.id
  };
}

/**
 * Handle messages from popup and options
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Handle async responses
  (async () => {
    try {
      switch (request.action) {
        case 'extract': {
          const result = await extractPageToToon(request.url);
          sendResponse({ success: true, data: result });
          break;
        }

        case 'getApiKey': {
          const apiKey = await getApiKey();
          sendResponse({ success: true, apiKey });
          break;
        }

        case 'saveApiKey': {
          await saveApiKey(request.apiKey);
          sendResponse({ success: true });
          break;
        }

        case 'testConnection': {
          const result = await testApiConnection(request.apiKey);
          sendResponse({ success: true, data: result });
          break;
        }

        case 'checkPageId': {
          const pageId = extractPageId(request.url);
          sendResponse({ success: true, pageId });
          break;
        }

        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Service worker error:', error);
      sendResponse({
        success: false,
        error: error.message || 'An unknown error occurred'
      });
    }
  })();

  // Return true to indicate async response
  return true;
});
