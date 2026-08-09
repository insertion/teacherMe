import React, { useState } from 'react'
import { Toast, useToast } from './components/UI'
import { api } from './api'
import Schedule from './pages/Schedule'
import Students from './pages/Students'
import Sessions from './pages/Sessions'
import Knowledge from './pages/Knowledge'
import Feedbacks from './pages/Feedbacks'
import Trainings from './pages/Trainings'
import EnglishKB from './pages/EnglishKB'
import AIAdvice from './pages/AIAdvice'

const NAV = [
  { key: 'schedule', label: '课表', icon: '📅' },
  { key: 'students', label: '学生档案', icon: '👤' },
  { key: 'sessions', label: '课时与收入', icon: '💰' },
  { key: 'knowledge', label: '知识点掌握', icon: '📊' },
  { key: 'englishKB', label: '英语知识点库', icon: '📘' },
  { key: 'feedbacks', label: '家长反馈', icon: '💬' },
  { key: 'trainings', label: '训练建议', icon: '🎯' },
  { key: 'ai', label: 'AI 建议', icon: '🤖' },
]

const PAGES = { schedule: Schedule, students: Students, sessions: Sessions, knowledge: Knowledge, englishKB: EnglishKB, feedbacks: Feedbacks, trainings: Trainings, ai: AIAdvice }

const TAB_KEYS = ['schedule', 'students', 'sessions', 'feedbacks', 'more']

export default function App() {
  const [tab, setTab] = useState('schedule')
  const [toastMsg, showToast] = useToast()
  const [moreOpen, setMoreOpen] = useState(false)
  const Page = PAGES[tab]

  const go = (key) => { setTab(key); setMoreOpen(false) }

  const tabByKey = (k) => NAV.find((n) => n.key === k)
  const activeTab = TAB_KEYS.includes(tab) ? tab : 'more'
  const moreItems = NAV.filter((n) => !['schedule', 'students', 'sessions', 'feedbacks'].includes(n.key))

  return (
    <div className="app">
      <nav className="sidebar" role="navigation" aria-label="主导航">
        <h1>📚 家教工作台</h1>
        {NAV.map((n, i) => (
          <button
            key={n.key}
            className={`nav-item ${tab === n.key ? 'active' : ''}`}
            onClick={() => setTab(n.key)}
            aria-current={tab === n.key ? 'page' : undefined}
          >
            <span className="nav-idx">{String(i + 1).padStart(2, '0')}</span>
            <span className="nav-label">{n.label}</span>
          </button>
        ))}
      </nav>

      <main className="main">
        <Page onToast={showToast} />
      </main>

      <nav className="bottom-tab" role="navigation" aria-label="主导航">
        {TAB_KEYS.map((k) => {
          if (k === 'more') {
            const isMoreActive = !['schedule', 'students', 'sessions', 'feedbacks'].includes(tab)
            return (
              <button
                key="more"
                className={`tab-item ${isMoreActive ? 'active' : ''} ${moreOpen ? 'pressed' : ''}`}
                onClick={() => setMoreOpen((v) => !v)}
                aria-label="更多功能"
              >
                <span className="tab-icon">{moreOpen ? '✕' : '⋯'}</span>
                <span className="tab-label">更多</span>
              </button>
            )
          }
          const n = tabByKey(k)
          return (
            <button
              key={k}
              className={`tab-item ${activeTab === k ? 'active' : ''}`}
              onClick={() => go(k)}
              aria-current={tab === k ? 'page' : undefined}
            >
              <span className="tab-icon">{n?.icon}</span>
              <span className="tab-label">{k === 'sessions' ? '课时' : n?.label}</span>
            </button>
          )
        })}
      </nav>

      {moreOpen && (
        <>
          <div className="more-mask" onClick={() => setMoreOpen(false)} />
          <div className="more-sheet" role="menu">
            <div className="more-sheet-head">更多功能</div>
            {moreItems.map((n) => (
              <button
                key={n.key}
                className={`more-item ${tab === n.key ? 'active' : ''}`}
                onClick={() => go(n.key)}
                role="menuitem"
              >
                <span className="more-icon">{n.icon}</span>
                <span className="more-label">{n.label}</span>
              </button>
            ))}
            <button
              className="more-item"
              onClick={async () => {
                try {
                  const r = await api.health()
                  showToast(`✓ 已连接后端,服务器时间 ${r.date}`)
                } catch (e) {
                  showToast('✗ 连接后端失败:' + e.message)
                }
              }}
              role="menuitem"
            >
              <span className="more-icon">🔌</span>
              <span className="more-label">测试后端连接</span>
            </button>
          </div>
        </>
      )}

      <Toast msg={toastMsg} onDone={() => showToast('')} />
    </div>
  )
}
