/**
 * Ichabod Engine - Attribute Extractor
 * Extracts a specific DOM attribute from matched elements.
 * Handles href, src, value, innerHTML, outerHTML, and any custom attribute.
 */

'use strict';

/**
 * @param {import('playwright').Page} page
 * @param {object} field
 * @param {string} field.selector       - CSS selector to match
 * @param {string} field.attribute      - DOM attribute to extract
 * @param {boolean} [field.multiple]    - Return array if true, single value if false
 */
const attribute = async (page, field) => {
  const attr = field.attribute;

  if (field.multiple) {
    return page.$$eval(
      field.selector,
      (els, attrName) =>
        els
          .map((el) => {
            if (attrName === 'innerHTML') return el.innerHTML?.trim() ?? '';
            if (attrName === 'outerHTML') return el.outerHTML?.trim() ?? '';
            return el.getAttribute(attrName)?.trim() ?? '';
          })
          .filter(Boolean),
      attr
    );
  }

  const el = await page.$(field.selector);
  if (!el) return null;

  if (attr === 'innerHTML') {
    const val = await el.innerHTML();
    return val?.trim() ?? null;
  }

  if (attr === 'outerHTML') {
    const val = await el.evaluate((node) => node.outerHTML);
    return val?.trim() ?? null;
  }

  const val = await el.getAttribute(attr);
  return val?.trim() ?? null;
};

module.exports = attribute;