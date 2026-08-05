import { Router } from 'express'
import { all, run, now } from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  const { student_id } = req.query
  if (student_id) {
    return res.json(all('SELECT * FROM feedbacks WHERE student_id=? ORDER BY date DESC', [student_id]))
  }
  res.json(all(`SELECT f.*, st.name AS student_name FROM feedbacks f LEFT JOIN students st ON st.id=f.student_id ORDER BY f.date DESC`))
})

router.post('/', (req, res) => {
  const b = req.body
  const { id } = run(`INSERT INTO feedbacks (student_id,session_id,date,content) VALUES (?,?,?,?)`,
    [b.student_id, b.session_id, b.date || now(), b.content])
  res.json({ id })
})

router.put('/:id', (req, res) => {
  const b = req.body
  run(`UPDATE feedbacks SET content=?,date=? WHERE id=?`, [b.content, b.date, req.params.id])
  res.json({ ok: true })
})

router.delete('/:id', (req, res) => {
  run('DELETE FROM feedbacks WHERE id=?', [req.params.id])
  res.json({ ok: true })
})

export default router
