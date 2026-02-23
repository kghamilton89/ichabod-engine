/**
 * Ichabod Engine - Route Aggregator
 * Single entry point for all routes.
 * To add a new route: create the file, require it here, mount it.
 */

'use strict';

const express = require('express');
const router = express.Router();

const health = require('./health');
const scrape = require('./scrape');
const discover = require('./discover');

router.use('/health', health);
router.use('/scrape', scrape);
router.use('/discover', discover);

module.exports = router;