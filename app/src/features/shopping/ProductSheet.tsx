import { useState, type FormEvent } from 'react'
import { Sheet } from '../../components/layout/Sheet'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import type { Product } from '../../types'
import { deleteProduct, updateProduct } from './api'

interface Props {
  product: Product | null
  onClose: () => void
}

export function ProductSheet({ product, onClose }: Props) {
  return (
    <Sheet open={product !== null} onClose={onClose} title={product?.name ?? ''}>
      {product && <ProductForm key={product.id} product={product} onClose={onClose} />}
    </Sheet>
  )
}

function ProductForm({ product, onClose }: { product: Product; onClose: () => void }) {
  const { household, storeSectors } = useRequiredHousehold()
  const [name, setName] = useState(product.name)
  const [storeCategoryId, setStoreCategoryId] = useState(product.storeCategoryId)
  const [preferredBrand, setPreferredBrand] = useState(product.preferredBrand ?? '')
  const [avoidBrands, setAvoidBrands] = useState((product.avoidBrands ?? []).join(', '))
  const [defaultQty, setDefaultQty] = useState(product.defaultQty ?? '')
  const [notes, setNotes] = useState(product.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      await updateProduct(household.id, product.id, {
        name: name.trim(),
        storeCategoryId,
        preferredBrand: preferredBrand.trim() || undefined,
        avoidBrands: avoidBrands
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        defaultQty: defaultQty.trim() || undefined,
        notes: notes.trim() || undefined,
      })
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await deleteProduct(household.id, product.id)
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <Field label="Nombre">
        <Input value={name} onChange={(e) => setName(e.target.value)} required />
      </Field>

      <Field label="Sector">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {storeSectors.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStoreCategoryId(s.id)}
              className={`min-h-10 shrink-0 rounded-full border px-3 text-sm ${
                s.id === storeCategoryId ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-card'
              }`}
            >
              {s.icon} {s.name}
            </button>
          ))}
        </div>
      </Field>

      <Field label="Marca preferida" hint="Se muestra junto al producto en la lista">
        <Input value={preferredBrand} onChange={(e) => setPreferredBrand(e.target.value)} placeholder="La Serenísima" />
      </Field>

      <Field label="Marcas a evitar" hint="Separadas por coma">
        <Input value={avoidBrands} onChange={(e) => setAvoidBrands(e.target.value)} placeholder="Marca X, Marca Y" />
      </Field>

      <Field label="Cantidad habitual">
        <Input value={defaultQty} onChange={(e) => setDefaultQty(e.target.value)} placeholder="x2, 1kg, 1L" />
      </Field>

      <Field label="Notas">
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="El de 1L, no el de 900ml"
          className="w-full rounded-xl border border-line bg-card px-4 py-3 text-base placeholder:text-muted focus:border-accent focus:outline-none"
        />
      </Field>

      <p className="text-xs text-muted">
        Comprado {product.timesPurchased} {product.timesPurchased === 1 ? 'vez' : 'veces'}.
      </p>

      <Button type="submit" disabled={busy}>
        Guardar
      </Button>

      {!confirmDelete ? (
        <Button type="button" variant="ghost" className="text-danger" onClick={() => setConfirmDelete(true)}>
          Eliminar del catálogo
        </Button>
      ) : (
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={() => setConfirmDelete(false)}>
            Cancelar
          </Button>
          <Button type="button" variant="danger" className="flex-1" disabled={busy} onClick={remove}>
            Sí, eliminar
          </Button>
        </div>
      )}
    </form>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-muted">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  )
}
