import { differenceInCalendarDays } from 'date-fns'
import { ClipboardList, FileText, Plus } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Sheet } from '../../components/layout/Sheet'
import { TopBar } from '../../components/layout/TopBar'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { DOCUMENT_TYPES, PROCEDURE_TEMPLATES } from '../../lib/defaults'
import { fmtDate, fromInputDate, toInputDate } from '../../lib/format'
import type { HouseholdDocument, Procedure } from '../../types'
import { Chips, Field, MemberDot, MemberPicker, ProgressBar } from '../finance/ui'
import { deleteDocument, deleteProcedure, saveDocument, saveProcedure, toggleProcedureStep } from './api'
import { useDocuments, usePeople, usePets, useProcedures } from './hooks'
import { Timestamp } from 'firebase/firestore'

type Tab = 'docs' | 'procedures'

export function PaperworkPage() {
  const [tab, setTab] = useState<Tab>('docs')
  return (
    <>
      <TopBar
        title="Trámites"
        right={
          <div role="tablist" className="flex rounded-full border border-line bg-card p-0.5">
            {(
              [
                ['docs', 'Documentos'],
                ['procedures', 'Trámites'],
              ] as [Tab, string][]
            ).map(([id, label]) => (
              <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={`min-h-9 rounded-full px-3 text-sm font-medium ${tab === id ? 'bg-accent text-white' : 'text-muted'}`}>
                {label}
              </button>
            ))}
          </div>
        }
      />
      {tab === 'docs' ? <AllDocuments /> : <ProceduresTab />}
    </>
  )
}

// ---------- Documentos ----------

function semaphore(days: number | null) {
  if (days === null) return { cls: 'text-muted', text: 'sin vencimiento' }
  if (days < 0) return { cls: 'text-danger', text: `vencido hace ${-days} días` }
  if (days <= 30) return { cls: 'text-warn', text: `vence en ${days} días` }
  return { cls: 'text-ok', text: `vence en ${days} días` }
}

function AllDocuments() {
  const { data: docs } = useDocuments()
  const [editing, setEditing] = useState<HouseholdDocument | null | 'new'>(null)
  const sorted = useMemo(() => {
    const today = new Date()
    return docs
      .map((d) => ({ d, days: d.expiresAt ? differenceInCalendarDays(d.expiresAt.toDate(), today) : null }))
      .sort((a, b) => (a.days ?? 9999) - (b.days ?? 9999))
  }, [docs])

  return (
    <main className="pb-28">
      {docs.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="font-medium">Sin documentos</p>
          <p className="mt-1 text-sm text-muted">DNI, pasaporte, licencia, VTV, seguro, obra social… con su vencimiento y semáforo.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line bg-card">
          {sorted.map(({ d, days }) => {
            const s = semaphore(days)
            return (
              <li key={d.id}>
                <button onClick={() => setEditing(d)} className="flex min-h-14 w-full items-center gap-3 px-4 text-left">
                  <FileText size={20} className={s.cls} />
                  <div className="flex-1">
                    <p>
                      {d.label} <span className="text-muted">· {d.subjectName}</span>
                    </p>
                    <p className={`text-xs ${s.cls}`}>
                      {s.text}
                      {d.expiresAt && ` · ${fmtDate(d.expiresAt.toDate(), 'd MMM yyyy')}`}
                      {d.number && ` · N° ${d.number}`}
                    </p>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <button onClick={() => setEditing('new')} aria-label="Nuevo documento" className="fixed bottom-20 right-4 z-20 flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-lg md:bottom-8">
        <Plus size={28} />
      </button>
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Nuevo documento' : 'Editar documento'}>
        {editing !== null && <DocumentForm key={editing === 'new' ? 'new' : editing.id} document={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      </Sheet>
    </main>
  )
}

export function DocumentsList({ subjectType, subjectId, subjectName }: { subjectType: 'person' | 'pet'; subjectId: string; subjectName: string }) {
  const { data: docs } = useDocuments()
  const [editing, setEditing] = useState<HouseholdDocument | null | 'new'>(null)
  const mine = docs.filter((d) => d.subjectType === subjectType && d.subjectId === subjectId)
  const today = new Date()
  return (
    <section className="rounded-xl border border-line bg-card">
      <div className="flex items-center justify-between px-4 pt-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Documentos</h2>
        <button onClick={() => setEditing('new')} className="flex min-h-9 items-center gap-1 text-sm text-accent">
          <Plus size={16} /> Agregar
        </button>
      </div>
      {mine.length === 0 ? (
        <p className="px-4 pb-3 pt-1 text-sm text-muted">Sin documentos.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line border-t border-line">
          {mine.map((d) => {
            const s = semaphore(d.expiresAt ? differenceInCalendarDays(d.expiresAt.toDate(), today) : null)
            return (
              <li key={d.id}>
                <button onClick={() => setEditing(d)} className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm">
                  <span className="flex-1">
                    {d.label}
                    {d.number && <span className="text-muted"> · {d.number}</span>}
                  </span>
                  <span className={`text-xs ${s.cls}`}>{d.expiresAt ? fmtDate(d.expiresAt.toDate(), 'd MMM yyyy') : ''}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Nuevo documento' : 'Editar documento'}>
        {editing !== null && (
          <DocumentForm
            key={editing === 'new' ? 'new' : editing.id}
            document={editing === 'new' ? null : editing}
            fixedSubject={{ subjectType, subjectId, subjectName }}
            onClose={() => setEditing(null)}
          />
        )}
      </Sheet>
    </section>
  )
}

function DocumentForm({ document, fixedSubject, onClose }: { document: HouseholdDocument | null; fixedSubject?: { subjectType: 'person' | 'pet'; subjectId: string; subjectName: string }; onClose: () => void }) {
  const { household, user, members } = useRequiredHousehold()
  const { data: people } = usePeople()
  const { data: pets } = usePets()
  const subjects = useMemo(
    () => [
      ...members.map((m) => ({ id: `user:${m.id}`, name: m.displayName, type: 'user' as const, subjectId: m.id })),
      ...people.map((p) => ({ id: `person:${p.id}`, name: p.name, type: 'person' as const, subjectId: p.id })),
      ...pets.map((p) => ({ id: `pet:${p.id}`, name: p.name, type: 'pet' as const, subjectId: p.id })),
      { id: 'household:home', name: 'La casa / el auto', type: 'household' as const, subjectId: 'home' },
    ],
    [members, people, pets],
  )
  const initialSubject = fixedSubject ? `${fixedSubject.subjectType}:${fixedSubject.subjectId}` : document ? `${document.subjectType}:${document.subjectId}` : subjects[0]?.id ?? ''
  const [subject, setSubject] = useState(initialSubject)
  const [type, setType] = useState<HouseholdDocument['type']>(document?.type ?? 'dni')
  const [label, setLabel] = useState(document?.label ?? '')
  const [number, setNumber] = useState(document?.number ?? '')
  const [expires, setExpires] = useState(document?.expiresAt ? toInputDate(document.expiresAt.toDate()) : '')
  const [notes, setNotes] = useState(document?.notes ?? '')
  const [busy, setBusy] = useState(false)

  const pickType = (t: HouseholdDocument['type']) => {
    setType(t)
    if (!label || DOCUMENT_TYPES.some((d) => d.label === label)) setLabel(DOCUMENT_TYPES.find((d) => d.id === t)?.label ?? '')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const s = subjects.find((x) => x.id === subject)
    if (!s || !label.trim()) return
    setBusy(true)
    try {
      await saveDocument(
        household.id,
        user.uid,
        {
          subjectType: s.type,
          subjectId: s.subjectId,
          subjectName: s.name,
          type,
          label: label.trim(),
          number: number.trim() || undefined,
          expiresAt: expires ? Timestamp.fromDate(fromInputDate(expires)) : null,
          notes: notes.trim() || undefined,
        },
        document?.id,
      )
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {!fixedSubject && (
        <Field label="De quién">
          <Chips options={subjects.map((s) => ({ id: s.id, label: s.name }))} value={subject} onChange={setSubject} />
        </Field>
      )}
      <Field label="Tipo">
        <Chips options={DOCUMENT_TYPES.map((d) => ({ id: d.id as HouseholdDocument['type'], label: d.label }))} value={type} onChange={pickType} />
      </Field>
      <Field label="Nombre">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} required />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Número">
          <Input value={number} onChange={(e) => setNumber(e.target.value)} placeholder="Opcional" />
        </Field>
        <Field label="Vence">
          <Input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
        </Field>
      </div>
      <Field label="Notas">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Dónde está guardado, etc." />
      </Field>
      <p className="text-xs text-muted">La foto/PDF del documento (bóveda) llega en una próxima versión.</p>
      <Button type="submit" disabled={busy}>
        Guardar
      </Button>
      {document && (
        <Button type="button" variant="ghost" className="text-danger" onClick={() => deleteDocument(household.id, document.id).then(onClose)}>
          Eliminar
        </Button>
      )}
    </form>
  )
}

// ---------- Trámites ----------

function ProceduresTab() {
  const { household } = useRequiredHousehold()
  const { data: procedures } = useProcedures()
  const [editing, setEditing] = useState<Procedure | null | 'new'>(null)
  const active = procedures.filter((p) => p.status !== 'done')
  const done = procedures.filter((p) => p.status === 'done')
  const today = new Date()

  const Card = ({ p }: { p: Procedure }) => {
    const doneCount = p.steps.filter((s) => s.done).length
    const days = p.dueDate ? differenceInCalendarDays(p.dueDate.toDate(), today) : null
    return (
      <li className="rounded-xl border border-line bg-card p-4">
        <div className="flex items-start gap-3">
          <button onClick={() => setEditing(p)} className="flex-1 text-left">
            <p className="font-medium">{p.title}</p>
            <p className={`text-xs ${days !== null && days < 0 ? 'text-danger' : days !== null && days <= 7 ? 'text-warn' : 'text-muted'}`}>
              {p.dueDate ? `Límite ${fmtDate(p.dueDate.toDate(), 'd MMM yyyy')}` : 'Sin fecha límite'}
              {p.steps.length > 0 && ` · ${doneCount}/${p.steps.length} pasos`}
            </p>
          </button>
          <MemberDot uid={p.assigneeUid} size="md" />
        </div>
        {p.steps.length > 0 && (
          <>
            <div className="my-2">
              <ProgressBar value={doneCount} max={p.steps.length} />
            </div>
            <ul className="flex flex-col gap-1">
              {p.steps.map((s, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={s.done} onChange={() => toggleProcedureStep(household.id, p, i)} className="size-5 accent-accent" />
                  <span className={s.done ? 'text-muted line-through' : ''}>{s.text}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </li>
    )
  }

  return (
    <main className="flex flex-col gap-3 px-4 py-4 pb-28">
      {procedures.length === 0 && (
        <div className="px-2 py-12 text-center">
          <p className="font-medium">Sin trámites en curso</p>
          <p className="mt-1 text-sm text-muted">Renovar DNI, pasaporte, licencia, VTV… con checklist de pasos, responsable y fecha límite.</p>
        </div>
      )}
      <ul className="flex flex-col gap-3">
        {active.map((p) => (
          <Card key={p.id} p={p} />
        ))}
      </ul>
      {done.length > 0 && (
        <details>
          <summary className="flex items-center gap-1 text-sm text-muted">
            <ClipboardList size={14} /> Terminados ({done.length})
          </summary>
          <ul className="mt-2 flex flex-col gap-3 opacity-70">
            {done.map((p) => (
              <Card key={p.id} p={p} />
            ))}
          </ul>
        </details>
      )}
      <button onClick={() => setEditing('new')} aria-label="Nuevo trámite" className="fixed bottom-20 right-4 z-20 flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-lg md:bottom-8">
        <Plus size={28} />
      </button>
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Nuevo trámite' : 'Editar trámite'}>
        {editing !== null && <ProcedureForm key={editing === 'new' ? 'new' : editing.id} procedure={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      </Sheet>
    </main>
  )
}

function ProcedureForm({ procedure, onClose }: { procedure: Procedure | null; onClose: () => void }) {
  const { household, user } = useRequiredHousehold()
  const [templateKey, setTemplateKey] = useState(procedure?.templateKey ?? 'custom')
  const [title, setTitle] = useState(procedure?.title ?? '')
  const [steps, setSteps] = useState((procedure?.steps ?? []).map((s) => s.text).join('\n'))
  const [assignee, setAssignee] = useState<string | null>(procedure?.assigneeUid ?? null)
  const [due, setDue] = useState(procedure?.dueDate ? toInputDate(procedure.dueDate.toDate()) : '')
  const [notes, setNotes] = useState(procedure?.notes ?? '')
  const [busy, setBusy] = useState(false)

  const pickTemplate = (key: string) => {
    setTemplateKey(key)
    const t = PROCEDURE_TEMPLATES.find((x) => x.key === key)
    if (t && key !== 'custom') {
      setTitle(t.title)
      setSteps(t.steps.join('\n'))
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    setBusy(true)
    try {
      const existing = procedure?.steps ?? []
      const list = steps
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
        .map((text) => ({ text, done: existing.find((s) => s.text === text)?.done ?? false }))
      await saveProcedure(
        household.id,
        user.uid,
        { title: title.trim(), templateKey, steps: list, assigneeUid: assignee, dueDate: due ? fromInputDate(due) : null, notes: notes.trim() || undefined },
        procedure?.id,
      )
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {!procedure && (
        <Field label="Plantilla">
          <Chips options={PROCEDURE_TEMPLATES.map((t) => ({ id: t.key, label: t.title }))} value={templateKey} onChange={pickTemplate} />
        </Field>
      )}
      <Field label="Título">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Renovar pasaporte del nene" required />
      </Field>
      <Field label="Pasos" hint="Uno por línea">
        <textarea value={steps} onChange={(e) => setSteps(e.target.value)} rows={5} className="w-full rounded-xl border border-line bg-card px-4 py-3 text-base placeholder:text-muted focus:border-accent focus:outline-none" />
      </Field>
      <Field label="Responsable">
        <MemberPicker value={assignee} onChange={setAssignee} allowNone />
      </Field>
      <Field label="Fecha límite">
        <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
      </Field>
      <Field label="Notas">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Link del turno, requisitos…" />
      </Field>
      <Button type="submit" disabled={busy}>
        Guardar
      </Button>
      {procedure && (
        <Button type="button" variant="ghost" className="text-danger" onClick={() => deleteProcedure(household.id, procedure.id).then(onClose)}>
          Eliminar trámite
        </Button>
      )}
    </form>
  )
}
