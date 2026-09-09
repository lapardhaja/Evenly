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

function nativeTextControl(el) {
  if (!el) return null;
  const tag = typeof el.tagName === 'string' ? el.tagName.toUpperCase() : '';
  if (tag === 'INPUT' || tag === 'TEXTAREA') return el;
  return el.querySelector?.('textarea, input') || null;
}

/**
 * Copy from a visible input/textarea already on screen.
 * Hidden / readOnly nodes often report execCommand success but copy blank on iOS.
 */
export function copyFromInputElement(el, env = globalThis) {
  const node = nativeTextControl(el);
  if (!node || typeof node.value !== 'string' || !node.value) return false;
  const doc = env.document;
  if (!doc || typeof doc.execCommand !== 'function') return false;

  const prevReadOnly = node.readOnly;
  const prevContentEditable = node.contentEditable;
  try {
    node.readOnly = false;
    node.contentEditable = 'true';
    node.focus?.();
    node.select?.();
    node.setSelectionRange?.(0, node.value.length);
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
    node.readOnly = prevReadOnly;
    if (prevContentEditable != null) node.contentEditable = prevContentEditable;
  } catch {
    /* ignore */
  }
  return ok;
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
