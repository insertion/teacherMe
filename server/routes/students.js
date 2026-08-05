import { Router } from 'express'
import { all, get, run } from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  const rows = all(`
    SELECT s.*,
      (SELECT COUNT(*) FROM sessions WHERE student_id=s.id) AS session_count,
      (SELECT COALESCE(SUM(fee),0) FROM sessions WHERE student_id=s.id) AS total_fee
    FROM students s ORDER BY s.created_at DESC
  `)
  res.json(rows)
})

router.get('/:id', (req, res) => {
  const row = get('SELECT * FROM students WHERE id=?', [req.params.id])
  if (!row) return res.status(404).json({ error: '未找到学生' })
  res.json(row)
})

router.post('/', (req, res) => {
  const b = req.body
  const { id } = run(`INSERT INTO students
    (name,grade,subject,phone,fee_per_hour,parent_name,parent_phone,personality,weakness,note,address,commute_min)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [b.name, b.grade, b.subject, b.phone, b.fee_per_hour||0, b.parent_name, b.parent_phone, b.personality, b.weakness, b.note, b.address, b.commute_min||0])
  res.json({ id })
})

router.put('/:id', (req, res) => {
  const b = req.body
  run(`UPDATE students SET
    name=?,grade=?,subject=?,phone=?,fee_per_hour=?,parent_name=?,parent_phone=?,personality=?,weakness=?,note=?,address=?,commute_min=?
    WHERE id=?`,
    [b.name, b.grade, b.subject, b.phone, b.fee_per_hour||0, b.parent_name, b.parent_phone, b.personality, b.weakness, b.note, b.address, b.commute_min||0, req.params.id])
  res.json({ ok: true })
})

router.delete('/:id', (req, res) => {
  run('DELETE FROM students WHERE id=?', [req.params.id])
  run('DELETE FROM sessions WHERE student_id=?', [req.params.id])
  run('DELETE FROM knowledge_points WHERE student_id=?', [req.params.id])
  run('DELETE FROM feedbacks WHERE student_id=?', [req.params.id])
  run('DELETE FROM trainings WHERE student_id=?', [req.params.id])
  res.json({ ok: true })
})

export default router
