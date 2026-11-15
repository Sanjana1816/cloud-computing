import { Logo } from '../components/ui'

// only shows up when the firebase env vars are missing
export default function SetupNeeded() {
  return (
    <div className="grid min-h-full place-items-center p-6">
      <div className="card max-w-lg p-8">
        <Logo size="lg" />
        <h1 className="mt-6 text-2xl font-extrabold">Firebase isn’t connected yet</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Copy <code className="rounded-md bg-canvas px-1.5 py-0.5 text-ink">.env.example</code> to <code className="rounded-md bg-canvas px-1.5 py-0.5 text-ink">.env.local</code> and
          fill in the values from Firebase Console → Project settings → Your apps. On Vercel, add the same keys under
          Settings → Environment Variables and redeploy.
        </p>
      </div>
    </div>
  )
}
