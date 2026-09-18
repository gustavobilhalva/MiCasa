import { Check, Plus } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Sheet } from '../../components/layout/Sheet'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { guessStoreSector } from '../../lib/categorize'
import { normalize } from '../../lib/text'
import type { Product } from '../../types'
import { Field } from '../finance/ui'
import { addItem } from './api'
import { useProducts } from './hooks'
import { parseItemText } from './parseItem'

export function AddItemSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Agregar a la lista">
      {open && <AddItemForm />}
    </Sheet>
  )
}

function AddItemForm() {
  const { household, user, storeSectors } = useRequiredHousehold()
  const { data: products } = useProducts()
  const [text, setText] = useState('')
  const [sectorId, setSectorId] = useState<string | null>(null)
  const [brand, setBrand] = useState('')
  const [notes, setNotes] = useState('')
  const [remember, setRemember] = useState(false)
  const [busy, setBusy] = useState(false)
  const [added, setAdded] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const trimmed = text.trim()
  const parsed = useMemo(() => parseItemText(trimmed), [trimmed])
  const normalized = normalize(parsed.name)

  const suggestions = useMemo(() => {
    if (normalized.length < 2) return []
    return products.filter((p) => p.nameNormalized.includes(normalized)).slice(0, 6)
  }, [products, normalized])
  const exactMatch = suggestions.find((p) => p.nameNormalized === normalized)
  const isNew = trimmed.length > 0 && !exactMatch

  const guessed = useMemo(() => (isNew ? guessStoreSector(parsed.name, storeSectors) : null), [isNew, parsed.name, storeSectors])
  const fallback = storeSectors.find((s) => normalize(s.name) === 'otros') ?? storeSectors[storeSectors.length - 1]
  const effectiveSector = sectorId ?? guessed?.id ?? fallback?.id ?? null
  const sectorName = (id: string) => storeSectors.find((s) => s.id === id)?.name ?? 'Otros'

  useEffect(() => {
    if (!added) return
    const t = setTimeout(() => setAdded(null), 2000)
    return () => clearTimeout(t)
  }, [added])

  const reset = (label: string) => {
    setText('')
    setSectorId(null)
    setBrand('')
    setNotes('')
    setRemember(false)
    setAdded(label)
    inputRef.current?.focus()
  }

  const addKnown = async (product: Product) => {
    setBusy(true)
    try {
      await addItem({
        householdId: household.id,
        uid: user.uid,
        name: product.name,
        qty: parsed.qty ?? product.defaultQty,
        storeCategoryId: product.storeCategoryId,
        product,
      })
      reset(product.name)
    } finally {
      setBusy(false)
    }
  }

  const addNew = async () => {
    if (!effectiveSector) return
    setBusy(true)
    try {
      await addItem({
        householdId: household.id,
        uid: user.uid,
        name: parsed.name,
        qty: parsed.qty,
        storeCategoryId: effectiveSector,
        preferredBrand: brand.trim() || undefined,
        notes: notes.trim() || undefined,
        defaultQty: remember && parsed.qty ? parsed.qty : undefined,
      })
      reset(parsed.name)
    } finally {
      setBusy(false)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!trimmed || busy) return
    if (exactMatch) addKnown(exactMatch)
    else addNew()
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Input
          ref={inputRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setSectorId(null)
          }}
          placeholder="Producto y cantidad (ej: leche x2)"
          enterKeyHint="done"
          autoComplete="off"
          autoFocus
        />
        <button type="submit" disabled={busy || !trimmed} aria-label="Agregar" className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-white disabled:opacity-40">
          <Plus size={24} />
        </button>
      </div>

      {added && (
        <p className="flex items-center gap-2 rounded-xl bg-ok/15 px-3 py-2 text-sm text-ok">
          <Check size={16} /> {added} agregado. Podés seguir cargando.
        </p>
      )}

      {suggestions.length > 0 && !exactMatch && (
        <div>
          <p className="mb-1.5 text-xs text-muted">Del catálogo</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((p) => (
              <button key={p.id} type="button" onClick={() => addKnown(p)} className="min-h-10 rounded-full border border-line bg-card px-3 text-sm">
                {p.name} <span className="text-muted">· {sectorName(p.storeCategoryId)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {exactMatch && (
        <p className="text-sm text-muted">
          Ya está en el catálogo ({sectorName(exactMatch.storeCategoryId)}
          {exactMatch.preferredBrand ? ` · ${exactMatch.preferredBrand}` : ''}). Tocá + para agregarlo.
        </p>
      )}

      {isNew && (
        <>
          <Field label="Sector" hint={guessed && !sectorId ? `Sugerido: ${guessed.icon ?? ''} ${guessed.name}` : undefined}>
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
          {parsed.qty && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-5 accent-accent" />
              Recordar "{parsed.qty}" como cantidad habitual
            </label>
          )}
          <Button type="submit" disabled={busy || !effectiveSector}>
            Agregar {parsed.name}
            {parsed.qty ? ` (${parsed.qty})` : ''}
          </Button>
        </>
      )}
    </form>
  )
}
