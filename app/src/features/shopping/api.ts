import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  increment,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { capitalize, normalize } from '../../lib/text'
import type { Product, ShoppingItem } from '../../types'

function householdRef(hid: string) {
  return doc(db, 'households', hid)
}

interface AddItemInput {
  householdId: string
  uid: string
  name: string
  qty?: string
  storeCategoryId: string
  product?: Product
  preferredBrand?: string
  notes?: string
  defaultQty?: string
}

export async function addItem({ householdId, uid, name, qty, storeCategoryId, product, preferredBrand, notes, defaultQty }: AddItemInput) {
  const hh = householdRef(householdId)
  const batch = writeBatch(db)
  const now = serverTimestamp()
  const cleanName = capitalize(name)

  let productId = product?.id
  if (!productId) {
    const productRef = doc(collection(hh, 'products'))
    productId = productRef.id
    batch.set(productRef, {
      name: cleanName,
      nameNormalized: normalize(cleanName),
      storeCategoryId,
      timesPurchased: 0,
      ...(preferredBrand ? { preferredBrand } : {}),
      ...(notes ? { notes } : {}),
      ...(defaultQty ? { defaultQty } : {}),
      createdBy: uid,
      createdAt: now,
      updatedAt: now,
    })
  }

  const itemRef = doc(collection(hh, 'shoppingItems'))
  batch.set(itemRef, {
    productId,
    name: product?.name ?? cleanName,
    qty: qty || null,
    storeCategoryId,
    status: 'pending',
    source: 'manual',
    addedBy: uid,
    createdBy: uid,
    createdAt: now,
    updatedAt: now,
  })

  await batch.commit()
}

export async function toggleItem(householdId: string, item: ShoppingItem, uid: string) {
  const hh = householdRef(householdId)
  const itemRef = doc(hh, 'shoppingItems', item.id)
  const checking = item.status === 'pending'
  const batch = writeBatch(db)
  batch.update(itemRef, {
    status: checking ? 'checked' : 'pending',
    checkedBy: checking ? uid : null,
    checkedAt: checking ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  })
  if (item.productId) {
    batch.update(doc(hh, 'products', item.productId), {
      timesPurchased: increment(checking ? 1 : -1),
      updatedAt: serverTimestamp(),
    })
  }
  await batch.commit()
}

export async function removeItem(householdId: string, itemId: string) {
  await updateDoc(doc(householdRef(householdId), 'shoppingItems', itemId), {
    status: 'archived',
    updatedAt: serverTimestamp(),
  })
}

export async function archiveChecked(householdId: string) {
  const snap = await getDocs(
    query(collection(householdRef(householdId), 'shoppingItems'), where('status', '==', 'checked')),
  )
  if (snap.empty) return
  const batch = writeBatch(db)
  snap.docs.forEach((d) => batch.update(d.ref, { status: 'archived', updatedAt: serverTimestamp() }))
  await batch.commit()
}

export async function updateProduct(
  householdId: string,
  productId: string,
  data: Partial<Pick<Product, 'name' | 'storeCategoryId' | 'preferredBrand' | 'avoidBrands' | 'notes' | 'defaultQty'>>,
) {
  const patch: Record<string, unknown> = { updatedAt: serverTimestamp() }
  for (const [key, value] of Object.entries(data)) {
    patch[key] = value === undefined ? deleteField() : value
  }
  if (data.name !== undefined) {
    patch.name = capitalize(data.name)
    patch.nameNormalized = normalize(data.name)
  }
  await updateDoc(doc(householdRef(householdId), 'products', productId), patch)
}

export async function deleteProduct(householdId: string, productId: string) {
  await deleteDoc(doc(householdRef(householdId), 'products', productId))
}
