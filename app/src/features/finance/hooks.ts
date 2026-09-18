import { collection, doc, onSnapshot, orderBy, query, Timestamp, where } from 'firebase/firestore'
import { useEffect, useMemo, useState } from 'react'
import { useCollection } from '../../hooks/useCollection'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { db } from '../../lib/firebase'
import { monthRange } from '../../lib/format'
import type { Budget, Card, Contribution, Expense, Fund, Installment, Service, ServiceInstance } from '../../types'

const col = (hid: string, name: string) => collection(db, 'households', hid, name)

export function useExpenses(month: string) {
  const { household } = useRequiredHousehold()
  const q = useMemo(() => {
    const { start, end } = monthRange(month)
    return query(
      col(household.id, 'expenses'),
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<', Timestamp.fromDate(end)),
      orderBy('date', 'desc'),
    )
  }, [household.id, month])
  return useCollection<Expense>(q)
}

export function useCards() {
  const { household } = useRequiredHousehold()
  const q = useMemo(() => query(col(household.id, 'cards'), where('active', '==', true)), [household.id])
  return useCollection<Card>(q)
}

export function useInstallments(fromMonth: string) {
  const { household } = useRequiredHousehold()
  const q = useMemo(
    () => query(col(household.id, 'installments'), where('statementMonth', '>=', fromMonth), orderBy('statementMonth')),
    [household.id, fromMonth],
  )
  return useCollection<Installment>(q)
}

export function useServices() {
  const { household } = useRequiredHousehold()
  const q = useMemo(() => query(col(household.id, 'services'), where('active', '==', true), orderBy('dueDay')), [household.id])
  return useCollection<Service>(q)
}

export function useServiceInstances(period: string) {
  const { household } = useRequiredHousehold()
  const q = useMemo(() => query(col(household.id, 'serviceInstances'), where('period', '==', period)), [household.id, period])
  return useCollection<ServiceInstance>(q)
}

export function useBudget(month: string) {
  const { household } = useRequiredHousehold()
  const [budget, setBudget] = useState<Budget | null>(null)
  useEffect(
    () =>
      onSnapshot(doc(db, 'households', household.id, 'budgets', month), (snap) =>
        setBudget(snap.exists() ? ({ id: snap.id, ...snap.data() } as Budget) : null),
      ),
    [household.id, month],
  )
  return budget
}

export function useFunds() {
  const { household } = useRequiredHousehold()
  const q = useMemo(() => query(col(household.id, 'funds'), orderBy('createdAt')), [household.id])
  return useCollection<Fund>(q)
}

export function useContributions(fundId: string) {
  const { household } = useRequiredHousehold()
  const q = useMemo(
    () => query(collection(db, 'households', household.id, 'funds', fundId, 'contributions'), orderBy('date', 'desc')),
    [household.id, fundId],
  )
  return useCollection<Contribution>(q)
}

export function useEffectiveSplit() {
  const { household, members } = useRequiredHousehold()
  return useMemo(() => {
    const split = household.settings.defaultSplit ?? {}
    const ids = members.map((m) => m.id)
    const covers = ids.length > 0 && ids.every((id) => typeof split[id] === 'number')
    if (covers) return split
    const share = ids.length ? 100 / ids.length : 100
    return Object.fromEntries(ids.map((id) => [id, share]))
  }, [household.settings.defaultSplit, members])
}
