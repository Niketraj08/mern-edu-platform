/**
 * JWT Utilities
 * Handles token generation, verification, and management
 */

const jwt = require('jsonwebtoken');

/**
 * Generate JWT Access Token (short-lived)
 * @param {Object} payload - User data to embed in token
 * @returns {string} Signed JWT token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRE || '15m',
    issuer: 'mern-edu-platform',
    audience: 'mern-edu-client',
  });
};

/**
 * Generate JWT Refresh Token (long-lived)
 * @param {Object} payload - User data to embed in token
 * @returns {string} Signed refresh token
 */
const generateRefreshToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
    issuer: 'mern-edu-platform',
    audience: 'mern-edu-client',
  });
};

/**
 * Verify access token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, process.env.JWT_ACCESS_SECRET, {
    issuer: 'mern-edu-platform',
    audience: 'mern-edu-client',
  });
};

/**
 * Verify refresh token
 * @param {string} token - Refresh token to verify
 * @returns {Object} Decoded token payload
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET, {
    issuer: 'mern-edu-platform',
    audience: 'mern-edu-client',
  });
};

/**
 * Generate both access and refresh tokens for a user
 * @param {Object} user - User document from MongoDB
 * @returns {Object} { accessToken, refreshToken }
 */
const generateTokenPair = (user) => {
  const payload = {
    id: user._id,
    email: user.email,
    role: user.role,
    firstName: user.firstName,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken({ id: user._id });

  return { accessToken, refreshToken };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokenPair,
};
