import { useMemo, useState, type FormEvent } from 'react'
import { Sheet } from '../../components/layout/Sheet'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { guessStoreSector } from '../../lib/categorize'
import { Field } from '../finance/ui'
import { addItem } from './api'

export interface NewProductDraft {
  name: string
  qty?: string
}

export function NewProductSheet({ draft, onClose, onAdded }: { draft: NewProductDraft | null; onClose: () => void; onAdded: () => void }) {
  return (
    <Sheet open={draft !== null} onClose={onClose} title="Producto nuevo">
      {draft && <NewProductForm key={draft.name} draft={draft} onAdded={onAdded} />}
    </Sheet>
  )
}

function NewProductForm({ draft, onAdded }: { draft: NewProductDraft; onAdded: () => void }) {
  const { household, user, storeSectors } = useRequiredHousehold()
  const guessed = useMemo(() => guessStoreSector(draft.name, storeSectors), [draft.name, storeSectors])
  const fallback = storeSectors.find((s) => s.name === 'Otros') ?? storeSectors[storeSectors.length - 1]
  const [name, setName] = useState(draft.name)
  const [qty, setQty] = useState(draft.qty ?? '')
  const [sectorId, setSectorId] = useState<string | null>(guessed?.id ?? null)
  const [brand, setBrand] = useState('')
  const [notes, setNotes] = useState('')
  const [remember, setRemember] = useState(false)
  const [busy, setBusy] = useState(false)

  const liveGuess = useMemo(() => (name !== draft.name ? guessStoreSector(name, storeSectors) : guessed), [name, draft.name, storeSectors, guessed])
  const effectiveSector = sectorId ?? liveGuess?.id ?? fallback?.id ?? null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !effectiveSector) return
    setBusy(true)
    try {
      await addItem({
        householdId: household.id,
        uid: user.uid,
        name: name.trim(),
        qty: qty.trim() || undefined,
        storeCategoryId: effectiveSector,
        preferredBrand: brand.trim() || undefined,
        notes: notes.trim() || undefined,
        defaultQty: remember && qty.trim() ? qty.trim() : undefined,
      })
      onAdded()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <Field label="Producto">
          <Input value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        </Field>
        <Field label="Cantidad">
          <Input value={qty} onChange={(e) => setQty(e.target.value)} placeholder="x2, 1kg" className="w-24" />
        </Field>
      </div>

      <Field label="Sector" hint={liveGuess && !sectorId ? `Sugerido: ${liveGuess.icon ?? ''} ${liveGuess.name}` : undefined}>
        <div className="flex flex-wrap gap-2">
          {storeSectors.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSectorId(s.id)}
              className={`min-h-10 rounded-full border px-3 text-sm ${s.id === effectiveSector ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-card'}`}
            >
              {s.icon} {s.name}
            </button>
          ))}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Marca preferida">
          <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Opcional" />
        </Field>
        <Field label="Notas">
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="El de 1L…" />
        </Field>
      </div>

      {qty.trim() && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-5 accent-accent" />
          Recordar "{qty.trim()}" como cantidad habitual
        </label>
      )}

      <Button type="submit" disabled={busy || !effectiveSector}>
        Agregar a la lista
      </Button>
    </form>
  )
}
