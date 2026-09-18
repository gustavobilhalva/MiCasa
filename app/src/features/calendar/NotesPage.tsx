import { addDays, isToday, isTomorrow, isYesterday, startOfDay } from 'date-fns'
import { ArrowLeft, Check, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Sheet } from '../../components/layout/Sheet'
import { TopBar } from '../../components/layout/TopBar'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { fmtDate, fromInputDate, toInputDate } from '../../lib/format'
import type { Note } from '../../types'
import { Field, MemberDot, MemberPicker } from '../finance/ui'
import { deleteNote, saveNote, toggleChecklistItem, toggleNote } from './api'
import { useNotes, usePendingNotes } from './hooks'

export function NotesPage() {
  const from = useMemo(() => addDays(startOfDay(new Date()), -1), [])
  const to = useMemo(() => addDays(startOfDay(new Date()), 14), [])
  const { data: notes } = useNotes(from, to)
  const { data: pending } = usePendingNotes()
  const [editing, setEditing] = useState<Note | null | 'new'>(null)

  const overdue = pending.filter((n) => n.date.toDate() < from)
  const all = useMemo(() => {
    const ids = new Set(notes.map((n) => n.id))
    return [...overdue.filter((n) => !ids.has(n.id)), ...notes]
  }, [notes, overdue])

  const byDay = useMemo(() => {
    const map = new Map<string, { date: Date; notes: Note[] }>()
    for (const n of all) {
      const d = n.date.toDate()
      const k = d.toDateString()
      if (!map.has(k)) map.set(k, { date: d, notes: [] })
      map.get(k)!.notes.push(n)
    }
    return [...map.values()].sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [all])

  const label = (d: Date) => (isToday(d) ? 'Hoy' : isTomorrow(d) ? 'Mañana' : isYesterday(d) ? 'Ayer' : fmtDate(d, 'EEEE d MMM'))

  return (
    <>
      <TopBar
        title="Notas del día"
        right={
          <Link to="/agenda" className="flex min-h-10 items-center gap-1 text-sm text-muted">
            <ArrowLeft size={16} /> Agenda
          </Link>
        }
      />
      <main className="pb-28">
        {byDay.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-muted">
            Sin notas. Anotá cosas del día a día: "Turno médico 16 hs", "Dejarle las llaves a la abuela".
          </p>
        ) : (
          byDay.map(({ date, notes }) => {
            const past = date < startOfDay(new Date())
            return (
              <section key={date.toISOString()}>
                <h2 className={`px-4 py-2 text-xs font-semibold uppercase tracking-wide ${past ? 'text-danger' : isToday(date) ? 'text-accent' : 'text-muted'}`}>
                  {label(date)}
                  {past && ' · pendiente'}
                </h2>
                <ul className="divide-y divide-line bg-card">
                  {notes.map((n) => (
                    <NoteRow key={n.id} note={n} onEdit={() => setEditing(n)} />
                  ))}
                </ul>
              </section>
            )
          })
        )}
      </main>

      <button
        onClick={() => setEditing('new')}
        aria-label="Nueva nota"
        className="fixed bottom-20 right-4 z-20 flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-lg md:bottom-8"
      >
        <Plus size={28} />
      </button>

      <NoteSheet open={editing !== null} onClose={() => setEditing(null)} note={editing === 'new' ? null : editing} />
    </>
  )
}

export function NoteRow({ note, onEdit }: { note: Note; onEdit?: () => void }) {
  const { household } = useRequiredHousehold()
  return (
    <li className="flex items-start gap-3 px-4 py-2">
      <button
        onClick={() => toggleNote(household.id, note)}
        aria-label={note.done ? 'Marcar pendiente' : 'Marcar hecha'}
        className={`mt-1 flex size-9 shrink-0 items-center justify-center rounded-full border-2 ${note.done ? 'border-ok bg-ok text-white' : 'border-line'}`}
      >
        {note.done && <Check size={18} strokeWidth={3} />}
      </button>
      <button onClick={onEdit} className={`min-h-11 flex-1 py-1 text-left ${note.done ? 'text-muted line-through' : ''}`}>
        <p>
          {note.time && <span className="mr-2 text-sm font-medium text-accent">{note.time}</span>}
          {note.text}
        </p>
        {note.checklist && note.checklist.length > 0 && (
          <ul className="mt-1 flex flex-col gap-1">
            {note.checklist.map((c, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={c.done}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleChecklistItem(household.id, note, i)}
                  className="size-4 accent-accent"
                />
                <span className={c.done ? 'text-muted line-through' : ''}>{c.text}</span>
              </li>
            ))}
          </ul>
        )}
      </button>
      <span className="mt-2">
        <MemberDot uid={note.assigneeUid} />
      </span>
    </li>
  )
}

export function NoteSheet({ open, onClose, note, defaultDate }: { open: boolean; onClose: () => void; note: Note | null; defaultDate?: Date }) {
  return (
    <Sheet open={open} onClose={onClose} title={note ? 'Editar nota' : 'Nota rápida'}>
      {open && <NoteForm key={note?.id ?? 'new'} note={note} defaultDate={defaultDate} onClose={onClose} />}
    </Sheet>
  )
}

function NoteForm({ note, defaultDate, onClose }: { note: Note | null; defaultDate?: Date; onClose: () => void }) {
  const { household, user } = useRequiredHousehold()
  const [text, setText] = useState(note?.text ?? '')
  const [date, setDate] = useState(toInputDate(note?.date.toDate() ?? defaultDate ?? new Date()))
  const [time, setTime] = useState(note?.time ?? '')
  const [assignee, setAssignee] = useState<string | null>(note?.assigneeUid ?? null)
  const [checklist, setChecklist] = useState((note?.checklist ?? []).map((c) => c.text).join('\n'))
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    setBusy(true)
    try {
      const items = checklist
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
      const existing = note?.checklist ?? []
      await saveNote(
        household.id,
        user.uid,
        {
          text: text.trim(),
          date: fromInputDate(date),
          time: time || undefined,
          assigneeUid: assignee,
          checklist: items.length ? items.map((t) => ({ text: t, done: existing.find((c) => c.text === t)?.done ?? false })) : undefined,
        },
        note?.id,
      )
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Nota">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Turno médico 16 hs" required autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Día">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Hora (opcional)">
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
      <Field label="Responsable">
        <MemberPicker value={assignee} onChange={setAssignee} allowNone />
      </Field>
      <Field label="Checklist" hint="Un ítem por línea">
        <textarea
          value={checklist}
          onChange={(e) => setChecklist(e.target.value)}
          rows={3}
          placeholder={'Llevar carnet\nPedir receta'}
          className="w-full rounded-xl border border-line bg-card px-4 py-3 text-base placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </Field>
      <Button type="submit" disabled={busy}>
        Guardar
      </Button>
      {note && (
        <Button type="button" variant="ghost" className="text-danger" onClick={() => deleteNote(household.id, note.id).then(onClose)}>
          <Trash2 size={16} /> Eliminar
        </Button>
      )}
    </form>
  )
}
