/** Digits and at most one decimal point (for money / decimals). */
export function sanitizeDecimalString(s) {
  if (s == null) return '';
  let out = '';
  let sawDot = false;
  for (const ch of String(s)) {
    if (ch >= '0' && ch <= '9') out += ch;
    else if (ch === '.' && !sawDot) {
      out += ch;
      sawDot = true;
    }
  }
  return out;
}

/** Digits only (whole numbers). */
export function sanitizeIntegerString(s) {
  if (s == null) return '';
  return String(s).replace(/\D/g, '');
}
