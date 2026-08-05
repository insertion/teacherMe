import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { marked } from 'marked'
import { api } from '../api'
import { Modal, Field } from '../components/UI'

const SCENES = [
  { key: 'scheduleAdvice', label: '排课建议', icon: '📅', needStudent: false,
    desc: '读取课表与通勤信息,评估排课密度、间隔、通勤冲突,给出调整方案' },
  { key: 'workbenchSummary', label: '工作台总结', icon: '📊', needStudent: false,
    desc: '读取全量数据(学生/课时/知识点/反馈/训练),给出全局工作建议' },
  { key: 'studyAdvice', label: '学习建议', icon: '🎓', needStudent: true,
    desc: '读取学生知识点掌握+课堂表现+反馈历史,给出下一步学习方向' },
  { key: 'trainingPlan', label: '训练方案', icon: '💪', needStudent: true,
    desc: '基于薄弱知识点生成具体训练计划,含题量、时长、验收标准' },
  { key: 'parentSummary', label: '家长总结', icon: '💬', needStudent: true,
    desc: '生成给家长的阶段性学习总结,适合微信发送' },
]

export default function AIAdvice({ onToast }) {
  const [students, setStudents] = useState([])
  const [config, setConfig] = useState(null)
  const [activeScene, setActiveScene] = useState(null)
  const [studentId, setStudentId] = useState('')
  const [question, setQuestion] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [showConfig, setShowConfig] = useState(false)
  const [configForm, setConfigForm] = useState({ base_url: '', api_key: '', model: '' })
  const [apiKey, setApiKey] = useState('')

  const load = useCallback(async () => {
    const [sts, cfg, hst] = await Promise.all([
      api.ai.students(),
      api.ai.getConfig(),
      api.ai.history(10),
    ])
    setStudents(sts)
    setConfig(cfg)
    setHistory(hst)
  }, [])

  useEffect(() => { load() }, [load])

  const openConfig = () => {
    setConfigForm({
      base_url: config?.base_url || 'https://api.openai.com/v1',
      api_key: '',
      model: config?.model || 'gpt-4o-mini',
    })
    setShowConfig(true)
  }

  const saveConfig = async () => {
    const data = { base_url: configForm.base_url, model: configForm.model }
    if (configForm.api_key) setApiKey(configForm.api_key)
    await api.ai.saveConfig(data)
    onToast?.('配置已保存')
    setShowConfig(false)
    load()
  }

  const runScene = async () => {
    const scene = SCENES.find((s) => s.key === activeScene)
    if (!scene) return
    if (!apiKey) {
      onToast?.('请先配置 AI API Key')
      openConfig()
      return
    }
    if (scene.needStudent && !studentId) {
      onToast?.('请先选择学生')
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const data = { api_key: apiKey }
      if (scene.needStudent) data.student_id = Number(studentId)
      if (question.trim()) data.question = question.trim()
      const r = await api.ai[activeScene](data)
      setResult(r.answer)
      const hst = await api.ai.history(10)
      setHistory(hst)
      onToast?.('生成完成')
    } catch (e) {
      onToast?.(e.message || '生成失败')
    } finally {
      setLoading(false)
    }
  }

  const copyResult = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result)
      onToast?.('已复制')
    } catch {
      onToast?.('复制失败')
    }
  }

  const viewHistory = (h) => {
    setActiveScene(null)
    setResult(h.answer)
    setQuestion('')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="page-title">AI 建议</div>
        <button className="btn-ghost btn-sm" onClick={openConfig}>
          ⚙ AI 设置 {apiKey ? '✓' : '⚠ 未配置'}
        </button>
      </div>

      {!apiKey && (
        <div className="card" style={{ background: '#fdf6ec', borderColor: 'var(--warning)' }}>
          <div style={{ fontWeight: 600, color: 'var(--warning)', marginBottom: 4 }}>⚠ 尚未配置 AI 接口</div>
          <div style={{ fontSize: 13, color: 'var(--text-light)' }}>
            请点击右上角「AI 设置」填写 API Key。支持 OpenAI 官方及所有兼容接口(DeepSeek、智谱、OpenRouter 等)。
          </div>
        </div>
      )}

      <div className="ai-scene-grid">
        {SCENES.map((s) => (
          <div
            key={s.key}
            className={`ai-scene-card ${activeScene === s.key ? 'active' : ''}`}
            onClick={() => { setActiveScene(s.key); setResult(null); setQuestion('') }}
          >
            <div className="ai-scene-icon">{s.icon}</div>
            <div className="ai-scene-label">{s.label}</div>
            <div className="ai-scene-desc">{s.desc}</div>
          </div>
        ))}
      </div>

      {activeScene && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ fontSize: 16 }}>
              {SCENES.find((s) => s.key === activeScene)?.icon} {SCENES.find((s) => s.key === activeScene)?.label}
            </h3>
            <button className="btn-ghost btn-sm" onClick={() => { setActiveScene(null); setResult(null); setQuestion('') }}>关闭</button>
          </div>

          {SCENES.find((s) => s.key === activeScene)?.needStudent && (
            <Field label="选择学生">
              <select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
                <option value="">请选择</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.grade || '-'} {s.subject || '-'})</option>
                ))}
              </select>
            </Field>
          )}

          <Field label="补充要求(可选)">
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="例:重点关注下周考试前的时间安排 / 想了解这个学生是否有必要增加课时"
              rows={2}
            />
          </Field>

          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <button className="btn" onClick={runScene} disabled={loading}>
              {loading ? '生成中…' : '🚀 生成建议'}
            </button>
            {result && <button className="btn-ghost btn-sm" onClick={copyResult}>复制结果</button>}
          </div>

          {loading && (
            <div className="ai-loading">
              <div className="ai-spinner" />
              <div>AI 正在分析数据,请稍候…</div>
            </div>
          )}

          {result && !loading && (
            <div className="ai-result">
              <MarkdownRender text={result} />
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="card">
          <h3 style={{ fontSize: 15, marginBottom: 12 }}>历史记录</h3>
          <div className="ai-history-list">
            {history.map((h) => (
              <div key={h.id} className="ai-history-item" onClick={() => viewHistory(h)}>
                <div className="ai-h-scene">
                  {SCENES.find((s) => s.key === h.scene)?.label || h.scene}
                </div>
                <div className="ai-h-preview">
                  {h.question ? `问:${h.question.slice(0, 40)}` : h.answer.slice(0, 50)}
                </div>
                <div className="ai-h-time">{h.created_at}</div>
                <button className="btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); viewHistory(h) }}>查看</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {showConfig && (
        <Modal title="AI 接口设置" onClose={() => setShowConfig(false)} onSubmit={saveConfig}>
          <Field label="接口地址 (Base URL)">
            <input value={configForm.base_url} onChange={(e) => setConfigForm((f) => ({ ...f, base_url: e.target.value }))} placeholder="https://api.openai.com/v1" />
          </Field>
          <Field label="API Key">
            <input type="password" value={configForm.api_key} onChange={(e) => setConfigForm((f) => ({ ...f, api_key: e.target.value }))} placeholder={apiKey ? '已设置,留空不改' : 'sk-...'} />
          </Field>
          <Field label="模型">
            <input value={configForm.model} onChange={(e) => setConfigForm((f) => ({ ...f, model: e.target.value }))} placeholder="gpt-4o-mini" />
          </Field>
          <div style={{ fontSize: 12, color: 'var(--text-light)', marginTop: 8, lineHeight: 1.6 }}>
            支持所有 OpenAI 兼容接口。常用配置:<br />
            • OpenAI 官方:https://api.openai.com/v1(模型:gpt-4o-mini / gpt-4o)<br />
            • DeepSeek:https://api.deepseek.com/v1(模型:deepseek-chat)<br />
            • 智谱 GLM:https://open.bigmodel.cn/api/paas/v4(模型:glm-4-flash)<br />
            • OpenRouter:https://openrouter.ai/api/v1(模型:openai/gpt-4o-mini)
          </div>
        </Modal>
      )}
    </div>
  )
}

function MarkdownRender({ text }) {
  const html = useMemo(() => marked.parse(text), [text])
  return <div className="md-output" dangerouslySetInnerHTML={{ __html: html }} />
}
