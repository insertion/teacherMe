import { all } from '../db.js'

export function getStudents() {
  return all(`SELECT id,name,grade,subject,fee_per_hour,address,commute_min,
    parent_name,parent_phone,personality,weakness,note FROM students ORDER BY name`)
}

export function getSessions(filters = {}) {
  let sql = `SELECT s.*, st.name AS student_name, st.subject AS student_subject,
    st.address AS student_address, st.commute_min AS student_commute_min
    FROM sessions s LEFT JOIN students st ON st.id=s.student_id WHERE 1=1`
  const p = []
  if (filters.student_id) { sql += ' AND s.student_id=?'; p.push(filters.student_id) }
  if (filters.from) { sql += ' AND s.date>=?'; p.push(filters.from) }
  if (filters.to) { sql += ' AND s.date<=?'; p.push(filters.to) }
  sql += ' ORDER BY s.date DESC, s.start_time'
  return all(sql, p)
}

export function getKnowledge(studentId) {
  if (studentId) {
    return all('SELECT * FROM knowledge_points WHERE student_id=? ORDER BY status, mastery', [studentId])
  }
  return all(`SELECT k.*, st.name AS student_name FROM knowledge_points k
    LEFT JOIN students st ON st.id=k.student_id ORDER BY k.student_id, k.status`)
}

export function getFeedbacks(studentId) {
  if (studentId) {
    return all('SELECT * FROM feedbacks WHERE student_id=? ORDER BY date DESC', [studentId])
  }
  return all(`SELECT f.*, st.name AS student_name FROM feedbacks f
    LEFT JOIN students st ON st.id=f.student_id ORDER BY f.date DESC`)
}

export function getTrainings(studentId) {
  if (studentId) {
    return all('SELECT * FROM trainings WHERE student_id=? ORDER BY done, created_at DESC', [studentId])
  }
  return all(`SELECT t.*, st.name AS student_name FROM trainings t
    LEFT JOIN students st ON st.id=t.student_id ORDER BY t.done, t.created_at DESC`)
}

export function buildScheduleContext() {
  const sessions = getSessions()
  const students = getStudents()
  const byStudent = {}
  for (const s of students) {
    byStudent[s.id] = { name: s.name, address: s.address, commute_min: s.commute_min, fee_per_hour: s.fee_per_hour }
  }
  const lines = sessions.map((s) => {
    const st = byStudent[s.student_id] || {}
    return `${s.date} ${s.start_time}-${s.end_time} | ${s.student_name} | 地点:${st.address || '未填'} | 通勤:${st.commute_min || 0}min | 课时费:${s.fee} | 专注度:${s.focus_level}/5 | 表现:${s.performance || '无记录'}`
  })
  return {
    summary: `共 ${students.length} 名学生,${sessions.length} 节课`,
    students: students.map((s) => `${s.name}(${s.grade||'-'} ${s.subject||'-'}, ¥${s.fee_per_hour}/时, 通勤${s.commute_min||0}min, ${s.address||'地点未填'})`),
    sessions: lines,
    raw: { students, sessions },
  }
}

export function buildStudentContext(studentId) {
  const student = all('SELECT * FROM students WHERE id=?', [studentId])[0]
  if (!student) return null
  const sessions = getSessions({ student_id: studentId })
  const knowledge = getKnowledge(studentId)
  const feedbacks = getFeedbacks(studentId)
  const trainings = getTrainings(studentId)

  return {
    student,
    sessions: sessions.map((s) => ({
      date: s.date, time: `${s.start_time}-${s.end_time}`,
      focus: s.focus_level, performance: s.performance, note: s.note
    })),
    knowledge: knowledge.map((k) => ({
      point: k.point, status: k.status, mastery: k.mastery, note: k.note
    })),
    feedbacks: feedbacks.map((f) => ({ date: f.date, content: f.content })),
    trainings: trainings.map((t) => ({ point: t.point, suggestion: t.suggestion, done: !!t.done })),
  }
}

export function buildGlobalContext() {
  const students = getStudents()
  const sessions = getSessions()
  const knowledge = all(`SELECT k.*, st.name AS student_name FROM knowledge_points k
    LEFT JOIN students st ON st.id=k.student_id`)
  const feedbacks = all(`SELECT f.*, st.name AS student_name FROM feedbacks f
    LEFT JOIN students st ON st.id=f.student_id ORDER BY f.date DESC LIMIT 30`)
  const trainings = all(`SELECT t.*, st.name AS student_name FROM trainings t
    LEFT JOIN students st ON st.id=t.student_id`)

  const totalFee = sessions.reduce((a, b) => a + (b.fee || 0), 0)
  const totalHours = sessions.reduce((a, b) => a + (b.duration_hours || 0), 0)

  return {
    overview: {
      studentCount: students.length,
      sessionCount: sessions.length,
      totalFee, totalHours,
      avgFeePerSession: sessions.length ? Math.round(totalFee / sessions.length) : 0,
    },
    students: students.map((s) => ({
      name: s.name, grade: s.grade, subject: s.subject,
      fee_per_hour: s.fee_per_hour, commute_min: s.commute_min,
      personality: s.personality, weakness: s.weakness,
    })),
    knowledge: knowledge.map((k) => ({
      student: k.student_name, point: k.point, status: k.status, mastery: k.mastery
    })),
    recentFeedbacks: feedbacks.map((f) => ({
      student: f.student_name, date: f.date, content: f.content
    })),
    trainings: trainings.map((t) => ({
      student: t.student_name, point: t.point, suggestion: t.suggestion, done: !!t.done
    })),
  }
}
