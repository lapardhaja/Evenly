/**
 * Copy text in a user-gesture.
 *
 * iOS PWAs often expose `navigator.clipboard.writeText` but reject with
 * NotAllowedError *after* an await, which burns the tap's user activation so
 * a later `execCommand('copy')` also fails. Run the sync fallback first.
 */
export async function copyPlainText(text, env = globalThis) {
  const value = typeof text === 'string' ? text.trim() : '';
  if (!value) return false;

  if (copyViaExecCommand(value, env)) return true;

  try {
    if (env.navigator?.clipboard?.writeText) {
      await env.navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* iOS / insecure context / denied */
  }

  return false;
}

function copyViaExecCommand(text, env) {
  const doc = env.document;
  if (!doc?.body || typeof doc.createElement !== 'function') return false;

  const ta = doc.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  ta.setAttribute('aria-hidden', 'true');
  const st = ta.style;
  if (st) {
    st.position = 'fixed';
    st.top = '0';
    st.left = '0';
    st.width = '2em';
    st.height = '2em';
    st.opacity = '0.01';
    st.padding = '0';
    st.border = '0';
    st.outline = 'none';
    st.fontSize = '16px';
    st.background = 'transparent';
    st.userSelect = 'text';
    st.webkitUserSelect = 'text';
  }
  doc.body.appendChild(ta);
  try {
    ta.contentEditable = 'true';
    ta.readOnly = false;
    ta.focus?.();
    ta.select?.();
    ta.setSelectionRange?.(0, text.length);
    const sel = typeof env.getSelection === 'function' ? env.getSelection() : null;
    if (sel && typeof doc.createRange === 'function') {
      const range = doc.createRange();
      range.selectNodeContents(ta);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  } catch {
    /* still try execCommand */
  }

  let ok = false;
  try {
    ok = !!doc.execCommand('copy');
  } catch {
    ok = false;
  }
  try {
    doc.body.removeChild(ta);
  } catch {
    /* ignore */
  }
  return ok;
}
