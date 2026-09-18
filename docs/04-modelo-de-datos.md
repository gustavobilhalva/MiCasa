# 04 · Modelo de datos (Firestore)

Convenciones:
- Todas las fechas se guardan como `Timestamp`. Las "fechas sin hora" (vencimientos) se guardan a las 00:00 en la zona horaria del hogar.
- Todo documento tiene `createdAt`, `updatedAt`, `createdBy` (uid). Se omiten abajo por brevedad.
- Montos en `number` (pesos con centavos). Sin `float` ambiguo: se guarda `12345.67`.
- Los ids se generan automáticamente salvo indicación.

## Estructura general

```
users/{uid}
invites/{code}                     # top-level para poder canjearlas sin ser miembro
households/{householdId}
  members/{uid}
  categories/{categoryId}          # sectores del súper y categorías de gasto
  products/{productId}             # catálogo del hogar
  shoppingItems/{itemId}           # lista activa + historial (por estado)
  inventory/{inventoryId}
  recipes/{recipeId}
  mealPlan/{yyyy-ww}               # una semana por doc
  expenses/{expenseId}
  cards/{cardId}
  installments/{installmentId}
  services/{serviceId}
  serviceInstances/{instanceId}
  budgets/{yyyy-mm}
  funds/{fundId}
    contributions/{contributionId}
  events/{eventId}
  notes/{noteId}
  people/{personId}                # hijo (y futuros miembros no-usuarios)
  pets/{petId}
  healthRecords/{recordId}         # vacunas etc. de personas y mascotas
  documents/{documentId}
  procedures/{procedureId}         # trámites
  maintenance/{taskId}
  warranties/{warrantyId}
  contacts/{contactId}
  reminders/{reminderId}           # motor transversal
  notifications/{notificationId}   # log de envíos
```

---

## users/{uid}

```ts
{
  displayName: string
  email: string
  photoURL?: string
  householdId: string | null       // hogar activo
  pendingInvite?: string           // código en proceso de canje (ver reglas)
  fcmTokens: string[]              // dispositivos para push
  notificationPrefs: {
    push: boolean
    email: boolean
    quietHoursStart?: string       // "22:00"
    quietHoursEnd?: string         // "08:00"
  }
}
```

## households/{householdId}

```ts
{
  name: string                     // "Nuestra Casa"
  currency: "ARS"
  timezone: "America/Argentina/Buenos_Aires"
  memberIds: string[]              // desnormalizado para reglas y queries
  settings: {
    storeSectorOrder: string[]     // ids de categorías tipo "store" en orden de recorrido
    defaultSplit: { [uid: string]: number }   // { uidA: 50, uidB: 50 }
    excludedIngredients: string[]  // ["cerdo", "lactosa"]
    reminderHour: number           // hora local en que se envían recordatorios (9)
    installmentSurchargePct: number // recargo/impuestos por defecto sobre cuotas (0)
  }
}
```

### members/{uid}

```ts
{
  displayName: string              // nombre corto para "asignado a"
  color: string                    // "#2563eb"
  role: "member"                   // reservado para futuro
  joinedAt: Timestamp
}
```

## invites/{code}

Top-level (no bajo el hogar) para que un usuario que todavía no es miembro pueda canjearla.

```ts
{
  householdId: string
  createdBy: string
  expiresAt: Timestamp             // 7 días
  usedBy: string | null
}
```

Flujo de canje en cliente (3 escrituras, validadas por reglas):
1. `update invites/{code} { usedBy: uid }` — solo si `usedBy == null`.
2. `set users/{uid} { pendingInvite: code }`.
3. `update households/{householdId} { memberIds: arrayUnion(uid) }` — la regla verifica que `invites/{users.pendingInvite}` apunte a este hogar y esté reclamada por este uid.
4. `set households/{id}/members/{uid}` y `users/{uid} { householdId, pendingInvite: null }`.

---

## Compras

### categories/{categoryId}

```ts
{
  kind: "store" | "expense" | "event"
  name: string
  icon?: string
  order: number
}
```

### products/{productId}

```ts
{
  name: string
  nameNormalized: string           // lowercase sin tildes, para búsqueda
  storeCategoryId: string
  preferredBrand?: string
  avoidBrands?: string[]
  notes?: string
  defaultQty?: string              // "1 L", "x2"
  recurring?: {
    intervalDays: number
    lastPurchasedAt: Timestamp | null
    autoAddToList: boolean
  }
  lastPrice?: number
  lastPriceAt?: Timestamp
  priceHistory?: { price: number; at: Timestamp }[]   // últimos 20
  timesPurchased: number
}
```

### shoppingItems/{itemId}

```ts
{
  productId?: string               // null si es ítem libre no catalogado
  name: string
  qty?: string
  storeCategoryId: string
  status: "pending" | "checked" | "archived"
  checkedBy?: string
  checkedAt?: Timestamp
  price?: number
  source: "manual" | "recurring" | "recipe" | "pet" | "inventory"
  sourceRef?: string               // recipeId, petId…
  addedBy: string
}
```

Al "Limpiar tachados" los ítems `checked` pasan a `archived`. Los `archived` se consultan solo para historial.

### inventory/{inventoryId}

```ts
{
  productId?: string
  name: string
  qty?: string
  location: "pantry" | "fridge" | "freezer" | "other"
  expiresAt?: Timestamp
}
```

---

## Menús

### recipes/{recipeId}

```ts
{
  name: string
  ingredients: { productId?: string; name: string; qty?: string }[]
  servings?: number
  prepMinutes?: number
  notes?: string
  photoPath?: string               // Storage
  tags?: string[]
  timesPlanned: number
  lastPlannedAt?: Timestamp
}
```

### mealPlan/{yyyy-ww}   (id ej. `2026-38`)

```ts
{
  weekStart: Timestamp             // lunes
  slots: {
    [isoDate: string]: {           // "2026-09-21"
      lunch?: { recipeId?: string; freeText?: string }
      dinner?: { recipeId?: string; freeText?: string }
    }
  }
}
```

---

## Finanzas

### cards/{cardId}

```ts
{
  name: string                     // "Visa Galicia"
  holderUid: string
  last4?: string
  closingDay: number               // 1-31
  dueDay: number                   // 1-31
  active: boolean
}
```

### expenses/{expenseId}

```ts
{
  amount: number
  categoryId: string
  paidBy: string                   // uid
  method: "cash" | "debit" | "transfer" | "credit" | "mercadopago" | "other"
  cardId?: string
  date: Timestamp
  note?: string
  split?: { [uid: string]: number }   // porcentajes; si falta, usa defaultSplit del hogar
  installments?: {
    count: number
    surchargePct: number
    totalWithSurcharge: number
  }
  serviceInstanceId?: string       // si vino de pagar un servicio
  fundId?: string                  // si es un retiro/aporte a fondo
  settlement?: boolean             // true si es una compensación entre miembros
}
```

### installments/{installmentId}

Generadas en batch al crear un gasto con `installments`.

```ts
{
  expenseId: string
  cardId: string
  number: number                   // 1..count
  count: number
  amount: number
  statementMonth: string           // "2026-11" (según closingDay)
  dueDate: Timestamp               // según dueDay
  paid: boolean
}
```

### services/{serviceId}

```ts
{
  name: string                     // "Luz", "Expensas", "Netflix"
  type: "utility" | "rent" | "subscription" | "insurance" | "education" | "other"
  frequency: "monthly" | "bimonthly" | "annual"
  dueDay: number                   // día del mes
  dueMonth?: number                // para anuales
  estimatedAmount?: number
  defaultAssigneeUid?: string | null
  reminderDaysBefore: number       // 3
  expenseCategoryId: string
  active: boolean
}
```

### serviceInstances/{instanceId}

Una por servicio y período. Generadas por Cloud Function el día 1 (fallback en cliente).

```ts
{
  serviceId: string
  period: string                   // "2026-10"
  dueDate: Timestamp
  assigneeUid?: string | null
  status: "pending" | "paid" | "skipped"
  amountPaid?: number
  paidAt?: Timestamp
  paidBy?: string
  expenseId?: string
}
```

### budgets/{yyyy-mm}

```ts
{
  limits: { [categoryId: string]: number }
}
```

### funds/{fundId}

```ts
{
  name: string
  icon?: string
  goalAmount: number
  targetDate?: Timestamp
  currentAmount: number            // desnormalizado; se actualiza con cada contribución
  archived: boolean
}
```

#### funds/{fundId}/contributions/{contributionId}

```ts
{
  amount: number                   // negativo = retiro
  byUid: string
  date: Timestamp
  note?: string
}
```

---

## Calendario y notas

### events/{eventId}

```ts
{
  title: string
  categoryId: string               // kind "event"
  start: Timestamp
  end?: Timestamp
  allDay: boolean
  location?: string
  notes?: string
  personId?: string                // si es del hijo
  petId?: string
  roles?: { [role: string]: string | null }   // { "lleva": uidA, "busca": uidB, "estudia": null }
  recurrence?: { freq: "weekly" | "biweekly" | "monthly" | "yearly"; until?: Timestamp }
  reminderMinutesBefore?: number[]
  source?: "manual" | "service" | "document" | "health" | "maintenance"
  sourceRef?: string
}
```

Las recurrencias se expanden en el cliente al renderizar (no se materializan), salvo que se necesite una excepción, en cuyo caso se crea un evento independiente con `recurrenceExceptionOf`.

### notes/{noteId}

```ts
{
  text: string
  date: Timestamp                  // día al que aplica
  time?: string                    // "16:00"
  assigneeUid?: string | null
  done: boolean
  checklist?: { text: string; done: boolean }[]
}
```

---

## Personas y mascotas

### people/{personId}

```ts
{
  name: string
  birthDate?: Timestamp
  relation: "child" | "other"
  school?: { name: string; grade?: string; phone?: string }
  healthInsurance?: { provider: string; number?: string }
  allergies?: string[]
  sizes?: { clothing?: string; shoes?: string; updatedAt?: Timestamp }
  photoPath?: string
}
```

### pets/{petId}

```ts
{
  name: string
  species: "dog" | "cat" | "other"
  breed?: string
  birthDate?: Timestamp
  weightKg?: number
  vetContactId?: string
  foodProductId?: string           // para el botón "queda poca comida"
  photoPath?: string
}
```

### healthRecords/{recordId}

Sirve para personas y mascotas.

```ts
{
  subjectType: "person" | "pet"
  subjectId: string
  type: "vaccine" | "deworming" | "antiparasitic" | "checkup" | "vet_visit" | "other"
  name: string                     // "Antirrábica", "Control 6 meses"
  doneAt: Timestamp
  product?: string
  notes?: string
  nextDueAt?: Timestamp
  intervalMonths?: number          // para calcular nextDueAt al registrar el siguiente
  reminderId?: string
}
```

---

## Trámites y documentos

### documents/{documentId}

```ts
{
  subjectType: "person" | "pet" | "household" | "user"
  subjectId: string
  type: "dni" | "passport" | "license" | "car_registration" | "vtv" | "car_insurance" | "insurance" | "vaccination_card" | "contract" | "other"
  label: string
  number?: string
  expiresAt?: Timestamp
  filePath?: string                // Storage
  reminderId?: string
}
```

### procedures/{procedureId}

```ts
{
  title: string
  templateKey?: string             // "renew_passport"
  steps: { text: string; done: boolean; doneAt?: Timestamp }[]
  assigneeUid?: string | null
  dueDate?: Timestamp
  status: "pending" | "in_progress" | "done"
  notes?: string
  relatedDocumentId?: string
}
```

---

## Casa

### maintenance/{taskId}

```ts
{
  name: string
  intervalMonths: number
  lastDoneAt?: Timestamp
  nextDueAt: Timestamp
  assigneeUid?: string | null
  notes?: string
  reminderId?: string
}
```

### warranties/{warrantyId}

```ts
{
  item: string
  purchasedAt: Timestamp
  expiresAt: Timestamp
  store?: string
  receiptPath?: string
  reminderId?: string
}
```

### contacts/{contactId}

```ts
{
  name: string
  role: string                     // "pediatra", "plomero", "veterinario", "colegio"
  phone?: string
  whatsapp?: string
  email?: string
  address?: string
  notes?: string
}
```

---

## Motor de recordatorios

### reminders/{reminderId}

Toda entidad con fecha futura crea o actualiza un recordatorio. Es la única colección que recorre la Cloud Function diaria.

```ts
{
  source: {
    kind: "product" | "service" | "installment" | "health" | "document" | "maintenance" | "warranty" | "procedure" | "event" | "note"
    id: string
    label: string                  // texto para la notificación
  }
  dueAt: Timestamp
  notifyDaysBefore: number[]       // [3, 0] → 3 días antes y el día
  assigneeUid?: string | null      // null = ambos
  status: "pending" | "done" | "snoozed"
  snoozedUntil?: Timestamp
  lastNotifiedAt?: Timestamp
  lastNotifiedOffset?: number      // último offset de notifyDaysBefore ya enviado
}
```

### notifications/{notificationId}

Log de envíos (para depurar y evitar duplicados).

```ts
{
  reminderId: string
  toUid: string
  channel: "push" | "email"
  sentAt: Timestamp
  ok: boolean
  error?: string
}
```

---

## Índices compuestos necesarios (inicial)

| Colección | Campos |
|---|---|
| shoppingItems | status ASC, storeCategoryId ASC |
| expenses | date DESC |
| expenses | categoryId ASC, date DESC |
| installments | statementMonth ASC, cardId ASC |
| serviceInstances | period ASC, status ASC |
| events | start ASC |
| reminders | status ASC, dueAt ASC |
| healthRecords | subjectId ASC, doneAt DESC |

Se ajustan según los errores que Firestore reporte en desarrollo (te da el link para crearlos).

---

## Reglas de seguridad

Las reglas reales están en [`firestore.rules`](../firestore.rules). Resumen:

- `users/{uid}`: solo el propio usuario.
- `invites/{code}`: cualquier usuario logueado puede leer y reclamar (`usedBy`) una invitación libre; solo miembros del hogar la crean o borran.
- `households/{hid}`: crear solo con `memberIds == [uid]`; leer y actualizar solo miembros, **o** un usuario que está canjeando una invitación válida (ver `isJoiningWithInvite`). Nunca se borra.
- Todas las subcolecciones: solo miembros.

## Archivos (Fase 5)

Firebase Storage requiere plan Blaze, así que los archivos van a **Supabase Storage** (1 GB gratis), bucket privado `households`, con rutas:

```
{hid}/documents/{documentId}/{filename}
{hid}/recipes/{recipeId}/{filename}
{hid}/pets/{petId}/{filename}
{hid}/people/{personId}/{filename}
{hid}/warranties/{warrantyId}/{filename}
```

Acceso: Supabase "Third-Party Auth" con Firebase; las políticas RLS validan que el `sub` del JWT de Firebase pertenezca al hogar (se replica `memberIds` en una tabla mínima de Supabase, o se usa un claim). Los campos `filePath`/`photoPath` del modelo guardan la ruta dentro del bucket. Detalle a definir al iniciar la Fase 5.
