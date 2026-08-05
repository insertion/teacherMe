import { Router } from 'express'
import { all, get, run, now } from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  const { student_id, from, to } = req.query
  let sql = `SELECT s.*, st.name AS student_name FROM sessions s
    LEFT JOIN students st ON st.id=s.student_id WHERE 1=1`
  const params = []
  if (student_id) { sql += ' AND s.student_id=?'; params.push(student_id) }
  if (from) { sql += ' AND s.date>=?'; params.push(from) }
  if (to) { sql += ' AND s.date<=?'; params.push(to) }
  sql += ' ORDER BY s.date DESC'
  res.json(all(sql, params))
})

router.post('/', (req, res) => {
  const b = req.body
  let fee = b.fee
  if (fee === undefined || fee === null || fee === 0) {
    const st = get('SELECT fee_per_hour FROM students WHERE id=?', [b.student_id])
    fee = (b.duration_hours || 1.5) * (st?.fee_per_hour || 0)
  }
  const { id } = run(`INSERT INTO sessions
    (student_id,date,start_time,end_time,duration_hours,fee,focus_level,performance,note)
    VALUES (?,?,?,?,?,?,?,?,?)`,
    [b.student_id, b.date || now(), b.start_time, b.end_time, b.duration_hours || 1.5, fee, b.focus_level ?? 3, b.performance, b.note])
  res.json({ id, fee })
})

router.put('/:id', (req, res) => {
  const b = req.body
  run(`UPDATE sessions SET
    date=?,start_time=?,end_time=?,duration_hours=?,fee=?,focus_level=?,performance=?,note=?
    WHERE id=?`,
    [b.date, b.start_time, b.end_time, b.duration_hours, b.fee, b.focus_level, b.performance, b.note, req.params.id])
  res.json({ ok: true })
})

router.delete('/:id', (req, res) => {
  run('DELETE FROM sessions WHERE id=?', [req.params.id])
  res.json({ ok: true })
})

router.get('/stats/summary', (req, res) => {
  const { from, to } = req.query
  let where = '1=1'; const p = []
  if (from) { where += ' AND date>=?'; p.push(from) }
  if (to) { where += ' AND date<=?'; p.push(to) }
  const total = get(`SELECT COALESCE(SUM(fee),0) AS fee, COUNT(*) AS cnt, COALESCE(SUM(duration_hours),0) AS hours FROM sessions WHERE ${where}`, p) || { fee: 0, cnt: 0, hours: 0 }
  const byMonth = all(`SELECT substr(date,1,7) AS month, COUNT(*) AS cnt, COALESCE(SUM(fee),0) AS fee FROM sessions WHERE ${where} GROUP BY month ORDER BY month DESC`, p)
  const byStudent = all(`SELECT st.name, COUNT(s.id) AS cnt, COALESCE(SUM(s.fee),0) AS fee FROM sessions s LEFT JOIN students st ON st.id=s.student_id WHERE ${where} GROUP BY s.student_id ORDER BY fee DESC`, p)
  res.json({ total, byMonth, byStudent })
})

export default router
