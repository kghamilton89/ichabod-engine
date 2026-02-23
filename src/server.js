/**
 * Ichabod Engine - Express Server
 * Bootstraps the application, registers middleware, mounts routes,
 * and handles graceful shutdown.
 */

'use strict';

const express = require('express');
const config = require('../config');
const routes = require('./routes');
const errorHandler = require('./middleware/errorHandler');
const browserService = require('./services/browser');
const logger = require('./utils/logger');

const app = express();

// ── Core Middleware ──────────────────────────────────────────────────────────

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));

// Request logging
app.use((req, res, next) => {
  logger.info({ method: req.method, url: req.url }, 'Incoming request');
  next();
});

// ── Routes ───────────────────────────────────────────────────────────────────

app.use('/', routes);

// 404 handler — must come after all routes
app.use((req, res) => {
  res.status(404).json({
    ok: false,
    error: { message: `Route not found: ${req.method} ${req.url}`, code: 404 },
  });
});

// ── Global Error Handler ─────────────────────────────────────────────────────

app.use(errorHandler);

// ── Server Startup ───────────────────────────────────────────────────────────

const start = async () => {
  // Pre-warm the browser so the first request isn't slow
  await browserService.launch();

  const server = app.listen(config.server.port, config.server.host, () => {
    logger.info(
      { host: config.server.host, port: config.server.port, env: config.env },
      'Ichabod Engine running'
    );
  });

  // ── Graceful Shutdown ──────────────────────────────────────────────────────

  const shutdown = async (signal) => {
    logger.info({ signal }, 'Shutdown signal received');

    server.close(async () => {
      logger.info('HTTP server closed');
      await browserService.shutdown();
      logger.info('Browser closed — goodbye');
      process.exit(0);
    });

    // Force exit if graceful shutdown takes too long
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled promise rejection');
  });

  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception — shutting down');
    shutdown('uncaughtException');
  });
};

start().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});

module.exports = app;