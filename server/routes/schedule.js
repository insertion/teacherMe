import { Router } from 'express'
import { all } from '../db.js'

const router = Router()

const fmt = (x) => {
  const y = x.getFullYear()
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const d = String(x.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}
const todayStr = () => fmt(new Date())

router.get('/week', (req, res) => {
  const { date } = req.query
  const d = date ? new Date(date) : new Date()
  const day = d.getDay() || 7
  const monday = new Date(d)
  monday.setDate(d.getDate() - day + 1)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const from = fmt(monday), to = fmt(sunday)

  const rows = all(`SELECT s.*, st.name AS student_name, st.subject AS student_subject,
    st.address AS student_address, st.commute_min AS student_commute_min
    FROM sessions s LEFT JOIN students st ON st.id=s.student_id
    WHERE s.date>=? AND s.date<=? ORDER BY s.date, s.start_time`, [from, to])

  const byDate = {}
  for (const r of rows) {
    if (!byDate[r.date]) byDate[r.date] = []
    byDate[r.date].push(r)
  }

  const days = []
  for (let i = 0; i < 7; i++) {
    const cur = new Date(monday)
    cur.setDate(monday.getDate() + i)
    const ds = fmt(cur)
    days.push({
      date: ds,
      weekday: ['周日','周一','周二','周三','周四','周五','周六'][cur.getDay()],
      isToday: ds === todayStr(),
      sessions: byDate[ds] || [],
    })
  }

  res.json({ weekStart: from, weekEnd: to, days })
})

router.get('/day', (req, res) => {
  const { date } = req.query
  const target = date || new Date().toISOString().slice(0, 10)
  const rows = all(`SELECT s.*, st.name AS student_name, st.subject AS student_subject,
    st.address AS student_address, st.commute_min AS student_commute_min
    FROM sessions s LEFT JOIN students st ON st.id=s.student_id
    WHERE s.date=? ORDER BY s.start_time`, [target])
  res.json({ date: target, sessions: rows })
})

router.get('/month', (req, res) => {
  const { date } = req.query
  let year, month
  if (date) {
    const parts = date.split('-')
    year = parseInt(parts[0], 10)
    month = parseInt(parts[1], 10) - 1
    if (isNaN(year) || isNaN(month)) {
      const now = new Date()
      year = now.getFullYear()
      month = now.getMonth()
    }
  } else {
    const now = new Date()
    year = now.getFullYear()
    month = now.getMonth()
  }

  const first = new Date(year, month, 1)
  const last = new Date(year, month + 1, 0)

  let startGrid = new Date(first)
  const firstDay = startGrid.getDay() || 7
  startGrid.setDate(startGrid.getDate() - firstDay + 1)

  const endGrid = new Date(last)
  const lastDay = endGrid.getDay() || 7
  endGrid.setDate(endGrid.getDate() + (7 - lastDay))

  const from = fmt(startGrid), to = fmt(endGrid)

  const rows = all(`SELECT s.*, st.name AS student_name, st.subject AS student_subject,
    st.address AS student_address, st.commute_min AS student_commute_min
    FROM sessions s LEFT JOIN students st ON st.id=s.student_id
    WHERE s.date>=? AND s.date<=? ORDER BY s.date, s.start_time`, [from, to])

  const byDate = {}
  for (const r of rows) {
    if (!byDate[r.date]) byDate[r.date] = []
    byDate[r.date].push(r)
  }

  const ts = todayStr()
  const cells = []
  const cur = new Date(startGrid)
  while (cur <= endGrid) {
    const ds = fmt(cur)
    const inMonth = cur.getMonth() === month
    const ss = byDate[ds] || []
    cells.push({
      date: ds,
      day: cur.getDate(),
      inMonth,
      isToday: ds === ts,
      count: ss.length,
      firstStart: ss[0]?.start_time || null,
      studentNames: ss.map((s) => s.student_name),
      sessions: ss,
    })
    cur.setDate(cur.getDate() + 1)
  }

  const monthFrom = fmt(first), monthTo = fmt(last)
  const monthRows = rows.filter((r) => r.date >= monthFrom && r.date <= monthTo)
  const total = monthRows.length
  const fee = monthRows.reduce((a, b) => a + (b.fee || 0), 0)
  const hours = monthRows.reduce((a, b) => a + (b.duration_hours || 0), 0)
  const daySet = new Set(monthRows.map((r) => r.date))
  const commute = [...daySet].reduce((a, ds) => {
    const daySessions = byDate[ds] || []
    const ids = new Set(daySessions.map((s) => s.student_id))
    return a + [...ids].reduce((acc, sid) => {
      const st = daySessions.find((r) => r.student_id === sid)
      return acc + (st?.student_commute_min || 0) * 2
    }, 0)
  }, 0)

  res.json({
    year, month: month + 1, monthLabel: `${year}年${month + 1}月`,
    rangeStart: from, rangeEnd: to,
    cells,
    stats: { total, fee, hours, commute, days: daySet.size },
  })
})

export default router
