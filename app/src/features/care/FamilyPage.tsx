import { differenceInYears } from 'date-fns'
import { ArrowLeft, ChevronRight, Plus, Ruler } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Sheet } from '../../components/layout/Sheet'
import { TopBar } from '../../components/layout/TopBar'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { fmtDate, fromInputDate, toInputDate } from '../../lib/format'
import type { Person } from '../../types'
import { Field } from '../finance/ui'
import { deletePerson, savePerson } from './api'
import { ContactsSection } from './ContactsSection'
import { DocumentsList } from './DocumentsPage'
import { HealthSection } from './HealthSection'
import { usePeople } from './hooks'
import { Timestamp } from 'firebase/firestore'

export function FamilyPage() {
  const { data: people } = usePeople()
  const [creating, setCreating] = useState(false)

  return (
    <>
      <TopBar title="Familia" />
      <main className="flex flex-col gap-3 px-4 py-4 pb-28">
        {people.length === 0 ? (
          <div className="px-2 py-12 text-center">
            <p className="font-medium">Sin fichas todavía</p>
            <p className="mt-1 text-sm text-muted">Creá la ficha de tu hijo: colegio, obra social, alergias, talles, salud y contactos en un solo lugar.</p>
          </div>
        ) : (
          people.map((p) => (
            <Link key={p.id} to={`/familia/${p.id}`} className="flex items-center gap-3 rounded-xl border border-line bg-card p-4">
              <span className="text-3xl">🧒</span>
              <div className="flex-1">
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-muted">
                  {p.birthDate && `${differenceInYears(new Date(), p.birthDate.toDate())} años`}
                  {p.school?.name && ` · ${p.school.name}${p.school.grade ? ` (${p.school.grade})` : ''}`}
                </p>
              </div>
              <ChevronRight size={18} className="text-muted" />
            </Link>
          ))
        )}
      </main>
      <button onClick={() => setCreating(true)} aria-label="Nueva ficha" className="fixed bottom-20 right-4 z-20 flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-lg md:bottom-8">
        <Plus size={28} />
      </button>
      <Sheet open={creating} onClose={() => setCreating(false)} title="Nueva ficha">
        {creating && <PersonForm person={null} onClose={() => setCreating(false)} />}
      </Sheet>
    </>
  )
}

export function PersonDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { data: people } = usePeople()
  const person = people.find((p) => p.id === id)
  const [editing, setEditing] = useState(false)
  if (!person) return null

  return (
    <>
      <TopBar
        title={person.name}
        right={
          <Link to="/familia" className="flex min-h-10 items-center gap-1 text-sm text-muted">
            <ArrowLeft size={16} /> Familia
          </Link>
        }
      />
      <main className="flex flex-col gap-4 px-4 py-4 pb-28">
        <section className="rounded-xl border border-line bg-card p-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            {person.birthDate && <Row k="Nacimiento" v={`${fmtDate(person.birthDate.toDate(), 'd MMM yyyy')} · ${differenceInYears(new Date(), person.birthDate.toDate())} años`} />}
            {person.school?.name && <Row k="Colegio" v={`${person.school.name}${person.school.grade ? ` · ${person.school.grade}` : ''}`} />}
            {person.school?.phone && <Row k="Tel. colegio" v={person.school.phone} />}
            {person.healthInsurance?.provider && <Row k="Obra social" v={`${person.healthInsurance.provider}${person.healthInsurance.number ? ` · ${person.healthInsurance.number}` : ''}`} />}
            {person.allergies && person.allergies.length > 0 && <Row k="Alergias" v={person.allergies.join(', ')} danger />}
            {person.notes && <Row k="Notas" v={person.notes} />}
          </dl>
          <button onClick={() => setEditing(true)} className="mt-3 text-sm text-accent underline">
            Editar ficha
          </button>
        </section>

        <section className="rounded-xl border border-line bg-card p-4">
          <h2 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">
            <Ruler size={14} /> Talles
          </h2>
          {person.sizes?.clothing || person.sizes?.shoes ? (
            <p className="text-sm">
              Ropa <strong>{person.sizes.clothing ?? '—'}</strong> · Calzado <strong>{person.sizes.shoes ?? '—'}</strong>
              {person.sizes.updatedAt && <span className="text-muted"> · actualizado {fmtDate(person.sizes.updatedAt.toDate(), 'd MMM yyyy')}</span>}
            </p>
          ) : (
            <p className="text-sm text-muted">Cargá los talles desde "Editar ficha" para no dudar en el negocio.</p>
          )}
        </section>

        <HealthSection subjectType="person" subjectId={person.id} />
        <DocumentsList subjectType="person" subjectId={person.id} subjectName={person.name} />
        <ContactsSection linkedTo={{ type: 'person', id: person.id }} title="Contactos (pediatra, colegio, otros padres)" />
      </main>

      <Sheet open={editing} onClose={() => setEditing(false)} title="Editar ficha">
        {editing && <PersonForm person={person} onClose={() => setEditing(false)} onDeleted={() => navigate('/familia')} />}
      </Sheet>
    </>
  )
}

function Row({ k, v, danger }: { k: string; v: string; danger?: boolean }) {
  return (
    <>
      <dt className="text-muted">{k}</dt>
      <dd className={danger ? 'font-medium text-danger' : ''}>{v}</dd>
    </>
  )
}

function PersonForm({ person, onClose, onDeleted }: { person: Person | null; onClose: () => void; onDeleted?: () => void }) {
  const { household, user } = useRequiredHousehold()
  const [name, setName] = useState(person?.name ?? '')
  const [birth, setBirth] = useState(person?.birthDate ? toInputDate(person.birthDate.toDate()) : '')
  const [school, setSchool] = useState(person?.school?.name ?? '')
  const [grade, setGrade] = useState(person?.school?.grade ?? '')
  const [schoolPhone, setSchoolPhone] = useState(person?.school?.phone ?? '')
  const [insurance, setInsurance] = useState(person?.healthInsurance?.provider ?? '')
  const [insuranceNo, setInsuranceNo] = useState(person?.healthInsurance?.number ?? '')
  const [allergies, setAllergies] = useState((person?.allergies ?? []).join(', '))
  const [clothing, setClothing] = useState(person?.sizes?.clothing ?? '')
  const [shoes, setShoes] = useState(person?.sizes?.shoes ?? '')
  const [notes, setNotes] = useState(person?.notes ?? '')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      const sizesChanged = clothing !== (person?.sizes?.clothing ?? '') || shoes !== (person?.sizes?.shoes ?? '')
      await savePerson(
        household.id,
        user.uid,
        {
          name: name.trim(),
          relation: 'child',
          birthDate: birth ? Timestamp.fromDate(fromInputDate(birth)) : undefined,
          school: { name: school.trim() || undefined, grade: grade.trim() || undefined, phone: schoolPhone.trim() || undefined },
          healthInsurance: { provider: insurance.trim() || undefined, number: insuranceNo.trim() || undefined },
          allergies: allergies.split(',').map((s) => s.trim()).filter(Boolean),
          sizes: { clothing: clothing.trim() || undefined, shoes: shoes.trim() || undefined, updatedAt: sizesChanged ? Timestamp.now() : person?.sizes?.updatedAt },
          notes: notes.trim() || undefined,
        },
        person?.id,
      )
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Nombre">
        <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
      </Field>
      <Field label="Fecha de nacimiento">
        <Input type="date" value={birth} onChange={(e) => setBirth(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Colegio">
          <Input value={school} onChange={(e) => setSchool(e.target.value)} />
        </Field>
        <Field label="Grado / sala">
          <Input value={grade} onChange={(e) => setGrade(e.target.value)} />
        </Field>
      </div>
      <Field label="Teléfono del colegio">
        <Input type="tel" value={schoolPhone} onChange={(e) => setSchoolPhone(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Obra social">
          <Input value={insurance} onChange={(e) => setInsurance(e.target.value)} />
        </Field>
        <Field label="N° afiliado">
          <Input value={insuranceNo} onChange={(e) => setInsuranceNo(e.target.value)} />
        </Field>
      </div>
      <Field label="Alergias" hint="Separadas por coma">
        <Input value={allergies} onChange={(e) => setAllergies(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Talle ropa">
          <Input value={clothing} onChange={(e) => setClothing(e.target.value)} placeholder="8" />
        </Field>
        <Field label="Calzado">
          <Input value={shoes} onChange={(e) => setShoes(e.target.value)} placeholder="32" />
        </Field>
      </div>
      <Field label="Notas">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <Button type="submit" disabled={busy}>
        Guardar
      </Button>
      {person && (
        <Button type="button" variant="ghost" className="text-danger" onClick={() => confirm('¿Eliminar la ficha?') && deletePerson(household.id, person.id).then(() => onDeleted?.())}>
          Eliminar ficha
        </Button>
      )}
    </form>
  )
}
