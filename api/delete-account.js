import { createClient } from '@supabase/supabase-js';
import { resolveCorsAllowOrigin, getRequestOrigin } from './_lib/scanGuard.js';
import { applyApiSecurityHeaders } from './_lib/httpSecurity.js';
import { clientIp } from './_lib/rateLimit.js';
import { consumeRateLimit } from './_lib/durableRateLimit.js';
import { bearerToken } from './_lib/chatPushCore.js';
import { assertDeleteAccountRequest, deleteAccountWithAdmin } from './_lib/deleteAccountCore.js';

export const DELETE_ACCOUNT_RATE = { windowMs: 60 * 60 * 1000, max: 5 };

function envOf() {
  return {
    SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    CORS_ALLOW_ORIGIN: process.env.CORS_ALLOW_ORIGIN,
    VITE_SUPABASE_ANON_KEY: process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '',
  };
}

function applyCors(req, res, env) {
  const allowOrigin = resolveCorsAllowOrigin(req, env);
  if (allowOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
}

function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }
  return body && typeof body === 'object' ? body : {};
}

export default async function handler(req, res) {
  const env = envOf();
  applyApiSecurityHeaders(res);

  if (req.method === 'OPTIONS') {
    const allowOrigin = resolveCorsAllowOrigin(req, env);
    if (getRequestOrigin(req) && !allowOrigin) {
      return res.status(403).end();
    }
    applyCors(req, res, env);
    return res.status(204).end();
  }

  applyCors(req, res, env);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const limited = await consumeRateLimit({
    bucket: 'delete-account',
    ip: clientIp(req),
    ...DELETE_ACCOUNT_RATE,
  });
  if (!limited.ok) {
    res.setHeader('Retry-After', String(limited.retryAfterSec));
    return res.status(429).json({ error: 'Too many requests' });
  }

  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY || !env.VITE_SUPABASE_ANON_KEY) {
    return res.status(503).json({ error: 'Account deletion is not configured' });
  }

  const token = bearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const body = parseBody(req);
  if (body == null) {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }
  const check = assertDeleteAccountRequest(body);
  if (!check.ok) {
    return res.status(check.status).json({ error: check.error });
  }

  try {
    const userClient = createClient(env.SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    const userId = userData?.user?.id;
    if (userErr || !userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await deleteAccountWithAdmin(admin, userId);
    return res.status(204).end();
  } catch (err) {
    console.error('delete-account error:', err);
    return res.status(500).json({ error: 'Could not delete account' });
  }
}
