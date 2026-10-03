const API = 'http://localhost:4000/api';

async function req(path: string, init?: RequestInit) {
  const r = await fetch(API + path, { credentials: 'include', ...init });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  health: () => req('/health'),
  authStatus: () => req('/auth/status'),
  settings: () => req('/settings'),
  updateSettings: (body: any) =>
    req('/settings', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    }),
  login: () => (window.location.href = API + '/auth/google'),
  logout: () => req('/auth/logout', { method: 'POST' }),

  parse: (input: string) =>
    req('/commands/parse', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ input })
    }),

  execute: (action: any, confirmed = false) =>
    req('/actions/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action, confirmed })
    }),

  calendar: () => req('/calendar'),
  addCalendarEvent: (body: any) =>
    req('/calendar', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    }),
  deleteCalendarEvent: (id: string) =>
    req(`/calendar/${id}`, { method: 'DELETE' }),

  reminders: () => req('/reminders'),
  addReminder: (body: any) =>
    req('/reminders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    }),
  toggleReminder: (id: string, done: boolean) =>
    req(`/reminders/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ done })
    }),
  deleteReminder: (id: string) =>
    req(`/reminders/${id}`, { method: 'DELETE' }),

  drive: (q = '') => req('/drive' + (q ? '?q=' + encodeURIComponent(q) : '')),
  createFolder: (name: string, parentId?: string) =>
    req('/drive/folders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name, parentId })
    }),
  deleteDriveFile: (id: string) =>
    req(`/drive/${id}`, { method: 'DELETE' }),

  upload: async (file: File, parentId?: string) => {
    const f = new FormData();
    f.append('file', file);
    if (parentId) f.append('parentId', parentId);
    return req('/drive/upload', { method: 'POST', body: f });
  },

  comms: () => req('/comms'),
  history: () => req('/history'),
  clearHistory: () => req('/history/clear', { method: 'POST' })
};
