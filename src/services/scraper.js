/**
 * Ichabod Engine - Scraper Service
 * Core execution engine. Takes a recipe, runs it against a live page,
 * and returns structured results.
 */

'use strict';

const browser = require('./browser');
const { executeAll } = require('../actions');
const { extractAll } = require('../extractors');
const config = require('../../config');
const logger = require('../utils/logger');

/**
 * Execute a single scrape recipe
 * @param {object} recipe - Validated recipe from the controller
 * @returns {object} - { items, meta }
 */
const run = async (recipe) => {
  const { page, context } = await browser.newPage();
  const startedAt = Date.now();

  try {
    logger.info({ url: recipe.url }, 'Scrape started');

    // Navigate to target URL
    await page.goto(recipe.url, {
      waitUntil: recipe.options.waitUntil,
      timeout: recipe.options.timeout ?? config.browser.navigationTimeout,
    });

    // Wait for a specific element before proceeding
    if (recipe.waitFor) {
      await page.waitForSelector(recipe.waitFor, {
        state: 'visible',
        timeout: config.scrape.defaultWaitTimeout,
      });
    }

    // Execute pre-extraction actions (scroll, click, type, etc.)
    if (recipe.actions.length > 0) {
      await executeAll(page, recipe.actions);
    }

    // Extract data
    const data = await extractAll(page, recipe.extract);

    // Normalise into an array of items
    // If the recipe used a selector extractor, data will already be an array
    // Otherwise wrap flat fields into a single-item array
    const items = normalise(data);

    const duration = Date.now() - startedAt;

    logger.info(
      { url: recipe.url, items: items.length, duration },
      'Scrape complete'
    );

    return {
      items,
      meta: {
        url: recipe.url,
        itemCount: items.length,
        duration,
        scrapedAt: new Date().toISOString(),
      },
    };

  } finally {
    await browser.closePage(page, context);
  }
};

/**
 * Execute a recipe across multiple pages
 * @param {object} recipe         - Validated recipe
 * @param {object} pagination     - { selector, waitFor, maxPages }
 */
const runPaginated = async (recipe, pagination) => {
  const { page, context } = await browser.newPage();
  const startedAt = Date.now();
  const allItems = [];
  const maxPages = pagination.maxPages ?? config.scrape.maxPaginationDepth;

  try {
    logger.info({ url: recipe.url, maxPages }, 'Paginated scrape started');

    await page.goto(recipe.url, {
      waitUntil: recipe.options.waitUntil,
      timeout: recipe.options.timeout ?? config.browser.navigationTimeout,
    });

    if (recipe.waitFor) {
      await page.waitForSelector(recipe.waitFor, {
        state: 'visible',
        timeout: config.scrape.defaultWaitTimeout,
      });
    }

    let currentPage = 1;

    while (currentPage <= maxPages) {
      logger.debug({ currentPage, maxPages }, 'Scraping page');

      if (recipe.actions.length > 0) {
        await executeAll(page, recipe.actions);
      }

      const data = await extractAll(page, recipe.extract);
      const items = normalise(data);
      allItems.push(...items);

      // Try to go to next page
      const paginate = require('../actions/paginate');
      const hasNext = await paginate(page, {
        selector: pagination.selector,
        waitFor: pagination.waitFor,
      });

      if (!hasNext) {
        logger.debug({ currentPage }, 'No next page found — stopping');
        break;
      }

      currentPage++;
    }

    const duration = Date.now() - startedAt;

    logger.info(
      { url: recipe.url, items: allItems.length, pages: currentPage, duration },
      'Paginated scrape complete'
    );

    return {
      items: allItems,
      meta: {
        url: recipe.url,
        itemCount: allItems.length,
        pagesScraped: currentPage,
        duration,
        scrapedAt: new Date().toISOString(),
      },
    };

  } finally {
    await browser.closePage(page, context);
  }
};

/**
 * Normalise extracted data into a consistent array format
 * If one of the fields is an array of objects (from selector extractor),
 * use that as the items array. Otherwise wrap flat data in a single item.
 */
const normalise = (data) => {
  for (const key of Object.keys(data)) {
    if (Array.isArray(data[key]) && typeof data[key][0] === 'object') {
      return data[key];
    }
  }
  return [data];
};

module.exports = { run, runPaginated };