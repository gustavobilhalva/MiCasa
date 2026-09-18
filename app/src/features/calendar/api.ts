import { collection, deleteDoc, deleteField, doc, serverTimestamp, setDoc, Timestamp, updateDoc } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import type { CalendarEvent, Note, RecurrenceFreq } from '../../types'

const hh = (hid: string) => doc(db, 'households', hid)

function patch<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v === undefined ? deleteField() : v]))
}
function clean<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))
}

export interface EventInput {
  title: string
  categoryId: string
  start: Date
  end?: Date
  allDay: boolean
  location?: string
  notes?: string
  roles?: Record<string, string | null>
  recurrence?: { freq: RecurrenceFreq; until?: Date }
}

export async function saveEvent(householdId: string, uid: string, input: EventInput, id?: string) {
  const ref = id ? doc(hh(householdId), 'events', id) : doc(collection(hh(householdId), 'events'))
  const data = {
    title: input.title,
    categoryId: input.categoryId,
    start: Timestamp.fromDate(input.start),
    end: input.end ? Timestamp.fromDate(input.end) : undefined,
    allDay: input.allDay,
    location: input.location,
    notes: input.notes,
    roles: input.roles,
    recurring: Boolean(input.recurrence),
    recurrence: input.recurrence
      ? { freq: input.recurrence.freq, until: input.recurrence.until ? Timestamp.fromDate(input.recurrence.until) : null }
      : undefined,
    updatedAt: serverTimestamp(),
  }
  if (id) await setDoc(ref, patch(data), { merge: true })
  else await setDoc(ref, clean({ ...data, createdBy: uid, createdAt: serverTimestamp() }))
  return ref.id
}

export async function deleteEvent(householdId: string, id: string) {
  await deleteDoc(doc(hh(householdId), 'events', id))
}

export type EventDoc = CalendarEvent

// ---------- Notas ----------

export interface NoteInput {
  text: string
  date: Date
  time?: string
  assigneeUid?: string | null
  checklist?: { text: string; done: boolean }[]
}

export async function saveNote(householdId: string, uid: string, input: NoteInput, id?: string) {
  const ref = id ? doc(hh(householdId), 'notes', id) : doc(collection(hh(householdId), 'notes'))
  const data = {
    text: input.text,
    date: Timestamp.fromDate(input.date),
    time: input.time,
    assigneeUid: input.assigneeUid ?? null,
    checklist: input.checklist,
    updatedAt: serverTimestamp(),
  }
  if (id) await setDoc(ref, patch(data), { merge: true })
  else await setDoc(ref, clean({ ...data, done: false, createdBy: uid, createdAt: serverTimestamp() }))
  return ref.id
}

export async function toggleNote(householdId: string, note: Note) {
  await updateDoc(doc(hh(householdId), 'notes', note.id), { done: !note.done, updatedAt: serverTimestamp() })
}

export async function toggleChecklistItem(householdId: string, note: Note, index: number) {
  const checklist = (note.checklist ?? []).map((c, i) => (i === index ? { ...c, done: !c.done } : c))
  const done = checklist.length > 0 && checklist.every((c) => c.done)
  await updateDoc(doc(hh(householdId), 'notes', note.id), { checklist, done, updatedAt: serverTimestamp() })
}

export async function deleteNote(householdId: string, id: string) {
  await deleteDoc(doc(hh(householdId), 'notes', id))
}
