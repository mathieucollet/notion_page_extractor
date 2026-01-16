/**
 * Options Page Logic
 */

// DOM Elements
const elements = {
  apiKey: document.getElementById('api-key'),
  btnSave: document.getElementById('btn-save'),
  btnTest: document.getElementById('btn-test'),
  status: document.getElementById('status')
};

/**
 * Show status message
 */
function showStatus(message, type = 'info') {
  elements.status.textContent = message;
  elements.status.className = `status ${type}`;
  elements.status.classList.remove('hidden');
}

/**
 * Hide status message
 */
function hideStatus() {
  elements.status.classList.add('hidden');
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
 * Load saved API key
 */
async function loadApiKey() {
  const result = await sendMessage('getApiKey');
  if (result.apiKey) {
    elements.apiKey.value = result.apiKey;
  }
}

/**
 * Save API key
 */
async function saveApiKey() {
  const apiKey = elements.apiKey.value.trim();

  if (!apiKey) {
    showStatus('Please enter an API key', 'error');
    return;
  }

  if (!apiKey.startsWith('secret_')) {
    showStatus('API key should start with "secret_"', 'error');
    return;
  }

  elements.btnSave.disabled = true;

  try {
    await sendMessage('saveApiKey', { apiKey });
    showStatus('API key saved successfully!', 'success');
  } catch (error) {
    showStatus(`Error saving API key: ${error.message}`, 'error');
  } finally {
    elements.btnSave.disabled = false;
  }
}

/**
 * Test API connection
 */
async function testConnection() {
  const apiKey = elements.apiKey.value.trim();

  if (!apiKey) {
    showStatus('Please enter an API key first', 'error');
    return;
  }

  elements.btnTest.disabled = true;
  showStatus('Testing connection...', 'info');

  try {
    const result = await sendMessage('testConnection', { apiKey });

    if (result.success) {
      showStatus(`Connection successful! Authenticated as: ${result.data.user}`, 'success');
    } else {
      throw new Error(result.error || 'Connection failed');
    }
  } catch (error) {
    showStatus(`Connection failed: ${error.message}`, 'error');
  } finally {
    elements.btnTest.disabled = false;
  }
}

// Event Listeners
elements.btnSave.addEventListener('click', saveApiKey);
elements.btnTest.addEventListener('click', testConnection);

// Allow Enter key to save
elements.apiKey.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    saveApiKey();
  }
});

// Load saved key on page load
loadApiKey();
