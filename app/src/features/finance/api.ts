import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { buildInstallmentPlan, totalWithSurcharge } from '../../lib/installments'
import type { Card, Fund, PaymentMethod, Service, ServiceInstance } from '../../types'

const hh = (hid: string) => doc(db, 'households', hid)

function clean<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))
}

function patch<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v === undefined ? deleteField() : v]))
}

// ---------- Gastos ----------

export interface ExpenseInput {
  amount: number
  categoryId: string
  paidBy: string
  method: PaymentMethod
  date: Date
  note?: string
  split?: Record<string, number>
  card?: Card
  installmentCount?: number
  surchargePct?: number
  serviceInstanceId?: string
  fundId?: string
  settlement?: boolean
  label?: string
}

export async function addExpense(householdId: string, uid: string, input: ExpenseInput) {
  const batch = writeBatch(db)
  const now = serverTimestamp()
  const expenseRef = doc(collection(hh(householdId), 'expenses'))

  const isInstallments = input.method === 'credit' && input.card && (input.installmentCount ?? 1) > 1
  const count = input.installmentCount ?? 1
  const surchargePct = input.surchargePct ?? 0

  batch.set(
    expenseRef,
    clean({
      amount: input.amount,
      categoryId: input.categoryId,
      paidBy: input.paidBy,
      method: input.method,
      cardId: input.card?.id,
      date: Timestamp.fromDate(input.date),
      note: input.note,
      split: input.split,
      installments: isInstallments ? { count, surchargePct, totalWithSurcharge: totalWithSurcharge(input.amount, surchargePct) } : undefined,
      serviceInstanceId: input.serviceInstanceId,
      fundId: input.fundId,
      settlement: input.settlement,
      createdBy: uid,
      createdAt: now,
      updatedAt: now,
    }),
  )

  if (input.method === 'credit' && input.card) {
    const plan = buildInstallmentPlan({
      total: input.amount,
      count: isInstallments ? count : 1,
      surchargePct: isInstallments ? surchargePct : 0,
      purchaseDate: input.date,
      closingDay: input.card.closingDay,
      dueDay: input.card.dueDay,
    })
    const label = input.label ?? input.note ?? 'Compra'
    for (const item of plan) {
      batch.set(doc(collection(hh(householdId), 'installments')), {
        expenseId: expenseRef.id,
        cardId: input.card.id,
        number: item.number,
        count: plan.length,
        amount: item.amount,
        statementMonth: item.statementMonth,
        dueDate: Timestamp.fromDate(item.dueDate),
        paid: false,
        label,
        createdBy: uid,
        createdAt: now,
        updatedAt: now,
      })
    }
  }

  await batch.commit()
  return expenseRef.id
}

export async function deleteExpense(householdId: string, expenseId: string) {
  const batch = writeBatch(db)
  const inst = await getDocs(query(collection(hh(householdId), 'installments'), where('expenseId', '==', expenseId)))
  inst.docs.forEach((d) => batch.delete(d.ref))
  const svc = await getDocs(query(collection(hh(householdId), 'serviceInstances'), where('expenseId', '==', expenseId)))
  svc.docs.forEach((d) =>
    batch.update(d.ref, { status: 'pending', expenseId: deleteField(), amountPaid: deleteField(), paidAt: deleteField(), paidBy: deleteField() }),
  )
  batch.delete(doc(hh(householdId), 'expenses', expenseId))
  await batch.commit()
}

// ---------- Tarjetas ----------

export async function saveCard(householdId: string, uid: string, data: Omit<Card, 'id'>, id?: string) {
  const ref = id ? doc(hh(householdId), 'cards', id) : doc(collection(hh(householdId), 'cards'))
  await setDoc(ref, clean({ ...data, updatedAt: serverTimestamp(), ...(id ? {} : { createdBy: uid, createdAt: serverTimestamp() }) }), { merge: true })
  return ref.id
}

export async function deleteCard(householdId: string, id: string) {
  await updateDoc(doc(hh(householdId), 'cards', id), { active: false, updatedAt: serverTimestamp() })
}

export async function toggleInstallmentPaid(householdId: string, id: string, paid: boolean) {
  await updateDoc(doc(hh(householdId), 'installments', id), { paid, updatedAt: serverTimestamp() })
}

// ---------- Servicios ----------

export async function saveService(householdId: string, uid: string, data: Omit<Service, 'id'>, id?: string) {
  const ref = id ? doc(hh(householdId), 'services', id) : doc(collection(hh(householdId), 'services'))
  const payload = id ? patch({ ...data }) : clean({ ...data, createdBy: uid, createdAt: serverTimestamp() })
  await setDoc(ref, { ...payload, updatedAt: serverTimestamp() }, { merge: true })
  return ref.id
}

export async function deleteService(householdId: string, id: string) {
  await updateDoc(doc(hh(householdId), 'services', id), { active: false, updatedAt: serverTimestamp() })
}

function periodApplies(service: Service, period: string) {
  const month = Number(period.split('-')[1])
  if (service.frequency === 'monthly') return true
  if (service.frequency === 'bimonthly') return month % 2 === (service.dueMonth ?? 1) % 2
  return month === (service.dueMonth ?? 1)
}

export function instanceId(serviceId: string, period: string) {
  return `${serviceId}_${period}`
}

export async function ensureServiceInstances(
  householdId: string,
  uid: string,
  services: Service[],
  existing: ServiceInstance[],
  period: string,
) {
  const existingIds = new Set(existing.map((i) => i.id))
  const batch = writeBatch(db)
  let writes = 0
  const [y, m] = period.split('-').map(Number)
  for (const s of services) {
    if (!s.active || !periodApplies(s, period)) continue
    const id = instanceId(s.id, period)
    if (existingIds.has(id)) continue
    const last = new Date(y, m, 0).getDate()
    batch.set(doc(hh(householdId), 'serviceInstances', id), {
      serviceId: s.id,
      period,
      dueDate: Timestamp.fromDate(new Date(y, m - 1, Math.min(s.dueDay, last), 12)),
      assigneeUid: s.defaultAssigneeUid ?? null,
      status: 'pending',
      createdBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    writes++
  }
  if (writes) await batch.commit()
}

export async function assignInstance(householdId: string, id: string, assigneeUid: string | null) {
  await updateDoc(doc(hh(householdId), 'serviceInstances', id), { assigneeUid, updatedAt: serverTimestamp() })
}

export async function payInstance(
  householdId: string,
  uid: string,
  instance: ServiceInstance,
  service: Service,
  amount: number,
  method: PaymentMethod,
  card?: Card,
) {
  const expenseId = await addExpense(householdId, uid, {
    amount,
    categoryId: service.expenseCategoryId,
    paidBy: uid,
    method,
    card,
    date: new Date(),
    note: `${service.name} · ${instance.period}`,
    serviceInstanceId: instance.id,
    label: service.name,
  })
  await updateDoc(doc(hh(householdId), 'serviceInstances', instance.id), {
    status: 'paid',
    amountPaid: amount,
    paidAt: serverTimestamp(),
    paidBy: uid,
    expenseId,
    updatedAt: serverTimestamp(),
  })
}

export async function skipInstance(householdId: string, id: string, skipped: boolean) {
  await updateDoc(doc(hh(householdId), 'serviceInstances', id), { status: skipped ? 'skipped' : 'pending', updatedAt: serverTimestamp() })
}

// ---------- Presupuesto ----------

export async function setBudgetLimit(householdId: string, month: string, categoryId: string, limit: number | null) {
  const ref = doc(hh(householdId), 'budgets', month)
  await setDoc(
    ref,
    { limits: { [categoryId]: limit === null ? deleteField() : limit }, updatedAt: serverTimestamp() },
    { merge: true },
  )
}

// ---------- Fondos ----------

export async function saveFund(householdId: string, uid: string, data: Omit<Fund, 'id' | 'currentAmount'>, id?: string) {
  const ref = id ? doc(hh(householdId), 'funds', id) : doc(collection(hh(householdId), 'funds'))
  const payload = id ? patch({ ...data }) : clean({ ...data, currentAmount: 0, createdBy: uid, createdAt: serverTimestamp() })
  await setDoc(ref, { ...payload, updatedAt: serverTimestamp() }, { merge: true })
  return ref.id
}

export async function addContribution(householdId: string, fundId: string, uid: string, amount: number, note?: string) {
  const batch = writeBatch(db)
  const fundRef = doc(hh(householdId), 'funds', fundId)
  batch.set(
    doc(collection(fundRef, 'contributions')),
    clean({ amount, byUid: uid, date: Timestamp.now(), note, createdBy: uid, createdAt: serverTimestamp() }),
  )
  batch.update(fundRef, { currentAmount: increment(amount), updatedAt: serverTimestamp() })
  await batch.commit()
}

export async function deleteContribution(householdId: string, fundId: string, contributionId: string, amount: number) {
  const batch = writeBatch(db)
  const fundRef = doc(hh(householdId), 'funds', fundId)
  batch.delete(doc(fundRef, 'contributions', contributionId))
  batch.update(fundRef, { currentAmount: increment(-amount), updatedAt: serverTimestamp() })
  await batch.commit()
}

export async function archiveFund(householdId: string, fundId: string, archived: boolean) {
  await updateDoc(doc(hh(householdId), 'funds', fundId), { archived, updatedAt: serverTimestamp() })
}

export async function removeFund(householdId: string, fundId: string) {
  await deleteDoc(doc(hh(householdId), 'funds', fundId))
}

// ---------- Ingresos ----------

export interface IncomeInput {
  amount: number
  categoryId: string
  byUid: string
  date: Date
  note?: string
}

export async function addIncome(householdId: string, uid: string, input: IncomeInput, id?: string) {
  const ref = id ? doc(hh(householdId), 'incomes', id) : doc(collection(hh(householdId), 'incomes'))
  const data = {
    amount: input.amount,
    categoryId: input.categoryId,
    byUid: input.byUid,
    date: Timestamp.fromDate(input.date),
    note: input.note,
    updatedAt: serverTimestamp(),
  }
  if (id) await setDoc(ref, patch(data), { merge: true })
  else await setDoc(ref, clean({ ...data, createdBy: uid, createdAt: serverTimestamp() }))
  return ref.id
}

export async function deleteIncome(householdId: string, id: string) {
  await deleteDoc(doc(hh(householdId), 'incomes', id))
}
