import { Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Sheet } from '../../components/layout/Sheet'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { fmtDate, fromInputDate, money, parseAmount, toInputDate } from '../../lib/format'
import type { Income } from '../../types'
import { addIncome, deleteIncome } from './api'
import { CategoryPicker, categoryLabel } from './CategoryPicker'
import { AmountInput, Field, MemberDot, MemberPicker } from './ui'

export function IncomeTab({ incomes, loading, onEdit }: { incomes: Income[]; loading: boolean; onEdit: (i: Income) => void }) {
  const { household, incomeCategories, members } = useRequiredHousehold()
  const catById = useMemo(() => new Map(incomeCategories.map((c) => [c.id, c])), [incomeCategories])
  const total = incomes.reduce((s, i) => s + i.amount, 0)
  const byMember = members.map((m) => ({ m, total: incomes.filter((i) => i.byUid === m.id).reduce((s, i) => s + i.amount, 0) }))

  return (
    <div className="pb-28">
      <div className="mx-4 mb-3 rounded-xl border border-line bg-card p-4">
        <p className="text-sm text-muted">Ingresos del mes</p>
        <p className="text-3xl font-semibold text-ok">{money(total)}</p>
        {members.length > 1 && (
          <div className="mt-2 flex gap-4 text-sm">
            {byMember.map(({ m, total }) => (
              <span key={m.id} className="flex items-center gap-1.5">
                <MemberDot uid={m.id} /> {money(total)}
              </span>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <p className="p-6 text-center text-muted">Cargando…</p>
      ) : incomes.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-muted">Sin ingresos cargados este mes. Tocá + y elegí "Ingreso".</p>
      ) : (
        <ul className="divide-y divide-line bg-card">
          {incomes.map((i) => {
            const cat = catById.get(i.categoryId)
            return (
              <li key={i.id} className="flex min-h-14 items-center gap-3 px-4">
                <span className="text-xl">{cat?.icon ?? '💰'}</span>
                <button onClick={() => onEdit(i)} className="flex-1 py-2 text-left">
                  <p>
                    {categoryLabel(cat)}
                    {i.note && <span className="ml-2 text-sm text-muted">{i.note}</span>}
                  </p>
                  <p className="text-xs text-muted">{fmtDate(i.date.toDate(), 'd MMM')}</p>
                </button>
                <span className="font-medium text-ok">+{money(i.amount)}</span>
                <MemberDot uid={i.byUid} />
                <button
                  onClick={() => confirm('¿Eliminar este ingreso?') && deleteIncome(household.id, i.id)}
                  aria-label="Eliminar ingreso"
                  className="flex size-10 items-center justify-center text-muted"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

export function IncomeSheet({ open, onClose, income }: { open: boolean; onClose: () => void; income?: Income | null }) {
  return (
    <Sheet open={open} onClose={onClose} title={income ? 'Editar ingreso' : 'Cargar ingreso'}>
      {open && <IncomeForm key={income?.id ?? 'new'} income={income ?? null} onClose={onClose} />}
    </Sheet>
  )
}

function IncomeForm({ income, onClose }: { income: Income | null; onClose: () => void }) {
  const { household, user, incomeCategories } = useRequiredHousehold()
  const [amount, setAmount] = useState(income ? String(income.amount) : '')
  const [categoryId, setCategoryId] = useState<string | null>(income?.categoryId ?? null)
  const [byUid, setByUid] = useState<string | null>(income?.byUid ?? user.uid)
  const [date, setDate] = useState(toInputDate(income?.date.toDate() ?? new Date()))
  const [note, setNote] = useState(income?.note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const n = parseAmount(amount)
    if (!n || n <= 0) return setError('Ingresá un monto.')
    if (!categoryId) return setError('Elegí una categoría.')
    if (!byUid) return setError('¿De quién es el ingreso?')
    setBusy(true)
    setError(null)
    try {
      await addIncome(household.id, user.uid, { amount: n, categoryId, byUid, date: fromInputDate(date), note: note.trim() || undefined }, income?.id)
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <AmountInput value={amount} onChange={setAmount} autoFocus />
      <Field label="Categoría">
        <CategoryPicker categories={incomeCategories} value={categoryId} onChange={setCategoryId} />
      </Field>
      <Field label="De quién">
        <MemberPicker value={byUid} onChange={setByUid} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Fecha">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Nota">
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />
        </Field>
      </div>
      {error && <p className="text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={busy}>
        {busy ? 'Guardando…' : income ? 'Guardar cambios' : 'Guardar ingreso'}
      </Button>
    </form>
  )
}
