import { collection, deleteDoc, deleteField, doc, getDocs, increment, query, serverTimestamp, setDoc, Timestamp, updateDoc, where, writeBatch } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { capitalize, normalize } from '../../lib/text'
import type { Category, InventoryItem, MealEntry, MealSlot, Product, RecipeIngredient, ShoppingItem } from '../../types'

const hh = (hid: string) => doc(db, 'households', hid)

function patch<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, v === undefined ? deleteField() : v]))
}
function clean<T extends Record<string, unknown>>(obj: T) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined))
}

// ---------- Recetas ----------

export interface RecipeInput {
  name: string
  ingredients: RecipeIngredient[]
  servings?: number
  prepMinutes?: number
  notes?: string
  tags?: string[]
}

export async function saveRecipe(householdId: string, uid: string, input: RecipeInput, id?: string) {
  const ref = id ? doc(hh(householdId), 'recipes', id) : doc(collection(hh(householdId), 'recipes'))
  const data = {
    name: capitalize(input.name),
    nameNormalized: normalize(input.name),
    ingredients: input.ingredients.map((i) => clean({ ...i })),
    servings: input.servings,
    prepMinutes: input.prepMinutes,
    notes: input.notes,
    tags: input.tags,
    updatedAt: serverTimestamp(),
  }
  if (id) await setDoc(ref, patch(data), { merge: true })
  else await setDoc(ref, clean({ ...data, timesPlanned: 0, createdBy: uid, createdAt: serverTimestamp() }))
  return ref.id
}

export async function deleteRecipe(householdId: string, id: string) {
  await deleteDoc(doc(hh(householdId), 'recipes', id))
}

// ---------- Plan semanal ----------

export function weekId(weekStart: Date) {
  const y = weekStart.getFullYear()
  const m = String(weekStart.getMonth() + 1).padStart(2, '0')
  const d = String(weekStart.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export async function setMealSlot(householdId: string, uid: string, weekStart: Date, date: Date, slot: MealSlot, entry: MealEntry | null) {
  const ref = doc(hh(householdId), 'mealPlan', weekId(weekStart))
  await setDoc(
    ref,
    {
      weekStart: Timestamp.fromDate(weekStart),
      slots: { [isoDate(date)]: { [slot]: entry ? clean({ ...entry }) : deleteField() } },
      updatedBy: uid,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
  if (entry?.recipeId) {
    await updateDoc(doc(hh(householdId), 'recipes', entry.recipeId), { timesPlanned: increment(1), lastPlannedAt: serverTimestamp() })
  }
}

// ---------- Despensa ----------

export interface InventoryInput {
  name: string
  productId?: string
  qty?: string
  location: InventoryItem['location']
  expiresAt?: Date
}

export async function saveInventoryItem(householdId: string, uid: string, input: InventoryInput, id?: string) {
  const ref = id ? doc(hh(householdId), 'inventory', id) : doc(collection(hh(householdId), 'inventory'))
  const data = {
    name: capitalize(input.name),
    nameNormalized: normalize(input.name),
    productId: input.productId,
    qty: input.qty,
    location: input.location,
    expiresAt: input.expiresAt ? Timestamp.fromDate(input.expiresAt) : undefined,
    updatedAt: serverTimestamp(),
  }
  if (id) await setDoc(ref, patch(data), { merge: true })
  else await setDoc(ref, clean({ ...data, createdBy: uid, createdAt: serverTimestamp() }))
}

export async function deleteInventoryItem(householdId: string, id: string) {
  await deleteDoc(doc(hh(householdId), 'inventory', id))
}

// ---------- Faltantes → lista ----------

interface MissingContext {
  products: Product[]
  inventory: InventoryItem[]
  excludedIngredients: string[]
  storeSectors: Category[]
}

export interface MissingResult {
  toAdd: { ingredient: RecipeIngredient; product?: Product; storeCategoryId: string }[]
  excluded: RecipeIngredient[]
  inPantry: RecipeIngredient[]
  alreadyListed: RecipeIngredient[]
}

export async function computeMissing(householdId: string, ingredients: RecipeIngredient[], ctx: MissingContext): Promise<MissingResult> {
  const pendingSnap = await getDocs(query(collection(hh(householdId), 'shoppingItems'), where('status', '==', 'pending')))
  const pending = pendingSnap.docs.map((d) => d.data() as ShoppingItem)
  const pendingNames = new Set(pending.map((p) => normalize(p.name)))
  const pendingProductIds = new Set(pending.map((p) => p.productId).filter(Boolean))
  const pantry = new Set(ctx.inventory.map((i) => i.nameNormalized))
  const excluded = ctx.excludedIngredients.map(normalize).filter(Boolean)
  const productsByNorm = new Map(ctx.products.map((p) => [p.nameNormalized, p]))
  const productsById = new Map(ctx.products.map((p) => [p.id, p]))
  const fallbackSector = ctx.storeSectors.find((s) => normalize(s.name) === 'otros')?.id ?? ctx.storeSectors[ctx.storeSectors.length - 1]?.id ?? 'otros'

  const result: MissingResult = { toAdd: [], excluded: [], inPantry: [], alreadyListed: [] }
  const seen = new Set<string>()
  for (const ing of ingredients) {
    const norm = normalize(ing.name)
    if (!norm || seen.has(norm)) continue
    seen.add(norm)
    if (excluded.some((x) => norm.includes(x))) {
      result.excluded.push(ing)
      continue
    }
    const product = (ing.productId && productsById.get(ing.productId)) || productsByNorm.get(norm)
    if (pantry.has(norm) || (product && pantry.has(product.nameNormalized))) {
      result.inPantry.push(ing)
      continue
    }
    if (pendingNames.has(norm) || (product && pendingProductIds.has(product.id))) {
      result.alreadyListed.push(ing)
      continue
    }
    result.toAdd.push({ ingredient: ing, product: product ?? undefined, storeCategoryId: product?.storeCategoryId ?? fallbackSector })
  }
  return result
}

export async function addMissingToList(householdId: string, uid: string, missing: MissingResult, sourceRef: string) {
  if (missing.toAdd.length === 0) return 0
  const batch = writeBatch(db)
  const now = serverTimestamp()
  for (const { ingredient, product, storeCategoryId } of missing.toAdd) {
    let productId = product?.id
    if (!productId) {
      const pref = doc(collection(hh(householdId), 'products'))
      productId = pref.id
      batch.set(pref, {
        name: capitalize(ingredient.name),
        nameNormalized: normalize(ingredient.name),
        storeCategoryId,
        timesPurchased: 0,
        createdBy: uid,
        createdAt: now,
        updatedAt: now,
      })
    }
    batch.set(doc(collection(hh(householdId), 'shoppingItems')), {
      productId,
      name: product?.name ?? capitalize(ingredient.name),
      qty: ingredient.qty ?? null,
      storeCategoryId,
      status: 'pending',
      source: 'recipe',
      sourceRef,
      addedBy: uid,
      createdBy: uid,
      createdAt: now,
      updatedAt: now,
    })
  }
  await batch.commit()
  return missing.toAdd.length
}
