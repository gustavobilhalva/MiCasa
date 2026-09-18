import type { User } from 'firebase/auth'
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { db } from '../lib/firebase'
import { ensureUserDoc } from '../lib/household'
import type { Category, Household, Member, UserDoc } from '../types'
import { useCollection } from './useCollection'

interface HouseholdContextValue {
  user: User
  userDoc: UserDoc | null
  household: Household | null
  members: Member[]
  storeSectors: Category[]
  expenseCategories: Category[]
  loading: boolean
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null)

export function HouseholdProvider({ user, children }: { user: User; children: ReactNode }) {
  const [userDoc, setUserDoc] = useState<UserDoc | null | undefined>(undefined)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [household, setHousehold] = useState<Household | null | undefined>(undefined)

  useEffect(() => {
    ensureUserDoc(user)
    return onSnapshot(doc(db, 'users', user.uid), (snap) => {
      const data = snap.exists() ? (snap.data() as UserDoc) : null
      setUserDoc(data)
      // Ignore optimistic local writes: subcollection listeners must not start before the
      // server has accepted the household batch, or they fail with permission-denied.
      if (!snap.metadata.hasPendingWrites) setHouseholdId(data?.householdId ?? null)
    })
  }, [user])

  useEffect(() => {
    if (!householdId) {
      setHousehold(null)
      return
    }
    return onSnapshot(
      doc(db, 'households', householdId),
      (snap) => setHousehold(snap.exists() ? ({ id: snap.id, ...snap.data() } as Household) : null),
      (err) => {
        console.error('household listener', err)
        setHousehold(null)
      },
    )
  }, [householdId])

  const membersQuery = useMemo(
    () => (householdId ? query(collection(db, 'households', householdId, 'members')) : null),
    [householdId],
  )
  const { data: members } = useCollection<Member>(membersQuery)

  const categoriesQuery = useMemo(
    () => (householdId ? query(collection(db, 'households', householdId, 'categories'), orderBy('order')) : null),
    [householdId],
  )
  const { data: categories } = useCollection<Category>(categoriesQuery)

  const storeSectors = useMemo(() => {
    const store = categories.filter((c) => c.kind === 'store')
    const order = household?.settings.storeSectorOrder ?? []
    return [...store].sort((a, b) => {
      const ia = order.indexOf(a.id)
      const ib = order.indexOf(b.id)
      return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib)
    })
  }, [categories, household])

  const expenseCategories = useMemo(() => categories.filter((c) => c.kind === 'expense'), [categories])

  const value: HouseholdContextValue = {
    user,
    userDoc: userDoc ?? null,
    household: household ?? null,
    members,
    storeSectors,
    expenseCategories,
    loading: userDoc === undefined || (householdId !== null && household === undefined),
  }

  return <HouseholdContext.Provider value={value}>{children}</HouseholdContext.Provider>
}

export function useHousehold() {
  const ctx = useContext(HouseholdContext)
  if (!ctx) throw new Error('useHousehold fuera de HouseholdProvider')
  return ctx
}

export function useRequiredHousehold() {
  const ctx = useHousehold()
  if (!ctx.household) throw new Error('Sin hogar activo')
  return { ...ctx, household: ctx.household }
}
