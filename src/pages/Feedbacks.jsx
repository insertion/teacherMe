import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import { Modal, Field } from '../components/UI'

const TEMPLATES = [
  '今天完成了{科目}的{内容}学习。{名字}课堂表现{表现},需要课后巩固{重点}。',
  '{名字}今天上课专注度{专注度}。主要学习了{内容},掌握情况{掌握}。建议课后练习{练习}。',
  '今日课程反馈:{名字}学习了{内容}。优点是{优点},还需加强{弱点}。课后作业:{作业}。',
]

const today = () => new Date().toISOString().slice(0, 10)

export default function Feedbacks({ onToast }) {
  const [students, setStudents] = useState([])
  const [active, setActive] = useState(null)
  const [list, setList] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [draft, setDraft] = useState('')

  useEffect(() => { api.students.list().then((s) => { setStudents(s); if (s[0]) setActive(s[0].id) }) }, [])

  const load = useCallback(async () => {
    if (!active) return
    setList(await api.feedbacks.list({ student_id: active }))
  }, [active])

  useEffect(() => { load() }, [load])

  const student = students.find((s) => s.id === active)

  const openNew = () => {
    setForm({ student_id: active, date: today(), content: '' })
    setDraft('')
    setEditing('new')
  }
  const openEdit = (f) => { setForm({ ...f }); setDraft(f.content); setEditing(f.id) }

  const save = async () => {
    if (!form.content?.trim()) return onToast?.('请填写反馈内容')
    if (editing === 'new') await api.feedbacks.create(form)
    else await api.feedbacks.update(editing, form)
    onToast?.('已保存')
    setEditing(null)
    load()
  }

  const remove = async (f) => {
    if (!confirm('删除这条反馈?')) return
    await api.feedbacks.remove(f.id)
    load()
  }

  const copy = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      onToast?.('已复制到剪贴板')
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      onToast?.('已复制')
    }
  }

  const useTemplate = (tpl) => {
    const filled = tpl
      .replace(/{名字}/g, student?.name || '')
      .replace(/{科目}/g, student?.subject || '')
      .replace(/{内容}/g, '本节内容')
      .replace(/{表现}/g, '良好')
      .replace(/{重点}/g, '薄弱知识点')
      .replace(/{专注度}/g, '较高')
      .replace(/{掌握}/g, '基本掌握')
      .replace(/{练习}/g, '相关习题')
      .replace(/{优点}/g, '积极思考')
      .replace(/{弱点}/g, '计算细节')
      .replace(/{作业}/g, '课后练习册')
    setForm((f) => ({ ...f, content: filled }))
    setDraft(filled)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="page-title">家长反馈</div>
        {active && <button className="btn" onClick={openNew}>+ 写反馈</button>}
      </div>

      <div className="student-pick">
        {students.map((s) => (
          <span key={s.id} className={`chip ${active === s.id ? 'active' : ''}`} onClick={() => setActive(s.id)}>
            {s.name}
          </span>
        ))}
      </div>

      {!active ? <div className="card empty">请先添加学生</div> : (
        <div className="card" style={{ padding: 0 }}>
          {list.length === 0 ? <div className="empty">暂无反馈记录</div> : (
            <table>
              <thead><tr><th style={{ width: 110 }}>日期</th><th>反馈内容</th><th style={{ width: 160 }}>操作</th></tr></thead>
              <tbody>
                {list.map((f) => (
                  <tr key={f.id}>
                    <td data-label="日期">{f.date}</td>
                    <td data-label="反馈内容" style={{ whiteSpace: 'pre-wrap' }}>{f.content}</td>
                    <td data-label="操作" className="td-actions">
                      <button className="btn-ghost btn-sm" onClick={() => copy(f.content)}>复制</button>
                      <button className="btn-ghost btn-sm" style={{ marginLeft: 6 }} onClick={() => openEdit(f)}>编辑</button>
                      <button className="btn-ghost btn-sm" style={{ marginLeft: 6, color: 'var(--danger)' }} onClick={() => remove(f)}>删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {editing && (
        <Modal title={editing === 'new' ? '写家长反馈' : '编辑反馈'} onClose={() => setEditing(null)} onSubmit={save}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ marginBottom: 6 }}>快捷模板(点击套用)</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {TEMPLATES.map((t, i) => (
                <button key={i} className="btn-ghost btn-sm" style={{ textAlign: 'left', padding: 8 }} onClick={() => useTemplate(t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <Field label="日期"><input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} /></Field>
          <Field label="反馈内容 *">
            <textarea rows={6} value={form.content || ''} onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))} placeholder="可基于模板修改,或直接输入反馈内容。{名字}等占位符已自动替换。" />
          </Field>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn-ghost btn-sm" onClick={() => copy(form.content || '')}>复制到剪贴板</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
