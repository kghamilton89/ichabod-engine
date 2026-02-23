/**
 * Ichabod Engine - Discovery Service
 * Fetches a page and returns cleaned HTML for LLM analysis.
 * Used by the n8n discovery workflow to identify selectors
 * and validate candidate URLs.
 */

'use strict';

const browser = require('./browser');
const { sanitize } = require('../utils/sanitize');
const config = require('../../config');
const logger = require('../utils/logger');

/**
 * Fetch a URL and return cleaned HTML ready for LLM consumption
 * @param {string} url
 * @param {object} options
 * @param {string} [options.waitUntil]  - Playwright navigation event
 * @param {number} [options.timeout]    - Navigation timeout in ms
 * @param {boolean} [options.fullPage]  - Skip sanitization, return raw HTML
 * @returns {object} - { html, meta }
 */
const fetch = async (url, options = {}) => {
  const { page, context } = await browser.newPage();
  const startedAt = Date.now();

  try {
    logger.info({ url }, 'Discovery fetch started');

    const response = await page.goto(url, {
      waitUntil: options.waitUntil ?? 'networkidle',
      timeout: options.timeout ?? config.discovery.candidateUrlTimeout,
    });

    const statusCode = response?.status() ?? null;

    // Capture final URL after any redirects
    const resolvedUrl = page.url();

    // Get the full rendered HTML (post JS execution)
    const rawHtml = await page.content();

    // Get page title for context
    const title = await page.title();

    const html = options.fullPage
      ? rawHtml
      : sanitize(rawHtml);

    const duration = Date.now() - startedAt;

    logger.info(
      { url, resolvedUrl, statusCode, htmlLength: html.length, duration },
      'Discovery fetch complete'
    );

    return {
      html,
      meta: {
        url,
        resolvedUrl,
        title,
        statusCode,
        htmlLength: html.length,
        rawHtmlLength: rawHtml.length,
        duration,
        fetchedAt: new Date().toISOString(),
      },
    };

  } finally {
    await browser.closePage(page, context);
  }
};

/**
 * Poll a list of candidate URLs and return results for each
 * Used by the n8n discovery workflow to identify the correct URL
 * from a list of LLM-suggested candidates
 * @param {string[]} urls
 * @param {object} options
 * @returns {object[]} - Array of { url, success, html, meta, error }
 */
const pollCandidates = async (urls, options = {}) => {
  const results = [];

  for (const url of urls) {
    try {
      const result = await fetch(url, options);
      results.push({
        url,
        success: true,
        ...result,
      });
    } catch (err) {
      logger.warn({ url, err: err.message }, 'Candidate URL failed');
      results.push({
        url,
        success: false,
        html: null,
        meta: { url, error: err.message },
        error: err.message,
      });
    }
  }

  return results;
};

module.exports = { fetch, pollCandidates };