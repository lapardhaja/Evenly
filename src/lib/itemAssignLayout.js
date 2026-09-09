/** Stack item×person assignment as cards on narrow viewports (below MUI md). */
export function shouldUseStackedItems(isNarrow) {
  return Boolean(isNarrow);
}

export function itemHighlightNeeded({ assigned, quantity }) {
  const qty = Number(quantity) || 0;
  const got = Number(assigned) || 0;
  return got < qty;
}
