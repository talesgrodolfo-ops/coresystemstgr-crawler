import { useEffect, useRef, useState } from 'react'
import { api } from '../api'

type Msg = { role: 'user' | 'assistant'; content: string }

const STARTERS = [
  'Qual foi o último erro do crawler?',
  'Liste os targets e o status recente',
  'Como corrigir o seletor que quebrou?',
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: 'assistant',
      content:
        'Olá! Sou o assistente do Crawler Hub. Tenho acesso às **falhas recentes**, **targets** e **execuções** da sua conta.\n\nPergunte sobre erros, seletores ou próximos passos.',
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (text: string) => {
    const msg = text.trim()
    if (!msg || loading) return
    setError('')
    setInput('')
    const userMsg: Msg = { role: 'user', content: msg }
    setMessages((m) => [...m, userMsg])
    setLoading(true)
    try {
      const history = messages.slice(-10)
      const res = await api.chat(msg, history)
      setMessages((m) => [...m, { role: 'assistant', content: res.reply }])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao enviar')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="chat-page">
      <header className="page-header">
        <h2>Assistente IA</h2>
        <p className="muted">Chat com contexto das falhas e targets — sem precisar de token Cursor</p>
      </header>

      {error && <div className="alert">{error}</div>}

      <div className="chat-panel panel">
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div key={i} className={`chat-bubble ${m.role}`}>
              <span className="chat-role">{m.role === 'user' ? 'Você' : 'Assistente'}</span>
              <div className="chat-text">{m.content}</div>
            </div>
          ))}
          {loading && (
            <div className="chat-bubble assistant">
              <span className="chat-role">Assistente</span>
              <div className="chat-text muted">Analisando contexto…</div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="chat-starters">
          {STARTERS.map((s) => (
            <button key={s} type="button" className="btn ghost small" onClick={() => send(s)} disabled={loading}>
              {s}
            </button>
          ))}
        </div>

        <form
          className="chat-input-row"
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
        >
          <input
            className="input"
            placeholder="Ex.: explique o último erro e sugira um seletor novo…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button className="btn" type="submit" disabled={loading || !input.trim()}>
            Enviar
          </button>
        </form>
      </div>
    </div>
  )
}
