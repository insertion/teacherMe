import { Router } from 'express'
import { get, run, all } from '../db.js'
import { getConfig, chat, logAI } from '../ai/client.js'
import { buildScheduleContext, buildStudentContext, buildGlobalContext, getStudents } from '../ai/context.js'

const router = Router()

router.get('/config', (req, res) => {
  const cfg = getConfig()
  res.json({
    base_url: cfg.base_url,
    api_key_set: !!cfg.api_key,
    model: cfg.model,
  })
})

router.post('/config', (req, res) => {
  const b = req.body
  const cur = getConfig()
  run('UPDATE ai_config SET base_url=?, model=?, updated_at=datetime(\'now\',\'localtime\') WHERE id=1',
    [b.base_url || cur.base_url, b.model || cur.model])
  res.json({ ok: true })
})

router.get('/students', (req, res) => {
  res.json(getStudents().map((s) => ({ id: s.id, name: s.name, grade: s.grade, subject: s.subject })))
})

router.get('/history', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100)
  res.json(all('SELECT id,scene,question,answer,tokens,created_at FROM ai_logs ORDER BY created_at DESC LIMIT ?', [limit]))
})

router.delete('/history/:id', (req, res) => {
  run('DELETE FROM ai_logs WHERE id=?', [req.params.id])
  res.json({ ok: true })
})

async function runScene(req, res, scene, systemPrompt, userPrompt, question) {
  try {
    const apiKey = req.body?.api_key
    if (!apiKey) {
      return res.status(400).json({ error: '缺少 api_key,请先配置 AI API Key' })
    }
    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]
    const { answer, tokens } = await chat(messages, apiKey, { timeout: 90000 })
    logAI(scene, question || '', answer, tokens)
    res.json({ answer, tokens })
  } catch (e) {
    res.status(e.code === 'NO_KEY' ? 400 : 500).json({ error: e.message })
  }
}

router.post('/schedule-advice', async (req, res) => {
  const ctx = buildScheduleContext()
  const extra = req.body?.question || ''
  const userPrompt = `以下是家教老师的排课数据(JSON):
${JSON.stringify(ctx, null, 2)}

${extra ? '老师补充问题:' + extra : ''}

请基于以上数据,从以下维度给出排课建议:
1. 排课密度是否合理,是否有连续上课过于疲劳的风险
2. 同一天多节课的通勤时间是否充裕,是否存在地点切换不便
3. 课时费收入与时间投入(含通勤)的性价比分析
4. 空闲时间段利用建议
5. 具体可执行的调整方案

用 Markdown 格式输出,语言简洁专业,有数据支撑。`
  await runScene(req, res, 'schedule_advice',
    '你是一位经验丰富的家教工作助手,擅长根据排课数据优化老师的时间安排与收入效率。', userPrompt, extra)
})

router.post('/study-advice', async (req, res) => {
  const studentId = req.body.student_id
  if (!studentId) return res.status(400).json({ error: '请选择学生' })
  const ctx = buildStudentContext(studentId)
  if (!ctx) return res.status(404).json({ error: '学生不存在' })
  const extra = req.body.question || ''
  const userPrompt = `以下是学生「${ctx.student.name}」的学习档案与历史记录(JSON):
${JSON.stringify(ctx, null, 2)}

${extra ? '老师补充问题:' + extra : ''}

请基于以上数据,从以下维度给出学习建议:
1. 知识点掌握情况综合评估,指出关键薄弱环节
2. 结合课堂表现历史,分析学生的学习状态趋势
3. 下一步学习重点与优先级建议
4. 针对性的教学方法调整建议
5. 可量化的短期目标(如2-4周)

用 Markdown 格式输出,语言具体可执行,避免空话。`
  await runScene(req, res, 'study_advice',
    '你是一位资深学科辅导专家,擅长根据学生的学习数据给出个性化教学建议。', userPrompt, extra)
})

router.post('/training-plan', async (req, res) => {
  const studentId = req.body.student_id
  if (!studentId) return res.status(400).json({ error: '请选择学生' })
  const ctx = buildStudentContext(studentId)
  if (!ctx) return res.status(404).json({ error: '学生不存在' })
  const extra = req.body.question || ''
  const userPrompt = `以下是学生「${ctx.student.name}」的知识点掌握与训练历史(JSON):
${JSON.stringify(ctx, null, 2)}

${extra ? '老师补充要求:' + extra : ''}

请基于以上数据,生成一份具体的针对性训练方案:
1. 列出需要重点训练的知识点(按优先级排序)
2. 每个知识点给出:训练目标、题型分布、每日题量、预计时长、验收标准
3. 给出一份一周训练计划表(按天)
4. 注意事项与易错点提醒

用 Markdown 格式输出,方案要具体到可执行,不要泛泛而谈。`
  await runScene(req, res, 'training_plan',
    '你是一位擅长制定个性化训练方案的学科教练,方案注重可执行性与可量化验收。', userPrompt, extra)
})

router.post('/parent-summary', async (req, res) => {
  const studentId = req.body.student_id
  if (!studentId) return res.status(400).json({ error: '请选择学生' })
  const ctx = buildStudentContext(studentId)
  if (!ctx) return res.status(404).json({ error: '学生不存在' })
  const extra = req.body.question || ''
  const userPrompt = `以下是学生「${ctx.student.name}」近期的学习记录(JSON):
${JSON.stringify(ctx, null, 2)}

${extra ? '老师补充要求:' + extra : ''}

请生成一段给家长的阶段性学习总结,要求:
1. 语气亲切专业,让家长放心
2. 总结近期学习内容与进步之处(具体)
3. 客观指出需要改进的方面(委婉表达)
4. 下阶段学习计划与家长配合建议
5. 长度控制在 300-500 字,适合微信发送

直接输出总结正文,不要加标题或解释。`
  await runScene(req, res, 'parent_summary',
    '你是一位善于与家长沟通的家教老师,总结既专业又温暖,让家长感受到老师的用心。', userPrompt, extra)
})

router.post('/workbench-summary', async (req, res) => {
  const ctx = buildGlobalContext()
  const extra = req.body.question || ''
  const userPrompt = `以下是家教老师工作台的全量数据汇总(JSON):
${JSON.stringify(ctx, null, 2)}

${extra ? '老师补充问题:' + extra : ''}

请基于以上数据,给出全局工作建议:
1. 整体工作概况评估(学生数/课时/收入/通勤投入)
2. 学生管理建议:哪些学生需要重点关注,哪些可以适当增加/减少课时
3. 收入结构分析:课时费是否合理,有无优化空间
4. 时间效率:通勤成本与收入的比例,有无优化建议
5. 教学质量:从反馈与知识点掌握看,哪些环节需要加强
6. 下阶段工作重点(3-5条)

用 Markdown 格式输出,语言简洁有数据支撑。`
  await runScene(req, res, 'workbench_summary',
    '你是一位家教工作管理顾问,擅长从全局数据中发现问题并给出可落地的优化建议。', userPrompt, extra)
})

export default router
