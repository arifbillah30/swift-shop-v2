// src/lib/http.js
/**
 * Standard HTTP response helpers for consistent API responses
 */

/**
 * Send a successful response
 * @param {Object} res - Express response object
 * @param {*} data - Response data
 * @param {Object} pagination - Optional pagination info
 * @param {string} message - Optional success message
 */
const success = (res, data, pagination = null, message = 'Success') => {
  const response = {
    success: true,
    message,
    data
  };

  if (pagination) {
    response.pagination = pagination;
  }

  return res.json(response);
};

/**
 * Send a failure response
 * @param {Object} res - Express response object
 * @param {number} status - HTTP status code
 * @param {string} message - Error message
 * @param {*} errors - Optional detailed errors
 */
const fail = (res, status = 500, message = 'Internal server error', errors = null) => {
  const response = {
    success: false,
    message
  };

  if (errors) {
    response.errors = errors;
  }

  return res.status(status).json(response);
};

/**
 * Send a not found response
 * @param {Object} res - Express response object
 * @param {string} resource - Resource name that was not found
 */
const notFound = (res, resource = 'Resource') => {
  return fail(res, 404, `${resource} not found`);
};

/**
 * Send a validation error response
 * @param {Object} res - Express response object
 * @param {*} errors - Validation errors
 */
const validationError = (res, errors) => {
  return fail(res, 400, 'Validation failed', errors);
};

/**
 * Send an unauthorized response
 * @param {Object} res - Express response object
 * @param {string} message - Custom message
 */
const unauthorized = (res, message = 'Unauthorized') => {
  return fail(res, 401, message);
};

/**
 * Send a forbidden response
 * @param {Object} res - Express response object
 * @param {string} message - Custom message
 */
const forbidden = (res, message = 'Forbidden') => {
  return fail(res, 403, message);
};

module.exports = {
  success,
  fail,
  notFound,
  validationError,
  unauthorized,
  forbidden
};