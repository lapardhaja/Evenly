export const nameToInitials = (name) =>
  name
    .toUpperCase()
    .split(' ')
    .map((part) => part.charAt(0))
    .join('');

export const idMapToList = (input) =>
  Object.entries(input || {}).map(([id, value]) => ({ id, ...value }));
