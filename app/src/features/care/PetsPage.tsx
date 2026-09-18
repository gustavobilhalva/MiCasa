import { differenceInMonths, differenceInYears } from 'date-fns'
import { ArrowLeft, ChevronRight, Plus, ShoppingCart } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Sheet } from '../../components/layout/Sheet'
import { TopBar } from '../../components/layout/TopBar'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { fmtDate, fromInputDate, toInputDate } from '../../lib/format'
import type { Pet } from '../../types'
import { Chips, Field } from '../finance/ui'
import { useProducts } from '../shopping/hooks'
import { deletePet, requestPetFood, savePet } from './api'
import { ContactsSection } from './ContactsSection'
import { DocumentsList } from './DocumentsPage'
import { HealthSection } from './HealthSection'
import { usePets } from './hooks'
import { Timestamp } from 'firebase/firestore'

const SPECIES = [
  { id: 'dog', label: '🐶 Perro' },
  { id: 'cat', label: '🐱 Gato' },
  { id: 'other', label: '🐾 Otro' },
] as const

const icon = (s: Pet['species']) => (s === 'dog' ? '🐶' : s === 'cat' ? '🐱' : '🐾')

function age(d: Date) {
  const y = differenceInYears(new Date(), d)
  if (y >= 1) return `${y} año${y === 1 ? '' : 's'}`
  const m = differenceInMonths(new Date(), d)
  return `${m} mes${m === 1 ? '' : 'es'}`
}

export function PetsPage() {
  const { data: pets } = usePets()
  const [creating, setCreating] = useState(false)
  return (
    <>
      <TopBar title="Mascotas" />
      <main className="flex flex-col gap-3 px-4 py-4 pb-28">
        {pets.length === 0 ? (
          <div className="px-2 py-12 text-center">
            <p className="font-medium">Sin mascotas cargadas</p>
            <p className="mt-1 text-sm text-muted">Vacunas, desparasitación, veterinario y el botón "Queda poca comida".</p>
          </div>
        ) : (
          pets.map((p) => (
            <Link key={p.id} to={`/mascotas/${p.id}`} className="flex items-center gap-3 rounded-xl border border-line bg-card p-4">
              <span className="text-3xl">{icon(p.species)}</span>
              <div className="flex-1">
                <p className="font-medium">{p.name}</p>
                <p className="text-sm text-muted">
                  {p.breed}
                  {p.birthDate && `${p.breed ? ' · ' : ''}${age(p.birthDate.toDate())}`}
                </p>
              </div>
              <ChevronRight size={18} className="text-muted" />
            </Link>
          ))
        )}
      </main>
      <button onClick={() => setCreating(true)} aria-label="Nueva mascota" className="fixed bottom-20 right-4 z-20 flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-lg md:bottom-8">
        <Plus size={28} />
      </button>
      <Sheet open={creating} onClose={() => setCreating(false)} title="Nueva mascota">
        {creating && <PetForm pet={null} onClose={() => setCreating(false)} />}
      </Sheet>
    </>
  )
}

export function PetDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { household, user, storeSectors } = useRequiredHousehold()
  const { data: pets } = usePets()
  const { data: products } = useProducts()
  const pet = pets.find((p) => p.id === id)
  const [editing, setEditing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (!pet) return null

  const food = async () => {
    setBusy(true)
    try {
      const r = await requestPetFood(household.id, user.uid, pet, products, storeSectors)
      setToast(r === 'added' ? `Agregado a la lista: ${pet.foodName ?? `Alimento ${pet.name}`}` : 'Ya estaba en la lista del súper')
      setTimeout(() => setToast(null), 2500)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <TopBar
        title={pet.name}
        right={
          <Link to="/mascotas" className="flex min-h-10 items-center gap-1 text-sm text-muted">
            <ArrowLeft size={16} /> Mascotas
          </Link>
        }
      />
      <main className="flex flex-col gap-4 px-4 py-4 pb-28">
        <section className="flex items-center gap-4 rounded-xl border border-line bg-card p-4">
          <span className="text-5xl">{icon(pet.species)}</span>
          <div className="flex-1 text-sm">
            <p>{[pet.breed, pet.birthDate && age(pet.birthDate.toDate()), pet.weightKg && `${pet.weightKg} kg`].filter(Boolean).join(' · ')}</p>
            {pet.birthDate && <p className="text-muted">Nació el {fmtDate(pet.birthDate.toDate(), 'd MMM yyyy')}</p>}
            {pet.notes && <p className="text-muted">{pet.notes}</p>}
            <button onClick={() => setEditing(true)} className="mt-1 text-accent underline">
              Editar
            </button>
          </div>
        </section>

        <Button onClick={food} disabled={busy} className="min-h-14 w-full text-lg">
          <ShoppingCart size={20} /> Queda poca comida
        </Button>
        {pet.foodName && <p className="-mt-2 text-center text-xs text-muted">Agrega "{pet.foodName}" a la lista del súper</p>}
        {toast && <p className="rounded-xl bg-ok/15 px-4 py-2 text-center text-sm text-ok">{toast}</p>}

        <HealthSection subjectType="pet" subjectId={pet.id} />
        <DocumentsList subjectType="pet" subjectId={pet.id} subjectName={pet.name} />
        <ContactsSection linkedTo={{ type: 'pet', id: pet.id }} title="Veterinario y otros" />
      </main>

      <Sheet open={editing} onClose={() => setEditing(false)} title="Editar mascota">
        {editing && <PetForm pet={pet} onClose={() => setEditing(false)} onDeleted={() => navigate('/mascotas')} />}
      </Sheet>
    </>
  )
}

function PetForm({ pet, onClose, onDeleted }: { pet: Pet | null; onClose: () => void; onDeleted?: () => void }) {
  const { household, user } = useRequiredHousehold()
  const [name, setName] = useState(pet?.name ?? '')
  const [species, setSpecies] = useState<Pet['species']>(pet?.species ?? 'dog')
  const [breed, setBreed] = useState(pet?.breed ?? '')
  const [birth, setBirth] = useState(pet?.birthDate ? toInputDate(pet.birthDate.toDate()) : '')
  const [weight, setWeight] = useState(pet?.weightKg ? String(pet.weightKg) : '')
  const [foodName, setFoodName] = useState(pet?.foodName ?? '')
  const [notes, setNotes] = useState(pet?.notes ?? '')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      await savePet(
        household.id,
        user.uid,
        {
          name: name.trim(),
          species,
          breed: breed.trim() || undefined,
          birthDate: birth ? Timestamp.fromDate(fromInputDate(birth)) : undefined,
          weightKg: Number(weight.replace(',', '.')) || undefined,
          foodName: foodName.trim() || undefined,
          foodProductId: foodName.trim() && foodName.trim() !== pet?.foodName ? undefined : pet?.foodProductId,
          notes: notes.trim() || undefined,
        },
        pet?.id,
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
      <Field label="Especie">
        <Chips options={SPECIES.map((s) => ({ id: s.id, label: s.label }))} value={species} onChange={setSpecies} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Raza">
          <Input value={breed} onChange={(e) => setBreed(e.target.value)} />
        </Field>
        <Field label="Peso (kg)">
          <Input inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
        </Field>
      </div>
      <Field label="Fecha de nacimiento">
        <Input type="date" value={birth} onChange={(e) => setBirth(e.target.value)} />
      </Field>
      <Field label="Alimento que compran" hint='Es lo que manda a la lista el botón "Queda poca comida"'>
        <Input value={foodName} onChange={(e) => setFoodName(e.target.value)} placeholder="Royal Canin Medium Adult 15kg" />
      </Field>
      <Field label="Notas">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <Button type="submit" disabled={busy}>
        Guardar
      </Button>
      {pet && (
        <Button type="button" variant="ghost" className="text-danger" onClick={() => confirm('¿Eliminar la mascota?') && deletePet(household.id, pet.id).then(() => onDeleted?.())}>
          Eliminar
        </Button>
      )}
    </form>
  )
}
