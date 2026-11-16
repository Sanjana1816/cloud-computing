import { Link, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { LogOut, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export function Mark({ className = 'h-9 w-9' }) {
  return (
    <span className={`${className} grid place-items-center rounded-xl bg-ink`}>
      <svg viewBox="0 0 32 32" className="h-[62%] w-[62%]">
        <circle cx="16" cy="16" r="11" fill="none" stroke="#D4F65C" strokeWidth="3" strokeDasharray="48 22" strokeLinecap="round" />
        <circle cx="16" cy="16" r="4" fill="#D4F65C" />
      </svg>
    </span>
  )
}

export function Logo({ size = 'md' }) {
  const big = size === 'lg'
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <Mark className={big ? 'h-10 w-10' : 'h-8 w-8'} />
      <span className={`font-display font-extrabold tracking-tight ${big ? 'text-2xl' : 'text-lg'}`}>routeradar</span>
    </Link>
  )
}

const ROLE_STYLE = {
  passenger: 'bg-violet-soft text-violet-deep',
  driver: 'bg-amber-soft text-amber-deep',
  admin: 'bg-pink-soft text-pink',
}

export function RoleChip({ role }) {
  return <span className={`chip ${ROLE_STYLE[role] || ROLE_STYLE.passenger} capitalize`}>{role}</span>
}

export function TopBar({ children }) {
  const { profile, logout } = useAuth()
  const nav = useNavigate()
  const links = profile?.role === 'admin' ? [['/map', 'Map'], ['/driver', 'Driver'], ['/admin', 'Admin']] : []
  return (
    <header className="sticky top-0 z-[1000] flex h-16 items-center gap-3 border-b border-line bg-surface/85 px-4 backdrop-blur-xl sm:px-6">
      <Logo />
      {links.length > 0 && (
        <nav className="ml-4 hidden gap-1 rounded-full bg-canvas p-1 md:flex">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) =>
              `rounded-full px-4 py-1.5 text-sm font-semibold transition ${isActive ? 'bg-surface shadow-soft' : 'text-muted hover:text-ink'}`}>
              {label}
            </NavLink>
          ))}
        </nav>
      )}
      <div className="ml-auto flex items-center gap-3">
        {children}
        {profile && (
          <>
            <div className="hidden items-center gap-2.5 sm:flex">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-violet-soft text-xs font-bold text-violet-deep">
                {profile.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
              </span>
              <div className="leading-tight">
                <div className="text-sm font-semibold">{profile.name}</div>
                <div className="text-[11px] capitalize text-muted">{profile.role}</div>
              </div>
            </div>
            <span className="sm:hidden"><RoleChip role={profile.role} /></span>
            <button className="icon-btn" title="Log out" onClick={async () => { await logout(); nav('/') }}>
              <LogOut className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </header>
  )
}

const TONES = {
  lime: 'bg-lime-soft text-lime-deep',
  violet: 'bg-violet-soft text-violet-deep',
  amber: 'bg-amber-soft text-amber-deep',
  pink: 'bg-pink-soft text-pink',
  gray: 'bg-canvas text-muted',
  red: 'bg-red-soft text-red',
}

export function FullScreenLoader({ label = 'Loading' }) {
  return (
    <div className="grid h-full place-items-center">
      <div className="flex flex-col items-center gap-4">
        <Mark className="h-12 w-12 animate-pulse" />
        <span className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" />{label}</span>
      </div>
    </div>
  )
}

export const homeFor = (role) => (role === 'admin' ? '/admin' : role === 'driver' ? '/driver' : '/map')

// UI guard only. The real checks live in firestore.rules.
export function RequireRole({ roles, children }) {
  const { user, profile, loading } = useAuth()
  if (user === null) return <Navigate to="/login" replace />
  if (loading) return <FullScreenLoader />
  if (roles && !roles.includes(profile.role) && profile.role !== 'admin') {
    // cached profile might be stale (e.g. just promoted), wait for the server copy
    if (profile.fromCache) return <FullScreenLoader />
    return <Navigate to={homeFor(profile.role)} replace />
  }
  return children
}

export function Stat({ label, value, sub, icon: Icon, tone = 'lime' }) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted">{label}</span>
        {Icon && <span className={`grid h-9 w-9 place-items-center rounded-full ${TONES[tone]}`}><Icon className="h-4 w-4" /></span>}
      </div>
      <div className="mt-3 font-display text-3xl font-extrabold">{value}</div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </div>
  )
}

export function ErrorBox({ children }) {
  if (!children) return null
  return <div className="animate-pop rounded-2xl bg-red-soft px-4 py-2.5 text-sm font-medium text-red">{children}</div>
}

export function PageTitle({ title, sub, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-extrabold">{title}</h1>
        {sub && <p className="mt-1 max-w-2xl text-sm text-muted">{sub}</p>}
      </div>
      {children}
    </div>
  )
}
