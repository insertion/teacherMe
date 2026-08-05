import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../api'
import { Modal, Field } from '../components/UI'

const today = () => new Date().toISOString().slice(0, 10)
const fmtDate = (s) => s.slice(5).replace('-', '/')
const WD = ['日','一','二','三','四','五','六']

function toMin(t) {
  if (!t) return null
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export default function Schedule({ onToast }) {
  const [students, setStudents] = useState([])
  const [view, setView] = useState('week')
  const [week, setWeek] = useState(null)
  const [month, setMonth] = useState(null)
  const [anchor, setAnchor] = useState(today())
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({})
  const [dayDetail, setDayDetail] = useState(null)

  const load = useCallback(async () => {
    const [sts, w, m] = await Promise.all([
      api.students.list(),
      api.schedule.week(anchor),
      api.schedule.month(anchor),
    ])
    setStudents(sts)
    setWeek(w)
    setMonth(m)
  }, [anchor])

  useEffect(() => { load() }, [load])

  const shift = (delta) => {
    const d = new Date(anchor)
    if (view === 'week') d.setDate(d.getDate() + delta * 7)
    else d.setMonth(d.getMonth() + delta)
    setAnchor(d.toISOString().slice(0, 10))
  }
  const goToday = () => setAnchor(today())

  const openNew = (date) => {
    setForm({
      student_id: students[0]?.id || '',
      date, start_time: '19:00', end_time: '20:30',
      duration_hours: 1.5, fee: 0, focus_level: 3, performance: '', note: ''
    })
    setEditing('new')
  }
  const openEdit = (s) => {
    setForm({ ...s, student_id: s.student_id })
    setEditing(s.id)
  }
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.student_id) return onToast?.('请选择学生')
    if (editing === 'new') {
      await api.sessions.create(form)
      onToast?.('已排课')
    } else {
      await api.sessions.update(editing, form)
      onToast?.('已更新')
    }
    setEditing(null)
    load()
  }

  const remove = async (s) => {
    if (!confirm(`删除 ${s.student_name} 的这节课?`)) return
    await api.sessions.remove(s.id)
    onToast?.('已删除')
    load()
  }

  const weekTotal = week?.days?.reduce((sum, d) => sum + d.sessions.length, 0) || 0
  const weekFee = week?.days?.reduce((sum, d) => sum + d.sessions.reduce((a, b) => a + (b.fee || 0), 0), 0) || 0
  const weekCommute = week?.days?.reduce((sum, d) => {
    const ids = new Set(d.sessions.map((s) => s.student_id))
    return sum + [...ids].reduce((a, sid) => {
      const st = students.find((x) => x.id === sid)
      return a + (st?.commute_min || 0) * 2
    }, 0)
  }, 0) || 0

  const checkGap = (cur, prev) => {
    if (!prev) return null
    const prevEnd = toMin(prev.end_time)
    const curStart = toMin(cur.start_time)
    if (prevEnd == null || curStart == null) return null
    const gap = curStart - prevEnd
    const need = (cur.student_commute_min || 0) + (prev.student_commute_min || 0)
    if (gap < 0) return { type: 'overlap', gap, need }
    if (gap < need) return { type: 'tight', gap, need }
    return { type: 'ok', gap, need }
  }

  const renderLessonCard = (s, i, sessions) => {
    const gap = checkGap(s, sessions[i - 1])
    return (
      <React.Fragment key={s.id}>
        {gap && gap.type !== 'ok' && (
          <div className={`gap-warn ${gap.type}`}>
            {gap.type === 'overlap' ? `⚠ 与上节课时间冲突` : `⚠ 间隔${gap.gap}min,通勤需${gap.need}min`}
          </div>
        )}
        <div className="lesson-card" onClick={() => openEdit(s)}>
          <div className="lesson-time">{s.start_time}-{s.end_time}</div>
          <div className="lesson-name">{s.student_name}</div>
          <div className="lesson-subject">{s.student_subject || ''}</div>
          {s.student_address && <div className="lesson-loc">📍 {s.student_address}</div>}
          <div className="lesson-commute">🚶 {s.student_commute_min ? `单程${s.student_commute_min}min` : '未设置通勤'}</div>
          <div className="lesson-fee">¥{s.fee}</div>
          <div className="lesson-actions">
            <button className="btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); remove(s) }}>删除</button>
          </div>
        </div>
      </React.Fragment>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div className="page-title">课表</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <div className="view-switch">
            <button className={view === 'week' ? 'active' : ''} onClick={() => setView('week')}>周</button>
            <button className={view === 'month' ? 'active' : ''} onClick={() => setView('month')}>月</button>
          </div>
          <button className="btn-ghost btn-sm" onClick={() => shift(-1)}>{view === 'week' ? '‹ 上周' : '‹ 上月'}</button>
          <button className="btn-ghost btn-sm" onClick={goToday}>本周</button>
          <button className="btn-ghost btn-sm" onClick={() => shift(1)}>{view === 'week' ? '下周 ›' : '下月 ›'}</button>
          <span style={{ color: 'var(--text-light)', fontSize: 13, marginLeft: 4 }}>
            {view === 'week'
              ? (week ? `${fmtDate(week.weekStart)} - ${fmtDate(week.weekEnd)}` : '')
              : (month ? month.monthLabel : '')}
          </span>
        </div>
      </div>

      {view === 'week' ? (
        <>
          <div className="stat-grid">
            <div className="stat-card"><div className="label">本周课时</div><div className="value">{weekTotal}</div></div>
            <div className="stat-card"><div className="label">本周收入</div><div className="value">¥{weekFee}</div></div>
            <div className="stat-card"><div className="label">本周通勤(分钟)</div><div className="value">{weekCommute}</div></div>
          </div>

          {!week ? <div className="card empty">加载中…</div> : (
            <div className="schedule-grid">
              {week.days.map((d) => {
                const dayCommute = [...new Set(d.sessions.map((s) => s.student_id))].reduce((a, sid) => {
                  const st = students.find((x) => x.id === sid)
                  return a + (st?.commute_min || 0) * 2
                }, 0)
                return (
                  <div key={d.date} className={`day-col ${d.isToday ? 'day-today' : ''}`}>
                    <div className="day-head">
                      <div className="day-weekday">{d.weekday}</div>
                      <div className="day-date">{fmtDate(d.date)}</div>
                      <div className="day-meta">
                        {d.sessions.length > 0 ? `${d.sessions.length}节 · 通勤${dayCommute}min` : '无课'}
                      </div>
                      <button className="btn-ghost btn-sm day-add" onClick={() => openNew(d.date)} title="排课">+</button>
                    </div>
                    <div className="day-body">
                      {d.sessions.map((s, i) => renderLessonCard(s, i, d.sessions))}
                      {d.sessions.length === 0 && (
                        <div className="day-empty" onClick={() => openNew(d.date)}>点击排课</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      ) : (
        <>
          {month && (
            <div className="stat-grid">
              <div className="stat-card"><div className="label">本月课时</div><div className="value">{month.stats.total}</div></div>
              <div className="stat-card"><div className="label">本月收入</div><div className="value">¥{month.stats.fee}</div></div>
              <div className="stat-card"><div className="label">本月时长(时)</div><div className="value">{month.stats.hours}</div></div>
              <div className="stat-card"><div className="label">本月排课天数</div><div className="value">{month.stats.days}</div></div>
              <div className="stat-card"><div className="label">本月通勤(分钟)</div><div className="value">{month.stats.commute}</div></div>
            </div>
          )}

          {!month ? <div className="card empty">加载中…</div> : (
            <div className="month-grid">
              {WD.map((w) => <div key={w} className="month-wd">周{w}</div>)}
              {month.cells.map((c) => (
                <div
                  key={c.date}
                  className={`month-cell ${c.inMonth ? '' : 'out'} ${c.isToday ? 'today' : ''} ${c.count > 0 ? 'has' : ''}`}
                  onClick={() => setDayDetail(c)}
                >
                  <div className="mc-day">{c.day}</div>
                  {c.count > 0 ? (
                    <div className="mc-info">
                      <div className="mc-count">{c.count}节</div>
                      {c.firstStart && <div className="mc-first">首课 {c.firstStart}</div>}
                      <div className="mc-names">{c.studentNames.slice(0, 2).join('、')}{c.studentNames.length > 2 ? '…' : ''}</div>
                    </div>
                  ) : c.inMonth ? (
                    <div className="mc-empty">·</div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {dayDetail && (
        <Modal title={`${dayDetail.date} 课程详情`} onClose={() => setDayDetail(null)}>
          {dayDetail.sessions.length === 0 ? (
            <div className="empty">当天无课</div>
          ) : (
            <div className="day-detail-list">
              {dayDetail.sessions.map((s, i) => renderLessonCard(s, i, dayDetail.sessions))}
            </div>
          )}
          <div className="modal-actions">
            <button className="btn" onClick={() => { openNew(dayDetail.date); setDayDetail(null) }}>+ 排课</button>
          </div>
        </Modal>
      )}

      {editing && (
        <Modal title={editing === 'new' ? '排课' : '编辑课时'} onClose={() => setEditing(null)} onSubmit={save}>
          <div className="row">
            <Field label="学生 *">
              <select value={form.student_id} onChange={(e) => setF('student_id', +e.target.value)}>
                <option value="">请选择</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (¥{s.fee_per_hour}/时{s.commute_min ? `, 通勤${s.commute_min}min` : ''})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="日期"><input type="date" value={form.date} onChange={(e) => setF('date', e.target.value)} /></Field>
          </div>
          <div className="row">
            <Field label="开始"><input type="time" value={form.start_time || ''} onChange={(e) => setF('start_time', e.target.value)} /></Field>
            <Field label="结束"><input type="time" value={form.end_time || ''} onChange={(e) => setF('end_time', e.target.value)} /></Field>
            <Field label="时长(时)"><input type="number" step="0.5" value={form.duration_hours} onChange={(e) => setF('duration_hours', +e.target.value)} /></Field>
            <Field label="课时费(元)"><input type="number" value={form.fee} onChange={(e) => setF('fee', +e.target.value)} placeholder="留空自动计算" /></Field>
          </div>
          <Field label="专注度">
            <select value={form.focus_level} onChange={(e) => setF('focus_level', +e.target.value)}>
              <option value={1}>走神</option>
              <option value={2}>一般</option>
              <option value={3}>正常</option>
              <option value={4}>专注</option>
              <option value={5}>高度专注</option>
            </select>
          </Field>
          <Field label="课堂表现"><textarea value={form.performance || ''} onChange={(e) => setF('performance', e.target.value)} /></Field>
        </Modal>
      )}
    </div>
  )
}
