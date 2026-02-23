/**
 * Ichabod Engine - Paginate Action
 * Clicks a "next page" button and waits for new content to load.
 * Used within the scraper's pagination loop, not called directly
 * as a standalone action in a recipe.
 */

'use strict';

const config = require('../../config');

/**
 * @param {import('playwright').Page} page
 * @param {object} action
 * @param {string} action.selector        - CSS selector for the "next" button
 * @param {string} [action.waitFor]       - Selector to wait for after click
 * @param {number} [action.duration]      - Fixed pause after click in ms
 * @returns {Promise<boolean>}            - true if paginated, false if no next button
 */
const paginate = async (page, action) => {
  const nextButton = await page.$(action.selector);

  if (!nextButton) return false;

  const isDisabled = await nextButton.evaluate((el) => {
    return el.disabled ||
      el.getAttribute('aria-disabled') === 'true' ||
      el.classList.contains('disabled');
  });

  if (isDisabled) return false;

  await nextButton.click();

  // Prefer waiting for a selector over a fixed pause
  if (action.waitFor) {
    await page.waitForSelector(action.waitFor, {
      state: 'visible',
      timeout: config.scrape.defaultWaitTimeout,
    });
  } else {
    await page.waitForTimeout(action.duration ?? 1500);
  }

  return true;
};

module.exports = paginate;