/**
 * Ichabod Engine - Wait Action
 * Waits for either a selector to appear or a fixed duration.
 * Useful between actions when the page needs time to settle.
 */

'use strict';

const config = require('../../config');

/**
 * @param {import('playwright').Page} page
 * @param {object} action
 * @param {string} [action.selector]    - Wait for this selector to appear
 * @param {number} [action.duration]    - Wait for this many ms (fallback)
 */
const wait = async (page, action) => {
  if (action.selector) {
    await page.waitForSelector(action.selector, {
      state: 'visible',
      timeout: config.scrape.defaultWaitTimeout,
    });
    return;
  }

  const duration = action.duration ?? 1000;
  await page.waitForTimeout(duration);
};

module.exports = wait;