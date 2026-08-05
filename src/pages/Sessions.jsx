import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import { Modal, Field } from '../components/UI'

const today = () => new Date().toISOString().slice(0, 10)
const FOCUS_LABELS = { 1: '走神', 2: '一般', 3: '正常', 4: '专注', 5: '高度专注' }

export default function Sessions({ onToast }) {
  const [students, setStudents] = useState([])
  const [list, setList] = useState([])
  const [summary, setSummary] = useState(null)
  const [filter, setFilter] = useState({ student_id: '', from: '', to: '' })
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})

  const loadAll = useCallback(async () => {
    const [sts, ss] = await Promise.all([api.students.list(), api.sessions.list(filter)])
    setStudents(sts)
    setList(ss)
    const sm = await api.sessions.summary({ from: filter.from, to: filter.to })
    setSummary(sm)
  }, [filter])

  useEffect(() => { loadAll() }, [loadAll])

  const set = (k, v) => setFilter((f) => ({ ...f, [k]: v }))

  const openNew = () => {
    setForm({
      student_id: filter.student_id || students[0]?.id || '',
      date: today(), start_time: '19:00', end_time: '20:30',
      duration_hours: 1.5, fee: 0, focus_level: 3, performance: '', note: ''
    })
    setEditing('new')
  }
  const openEdit = (s) => { setForm({ ...s }); setEditing(s.id) }
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.student_id) return onToast?.('请选择学生')
    if (editing === 'new') {
      await api.sessions.create(form)
      onToast?.('已记录课时')
    } else {
      await api.sessions.update(editing, form)
      onToast?.('已更新')
    }
    setEditing(null)
    loadAll()
  }

  const remove = async (s) => {
    if (!confirm('删除这条课时记录?')) return
    await api.sessions.remove(s.id)
    onToast?.('已删除')
    loadAll()
  }

  const total = summary?.total || { fee: 0, cnt: 0, hours: 0 }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="page-title">课时与收入</div>
        <button className="btn" onClick={openNew}>+ 记录课时</button>
      </div>

      <div className="stat-grid">
        <div className="stat-card"><div className="label">总课时数</div><div className="value">{total.cnt}</div></div>
        <div className="stat-card"><div className="label">总时长(时)</div><div className="value">{total.hours}</div></div>
        <div className="stat-card"><div className="label">总收入(元)</div><div className="value">¥{total.fee}</div></div>
      </div>

      <div className="card">
        <div className="row" style={{ marginBottom: 12 }}>
          <Field label="学生"><select value={filter.student_id} onChange={(e) => set('student_id', e.target.value)}>
            <option value="">全部</option>
            {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></Field>
          <Field label="开始日期"><input type="date" value={filter.from} onChange={(e) => set('from', e.target.value)} /></Field>
          <Field label="结束日期"><input type="date" value={filter.to} onChange={(e) => set('to', e.target.value)} /></Field>
        </div>
      </div>

      {summary?.byStudent?.length > 0 && (
        <div className="card">
          <h3 style={{ marginBottom: 12, fontSize: 16 }}>按学生汇总</h3>
          <table>
            <thead><tr><th>学生</th><th>课时数</th><th>课时费</th></tr></thead>
            <tbody>
              {summary.byStudent.map((r) => (
                <tr key={r.name}><td>{r.name}</td><td>{r.cnt}</td><td>¥{r.fee}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        {list.length === 0 ? <div className="empty">暂无课时记录</div> : (
          <table>
            <thead><tr><th>日期</th><th>学生</th><th>时间</th><th>时长</th><th>课时费</th><th>专注度</th><th>表现</th><th>操作</th></tr></thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id}>
                  <td>{s.date}</td>
                  <td>{s.student_name}</td>
                  <td>{s.start_time}-{s.end_time}</td>
                  <td>{s.duration_hours}h</td>
                  <td>¥{s.fee}</td>
                  <td>{FOCUS_LABELS[s.focus_level] || '-'}</td>
                  <td style={{ maxWidth: 200, color: 'var(--text-light)' }}>{s.performance || '-'}</td>
                  <td>
                    <button className="btn-ghost btn-sm" onClick={() => openEdit(s)}>编辑</button>
                    <button className="btn-ghost btn-sm" style={{ marginLeft: 6, color: 'var(--danger)' }} onClick={() => remove(s)}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <Modal title={editing === 'new' ? '记录课时' : '编辑课时'} onClose={() => setEditing(null)} onSubmit={save}>
          <div className="row">
            <Field label="学生 *">
              <select value={form.student_id} onChange={(e) => setF('student_id', +e.target.value)}>
                <option value="">请选择</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.name} (¥{s.fee_per_hour}/时)</option>)}
              </select>
            </Field>
            <Field label="日期"><input type="date" value={form.date} onChange={(e) => setF('date', e.target.value)} /></Field>
          </div>
          <div className="row">
            <Field label="开始"><input type="time" value={form.start_time || ''} onChange={(e) => setF('start_time', e.target.value)} /></Field>
            <Field label="结束"><input type="time" value={form.end_time || ''} onChange={(e) => setF('end_time', e.target.value)} /></Field>
            <Field label="时长(时)"><input type="number" step="0.5" value={form.duration_hours} onChange={(e) => setF('duration_hours', +e.target.value)} /></Field>
            <Field label="课时费(元)"><input type="number" value={form.fee} onChange={(e) => setF('fee', +e.target.value)} placeholder="留空按课时费自动计算" /></Field>
          </div>
          <Field label="专注度">
            <select value={form.focus_level} onChange={(e) => setF('focus_level', +e.target.value)}>
              {Object.entries(FOCUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Field>
          <Field label="课堂表现"><textarea value={form.performance || ''} onChange={(e) => setF('performance', e.target.value)} placeholder="今天课堂上学生的表现、状态、问题等" /></Field>
          <Field label="备注"><textarea value={form.note || ''} onChange={(e) => setF('note', e.target.value)} /></Field>
        </Modal>
      )}
    </div>
  )
}
