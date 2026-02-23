/**
 * Ichabod Engine - Extractor Registry
 * Dispatches extraction based on the attribute type defined in the recipe.
 * To add a new extractor: create the file, require it here, add to the map.
 */

'use strict';

const selector = require('./selector');
const text = require('./text');
const attribute = require('./attribute');
const logger = require('../utils/logger');

const EXTRACTOR_MAP = {
  text,
  href: attribute,
  src: attribute,
  value: attribute,
  innerHTML: attribute,
  outerHTML: attribute,
  selector,
};

/**
 * Extract a single field from the page based on a field definition
 */
const extractField = async (page, field) => {
  const handler = EXTRACTOR_MAP[field.attribute];

  if (!handler) {
    throw new Error(`Unknown attribute type: "${field.attribute}"`);
  }

  logger.debug({ field }, `Extracting field: ${field.name}`);

  const result = await handler(page, field);

  if (field.required && (result === null || result === undefined || result === '')) {
    throw new Error(`Required field "${field.name}" returned empty result`);
  }

  return result;
};

/**
 * Extract all fields defined in the recipe
 * Returns an array of objects, one per matched element
 */
const extractAll = async (page, fields) => {
  const results = {};

  for (const field of fields) {
    results[field.name] = await extractField(page, field);
  }

  return results;
};

module.exports = { extractField, extractAll };