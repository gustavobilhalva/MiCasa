import { Plus } from 'lucide-react'
import { useMemo, useRef, useState, type FormEvent } from 'react'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { normalize } from '../../lib/text'
import type { Product } from '../../types'
import { addItem } from './api'
import { parseItemText } from './parseItem'
import { useProducts } from './hooks'

export function AddItemBar() {
  const { household, user, storeSectors } = useRequiredHousehold()
  const { data: products } = useProducts()
  const [text, setText] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const trimmed = text.trim()
  const parsed = useMemo(() => parseItemText(trimmed), [trimmed])
  const normalized = normalize(parsed.name)

  const suggestions = useMemo(() => {
    if (normalized.length < 2) return []
    return products.filter((p) => p.nameNormalized.includes(normalized)).slice(0, 5)
  }, [products, normalized])

  const exactMatch = suggestions.find((p) => p.nameNormalized === normalized)
  const needsCategory = trimmed.length > 0 && !exactMatch && !categoryId
  const sectorName = (id: string) => storeSectors.find((s) => s.id === id)?.name ?? 'Otros'

  const submit = async (product?: Product) => {
    if (!trimmed && !product) return
    const target = product ?? exactMatch
    const storeCategoryId = target?.storeCategoryId ?? categoryId
    if (!storeCategoryId) return
    setBusy(true)
    try {
      await addItem({
        householdId: household.id,
        uid: user.uid,
        name: target?.name ?? parsed.name,
        qty: parsed.qty ?? target?.defaultQty,
        storeCategoryId,
        product: target,
      })
      setText('')
      setCategoryId(null)
      inputRef.current?.focus()
    } finally {
      setBusy(false)
    }
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    submit()
  }

  return (
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
          disabled={busy || !trimmed || needsCategory}
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
              <button
                type="button"
                onClick={() => submit(p)}
                className="min-h-10 rounded-full border border-line bg-card px-3 text-sm"
              >
                {p.name} <span className="text-muted">· {sectorName(p.storeCategoryId)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {needsCategory && (
        <div className="mt-2">
          <p className="mb-1.5 text-xs text-muted">¿En qué sector va "{parsed.name}"?</p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {storeSectors.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  setCategoryId(s.id)
                  inputRef.current?.focus()
                }}
                className="min-h-10 shrink-0 rounded-full border border-line bg-card px-3 text-sm"
              >
                {s.icon} {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {categoryId && trimmed && !exactMatch && (
        <p className="mt-2 text-xs text-muted">
          Se guardará en <strong>{sectorName(categoryId)}</strong>.{' '}
          <button type="button" className="underline" onClick={() => setCategoryId(null)}>
            Cambiar
          </button>
        </p>
      )}
    </form>
  )
}
