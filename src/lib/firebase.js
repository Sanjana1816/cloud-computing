// firebase setup
import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator } from 'firebase/auth'
import {
  initializeFirestore, persistentLocalCache, persistentMultipleTabManager, connectFirestoreEmulator,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const useEmulators = import.meta.env.VITE_USE_EMULATORS === 'true'

export const isConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId) || useEmulators

export const app = initializeApp(
  useEmulators && !firebaseConfig.projectId
    ? { apiKey: 'demo-key', projectId: 'demo-route-radar', authDomain: 'localhost' }
    : firebaseConfig,
)

export const auth = getAuth(app)

// offline cache so the app still works on bad mobile data
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

if (useEmulators) {
  const host = location.hostname
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true })
  connectFirestoreEmulator(db, host, 8080)
}
