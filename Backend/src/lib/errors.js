// src/lib/errors.js
/**
 * Custom application error class
 */
class AppError extends Error {
  constructor(message, statusCode = 500, isOperational = true) {
    super(message);
    
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Create a validation error
 * @param {string} message - Error message
 * @param {*} errors - Validation errors
 */
const createValidationError = (message = 'Validation failed', errors = null) => {
  const error = new AppError(message, 400);
  error.errors = errors;
  return error;
};

/**
 * Create a not found error
 * @param {string} resource - Resource name
 */
const createNotFoundError = (resource = 'Resource') => {
  return new AppError(`${resource} not found`, 404);
};

/**
 * Create an unauthorized error
 * @param {string} message - Custom message
 */
const createUnauthorizedError = (message = 'Unauthorized') => {
  return new AppError(message, 401);
};

/**
 * Create a forbidden error
 * @param {string} message - Custom message
 */
const createForbiddenError = (message = 'Forbidden') => {
  return new AppError(message, 403);
};

module.exports = {
  AppError,
  createValidationError,
  createNotFoundError,
  createUnauthorizedError,
  createForbiddenError
};