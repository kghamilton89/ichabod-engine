/**
 * Ichabod Engine - Discovery Service
 * Fetches a page and returns cleaned HTML for LLM analysis.
 * Tries local Chromium first, falls back to Browserless on failure.
 * Supports forceFallback option to skip straight to Browserless.
 */

'use strict';

const browser = require('./browser');
const { sanitize } = require('../utils/sanitize');
const config = require('../../config');
const logger = require('../utils/logger');

const fetchWithPage = async (page, url, options = {}) => {
  const response = await page.goto(url, {
    waitUntil: options.waitUntil ?? 'networkidle',
    timeout: options.timeout ?? config.discovery.candidateUrlTimeout,
  });

  const statusCode = response?.status() ?? null;
  const resolvedUrl = page.url();
  const rawHtml = await page.content();
  const title = await page.title();
  const html = options.fullPage ? rawHtml : sanitize(rawHtml);

  return { html, rawHtml, resolvedUrl, title, statusCode };
};

const fetch = async (url, options = {}) => {
  logger.info({ url }, 'Discovery fetch started');
  const startedAt = Date.now();

  const forceFallback = options.forceFallback === true;
  let page, context, usedFallback = false;

  if (forceFallback) {
    if (!config.browser.browserlessWsEndpoint) {
      throw new Error('forceFallback requested but BROWSERLESS_WS_ENDPOINT is not set');
    }
    logger.info({ url }, 'forceFallback — going straight to Browserless');
    ({ page, context } = await browser.newRemotePage());
    usedFallback = true;
  } else {
    try {
      ({ page, context } = await browser.newPage());
    } catch (err) {
      if (!config.browser.browserlessWsEndpoint) throw err;
      logger.warn({ err: err.message }, 'Local browser failed — trying Browserless');
      ({ page, context } = await browser.newRemotePage());
      usedFallback = true;
    }
  }

  try {
    let result;

    try {
      result = await fetchWithPage(page, url, options);
    } catch (err) {
      if (!config.browser.browserlessWsEndpoint || usedFallback) throw err;

      logger.warn({ url, err: err.message }, 'Local fetch failed — retrying via Browserless');
      await browser.closePage(page, context);

      ({ page, context } = await browser.newRemotePage());
      usedFallback = true;
      result = await fetchWithPage(page, url, options);
    }

    const duration = Date.now() - startedAt;
    const { html, rawHtml, resolvedUrl, title, statusCode } = result;

    logger.info(
      { url, resolvedUrl, statusCode, htmlLength: html.length, duration, usedFallback },
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
        usedFallback,
        fetchedAt: new Date().toISOString(),
      },
    };

  } finally {
    await browser.closePage(page, context);
  }
};

const pollCandidates = async (urls, options = {}) => {
  const results = [];

  for (const url of urls) {
    try {
      const result = await fetch(url, options);
      results.push({ url, success: true, ...result });
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