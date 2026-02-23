/**
 * Ichabod Engine - Selector Extractor
 * Extracts structured objects from a list of repeated elements.
 * Used when a page has multiple items (e.g. job listings) each
 * containing several sub-fields.
 *
 * Example recipe field:
 * {
 *   name: "jobs",
 *   selector: ".job-tile",
 *   attribute: "selector",
 *   multiple: true,
 *   fields: [
 *     { name: "title", selector: ".job-title", attribute: "text" },
 *     { name: "budget", selector: ".budget", attribute: "text" },
 *     { name: "link", selector: "a", attribute: "href" }
 *   ]
 * }
 */

'use strict';

/**
 * @param {import('playwright').Page} page
 * @param {object} field
 * @param {string} field.selector       - CSS selector for the repeating container
 * @param {Array}  field.fields         - Sub-fields to extract from each container
 * @param {boolean} [field.multiple]    - Should always be true for this extractor
 */
const selector = async (page, field) => {
  if (!field.fields || field.fields.length === 0) {
    throw new Error(
      `Selector extractor requires a "fields" array on field "${field.name}"`
    );
  }

  const containers = await page.$$(field.selector);

  if (containers.length === 0) return [];

  const results = [];

  for (const container of containers) {
    const item = {};

    for (const subField of field.fields) {
      const el = await container.$(subField.selector);

      if (!el) {
        item[subField.name] = null;
        continue;
      }

      const attr = subField.attribute ?? 'text';

      if (attr === 'text') {
        const content = await el.textContent();
        item[subField.name] = content?.trim() ?? null;
      } else if (attr === 'innerHTML') {
        const content = await el.innerHTML();
        item[subField.name] = content?.trim() ?? null;
      } else if (attr === 'outerHTML') {
        item[subField.name] = await el.evaluate((node) => node.outerHTML?.trim() ?? null);
      } else {
        const content = await el.getAttribute(attr);
        item[subField.name] = content?.trim() ?? null;
      }
    }

    results.push(item);
  }

  return results;
};

module.exports = selector;