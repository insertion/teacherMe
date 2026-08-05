import React, { useState, useCallback, useEffect } from 'react'

export function Toast({ msg, onDone }) {
  React.useEffect(() => {
    if (!msg) return
    const t = setTimeout(onDone, 1800)
    return () => clearTimeout(t)
  }, [msg, onDone])
  if (!msg) return null
  return <div className="toast">{msg}</div>
}

export function useToast() {
  const [msg, setMsg] = useState('')
  const show = useCallback((m) => setMsg(m), [])
  return [msg, show]
}

export function Modal({ title, children, onClose, onSubmit }) {
  useEffect(() => {
    if (!onClose) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div className="modal-mask" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {children}
        <div className="modal-actions">
          <button type="button" className="btn-ghost" onClick={onClose}>取消</button>
          {onSubmit && <button type="button" className="btn" onClick={onSubmit}>保存</button>}
        </div>
      </div>
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  )
}
