import { v4 as uuidv4 } from 'uuid';

export const SELF_PERSON_NAME = 'Me';

function metaString(user, key) {
  const value = user?.user_metadata?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

export function authUsername(user) {
  return metaString(user, 'username');
}

export function authEmailHandle(user) {
  const email = typeof user?.email === 'string' ? user.email.trim() : '';
  if (email.includes('@')) return email.split('@')[0].trim();
  return '';
}

/** Username / email local-part — not a display name. */
export function isHandleLikePersonName(name, user) {
  const n = typeof name === 'string' ? name.trim() : '';
  if (!n) return true;
  if (n.includes('@')) return true;
  const username = authUsername(user);
  const handle = authEmailHandle(user);
  if (username && n.toLowerCase() === username.toLowerCase()) return true;
  if (handle && n.toLowerCase() === handle.toLowerCase()) return true;
  return false;
}

export function preferredSelfPersonName(user) {
  if (!user?.id) return SELF_PERSON_NAME;
  const fromParts = [metaString(user, 'first_name'), metaString(user, 'last_name')]
    .filter(Boolean)
    .join(' ');
  const display = metaString(user, 'display_name');
  if (fromParts && !isHandleLikePersonName(fromParts, user)) return fromParts;
  if (display && !isHandleLikePersonName(display, user)) return display;
  return SELF_PERSON_NAME;
}

export function isSelfPerson(person, userId) {
  return Boolean(person?.linkedUserId && userId && person.linkedUserId === userId);
}

export function personDisplayName(person, user) {
  if (isSelfPerson(person, user?.id) && isHandleLikePersonName(person?.name, user)) {
    return preferredSelfPersonName(user);
  }
  return person?.name || '';
}

export function personRowCaption(person, userId) {
  if (isSelfPerson(person, userId)) return 'You';
  if (person?.linkedUserId) return 'Friend account';
  return null;
}

export function relabelPeopleForDisplay(people, user) {
  if (!Array.isArray(people)) return [];
  return people.map((person) => {
    const name = personDisplayName(person, user);
    return name === person.name ? person : { ...person, name };
  });
}

export function relabelSelfPeopleMap(peopleMap, user) {
  if (!peopleMap || typeof peopleMap !== 'object') return peopleMap;
  let changed = false;
  const next = {};
  for (const [id, person] of Object.entries(peopleMap)) {
    const name = personDisplayName({ ...person, id }, user);
    if (name !== person.name) {
      next[id] = { ...person, name };
      changed = true;
    } else {
      next[id] = person;
    }
  }
  return changed ? next : peopleMap;
}

/**
 * When creating a group, seed one person representing the current user (or "Me" when local-only).
 * Never use username / email handle as the visible name.
 * @param {{ id?: string, email?: string | null, user_metadata?: Record<string, unknown> } | null} user
 */
export function getDefaultPeopleMapForNewGroup(user) {
  const id = uuidv4();
  if (!user?.id) {
    return { [id]: { name: SELF_PERSON_NAME } };
  }
  return {
    [id]: { name: preferredSelfPersonName(user), linkedUserId: user.id },
  };
}
