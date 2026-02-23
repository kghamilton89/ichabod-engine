/**
 * Ichabod Engine - Logger
 * Structured logging using pino.
 * Pretty-prints in development, outputs JSON in production.
 */

'use strict';

const pino = require('pino');
const config = require('../../config');

const logger = pino({
  level: config.logging.level,
  transport: config.logging.pretty
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    service: 'ichabod-engine',
    env: config.env,
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: (req) => ({
      method: req.method,
      url: req.url,
      remoteAddress: req.remoteAddress,
    }),
  },
});

module.exports = logger;