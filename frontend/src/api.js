const BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000'

async function req(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const api = {
  getSubjects: () => req('GET', '/subjects'),
  createSubject: (name) => req('POST', '/subjects', { name }),
  deleteSubject: (id) => req('DELETE', `/subjects/${id}`),

  getSessions: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()
    return req('GET', '/sessions' + (qs ? `?${qs}` : ''))
  },
  createSession: (subject_id, duration) => req('POST', '/sessions', { subject_id, duration }),
  deleteSession: (id) => req('DELETE', `/sessions/${id}`),

  getStats: () => req('GET', '/stats'),
}
