# Notion to TOON Extractor

Chrome extension to extract Notion page content (properties + blocks) via the Notion API and copy it to clipboard in TOON format.

## What is TOON?

TOON (Token-Oriented Object Notation) is a readable and compact text format, ideal for sharing structured content with LLMs or for archiving.

Example output:

```
meta:
  id: abc123-def456-...
  created: 2025-01-15T10:30:00.000Z
  title: My page
properties:
  Status: In Progress
  Category: Work
content:
  h1: Main Title
  p: A paragraph of text.
  items[3]:
    First item
    Second item
    Third item
```

## Installation

### Method 1: Direct Download

1. [Download the ZIP](../../archive/refs/heads/main.zip) of this repository
2. Extract the contents to a folder

### Method 2: Git Clone

```bash
git clone https://github.com/YOUR_USERNAME/notion_page_extractor.git
```

### Load in Chrome

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top right)
3. Click **Load unpacked**
4. Select the `notion_page_extractor` folder

The extension icon will appear in your Chrome toolbar.

## Configuration

### 1. Create a Notion Integration

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **New integration**
3. Give it a name (e.g., "TOON Extractor")
4. Select your workspace
5. Click **Submit**
6. Copy the **Internal Integration Token** (starts with `secret_`)

### 2. Configure the Extension

1. Click on the extension icon
2. Click **Options** (or right-click → Options)
3. Paste your API key
4. Click **Save**
5. (Optional) Click **Test Connection** to verify

### 3. Share Pages with the Integration

For each Notion page you want to extract:

1. Open the page in Notion
2. Click the **•••** menu (top right)
3. Click **Add connections**
4. Select your integration

## Usage

1. Navigate to a Notion page
2. Click the extension icon
3. Verify the page ID is detected
4. Click **Extract to TOON**
5. Click **Copy** to copy to clipboard

## Project Structure

```
notion_page_extractor/
├── manifest.json              # Manifest V3 configuration
├── popup/
│   ├── popup.html             # Popup interface
│   ├── popup.css              # Styles
│   └── popup.js               # UI logic
├── background/
│   └── service-worker.js      # API calls, orchestration
├── lib/
│   ├── notion-api.js          # Notion API client
│   ├── toon-converter.js      # JSON → TOON conversion
│   └── page-parser.js         # Extract ID from URL
├── options/
│   ├── options.html           # Settings page
│   └── options.js             # Settings logic
└── icons/
    └── icon*.png              # Extension icons
```

## Supported Block Types

| Type | TOON Output |
|------|-------------|
| Paragraph | `p: text` |
| Heading 1/2/3 | `h1:` / `h2:` / `h3:` |
| Bulleted list | `items[n]:` or `- item` |
| Numbered list | `list[n]:` or `# item` |
| Todo | `[x]` / `[ ]` |
| Code | `code[lang]:` |
| Quote | `quote:` |
| Callout | `callout[emoji]:` |
| Image | `image:` |
| Table | `table[n]{cols}:` |
| Divider | `---` |

## Privacy

- The API key is stored **locally** in your browser (`chrome.storage.local`)
- No data is sent to third-party servers
- Requests only go to `api.notion.com`

## License

MIT

## Contributing

Contributions are welcome! Feel free to open an issue or pull request.
