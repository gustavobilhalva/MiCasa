import { addMonths } from 'date-fns'
import { collection, deleteDoc, deleteField, doc, getDocs, query, serverTimestamp, setDoc, Timestamp, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { capitalize, normalize } from '../../lib/text'
import type { Category, Contact, HealthRecord, HouseholdDocument, MaintenanceTask, Person, Pet, Procedure, Product, Warranty } from '../../types'

const hh = (hid: string) => doc(db, 'households', hid)

function patch<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v === undefined ? deleteField() : v]))
}
function clean<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))
}

async function upsert(hid: string, col: string, uid: string, data: Record<string, unknown>, id?: string) {
  const ref = id ? doc(hh(hid), col, id) : doc(collection(hh(hid), col))
  if (id) await setDoc(ref, { ...patch(data), updatedAt: serverTimestamp() }, { merge: true })
  else await setDoc(ref, clean({ ...data, createdBy: uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() }))
  return ref.id
}

export const savePerson = (hid: string, uid: string, data: Omit<Person, 'id'>, id?: string) => upsert(hid, 'people', uid, data, id)
export const deletePerson = (hid: string, id: string) => deleteDoc(doc(hh(hid), 'people', id))

export const savePet = (hid: string, uid: string, data: Omit<Pet, 'id'>, id?: string) => upsert(hid, 'pets', uid, data, id)
export const deletePet = (hid: string, id: string) => deleteDoc(doc(hh(hid), 'pets', id))

export const saveContact = (hid: string, uid: string, data: Omit<Contact, 'id'>, id?: string) => upsert(hid, 'contacts', uid, data, id)
export const deleteContact = (hid: string, id: string) => deleteDoc(doc(hh(hid), 'contacts', id))

export const saveDocument = (hid: string, uid: string, data: Omit<HouseholdDocument, 'id'>, id?: string) => upsert(hid, 'documents', uid, data, id)
export const deleteDocument = (hid: string, id: string) => deleteDoc(doc(hh(hid), 'documents', id))

export const saveWarranty = (hid: string, uid: string, data: Omit<Warranty, 'id'>, id?: string) => upsert(hid, 'warranties', uid, data, id)
export const deleteWarranty = (hid: string, id: string) => deleteDoc(doc(hh(hid), 'warranties', id))

// ---------- Salud ----------

export interface HealthInput {
  subjectType: 'person' | 'pet'
  subjectId: string
  type: HealthRecord['type']
  name: string
  doneAt: Date
  product?: string
  notes?: string
  intervalMonths?: number
}

export async function addHealthRecord(hid: string, uid: string, input: HealthInput) {
  const batch = writeBatch(db)
  const previous = await getDocs(
    query(
      collection(hh(hid), 'healthRecords'),
      where('subjectId', '==', input.subjectId),
      where('type', '==', input.type),
      where('name', '==', input.name),
    ),
  )
  previous.docs.forEach((d) => batch.update(d.ref, { nextDueAt: null, updatedAt: serverTimestamp() }))
  batch.set(
    doc(collection(hh(hid), 'healthRecords')),
    clean({
      subjectType: input.subjectType,
      subjectId: input.subjectId,
      type: input.type,
      name: input.name,
      doneAt: Timestamp.fromDate(input.doneAt),
      product: input.product,
      notes: input.notes,
      intervalMonths: input.intervalMonths,
      nextDueAt: input.intervalMonths ? Timestamp.fromDate(addMonths(input.doneAt, input.intervalMonths)) : null,
      createdBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }),
  )
  await batch.commit()
}

export const deleteHealthRecord = (hid: string, id: string) => deleteDoc(doc(hh(hid), 'healthRecords', id))

// ---------- Trámites ----------

export interface ProcedureInput {
  title: string
  templateKey?: string
  steps: { text: string; done: boolean }[]
  assigneeUid?: string | null
  dueDate?: Date | null
  notes?: string
}

export async function saveProcedure(hid: string, uid: string, input: ProcedureInput, id?: string) {
  const doneCount = input.steps.filter((s) => s.done).length
  const status: Procedure['status'] = input.steps.length > 0 && doneCount === input.steps.length ? 'done' : doneCount > 0 ? 'in_progress' : 'pending'
  return upsert(
    hid,
    'procedures',
    uid,
    {
      title: input.title,
      templateKey: input.templateKey,
      steps: input.steps,
      assigneeUid: input.assigneeUid ?? null,
      dueDate: input.dueDate ? Timestamp.fromDate(input.dueDate) : null,
      status,
      notes: input.notes,
    },
    id,
  )
}

export async function toggleProcedureStep(hid: string, proc: Procedure, index: number) {
  const steps = proc.steps.map((s, i) => (i === index ? { ...s, done: !s.done } : s))
  const doneCount = steps.filter((s) => s.done).length
  const status: Procedure['status'] = steps.length > 0 && doneCount === steps.length ? 'done' : doneCount > 0 ? 'in_progress' : 'pending'
  await updateDoc(doc(hh(hid), 'procedures', proc.id), { steps, status, updatedAt: serverTimestamp() })
}

export const deleteProcedure = (hid: string, id: string) => deleteDoc(doc(hh(hid), 'procedures', id))

// ---------- Mantenimiento ----------

export interface MaintenanceInput {
  name: string
  intervalMonths: number
  lastDoneAt?: Date | null
  nextDueAt?: Date
  assigneeUid?: string | null
  notes?: string
}

export async function saveMaintenance(hid: string, uid: string, input: MaintenanceInput, id?: string) {
  const next = input.nextDueAt ?? (input.lastDoneAt ? addMonths(input.lastDoneAt, input.intervalMonths) : addMonths(new Date(), input.intervalMonths))
  return upsert(
    hid,
    'maintenance',
    uid,
    {
      name: input.name,
      intervalMonths: input.intervalMonths,
      lastDoneAt: input.lastDoneAt ? Timestamp.fromDate(input.lastDoneAt) : null,
      nextDueAt: Timestamp.fromDate(next),
      assigneeUid: input.assigneeUid ?? null,
      notes: input.notes,
    },
    id,
  )
}

export async function markMaintenanceDone(hid: string, task: MaintenanceTask) {
  const now = new Date()
  await updateDoc(doc(hh(hid), 'maintenance', task.id), {
    lastDoneAt: Timestamp.fromDate(now),
    nextDueAt: Timestamp.fromDate(addMonths(now, task.intervalMonths)),
    updatedAt: serverTimestamp(),
  })
}

export const deleteMaintenance = (hid: string, id: string) => deleteDoc(doc(hh(hid), 'maintenance', id))

// ---------- Mascotas: comida ----------

export async function requestPetFood(hid: string, uid: string, pet: Pet, products: Product[], storeSectors: Category[]) {
  const pending = await getDocs(query(collection(hh(hid), 'shoppingItems'), where('status', '==', 'pending')))
  const name = pet.foodName ?? `Alimento ${pet.name}`
  const norm = normalize(name)
  if (pending.docs.some((d) => d.data().productId === pet.foodProductId || normalize(d.data().name) === norm)) return 'already'

  const product = products.find((p) => p.id === pet.foodProductId) ?? products.find((p) => p.nameNormalized === norm)
  const sector = storeSectors.find((s) => normalize(s.name) === 'mascotas')?.id ?? storeSectors[storeSectors.length - 1]?.id ?? 'otros'
  const batch = writeBatch(db)
  const now = serverTimestamp()
  let productId = product?.id
  if (!productId) {
    const pref = doc(collection(hh(hid), 'products'))
    productId = pref.id
    batch.set(pref, { name: capitalize(name), nameNormalized: norm, storeCategoryId: sector, timesPurchased: 0, createdBy: uid, createdAt: now, updatedAt: now })
    batch.update(doc(hh(hid), 'pets', pet.id), { foodProductId: productId, foodName: capitalize(name), updatedAt: now })
  }
  batch.set(doc(collection(hh(hid), 'shoppingItems')), {
    productId,
    name: product?.name ?? capitalize(name),
    qty: product?.defaultQty ?? null,
    storeCategoryId: product?.storeCategoryId ?? sector,
    status: 'pending',
    source: 'pet',
    sourceRef: pet.id,
    addedBy: uid,
    createdBy: uid,
    createdAt: now,
    updatedAt: now,
  })
  await batch.commit()
  return 'added'
}
