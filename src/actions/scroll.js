/**
 * Ichabod Engine - Scroll Action
 * Scrolls the page to trigger lazy-loaded content.
 */

'use strict';

const config = require('../../config');

/**
 * @param {import('playwright').Page} page
 * @param {object} action
 * @param {number} [action.times=3]     - Number of times to scroll
 * @param {number} [action.duration]    - Pause between scrolls in ms
 */
const scroll = async (page, action) => {
  const times = action.times ?? 3;
  const pause = action.duration ?? config.scrape.defaultScrollPause;

  for (let i = 0; i < times; i++) {
    await page.evaluate(() => {
      window.scrollBy(0, window.innerHeight);
    });
    await page.waitForTimeout(pause);
  }
};

module.exports = scroll;