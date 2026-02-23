/**
 * Ichabod Engine - Browser Service
 * Manages a single Playwright browser instance shared across all requests.
 * Handles lifecycle: launch, page creation, crash recovery.
 */

'use strict';

const { chromium } = require('playwright');
const config = require('../../config');
const logger = require('../utils/logger');

let browser = null;
let isLaunching = false;
let activePages = 0;

/**
 * Launch the browser if not already running
 */
const launch = async () => {
  if (browser?.isConnected()) return browser;

  if (isLaunching) {
    // Wait for the in-progress launch rather than launching twice
    await new Promise((resolve) => setTimeout(resolve, 500));
    return launch();
  }

  isLaunching = true;

  try {
    logger.info('Launching browser...');
    browser = await chromium.launch({
      headless: config.browser.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',  // Required in Docker
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
      ],
    });

    browser.on('disconnected', () => {
      logger.warn('Browser disconnected — will relaunch on next request');
      browser = null;
    });

    logger.info('Browser launched');
    return browser;

  } finally {
    isLaunching = false;
  }
};

/**
 * Create a new page with standard configuration
 */
const newPage = async () => {
  if (activePages >= config.browser.maxConcurrentPages) {
    throw new Error(
      `Max concurrent pages reached (${config.browser.maxConcurrentPages})`
    );
  }

  const instance = await launch();

  const context = await instance.newContext({
    userAgent: config.browser.userAgent,
    viewport: { width: 1280, height: 800 },
    ignoreHTTPSErrors: true,
    javaScriptEnabled: true,
  });

  const page = await context.newPage();

  page.setDefaultTimeout(config.browser.timeout);
  page.setDefaultNavigationTimeout(config.browser.navigationTimeout);

  activePages++;
  logger.debug({ activePages }, 'Page opened');

  return { page, context };
};

/**
 * Close a page and its context cleanly
 */
const closePage = async (page, context) => {
  try {
    await page.close();
    await context.close();
  } catch (err) {
    logger.warn({ err }, 'Error closing page — continuing');
  } finally {
    activePages = Math.max(0, activePages - 1);
    logger.debug({ activePages }, 'Page closed');
  }
};

/**
 * Graceful shutdown — called on process exit
 */
const shutdown = async () => {
  if (browser) {
    logger.info('Shutting down browser...');
    await browser.close();
    browser = null;
  }
};

/**
 * Health info for the /health endpoint
 */
const status = () => ({
  connected: browser?.isConnected() ?? false,
  activePages,
  maxPages: config.browser.maxConcurrentPages,
});

module.exports = { launch, newPage, closePage, shutdown, status };