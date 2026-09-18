import { ChevronDown, ChevronRight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { PAYMENT_METHODS } from '../../lib/defaults'
import { fmtDate, money } from '../../lib/format'
import type { Category, Expense } from '../../types'
import { MemberDot } from './ui'

interface SubRow {
  key: string
  name: string
  total: number
  items: Expense[]
}
interface GroupRow {
  key: string
  name: string
  icon?: string
  total: number
  subs: SubRow[]
}

export function ExpensesByCategory({ expenses, total, onEdit }: { expenses: Expense[]; total: number; onEdit: (e: Expense) => void }) {
  const { expenseCategories } = useRequiredHousehold()
  const catById = useMemo(() => new Map(expenseCategories.map((c) => [c.id, c])), [expenseCategories])
  const [open, setOpen] = useState<Set<string>>(new Set())

  const groups = useMemo(() => {
    const map = new Map<string, GroupRow>()
    for (const e of expenses) {
      if (e.settlement) continue
      const c: Category | undefined = catById.get(e.categoryId)
      const gKey = c?.groupKey ?? (c?.legacy ? 'legacy' : 'sin')
      const gName = c?.group ?? (c?.legacy ? 'Otras (categorías anteriores)' : 'Sin categoría')
      if (!map.has(gKey)) map.set(gKey, { key: gKey, name: gName, icon: c?.icon, total: 0, subs: [] })
      const g = map.get(gKey)!
      g.total += e.amount
      const sKey = c?.id ?? 'sin'
      let s = g.subs.find((x) => x.key === sKey)
      if (!s) {
        s = { key: sKey, name: c?.name ?? 'Sin categoría', total: 0, items: [] }
        g.subs.push(s)
      }
      s.total += e.amount
      s.items.push(e)
    }
    for (const g of map.values()) {
      g.subs.sort((a, b) => b.total - a.total)
      for (const s of g.subs) s.items.sort((a, b) => b.date.toMillis() - a.date.toMillis())
    }
    return [...map.values()].sort((a, b) => b.total - a.total)
  }, [expenses, catById])

  const toggle = (k: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })

  const methodLabel = (id: string) => PAYMENT_METHODS.find((m) => m.id === id)?.label ?? id

  if (groups.length === 0) return <p className="px-6 py-12 text-center text-sm text-muted">Sin gastos este mes. Tocá + para cargar el primero.</p>

  return (
    <div className="flex flex-col gap-3 px-4">
      {groups.map((g) => (
        <section key={g.key} className="overflow-hidden rounded-xl border border-line bg-card">
          <div className="flex items-center justify-between bg-surface px-4 py-2.5">
            <span className="font-semibold">
              {g.icon} {g.name}
            </span>
            <span className="text-sm">
              <span className="text-muted">Total al mes: </span>
              <strong>{money(g.total)}</strong>
              <span className="ml-2 text-xs text-muted">{Math.round((g.total / total) * 100)}%</span>
            </span>
          </div>
          <ul className="divide-y divide-line">
            {g.subs.map((s) => {
              const isOpen = open.has(s.key)
              return (
                <li key={s.key}>
                  <button onClick={() => toggle(s.key)} className="flex min-h-11 w-full items-center gap-2 px-4 text-left text-sm">
                    {isOpen ? <ChevronDown size={16} className="text-muted" /> : <ChevronRight size={16} className="text-muted" />}
                    <span className="flex-1">
                      {s.name}
                      {s.items.length > 1 && <span className="ml-1 text-xs text-muted">×{s.items.length}</span>}
                    </span>
                    <span className="font-medium">{money(s.total)}</span>
                  </button>
                  {isOpen && (
                    <ul className="divide-y divide-line border-t border-line bg-surface/50">
                      {s.items.map((e) => (
                        <li key={e.id}>
                          <button onClick={() => onEdit(e)} className="flex min-h-11 w-full items-center gap-3 py-1.5 pl-10 pr-4 text-left text-sm">
                            <span className="flex-1">
                              <span>{e.note ?? s.name}</span>
                              <span className="block text-xs text-muted">
                                {fmtDate(e.date.toDate(), 'd MMM')} · {e.imported ? 'Planilla' : methodLabel(e.method)}
                                {e.installments && ` · ${e.installments.count} cuotas`}
                              </span>
                            </span>
                            <span>{money(e.amount)}</span>
                            <MemberDot uid={e.paidBy} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      <div className="flex items-center justify-between rounded-xl border-2 border-accent/40 bg-card px-4 py-3">
        <span className="font-semibold">Total del mes</span>
        <span className="text-xl font-semibold">{money(total)}</span>
      </div>
    </div>
  )
}
