import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { GraduationCap, Smartphone, Loader2, Mail, Lock, User, Check } from 'lucide-react'
import { Logo, homeFor, ErrorBox } from '../components/ui'
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
    <div className="grid min-h-full lg:grid-cols-2">
      {/* left */}
      <div className="relative hidden overflow-hidden border-r-2 border-ink bg-sun p-12 lg:flex lg:flex-col">
        <Logo size="lg" />
        <div className="my-auto">
          <h2 className="font-display text-6xl font-extrabold leading-[0.95] tracking-tight">your bus,<br />in your<br />pocket.</h2>
          <ul className="mt-10 space-y-3 font-semibold">
            {[
              'passwords are handled by Firebase Auth, we never see them',
              'what you can do depends on your role',
              'drivers only go live after the admin verifies them',
            ].map((t) => (
              <li key={t} className="flex items-start gap-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-2 border-ink bg-lime"><Check className="h-3 w-3" strokeWidth={3.5} /></span>{t}
              </li>
            ))}
          </ul>
        </div>
        <span className="sticker absolute bottom-10 right-10 rotate-6 bg-pink">see you at the stop ✌️</span>
      </div>

      {/* form */}
      <div className="flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden"><Logo size="lg" /></div>
          <h1 className="mb-6 font-display text-4xl font-extrabold tracking-tight">{mode === 'login' ? 'welcome back 👋' : 'make an account'}</h1>
          <div className="card p-6 sm:p-7">
            <div className="mb-6 grid grid-cols-2 gap-1 rounded-xl border-2 border-ink bg-paper p-1">
              {[['login', 'Log in'], ['signup', 'Sign up']].map(([m, l]) => (
                <button key={m} onClick={() => setMode(m)}
                  className={`rounded-lg py-2 text-sm font-extrabold transition ${mode === m ? 'bg-ink text-paper' : 'hover:bg-ink/5'}`}>{l}</button>
              ))}
            </div>

            <form onSubmit={submit} className="space-y-4">
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="label">I’m a</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { v: 'student', icon: GraduationCap, t: 'Student', d: 'track buses', c: 'bg-cobalt text-white' },
                        { v: 'driver', icon: Smartphone, t: 'Driver', d: 'share location', c: 'bg-sun' },
                      ].map(({ v, icon: I, t, d, c }) => (
                        <button type="button" key={v} onClick={() => setForm((f) => ({ ...f, role: v }))}
                          className={`rounded-xl border-2 border-ink p-3 text-left transition ${form.role === v ? `${c} shadow-hard-sm` : 'bg-cream hover:bg-paper'}`}>
                          <I className="h-5 w-5" />
                          <div className="mt-2 text-sm font-extrabold">{t}</div>
                          <div className="text-xs opacity-70">{d}</div>
                        </button>
                      ))}
                    </div>
                    {form.role === 'driver' && (
                      <p className="mt-2 rounded-lg bg-sun/40 px-2.5 py-1.5 text-xs font-semibold">Heads up: the transport admin has to verify driver accounts first.</p>
                    )}
                  </div>
                  <Field icon={User} label="Full name" value={form.name} onChange={set('name')} required placeholder="Your name" />
                </>
              )}
              <Field icon={Mail} label="Email" type="email" value={form.email} onChange={set('email')} required placeholder="you@college.edu" autoComplete="email" />
              <Field icon={Lock} label="Password" type="password" value={form.password} onChange={set('password')} required minLength={6} placeholder="••••••••"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />

              <ErrorBox>{error}</ErrorBox>

              <button disabled={busy} className="btn-primary w-full py-3 text-base">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === 'login' ? 'Log in' : 'Create account'}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-xs font-bold text-ink/40"><span className="h-0.5 flex-1 bg-ink/15" />or<span className="h-0.5 flex-1 bg-ink/15" /></div>
            <button disabled={busy} onClick={() => run(google)} className="btn-ghost w-full py-3">
              <svg className="h-4 w-4" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
              Continue with Google
            </button>
            <p className="mt-3 text-center text-[11px] font-medium text-ink/50">Google sign-in creates a student account.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ icon: I, label, ...props }) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="relative">
        <I className="pointer-events-none absolute left-3.5 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-ink/50" />
        <input className="input pl-10" {...props} />
      </div>
    </div>
  )
}
