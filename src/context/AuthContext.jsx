import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, updateProfile, GoogleAuthProvider, signInWithPopup,
} from 'firebase/auth'
import { doc, onSnapshot, setDoc, getDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

async function ensureProfile(user, { name, role = 'passenger' } = {}) {
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  if (snap.exists()) return
  // new users are passenger or unapproved driver. rules block anything else
  await setDoc(ref, {
    name: name || user.displayName || user.email.split('@')[0],
    email: user.email,
    role,
    approved: role === 'passenger',
    busId: null,
    homeStop: null,
    createdAt: serverTimestamp(),
  })
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined) // undefined = still loading
  const [profile, setProfile] = useState(null)

  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); if (!u) setProfile(null) }), [])

  // live profile, so approval shows up instantly
  useEffect(() => {
    if (!user) return
    // need metadata to know if this came from cache or server
    return onSnapshot(doc(db, 'users', user.uid), { includeMetadataChanges: true }, (s) =>
      setProfile(s.exists() ? { id: s.id, ...s.data(), fromCache: s.metadata.fromCache } : null))
  }, [user])

  // heartbeat for the "online now" count on the admin page
  useEffect(() => {
    if (!user || !profile) return
    const beat = () => setDoc(doc(db, 'presence', user.uid), {
      role: profile.role, lastSeen: serverTimestamp(), ua: navigator.userAgent.includes('Mobi') ? 'mobile' : 'desktop',
    }).catch(() => {})
    beat()
    const t = setInterval(beat, 25000)
    return () => clearInterval(t)
  }, [user, profile?.role])

  const value = {
    user,
    profile,
    loading: user === undefined || (user && !profile),
    async login(email, password) {
      await signInWithEmailAndPassword(auth, email, password)
    },
    async signup({ name, email, password, role }) {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(cred.user, { displayName: name })
      await ensureProfile(cred.user, { name, role })
    },
    async google() {
      const cred = await signInWithPopup(auth, new GoogleAuthProvider())
      await ensureProfile(cred.user)
    },
    logout: () => signOut(auth),
  }
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
