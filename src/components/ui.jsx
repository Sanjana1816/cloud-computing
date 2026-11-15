import { Link, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { LogOut, Bus, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export function Logo({ size = 'md' }) {
  const big = size === 'lg'
  return (
    <Link to="/" className="group flex items-center gap-2.5">
      <span className={`${big ? 'h-11 w-11' : 'h-9 w-9'} grid -rotate-6 place-items-center rounded-xl border-2 border-ink bg-sun shadow-hard-sm transition group-hover:rotate-0`}>
        <Bus className={big ? 'h-6 w-6' : 'h-5 w-5'} strokeWidth={2.5} />
      </span>
      <span className={`font-display font-extrabold tracking-tight ${big ? 'text-3xl' : 'text-xl'}`}>
        routeradar<span className="text-pink">.</span>
      </span>
    </Link>
  )
}

const ROLE_STYLE = { student: 'bg-cobalt text-white', driver: 'bg-sun', admin: 'bg-pink' }

export function RoleChip({ role }) {
  return <span className={`chip ${ROLE_STYLE[role] || ROLE_STYLE.student} capitalize`}>{role}</span>
}

export function TopBar({ children }) {
  const { profile, logout } = useAuth()
  const nav = useNavigate()
  const links = profile?.role === 'admin' ? [['/map', 'Map'], ['/driver', 'Driver'], ['/admin', 'Admin']] : []
  return (
    <header className="sticky top-0 z-[1000] flex items-center gap-3 border-b-2 border-ink bg-paper px-4 py-3 sm:px-6">
      <Logo />
      {links.length > 0 && (
        <nav className="ml-3 hidden gap-1.5 md:flex">
          {links.map(([to, label]) => (
            <NavLink key={to} to={to} className={({ isActive }) =>
              `rounded-full border-2 px-3.5 py-1 text-sm font-bold transition ${isActive ? 'border-ink bg-ink text-paper' : 'border-transparent hover:border-ink'}`}>
              {label}
            </NavLink>
          ))}
        </nav>
      )}
      <div className="ml-auto flex items-center gap-3">
        {children}
        {profile && (
          <>
            <div className="hidden text-right sm:block">
              <div className="text-sm font-bold leading-tight">{profile.name}</div>
              <div className="text-[11px] text-ink/50">{profile.email}</div>
            </div>
            <RoleChip role={profile.role} />
            <button className="btn-ghost !p-2" title="Log out" onClick={async () => { await logout(); nav('/') }}>
              <LogOut className="h-4 w-4" />
            </button>
          </>
        )}
      </div>
    </header>
  )
}

const TONES = { lime: 'bg-lime', pink: 'bg-pink', sun: 'bg-sun', blue: 'bg-cobalt text-white', lilac: 'bg-lilac', mint: 'bg-mint' }

export function Pill({ icon: Icon, children, tone = 'lime' }) {
  return (
    <span className={`chip ${TONES[tone]}`}>
      {Icon && <Icon className="h-3 w-3" strokeWidth={2.5} />}
      {children}
    </span>
  )
}

export function FullScreenLoader({ label = 'Loading...' }) {
  return (
    <div className="grid h-full place-items-center">
      <div className="flex flex-col items-center gap-3 font-bold">
        <span className="grid h-14 w-14 animate-wiggle place-items-center rounded-2xl border-2 border-ink bg-sun shadow-hard">
          <Bus className="h-7 w-7" />
        </span>
        <span className="flex items-center gap-2 text-sm"><Loader2 className="h-4 w-4 animate-spin" />{label}</span>
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

export function Stat({ label, value, sub, icon: Icon, color = 'bg-lime' }) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-extrabold uppercase tracking-wide text-ink/60">{label}</span>
        {Icon && <span className={`grid h-8 w-8 place-items-center rounded-lg border-2 border-ink ${color}`}><Icon className="h-4 w-4" strokeWidth={2.5} /></span>}
      </div>
      <div className="mt-2 font-display text-3xl font-extrabold">{value}</div>
      {sub && <div className="mt-0.5 text-xs font-medium text-ink/55">{sub}</div>}
    </div>
  )
}

export function ErrorBox({ children }) {
  if (!children) return null
  return <div className="animate-pop rounded-xl border-2 border-ink bg-coral/30 px-3 py-2 text-sm font-semibold">{children}</div>
}

export function PageTitle({ title, sub, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
        {sub && <p className="mt-1 max-w-2xl text-sm font-medium text-ink/60">{sub}</p>}
      </div>
      {children}
    </div>
  )
}
