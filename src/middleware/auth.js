/**
 * Ichabod Engine - Auth Middleware
 * Validates API key on incoming requests.
 * Disabled automatically in development if no key is set.
 */

'use strict';

const config = require('../../config');
const { unauthorized } = require('../utils/response');
const logger = require('../utils/logger');

const auth = (req, res, next) => {
  // If no API key configured, skip auth (dev mode)
  if (!config.auth.apiKey) {
    if (config.isDev) {
      return next();
    }
    logger.error('Auth is disabled but NODE_ENV is not development. Set ICHABOD_API_KEY.');
    return unauthorized(res, 'Server misconfiguration');
  }

  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return unauthorized(res, 'Missing Authorization header');
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return unauthorized(res, 'Invalid Authorization format. Expected: Bearer <token>');
  }

  if (token !== config.auth.apiKey) {
    logger.warn({ remoteAddress: req.ip }, 'Invalid API key attempt');
    return unauthorized(res, 'Invalid API key');
  }

  next();
};

module.exports = auth;