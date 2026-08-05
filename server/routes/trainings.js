import { Router } from 'express'
import { all, run } from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  const { student_id, done } = req.query
  let sql = 'SELECT * FROM trainings WHERE 1=1'
  const p = []
  if (student_id) { sql += ' AND student_id=?'; p.push(student_id) }
  if (done !== undefined) { sql += ' AND done=?'; p.push(done) }
  sql += ' ORDER BY created_at DESC'
  res.json(all(sql, p))
})

router.post('/', (req, res) => {
  const b = req.body
  const { id } = run(`INSERT INTO trainings (student_id,point,suggestion) VALUES (?,?,?)`,
    [b.student_id, b.point, b.suggestion])
  res.json({ id })
})

router.put('/:id', (req, res) => {
  const b = req.body
  run(`UPDATE trainings SET point=?,suggestion=?,done=? WHERE id=?`,
    [b.point, b.suggestion, b.done ? 1 : 0, req.params.id])
  res.json({ ok: true })
})

router.delete('/:id', (req, res) => {
  run('DELETE FROM trainings WHERE id=?', [req.params.id])
  res.json({ ok: true })
})

export default router
