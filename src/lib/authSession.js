/**
 * Merge supabase-js auth events with the session we already have.
 * A null INITIAL_SESSION (common on iOS/PWA while storage hydrates) must not
 * wipe a session getSession already restored — that bounce used to send
 * signed-in users through /login and crash LoginPage's hooks.
 */
export function sessionAfterAuthEvent(event, incoming, previous) {
  if (event === 'SIGNED_OUT') return null;
  if (incoming) return incoming;
  return previous ?? null;
}
