/**
 * API Response Helpers
 * Standardized response format across all endpoints
 */

/**
 * Send success response
 */
const successResponse = (res, { statusCode = 200, message = 'Success', data = null, meta = null }) => {
  const response = {
    success: true,
    message,
  };

  if (data !== null) response.data = data;
  if (meta !== null) response.meta = meta;

  return res.status(statusCode).json(response);
};

/**
 * Send error response
 */
const errorResponse = (res, { statusCode = 500, message = 'Internal Server Error', errors = null }) => {
  const response = {
    success: false,
    message,
  };

  if (errors !== null) response.errors = errors;

  return res.status(statusCode).json(response);
};

/**
 * Paginate results helper
 */
const getPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);
  return {
    total,
    page: parseInt(page),
    limit: parseInt(limit),
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

module.exports = { successResponse, errorResponse, getPaginationMeta };
