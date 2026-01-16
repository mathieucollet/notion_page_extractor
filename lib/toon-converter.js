/**
 * TOON Converter
 * Converts Notion API data to TOON (Token-Oriented Object Notation) format
 */

import { richTextToPlain, extractPropertyValue } from './notion-api.js';

/**
 * Convert Notion page data to TOON format
 * @param {Object} page - Page object from Notion API
 * @param {Array} blocks - Array of block objects
 * @returns {string} - TOON formatted string
 */
export function convertToToon(page, blocks) {
  const lines = [];

  // Meta section
  lines.push('meta:');
  lines.push(`  id: ${page.id}`);
  lines.push(`  created: ${page.created_time}`);
  lines.push(`  updated: ${page.last_edited_time}`);

  // Extract title from properties
  const title = extractTitle(page);
  if (title) {
    lines.push(`  title: ${escapeValue(title)}`);
  }

  // Properties section (for database pages)
  const properties = convertProperties(page.properties);
  if (properties.length > 0) {
    lines.push('properties:');
    for (const prop of properties) {
      lines.push(`  ${prop}`);
    }
  }

  // Content section
  const content = convertBlocks(blocks);
  if (content.length > 0) {
    lines.push('content:');
    for (const line of content) {
      lines.push(`  ${line}`);
    }
  }

  return lines.join('\n');
}

/**
 * Extract title from page properties
 */
function extractTitle(page) {
  if (!page.properties) return null;

  for (const [, prop] of Object.entries(page.properties)) {
    if (prop.type === 'title') {
      return richTextToPlain(prop.title);
    }
  }
  return null;
}

/**
 * Convert page properties to TOON format
 */
function convertProperties(properties) {
  if (!properties) return [];

  const lines = [];

  for (const [name, prop] of Object.entries(properties)) {
    // Skip title as it's in meta
    if (prop.type === 'title') continue;

    const value = extractPropertyValue(prop);
    if (value === null || value === undefined || value === '') continue;

    const formattedValue = formatPropertyValue(value);
    lines.push(`${name}: ${formattedValue}`);
  }

  return lines;
}

/**
 * Format a property value for TOON output
 */
function formatPropertyValue(value) {
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return `[${value.map(v => escapeValue(String(v))).join(', ')}]`;
  }

  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return escapeValue(String(value));
}

/**
 * Convert blocks to TOON format
 */
function convertBlocks(blocks, indent = 0) {
  if (!blocks || blocks.length === 0) return [];

  const lines = [];
  const indentStr = '  '.repeat(indent);

  // Group consecutive similar blocks for tabular format
  let i = 0;
  while (i < blocks.length) {
    const block = blocks[i];

    // Check for list items that can be grouped
    if (isListItem(block)) {
      const listItems = collectListItems(blocks, i);
      lines.push(...formatListItems(listItems, indentStr));
      i += listItems.length;
      continue;
    }

    // Check for table
    if (block.type === 'table') {
      lines.push(...formatTable(block, indentStr));
      i++;
      continue;
    }

    // Regular block
    const blockLines = convertBlock(block, indent);
    lines.push(...blockLines);
    i++;
  }

  return lines;
}

/**
 * Convert a single block to TOON format
 */
function convertBlock(block, indent = 0) {
  const lines = [];
  const indentStr = '  '.repeat(indent);

  switch (block.type) {
    case 'paragraph': {
      const text = richTextToPlain(block.paragraph?.rich_text);
      if (text) {
        lines.push(`${indentStr}p: ${escapeValue(text)}`);
      }
      break;
    }

    case 'heading_1': {
      const text = richTextToPlain(block.heading_1?.rich_text);
      if (text) {
        lines.push(`${indentStr}h1: ${escapeValue(text)}`);
      }
      if (block.children) {
        lines.push(...convertBlocks(block.children, indent + 1));
      }
      break;
    }

    case 'heading_2': {
      const text = richTextToPlain(block.heading_2?.rich_text);
      if (text) {
        lines.push(`${indentStr}h2: ${escapeValue(text)}`);
      }
      if (block.children) {
        lines.push(...convertBlocks(block.children, indent + 1));
      }
      break;
    }

    case 'heading_3': {
      const text = richTextToPlain(block.heading_3?.rich_text);
      if (text) {
        lines.push(`${indentStr}h3: ${escapeValue(text)}`);
      }
      if (block.children) {
        lines.push(...convertBlocks(block.children, indent + 1));
      }
      break;
    }

    case 'bulleted_list_item': {
      const text = richTextToPlain(block.bulleted_list_item?.rich_text);
      if (text) {
        lines.push(`${indentStr}- ${escapeValue(text)}`);
      }
      if (block.children) {
        lines.push(...convertBlocks(block.children, indent + 1));
      }
      break;
    }

    case 'numbered_list_item': {
      const text = richTextToPlain(block.numbered_list_item?.rich_text);
      if (text) {
        lines.push(`${indentStr}# ${escapeValue(text)}`);
      }
      if (block.children) {
        lines.push(...convertBlocks(block.children, indent + 1));
      }
      break;
    }

    case 'to_do': {
      const text = richTextToPlain(block.to_do?.rich_text);
      const checked = block.to_do?.checked ? '[x]' : '[ ]';
      if (text) {
        lines.push(`${indentStr}${checked} ${escapeValue(text)}`);
      }
      if (block.children) {
        lines.push(...convertBlocks(block.children, indent + 1));
      }
      break;
    }

    case 'toggle': {
      const text = richTextToPlain(block.toggle?.rich_text);
      if (text) {
        lines.push(`${indentStr}toggle: ${escapeValue(text)}`);
      }
      if (block.children) {
        lines.push(...convertBlocks(block.children, indent + 1));
      }
      break;
    }

    case 'code': {
      const text = richTextToPlain(block.code?.rich_text);
      const lang = block.code?.language || 'plain';
      if (text) {
        lines.push(`${indentStr}code[${lang}]:`);
        const codeLines = text.split('\n');
        for (const codeLine of codeLines) {
          lines.push(`${indentStr}  ${codeLine}`);
        }
      }
      break;
    }

    case 'quote': {
      const text = richTextToPlain(block.quote?.rich_text);
      if (text) {
        lines.push(`${indentStr}quote: ${escapeValue(text)}`);
      }
      if (block.children) {
        lines.push(...convertBlocks(block.children, indent + 1));
      }
      break;
    }

    case 'callout': {
      const text = richTextToPlain(block.callout?.rich_text);
      const icon = block.callout?.icon?.emoji || '💡';
      if (text) {
        lines.push(`${indentStr}callout[${icon}]: ${escapeValue(text)}`);
      }
      if (block.children) {
        lines.push(...convertBlocks(block.children, indent + 1));
      }
      break;
    }

    case 'divider':
      lines.push(`${indentStr}---`);
      break;

    case 'image': {
      const url = block.image?.file?.url || block.image?.external?.url || '';
      const caption = richTextToPlain(block.image?.caption);
      if (caption) {
        lines.push(`${indentStr}image: ${escapeValue(caption)}`);
      } else {
        lines.push(`${indentStr}image: ${url}`);
      }
      break;
    }

    case 'video': {
      const url = block.video?.file?.url || block.video?.external?.url || '';
      lines.push(`${indentStr}video: ${url}`);
      break;
    }

    case 'file': {
      const url = block.file?.file?.url || block.file?.external?.url || '';
      const name = block.file?.name || 'file';
      lines.push(`${indentStr}file[${name}]: ${url}`);
      break;
    }

    case 'pdf': {
      const url = block.pdf?.file?.url || block.pdf?.external?.url || '';
      lines.push(`${indentStr}pdf: ${url}`);
      break;
    }

    case 'bookmark': {
      const url = block.bookmark?.url || '';
      const caption = richTextToPlain(block.bookmark?.caption);
      if (caption) {
        lines.push(`${indentStr}bookmark: ${escapeValue(caption)} (${url})`);
      } else {
        lines.push(`${indentStr}bookmark: ${url}`);
      }
      break;
    }

    case 'link_preview': {
      const url = block.link_preview?.url || '';
      lines.push(`${indentStr}link: ${url}`);
      break;
    }

    case 'embed': {
      const url = block.embed?.url || '';
      lines.push(`${indentStr}embed: ${url}`);
      break;
    }

    case 'equation': {
      const expr = block.equation?.expression || '';
      lines.push(`${indentStr}math: ${escapeValue(expr)}`);
      break;
    }

    case 'table_of_contents':
      lines.push(`${indentStr}toc:`);
      break;

    case 'breadcrumb':
      lines.push(`${indentStr}breadcrumb:`);
      break;

    case 'column_list':
      if (block.children) {
        lines.push(`${indentStr}columns:`);
        for (const col of block.children) {
          if (col.children) {
            lines.push(...convertBlocks(col.children, indent + 1));
          }
        }
      }
      break;

    case 'synced_block':
      if (block.children) {
        lines.push(...convertBlocks(block.children, indent));
      }
      break;

    case 'child_page': {
      const title = block.child_page?.title || 'Untitled';
      lines.push(`${indentStr}page: ${escapeValue(title)}`);
      break;
    }

    case 'child_database': {
      const title = block.child_database?.title || 'Untitled';
      lines.push(`${indentStr}database: ${escapeValue(title)}`);
      break;
    }

    case 'link_to_page': {
      const pageId = block.link_to_page?.page_id || block.link_to_page?.database_id || '';
      lines.push(`${indentStr}link_to_page: ${pageId}`);
      break;
    }

    default:
      // Unknown block type - include type name
      lines.push(`${indentStr}[${block.type}]`);
  }

  return lines;
}

/**
 * Check if a block is a list item
 */
function isListItem(block) {
  return ['bulleted_list_item', 'numbered_list_item', 'to_do'].includes(block.type);
}

/**
 * Collect consecutive list items of the same type
 */
function collectListItems(blocks, startIndex) {
  const items = [];
  const startType = blocks[startIndex].type;

  for (let i = startIndex; i < blocks.length; i++) {
    if (blocks[i].type !== startType) break;
    items.push(blocks[i]);
  }

  return items;
}

/**
 * Format list items in tabular TOON format
 */
function formatListItems(items, indentStr) {
  const lines = [];

  if (items.length === 0) return lines;

  const type = items[0].type;

  // Only use tabular format for simple lists without children
  const hasChildren = items.some(item => item.children && item.children.length > 0);

  if (!hasChildren && items.length >= 2) {
    // Tabular format
    const prefix = type === 'bulleted_list_item' ? 'items' :
                   type === 'numbered_list_item' ? 'list' : 'todos';

    lines.push(`${indentStr}${prefix}[${items.length}]:`);

    for (const item of items) {
      const blockContent = item[type];
      const text = richTextToPlain(blockContent?.rich_text);
      if (type === 'to_do') {
        const checked = blockContent?.checked ? '[x]' : '[ ]';
        lines.push(`${indentStr}  ${checked} ${escapeValue(text)}`);
      } else {
        lines.push(`${indentStr}  ${escapeValue(text)}`);
      }
    }
  } else {
    // Regular format with potential children
    for (const item of items) {
      lines.push(...convertBlock(item, 0).map(l => indentStr + l));
    }
  }

  return lines;
}

/**
 * Format a table block
 */
function formatTable(block, indentStr) {
  const lines = [];

  if (!block.children || block.children.length === 0) {
    lines.push(`${indentStr}table[0]:`);
    return lines;
  }

  const rows = block.children;
  const hasHeader = block.table?.has_column_header;

  // Extract headers if present
  let headers = [];
  let dataRows = rows;

  if (hasHeader && rows.length > 0) {
    const headerRow = rows[0];
    headers = headerRow.table_row?.cells?.map(cell => richTextToPlain(cell)) || [];
    dataRows = rows.slice(1);
  }

  // Format table
  if (headers.length > 0) {
    const headerStr = headers.map(h => escapeValue(h)).join(',');
    lines.push(`${indentStr}table[${dataRows.length}]{${headerStr}}:`);
  } else {
    lines.push(`${indentStr}table[${dataRows.length}]:`);
  }

  // Add data rows
  for (const row of dataRows) {
    const cells = row.table_row?.cells?.map(cell => richTextToPlain(cell)) || [];
    const rowStr = cells.map(c => escapeValue(c)).join(',');
    lines.push(`${indentStr}  ${rowStr}`);
  }

  return lines;
}

/**
 * Escape special characters in values
 */
function escapeValue(value) {
  if (!value) return '';

  // If value contains newlines, we need special handling
  if (value.includes('\n')) {
    // For multiline, just return the first line with indicator
    const firstLine = value.split('\n')[0];
    return `${firstLine}...`;
  }

  // Escape commas in table context (caller should handle this if needed)
  // For now, just return the value as-is for most cases
  return value;
}
