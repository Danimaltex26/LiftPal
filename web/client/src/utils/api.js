import { supabase } from './supabase';

const API_ROOT = import.meta.env.VITE_API_URL || '';
const BASE = API_ROOT + '/api';

async function getToken() {
  const { data } = await supabase.auth.getSession();
  return data?.session?.access_token || null;
}

async function request(path, options = {}) {
  const token = await getToken();
  const headers = { ...options.headers };

  if (token) headers['Authorization'] = 'Bearer ' + token;
  if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  try {
    const res = await fetch(BASE + path, { ...options, headers });
    if (!res.ok) {
      let message = 'Request failed (' + res.status + ')';
      try { const body = await res.json(); message = body.error || body.message || message; } catch {}
      throw new Error(message);
    }
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) return await res.json();
    return await res.text();
  } catch (err) {
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      throw new Error('Network error. Please check your connection and try again.');
    }
    throw err;
  }
}

export function apiGet(path) { return request(path, { method: 'GET' }); }
export function apiPost(path, body) { return request(path, { method: 'POST', body: JSON.stringify(body) }); }
export function apiPatch(path, body) { return request(path, { method: 'PATCH', body: JSON.stringify(body) }); }
export function apiDelete(path) { return request(path, { method: 'DELETE' }); }
export function apiUpload(path, formData) { return request(path, { method: 'POST', body: formData }); }
