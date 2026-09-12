/** Client-safe scan API errors. Never interpolate Gemini, env, or stack text into these. */

export const SCAN_UNAVAILABLE = 'Receipt scan is unavailable';
export const SCAN_FAILED = 'Receipt scan failed';
export const SCAN_RATE_LIMITED = 'Too many requests';
