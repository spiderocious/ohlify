// Tiny fetch wrapper. Pulls API base + admin token from localStorage so
// pages don't need their own settings UI. Use settings.html to edit.

const STORAGE_KEY = 'ohlify-test-area-settings';

const DEFAULTS = {
  apiBase: 'http://localhost:8082',
  adminToken: '',
  bearerToken: '',
};

export function getSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

export function setSettings(patch) {
  const next = { ...getSettings(), ...patch };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}

function buildHeaders(opts = {}) {
  const s = getSettings();
  const h = { 'Content-Type': 'application/json' };
  if (opts.admin && s.adminToken) h['X-Admin-Token'] = s.adminToken;
  if (opts.bearer && s.bearerToken) h['Authorization'] = `Bearer ${s.bearerToken}`;
  return { ...h, ...(opts.headers || {}) };
}

export async function api(path, opts = {}) {
  const s = getSettings();
  const url = path.startsWith('http') ? path : `${s.apiBase}${path}`;
  const init = {
    method: opts.method || 'GET',
    headers: buildHeaders(opts),
  };
  if (opts.body !== undefined) init.body = JSON.stringify(opts.body);

  const res = await fetch(url, init);
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, ok: res.ok, body };
}

// Render the result of an api() call into a <pre> element. Color-coded by
// status. Pass a string id or an element.
export function renderResult(target, result) {
  const el = typeof target === 'string' ? document.getElementById(target) : target;
  if (!el) return;
  const color =
    result.status >= 500 ? '#ff6b6b' : result.status >= 400 ? '#ffc266' : '#6bd49a';
  el.style.borderLeft = `3px solid ${color}`;
  el.textContent = `${result.status}\n\n${JSON.stringify(result.body, null, 2)}`;
}

// Confirm dialog showing the exact request that's about to fire. Returns
// true if the user confirms.
export function confirmRequest(method, path, body) {
  const summary = `${method} ${path}\n\n${body !== undefined ? JSON.stringify(body, null, 2) : '(no body)'}`;
  return window.confirm(`Send this request?\n\n${summary}`);
}
