import { useEffect, useState } from 'react'
import { api } from '../api'
import type { CrawlField, CrawlTarget } from '../types'

const emptyField = (): CrawlField => ({ name: '', selector: '', attribute: 'text', fallbacks: [] })

const emptyTarget = (): Partial<CrawlTarget> & { fields: CrawlField[] } => ({
  name: '',
  url: '',
  enabled: true,
  crawl_mode: 'single',
  allowed_url_patterns: [],
  stop_url_patterns: [],
  max_pages: 10,
  max_depth: 2,
  fields: [emptyField()],
})

function linesToArray(text: string) {
  return text.split('\n').map((s) => s.trim()).filter(Boolean)
}

export default function TargetsPage() {
  const [targets, setTargets] = useState<CrawlTarget[]>([])
  const [form, setForm] = useState(emptyTarget())
  const [editing, setEditing] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState('')

  const load = () => api.targets().then((r) => setTargets(r.targets)).catch((e) => setError(e.message))

  useEffect(() => { load() }, [])

  const save = async () => {
    try {
      setError('')
      await api.saveTarget({
        ...form,
        id: editing ?? undefined,
        allowed_url_patterns: form.allowed_url_patterns ?? [],
        stop_url_patterns: form.stop_url_patterns ?? [],
      } as CrawlTarget)
      setSaved('Target salvo!')
      setEditing(null)
      setForm(emptyTarget())
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar')
    }
  }

  const edit = (t: CrawlTarget) => {
    setEditing(t.id)
    setForm({ ...t })
  }

  return (
    <div>
      <header className="page-header">
        <h2>Targets</h2>
        <p className="muted">Configure URLs, campos a extrair e regras de parada do crawler</p>
      </header>

      {error && <div className="alert">{error}</div>}
      {saved && <div className="alert ok">{saved}</div>}

      <div className="panel">
        <h3>{editing ? 'Editar target' : 'Novo target'}</h3>
        <div className="form-grid">
          <label>Nome<input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>URL inicial<input className="input" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." /></label>
          <label>Modo
            <select className="input" value={form.crawl_mode} onChange={(e) => setForm({ ...form, crawl_mode: e.target.value as CrawlTarget['crawl_mode'] })}>
              <option value="single">Página única</option>
              <option value="follow_links">Seguir links</option>
            </select>
          </label>
          <label>Máx. páginas<input className="input" type="number" value={form.max_pages} onChange={(e) => setForm({ ...form, max_pages: Number(e.target.value) })} /></label>
          <label>Profundidade<input className="input" type="number" value={form.max_depth} onChange={(e) => setForm({ ...form, max_depth: Number(e.target.value) })} /></label>
          <label className="checkbox"><input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} /> Ativo</label>
        </div>

        <label className="full">URLs permitidas (regex, uma por linha)
          <textarea className="input" rows={3} placeholder={"https://site\\.com/produtos/.*"} value={(form.allowed_url_patterns ?? []).join('\n')} onChange={(e) => setForm({ ...form, allowed_url_patterns: linesToArray(e.target.value) })} />
        </label>
        <label className="full">URLs de parada (regex, uma por linha)
          <textarea className="input" rows={3} placeholder={"/login|/checkout|/carrinho"} value={(form.stop_url_patterns ?? []).join('\n')} onChange={(e) => setForm({ ...form, stop_url_patterns: linesToArray(e.target.value) })} />
        </label>

        <h4>Campos a extrair</h4>
        {form.fields.map((f, i) => (
          <div key={i} className="field-row">
            <input className="input" placeholder="nome_campo" value={f.name} onChange={(e) => { const fields = [...form.fields]; fields[i] = { ...f, name: e.target.value }; setForm({ ...form, fields }) }} />
            <input className="input" placeholder="seletor CSS" value={f.selector} onChange={(e) => { const fields = [...form.fields]; fields[i] = { ...f, selector: e.target.value }; setForm({ ...form, fields }) }} />
            <input className="input" placeholder="fallbacks (vírgula)" value={(f.fallbacks ?? []).join(', ')} onChange={(e) => { const fields = [...form.fields]; fields[i] = { ...f, fallbacks: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) }; setForm({ ...form, fields }) }} />
          </div>
        ))}
        <button className="btn ghost" onClick={() => setForm({ ...form, fields: [...form.fields, emptyField()] })}>+ Campo</button>

        <div className="actions">
          <button className="btn" onClick={save}>Salvar target</button>
          {editing && <button className="btn ghost" onClick={() => { setEditing(null); setForm(emptyTarget()) }}>Cancelar</button>}
        </div>
      </div>

      <div className="panel">
        <h3>Targets cadastrados ({targets.length})</h3>
        <div className="target-list">
          {targets.map((t) => (
            <article key={t.id} className="target-card">
              <div>
                <strong>{t.name}</strong>
                <div className="mono small">{t.url}</div>
                <div className="tags">
                  <span className="tag">{t.crawl_mode}</span>
                  <span className="tag">{t.fields.length} campos</span>
                  {!t.enabled && <span className="tag danger">inativo</span>}
                </div>
              </div>
              <div className="actions">
                <button className="btn ghost" onClick={() => edit(t)}>Editar</button>
                <button className="btn ghost danger" onClick={() => api.deleteTarget(t.id).then(load)}>Excluir</button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
