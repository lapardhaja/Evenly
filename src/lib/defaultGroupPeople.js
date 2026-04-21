import { v4 as uuidv4 } from 'uuid';

/**
 * When creating a group, seed one person representing the current user (or "Me" when local-only).
 * @param {{ id?: string, email?: string | null, user_metadata?: Record<string, unknown> } | null} user
 */
export function getDefaultPeopleMapForNewGroup(user) {
  const id = uuidv4();
  if (!user?.id) {
    return { [id]: { name: 'Me' } };
  }
  const m = user.user_metadata || {};
  const display =
    (typeof m.display_name === 'string' && m.display_name.trim()) ||
    [m.first_name, m.last_name].filter(Boolean).join(' ').trim() ||
    (typeof m.username === 'string' && m.username.trim()) ||
    (typeof user.email === 'string' && user.email.includes('@')
      ? user.email.split('@')[0].trim()
      : '') ||
    'Me';
  return {
    [id]: { name: display, linkedUserId: user.id },
  };
}
