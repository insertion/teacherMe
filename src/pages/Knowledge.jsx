import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import { Modal, Field } from '../components/UI'

const STATUS = [
  { key: 'new', label: '未学', cls: 'badge-new' },
  { key: 'learning', label: '学习中', cls: 'badge-learning' },
  { key: 'mastered', label: '已掌握', cls: 'badge-mastered' },
]
const statusInfo = (k) => STATUS.find((s) => s.key === k) || STATUS[1]

const RADER_POINTS = [
  { name: '基础概念', desc: '定义、公式、定理等基础知识' },
  { name: '计算能力', desc: '运算速度与准确率' },
  { name: '逻辑推理', desc: '证明、推导、分析能力' },
  { name: '应用建模', desc: '应用题、实际问题建模' },
  { name: '综合运用', desc: '多知识点综合题' },
  { name: '应试技巧', desc: '答题规范、时间分配' },
]

export default function Knowledge({ onToast }) {
  const [students, setStudents] = useState([])
  const [active, setActive] = useState(null)
  const [list, setList] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})

  useEffect(() => { api.students.list().then((s) => { setStudents(s); if (s[0]) setActive(s[0].id) }) }, [])

  const load = useCallback(async () => {
    if (!active) return
    setList(await api.knowledge.list({ student_id: active }))
  }, [active])

  useEffect(() => { load() }, [load])

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const openNew = () => {
    setForm({ student_id: active, point: '', status: 'learning', mastery: 50, note: '' })
    setEditing('new')
  }
  const openEdit = (k) => { setForm({ ...k }); setEditing(k.id) }

  const save = async () => {
    if (!form.point?.trim()) return onToast?.('请输入知识点')
    if (editing === 'new') await api.knowledge.create(form)
    else await api.knowledge.update(editing, form)
    onToast?.('已保存')
    setEditing(null)
    load()
  }

  const remove = async (k) => {
    if (!confirm('删除该知识点?')) return
    await api.knowledge.remove(k.id)
    load()
  }

  const quickMastery = async (k, delta) => {
    const m = Math.max(0, Math.min(100, (k.mastery || 0) + delta))
    await api.knowledge.update(k.id, { ...k, mastery: m })
    load()
  }

  const setStatus = async (k, status) => {
    await api.knowledge.update(k.id, { ...k, status })
    load()
  }

  const avg = list.length ? Math.round(list.reduce((a, b) => a + (b.mastery || 0), 0) / list.length) : 0

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="page-title">知识点掌握</div>
        {active && <button className="btn" onClick={openNew}>+ 新增知识点</button>}
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
          <div className="stat-grid">
            <div className="stat-card"><div className="label">知识点总数</div><div className="value">{list.length}</div></div>
            <div className="stat-card"><div className="label">已掌握</div><div className="value">{list.filter((k) => k.status === 'mastered').length}</div></div>
            <div className="stat-card"><div className="label">学习中</div><div className="value">{list.filter((k) => k.status === 'learning').length}</div></div>
            <div className="stat-card"><div className="label">平均掌握度</div><div className="value">{avg}%</div></div>
          </div>

          <div className="card" style={{ padding: 0 }}>
            {list.length === 0 ? <div className="empty">暂无知识点记录,可参考常见维度:{RADER_POINTS.map((p) => p.name).join('、')}</div> : (
              <table>
                <thead><tr><th>知识点</th><th>状态</th><th style={{ width: 220 }}>掌握度</th><th>备注</th><th>操作</th></tr></thead>
                <tbody>
                  {list.map((k) => {
                    const si = statusInfo(k.status)
                    return (
                      <tr key={k.id}>
                        <td data-label="知识点">{k.point}</td>
                        <td data-label="状态">
                          <select value={k.status} onChange={(e) => setStatus(k, e.target.value)} style={{ width: 'auto', padding: '2px 6px' }}>
                            {STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                          </select>
                        </td>
                        <td data-label="掌握度">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div className="kp-bar" style={{ flex: 1 }}>
                              <div style={{ width: `${k.mastery || 0}%`, background: k.status === 'mastered' ? 'var(--success)' : k.status === 'new' ? 'var(--danger)' : 'var(--warning)' }} />
                            </div>
                            <span style={{ fontSize: 12, width: 32 }}>{k.mastery || 0}%</span>
                            <button className="btn-ghost btn-sm" onClick={() => quickMastery(k, -10)}>-</button>
                            <button className="btn-ghost btn-sm" onClick={() => quickMastery(k, 10)}>+</button>
                          </div>
                        </td>
                        <td data-label="备注" style={{ color: 'var(--text-light)', maxWidth: 200 }}>{k.note || '-'}</td>
                        <td data-label="操作" className="td-actions">
                          <button className="btn-ghost btn-sm" onClick={() => openEdit(k)}>编辑</button>
                          <button className="btn-ghost btn-sm" style={{ marginLeft: 6, color: 'var(--danger)' }} onClick={() => remove(k)}>删除</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>

          <div className="card">
            <h3 style={{ fontSize: 15, marginBottom: 10 }}>常见知识点维度参考</h3>
            <div className="row">
              {RADER_POINTS.map((p) => (
                <div key={p.name} style={{ flex: '0 0 30%' }}>
                  <strong>{p.name}</strong>
                  <div style={{ fontSize: 12, color: 'var(--text-light)' }}>{p.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {editing && (
        <Modal title={editing === 'new' ? '新增知识点' : '编辑知识点'} onClose={() => setEditing(null)} onSubmit={save}>
          <Field label="知识点 / 能力维度 *"><input value={form.point} onChange={(e) => set('point', e.target.value)} placeholder="例:一元二次方程" /></Field>
          <div className="row">
            <Field label="状态">
              <select value={form.status} onChange={(e) => set('status', e.target.value)}>
                {STATUS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="掌握度 (%)"><input type="number" min="0" max="100" value={form.mastery} onChange={(e) => set('mastery', +e.target.value)} /></Field>
          </div>
          <Field label="备注"><textarea value={form.note || ''} onChange={(e) => set('note', e.target.value)} placeholder="易错点、注意事项等" /></Field>
        </Modal>
      )}
    </div>
  )
}
