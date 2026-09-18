import { useMemo, useState } from 'react'
import { Sheet } from '../../components/layout/Sheet'
import { Button } from '../../components/ui/Button'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { money, parseAmount } from '../../lib/format'
import type { Category, Expense } from '../../types'
import { setBudgetLimit } from './api'
import { useBudget } from './hooks'
import { AmountInput, ProgressBar } from './ui'

export function BudgetTab({ month, expenses }: { month: string; expenses: Expense[] }) {
  const { household, expenseCategories } = useRequiredHousehold()
  const budget = useBudget(month)
  const [editing, setEditing] = useState<Category | null>(null)
  const [value, setValue] = useState('')

  const spentByCat = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of expenses) if (!e.settlement) map.set(e.categoryId, (map.get(e.categoryId) ?? 0) + e.amount)
    return map
  }, [expenses])

  const rows = expenseCategories
    .filter((c) => c.name !== 'Ajuste entre nosotros')
    .map((c) => ({ cat: c, spent: spentByCat.get(c.id) ?? 0, limit: budget?.limits?.[c.id] }))
    .sort((a, b) => (b.limit ? 1 : 0) - (a.limit ? 1 : 0) || b.spent - a.spent)

  const totalLimit = rows.reduce((s, r) => s + (r.limit ?? 0), 0)
  const totalSpentBudgeted = rows.filter((r) => r.limit).reduce((s, r) => s + r.spent, 0)

  const open = (cat: Category, limit?: number) => {
    setEditing(cat)
    setValue(limit ? String(limit) : '')
  }

  const save = async () => {
    if (!editing) return
    const n = value.trim() ? parseAmount(value) : null
    await setBudgetLimit(household.id, month, editing.id, n && n > 0 ? n : null)
    setEditing(null)
  }

  return (
    <div className="pb-28">
      {totalLimit > 0 && (
        <div className="mx-4 mb-3 rounded-xl border border-line bg-card p-4">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-muted">Presupuestado</span>
            <span>
              {money(totalSpentBudgeted)} / {money(totalLimit)}
            </span>
          </div>
          <ProgressBar value={totalSpentBudgeted} max={totalLimit} />
        </div>
      )}
      <p className="px-4 pb-2 text-xs text-muted">Tocá una categoría para ponerle un tope mensual.</p>
      <ul className="divide-y divide-line bg-card">
        {rows.map(({ cat, spent, limit }) => (
          <li key={cat.id}>
            <button onClick={() => open(cat, limit)} className="flex w-full flex-col gap-1.5 px-4 py-3 text-left">
              <div className="flex items-center gap-2">
                <span>{cat.icon}</span>
                <span className="flex-1">{cat.name}</span>
                <span className={`text-sm ${limit && spent > limit ? 'font-semibold text-danger' : ''}`}>
                  {money(spent)}
                  {limit && <span className="text-muted"> / {money(limit)}</span>}
                </span>
              </div>
              {limit ? <ProgressBar value={spent} max={limit} /> : null}
            </button>
          </li>
        ))}
      </ul>

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing ? `Tope · ${editing.name}` : ''}>
        <div className="flex flex-col gap-4">
          <AmountInput value={value} onChange={setValue} autoFocus />
          <p className="text-xs text-muted">Dejalo vacío para quitar el tope. Aplica solo a este mes.</p>
          <Button onClick={save}>Guardar</Button>
        </div>
      </Sheet>
    </div>
  )
}
