import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import { Modal, Field } from '../components/UI'

const EMPTY = { name: '', grade: '', subject: '', phone: '', fee_per_hour: 0, parent_name: '', parent_phone: '', personality: '', weakness: '', note: '', address: '', commute_min: 0 }

export default function Students({ onToast }) {
  const [list, setList] = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)

  const load = useCallback(async () => { setList(await api.students.list()) }, [])

  useEffect(() => { load() }, [load])

  const openNew = () => { setForm(EMPTY); setEditing('new') }
  const openEdit = (s) => { setForm({ ...s }); setEditing(s.id) }
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name?.trim()) return onToast?.('请输入学生姓名')
    if (editing === 'new') {
      const { id } = await api.students.create(form)
      onToast?.(`已添加 ${form.name}`)
    } else {
      await api.students.update(editing, form)
      onToast?.('已更新')
    }
    setEditing(null)
    load()
  }

  const remove = async (s) => {
    if (!confirm(`删除学生「${s.name}」?相关课时/反馈将一并删除。`)) return
    await api.students.remove(s.id)
    onToast?.('已删除')
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="page-title">学生档案</div>
        <button className="btn" onClick={openNew}>+ 新增学生</button>
      </div>

      {list.length === 0 ? (
        <div className="card empty">还没有学生档案,点击右上角添加</div>
      ) : (
        <div className="card" style={{ padding: 0 }}>
          <table>
            <thead>
              <tr>
                <th>姓名</th><th>年级</th><th>科目</th><th>课时费/时</th>
                <th>上课地点</th><th>通勤</th>
                <th>家长</th><th>课时数</th><th>累计课时费</th><th>操作</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.grade || '-'}</td>
                  <td>{s.subject || '-'}</td>
                  <td>¥{s.fee_per_hour}</td>
                  <td style={{ color: 'var(--text-light)' }}>{s.address || '-'}</td>
                  <td>{s.commute_min ? `${s.commute_min}分钟` : '-'}</td>
                  <td>{s.parent_name || '-'} {s.parent_phone || ''}</td>
                  <td>{s.session_count}</td>
                  <td>¥{s.total_fee}</td>
                  <td>
                    <button className="btn-ghost btn-sm" onClick={() => openEdit(s)}>编辑</button>
                    <button className="btn-ghost btn-sm" style={{ marginLeft: 6, color: 'var(--danger)' }} onClick={() => remove(s)}>删除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal title={editing === 'new' ? '新增学生' : '编辑学生'} onClose={() => setEditing(null)} onSubmit={save}>
          <div className="row">
            <Field label="姓名 *"><input value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="年级"><input value={form.grade} onChange={(e) => set('grade', e.target.value)} placeholder="例:初二" /></Field>
            <Field label="科目"><input value={form.subject} onChange={(e) => set('subject', e.target.value)} placeholder="例:数学" /></Field>
          </div>
          <div className="row">
            <Field label="课时费(元/时)"><input type="number" value={form.fee_per_hour} onChange={(e) => set('fee_per_hour', +e.target.value)} /></Field>
            <Field label="学生电话"><input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
          </div>
          <div className="row">
            <Field label="上课地点"><input value={form.address || ''} onChange={(e) => set('address', e.target.value)} placeholder="例:朝阳区XX小区3号楼" /></Field>
            <Field label="单程通勤(分钟)"><input type="number" min="0" value={form.commute_min || 0} onChange={(e) => set('commute_min', +e.target.value)} placeholder="从驻地到上课点的单程时间" /></Field>
          </div>
          <div className="row">
            <Field label="家长姓名"><input value={form.parent_name} onChange={(e) => set('parent_name', e.target.value)} /></Field>
            <Field label="家长电话"><input value={form.parent_phone} onChange={(e) => set('parent_phone', e.target.value)} /></Field>
          </div>
          <Field label="性格特点"><textarea value={form.personality} onChange={(e) => set('personality', e.target.value)} placeholder="例:专注力一般,需要多鼓励" /></Field>
          <Field label="薄弱环节"><textarea value={form.weakness} onChange={(e) => set('weakness', e.target.value)} placeholder="例:函数应用题,几何证明" /></Field>
          <Field label="备注"><textarea value={form.note} onChange={(e) => set('note', e.target.value)} /></Field>
        </Modal>
      )}
    </div>
  )
}
