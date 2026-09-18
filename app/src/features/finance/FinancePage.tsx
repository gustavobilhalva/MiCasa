import { CreditCard, PiggyBank, Plus, Receipt, Trash2, TrendingUp, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Sheet } from '../../components/layout/Sheet'
import { TopBar } from '../../components/layout/TopBar'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { PAYMENT_METHODS } from '../../lib/defaults'
import { fmtDate, money, monthKey, monthLabel, shiftMonth } from '../../lib/format'
import { ensureFinanceCategories } from '../../lib/household'
import type { Expense, Income } from '../../types'
import { deleteExpense } from './api'
import { BalanceTab } from './BalanceTab'
import { BudgetTab } from './BudgetTab'
import { categoryLabel } from './CategoryPicker'
import { ExpenseSheet } from './ExpenseSheet'
import { useExpenses, useIncomes } from './hooks'
import { IncomeSheet, IncomeTab } from './IncomeTab'
import { SummaryTab } from './SummaryTab'
import { MemberDot, MonthNav } from './ui'

type Tab = 'summary' | 'expenses' | 'incomes' | 'budget' | 'balance'

const TABS: [Tab, string][] = [
  ['summary', 'Resumen'],
  ['expenses', 'Gastos'],
  ['incomes', 'Ingresos'],
  ['budget', 'Presupuesto'],
  ['balance', 'Balance'],
]

export function FinancePage() {
  const { household } = useRequiredHousehold()
  const [params, setParams] = useSearchParams()
  const [month, setMonth] = useState(monthKey(new Date()))
  const [tab, setTab] = useState<Tab>((params.get('tab') as Tab) || 'summary')
  const [sheet, setSheet] = useState<'expense' | 'income' | null>(params.get('nuevo') === '1' ? 'expense' : null)
  const [menu, setMenu] = useState(false)
  const [editingIncome, setEditingIncome] = useState<Income | null>(null)
  const { data: expenses, loading } = useExpenses(month)
  const { data: incomes, loading: loadingIncomes } = useIncomes(month)

  useEffect(() => {
    ensureFinanceCategories(household.id)
  }, [household.id])

  const closeSheet = () => {
    setSheet(null)
    setEditingIncome(null)
    if (params.has('nuevo')) setParams({}, { replace: true })
  }

  const total = useMemo(() => expenses.filter((e) => !e.settlement).reduce((s, e) => s + e.amount, 0), [expenses])

  return (
    <>
      <TopBar title="Finanzas" />
      <div className="flex gap-2 overflow-x-auto px-4 py-3">
        <QuickLink to="/gastos/servicios" icon={<Receipt size={16} />} label="Servicios" />
        <QuickLink to="/gastos/cuotas" icon={<CreditCard size={16} />} label="Cuotas y tarjetas" />
        <QuickLink to="/gastos/fondos" icon={<PiggyBank size={16} />} label="Fondos" />
      </div>

      <MonthNav month={month} label={monthLabel(month)} onPrev={() => setMonth(shiftMonth(month, -1))} onNext={() => setMonth(shiftMonth(month, 1))} />

      <div role="tablist" className="mx-4 mb-3 flex gap-1 overflow-x-auto rounded-xl border border-line bg-card p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`min-h-10 shrink-0 flex-1 rounded-lg px-3 text-sm font-medium ${tab === id ? 'bg-accent text-white' : 'text-muted'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'summary' && <SummaryTab month={month} expenses={expenses} incomes={incomes} />}
      {tab === 'expenses' && <MovesTab expenses={expenses} loading={loading} total={total} />}
      {tab === 'incomes' && <IncomeTab incomes={incomes} loading={loadingIncomes} onEdit={(i) => { setEditingIncome(i); setSheet('income') }} />}
      {tab === 'budget' && <BudgetTab month={month} expenses={expenses} />}
      {tab === 'balance' && <BalanceTab month={month} expenses={expenses} />}

      <button
        onClick={() => (tab === 'incomes' ? setSheet('income') : tab === 'expenses' ? setSheet('expense') : setMenu(true))}
        aria-label="Cargar"
        className="fixed bottom-20 right-4 z-20 flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-lg md:bottom-8"
      >
        <Plus size={28} />
      </button>

      <Sheet open={menu} onClose={() => setMenu(false)} title="¿Qué querés cargar?">
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => { setMenu(false); setSheet('expense') }} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border border-line bg-surface">
            <Wallet className="text-danger" />
            <span className="text-sm">Gasto</span>
          </button>
          <button onClick={() => { setMenu(false); setSheet('income') }} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border border-line bg-surface">
            <TrendingUp className="text-ok" />
            <span className="text-sm">Ingreso</span>
          </button>
        </div>
      </Sheet>

      <ExpenseSheet open={sheet === 'expense'} onClose={closeSheet} />
      <IncomeSheet open={sheet === 'income'} onClose={closeSheet} income={editingIncome} />
    </>
  )
}

function QuickLink({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link to={to} className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-line bg-card px-3 text-sm">
      {icon} {label}
    </Link>
  )
}

function MovesTab({ expenses, loading, total }: { expenses: Expense[]; loading: boolean; total: number }) {
  const { household, expenseCategories } = useRequiredHousehold()
  const catById = useMemo(() => new Map(expenseCategories.map((c) => [c.id, c])), [expenseCategories])
  const methodLabel = (id: string) => PAYMENT_METHODS.find((m) => m.id === id)?.label ?? id

  const byDay = useMemo(() => {
    const map = new Map<string, Expense[]>()
    for (const e of expenses) {
      const key = fmtDate(e.date.toDate(), 'EEEE d')
      map.set(key, [...(map.get(key) ?? []), e])
    }
    return [...map.entries()]
  }, [expenses])

  return (
    <div className="pb-28">
      <div className="mx-4 mb-3 rounded-xl border border-line bg-card p-4">
        <p className="text-sm text-muted">Gastos del mes</p>
        <p className="text-3xl font-semibold">{money(total)}</p>
      </div>

      {loading ? (
        <p className="p-6 text-center text-muted">Cargando…</p>
      ) : expenses.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-muted">Sin gastos este mes. Tocá + para cargar el primero.</p>
      ) : (
        byDay.map(([day, items]) => (
          <section key={day}>
            <h2 className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">{day}</h2>
            <ul className="divide-y divide-line bg-card">
              {items.map((e) => {
                const cat = catById.get(e.categoryId)
                return (
                  <li key={e.id} className="flex min-h-14 items-center gap-3 px-4">
                    <span className="text-xl">{cat?.icon ?? '💸'}</span>
                    <div className="flex-1">
                      <p>
                        {e.settlement ? 'Ajuste' : categoryLabel(cat)}
                        {e.note && <span className="ml-2 text-sm text-muted">{e.note}</span>}
                      </p>
                      <p className="text-xs text-muted">
                        {methodLabel(e.method)}
                        {e.installments && ` · ${e.installments.count} cuotas`}
                      </p>
                    </div>
                    <span className="font-medium">{money(e.amount)}</span>
                    <MemberDot uid={e.paidBy} />
                    <button
                      onClick={() => confirm('¿Eliminar este gasto?') && deleteExpense(household.id, e.id)}
                      aria-label="Eliminar gasto"
                      className="flex size-10 items-center justify-center text-muted"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}
