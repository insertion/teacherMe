import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import { Modal, Field } from '../components/UI'

const EMPTY = { name: '', grade: '', subject: '英语', phone: '', fee_per_hour: 0, parent_name: '', parent_phone: '', personality: '', weakness: '', note: '', address: '', commute_min: 0, regular_slots: [] }
const WD_OPTS = [{ v: 1, label: '周一' }, { v: 2, label: '周二' }, { v: 3, label: '周三' }, { v: 4, label: '周四' }, { v: 5, label: '周五' }, { v: 6, label: '周六' }, { v: 0, label: '周日' }]
const SUBJECT_OPTS = ['英语', '数学', '语文', '物理', '化学', '生物', '历史', '地理', '政治', '其他']
const GRADE_OPTS = ['小学一年级', '小学二年级', '小学三年级', '小学四年级', '小学五年级', '小学六年级', '初一', '初二', '初三', '高一', '高二', '高三']

function fmtSlots(slots) {
  if (!Array.isArray(slots) || slots.length === 0) return '-'
  return slots.map((sl) => `${WD_OPTS.find((w) => w.v === sl.weekday)?.label || ''} ${sl.start || ''}-${sl.end || ''}`).join('， ')
}

export default function Students({ onToast }) {
  const [list, setList] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(EMPTY)

  const load = useCallback(async () => { setList(await api.students.list()) }, [])

  useEffect(() => { load() }, [load])

  const openNew = () => { setForm({ ...EMPTY }); setEditing('new') }
  const openEdit = (s) => { setForm({ ...s, regular_slots: Array.isArray(s.regular_slots) ? s.regular_slots : [] }); setEditing(s.id) }
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const setSlot = (i, k, v) => setForm((f) => {
    const slots = [...(f.regular_slots || [])]
    slots[i] = { ...slots[i], [k]: v }
    return { ...f, regular_slots: slots }
  })
  const addSlot = () => setForm((f) => ({ ...f, regular_slots: [...(f.regular_slots || []), { weekday: 1, start: '19:00', end: '20:30' }] }))
  const delSlot = (i) => setForm((f) => ({ ...f, regular_slots: (f.regular_slots || []).filter((_, idx) => idx !== i) }))

  const save = async () => {
    if (!form.name?.trim()) return onToast?.('请输入学生姓名')
    try {
      if (editing === 'new') {
        await api.students.create(form)
        onToast?.(`已添加 ${form.name}`)
      } else {
        await api.students.update(editing, form)
        onToast?.('已更新')
      }
      setEditing(null)
      load()
    } catch (e) {
      onToast?.('保存失败:' + e.message)
    }
  }

  const remove = async (s) => {
    if (!confirm(`删除学生「${s.name}」?相关课时/反馈将一并删除。`)) return
    try {
      await api.students.remove(s.id)
      onToast?.('已删除')
      setActiveId(null)
      load()
    } catch (e) {
      onToast?.('删除失败:' + e.message)
    }
  }

  const active = activeId ? list.find((s) => s.id === activeId) : null

  const editForm = (
    <Modal title={editing === 'new' ? '新增学生' : '编辑学生'} onClose={() => setEditing(null)} onSubmit={save}>
      <div className="row">
        <Field label="姓名 *"><input value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="年级">
          <select value={form.grade} onChange={(e) => set('grade', e.target.value)}>
            <option value="">请选择</option>
            {GRADE_OPTS.map((g) => <option key={g} value={g}>{g}</option>)}
            {form.grade && !GRADE_OPTS.includes(form.grade) ? <option value={form.grade}>{form.grade}</option> : null}
          </select>
        </Field>
        <Field label="科目">
          <select value={form.subject} onChange={(e) => set('subject', e.target.value)}>
            <option value="">请选择</option>
            {SUBJECT_OPTS.map((s) => <option key={s} value={s}>{s}</option>)}
            {form.subject && !SUBJECT_OPTS.includes(form.subject) ? <option value={form.subject}>{form.subject}</option> : null}
          </select>
        </Field>
      </div>
      <div className="row">
        <Field label="课时费(元/时)"><input type="number" value={form.fee_per_hour} onChange={(e) => set('fee_per_hour', +e.target.value)} /></Field>
        <Field label="学生电话"><input value={form.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
      </div>
      <div className="row">
        <Field label="上课地点"><input value={form.address || ''} onChange={(e) => set('address', e.target.value)} placeholder="例:朝阳区XX小区3号楼" /></Field>
        <Field label="单程通勤(分钟)"><input type="number" min="0" value={form.commute_min || 0} onChange={(e) => set('commute_min', +e.target.value)} placeholder="从驻地到上课点的单程时间" /></Field>
      </div>
      <Field label="固定上课时间">
        <div className="slots-editor">
          {(form.regular_slots || []).map((sl, i) => (
            <div key={i} className="slot-row">
              <select value={sl.weekday} onChange={(e) => setSlot(i, 'weekday', +e.target.value)}>
                {WD_OPTS.map((w) => <option key={w.v} value={w.v}>{w.label}</option>)}
              </select>
              <input type="time" value={sl.start || ''} onChange={(e) => setSlot(i, 'start', e.target.value)} />
              <span className="slot-dash">-</span>
              <input type="time" value={sl.end || ''} onChange={(e) => setSlot(i, 'end', e.target.value)} />
              <button type="button" className="btn-ghost btn-sm slot-del" onClick={() => delSlot(i)}>删除</button>
            </div>
          ))}
          <button type="button" className="btn-ghost btn-sm" onClick={addSlot}>+ 添加时间段</button>
        </div>
      </Field>
      <div className="row">
        <Field label="家长姓名"><input value={form.parent_name} onChange={(e) => set('parent_name', e.target.value)} /></Field>
        <Field label="家长电话"><input value={form.parent_phone} onChange={(e) => set('parent_phone', e.target.value)} /></Field>
      </div>
      <Field label="性格特点"><textarea value={form.personality} onChange={(e) => set('personality', e.target.value)} placeholder="例:专注力一般,需要多鼓励" /></Field>
      <Field label="薄弱环节"><textarea value={form.weakness} onChange={(e) => set('weakness', e.target.value)} placeholder="例:函数应用题,几何证明" /></Field>
      <Field label="备注"><textarea value={form.note} onChange={(e) => set('note', e.target.value)} /></Field>
    </Modal>
  )

  if (active) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <button className="btn-ghost btn-sm stu-back" onClick={() => setActiveId(null)}>‹ 返回</button>
          <div className="page-title" style={{ marginBottom: 0 }}>{active.name}</div>
        </div>

        <div className="card stu-detail">
          <div className="stu-detail-head">
            <div className="stu-avatar">{active.name?.[0] || '?'}</div>
            <div className="stu-meta">
              <div className="stu-name-row">
                <span className="stu-name">{active.name}</span>
                {active.grade && <span className="badge badge-learning">{active.grade}</span>}
                {active.subject && <span className="badge badge-mastered">{active.subject}</span>}
              </div>
              <div className="stu-sub">课时费 ¥{active.fee_per_hour}/时 · 课时 {active.session_count} · 累计 ¥{active.total_fee} · 请假 {active.leave_count || 0}次</div>
            </div>
          </div>

          <div className="stu-info-grid">
            <div className="stu-info-item"><span className="stu-info-label">固定时间</span><span className="stu-info-value">{fmtSlots(active.regular_slots)}</span></div>
            <div className="stu-info-item"><span className="stu-info-label">上课地点</span><span className="stu-info-value">{active.address || '-'}</span></div>
            <div className="stu-info-item"><span className="stu-info-label">通勤</span><span className="stu-info-value">{active.commute_min ? `${active.commute_min}分钟` : '-'}</span></div>
            <div className="stu-info-item"><span className="stu-info-label">学生电话</span><span className="stu-info-value">{active.phone || '-'}</span></div>
            <div className="stu-info-item"><span className="stu-info-label">家长</span><span className="stu-info-value">{active.parent_name || '-'} {active.parent_phone || ''}</span></div>
          </div>

          {active.personality && <div className="stu-section"><div className="stu-section-title">性格特点</div><div className="stu-section-body">{active.personality}</div></div>}
          {active.weakness && <div className="stu-section"><div className="stu-section-title">薄弱环节</div><div className="stu-section-body">{active.weakness}</div></div>}
          {active.note && <div className="stu-section"><div className="stu-section-title">备注</div><div className="stu-section-body">{active.note}</div></div>}
        </div>

        <div className="stu-detail-actions">
          <button className="btn" onClick={() => openEdit(active)}>编辑</button>
          <button className="btn-ghost" style={{ color: 'var(--danger)' }} onClick={() => remove(active)}>删除学生</button>
        </div>

        {editing && editForm}
      </div>
    )
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
        <>
          <div className="card stu-list-mobile" style={{ padding: 0 }}>
            {list.map((s) => (
              <div key={s.id} className="stu-card" onClick={() => setActiveId(s.id)}>
                <div className="stu-avatar">{s.name?.[0] || '?'}</div>
                <div className="stu-card-body">
                  <div className="stu-card-name">
                    {s.name}
                    {s.grade && <span className="badge badge-learning">{s.grade}</span>}
                    {s.subject && <span className="badge badge-mastered">{s.subject}</span>}
                  </div>
                  <div className="stu-card-sub">¥{s.fee_per_hour}/时 · {s.session_count}课时 · 累计¥{s.total_fee}{s.leave_count ? ` · 请假${s.leave_count}次` : ''}</div>
                </div>
                <span className="stu-card-arrow">›</span>
              </div>
            ))}
          </div>

          <div className="card stu-list-desktop" style={{ padding: 0 }}>
            <table>
              <thead>
                <tr>
                  <th>姓名</th><th>年级</th><th>科目</th><th>课时费/时</th>
                  <th>固定时间</th>
                  <th>上课地点</th><th>通勤</th>
                  <th>家长</th><th>课时数</th><th>累计课时费</th><th>操作</th>
                </tr>
              </thead>
              <tbody>
                {list.map((s) => (
                  <tr key={s.id}>
                    <td data-label="姓名">{s.name}</td>
                    <td data-label="年级">{s.grade || '-'}</td>
                    <td data-label="科目">{s.subject || '-'}</td>
                    <td data-label="课时费/时">¥{s.fee_per_hour}</td>
                    <td data-label="固定时间" style={{ color: 'var(--text-light)', fontSize: 12 }}>{fmtSlots(s.regular_slots)}</td>
                    <td data-label="上课地点" style={{ color: 'var(--text-light)' }}>{s.address || '-'}</td>
                    <td data-label="通勤">{s.commute_min ? `${s.commute_min}分钟` : '-'}</td>
                    <td data-label="家长">{s.parent_name || '-'} {s.parent_phone || ''}</td>
                    <td data-label="课时数">{s.session_count}</td>
                    <td data-label="累计课时费">¥{s.total_fee}</td>
                    <td data-label="操作" className="td-actions">
                      <button className="btn-ghost btn-sm" onClick={() => setActiveId(s.id)}>详情</button>
                      <button className="btn-ghost btn-sm" style={{ marginLeft: 6 }} onClick={() => openEdit(s)}>编辑</button>
                      <button className="btn-ghost btn-sm" style={{ marginLeft: 6, color: 'var(--danger)' }} onClick={() => remove(s)}>删除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editing && editForm}
    </div>
  )
}
