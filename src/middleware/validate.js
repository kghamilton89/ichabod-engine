/**
 * Ichabod Engine - Validation Middleware
 * Validates incoming request bodies against schemas.
 * Uses joi for schema definition and validation.
 */

'use strict';

const Joi = require('joi');
const { validationError } = require('../utils/response');

/**
 * Action schema - defines valid action types and their parameters
 */
const actionSchema = Joi.object({
  type: Joi.string()
    .valid('scroll', 'click', 'type', 'wait', 'paginate')
    .required(),
  selector: Joi.string().when('type', {
    is: Joi.valid('click', 'type'),
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  value: Joi.string().when('type', {
    is: 'type',
    then: Joi.required(),
    otherwise: Joi.optional(),
  }),
  times: Joi.number().integer().min(1).max(20).optional(),
  duration: Joi.number().integer().min(0).max(30000).optional(),
});

/**
 * Sub-field schema for selector extractor
 */
const subFieldSchema = Joi.object({
  name: Joi.string().min(1).max(64).required(),
  selector: Joi.string().required(),
  attribute: Joi.string()
    .valid('text', 'href', 'src', 'value', 'innerHTML', 'outerHTML')
    .default('text'),
});

/**
 * Extract field schema - defines what to pull from each element
 */
const extractFieldSchema = Joi.object({
  name: Joi.string().min(1).max(64).required(),
  selector: Joi.string().required(),
  attribute: Joi.string()
    .valid('text', 'href', 'src', 'value', 'innerHTML', 'outerHTML', 'selector')
    .default('text'),
  multiple: Joi.boolean().default(false),
  required: Joi.boolean().default(false),
  // Required when attribute is 'selector'
  fields: Joi.when('attribute', {
    is: 'selector',
    then: Joi.array().items(subFieldSchema).min(1).required(),
    otherwise: Joi.optional(),
  }),
});

/**
 * Full scrape recipe schema
 */
const scrapeSchema = Joi.object({
  url: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
  waitFor: Joi.string().optional(),
  actions: Joi.array().items(actionSchema).max(50).default([]),
  extract: Joi.array().items(extractFieldSchema).min(1).required(),
  options: Joi.object({
    timeout: Joi.number().integer().min(1000).max(60000).optional(),
    waitUntil: Joi.string()
      .valid('load', 'domcontentloaded', 'networkidle')
      .default('networkidle'),
    forceFallback: Joi.boolean().default(false),
  }).default({}),
});

/**
 * Discovery schema
 */
const discoverSchema = Joi.object({
  url: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
  candidates: Joi.array().items(Joi.string().uri()).optional(),
  options: Joi.object({
    timeout: Joi.number().integer().min(1000).max(60000).optional(),
    waitUntil: Joi.string()
      .valid('load', 'domcontentloaded', 'networkidle')
      .default('networkidle'),
    fullPage: Joi.boolean().default(false),
  }).default({}),
});

/**
 * Middleware factory - takes a schema and returns a middleware function
 */
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,    // Return all errors, not just the first
    stripUnknown: true,   // Remove unknown fields silently
    convert: true,        // Apply defaults and type coercion
    allowUnknown: false,
  });

  if (error) {
    const details = error.details.map((d) => ({
      field: d.path.join('.'),
      message: d.message,
    }));
    return validationError(res, details);
  }

  req.body = value;
  next();
};

module.exports = {
  validateScrape: validate(scrapeSchema),
  validateDiscover: validate(discoverSchema),
};