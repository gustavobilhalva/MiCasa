import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { ArrowDown, ArrowLeft, ArrowUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TopBar } from '../../components/layout/TopBar'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { db } from '../../lib/firebase'

export function SectorsPage() {
  const { household, storeSectors } = useRequiredHousehold()
  const [order, setOrder] = useState(storeSectors.map((s) => s.id))
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!dirty) setOrder(storeSectors.map((s) => s.id))
  }, [storeSectors, dirty])

  const byId = new Map(storeSectors.map((s) => [s.id, s]))

  const move = (index: number, delta: number) => {
    const next = [...order]
    const target = index + delta
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setOrder(next)
    setDirty(true)
  }

  const save = async () => {
    setSaving(true)
    try {
      await updateDoc(doc(db, 'households', household.id), {
        'settings.storeSectorOrder': order,
        updatedAt: serverTimestamp(),
      })
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <TopBar
        title="Orden de recorrido"
        right={
          <Link to="/mas" className="flex min-h-10 items-center gap-1 text-sm text-muted">
            <ArrowLeft size={16} /> Volver
          </Link>
        }
      />
      <main className="px-4 py-4">
        <p className="mb-4 text-sm text-muted">
          Ordená los sectores como los recorrés en tu súper. La lista se agrupa en este orden.
        </p>
        <ul className="divide-y divide-line rounded-xl border border-line bg-card">
          {order.map((id, i) => {
            const s = byId.get(id)
            if (!s) return null
            return (
              <li key={id} className="flex min-h-14 items-center gap-2 px-3">
                <span className="w-6 text-center text-sm text-muted">{i + 1}</span>
                <span className="flex-1">
                  {s.icon} {s.name}
                </span>
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Subir ${s.name}`}
                  className="flex size-11 items-center justify-center text-muted disabled:opacity-30"
                >
                  <ArrowUp size={20} />
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === order.length - 1}
                  aria-label={`Bajar ${s.name}`}
                  className="flex size-11 items-center justify-center text-muted disabled:opacity-30"
                >
                  <ArrowDown size={20} />
                </button>
              </li>
            )
          })}
        </ul>
        {dirty && (
          <div className="sticky bottom-4 mt-4">
            <button
              onClick={save}
              disabled={saving}
              className="min-h-12 w-full rounded-xl bg-accent font-medium text-white shadow-lg disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Guardar orden'}
            </button>
          </div>
        )}
      </main>
    </>
  )
}
