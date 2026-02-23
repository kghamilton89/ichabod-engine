/**
 * Ichabod Engine - Discover Controller
 * Handles incoming discovery requests, delegates to the discovery service,
 * and formats the response.
 */

'use strict';

const discovery = require('../services/discovery');
const { success } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * POST /discover
 * Fetch a URL and return sanitized HTML for LLM analysis.
 * Optionally poll multiple candidate URLs.
 */
const discover = async (req, res, next) => {
  try {
    const { url, candidates, options } = req.body;

    // Poll multiple candidate URLs if provided
    if (candidates && candidates.length > 0) {
      const results = await discovery.pollCandidates(candidates, options);
      return success(res, results, {
        candidateCount: candidates.length,
        successCount: results.filter((r) => r.success).length,
      });
    }

    // Single URL fetch
    const result = await discovery.fetch(url, options);
    return success(res, result.html, result.meta);

  } catch (err) {
    logger.error({ err }, 'Discover controller error');
    next(err);
  }
};

module.exports = { discover };