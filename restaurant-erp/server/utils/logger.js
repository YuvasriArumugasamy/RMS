/**
 * logger.js — Environment-aware logger
 *
 * Production-la console.log silent aagum.
 * Development-la full output kaatturum.
 * console.error is always kept (critical errors must surface everywhere).
 */

const isDev = process.env.NODE_ENV !== 'production';

const logger = {
  /** General info — silent in production */
  log: (...args) => {
    if (isDev) console.log(...args);
  },

  /** Warnings — silent in production */
  warn: (...args) => {
    if (isDev) console.warn(...args);
  },

  /** Errors — ALWAYS shown (production + development) */
  error: (...args) => {
    console.error(...args);
  },

  /** Startup info — shown always (one-time server boot messages) */
  info: (...args) => {
    console.log(...args);
  },
};

module.exports = logger;
