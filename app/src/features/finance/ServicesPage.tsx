import { differenceInCalendarDays } from 'date-fns'
import { ArrowLeft, Check, Plus } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Sheet } from '../../components/layout/Sheet'
import { TopBar } from '../../components/layout/TopBar'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { PAYMENT_METHODS, SERVICE_TYPES } from '../../lib/defaults'
import { fmtDate, money, monthKey, monthLabel, parseAmount, shiftMonth } from '../../lib/format'
import type { PaymentMethod, Service, ServiceFrequency, ServiceInstance, ServiceType } from '../../types'
import { assignInstance, deleteService, ensureServiceInstances, payInstance, saveService, skipInstance } from './api'
import { CategoryPicker } from './CategoryPicker'
import { useCards, useServiceInstances, useServices } from './hooks'
import { AmountInput, Chips, Field, MemberDot, MemberPicker, MonthNav } from './ui'

export function ServicesPage() {
  const { household, user, members } = useRequiredHousehold()
  const { data: services, loading: loadingServices } = useServices()
  const [period, setPeriod] = useState(monthKey(new Date()))
  const { data: instances, loading: loadingInstances } = useServiceInstances(period)
  const [params] = useSearchParams()
  const [editing, setEditing] = useState<Service | null | 'new'>(params.get('nuevo') === '1' ? 'new' : null)
  const [paying, setPaying] = useState<{ instance: ServiceInstance; service: Service } | null>(null)

  useEffect(() => {
    if (loadingServices || loadingInstances) return
    ensureServiceInstances(household.id, user.uid, services, instances, period)
  }, [household.id, user.uid, services, instances, period, loadingServices, loadingInstances])

  const rows = useMemo(() => {
    const byService = new Map(instances.map((i) => [i.serviceId, i]))
    return services
      .map((s) => ({ service: s, instance: byService.get(s.id) }))
      .filter((r) => r.instance)
      .sort((a, b) => {
        const order = { pending: 0, skipped: 1, paid: 2 }
        const d = order[a.instance!.status] - order[b.instance!.status]
        return d || a.instance!.dueDate.toMillis() - b.instance!.dueDate.toMillis()
      }) as { service: Service; instance: ServiceInstance }[]
  }, [services, instances])

  const pendingTotal = rows.filter((r) => r.instance.status === 'pending').reduce((s, r) => s + (r.service.estimatedAmount ?? 0), 0)
  const today = new Date()

  const cycleAssignee = (instance: ServiceInstance) => {
    const ids = [...members.map((m) => m.id), null]
    const idx = ids.indexOf(instance.assigneeUid ?? null)
    assignInstance(household.id, instance.id, ids[(idx + 1) % ids.length])
  }

  return (
    <>
      <TopBar
        title="Gastos recurrentes"
        right={
          <Link to="/gastos" className="flex min-h-10 items-center gap-1 text-sm text-muted">
            <ArrowLeft size={16} /> Finanzas
          </Link>
        }
      />
      <MonthNav month={period} label={monthLabel(period)} onPrev={() => setPeriod(shiftMonth(period, -1))} onNext={() => setPeriod(shiftMonth(period, 1))} />

      <main className="pb-28">
        {services.length === 0 && !loadingServices ? (
          <div className="px-6 py-12 text-center">
            <p className="font-medium">Sin gastos recurrentes</p>
            <p className="mt-1 text-sm text-muted">Luz, gas, internet, expensas, colegio, la persona que limpia, préstamos… Se cargan una vez con su día de vencimiento y cada mes aparecen para marcarlos como pagados; al pagarlos se registran como gasto en su categoría.</p>
          </div>
        ) : (
          <>
            {pendingTotal > 0 && (
              <p className="px-4 pb-2 text-sm text-muted">
                Pendiente estimado: <strong className="text-ink">{money(pendingTotal)}</strong>
              </p>
            )}
            <ul className="divide-y divide-line bg-card">
              {rows.map(({ service, instance }) => {
                const due = instance.dueDate.toDate()
                const days = differenceInCalendarDays(due, today)
                const paid = instance.status === 'paid'
                const skipped = instance.status === 'skipped'
                const dueText = paid
                  ? `Pagado ${instance.paidAt ? fmtDate(instance.paidAt.toDate()) : ''}`
                  : skipped
                    ? 'Omitido este mes'
                    : days < 0
                      ? `Venció hace ${-days} día${-days === 1 ? '' : 's'}`
                      : days === 0
                        ? 'Vence hoy'
                        : `Vence en ${days} día${days === 1 ? '' : 's'} · ${fmtDate(due)}`
                const tone = paid || skipped ? 'text-muted' : days < 0 ? 'text-danger' : days <= 3 ? 'text-warn' : 'text-muted'
                return (
                  <li key={instance.id} className={`flex min-h-16 items-center gap-3 px-4 ${paid || skipped ? 'opacity-60' : ''}`}>
                    <button onClick={() => cycleAssignee(instance)} aria-label="Cambiar responsable" disabled={paid}>
                      <MemberDot uid={instance.assigneeUid} size="md" />
                    </button>
                    <button onClick={() => setEditing(service)} className="flex-1 text-left">
                      <p className={paid ? 'line-through' : ''}>{service.name}</p>
                      <p className={`text-xs ${tone}`}>{dueText}</p>
                    </button>
                    <span className="text-sm">
                      {paid && instance.amountPaid ? money(instance.amountPaid) : service.estimatedAmount ? `~${money(service.estimatedAmount)}` : ''}
                    </span>
                    {!paid && !skipped && (
                      <button
                        onClick={() => setPaying({ instance, service })}
                        className="flex min-h-10 items-center gap-1 rounded-full bg-accent px-3 text-sm font-medium text-white"
                      >
                        <Check size={16} /> Pagado
                      </button>
                    )}
                    {skipped && (
                      <button onClick={() => skipInstance(household.id, instance.id, false)} className="text-sm text-accent">
                        Reactivar
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </main>

      <button
        onClick={() => setEditing('new')}
        aria-label="Agregar servicio"
        className="fixed bottom-20 right-4 z-20 flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-lg md:bottom-8"
      >
        <Plus size={28} />
      </button>

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Nuevo gasto recurrente' : 'Editar gasto recurrente'}>
        {editing !== null && (
          <ServiceForm
            service={editing === 'new' ? null : editing}
            instance={editing !== 'new' ? instances.find((i) => i.serviceId === editing.id) : undefined}
            onClose={() => setEditing(null)}
          />
        )}
      </Sheet>

      <Sheet open={paying !== null} onClose={() => setPaying(null)} title={paying ? `Pagar ${paying.service.name}` : ''}>
        {paying && <PayForm {...paying} onClose={() => setPaying(null)} />}
      </Sheet>
    </>
  )
}

function ServiceForm({ service, instance, onClose }: { service: Service | null; instance?: ServiceInstance; onClose: () => void }) {
  const { household, user, expenseCategories } = useRequiredHousehold()
  const [name, setName] = useState(service?.name ?? '')
  const [type, setType] = useState<ServiceType>(service?.type ?? 'utility')
  const [frequency, setFrequency] = useState<ServiceFrequency>(service?.frequency ?? 'monthly')
  const [dueDay, setDueDay] = useState(String(service?.dueDay ?? 10))
  const [dueMonth, setDueMonth] = useState(String(service?.dueMonth ?? new Date().getMonth() + 1))
  const [amount, setAmount] = useState(service?.estimatedAmount ? String(service.estimatedAmount) : '')
  const [assignee, setAssignee] = useState<string | null>(service?.defaultAssigneeUid ?? null)
  const [reminderDays, setReminderDays] = useState(String(service?.reminderDaysBefore ?? 3))
  const [categoryId, setCategoryId] = useState<string | null>(
    service?.expenseCategoryId ?? expenseCategories.find((c) => c.groupKey === 'servicios' && c.name === 'Otros')?.id ?? null,
  )
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !categoryId) return
    setBusy(true)
    try {
      await saveService(
        household.id,
        user.uid,
        {
          name: name.trim(),
          type,
          frequency,
          dueDay: Math.min(31, Math.max(1, Number(dueDay) || 1)),
          dueMonth: frequency === 'monthly' ? undefined : Math.min(12, Math.max(1, Number(dueMonth) || 1)),
          estimatedAmount: parseAmount(amount) ?? undefined,
          defaultAssigneeUid: assignee,
          reminderDaysBefore: Math.max(0, Number(reminderDays) || 0),
          expenseCategoryId: categoryId,
          active: true,
        },
        service?.id,
      )
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Nombre">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Luz, Expensas, Limpieza, Colegio…" required autoFocus />
      </Field>
      <Field label="Tipo">
        <Chips options={SERVICE_TYPES as { id: ServiceType; label: string }[]} value={type} onChange={setType} />
      </Field>
      <Field label="Frecuencia">
        <Chips
          options={[
            { id: 'monthly', label: 'Mensual' },
            { id: 'bimonthly', label: 'Bimestral' },
            { id: 'annual', label: 'Anual' },
          ]}
          value={frequency}
          onChange={setFrequency}
        />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Día vto.">
          <Input inputMode="numeric" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
        </Field>
        {frequency !== 'monthly' && (
          <Field label={frequency === 'annual' ? 'Mes' : 'Mes inicial'}>
            <Input inputMode="numeric" value={dueMonth} onChange={(e) => setDueMonth(e.target.value)} />
          </Field>
        )}
        <Field label="Avisar días antes">
          <Input inputMode="numeric" value={reminderDays} onChange={(e) => setReminderDays(e.target.value)} />
        </Field>
      </div>
      <Field label="Monto estimado">
        <AmountInput value={amount} onChange={setAmount} />
      </Field>
      <Field label="Responsable habitual">
        <MemberPicker value={assignee} onChange={setAssignee} allowNone />
      </Field>
      <Field label="Categoría de gasto">
        <CategoryPicker categories={expenseCategories} value={categoryId} onChange={setCategoryId} />
      </Field>
      <Button type="submit" disabled={busy}>
        Guardar
      </Button>
      {service && (
        <>
          {instance && instance.status === 'pending' && (
            <Button type="button" variant="secondary" onClick={() => skipInstance(household.id, instance.id, true).then(onClose)}>
              Omitir este mes
            </Button>
          )}
          <Button type="button" variant="ghost" className="text-danger" onClick={() => deleteService(household.id, service.id).then(onClose)}>
            Dar de baja (deja de generarse cada mes)
          </Button>
        </>
      )}
    </form>
  )
}

function PayForm({ instance, service, onClose }: { instance: ServiceInstance; service: Service; onClose: () => void }) {
  const { household, user } = useRequiredHousehold()
  const { data: cards } = useCards()
  const [amount, setAmount] = useState(service.estimatedAmount ? String(service.estimatedAmount) : '')
  const [method, setMethod] = useState<PaymentMethod>('debit')
  const [cardId, setCardId] = useState<string | null>(cards[0]?.id ?? null)
  const [busy, setBusy] = useState(false)
  const parsed = parseAmount(amount)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!parsed || parsed <= 0) return
    setBusy(true)
    try {
      await payInstance(household.id, user.uid, instance, service, parsed, method, method === 'credit' ? cards.find((c) => c.id === cardId) : undefined)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <AmountInput value={amount} onChange={setAmount} autoFocus />
      <Field label="Medio de pago">
        <Chips options={PAYMENT_METHODS as { id: PaymentMethod; label: string }[]} value={method} onChange={setMethod} />
      </Field>
      {method === 'credit' && cards.length > 0 && (
        <Field label="Tarjeta">
          <Chips options={cards.map((c) => ({ id: c.id, label: c.name }))} value={cardId} onChange={setCardId} />
        </Field>
      )}
      <p className="text-xs text-muted">Se registra como gasto pagado por vos en {money(parsed ?? 0)}.</p>
      <Button type="submit" disabled={busy || !parsed}>
        Confirmar pago
      </Button>
    </form>
  )
}
