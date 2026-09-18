import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { useEffect, useMemo, useState } from 'react'
import { useCollection } from '../../hooks/useCollection'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { db } from '../../lib/firebase'
import type { InventoryItem, MealPlan, Recipe } from '../../types'
import { weekId } from './api'

export function useRecipes() {
  const { household } = useRequiredHousehold()
  const q = useMemo(() => query(collection(db, 'households', household.id, 'recipes'), orderBy('nameNormalized')), [household.id])
  return useCollection<Recipe>(q)
}

export function useMealPlan(weekStart: Date) {
  const { household } = useRequiredHousehold()
  const [plan, setPlan] = useState<MealPlan | null>(null)
  const id = weekId(weekStart)
  useEffect(
    () =>
      onSnapshot(doc(db, 'households', household.id, 'mealPlan', id), (snap) =>
        setPlan(snap.exists() ? ({ id: snap.id, ...snap.data() } as MealPlan) : null),
      ),
    [household.id, id],
  )
  return plan
}

export function useInventory() {
  const { household } = useRequiredHousehold()
  const q = useMemo(() => query(collection(db, 'households', household.id, 'inventory'), orderBy('nameNormalized')), [household.id])
  return useCollection<InventoryItem>(q)
}
