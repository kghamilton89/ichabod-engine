/**
 * Ichabod Engine - Health Route
 */

'use strict';

const express = require('express');
const router = express.Router();
const browserService = require('../services/browser');
const { success } = require('../utils/response');

router.get('/', (req, res) => {
  const browserStatus = browserService.status();

  return success(res, {
    status: 'ok',
    browser: browserStatus,
    browserlessEndpointSet: !!process.env.BROWSERLESS_WS_ENDPOINT,
    browserlessEndpointPrefix: process.env.BROWSERLESS_WS_ENDPOINT?.slice(0, 30) ?? null,
    uptime: Math.floor(process.uptime()),
    memory: process.memoryUsage(),
  });
});

module.exports = router;