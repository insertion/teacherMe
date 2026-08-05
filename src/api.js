const BASE = '/api'

async function request(path, options = {}) {
  const body = options.body ? JSON.stringify(options.body) : undefined
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
    body,
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(msg || res.statusText)
  }
  const ct = res.headers.get('content-type') || ''
  return ct.includes('json') ? res.json() : res.text()
}

export const api = {
  students: {
    list: () => request('/students'),
    get: (id) => request(`/students/${id}`),
    create: (data) => request('/students', { method: 'POST', body: data }),
    update: (id, data) => request(`/students/${id}`, { method: 'PUT', body: data }),
    remove: (id) => request(`/students/${id}`, { method: 'DELETE' }),
  },
  sessions: {
    list: (params) => request('/sessions' + (params ? '?' + new URLSearchParams(params) : '')),
    create: (data) => request('/sessions', { method: 'POST', body: data }),
    update: (id, data) => request(`/sessions/${id}`, { method: 'PUT', body: data }),
    remove: (id) => request(`/sessions/${id}`, { method: 'DELETE' }),
    summary: (params) => request('/sessions/stats/summary' + (params ? '?' + new URLSearchParams(params) : '')),
  },
  knowledge: {
    list: (params) => request('/knowledge' + (params ? '?' + new URLSearchParams(params) : '')),
    create: (data) => request('/knowledge', { method: 'POST', body: data }),
    update: (id, data) => request(`/knowledge/${id}`, { method: 'PUT', body: data }),
    remove: (id) => request(`/knowledge/${id}`, { method: 'DELETE' }),
  },
  feedbacks: {
    list: (params) => request('/feedbacks' + (params ? '?' + new URLSearchParams(params) : '')),
    create: (data) => request('/feedbacks', { method: 'POST', body: data }),
    update: (id, data) => request(`/feedbacks/${id}`, { method: 'PUT', body: data }),
    remove: (id) => request(`/feedbacks/${id}`, { method: 'DELETE' }),
  },
  trainings: {
    list: (params) => request('/trainings' + (params ? '?' + new URLSearchParams(params) : '')),
    create: (data) => request('/trainings', { method: 'POST', body: data }),
    update: (id, data) => request(`/trainings/${id}`, { method: 'PUT', body: data }),
    remove: (id) => request(`/trainings/${id}`, { method: 'DELETE' }),
  },
  schedule: {
    week: (date) => request('/schedule/week' + (date ? '?date=' + date : '')),
    day: (date) => request('/schedule/day' + (date ? '?date=' + date : '')),
    month: (date) => request('/schedule/month' + (date ? '?date=' + date : '')),
  },
  ai: {
    getConfig: () => request('/ai/config'),
    saveConfig: (data) => request('/ai/config', { method: 'POST', body: data }),
    students: () => request('/ai/students'),
    history: (limit) => request('/ai/history' + (limit ? '?limit=' + limit : '')),
    removeHistory: (id) => request(`/ai/history/${id}`, { method: 'DELETE' }),
    scheduleAdvice: (data) => request('/ai/schedule-advice', { method: 'POST', body: data }),
    studyAdvice: (data) => request('/ai/study-advice', { method: 'POST', body: data }),
    trainingPlan: (data) => request('/ai/training-plan', { method: 'POST', body: data }),
    parentSummary: (data) => request('/ai/parent-summary', { method: 'POST', body: data }),
    workbenchSummary: (data) => request('/ai/workbench-summary', { method: 'POST', body: data }),
  },
  englishKB: {
    all: () => request('/english-kb'),
    grades: () => request('/english-kb/grades'),
    grade: (idx) => request(`/english-kb/grade/${idx}`),
    import: (data) => request('/english-kb/import', { method: 'POST', body: data }),
  },
}
