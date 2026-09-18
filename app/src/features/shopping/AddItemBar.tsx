import { Plus } from 'lucide-react'
import { useMemo, useRef, useState, type FormEvent } from 'react'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { normalize } from '../../lib/text'
import type { Product } from '../../types'
import { addItem } from './api'
import { useProducts } from './hooks'
import { NewProductSheet, type NewProductDraft } from './NewProductSheet'
import { parseItemText } from './parseItem'

export function AddItemBar() {
  const { household, user, storeSectors } = useRequiredHousehold()
  const { data: products } = useProducts()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [draft, setDraft] = useState<NewProductDraft | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const trimmed = text.trim()
  const parsed = useMemo(() => parseItemText(trimmed), [trimmed])
  const normalized = normalize(parsed.name)

  const suggestions = useMemo(() => {
    if (normalized.length < 2) return []
    return products.filter((p) => p.nameNormalized.includes(normalized)).slice(0, 5)
  }, [products, normalized])

  const exactMatch = suggestions.find((p) => p.nameNormalized === normalized)
  const sectorName = (id: string) => storeSectors.find((s) => s.id === id)?.name ?? 'Otros'

  const reset = () => {
    setText('')
    setDraft(null)
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
      reset()
    } finally {
      setBusy(false)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!trimmed) return
    if (exactMatch) addKnown(exactMatch)
    else setDraft({ name: parsed.name, qty: parsed.qty })
  }

  return (
    <>
      <form onSubmit={onSubmit} className="sticky top-14 z-10 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Agregar… (ej: leche x2)"
            enterKeyHint="done"
            autoComplete="off"
            className="min-h-12 flex-1 rounded-xl border border-line bg-card px-4 text-base placeholder:text-muted focus:border-accent focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy || !trimmed}
            aria-label="Agregar"
            className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-white disabled:opacity-40"
          >
            <Plus size={24} />
          </button>
        </div>

        {suggestions.length > 0 && !exactMatch && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => addKnown(p)} className="min-h-10 rounded-full border border-line bg-card px-3 text-sm">
                  {p.name} <span className="text-muted">· {sectorName(p.storeCategoryId)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {trimmed && !exactMatch && (
          <p className="mt-2 text-xs text-muted">
            "{parsed.name}" es nuevo: tocá + para elegir sector, cantidad y marca.
          </p>
        )}
      </form>

      <NewProductSheet draft={draft} onClose={() => setDraft(null)} onAdded={reset} />
    </>
  )
}
