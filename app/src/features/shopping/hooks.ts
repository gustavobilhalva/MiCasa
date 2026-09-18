import { collection, orderBy, query, where } from 'firebase/firestore'
import { useMemo } from 'react'
import { useCollection } from '../../hooks/useCollection'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { db } from '../../lib/firebase'
import type { Category, Product, ShoppingItem } from '../../types'

export function useShoppingList() {
  const { household, storeSectors } = useRequiredHousehold()

  const itemsQuery = useMemo(
    () =>
      query(
        collection(db, 'households', household.id, 'shoppingItems'),
        where('status', 'in', ['pending', 'checked']),
        orderBy('createdAt'),
      ),
    [household.id],
  )
  const { data: items, loading } = useCollection<ShoppingItem>(itemsQuery)

  const sections = useMemo(() => {
    const byCategory = new Map<string, ShoppingItem[]>()
    for (const item of items) {
      const list = byCategory.get(item.storeCategoryId) ?? []
      list.push(item)
      byCategory.set(item.storeCategoryId, list)
    }
    const known = storeSectors
      .map((sector) => ({ sector, items: sortItems(byCategory.get(sector.id) ?? []) }))
      .filter((s) => s.items.length > 0)
    const knownIds = new Set(storeSectors.map((s) => s.id))
    const orphan = sortItems(items.filter((i) => !knownIds.has(i.storeCategoryId)))
    if (orphan.length) {
      known.push({ sector: { id: '_otros', kind: 'store', name: 'Otros', order: 999 } as Category, items: orphan })
    }
    return known
  }, [items, storeSectors])

  const pendingCount = items.filter((i) => i.status === 'pending').length
  const checkedCount = items.length - pendingCount

  return { items, sections, pendingCount, checkedCount, loading }
}

function sortItems(items: ShoppingItem[]) {
  return [...items].sort((a, b) => {
    if (a.status !== b.status) return a.status === 'pending' ? -1 : 1
    return (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0)
  })
}

export function useProducts() {
  const { household } = useRequiredHousehold()
  const productsQuery = useMemo(
    () => query(collection(db, 'households', household.id, 'products'), orderBy('nameNormalized')),
    [household.id],
  )
  return useCollection<Product>(productsQuery)
}
