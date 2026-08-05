import React, { useState } from 'react'
import { Toast, useToast } from './components/UI'
import Schedule from './pages/Schedule'
import Students from './pages/Students'
import Sessions from './pages/Sessions'
import Knowledge from './pages/Knowledge'
import Feedbacks from './pages/Feedbacks'
import Trainings from './pages/Trainings'
import EnglishKB from './pages/EnglishKB'
import AIAdvice from './pages/AIAdvice'

const NAV = [
  { key: 'schedule', label: '课表' },
  { key: 'students', label: '学生档案' },
  { key: 'sessions', label: '课时与收入' },
  { key: 'knowledge', label: '知识点掌握' },
  { key: 'englishKB', label: '英语知识点库' },
  { key: 'feedbacks', label: '家长反馈' },
  { key: 'trainings', label: '训练建议' },
  { key: 'ai', label: 'AI 建议' },
]

const PAGES = { schedule: Schedule, students: Students, sessions: Sessions, knowledge: Knowledge, englishKB: EnglishKB, feedbacks: Feedbacks, trainings: Trainings, ai: AIAdvice }

export default function App() {
  const [tab, setTab] = useState('schedule')
  const [toastMsg, showToast] = useToast()
  const Page = PAGES[tab]

  return (
    <div className="app">
      <nav className="sidebar" role="navigation" aria-label="主导航">
        <h1>📚 家教工作台</h1>
        {NAV.map((n) => (
          <button
            key={n.key}
            className={`nav-item ${tab === n.key ? 'active' : ''}`}
            onClick={() => setTab(n.key)}
            aria-current={tab === n.key ? 'page' : undefined}
          >
            {n.label}
          </button>
        ))}
      </nav>
      <main className="main">
        <Page onToast={showToast} />
      </main>
      <Toast msg={toastMsg} onDone={() => showToast('')} />
    </div>
  )
}
