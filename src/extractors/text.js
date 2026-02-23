/**
 * Ichabod Engine - Text Extractor
 * Extracts visible text content from matched elements.
 * Handles both single and multiple element extraction.
 */

'use strict';

/**
 * @param {import('playwright').Page} page
 * @param {object} field
 * @param {string} field.selector       - CSS selector to match
 * @param {boolean} [field.multiple]    - Return array if true, single value if false
 */
const text = async (page, field) => {
  if (field.multiple) {
    return page.$$eval(field.selector, (els) =>
      els.map((el) => el.textContent?.trim() ?? '').filter(Boolean)
    );
  }

  const el = await page.$(field.selector);
  if (!el) return null;

  const content = await el.textContent();
  return content?.trim() ?? null;
};

module.exports = text;