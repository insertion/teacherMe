import express from 'express'
import cors from 'cors'
import { db, now } from './db.js'
import studentRoutes from './routes/students.js'
import sessionRoutes from './routes/sessions.js'
import knowledgeRoutes from './routes/knowledge.js'
import feedbackRoutes from './routes/feedbacks.js'
import trainingRoutes from './routes/trainings.js'
import scheduleRoutes from './routes/schedule.js'
import aiRoutes from './routes/ai.js'
import englishKBRoutes from './routes/englishKB.js'

const app = express()
app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json({ limit: '1mb' }))

app.get('/api/health', (req, res) => res.json({ ok: true, date: now() }))

app.use('/api/students', studentRoutes)
app.use('/api/sessions', sessionRoutes)
app.use('/api/knowledge', knowledgeRoutes)
app.use('/api/feedbacks', feedbackRoutes)
app.use('/api/trainings', trainingRoutes)
app.use('/api/schedule', scheduleRoutes)
app.use('/api/ai', aiRoutes)
app.use('/api/english-kb', englishKBRoutes)

app.listen(3001, () => console.log('API server on http://localhost:3001'))
