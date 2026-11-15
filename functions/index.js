// cloud functions (optional, needs the Blaze plan)

import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { onDocumentUpdated } from 'firebase-functions/v2/firestore'
import { setGlobalOptions, logger } from 'firebase-functions/v2'

initializeApp()
const db = getFirestore()

// cap instances so the bill stays small
setGlobalOptions({ region: 'asia-south1', maxInstances: 5 })

const STALE_AFTER_MS = 2 * 60 * 1000

// every 2 min: buses that stopped sending (phone died etc) -> mark offline + close trip
export const cleanupStaleBuses = onSchedule({ schedule: 'every 2 minutes', timeZone: 'Asia/Kolkata' }, async () => {
  const cutoff = Timestamp.fromMillis(Date.now() - STALE_AFTER_MS)
  const stale = await db.collection('live')
    .where('active', '==', true)
    .where('updatedAt', '<', cutoff)
    .get()

  if (stale.empty) return
  const batch = db.batch()
  stale.docs.forEach((d) => {
    batch.update(d.ref, { active: false, speed: 0, endedBy: 'cleanup', updatedAt: FieldValue.serverTimestamp() })
    const tripId = d.get('tripId')
    if (tripId) batch.set(db.collection('trips').doc(tripId), { endedAt: FieldValue.serverTimestamp(), endedBy: 'cleanup' }, { merge: true })
  })
  await batch.commit()
  logger.info(`Marked ${stale.size} stale bus(es) offline`)
})

// log role / approval / bus changes. clients cannot write auditLogs (see rules)
export const auditUserChanges = onDocumentUpdated('users/{uid}', async (event) => {
  const before = event.data.before.data()
  const after = event.data.after.data()
  const watched = ['role', 'approved', 'busId']
  const changes = watched
    .filter((k) => before[k] !== after[k])
    .map((k) => ({ field: k, from: before[k] ?? null, to: after[k] ?? null }))
  if (!changes.length) return

  await db.collection('auditLogs').add({
    uid: event.params.uid,
    name: after.name,
    email: after.email,
    changes,
    at: FieldValue.serverTimestamp(),
  })
})
