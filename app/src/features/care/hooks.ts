import { differenceInCalendarDays } from 'date-fns'
import { collection, orderBy, query, Timestamp, where } from 'firebase/firestore'
import { useMemo } from 'react'
import { useCollection } from '../../hooks/useCollection'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { db } from '../../lib/firebase'
import type { Contact, HealthRecord, HouseholdDocument, MaintenanceTask, Person, Pet, Procedure, Warranty } from '../../types'

const col = (hid: string, name: string) => collection(db, 'households', hid, name)

export function usePeople() {
  const { household } = useRequiredHousehold()
  const q = useMemo(() => query(col(household.id, 'people'), orderBy('name')), [household.id])
  return useCollection<Person>(q)
}

export function usePets() {
  const { household } = useRequiredHousehold()
  const q = useMemo(() => query(col(household.id, 'pets'), orderBy('name')), [household.id])
  return useCollection<Pet>(q)
}

export function useContacts() {
  const { household } = useRequiredHousehold()
  const q = useMemo(() => query(col(household.id, 'contacts'), orderBy('name')), [household.id])
  return useCollection<Contact>(q)
}

export function useHealthRecords(subjectId: string) {
  const { household } = useRequiredHousehold()
  const q = useMemo(
    () => query(col(household.id, 'healthRecords'), where('subjectId', '==', subjectId), orderBy('doneAt', 'desc')),
    [household.id, subjectId],
  )
  return useCollection<HealthRecord>(q)
}

export function useDocuments() {
  const { household } = useRequiredHousehold()
  const q = useMemo(() => query(col(household.id, 'documents'), orderBy('label')), [household.id])
  return useCollection<HouseholdDocument>(q)
}

export function useProcedures() {
  const { household } = useRequiredHousehold()
  const q = useMemo(() => query(col(household.id, 'procedures'), orderBy('createdAt', 'desc')), [household.id])
  return useCollection<Procedure>(q)
}

export function useMaintenance() {
  const { household } = useRequiredHousehold()
  const q = useMemo(() => query(col(household.id, 'maintenance'), orderBy('nextDueAt')), [household.id])
  return useCollection<MaintenanceTask>(q)
}

export function useWarranties() {
  const { household } = useRequiredHousehold()
  const q = useMemo(() => query(col(household.id, 'warranties'), orderBy('expiresAt')), [household.id])
  return useCollection<Warranty>(q)
}

export interface UpcomingItem {
  key: string
  kind: 'health' | 'document' | 'procedure' | 'maintenance' | 'warranty'
  label: string
  detail?: string
  dueAt: Date
  days: number
  to: string
  assigneeUid?: string | null
}

// Vencimientos de los próximos `horizonDays` días (y los ya vencidos) de todos los módulos de cuidado.
export function useUpcomingCare(horizonDays = 30) {
  const { household } = useRequiredHousehold()
  const nowMs = useMemo(() => Date.now(), [])
  const horizon = useMemo(() => Timestamp.fromMillis(nowMs + horizonDays * 86400000), [nowMs, horizonDays])

  const healthQ = useMemo(() => query(col(household.id, 'healthRecords'), where('nextDueAt', '<=', horizon), orderBy('nextDueAt')), [household.id, horizon])
  const docsQ = useMemo(() => query(col(household.id, 'documents'), where('expiresAt', '<=', horizon), orderBy('expiresAt')), [household.id, horizon])
  const procQ = useMemo(() => query(col(household.id, 'procedures'), where('dueDate', '<=', horizon), orderBy('dueDate')), [household.id, horizon])
  const maintQ = useMemo(() => query(col(household.id, 'maintenance'), where('nextDueAt', '<=', horizon), orderBy('nextDueAt')), [household.id, horizon])
  const warrQ = useMemo(() => query(col(household.id, 'warranties'), where('expiresAt', '<=', horizon), orderBy('expiresAt')), [household.id, horizon])

  const health = useCollection<HealthRecord>(healthQ)
  const docs = useCollection<HouseholdDocument>(docsQ)
  const procs = useCollection<Procedure>(procQ)
  const maint = useCollection<MaintenanceTask>(maintQ)
  const warr = useCollection<Warranty>(warrQ)
  const { data: people } = usePeople()
  const { data: pets } = usePets()

  const items = useMemo(() => {
    const today = new Date()
    const subjectName = (r: HealthRecord) =>
      r.subjectType === 'pet' ? pets.find((p) => p.id === r.subjectId)?.name : people.find((p) => p.id === r.subjectId)?.name
    const out: UpcomingItem[] = []
    for (const r of health.data) {
      if (!r.nextDueAt) continue
      const d = r.nextDueAt.toDate()
      out.push({
        key: `h_${r.id}`,
        kind: 'health',
        label: `${r.name} · ${subjectName(r) ?? ''}`,
        dueAt: d,
        days: differenceInCalendarDays(d, today),
        to: r.subjectType === 'pet' ? `/mascotas/${r.subjectId}` : `/familia/${r.subjectId}`,
      })
    }
    for (const r of docs.data) {
      if (!r.expiresAt) continue
      const d = r.expiresAt.toDate()
      out.push({ key: `d_${r.id}`, kind: 'document', label: `${r.label} · ${r.subjectName}`, dueAt: d, days: differenceInCalendarDays(d, today), to: '/tramites' })
    }
    for (const r of procs.data) {
      if (!r.dueDate || r.status === 'done') continue
      const d = r.dueDate.toDate()
      out.push({ key: `p_${r.id}`, kind: 'procedure', label: r.title, dueAt: d, days: differenceInCalendarDays(d, today), to: '/tramites', assigneeUid: r.assigneeUid })
    }
    for (const r of maint.data) {
      const d = r.nextDueAt.toDate()
      out.push({ key: `m_${r.id}`, kind: 'maintenance', label: r.name, dueAt: d, days: differenceInCalendarDays(d, today), to: '/casa', assigneeUid: r.assigneeUid })
    }
    for (const r of warr.data) {
      const d = r.expiresAt.toDate()
      out.push({ key: `w_${r.id}`, kind: 'warranty', label: `Garantía ${r.item}`, dueAt: d, days: differenceInCalendarDays(d, today), to: '/casa' })
    }
    return out.sort((a, b) => a.days - b.days)
  }, [health.data, docs.data, procs.data, maint.data, warr.data, people, pets])

  return items
}
