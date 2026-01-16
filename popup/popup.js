/**
 * Popup UI Logic
 */

// DOM Elements
const states = {
  notConfigured: document.getElementById('state-not-configured'),
  notNotion: document.getElementById('state-not-notion'),
  ready: document.getElementById('state-ready'),
  loading: document.getElementById('state-loading'),
  result: document.getElementById('state-result'),
  error: document.getElementById('state-error')
};

const elements = {
  pageId: document.getElementById('page-id'),
  resultTitle: document.getElementById('result-title'),
  resultPreview: document.getElementById('result-preview'),
  errorMessage: document.getElementById('error-message'),
  copyFeedback: document.getElementById('copy-feedback'),
  btnOpenOptions: document.getElementById('btn-open-options'),
  btnExtract: document.getElementById('btn-extract'),
  btnCopy: document.getElementById('btn-copy'),
  btnExtractAgain: document.getElementById('btn-extract-again'),
  btnRetry: document.getElementById('btn-retry'),
  linkOptions: document.getElementById('link-options')
};

// State
let currentUrl = null;
let currentPageId = null;
let currentToon = null;

/**
 * Show a specific state, hide others
 */
function showState(stateName) {
  Object.entries(states).forEach(([name, el]) => {
    if (name === stateName) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });
}

/**
 * Send message to service worker
 */
function sendMessage(action, data = {}) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action, ...data }, resolve);
  });
}

/**
 * Initialize popup
 */
async function init() {
  // Get current tab URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentUrl = tab?.url || '';

  // Check if API key is configured
  const apiKeyResult = await sendMessage('getApiKey');

  if (!apiKeyResult.apiKey) {
    showState('notConfigured');
    return;
  }

  // Check if current URL is a Notion page
  const pageIdResult = await sendMessage('checkPageId', { url: currentUrl });

  if (!pageIdResult.pageId) {
    showState('notNotion');
    return;
  }

  currentPageId = pageIdResult.pageId;
  elements.pageId.textContent = currentPageId;
  showState('ready');
}

/**
 * Extract page content
 */
async function extractPage() {
  showState('loading');

  try {
    const result = await sendMessage('extract', { url: currentUrl });

    if (!result.success) {
      throw new Error(result.error || 'Extraction failed');
    }

    currentToon = result.data.toon;
    elements.resultTitle.textContent = result.data.title;
    elements.resultPreview.textContent = currentToon;
    showState('result');

  } catch (error) {
    elements.errorMessage.textContent = error.message;
    showState('error');
  }
}

/**
 * Copy TOON to clipboard
 */
async function copyToClipboard() {
  if (!currentToon) return;

  try {
    await navigator.clipboard.writeText(currentToon);

    // Show feedback
    elements.copyFeedback.classList.remove('hidden');
    setTimeout(() => {
      elements.copyFeedback.classList.add('hidden');
    }, 2000);

  } catch (error) {
    console.error('Failed to copy:', error);
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = currentToon;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);

    elements.copyFeedback.classList.remove('hidden');
    setTimeout(() => {
      elements.copyFeedback.classList.add('hidden');
    }, 2000);
  }
}

/**
 * Open options page
 */
function openOptions() {
  chrome.runtime.openOptionsPage();
}

// Event Listeners
elements.btnOpenOptions.addEventListener('click', openOptions);
elements.btnExtract.addEventListener('click', extractPage);
elements.btnCopy.addEventListener('click', copyToClipboard);
elements.btnExtractAgain.addEventListener('click', extractPage);
elements.btnRetry.addEventListener('click', extractPage);
elements.linkOptions.addEventListener('click', (e) => {
  e.preventDefault();
  openOptions();
});

// Initialize on load
init();
