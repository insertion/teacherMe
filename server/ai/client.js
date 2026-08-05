import { get, run, all } from '../db.js'

export function getConfig() {
  const row = get('SELECT * FROM ai_config WHERE id=1')
  return row || { base_url: 'https://api.openai.com/v1', api_key: '', model: 'gpt-4o-mini' }
}

export async function chat(messages, apiKey, options = {}) {
  if (!apiKey) {
    const err = new Error('未配置 AI API Key,请先在设置中填写')
    err.code = 'NO_KEY'
    throw err
  }

  const cfg = getConfig()
  const url = `${cfg.base_url.replace(/\/$/, '')}/chat/completions`
  const body = {
    model: cfg.model || 'gpt-4o-mini',
    messages,
    temperature: options.temperature ?? 0.7,
    stream: false,
  }
  if (options.max_tokens) body.max_tokens = options.max_tokens

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), options.timeout || 60000)

  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!resp.ok) {
      const text = await resp.text()
      let msg = `AI 接口错误 (${resp.status})`
      try {
        const j = JSON.parse(text)
        msg = j.error?.message || j.message || msg
      } catch {}
      throw new Error(msg)
    }

    const data = await resp.json()
    const answer = data.choices?.[0]?.message?.content || ''
    const tokens = data.usage?.total_tokens || 0
    return { answer, tokens }
  } finally {
    clearTimeout(timeout)
  }
}

export function logAI(scene, question, answer, tokens) {
  run('INSERT INTO ai_logs (scene,question,answer,tokens) VALUES (?,?,?,?)',
    [scene, question || '', answer, tokens || 0])
}
