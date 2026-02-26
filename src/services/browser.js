/**
 * Ichabod Engine - Browser Service
 * Manages a single local Playwright browser instance shared across requests.
 * Falls back to Browserless via CDP when local Chromium fails.
 */

'use strict';

const { chromium } = require('playwright');
const config = require('../../config');
const logger = require('../utils/logger');

let browser = null;
let isLaunching = false;
let activePages = 0;

// ── Local Browser ─────────────────────────────────────────────────────────────

const launch = async () => {
  if (browser?.isConnected()) return browser;

  if (isLaunching) {
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
        '--disable-dev-shm-usage',
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

// ── Remote Browser (Browserless fallback) ────────────────────────────────────

const connectRemote = async () => {
  if (!config.browser.browserlessWsEndpoint) {
    throw new Error('Browserless fallback requested but BROWSERLESS_WS_ENDPOINT is not set');
  }

  logger.info('Connecting to Browserless...');

  const remoteBrowser = await chromium.connectOverCDP(
    config.browser.browserlessWsEndpoint
  );

  logger.info('Connected to Browserless');
  return remoteBrowser;
};

// ── Page Management ───────────────────────────────────────────────────────────

/**
 * Create a new page from a browser instance (local or remote)
 */
const newPageFromBrowser = async (browserInstance) => {
  const context = await browserInstance.newContext({
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
 * Get a page from local browser
 */
const newPage = async () => {
  if (activePages >= config.browser.maxConcurrentPages) {
    throw new Error(`Max concurrent pages reached (${config.browser.maxConcurrentPages})`);
  }

  const instance = await launch();
  return newPageFromBrowser(instance);
};

/**
 * Get a page from Browserless
 */
const newRemotePage = async () => {
  const remoteBrowser = await connectRemote();
  return newPageFromBrowser(remoteBrowser);
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

// ── Lifecycle ─────────────────────────────────────────────────────────────────

const shutdown = async () => {
  if (browser) {
    logger.info('Shutting down browser...');
    await browser.close();
    browser = null;
  }
};

const status = () => ({
  connected: browser?.isConnected() ?? false,
  activePages,
  maxPages: config.browser.maxConcurrentPages,
  browserlesConfigured: !!config.browser.browserlessWsEndpoint,
});

module.exports = { launch, newPage, newRemotePage, closePage, shutdown, status };