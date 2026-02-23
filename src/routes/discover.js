/**
 * Ichabod Engine - Discover Route
 * Mounts auth, validation, and controller for the /discover endpoint.
 */

'use strict';

const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { validateDiscover } = require('../middleware/validate');
const { discover } = require('../controllers/discoverController');

router.post('/', auth, validateDiscover, discover);

module.exports = router;