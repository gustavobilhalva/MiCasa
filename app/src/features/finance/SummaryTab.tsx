import { useMemo } from 'react'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { money, monthKey, monthLabel } from '../../lib/format'
import type { Expense, Income } from '../../types'
import { useExpensesYear, useIncomesYear } from './hooks'
import { ProgressBar } from './ui'

export function SummaryTab({ month, expenses, incomes, pendingEstimate = 0, pendingCount = 0 }: { month: string; expenses: Expense[]; incomes: Income[]; pendingEstimate?: number; pendingCount?: number }) {
  const { expenseCategories } = useRequiredHousehold()
  const year = Number(month.split('-')[0])
  const { data: yearExpenses } = useExpensesYear(year)
  const { data: yearIncomes } = useIncomesYear(year)

  const monthIncome = incomes.reduce((s, i) => s + i.amount, 0)
  const monthExpense = expenses.filter((e) => !e.settlement).reduce((s, e) => s + e.amount, 0)
  const net = monthIncome - monthExpense
  const savingsPct = monthIncome > 0 ? (net / monthIncome) * 100 : 0

  const catById = useMemo(() => new Map(expenseCategories.map((c) => [c.id, c])), [expenseCategories])
  const byGroup = useMemo(() => {
    const map = new Map<string, { name: string; icon?: string; total: number }>()
    for (const e of expenses) {
      if (e.settlement) continue
      const c = catById.get(e.categoryId)
      const key = c?.groupKey ?? c?.group ?? c?.name ?? 'otros'
      const cur = map.get(key) ?? { name: c?.group ?? c?.name ?? 'Sin categoría', icon: c?.icon, total: 0 }
      cur.total += e.amount
      map.set(key, cur)
    }
    return [...map.values()].sort((a, b) => b.total - a.total)
  }, [expenses, catById])
  const maxGroup = Math.max(1, ...byGroup.map((g) => g.total))

  const rows = useMemo(() => {
    const inc = new Array(12).fill(0)
    const exp = new Array(12).fill(0)
    for (const i of yearIncomes) inc[i.date.toDate().getMonth()] += i.amount
    for (const e of yearExpenses) if (!e.settlement) exp[e.date.toDate().getMonth()] += e.amount
    let balance = 0
    return Array.from({ length: 12 }, (_, m) => {
      const n = inc[m] - exp[m]
      balance += n
      return { key: monthKey(new Date(year, m, 1)), inc: inc[m], exp: exp[m], net: n, balance, hasData: inc[m] > 0 || exp[m] > 0 }
    })
  }, [yearIncomes, yearExpenses, year])
  const totals = rows.reduce((a, r) => ({ inc: a.inc + r.inc, exp: a.exp + r.exp }), { inc: 0, exp: 0 })
  const monthsWithData = rows.filter((r) => r.hasData).length || 1

  return (
    <div className="flex flex-col gap-4 px-4 pb-28">
      <section className="grid grid-cols-3 gap-2">
        <Stat label="Ingresos" value={money(monthIncome)} tone="text-ok" />
        <Stat label="Gastos" value={money(monthExpense)} tone="text-danger" />
        <Stat label="Ahorro" value={money(net)} tone={net >= 0 ? 'text-ok' : 'text-danger'} sub={monthIncome > 0 ? `${Math.round(savingsPct)}%` : undefined} />
      </section>
      {pendingCount > 0 && (
        <p className="rounded-xl border border-dashed border-warn/60 bg-warn/10 px-4 py-2 text-sm">
          Faltan pagar {pendingCount} recurrente{pendingCount === 1 ? '' : 's'} (~{money(pendingEstimate)}). Si se pagan todos: gastos {money(monthExpense + pendingEstimate)}, ahorro{' '}
          <strong className={monthIncome - monthExpense - pendingEstimate >= 0 ? 'text-ok' : 'text-danger'}>{money(monthIncome - monthExpense - pendingEstimate)}</strong>.
        </p>
      )}
      {monthIncome > 0 && (
        <div>
          <ProgressBar value={monthExpense} max={monthIncome} danger={monthExpense > monthIncome} />
          <p className="mt-1 text-xs text-muted">
            {monthExpense > monthIncome ? `Gastaron ${money(monthExpense - monthIncome)} más de lo que ingresó.` : `Usaron el ${Math.round((monthExpense / monthIncome) * 100)}% de los ingresos.`}
          </p>
        </div>
      )}

      {byGroup.length > 0 && (
        <section className="rounded-xl border border-line bg-card p-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Gastos por grupo · {monthLabel(month)}</h2>
          <ul className="flex flex-col gap-2">
            {byGroup.map((g) => (
              <li key={g.name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>
                    {g.icon} {g.name}
                  </span>
                  <span>
                    {money(g.total)} <span className="text-muted">({Math.round((g.total / monthExpense) * 100)}%)</span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-line">
                  <div className="h-full bg-accent" style={{ width: `${(g.total / maxGroup) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-line bg-card p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">Año {year}</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted">
              <tr>
                <th className="py-1 text-left font-medium">Mes</th>
                <th className="py-1 text-right font-medium">Ingresos</th>
                <th className="py-1 text-right font-medium">Gastos</th>
                <th className="py-1 text-right font-medium">Ahorro</th>
                <th className="py-1 text-right font-medium">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.key} className={`border-t border-line ${r.key === month ? 'font-semibold' : ''} ${!r.hasData ? 'text-muted' : ''}`}>
                  <td className="py-1.5 capitalize">{monthLabel(r.key).slice(0, 3)}</td>
                  <td className="py-1.5 text-right">{r.hasData ? money(r.inc) : '—'}</td>
                  <td className="py-1.5 text-right">{r.hasData ? money(r.exp) : '—'}</td>
                  <td className={`py-1.5 text-right ${r.hasData ? (r.net >= 0 ? 'text-ok' : 'text-danger') : ''}`}>{r.hasData ? money(r.net) : '—'}</td>
                  <td className={`py-1.5 text-right ${r.hasData ? (r.balance >= 0 ? '' : 'text-danger') : ''}`}>{r.hasData ? money(r.balance) : '—'}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t-2 border-line font-semibold">
              <tr>
                <td className="py-1.5">Total</td>
                <td className="py-1.5 text-right">{money(totals.inc)}</td>
                <td className="py-1.5 text-right">{money(totals.exp)}</td>
                <td className={`py-1.5 text-right ${totals.inc - totals.exp >= 0 ? 'text-ok' : 'text-danger'}`}>{money(totals.inc - totals.exp)}</td>
                <td />
              </tr>
              <tr className="text-xs font-normal text-muted">
                <td className="py-1">Promedio</td>
                <td className="py-1 text-right">{money(totals.inc / monthsWithData)}</td>
                <td className="py-1 text-right">{money(totals.exp / monthsWithData)}</td>
                <td className="py-1 text-right">{money((totals.inc - totals.exp) / monthsWithData)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  )
}

function Stat({ label, value, tone, sub }: { label: string; value: string; tone: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-line bg-card p-3">
      <p className="text-[11px] uppercase text-muted">{label}</p>
      <p className={`text-lg font-semibold ${tone}`}>{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  )
}
