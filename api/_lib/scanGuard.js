function headerValue(req, name) {
  const headers = req?.headers ?? {};
  const lower = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === lower && typeof value === 'string') {
      return value;
    }
  }
  return undefined;
}

export function parseAllowedOrigins(env = {}) {
  const raw = env.CORS_ALLOW_ORIGIN;
  if (!raw || typeof raw !== 'string') return [];
  return raw.split(',').map((part) => part.trim()).filter(Boolean);
}

export function getRequestOrigin(req) {
  return headerValue(req, 'origin');
}

export function getRequestSecret(req) {
  return headerValue(req, 'x-evenly-scan-secret');
}

export function resolveCorsAllowOrigin(req, env = {}) {
  const allowed = parseAllowedOrigins(env);
  const requestOrigin = getRequestOrigin(req);

  if (allowed.length > 0) {
    if (requestOrigin && allowed.includes(requestOrigin)) {
      return requestOrigin;
    }
    return null;
  }

  return null;
}

export function assertScanRequestAllowed(req, env = {}) {
  const secret = env.SCAN_API_SECRET;
  if (secret) {
    if (getRequestSecret(req) !== secret) {
      return { ok: false, status: 401, error: 'Unauthorized' };
    }
  }

  const allowed = parseAllowedOrigins(env);
  const requestOrigin = getRequestOrigin(req);
  if (allowed.length > 0 && requestOrigin && !allowed.includes(requestOrigin)) {
    return { ok: false, status: 403, error: 'Origin not allowed' };
  }

  return { ok: true };
}
