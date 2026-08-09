import { Router } from 'express'
import { all, get, run, now } from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  const { student_id, from, to } = req.query
  const today = now()
  let sql = `SELECT s.*, st.name AS student_name FROM sessions s
    LEFT JOIN students st ON st.id=s.student_id WHERE s.confirmed != -1 AND s.date <= ?`
  const params = [today]
  if (student_id) { sql += ' AND s.student_id=?'; params.push(student_id) }
  if (from) { sql += ' AND s.date>=?'; params.push(from) }
  if (to) { sql += ' AND s.date<=?'; params.push(to) }
  sql += ' ORDER BY s.date DESC, s.start_time DESC'
  res.json(all(sql, params))
})

router.post('/', (req, res) => {
  const b = req.body
  let fee = b.fee
  if (fee === undefined || fee === null || fee === 0) {
    const st = get('SELECT fee_per_hour FROM students WHERE id=?', [b.student_id])
    fee = (b.duration_hours || 1.5) * (st?.fee_per_hour || 0)
  }
  const confirmed = b.confirmed === undefined ? 1 : (b.confirmed ? 1 : 0)
  const { id } = run(`INSERT INTO sessions
    (student_id,date,start_time,end_time,duration_hours,fee,focus_level,performance,note,confirmed)
    VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [b.student_id, b.date || now(), b.start_time, b.end_time, b.duration_hours || 1.5, fee, b.focus_level ?? 3, b.performance, b.note, confirmed])
  res.json({ id, fee, confirmed })
})

router.put('/:id', (req, res) => {
  const b = req.body
  const confirmed = b.confirmed === undefined ? 1 : (b.confirmed ? 1 : 0)
  run(`UPDATE sessions SET
    date=?,start_time=?,end_time=?,duration_hours=?,fee=?,focus_level=?,performance=?,note=?,confirmed=?
    WHERE id=?`,
    [b.date, b.start_time, b.end_time, b.duration_hours, b.fee, b.focus_level, b.performance, b.note, confirmed, req.params.id])
  res.json({ ok: true })
})

router.put('/:id/confirm', (req, res) => {
  const confirmed = req.body.confirmed ? 1 : 0
  run('UPDATE sessions SET confirmed=? WHERE id=?', [confirmed, req.params.id])
  res.json({ ok: true, confirmed })
})

router.post('/leave', (req, res) => {
  const b = req.body
  const { id } = run(`INSERT INTO sessions
    (student_id,date,start_time,end_time,duration_hours,fee,focus_level,performance,note,confirmed)
    VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [b.student_id, b.date || now(), b.start_time || '', b.end_time || '', 0, 0, 3, b.reason || '请假', '', -1])
  res.json({ id, confirmed: -1 })
})

router.delete('/:id', (req, res) => {
  run('DELETE FROM sessions WHERE id=?', [req.params.id])
  res.json({ ok: true })
})

router.get('/stats/summary', (req, res) => {
  const { from, to, student_id } = req.query
  const today = now()
  let where = `date <= ?`; const p = [today]
  if (from) { where += ' AND date>=?'; p.push(from) }
  if (to) { where += ' AND date<=?'; p.push(to) }
  const confirmedWhere = where + ' AND confirmed=1'
  const total = get(`SELECT COALESCE(SUM(fee),0) AS fee, COUNT(*) AS cnt, COALESCE(SUM(duration_hours),0) AS hours FROM sessions WHERE ${confirmedWhere}`, p) || { fee: 0, cnt: 0, hours: 0 }
  const pending = get(`SELECT COUNT(*) AS cnt FROM sessions WHERE ${where} AND confirmed=0`, p) || { cnt: 0 }
  const byMonth = all(`SELECT substr(date,1,7) AS month, COUNT(*) AS cnt, COALESCE(SUM(fee),0) AS fee FROM sessions WHERE ${confirmedWhere} GROUP BY month ORDER BY month DESC`, p)
  let stuWhere = `s.confirmed=1 AND s.date <= ?`; const stuP = [today]
  if (from) { stuWhere += ' AND s.date>=?'; stuP.push(from) }
  if (to) { stuWhere += ' AND s.date<=?'; stuP.push(to) }
  if (student_id) { stuWhere += ' AND s.student_id=?'; stuP.push(student_id) }
  const byStudent = all(`SELECT st.id AS student_id, st.name, COUNT(s.id) AS cnt, COALESCE(SUM(s.fee),0) AS fee FROM sessions s LEFT JOIN students st ON st.id=s.student_id WHERE ${stuWhere} GROUP BY s.student_id ORDER BY fee DESC`, stuP)
  let leaveWhere = `confirmed=-1 AND date <= ?`; const leaveP = [today]
  if (from) { leaveWhere += ' AND date>=?'; leaveP.push(from) }
  if (to) { leaveWhere += ' AND date<=?'; leaveP.push(to) }
  const leaveByStudent = all(`SELECT student_id, COUNT(*) AS cnt FROM sessions WHERE ${leaveWhere} GROUP BY student_id`, leaveP)
  const leaveMap = {}
  leaveByStudent.forEach((r) => { leaveMap[r.student_id] = r.cnt })
  byStudent.forEach((r) => { r.leave_count = leaveMap[r.student_id] || 0 })
  const leaveTotal = get(`SELECT COUNT(*) AS cnt FROM sessions WHERE ${leaveWhere}`, leaveP) || { cnt: 0 }
  res.json({ total, pending: pending.cnt, byMonth, byStudent, leaveTotal: leaveTotal.cnt })
})

export default router
