/**
 * Ichabod Engine - Click Action
 * Clicks a target element on the page.
 * Waits for the element to be visible before clicking.
 */

'use strict';

const config = require('../../config');

/**
 * @param {import('playwright').Page} page
 * @param {object} action
 * @param {string} action.selector      - CSS selector of element to click
 * @param {number} [action.duration]    - Time to wait after click in ms
 */
const click = async (page, action) => {
  const pause = action.duration ?? 500;

  await page.waitForSelector(action.selector, {
    state: 'visible',
    timeout: config.scrape.defaultWaitTimeout,
  });

  await page.click(action.selector);
  await page.waitForTimeout(pause);
};

module.exports = click;