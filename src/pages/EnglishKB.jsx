import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import { Modal, Field } from '../components/UI'

const DIFF_COLOR = {
  '基础': { bg: '#f0f9eb', color: 'var(--success)' },
  '重点': { bg: '#ecf5ff', color: 'var(--primary)' },
  '难点': { bg: '#fef0f0', color: 'var(--danger)' },
}

export default function EnglishKB({ onToast }) {
  const [kb, setKb] = useState(null)
  const [activeGrade, setActiveGrade] = useState(0)
  const [checked, setChecked] = useState({})
  const [students, setStudents] = useState([])
  const [importing, setImporting] = useState(false)

  const load = useCallback(async () => {
    const [data, sts] = await Promise.all([api.englishKB.all(), api.students.list()])
    setKb(data)
    setStudents(sts)
  }, [])

  useEffect(() => { load() }, [load])

  const grade = kb?.grades[activeGrade]

  const toggle = (idx) => {
    const key = `${activeGrade}-${idx}`
    setChecked((c) => ({ ...c, [key]: !c[key] }))
  }

  const checkAll = () => {
    const allOn = grade.items.every((_, i) => checked[`${activeGrade}-${i}`])
    setChecked((prev) => {
      const next = { ...prev }
      grade.items.forEach((_, i) => { next[`${activeGrade}-${i}`] = !allOn })
      return next
    })
  }

  const clearAll = () => {
    setChecked((prev) => {
      const next = { ...prev }
      Object.keys(next).forEach((k) => { if (k.startsWith(`${activeGrade}-`)) delete next[k] })
      return next
    })
  }

  const checkedItems = grade ? grade.items
    .map((it, i) => ({ ...it, _key: `${activeGrade}-${i}` }))
    .filter((it) => checked[it._key]) : []

  const doImport = async (studentId) => {
    if (!studentId) return onToast?.('请选择学生')
    if (checkedItems.length === 0) return onToast?.('请先勾选知识点')
    setImporting(true)
    try {
      const r = await api.englishKB.import({
        student_id: studentId,
        items: checkedItems.map(({ point, difficulty, focus, teaching }) => ({ point, difficulty, focus, teaching })),
      })
      onToast?.(`已导入 ${r.inserted} 条${r.skipped ? `,跳过 ${r.skipped} 条已存在` : ''}`)
      const next = { ...checked }
      checkedItems.forEach((it) => delete next[it._key])
      setChecked(next)
    } catch (e) {
      onToast?.(e.message || '导入失败')
    } finally {
      setImporting(false)
    }
  }

  const totalChecked = Object.values(checked).filter(Boolean).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div className="page-title">英语知识点库 <span style={{ fontSize: 14, color: 'var(--text-light)', fontWeight: 400 }}>· 上海地区</span></div>
        <ImportBar students={students} onImport={doImport} importing={importing} count={totalChecked} />
      </div>

      {kb && (
        <div className="card" style={{ background: '#fdf6ec', marginBottom: 16, padding: '12px 16px' }}>
          <div style={{ fontSize: 13, color: 'var(--text-light)', lineHeight: 1.7 }}>
            <strong>适用教材:</strong>{kb.meta.curriculum}
            <br />
            <strong>说明:</strong>{kb.meta.note}
          </div>
        </div>
      )}

      <div className="kb-layout">
        <div className="kb-sidebar">
          {kb?.grades.map((g, i) => (
            <div
              key={i}
              className={`kb-grade-item ${activeGrade === i ? 'active' : ''}`}
              onClick={() => setActiveGrade(i)}
            >
              <div className="kb-grade-name">{g.grade}</div>
              <div className="kb-grade-meta">{g.items.length} 个知识点</div>
            </div>
          ))}
        </div>

        <div className="kb-main">
          {grade && (
            <>
              <div className="kb-grade-head">
                <h2>{grade.grade}</h2>
                <div className="kb-overview">{grade.overview}</div>
                <div className="kb-toolbar">
                  <button className="btn-ghost btn-sm" onClick={checkAll}>全选</button>
                  <button className="btn-ghost btn-sm" onClick={clearAll}>清空</button>
                  <span style={{ fontSize: 12, color: 'var(--text-light)' }}>
                    已选 {checkedItems.length} / {grade.items.length}
                  </span>
                </div>
              </div>

              <div className="kb-items">
                {grade.items.map((it, i) => {
                  const key = `${activeGrade}-${i}`
                  const dc = DIFF_COLOR[it.difficulty] || {}
                  return (
                    <div key={i} className={`kb-item ${checked[key] ? 'checked' : ''}`} onClick={() => toggle(i)}>
                      <div className="kb-item-check">
                        <input type="checkbox" checked={!!checked[key]} onChange={() => toggle(i)} onClick={(e) => e.stopPropagation()} />
                      </div>
                      <div className="kb-item-body">
                        <div className="kb-item-head">
                          <span className="kb-item-point">{it.point}</span>
                          {it.difficulty && (
                            <span className="kb-badge" style={{ background: dc.bg, color: dc.color }}>{it.difficulty}</span>
                          )}
                        </div>
                        <div className="kb-item-row">
                          <span className="kb-label">重难点</span>
                          <span>{it.focus}</span>
                        </div>
                        <div className="kb-item-row">
                          <span className="kb-label">教学建议</span>
                          <span>{it.teaching}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function ImportBar({ students, onImport, importing, count }) {
  const [studentId, setStudentId] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (students[0] && !studentId) setStudentId(students[0].id)
  }, [students])

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <select value={studentId} onChange={(e) => setStudentId(+e.target.value)} style={{ width: 'auto' }}>
        <option value="">选学生</option>
        {students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <button className="btn" disabled={importing || count === 0} onClick={() => onImport(studentId)}>
        {importing ? '导入中…' : `导入选中 ${count > 0 ? `(${count})` : ''}`}
      </button>
    </div>
  )
}
