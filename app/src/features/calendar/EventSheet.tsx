import { useState, type FormEvent } from 'react'
import { Sheet } from '../../components/layout/Sheet'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { EVENT_CATEGORIES, EVENT_ROLES } from '../../lib/defaults'
import { fromInputDate, toInputDate } from '../../lib/format'
import type { CalendarEvent, RecurrenceFreq } from '../../types'
import { Chips, Field, MemberPicker } from '../finance/ui'
import { deleteEvent, saveEvent } from './api'

interface Props {
  open: boolean
  onClose: () => void
  event?: CalendarEvent | null
  defaultDate?: Date
}

export function EventSheet({ open, onClose, event, defaultDate }: Props) {
  return (
    <Sheet open={open} onClose={onClose} title={event ? 'Editar evento' : 'Nuevo evento'}>
      {open && <EventForm key={event?.id ?? 'new'} event={event ?? null} defaultDate={defaultDate} onClose={onClose} />}
    </Sheet>
  )
}

function toTime(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function EventForm({ event, defaultDate, onClose }: { event: CalendarEvent | null; defaultDate?: Date; onClose: () => void }) {
  const { household, user } = useRequiredHousehold()
  const startDate = event?.start.toDate() ?? defaultDate ?? new Date()
  const [title, setTitle] = useState(event?.title ?? '')
  const [categoryId, setCategoryId] = useState(event?.categoryId ?? 'child')
  const [date, setDate] = useState(toInputDate(startDate))
  const [allDay, setAllDay] = useState(event?.allDay ?? false)
  const [time, setTime] = useState(event && !event.allDay ? toTime(startDate) : '09:00')
  const [endTime, setEndTime] = useState(event?.end && !event.allDay ? toTime(event.end.toDate()) : '')
  const [location, setLocation] = useState(event?.location ?? '')
  const [notes, setNotes] = useState(event?.notes ?? '')
  const [roles, setRoles] = useState<Record<string, string | null>>(event?.roles ?? {})
  const [freq, setFreq] = useState<RecurrenceFreq | 'none'>(event?.recurrence?.freq ?? 'none')
  const [until, setUntil] = useState(event?.recurrence?.until ? toInputDate(event.recurrence.until.toDate()) : '')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setBusy(true)
    try {
      const base = fromInputDate(date)
      let start = new Date(base)
      let end: Date | undefined
      if (allDay) {
        start.setHours(0, 0, 0, 0)
      } else {
        const [h, m] = time.split(':').map(Number)
        start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), h, m)
        if (endTime) {
          const [eh, em] = endTime.split(':').map(Number)
          end = new Date(base.getFullYear(), base.getMonth(), base.getDate(), eh, em)
          if (end <= start) end = undefined
        }
      }
      const cleanRoles = Object.fromEntries(Object.entries(roles).filter(([, v]) => v))
      await saveEvent(
        household.id,
        user.uid,
        {
          title: title.trim(),
          categoryId,
          start,
          end,
          allDay,
          location: location.trim() || undefined,
          notes: notes.trim() || undefined,
          roles: Object.keys(cleanRoles).length ? cleanRoles : undefined,
          recurrence: freq === 'none' ? undefined : { freq, until: until ? fromInputDate(until) : undefined },
        },
        event?.id,
      )
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Título">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Examen de matemática" required autoFocus />
      </Field>
      <Field label="Categoría">
        <Chips options={EVENT_CATEGORIES.map((c) => ({ id: c.id, label: `${c.icon} ${c.name}` }))} value={categoryId} onChange={setCategoryId} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </Field>
        <label className="flex items-end gap-2 pb-3">
          <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="size-5 accent-accent" />
          <span className="text-sm">Todo el día</span>
        </label>
      </div>
      {!allDay && (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Hora">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
          <Field label="Hasta (opcional)">
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </Field>
        </div>
      )}

      <Field label="Responsables">
        <div className="flex flex-col gap-2">
          {EVENT_ROLES.map((r) => (
            <div key={r.id} className="flex items-center gap-2">
              <span className="w-28 text-sm text-muted">{r.label}</span>
              <MemberPicker value={roles[r.id] ?? null} onChange={(uid) => setRoles({ ...roles, [r.id]: uid })} allowNone />
            </div>
          ))}
        </div>
      </Field>

      <Field label="Repetir">
        <Chips
          options={[
            { id: 'none', label: 'No' },
            { id: 'weekly', label: 'Semanal' },
            { id: 'biweekly', label: 'Quincenal' },
            { id: 'monthly', label: 'Mensual' },
            { id: 'yearly', label: 'Anual' },
          ]}
          value={freq}
          onChange={setFreq}
        />
      </Field>
      {freq !== 'none' && (
        <Field label="Hasta (opcional)">
          <Input type="date" value={until} onChange={(e) => setUntil(e.target.value)} />
        </Field>
      )}

      <Field label="Lugar">
        <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Opcional" />
      </Field>
      <Field label="Notas">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
      </Field>

      <Button type="submit" disabled={busy}>
        Guardar
      </Button>
      {event && (
        <Button type="button" variant="ghost" className="text-danger" onClick={() => deleteEvent(household.id, event.id).then(onClose)}>
          Eliminar {event.recurring ? 'la serie completa' : 'evento'}
        </Button>
      )}
    </form>
  )
}
