/**
 * Ichabod Engine - Type Action
 * Clears a field and types a value into it.
 * Simulates real keystrokes rather than setting value directly
 * to trigger JS event listeners on the page.
 */

'use strict';

const config = require('../../config');

/**
 * @param {import('playwright').Page} page
 * @param {object} action
 * @param {string} action.selector      - CSS selector of input element
 * @param {string} action.value         - Text to type
 * @param {number} [action.duration]    - Delay between keystrokes in ms
 */
const type = async (page, action) => {
  const delay = action.duration ?? 50;

  await page.waitForSelector(action.selector, {
    state: 'visible',
    timeout: config.scrape.defaultWaitTimeout,
  });

  // Clear existing value first
  await page.triple_click(action.selector);
  await page.keyboard.press('Backspace');

  // Type with realistic keystroke delay
  await page.type(action.selector, action.value, { delay });
};

module.exports = type;