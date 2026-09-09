import { getSupabase, isSupabaseConfigured } from './supabaseClient.js';
import { clipMessageBody, buildPaymentPayload, parsePaymentPayload } from './chatPayment.js';

function clientOrThrow() {
  if (!isSupabaseConfigured()) throw new Error('Supabase not configured');
  const client = getSupabase();
  if (!client) throw new Error('Supabase not configured');
  return client;
}

export async function listMyConversations() {
  const supabase = clientOrThrow();
  const { data, error } = await supabase.rpc('list_my_conversations');
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function countUnreadConversations() {
  const supabase = clientOrThrow();
  const { data, error } = await supabase.rpc('count_unread_conversations');
  if (error) return 0;
  return typeof data === 'number' ? data : 0;
}

export async function listDmCandidates() {
  const supabase = clientOrThrow();
  const { data, error } = await supabase.rpc('list_dm_candidates');
  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getOrCreateDm(otherUserId) {
  const supabase = clientOrThrow();
  const { data, error } = await supabase.rpc('get_or_create_dm', {
    p_other_user_id: otherUserId,
  });
  if (error) throw error;
  return data;
}

export async function getGroupConversation(groupId) {
  const supabase = clientOrThrow();
  const { data, error } = await supabase.rpc('get_group_conversation', {
    p_group_id: groupId,
  });
  if (error) throw error;
  return data;
}

export async function markConversationRead(conversationId) {
  const supabase = clientOrThrow();
  const { error } = await supabase.rpc('mark_conversation_read', {
    p_conversation_id: conversationId,
  });
  if (error) throw error;
}

export async function fetchConversation(conversationId) {
  const supabase = clientOrThrow();
  const { data, error } = await supabase
    .from('conversations')
    .select('id, kind, group_id, dm_user_a, dm_user_b, created_at')
    .eq('id', conversationId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchConversationMembers(conversationId) {
  const supabase = clientOrThrow();
  const { data, error } = await supabase
    .from('conversation_members')
    .select('user_id')
    .eq('conversation_id', conversationId);
  if (error) throw error;
  return (data || []).map((r) => r.user_id);
}

export async function listMessages(conversationId, { limit = 200 } = {}) {
  const supabase = clientOrThrow();
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, type, body, payload, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function sendTextMessage(conversationId, body) {
  const supabase = clientOrThrow();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const clipped = clipMessageBody(body);
  if (!clipped) throw new Error('Message is empty.');
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      type: 'text',
      body: clipped,
      payload: null,
    })
    .select('id, conversation_id, sender_id, type, body, payload, created_at')
    .single();
  if (error) throw error;
  return data;
}

export async function sendPaymentMessage(conversationId, paymentFields) {
  const supabase = clientOrThrow();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  const payload = buildPaymentPayload(paymentFields);
  if (!payload.amount) throw new Error('Amount is required.');
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      type: 'payment',
      body: '',
      payload,
    })
    .select('id, conversation_id, sender_id, type, body, payload, created_at')
    .single();
  if (error) throw error;
  return data;
}

export async function markPaymentPaid(messageId) {
  const supabase = clientOrThrow();
  const { data, error } = await supabase.rpc('mark_payment_paid', {
    p_message_id: messageId,
  });
  if (error) throw error;
  return data;
}

export async function cancelPaymentRequest(messageId) {
  const supabase = clientOrThrow();
  const { error } = await supabase.rpc('cancel_payment_request', {
    p_message_id: messageId,
  });
  if (error) throw error;
}

export function subscribeToConversationMessages(conversationId, onChange) {
  const supabase = getSupabase();
  if (!supabase || !conversationId) return () => {};
  const channel = supabase
    .channel(`evenly-messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onChange(payload);
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToAllMessages(onInsert) {
  const supabase = getSupabase();
  if (!supabase) return () => {};
  const channel = supabase
    .channel('evenly-messages-inbox')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages' },
      (payload) => {
        onInsert(payload);
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

export function notifyChatUnreadChanged() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('evenly-chat-unread-changed'));
  }
}

export { parsePaymentPayload };
