/**
 * Ichabod Engine - HTML Sanitizer
 * Cleans raw HTML before sending to an LLM for analysis.
 * Goal: preserve structure and content, strip noise.
 * Smaller payload = faster LLM response + lower token cost.
 */

'use strict';

const config = require('../../config');

/**
 * Tags that add no semantic value for LLM analysis
 */
const STRIP_TAGS = [
  'script', 'style', 'noscript', 'iframe', 'svg',
  'canvas', 'video', 'audio', 'picture', 'source',
  'link', 'meta', 'head',
];

/**
 * Attributes worth keeping for selector generation
 */
const KEEP_ATTRIBUTES = [
  'id', 'class', 'href', 'data-testid', 'data-id',
  'aria-label', 'role', 'name', 'type', 'placeholder',
];

/**
 * Remove all occurrences of a tag and its contents
 */
const stripTag = (html, tag) => {
  const regex = new RegExp(`<${tag}[^>]*>.*?<\\/${tag}>`, 'gis');
  return html.replace(regex, '');
};

/**
 * Strip all attributes except those in KEEP_ATTRIBUTES
 */
const stripAttributes = (html) => {
  return html.replace(/<([a-z][a-z0-9]*)\s+([^>]+)>/gi, (match, tag, attrs) => {
    const kept = [];
    const attrRegex = /([a-z][a-z0-9-]*)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]*)))?/gi;
    let attrMatch;

    while ((attrMatch = attrRegex.exec(attrs)) !== null) {
      const attrName = attrMatch[1].toLowerCase();
      if (KEEP_ATTRIBUTES.includes(attrName)) {
        const value = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? '';
        kept.push(`${attrName}="${value}"`);
      }
    }

    return kept.length > 0 ? `<${tag} ${kept.join(' ')}>` : `<${tag}>`;
  });
};

/**
 * Collapse excessive whitespace and blank lines
 */
const collapseWhitespace = (html) => {
  return html
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
};

/**
 * Main sanitize function
 * Returns cleaned HTML ready for LLM consumption
 */
const sanitize = (html, options = {}) => {
  const maxLength = options.maxLength ?? config.discovery.maxHtmlLength;

  let cleaned = html;

  // Strip noisy tags and their contents
  for (const tag of STRIP_TAGS) {
    cleaned = stripTag(cleaned, tag);
  }

  // Strip noisy attributes
  cleaned = stripAttributes(cleaned);

  // Clean up whitespace
  cleaned = collapseWhitespace(cleaned);

  // Truncate if needed, breaking at a tag boundary
  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength);
    const lastTag = cleaned.lastIndexOf('>');
    if (lastTag > maxLength * 0.9) {
      cleaned = cleaned.substring(0, lastTag + 1);
    }
    cleaned += '\n<!-- truncated -->';
  }

  return cleaned;
};

module.exports = { sanitize };