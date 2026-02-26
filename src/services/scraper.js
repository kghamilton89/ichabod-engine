/**
 * Ichabod Engine - Scraper Service
 * Core execution engine. Tries local Chromium first, falls back to
 * Browserless automatically on failure if configured.
 * Supports forceFallback option to skip straight to Browserless.
 */

'use strict';

const browser = require('./browser');
const { executeAll } = require('../actions');
const { extractAll } = require('../extractors');
const config = require('../../config');
const logger = require('../utils/logger');

/**
 * Execute a scrape using a given page factory function
 */
const executeRecipe = async (pageFactory, recipe) => {
  const { page, context } = await pageFactory();
  const startedAt = Date.now();

  try {
    await page.goto(recipe.url, {
      waitUntil: recipe.options?.waitUntil ?? 'networkidle',
      timeout: recipe.options?.timeout ?? config.browser.navigationTimeout,
    });

    if (recipe.waitFor) {
      await page.waitForSelector(recipe.waitFor, {
        state: 'visible',
        timeout: config.scrape.defaultWaitTimeout,
      });
    }

    if (recipe.actions?.length > 0) {
      await executeAll(page, recipe.actions);
    }

    const data = await extractAll(page, recipe.extract);
    const items = normalise(data);
    const duration = Date.now() - startedAt;

    return { items, duration };

  } finally {
    await browser.closePage(page, context);
  }
};

/**
 * Run a scrape recipe with automatic Browserless fallback.
 * Set options.forceFallback = true to skip local Chromium entirely.
 */
const run = async (recipe) => {
  logger.info({ url: recipe.url }, 'Scrape started');

  const forceFallback = recipe.options?.forceFallback === true;

  if (forceFallback) {
    if (!config.browser.browserlessWsEndpoint) {
      throw new Error('forceFallback requested but BROWSERLESS_WS_ENDPOINT is not set');
    }
    logger.info({ url: recipe.url }, 'forceFallback — going straight to Browserless');
    const { items, duration } = await executeRecipe(browser.newRemotePage, recipe);
    logger.info({ url: recipe.url, items: items.length, duration }, 'Scrape complete via Browserless');
    return {
      items,
      meta: {
        url: recipe.url,
        itemCount: items.length,
        duration,
        usedFallback: true,
        scrapedAt: new Date().toISOString(),
      },
    };
  }

  try {
    const { items, duration } = await executeRecipe(browser.newPage, recipe);
    logger.info({ url: recipe.url, items: items.length, duration }, 'Scrape complete');
    return {
      items,
      meta: {
        url: recipe.url,
        itemCount: items.length,
        duration,
        usedFallback: false,
        scrapedAt: new Date().toISOString(),
      },
    };

  } catch (localErr) {
    logger.warn({ url: recipe.url, err: localErr.message }, 'Local browser failed — trying Browserless');

    if (!config.browser.browserlessWsEndpoint) throw localErr;

    const { items, duration } = await executeRecipe(browser.newRemotePage, recipe);
    logger.info({ url: recipe.url, items: items.length, duration }, 'Scrape complete via Browserless');
    return {
      items,
      meta: {
        url: recipe.url,
        itemCount: items.length,
        duration,
        usedFallback: true,
        scrapedAt: new Date().toISOString(),
      },
    };
  }
};

/**
 * Run a paginated scrape with automatic Browserless fallback
 */
const runPaginated = async (recipe, pagination) => {
  logger.info({ url: recipe.url }, 'Paginated scrape started');

  const forceFallback = recipe.options?.forceFallback === true;

  const pageFactory = forceFallback
    ? browser.newRemotePage
    : async () => {
        try {
          return await browser.newPage();
        } catch (err) {
          if (!config.browser.browserlessWsEndpoint) throw err;
          logger.warn({ err: err.message }, 'Local browser failed — trying Browserless');
          return browser.newRemotePage();
        }
      };

  const { page, context } = await pageFactory();
  const startedAt = Date.now();
  const allItems = [];
  const maxPages = pagination.maxPages ?? config.scrape.maxPaginationDepth;

  try {
    await page.goto(recipe.url, {
      waitUntil: recipe.options?.waitUntil ?? 'networkidle',
      timeout: recipe.options?.timeout ?? config.browser.navigationTimeout,
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

      if (recipe.actions?.length > 0) {
        await executeAll(page, recipe.actions);
      }

      const data = await extractAll(page, recipe.extract);
      allItems.push(...normalise(data));

      const paginate = require('../actions/paginate');
      const hasNext = await paginate(page, {
        selector: pagination.selector,
        waitFor: pagination.waitFor,
      });

      if (!hasNext) break;
      currentPage++;
    }

    const duration = Date.now() - startedAt;
    logger.info({ url: recipe.url, items: allItems.length, duration }, 'Paginated scrape complete');

    return {
      items: allItems,
      meta: {
        url: recipe.url,
        itemCount: allItems.length,
        duration,
        usedFallback: forceFallback,
        scrapedAt: new Date().toISOString(),
      },
    };

  } finally {
    await browser.closePage(page, context);
  }
};

/**
 * Normalise extracted data into a consistent array format
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