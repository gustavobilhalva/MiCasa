import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import { ArrowLeft, Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { TopBar } from '../../components/layout/TopBar'
import { Input } from '../../components/ui/Input'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { db } from '../../lib/firebase'
import { Field } from '../finance/ui'

export function PreferencesPage() {
  const { household, members } = useRequiredHousehold()
  const excluded = household.settings.excludedIngredients ?? []
  const [text, setText] = useState('')
  const [surcharge, setSurcharge] = useState(String(household.settings.installmentSurchargePct ?? 0))
  const [split, setSplit] = useState<Record<string, string>>(
    Object.fromEntries(members.map((m) => [m.id, String(household.settings.defaultSplit?.[m.id] ?? Math.round(100 / members.length))])),
  )

  const ref = doc(db, 'households', household.id)

  const addExcluded = async (e: FormEvent) => {
    e.preventDefault()
    const v = text.trim().toLowerCase()
    if (!v || excluded.includes(v)) return
    await updateDoc(ref, { 'settings.excludedIngredients': [...excluded, v], updatedAt: serverTimestamp() })
    setText('')
  }

  const removeExcluded = (v: string) =>
    updateDoc(ref, { 'settings.excludedIngredients': excluded.filter((x) => x !== v), updatedAt: serverTimestamp() })

  const saveSurcharge = () =>
    updateDoc(ref, { 'settings.installmentSurchargePct': Number(surcharge.replace(',', '.')) || 0, updatedAt: serverTimestamp() })

  const splitTotal = Object.values(split).reduce((s, v) => s + (Number(v) || 0), 0)
  const saveSplit = () =>
    updateDoc(ref, {
      'settings.defaultSplit': Object.fromEntries(Object.entries(split).map(([k, v]) => [k, Number(v) || 0])),
      updatedAt: serverTimestamp(),
    })

  return (
    <>
      <TopBar
        title="Preferencias"
        right={
          <Link to="/mas" className="flex min-h-10 items-center gap-1 text-sm text-muted">
            <ArrowLeft size={16} /> Volver
          </Link>
        }
      />
      <main className="flex flex-col gap-6 px-4 py-4 pb-28">
        <section className="rounded-xl border border-line bg-card p-4">
          <h2 className="font-semibold">Ingredientes que no consumimos</h2>
          <p className="mb-3 text-sm text-muted">Los menús no los mandan a la lista y avisan si una receta los incluye.</p>
          <form onSubmit={addExcluded} className="flex gap-2">
            <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="cerdo, lactosa, maní…" />
            <button type="submit" aria-label="Agregar" className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
              <Plus size={22} />
            </button>
          </form>
          {excluded.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {excluded.map((v) => (
                <li key={v} className="flex items-center gap-1 rounded-full bg-warn/15 py-1 pl-3 pr-1 text-sm">
                  {v}
                  <button onClick={() => removeExcluded(v)} aria-label={`Quitar ${v}`} className="flex size-7 items-center justify-center rounded-full">
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-line bg-card p-4">
          <h2 className="font-semibold">Reparto de gastos por defecto</h2>
          <p className="mb-3 text-sm text-muted">Porcentaje que le corresponde a cada uno en el balance mensual.</p>
          <div className="flex flex-col gap-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <span className="size-3 rounded-full" style={{ backgroundColor: m.color }} />
                <span className="flex-1">{m.displayName}</span>
                <Input inputMode="numeric" value={split[m.id] ?? ''} onChange={(e) => setSplit({ ...split, [m.id]: e.target.value })} className="w-20 text-right" />
                <span className="text-muted">%</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className={`text-sm ${splitTotal === 100 ? 'text-muted' : 'text-danger'}`}>Total {splitTotal}%</span>
            <button onClick={saveSplit} disabled={splitTotal !== 100} className="min-h-10 rounded-xl bg-accent px-4 text-sm font-medium text-white disabled:opacity-40">
              Guardar
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-card p-4">
          <h2 className="font-semibold">Recargo por defecto en cuotas</h2>
          <p className="mb-3 text-sm text-muted">Porcentaje de impuestos o interés que se aplica al simular y cargar compras en cuotas.</p>
          <Field label="Recargo %">
            <div className="flex gap-2">
              <Input inputMode="decimal" value={surcharge} onChange={(e) => setSurcharge(e.target.value)} className="w-28" />
              <button onClick={saveSurcharge} className="min-h-12 rounded-xl bg-accent px-4 text-sm font-medium text-white">
                Guardar
              </button>
            </div>
          </Field>
        </section>
      </main>
    </>
  )
}
