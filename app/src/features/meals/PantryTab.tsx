import { differenceInCalendarDays } from 'date-fns'
import { Plus, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Sheet } from '../../components/layout/Sheet'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { INVENTORY_LOCATIONS } from '../../lib/defaults'
import { fmtDate, fromInputDate, toInputDate } from '../../lib/format'
import type { InventoryItem } from '../../types'
import { Chips, Field } from '../finance/ui'
import { parseItemText } from '../shopping/parseItem'
import { deleteInventoryItem, saveInventoryItem } from './api'
import { useInventory } from './hooks'

export function PantryTab() {
  const { household } = useRequiredHousehold()
  const { data: items } = useInventory()
  const [editing, setEditing] = useState<InventoryItem | null | 'new'>(null)

  const grouped = useMemo(() => {
    const today = new Date()
    const withDays = items.map((i) => ({ item: i, days: i.expiresAt ? differenceInCalendarDays(i.expiresAt.toDate(), today) : null }))
    const soon = withDays.filter((x) => x.days !== null && x.days <= 3).sort((a, b) => a.days! - b.days!)
    const rest = withDays.filter((x) => x.days === null || x.days > 3)
    return { soon, rest }
  }, [items])

  const Row = ({ item, days }: { item: InventoryItem; days: number | null }) => (
    <li className="flex min-h-12 items-center gap-3 px-4">
      <button onClick={() => setEditing(item)} className="flex-1 py-2 text-left">
        <p>
          {item.name}
          {item.qty && <span className="ml-2 text-sm text-muted">{item.qty}</span>}
        </p>
        <p className={`text-xs ${days !== null && days < 0 ? 'text-danger' : days !== null && days <= 3 ? 'text-warn' : 'text-muted'}`}>
          {INVENTORY_LOCATIONS.find((l) => l.id === item.location)?.label}
          {item.expiresAt && ` · ${days! < 0 ? 'vencido' : days === 0 ? 'vence hoy' : `vence ${fmtDate(item.expiresAt.toDate())}`}`}
        </p>
      </button>
      <button onClick={() => deleteInventoryItem(household.id, item.id)} aria-label={`Quitar ${item.name}`} className="flex size-10 items-center justify-center text-muted">
        <Trash2 size={16} />
      </button>
    </li>
  )

  return (
    <div className="pb-28">
      {items.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-muted">
          Anotá lo que tenés en casa con su vencimiento. Los menús lo usan para no repetir compras.
        </p>
      ) : (
        <>
          {grouped.soon.length > 0 && (
            <section>
              <h2 className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-warn">Cociná esto primero</h2>
              <ul className="divide-y divide-line bg-card">
                {grouped.soon.map((x) => (
                  <Row key={x.item.id} {...x} />
                ))}
              </ul>
            </section>
          )}
          <section>
            <h2 className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">En casa</h2>
            <ul className="divide-y divide-line bg-card">
              {grouped.rest.map((x) => (
                <Row key={x.item.id} {...x} />
              ))}
            </ul>
          </section>
        </>
      )}

      <button
        onClick={() => setEditing('new')}
        aria-label="Agregar a despensa"
        className="fixed bottom-20 right-4 z-20 flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-lg md:bottom-8"
      >
        <Plus size={28} />
      </button>

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === 'new' ? 'Agregar a despensa' : 'Editar'}>
        {editing !== null && <PantryForm key={editing === 'new' ? 'new' : editing.id} item={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
      </Sheet>
    </div>
  )
}

function PantryForm({ item, onClose }: { item: InventoryItem | null; onClose: () => void }) {
  const { household, user } = useRequiredHousehold()
  const [text, setText] = useState(item ? `${item.name}${item.qty ? ' ' + item.qty : ''}` : '')
  const [location, setLocation] = useState<InventoryItem['location']>(item?.location ?? 'pantry')
  const [expires, setExpires] = useState(item?.expiresAt ? toInputDate(item.expiresAt.toDate()) : '')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const parsed = parseItemText(text)
    if (!parsed.name) return
    setBusy(true)
    try {
      await saveInventoryItem(
        household.id,
        user.uid,
        { name: parsed.name, qty: parsed.qty, productId: item?.productId, location, expiresAt: expires ? fromInputDate(expires) : undefined },
        item?.id,
      )
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Producto" hint='Podés poner cantidad: "arroz 2kg"'>
        <Input value={text} onChange={(e) => setText(e.target.value)} required autoFocus />
      </Field>
      <Field label="Dónde">
        <Chips options={INVENTORY_LOCATIONS as { id: InventoryItem['location']; label: string }[]} value={location} onChange={setLocation} />
      </Field>
      <Field label="Vence (opcional)">
        <Input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
      </Field>
      <Button type="submit" disabled={busy}>
        Guardar
      </Button>
    </form>
  )
}
