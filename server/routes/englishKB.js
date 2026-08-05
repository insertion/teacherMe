import { Router } from 'express'
import { all, run } from '../db.js'
import { ENGLISH_KB } from '../english-kb.js'

const router = Router()

router.get('/', (req, res) => {
  res.json(ENGLISH_KB)
})

router.get('/grades', (req, res) => {
  res.json(ENGLISH_KB.grades.map((g) => ({
    grade: g.grade, stage: g.stage, overview: g.overview, count: g.items.length,
  })))
})

router.get('/grade/:idx', (req, res) => {
  const idx = parseInt(req.params.idx, 10)
  const g = ENGLISH_KB.grades[idx]
  if (!g) return res.status(404).json({ error: '年级不存在' })
  res.json(g)
})

router.post('/import', (req, res) => {
  const { student_id, items } = req.body
  if (!student_id) return res.status(400).json({ error: '缺少 student_id' })
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: '缺少要导入的知识点' })
  }
  let inserted = 0, skipped = 0
  const existing = all('SELECT point FROM knowledge_points WHERE student_id=?', [student_id])
    .map((r) => r.point)
  for (const it of items) {
    if (existing.includes(it.point)) { skipped++; continue }
    const note = [
      it.difficulty ? `【${it.difficulty}】` : '',
      it.focus ? `重点:${it.focus}` : '',
      it.teaching ? `教学建议:${it.teaching}` : '',
    ].filter(Boolean).join(' ')
    run('INSERT INTO knowledge_points (student_id,point,status,mastery,note) VALUES (?,?,?,?,?)',
      [student_id, it.point, 'new', 0, note])
    existing.push(it.point)
    inserted++
  }
  res.json({ ok: true, inserted, skipped, total: items.length })
})

export default router
