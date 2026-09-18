import { differenceInCalendarDays, format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { cert, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore, Timestamp, type DocumentData, type QueryDocumentSnapshot } from 'firebase-admin/firestore'
import { sendEmailDigest, sendPush, type Message, type Recipient } from './notify.js'

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
if (!serviceAccount) throw new Error('Falta FIREBASE_SERVICE_ACCOUNT')
initializeApp({ credential: cert(JSON.parse(serviceAccount)) })
const db = getFirestore()

const DRY_RUN = process.env.DRY_RUN === '1'

interface Reminder {
  key: string
  message: Message
  assigneeUid?: string | null
  offsets: number[]
  dueDate: Date
}

type Doc = QueryDocumentSnapshot<DocumentData>

async function run() {
  const households = await db.collection('households').get()
  let totalPush = 0
  let totalEmail = 0
  for (const hh of households.docs) {
    const r = await processHousehold(hh)
    totalPush += r.push
    totalEmail += r.email
  }
  console.log(`Listo. Hogares: ${households.size}, push: ${totalPush}, emails: ${totalEmail}${DRY_RUN ? ' (dry run)' : ''}`)
}

async function processHousehold(hh: Doc): Promise<{ push: number; email: number }> {
  const data = hh.data()
  const tz: string = data.timezone ?? 'America/Argentina/Buenos_Aires'
  const now = toZonedTime(new Date(), tz)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayKey = format(today, 'yyyy-MM-dd')
  const memberIds: string[] = data.memberIds ?? []
  const name: string = data.name ?? 'Nuestra Casa'

  const reminders = await collectReminders(hh, today)
  const due = reminders
    .map((r) => ({ r, days: differenceInCalendarDays(r.dueDate, today) }))
    .filter(({ r, days }) => r.offsets.includes(days) || (days < 0 && r.offsets.includes(0)))

  if (due.length === 0) return { push: 0, email: 0 }

  const recipients = await loadRecipients(memberIds)
  const perUser = new Map<string, Message[]>()
  let push = 0

  for (const { r, days } of due) {
    const logId = `${r.key}_${days < 0 ? 'overdue' : days}_${todayKey}`
    const logRef = hh.ref.collection('notifications').doc(logId)
    if ((await logRef.get()).exists) continue

    const targets = recipients.filter((x) => !r.assigneeUid || x.uid === r.assigneeUid)
    const message: Message = days < 0 ? { ...r.message, title: `Vencido: ${r.message.title}` } : r.message
    for (const t of targets) perUser.set(t.uid, [...(perUser.get(t.uid) ?? []), message])

    if (!DRY_RUN) {
      const res = await sendPush(targets, message)
      push += res.sent
      for (const [uid, tokens] of res.invalidTokens) {
        await db.collection('users').doc(uid).update({ fcmTokens: FieldValue.arrayRemove(...tokens) })
      }
      await logRef.set({ key: r.key, days, sentAt: FieldValue.serverTimestamp(), to: targets.map((t) => t.uid), title: message.title })
    } else {
      console.log(`[dry] ${name}: ${message.title} → ${targets.map((t) => t.email ?? t.uid).join(', ')}`)
    }
  }

  let email = 0
  if (!DRY_RUN) {
    for (const rcpt of recipients) {
      const msgs = perUser.get(rcpt.uid) ?? []
      if (await sendEmailDigest(rcpt, name, msgs)) email++
    }
  }
  return { push, email }
}

async function loadRecipients(memberIds: string[]): Promise<Recipient[]> {
  const out: Recipient[] = []
  for (const uid of memberIds) {
    const snap = await db.collection('users').doc(uid).get()
    const u = snap.data() ?? {}
    out.push({
      uid,
      email: u.email,
      fcmTokens: u.fcmTokens ?? [],
      push: u.notificationPrefs?.push ?? true,
      emailEnabled: u.notificationPrefs?.email ?? true,
    })
  }
  return out
}

async function collectReminders(hh: Doc, today: Date): Promise<Reminder[]> {
  const out: Reminder[] = []
  const horizon = Timestamp.fromDate(new Date(today.getTime() + 45 * 86400000))
  const col = (n: string) => hh.ref.collection(n)
  const toDate = (t: Timestamp | undefined | null) => t?.toDate()

  // Servicios pendientes del mes actual y siguiente
  const period = format(today, 'yyyy-MM')
  const nextPeriod = format(new Date(today.getFullYear(), today.getMonth() + 1, 1), 'yyyy-MM')
  const services = new Map((await col('services').get()).docs.map((d) => [d.id, d.data()]))
  const instances = await col('serviceInstances').where('period', 'in', [period, nextPeriod]).get()
  for (const d of instances.docs) {
    const i = d.data()
    if (i.status !== 'pending') continue
    const s = services.get(i.serviceId)
    if (!s || s.active === false) continue
    const dueDate = toDate(i.dueDate)!
    out.push({
      key: `svc_${d.id}`,
      dueDate,
      offsets: [s.reminderDaysBefore ?? 3, 0],
      assigneeUid: i.assigneeUid ?? null,
      message: {
        title: `Vence ${s.name}`,
        body: `${format(dueDate, 'd/M')}${s.estimatedAmount ? ` · aprox. $${Math.round(s.estimatedAmount).toLocaleString('es-AR')}` : ''}`,
        url: '/gastos/servicios',
      },
    })
  }

  // Cuotas de tarjeta no pagadas
  const installments = await col('installments').where('dueDate', '<=', horizon).get()
  const byDue = new Map<string, { amount: number; cardId: string; dueDate: Date }>()
  for (const d of installments.docs) {
    const i = d.data()
    if (i.paid) continue
    const dueDate = toDate(i.dueDate)!
    if (differenceInCalendarDays(dueDate, today) < -1) continue
    const k = `${i.cardId}_${format(dueDate, 'yyyy-MM-dd')}`
    const prev = byDue.get(k)
    byDue.set(k, { amount: (prev?.amount ?? 0) + i.amount, cardId: i.cardId, dueDate })
  }
  const cards = new Map((await col('cards').get()).docs.map((d) => [d.id, d.data()]))
  for (const [k, v] of byDue) {
    out.push({
      key: `card_${k}`,
      dueDate: v.dueDate,
      offsets: [3, 0],
      message: { title: `Vence ${cards.get(v.cardId)?.name ?? 'tarjeta'}`, body: `Cuotas por $${Math.round(v.amount).toLocaleString('es-AR')}`, url: '/gastos/cuotas' },
    })
  }

  // Salud (hijo y mascotas)
  const people = new Map((await col('people').get()).docs.map((d) => [d.id, d.data().name as string]))
  const pets = new Map((await col('pets').get()).docs.map((d) => [d.id, d.data().name as string]))
  const health = await col('healthRecords').where('nextDueAt', '<=', horizon).get()
  for (const d of health.docs) {
    const r = d.data()
    if (!r.nextDueAt) continue
    const who = (r.subjectType === 'pet' ? pets : people).get(r.subjectId) ?? ''
    out.push({
      key: `health_${d.id}`,
      dueDate: toDate(r.nextDueAt)!,
      offsets: [7, 1, 0],
      message: { title: `${r.name} · ${who}`, body: 'Toca renovar / hacer el control', url: r.subjectType === 'pet' ? `/mascotas/${r.subjectId}` : `/familia/${r.subjectId}` },
    })
  }

  // Documentos
  const docs = await col('documents').where('expiresAt', '<=', horizon).get()
  for (const d of docs.docs) {
    const r = d.data()
    if (!r.expiresAt) continue
    out.push({
      key: `doc_${d.id}`,
      dueDate: toDate(r.expiresAt)!,
      offsets: [30, 15, 5, 0],
      message: { title: `Vence ${r.label} · ${r.subjectName}`, body: format(toDate(r.expiresAt)!, 'd/M/yyyy'), url: '/tramites' },
    })
  }

  // Trámites con fecha límite
  const procs = await col('procedures').where('dueDate', '<=', horizon).get()
  for (const d of procs.docs) {
    const r = d.data()
    if (!r.dueDate || r.status === 'done') continue
    out.push({
      key: `proc_${d.id}`,
      dueDate: toDate(r.dueDate)!,
      offsets: [7, 1, 0],
      assigneeUid: r.assigneeUid ?? null,
      message: { title: `Trámite: ${r.title}`, body: `Límite ${format(toDate(r.dueDate)!, 'd/M')}`, url: '/tramites' },
    })
  }

  // Mantenimiento
  const maint = await col('maintenance').where('nextDueAt', '<=', horizon).get()
  for (const d of maint.docs) {
    const r = d.data()
    out.push({
      key: `maint_${d.id}`,
      dueDate: toDate(r.nextDueAt)!,
      offsets: [7, 0],
      assigneeUid: r.assigneeUid ?? null,
      message: { title: r.name, body: 'Mantenimiento del hogar', url: '/casa' },
    })
  }

  // Garantías
  const warr = await col('warranties').where('expiresAt', '<=', horizon).get()
  for (const d of warr.docs) {
    const r = d.data()
    out.push({
      key: `warr_${d.id}`,
      dueDate: toDate(r.expiresAt)!,
      offsets: [30],
      message: { title: `Vence la garantía de ${r.item}`, body: format(toDate(r.expiresAt)!, 'd/M/yyyy'), url: '/casa' },
    })
  }

  // Eventos de mañana (los recurrentes se expanden en cliente; acá solo simples)
  const tomorrow = new Date(today.getTime() + 86400000)
  const events = await col('events')
    .where('start', '>=', Timestamp.fromDate(today))
    .where('start', '<', Timestamp.fromDate(new Date(tomorrow.getTime() + 86400000)))
    .get()
  for (const d of events.docs) {
    const e = d.data()
    const start = toDate(e.start)!
    const roles = Object.values((e.roles ?? {}) as Record<string, string | null>).filter(Boolean) as string[]
    out.push({
      key: `event_${d.id}`,
      dueDate: new Date(start.getFullYear(), start.getMonth(), start.getDate()),
      offsets: [1, 0],
      assigneeUid: roles.length === 1 ? roles[0] : null,
      message: { title: e.title, body: e.allDay ? 'Todo el día' : format(start, 'HH:mm'), url: '/agenda' },
    })
  }

  // Notas del día con responsable
  const notes = await col('notes').where('done', '==', false).where('date', '<=', Timestamp.fromDate(tomorrow)).get()
  for (const d of notes.docs) {
    const n = d.data()
    const date = toDate(n.date)!
    out.push({
      key: `note_${d.id}`,
      dueDate: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
      offsets: [0],
      assigneeUid: n.assigneeUid ?? null,
      message: { title: n.text, body: n.time ? `Hoy ${n.time}` : 'Hoy', url: '/notas' },
    })
  }

  return out
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
