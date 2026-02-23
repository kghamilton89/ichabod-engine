/**
 * Ichabod Engine - Health Route
 * Simple liveness and readiness check.
 * Used by Docker, load balancers, and monitoring tools.
 */

'use strict';

const express = require('express');
const router = express.Router();
const browserService = require('../services/browser');
const { success } = require('../utils/response');

/**
 * GET /health
 * Returns current service status and browser state
 */
router.get('/', (req, res) => {
  const browserStatus = browserService.status();

  return success(res, {
    status: 'ok',
    browser: browserStatus,
    uptime: Math.floor(process.uptime()),
    memory: process.memoryUsage(),
  });
});

module.exports = router;