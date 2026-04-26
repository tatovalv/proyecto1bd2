/**
 * Rate limiting (express-rate-limit en paso posterior).
 */

export function authRateLimiter() {
  return (_req, _res, next) => next();
}
