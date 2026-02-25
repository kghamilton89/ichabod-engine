/**
 * Ichabod Engine - Central Configuration
 * All environment variables and constants live here.
 * Never import process.env anywhere else in the codebase.
 */

'use strict';

const optional = (key, defaultValue) => process.env[key] ?? defaultValue;

const config = {
  env: optional('NODE_ENV', 'development'),
  isDev: optional('NODE_ENV', 'development') === 'development',

  server: {
    port: parseInt(optional('PORT', '3000'), 10),
    host: optional('HOST', '0.0.0.0'),
  },

  auth: {
    apiKey: process.env.ICHABOD_API_KEY || null, // null = auth disabled in dev
  },

  browser: {
    headless: optional('BROWSER_HEADLESS', 'true') !== 'false',
    timeout: parseInt(optional('BROWSER_TIMEOUT_MS', '30000'), 10),
    navigationTimeout: parseInt(optional('BROWSER_NAV_TIMEOUT_MS', '15000'), 10),
    maxConcurrentPages: parseInt(optional('BROWSER_MAX_PAGES', '5'), 10),
    userAgent: optional(
      'BROWSER_USER_AGENT',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36'
    ),
  },

  scrape: {
    defaultScrollPause: parseInt(optional('SCRAPE_SCROLL_PAUSE_MS', '800'), 10),
    defaultWaitTimeout: parseInt(optional('SCRAPE_WAIT_TIMEOUT_MS', '10000'), 10),
    maxPaginationDepth: parseInt(optional('SCRAPE_MAX_PAGES', '10'), 10),
    maxActionsPerRecipe: parseInt(optional('SCRAPE_MAX_ACTIONS', '50'), 10),
  },

  discovery: {
    maxHtmlLength: parseInt(optional('DISCOVERY_MAX_HTML_LENGTH', '100000'), 10),
    candidateUrlTimeout: parseInt(optional('DISCOVERY_URL_TIMEOUT_MS', '10000'), 10),
  },

  logging: {
    level: optional('LOG_LEVEL', 'info'),
    pretty: optional('LOG_PRETTY', 'true') === 'true',
  },
};

module.exports = config;