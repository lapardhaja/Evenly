/** Stack item×person assignment as cards on narrow viewports (below MUI md). */
export function shouldUseStackedItems(isNarrow) {
  return Boolean(isNarrow);
}

export function itemHighlightNeeded({ assigned, quantity }) {
  const qty = Number(quantity) || 0;
  const got = Number(assigned) || 0;
  return got < qty;
}

export function itemAssignCaption({ quantity, assignedShares, assignedPeople }) {
  const qty = Math.floor(Number(quantity) || 0);
  if (qty === 1) {
    const n = Number(assignedPeople) || 0;
    if (n <= 0) return 'Unassigned';
    return n === 1 ? '1 person' : `${n} people`;
  }
  return `${Number(assignedShares) || 0}/${quantity} assigned`;
}
