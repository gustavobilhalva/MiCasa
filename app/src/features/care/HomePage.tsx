import { differenceInCalendarDays } from 'date-fns'
import { Check, Plus, ShieldCheck, Wrench } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Sheet } from '../../components/layout/Sheet'
import { TopBar } from '../../components/layout/TopBar'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { MAINTENANCE_SUGGESTIONS } from '../../lib/defaults'
import { fmtDate, fromInputDate, toInputDate } from '../../lib/format'
import type { MaintenanceTask, Warranty } from '../../types'
import { Field, MemberDot, MemberPicker } from '../finance/ui'
import { deleteMaintenance, deleteWarranty, markMaintenanceDone, saveMaintenance, saveWarranty } from './api'
import { ContactsSection } from './ContactsSection'
import { useMaintenance, useWarranties } from './hooks'
import { Timestamp } from 'firebase/firestore'

type Tab = 'maintenance' | 'warranties' | 'contacts'

export function HomePage() {
  const [tab, setTab] = useState<Tab>('maintenance')
  return (
    <>
      <TopBar title="Casa" />
      <div role="tablist" className="mx-4 my-3 flex rounded-xl border border-line bg-card p-1">
        {(
          [
            ['maintenance', 'Mantenimiento'],
            ['warranties', 'Garantías'],
            ['contacts', 'Contactos'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`min-h-10 flex-1 rounded-lg text-sm font-medium ${tab === id ? 'bg-accent text-white' : 'text-muted'}`}>
            {label}
          </button>
        ))}
      </div>
      {tab === 'maintenance' && <MaintenanceTab />}
      {tab === 'warranties' && <WarrantiesTab />}
      {tab === 'contacts' && (
        <main className="px-4 pb-28">
          <ContactsSection linkedTo={{ type: 'home' }} title="Plomero, electricista, gasista, administración…" />
        </main>
      )}
    </>
  )
}

function MaintenanceTab() {
  const { household } = useRequiredHousehold()
  const { data: tasks } = useMaintenance()
  const [editing, setEditing] = useState<MaintenanceTask | null | 'new'>(null)
  const today = new Date()

  return (
    <main className="pb-28">
      {tasks.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="font-medium">Sin tareas de mantenimiento</p>
          <p className="mt-1 text-sm text-muted">Filtro de agua, aire acondicionado, caldera, detector de humo… con intervalo y responsable.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line bg-card">
          {tasks.map((t) => {
            const days = differenceInCalendarDays(t.nextDueAt.toDate(), today)
            return (
              <li key={t.id} className="flex min-h-16 items-center gap-3 px-4">
                <MemberDot uid={t.assigneeUid} size="md" />
                <button onClick={() => setEditing(t)} className="flex-1 py-2 text-left">
                  <p>{t.name}</p>
                  <p className={`text-xs ${days < 0 ? 'text-danger' : days <= 7 ? 'text-warn' : 'text-muted'}`}>
                    {days < 0 ? `Vencido hace ${-days} días` : days === 0 ? 'Hoy' : `En ${days} días · ${fmtDate(t.nextDueAt.toDate(), 'd MMM yyyy')}`}
                    <span className="text-muted"> · cada {t.intervalMonths} meses</span>
                  </p>
                </button>
                <button onClick={() => markMaintenanceDone(household.id, t)} className="flex min-h-10 items-center gap-1 rounded-full bg-accent px-3 text-sm font-medium text-white">
                  <Check size={16} /> Hecho
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <button onClick={() => setEditing('new')} aria-label="Nueva tarea" className="fixed bottom-20 right-4 z-20 flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-lg md:bottom-8">
        <Plus size={28} />
      </button>
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Nueva tarea' : 'Editar tarea'}>
        {editing !== null && <MaintenanceForm key={editing === 'new' ? 'new' : editing.id} task={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      </Sheet>
    </main>
  )
}

function MaintenanceForm({ task, onClose }: { task: MaintenanceTask | null; onClose: () => void }) {
  const { household, user } = useRequiredHousehold()
  const [name, setName] = useState(task?.name ?? '')
  const [interval, setInterval] = useState(String(task?.intervalMonths ?? 6))
  const [lastDone, setLastDone] = useState(task?.lastDoneAt ? toInputDate(task.lastDoneAt.toDate()) : '')
  const [assignee, setAssignee] = useState<string | null>(task?.assigneeUid ?? null)
  const [notes, setNotes] = useState(task?.notes ?? '')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      await saveMaintenance(
        household.id,
        user.uid,
        {
          name: name.trim(),
          intervalMonths: Math.max(1, Number(interval) || 1),
          lastDoneAt: lastDone ? fromInputDate(lastDone) : null,
          nextDueAt: task && !lastDone ? task.nextDueAt.toDate() : undefined,
          assigneeUid: assignee,
          notes: notes.trim() || undefined,
        },
        task?.id,
      )
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {!task && (
        <div className="flex flex-wrap gap-2">
          {MAINTENANCE_SUGGESTIONS.map((s) => (
            <button key={s.name} type="button" onClick={() => { setName(s.name); setInterval(String(s.intervalMonths)) }} className="min-h-9 rounded-full border border-line bg-card px-3 text-xs">
              <Wrench size={12} className="mr-1 inline" />
              {s.name}
            </button>
          ))}
        </div>
      )}
      <Field label="Tarea">
        <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cada (meses)">
          <Input inputMode="numeric" value={interval} onChange={(e) => setInterval(e.target.value)} />
        </Field>
        <Field label="Última vez" hint="Para calcular la próxima">
          <Input type="date" value={lastDone} onChange={(e) => setLastDone(e.target.value)} />
        </Field>
      </div>
      <Field label="Responsable">
        <MemberPicker value={assignee} onChange={setAssignee} allowNone />
      </Field>
      <Field label="Notas">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Modelo del filtro, técnico de confianza…" />
      </Field>
      <Button type="submit" disabled={busy}>
        Guardar
      </Button>
      {task && (
        <Button type="button" variant="ghost" className="text-danger" onClick={() => deleteMaintenance(household.id, task.id).then(onClose)}>
          Eliminar
        </Button>
      )}
    </form>
  )
}

function WarrantiesTab() {
  const { data: warranties } = useWarranties()
  const [editing, setEditing] = useState<Warranty | null | 'new'>(null)
  const today = new Date()
  return (
    <main className="pb-28">
      {warranties.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="font-medium">Sin garantías cargadas</p>
          <p className="mt-1 text-sm text-muted">Electrodomésticos y compras grandes: fecha de compra, fin de garantía y dónde se compró.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line bg-card">
          {warranties.map((w) => {
            const days = differenceInCalendarDays(w.expiresAt.toDate(), today)
            return (
              <li key={w.id}>
                <button onClick={() => setEditing(w)} className="flex min-h-14 w-full items-center gap-3 px-4 text-left">
                  <ShieldCheck size={20} className={days < 0 ? 'text-muted' : days <= 30 ? 'text-warn' : 'text-ok'} />
                  <div className="flex-1">
                    <p className={days < 0 ? 'text-muted' : ''}>{w.item}</p>
                    <p className="text-xs text-muted">
                      {days < 0 ? 'Garantía vencida' : `Vence ${fmtDate(w.expiresAt.toDate(), 'd MMM yyyy')}`}
                      {w.store && ` · ${w.store}`}
                    </p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <button onClick={() => setEditing('new')} aria-label="Nueva garantía" className="fixed bottom-20 right-4 z-20 flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-lg md:bottom-8">
        <Plus size={28} />
      </button>
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Nueva garantía' : 'Editar garantía'}>
        {editing !== null && <WarrantyForm key={editing === 'new' ? 'new' : editing.id} warranty={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      </Sheet>
    </main>
  )
}

function WarrantyForm({ warranty, onClose }: { warranty: Warranty | null; onClose: () => void }) {
  const { household, user } = useRequiredHousehold()
  const [item, setItem] = useState(warranty?.item ?? '')
  const [purchased, setPurchased] = useState(toInputDate(warranty?.purchasedAt.toDate() ?? new Date()))
  const [months, setMonths] = useState('12')
  const [expires, setExpires] = useState(warranty?.expiresAt ? toInputDate(warranty.expiresAt.toDate()) : '')
  const [store, setStore] = useState(warranty?.store ?? '')
  const [notes, setNotes] = useState(warranty?.notes ?? '')
  const [busy, setBusy] = useState(false)

  const applyMonths = (m: string) => {
    setMonths(m)
    const d = fromInputDate(purchased)
    d.setMonth(d.getMonth() + (Number(m) || 0))
    setExpires(toInputDate(d))
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!item.trim() || !expires) return
    setBusy(true)
    try {
      await saveWarranty(
        household.id,
        user.uid,
        {
          item: item.trim(),
          purchasedAt: Timestamp.fromDate(fromInputDate(purchased)),
          expiresAt: Timestamp.fromDate(fromInputDate(expires)),
          store: store.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        warranty?.id,
      )
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Producto">
        <Input value={item} onChange={(e) => setItem(e.target.value)} placeholder="Heladera Samsung" required autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Comprado el">
          <Input type="date" value={purchased} onChange={(e) => setPurchased(e.target.value)} />
        </Field>
        <Field label="Garantía (meses)">
          <Input inputMode="numeric" value={months} onChange={(e) => applyMonths(e.target.value)} />
        </Field>
      </div>
      <Field label="Vence el">
        <Input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} required />
      </Field>
      <Field label="Comercio">
        <Input value={store} onChange={(e) => setStore(e.target.value)} placeholder="Frávega, Mercado Libre…" />
      </Field>
      <Field label="Notas">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="N° de factura, dónde está el ticket…" />
      </Field>
      <Button type="submit" disabled={busy}>
        Guardar
      </Button>
      {warranty && (
        <Button type="button" variant="ghost" className="text-danger" onClick={() => deleteWarranty(household.id, warranty.id).then(onClose)}>
          Eliminar
        </Button>
      )}
    </form>
  )
}
