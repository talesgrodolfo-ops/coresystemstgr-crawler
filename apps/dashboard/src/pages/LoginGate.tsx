import { useState } from 'react'
import { setAdminKey } from '../api'

export default function LoginGate({ onLogin }: { onLogin: () => void }) {
  const [key, setKey] = useState('')

  return (
    <div className="login-wrap">
      <div className="login-card">
        <p className="eyebrow">coresystemstgr.com</p>
        <h2>Entrar no painel</h2>
        <p className="muted">Informe a chave de administrador (ADMIN_KEY do servidor).</p>
        <input
          className="input"
          type="password"
          placeholder="Chave admin"
          value={key}
          onChange={(e) => setKey(e.target.value)}
        />
        <button className="btn" onClick={() => { setAdminKey(key); onLogin() }} disabled={!key}>
          Acessar
        </button>
      </div>
    </div>
  )
}
