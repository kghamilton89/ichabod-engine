/**
 * Ichabod Engine - Response Formatter
 * Ensures all API responses have a consistent shape.
 * Every response, success or error, looks the same to the consumer.
 */

'use strict';

const success = (res, data = {}, meta = {}, statusCode = 200) => {
  return res.status(statusCode).json({
    ok: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      ...meta,
    },
  });
};

const error = (res, message, statusCode = 500, details = null) => {
  const body = {
    ok: false,
    error: {
      message,
      code: statusCode,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  };

  if (details) {
    body.error.details = details;
  }

  return res.status(statusCode).json(body);
};

const validationError = (res, details) => {
  return error(res, 'Validation failed', 400, details);
};

const notFound = (res, message = 'Resource not found') => {
  return error(res, message, 404);
};

const unauthorized = (res, message = 'Unauthorized') => {
  return error(res, message, 401);
};

module.exports = { success, error, validationError, notFound, unauthorized };