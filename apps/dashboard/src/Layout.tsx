import { NavLink, Outlet } from 'react-router-dom'
import './App.css'

const links = [
  { to: '/', label: 'Visão geral' },
  { to: '/targets', label: 'Targets' },
  { to: '/results', label: 'Resultados' },
  { to: '/charts', label: 'Gráficos' },
  { to: '/failures', label: 'Falhas' },
  { to: '/settings', label: 'SDK / Tokens' },
]

export default function Layout() {
  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <p className="eyebrow">coresystemstgr</p>
          <h1>Crawler Hub</h1>
        </div>
        <nav>
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.to === '/'} className={({ isActive }) => (isActive ? 'nav active' : 'nav')}>
              {l.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
