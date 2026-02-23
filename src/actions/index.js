/**
 * Ichabod Engine - Action Registry
 * Central dispatcher for all recipe actions.
 * To add a new action: create the file, require it here, add to the map.
 */

'use strict';

const scroll = require('./scroll');
const click = require('./click');
const type = require('./type');
const wait = require('./wait');
const paginate = require('./paginate');
const logger = require('../utils/logger');

const ACTION_MAP = {
  scroll,
  click,
  type,
  wait,
  paginate,
};

/**
 * Execute a single action on a page
 */
const execute = async (page, action) => {
  const handler = ACTION_MAP[action.type];

  if (!handler) {
    throw new Error(`Unknown action type: "${action.type}"`);
  }

  logger.debug({ action }, `Executing action: ${action.type}`);

  await handler(page, action);
};

/**
 * Execute an array of actions sequentially
 */
const executeAll = async (page, actions = []) => {
  for (const action of actions) {
    await execute(page, action);
  }
};

module.exports = { execute, executeAll };