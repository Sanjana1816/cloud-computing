import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { GraduationCap, Smartphone, Loader2, Check } from 'lucide-react'
import { Logo, Mark, homeFor, ErrorBox } from '../components/ui'
import { useAuth } from '../context/AuthContext'

const ERRORS = {
  'auth/invalid-credential': 'Wrong email or password.',
  'auth/email-already-in-use': 'This email already has an account. Try logging in.',
  'auth/weak-password': 'Password needs at least 6 characters.',
  'auth/invalid-email': 'That email doesn’t look right.',
  'auth/popup-closed-by-user': 'Google sign-in was closed.',
  'auth/too-many-requests': 'Too many tries. Wait a minute and try again.',
}

export default function AuthPage() {
  const { user, profile, login, signup, google } = useAuth()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'student' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => setError(''), [mode])

  if (user && profile) return <Navigate to={homeFor(profile.role)} replace />

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function run(fn) {
    setBusy(true); setError('')
    try { await fn() } catch (e) { setError(ERRORS[e.code] || e.message) } finally { setBusy(false) }
  }

  const submit = (e) => {
    e.preventDefault()
    run(() => (mode === 'login' ? login(form.email, form.password) : signup(form)))
  }

  return (
    <div className="grid min-h-full lg:grid-cols-[1fr_1.1fr]">
      {/* left */}
      <div className="relative m-3 hidden overflow-hidden rounded-4xl bg-ink p-12 text-white lg:flex lg:flex-col">
        <div className="flex items-center gap-2.5">
          <Mark className="h-10 w-10 ring-1 ring-white/15" />
          <span className="font-display text-2xl font-extrabold">routeradar</span>
        </div>
        <div className="my-auto">
          <h2 className="text-5xl font-extrabold leading-[1.05]">Your bus,<br /><span className="text-lime">live in your pocket.</span></h2>
          <ul className="mt-10 space-y-4 text-white/70">
            {[
              'Passwords are handled by Firebase Auth. We never see them.',
              'What you can do depends on your role.',
              'Drivers only go live after the admin verifies them.',
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lime text-ink"><Check className="h-3 w-3" strokeWidth={3} /></span>{t}
              </li>
            ))}
          </ul>
        </div>
        <div className="absolute -bottom-24 -right-24 h-72 w-72 rounded-full border-[28px] border-violet/40" />
        <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-lime/90" />
      </div>

      {/* form */}
      <div className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-10 lg:hidden"><Logo size="lg" /></div>
          <h1 className="text-3xl font-extrabold">{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
          <p className="mt-1.5 text-sm text-muted">{mode === 'login' ? 'Log in to see where your bus is.' : 'Takes less than a minute.'}</p>

          <div className="mt-7 grid grid-cols-2 rounded-full bg-surface p-1 shadow-soft ring-1 ring-line">
            {[['login', 'Log in'], ['signup', 'Sign up']].map(([m, l]) => (
              <button key={m} onClick={() => setMode(m)}
                className={`rounded-full py-2 text-sm font-semibold transition ${mode === m ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}>{l}</button>
            ))}
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="label">I’m a</label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { v: 'student', icon: GraduationCap, t: 'Student', d: 'Track buses' },
                      { v: 'driver', icon: Smartphone, t: 'Driver', d: 'Share location' },
                    ].map(({ v, icon: I, t, d }) => (
                      <button type="button" key={v} onClick={() => setForm((f) => ({ ...f, role: v }))}
                        className={`rounded-2xl border bg-surface p-3.5 text-left transition ${form.role === v ? 'border-violet ring-4 ring-violet/15' : 'border-line hover:border-ink/25'}`}>
                        <I className={`h-5 w-5 ${form.role === v ? 'text-violet' : 'text-muted'}`} />
                        <div className="mt-2 text-sm font-semibold">{t}</div>
                        <div className="text-xs text-muted">{d}</div>
                      </button>
                    ))}
                  </div>
                  {form.role === 'driver' && (
                    <p className="mt-2 rounded-xl bg-amber-soft px-3 py-2 text-xs font-medium text-amber-deep">The transport admin has to verify driver accounts first.</p>
                  )}
                </div>
                <Field label="Full name" value={form.name} onChange={set('name')} required placeholder="Your name" />
              </>
            )}
            <Field label="Email" type="email" value={form.email} onChange={set('email')} required placeholder="you@college.edu" autoComplete="email" />
            <Field label="Password" type="password" value={form.password} onChange={set('password')} required minLength={6} placeholder="At least 6 characters"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />

            <ErrorBox>{error}</ErrorBox>

            <button disabled={busy} className="btn-primary w-full py-3 text-base">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {mode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </form>

          <div className="my-6 flex items-center gap-3 text-xs text-muted"><span className="h-px flex-1 bg-line" />or<span className="h-px flex-1 bg-line" /></div>
          <button disabled={busy} onClick={() => run(google)} className="btn-ghost w-full py-3">
            <svg className="h-4 w-4" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
            Continue with Google
          </button>
          <p className="mt-3 text-center text-xs text-muted">Google sign-in creates a student account.</p>
        </div>
      </div>
    </div>
  )
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input className="input" {...props} />
    </div>
  )
}
