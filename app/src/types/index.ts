import type { Timestamp } from 'firebase/firestore'

export interface UserDoc {
  displayName: string
  email: string
  photoURL?: string
  householdId: string | null
  pendingInvite?: string | null
  fcmTokens: string[]
  notificationPrefs?: { push?: boolean; email?: boolean }
}

export interface Household {
  id: string
  name: string
  currency: 'ARS'
  timezone: string
  memberIds: string[]
  settings: {
    storeSectorOrder: string[]
    defaultSplit: Record<string, number>
    excludedIngredients: string[]
    reminderHour: number
    installmentSurchargePct: number
  }
}

export interface Member {
  id: string
  displayName: string
  color: string
  role: 'member'
  joinedAt: Timestamp
}

export interface Invite {
  householdId: string
  createdBy: string
  expiresAt: Timestamp
  usedBy: string | null
}

export type CategoryKind = 'store' | 'expense' | 'income' | 'event'

export interface Category {
  id: string
  kind: CategoryKind
  name: string
  icon?: string
  order: number
  group?: string // grupo (Niños, Deuda, Ocio…) para gastos e ingresos
  groupKey?: string
  legacy?: boolean // categoría plana anterior; se muestra en gastos viejos pero no se ofrece
  hidden?: boolean
}

export interface Income {
  id: string
  amount: number
  categoryId: string
  byUid: string
  date: Timestamp
  note?: string
  createdAt: Timestamp
}

export interface Product {
  id: string
  name: string
  nameNormalized: string
  storeCategoryId: string
  preferredBrand?: string
  avoidBrands?: string[]
  notes?: string
  defaultQty?: string
  timesPurchased: number
  lastPrice?: number
  lastPriceAt?: Timestamp
}

export type ShoppingItemStatus = 'pending' | 'checked' | 'archived'

export interface ShoppingItem {
  id: string
  productId?: string
  name: string
  qty?: string
  storeCategoryId: string
  status: ShoppingItemStatus
  checkedBy?: string
  checkedAt?: Timestamp
  price?: number
  source: 'manual' | 'recurring' | 'recipe' | 'pet' | 'inventory'
  addedBy: string
  createdAt: Timestamp
}

export type PaymentMethod = 'cash' | 'debit' | 'transfer' | 'credit' | 'mercadopago' | 'other'

export interface Card {
  id: string
  name: string
  holderUid: string
  last4?: string
  closingDay: number
  dueDay: number
  active: boolean
}

export interface Expense {
  id: string
  amount: number
  categoryId: string
  paidBy: string
  method: PaymentMethod
  cardId?: string
  date: Timestamp
  note?: string
  split?: Record<string, number>
  installments?: { count: number; surchargePct: number; totalWithSurcharge: number }
  serviceInstanceId?: string
  fundId?: string
  settlement?: boolean
  imported?: boolean // cargado desde la planilla; no entra en el balance entre miembros
  createdAt: Timestamp
}

export interface Installment {
  id: string
  expenseId: string
  cardId: string
  number: number
  count: number
  amount: number
  statementMonth: string
  dueDate: Timestamp
  paid: boolean
  label: string
}

export type ServiceType = 'utility' | 'rent' | 'subscription' | 'insurance' | 'education' | 'other'
export type ServiceFrequency = 'monthly' | 'bimonthly' | 'annual'

export interface Service {
  id: string
  name: string
  type: ServiceType
  frequency: ServiceFrequency
  dueDay: number
  dueMonth?: number
  estimatedAmount?: number
  defaultAssigneeUid?: string | null
  reminderDaysBefore: number
  expenseCategoryId: string
  active: boolean
}

export interface ServiceInstance {
  id: string
  serviceId: string
  period: string
  dueDate: Timestamp
  assigneeUid?: string | null
  status: 'pending' | 'paid' | 'skipped'
  amountPaid?: number
  paidAt?: Timestamp
  paidBy?: string
  expenseId?: string
}

export interface Budget {
  id: string
  limits: Record<string, number>
}

export interface Fund {
  id: string
  name: string
  icon?: string
  goalAmount: number
  targetDate?: Timestamp
  currentAmount: number
  archived: boolean
}

export interface Contribution {
  id: string
  amount: number
  byUid: string
  date: Timestamp
  note?: string
}

export type RecurrenceFreq = 'weekly' | 'biweekly' | 'monthly' | 'yearly'

export interface CalendarEvent {
  id: string
  title: string
  categoryId: string
  start: Timestamp
  end?: Timestamp
  allDay: boolean
  location?: string
  notes?: string
  roles?: Record<string, string | null>
  recurring: boolean
  recurrence?: { freq: RecurrenceFreq; until?: Timestamp }
  reminderMinutesBefore?: number[]
  createdBy: string
}

export interface Note {
  id: string
  text: string
  date: Timestamp
  time?: string
  assigneeUid?: string | null
  done: boolean
  checklist?: { text: string; done: boolean }[]
  createdBy: string
}

export interface RecipeIngredient {
  productId?: string
  name: string
  qty?: string
}

export interface Recipe {
  id: string
  name: string
  nameNormalized: string
  ingredients: RecipeIngredient[]
  servings?: number
  prepMinutes?: number
  notes?: string
  tags?: string[]
  timesPlanned: number
  lastPlannedAt?: Timestamp
}

export type MealSlot = 'lunch' | 'dinner'

export interface MealEntry {
  recipeId?: string
  freeText?: string
}

export interface MealPlan {
  id: string
  weekStart: Timestamp
  slots: Record<string, Partial<Record<MealSlot, MealEntry>>>
}

export interface InventoryItem {
  id: string
  productId?: string
  name: string
  nameNormalized: string
  qty?: string
  location: 'pantry' | 'fridge' | 'freezer' | 'other'
  expiresAt?: Timestamp
}

export interface Person {
  id: string
  name: string
  birthDate?: Timestamp
  relation: 'child' | 'other'
  school?: { name?: string; grade?: string; phone?: string }
  healthInsurance?: { provider?: string; number?: string }
  allergies?: string[]
  sizes?: { clothing?: string; shoes?: string; updatedAt?: Timestamp }
  notes?: string
}

export interface Pet {
  id: string
  name: string
  species: 'dog' | 'cat' | 'other'
  breed?: string
  birthDate?: Timestamp
  weightKg?: number
  foodProductId?: string
  foodName?: string
  notes?: string
}

export type HealthRecordType = 'vaccine' | 'deworming' | 'antiparasitic' | 'checkup' | 'vet_visit' | 'other'

export interface HealthRecord {
  id: string
  subjectType: 'person' | 'pet'
  subjectId: string
  type: HealthRecordType
  name: string
  doneAt: Timestamp
  product?: string
  notes?: string
  nextDueAt?: Timestamp | null
  intervalMonths?: number
}

export type DocumentType = 'dni' | 'passport' | 'license' | 'car_registration' | 'vtv' | 'car_insurance' | 'insurance' | 'vaccination_card' | 'contract' | 'other'

export interface HouseholdDocument {
  id: string
  subjectType: 'person' | 'pet' | 'household' | 'user'
  subjectId: string
  subjectName: string
  type: DocumentType
  label: string
  number?: string
  expiresAt?: Timestamp | null
  notes?: string
}

export interface Procedure {
  id: string
  title: string
  templateKey?: string
  steps: { text: string; done: boolean }[]
  assigneeUid?: string | null
  dueDate?: Timestamp | null
  status: 'pending' | 'in_progress' | 'done'
  notes?: string
  createdAt: Timestamp
}

export interface MaintenanceTask {
  id: string
  name: string
  intervalMonths: number // 0 = una sola vez
  lastDoneAt?: Timestamp | null
  nextDueAt: Timestamp
  assigneeUid?: string | null
  notes?: string
  important?: boolean
  done?: boolean
}

export interface Warranty {
  id: string
  item: string
  purchasedAt: Timestamp
  expiresAt: Timestamp
  store?: string
  notes?: string
}

export interface Contact {
  id: string
  name: string
  role: string
  phone?: string
  whatsapp?: string
  email?: string
  address?: string
  notes?: string
  linkedTo?: { type: 'person' | 'pet' | 'home'; id?: string }
}
