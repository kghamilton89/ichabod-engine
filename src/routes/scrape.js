/**
 * Ichabod Engine - Scrape Route
 * Mounts auth, validation, and controller for the /scrape endpoint.
 */

'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { validateScrape } = require('../middleware/validate');
const { scrape } = require('../controllers/scrapeController');

router.post('/', auth, validateScrape, scrape);

module.exports = router;