/**
 * Ichabod Engine - Scrape Controller
 * Handles incoming scrape requests, delegates to the scraper service,
 * and formats the response.
 */

'use strict';

const scraper = require('../services/scraper');
const { success, error } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * POST /scrape
 * Execute a scrape recipe and return structured results
 */
const scrape = async (req, res, next) => {
  try {
    const recipe = req.body;

    // Paginated scrape if pagination config is provided
    if (recipe.pagination) {
      const result = await scraper.runPaginated(recipe, recipe.pagination);
      return success(res, result.items, result.meta);
    }

    const result = await scraper.run(recipe);
    return success(res, result.items, result.meta);

  } catch (err) {
    logger.error({ err }, 'Scrape controller error');
    next(err);
  }
};

module.exports = { scrape };