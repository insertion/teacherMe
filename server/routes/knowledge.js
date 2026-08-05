import { Router } from 'express'
import { all, run } from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  const { student_id } = req.query
  if (student_id) {
    return res.json(all('SELECT * FROM knowledge_points WHERE student_id=? ORDER BY updated_at DESC', [student_id]))
  }
  res.json(all('SELECT * FROM knowledge_points ORDER BY updated_at DESC'))
})

router.post('/', (req, res) => {
  const b = req.body
  const { id } = run(`INSERT INTO knowledge_points (student_id,point,status,mastery,note) VALUES (?,?,?,?,?)`,
    [b.student_id, b.point, b.status||'learning', b.mastery ?? 50, b.note])
  res.json({ id })
})

router.put('/:id', (req, res) => {
  const b = req.body
  run(`UPDATE knowledge_points SET point=?,status=?,mastery=?,note=?,updated_at=datetime('now','localtime') WHERE id=?`,
    [b.point, b.status, b.mastery, b.note, req.params.id])
  res.json({ ok: true })
})

router.delete('/:id', (req, res) => {
  run('DELETE FROM knowledge_points WHERE id=?', [req.params.id])
  res.json({ ok: true })
})

export default router
