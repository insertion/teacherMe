import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import { Modal, Field } from '../components/UI'

const TEMPLATES = [
  '针对{知识点},建议每天完成 10 道基础题 + 3 道综合题,持续一周。',
  '{知识点}掌握不牢,建议先复习课本例题,再做配套练习册对应章节。',
  '加强对{知识点}的限时训练,每次 15 分钟内完成,提高答题速度。',
  '{知识点}已基本掌握,可尝试拓展题型,向竞赛难度延伸。',
]

export default function Trainings({ onToast }) {
  const [students, setStudents] = useState([])
  const [active, setActive] = useState(null)
  const [list, setList] = useState([])
  const [weakPoints, setWeakPoints] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [showDone, setShowDone] = useState(false)

  useEffect(() => { api.students.list().then((s) => { setStudents(s); if (s[0]) setActive(s[0].id) }) }, [])

  const load = useCallback(async () => {
    if (!active) return
    const [ts, kps] = await Promise.all([
      api.trainings.list({ student_id: active, done: showDone ? 1 : 0 }),
      api.knowledge.list({ student_id: active }),
    ])
    setList(ts)
    setWeakPoints(kps.filter((k) => k.status !== 'mastered' && (k.mastery || 0) < 80))
  }, [active, showDone])

  useEffect(() => { load() }, [load])

  const student = students.find((s) => s.id === active)

  const openNew = (presetPoint = '') => {
    setForm({ student_id: active, point: presetPoint, suggestion: '', done: false })
    setEditing('new')
  }
  const openEdit = (t) => { setForm({ ...t, done: !!t.done }); setEditing(t.id) }

  const save = async () => {
    if (!form.point?.trim()) return onToast?.('请填写针对的知识点')
    if (!form.suggestion?.trim()) return onToast?.('请填写训练建议')
    if (editing === 'new') await api.trainings.create(form)
    else await api.trainings.update(editing, form)
    onToast?.('已保存')
    setEditing(null)
    load()
  }

  const remove = async (t) => {
    if (!confirm('删除该训练建议?')) return
    await api.trainings.remove(t.id)
    load()
  }

  const toggleDone = async (t) => {
    await api.trainings.update(t.id, { ...t, done: t.done ? 0 : 1 })
    load()
  }

  const useTemplate = (tpl) => {
    const filled = tpl.replace(/{知识点}/g, form.point || '该知识点')
    setForm((f) => ({ ...f, suggestion: filled }))
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="page-title">针对性训练建议</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={showDone ? '1' : '0'} onChange={(e) => setShowDone(e.target.value === '1')} style={{ width: 'auto' }}>
            <option value="0">待完成</option>
            <option value="1">已完成</option>
          </select>
          {active && <button className="btn" onClick={() => openNew()}>+ 新增建议</button>}
        </div>
      </div>

      <div className="student-pick">
        {students.map((s) => (
          <span key={s.id} className={`chip ${active === s.id ? 'active' : ''}`} onClick={() => setActive(s.id)}>
            {s.name}
          </span>
        ))}
      </div>

      {!active ? <div className="card empty">请先添加学生</div> : (
        <>
          {weakPoints.length > 0 && !showDone && (
            <div className="card">
              <h3 style={{ fontSize: 15, marginBottom: 10 }}>薄弱知识点 · 一键生成训练</h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {weakPoints.map((k) => (
                  <button key={k.id} className="btn-ghost btn-sm" onClick={() => openNew(k.point)}>
                    {k.point} ({k.mastery}%)
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="card" style={{ padding: 0 }}>
            {list.length === 0 ? <div className="empty">暂无{showDone ? '已完成' : '待完成'}的训练建议</div> : (
              <table>
                <thead><tr><th style={{ width: 140 }}>知识点</th><th>训练建议</th><th style={{ width: 100 }}>状态</th><th style={{ width: 200 }}>操作</th></tr></thead>
                <tbody>
                  {list.map((t) => (
                    <tr key={t.id}>
                      <td>{t.point}</td>
                      <td style={{ whiteSpace: 'pre-wrap' }}>{t.suggestion}</td>
                      <td>
                        <span className={`badge ${t.done ? 'badge-done' : 'badge-pending'}`}>
                          {t.done ? '已完成' : '待完成'}
                        </span>
                      </td>
                      <td>
                        <button className="btn-ghost btn-sm" onClick={() => toggleDone(t)}>
                          {t.done ? '标记待完成' : '标记完成'}
                        </button>
                        <button className="btn-ghost btn-sm" style={{ marginLeft: 6 }} onClick={() => openEdit(t)}>编辑</button>
                        <button className="btn-ghost btn-sm" style={{ marginLeft: 6, color: 'var(--danger)' }} onClick={() => remove(t)}>删除</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {editing && (
        <Modal title={editing === 'new' ? '新增训练建议' : '编辑训练建议'} onClose={() => setEditing(null)} onSubmit={save}>
          <Field label="针对知识点 *"><input value={form.point || ''} onChange={(e) => setForm((f) => ({ ...f, point: e.target.value }))} placeholder="例:一元二次方程" /></Field>
          <div style={{ marginBottom: 12 }}>
            <label style={{ marginBottom: 6 }}>快捷模板</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {TEMPLATES.map((t, i) => (
                <button key={i} type="button" className="btn-ghost btn-sm" style={{ textAlign: 'left', padding: 8 }} onClick={() => useTemplate(t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <Field label="训练建议 *">
            <textarea rows={5} value={form.suggestion || ''} onChange={(e) => setForm((f) => ({ ...f, suggestion: e.target.value }))} placeholder="具体的训练方案、题量、时长等" />
          </Field>
          {editing !== 'new' && (
            <Field label="状态">
              <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="checkbox" checked={form.done} onChange={(e) => setForm((f) => ({ ...f, done: e.target.checked }))} style={{ width: 'auto' }} />
                已完成
              </label>
            </Field>
          )}
        </Modal>
      )}
    </div>
  )
}
