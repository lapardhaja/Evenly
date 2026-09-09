import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';
import { resolveCorsAllowOrigin, getRequestOrigin } from './scanGuard.js';
import {
  bearerToken,
  buildChatPushPayload,
  chatPushEnv,
  isGonePushStatus,
  recipientUserIds,
  vapidReady,
} from './chatPushCore.js';

function applyCors(req, res, env) {
  const allowOrigin = resolveCorsAllowOrigin(req, env);
  if (allowOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
}

function senderDisplayName(profile) {
  const f = profile?.first_name?.trim();
  const l = profile?.last_name?.trim();
  if (f && l) return `${f} ${l}`;
  if (f) return f;
  if (l) return l;
  return (profile?.display_name || profile?.username || '').trim();
}

function readMessageId(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return '';
    }
  }
  return typeof body?.messageId === 'string' ? body.messageId.trim() : '';
}

export default async function handler(req, res) {
  const env = chatPushEnv();

  if (req.method === 'OPTIONS') {
    const allowOrigin = resolveCorsAllowOrigin(req, env);
    if (getRequestOrigin(req) && !allowOrigin) {
      return res.status(403).end();
    }
    applyCors(req, res, env);
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    applyCors(req, res, env);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const allowed = parseAllowedOriginsSafe(env);
  const origin = getRequestOrigin(req);
  if (allowed.length > 0 && origin && !allowed.includes(origin)) {
    applyCors(req, res, env);
    return res.status(403).json({ error: 'Origin not allowed' });
  }

  applyCors(req, res, env);

  if (!vapidReady(env) || !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: 'Push is not configured' });
  }

  const token = bearerToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const messageId = readMessageId(req);
  if (!messageId) {
    return res.status(400).json({ error: 'messageId required' });
  }

  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
  if (!anonKey) {
    return res.status(503).json({ error: 'Push is not configured' });
  }

  try {
    const userClient = createClient(env.SUPABASE_URL, anonKey, {
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

    const { data: message, error: msgErr } = await admin
      .from('messages')
      .select('id, conversation_id, sender_id, type, body')
      .eq('id', messageId)
      .maybeSingle();
    if (msgErr || !message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    if (message.sender_id !== userId) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { data: members } = await admin
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', message.conversation_id);
    const targets = recipientUserIds(
      (members || []).map((m) => m.user_id),
      message.sender_id,
    );
    if (targets.length === 0) {
      return res.status(204).end();
    }

    const { data: profile } = await admin
      .from('profiles')
      .select('first_name, last_name, username, display_name')
      .eq('user_id', message.sender_id)
      .maybeSingle();

    const payload = buildChatPushPayload({
      senderName: senderDisplayName(profile),
      message,
    });

    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('user_id, endpoint, p256dh, auth')
      .in('user_id', targets);

    webpush.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);

    const body = JSON.stringify(payload);
    for (const sub of subs || []) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body,
        );
      } catch (err) {
        if (isGonePushStatus(err?.statusCode)) {
          await admin
            .from('push_subscriptions')
            .delete()
            .eq('user_id', sub.user_id)
            .eq('endpoint', sub.endpoint);
        }
      }
    }

    return res.status(204).end();
  } catch (err) {
    console.error('chat-push error:', err);
    return res.status(500).json({ error: 'Failed to send push' });
  }
}

function parseAllowedOriginsSafe(env) {
  const raw = env.CORS_ALLOW_ORIGIN;
  if (!raw || typeof raw !== 'string') return [];
  return raw.split(',').map((part) => part.trim()).filter(Boolean);
}
