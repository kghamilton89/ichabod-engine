/**
 * Ichabod Engine - Global Error Handler
 * Catches any unhandled errors that bubble up through the middleware chain.
 * Must be registered last in Express — takes 4 arguments.
 */

'use strict';

const { error } = require('../utils/response');
const logger = require('../utils/logger');
const config = require('../../config');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Log the full error internally
  logger.error({
    err,
    req: {
      method: req.method,
      url: req.url,
      body: req.body,
    },
  }, 'Unhandled error');

  // Playwright-specific errors
  if (err.name === 'TimeoutError') {
    return error(res, 'Browser operation timed out', 504, {
      type: 'timeout',
      message: err.message,
    });
  }

  if (err.name === 'TargetClosedError' || err.message?.includes('Target closed')) {
    return error(res, 'Browser page was closed unexpectedly', 500, {
      type: 'browser_closed',
      message: err.message,
    });
  }

  // Navigation errors
  if (err.message?.includes('net::ERR')) {
    return error(res, 'Failed to reach target URL', 502, {
      type: 'navigation',
      message: err.message,
    });
  }

  // Generic fallback — hide internals in production
  const message = config.isDev ? err.message : 'An unexpected error occurred';
  const details = config.isDev ? { stack: err.stack } : null;

  return error(res, message, 500, details);
};

module.exports = errorHandler;