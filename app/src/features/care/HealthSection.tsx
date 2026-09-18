import { differenceInCalendarDays } from 'date-fns'
import { Plus, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Sheet } from '../../components/layout/Sheet'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { HEALTH_TYPES } from '../../lib/defaults'
import { fmtDate, fromInputDate, toInputDate } from '../../lib/format'
import type { HealthRecord } from '../../types'
import { Chips, Field } from '../finance/ui'
import { addHealthRecord, deleteHealthRecord } from './api'
import { useHealthRecords } from './hooks'

export function HealthSection({ subjectType, subjectId }: { subjectType: 'person' | 'pet'; subjectId: string }) {
  const { household } = useRequiredHousehold()
  const { data: records } = useHealthRecords(subjectId)
  const [adding, setAdding] = useState(false)

  const upcoming = useMemo(() => {
    const today = new Date()
    return records
      .filter((r) => r.nextDueAt)
      .map((r) => ({ r, days: differenceInCalendarDays(r.nextDueAt!.toDate(), today) }))
      .sort((a, b) => a.days - b.days)
  }, [records])

  const typeLabel = (t: string) => HEALTH_TYPES.find((x) => x.id === t)?.label ?? t

  return (
    <section className="rounded-xl border border-line bg-card">
      <div className="flex items-center justify-between px-4 pt-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Salud</h2>
        <button onClick={() => setAdding(true)} className="flex min-h-9 items-center gap-1 text-sm text-accent">
          <Plus size={16} /> Registrar
        </button>
      </div>

      {upcoming.length > 0 && (
        <ul className="mt-2 divide-y divide-line border-t border-line">
          {upcoming.map(({ r, days }) => (
            <li key={r.id} className="flex items-center gap-3 px-4 py-2 text-sm">
              <span className="flex-1">
                Próxima {r.name.toLowerCase()}
                <span className="text-muted"> · {typeLabel(r.type).toLowerCase()}</span>
              </span>
              <span className={days < 0 ? 'text-danger' : days <= 7 ? 'text-warn' : 'text-muted'}>
                {days < 0 ? `vencida hace ${-days}d` : days === 0 ? 'hoy' : fmtDate(r.nextDueAt!.toDate(), 'd MMM yyyy')}
              </span>
            </li>
          ))}
        </ul>
      )}

      <details className="border-t border-line">
        <summary className="cursor-pointer px-4 py-2 text-sm text-muted">Historial ({records.length})</summary>
        {records.length === 0 ? (
          <p className="px-4 pb-3 text-sm text-muted">Sin registros todavía.</p>
        ) : (
          <ul className="divide-y divide-line">
            {records.map((r) => (
              <li key={r.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                <div className="flex-1">
                  <p>
                    {r.name} <span className="text-muted">· {typeLabel(r.type).toLowerCase()}</span>
                  </p>
                  <p className="text-xs text-muted">
                    {fmtDate(r.doneAt.toDate(), 'd MMM yyyy')}
                    {r.product && ` · ${r.product}`}
                    {r.notes && ` · ${r.notes}`}
                  </p>
                </div>
                <button onClick={() => deleteHealthRecord(household.id, r.id)} aria-label="Eliminar registro" className="flex size-9 items-center justify-center text-muted">
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </details>

      <Sheet open={adding} onClose={() => setAdding(false)} title="Registrar">
        {adding && <HealthForm subjectType={subjectType} subjectId={subjectId} records={records} onClose={() => setAdding(false)} />}
      </Sheet>
    </section>
  )
}

function HealthForm({ subjectType, subjectId, records, onClose }: { subjectType: 'person' | 'pet'; subjectId: string; records: HealthRecord[]; onClose: () => void }) {
  const { household, user } = useRequiredHousehold()
  const types = HEALTH_TYPES.filter((t) => (subjectType === 'pet' ? t.forPets : t.forPeople))
  const [type, setType] = useState<HealthRecord['type']>(types[0].id as HealthRecord['type'])
  const [name, setName] = useState('')
  const [date, setDate] = useState(toInputDate(new Date()))
  const [product, setProduct] = useState('')
  const [notes, setNotes] = useState('')
  const [interval, setInterval] = useState(String(types[0].defaultIntervalMonths ?? ''))
  const [busy, setBusy] = useState(false)

  const previousNames = useMemo(() => [...new Set(records.filter((r) => r.type === type).map((r) => r.name))], [records, type])

  const pickType = (t: HealthRecord['type']) => {
    setType(t)
    setInterval(String(HEALTH_TYPES.find((x) => x.id === t)?.defaultIntervalMonths ?? ''))
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      await addHealthRecord(household.id, user.uid, {
        subjectType,
        subjectId,
        type,
        name: name.trim(),
        doneAt: fromInputDate(date),
        product: product.trim() || undefined,
        notes: notes.trim() || undefined,
        intervalMonths: Number(interval) || undefined,
      })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Tipo">
        <Chips options={types.map((t) => ({ id: t.id as HealthRecord['type'], label: t.label }))} value={type} onChange={pickType} />
      </Field>
      <Field label="Nombre" hint={previousNames.length ? `Anteriores: ${previousNames.join(', ')}` : undefined}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={type === 'vaccine' ? 'Antirrábica' : 'Control anual'} required autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <Field label="Repetir cada (meses)" hint="Vacío = no repite">
          <Input inputMode="numeric" value={interval} onChange={(e) => setInterval(e.target.value)} />
        </Field>
      </div>
      <Field label="Producto / marca">
        <Input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Opcional" />
      </Field>
      <Field label="Notas">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
      </Field>
      <Button type="submit" disabled={busy}>
        Guardar
      </Button>
    </form>
  )
}
