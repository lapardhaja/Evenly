import { v4 as uuidv4 } from 'uuid';

export const SELF_PERSON_NAME = 'Me';

function formatProfileFullName(profile) {
  if (!profile) return '';
  const f = profile.first_name?.trim();
  const l = profile.last_name?.trim();
  if (f && l) return `${f} ${l}`;
  if (f) return f;
  if (l) return l;
  return profile.display_name?.trim() || '';
}

function metaString(user, key) {
  const value = user?.user_metadata?.[key];
  return typeof value === 'string' ? value.trim() : '';
}

function profileString(profile, key) {
  const value = profile?.[key];
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
export function isHandleLikePersonName(name, user, profile) {
  const n = typeof name === 'string' ? name.trim() : '';
  if (!n) return true;
  if (n.includes('@')) return true;
  const username = authUsername(user) || profileString(profile, 'username');
  const handle = authEmailHandle(user);
  if (username && n.toLowerCase() === username.toLowerCase()) return true;
  if (handle && n.toLowerCase() === handle.toLowerCase()) return true;
  return false;
}

/** Stored self labels that should be replaced with the real profile name. */
export function isReplaceableSelfName(name, user, profile) {
  const n = typeof name === 'string' ? name.trim() : '';
  if (!n) return true;
  if (n.toLowerCase() === SELF_PERSON_NAME.toLowerCase()) return true;
  return isHandleLikePersonName(n, user, profile);
}

function firstNonHandleName(candidates, user, profile) {
  for (const raw of candidates) {
    const name = typeof raw === 'string' ? raw.trim() : '';
    if (name && !isHandleLikePersonName(name, user, profile)) return name;
  }
  return '';
}

export function preferredSelfPersonName(user, profile) {
  if (!user?.id) return SELF_PERSON_NAME;
  const fromProfile = formatProfileFullName(profile);
  const fromMetaParts = [metaString(user, 'first_name'), metaString(user, 'last_name')]
    .filter(Boolean)
    .join(' ');
  return (
    firstNonHandleName(
      [fromProfile, profileString(profile, 'display_name'), fromMetaParts, metaString(user, 'display_name')],
      user,
      profile,
    ) || SELF_PERSON_NAME
  );
}

export function isSelfPerson(person, userId) {
  return Boolean(person?.linkedUserId && userId && person.linkedUserId === userId);
}

export function personDisplayName(person, user, profile) {
  if (isSelfPerson(person, user?.id) && isReplaceableSelfName(person?.name, user, profile)) {
    return preferredSelfPersonName(user, profile);
  }
  return person?.name || '';
}

export function personRowCaption(person, userId) {
  if (isSelfPerson(person, userId)) return 'You';
  if (person?.linkedUserId) return 'Friend account';
  return null;
}

export function relabelPeopleForDisplay(people, user, profile) {
  if (!Array.isArray(people)) return [];
  return people.map((person) => {
    const name = personDisplayName(person, user, profile);
    return name === person.name ? person : { ...person, name };
  });
}

export function relabelSelfPeopleMap(peopleMap, user, profile) {
  if (!peopleMap || typeof peopleMap !== 'object') return peopleMap;
  let changed = false;
  const next = {};
  for (const [id, person] of Object.entries(peopleMap)) {
    const name = personDisplayName({ ...person, id }, user, profile);
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
 * @param {{ first_name?: string, last_name?: string, display_name?: string } | null} [profile]
 */
export function getDefaultPeopleMapForNewGroup(user, profile) {
  const id = uuidv4();
  if (!user?.id) {
    return { [id]: { name: SELF_PERSON_NAME } };
  }
  return {
    [id]: { name: preferredSelfPersonName(user, profile), linkedUserId: user.id },
  };
}
