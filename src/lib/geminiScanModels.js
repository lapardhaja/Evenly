export const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
export const FALLBACK_MODELS = ['gemini-3.1-flash-lite'];

export function geminiUrl(model, apiKey) {
  const m = encodeURIComponent(model);
  return `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(apiKey)}`;
}

export function geminiModelQueue(preferred) {
  const models = [];
  const add = (id) => {
    const m = String(id || '').trim();
    if (m && !models.includes(m)) models.push(m);
  };
  add(preferred);
  add(DEFAULT_MODEL);
  for (const id of FALLBACK_MODELS) add(id);
  return models;
}

export function isRetiredGeminiModelError(status, data) {
  if (status === 404) return true;
  const err = data?.error;
  const code = err?.status || err?.code;
  if (code === 'NOT_FOUND' || code === 404) return true;
  const msg = typeof err?.message === 'string' ? err.message : '';
  return /no longer available|was not found or your project does not have access/i.test(msg);
}

export async function generateContentWithFallback({
  fetchImpl,
  apiKey,
  models,
  requestBody,
}) {
  const fetchFn = fetchImpl || fetch;
  let last = {
    ok: false,
    status: 502,
    errorMessage: 'Gemini request failed',
    data: null,
    model: models[0],
  };

  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    const response = await fetchFn(geminiUrl(model, apiKey), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    const data = await response.json().catch(() => ({}));
    if (response.ok) {
      return { ok: true, data, model };
    }
    const errorMessage = data?.error?.message || 'Gemini request failed';
    last = { ok: false, status: response.status, errorMessage, data, model };
    const hasMore = i < models.length - 1;
    if (hasMore && isRetiredGeminiModelError(response.status, data)) continue;
    return last;
  }

  return last;
}
