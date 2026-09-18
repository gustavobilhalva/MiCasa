import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Sheet } from '../../components/layout/Sheet'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { PAYMENT_METHODS, SHARED_UID } from '../../lib/defaults'
import { fromInputDate, money, parseAmount, toInputDate } from '../../lib/format'
import { buildInstallmentPlan } from '../../lib/installments'
import type { Expense, PaymentMethod } from '../../types'
import { addExpense, deleteExpense, updateExpense } from './api'
import { CategoryPicker } from './CategoryPicker'
import { useCards } from './hooks'
import { AmountInput, Chips, Field, MemberPicker } from './ui'

export function ExpenseSheet({ open, onClose, expense }: { open: boolean; onClose: () => void; expense?: Expense | null }) {
  return (
    <Sheet open={open} onClose={onClose} title={expense ? 'Editar gasto' : 'Cargar gasto'}>
      {open && <ExpenseForm key={expense?.id ?? 'new'} expense={expense ?? null} onClose={onClose} />}
    </Sheet>
  )
}

function ExpenseForm({ expense, onClose }: { expense: Expense | null; onClose: () => void }) {
  const { household, user, expenseCategories } = useRequiredHousehold()
  const { data: cards } = useCards()
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '')
  const [categoryId, setCategoryId] = useState<string | null>(expense?.categoryId ?? null)
  const [paidBy, setPaidBy] = useState<string | null>(expense?.paidBy ?? user.uid)
  const [method, setMethod] = useState<PaymentMethod>(expense?.method ?? 'debit')
  const [cardId, setCardId] = useState<string | null>(expense?.cardId ?? cards[0]?.id ?? null)
  const [installments, setInstallments] = useState(String(expense?.installments?.count ?? 1))
  const [surcharge, setSurcharge] = useState(String(expense?.installments?.surchargePct ?? household.settings.installmentSurchargePct ?? 0))
  const [date, setDate] = useState(toInputDate(expense?.date.toDate() ?? new Date()))
  const [note, setNote] = useState(expense?.note ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const parsedAmount = parseAmount(amount)
  const card = cards.find((c) => c.id === (cardId ?? cards[0]?.id))
  const count = Math.max(1, Math.min(48, Number(installments) || 1))
  const surchargePct = Number(surcharge.replace(',', '.')) || 0

  const preview = useMemo(() => {
    if (method !== 'credit' || !card || !parsedAmount || count < 2) return null
    return buildInstallmentPlan({ total: parsedAmount, count, surchargePct, purchaseDate: fromInputDate(date), closingDay: card.closingDay, dueDay: card.dueDay })
  }, [method, card, parsedAmount, count, surchargePct, date])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!parsedAmount || parsedAmount <= 0) return setError('Ingresá un monto.')
    if (!categoryId) return setError('Elegí una categoría.')
    if (!paidBy) return setError('¿Quién pagó?')
    if (method === 'credit' && !card) return setError('Agregá una tarjeta primero.')
    setBusy(true)
    setError(null)
    try {
      const input = {
        amount: parsedAmount,
        categoryId,
        paidBy,
        method,
        card: method === 'credit' ? card : undefined,
        installmentCount: count,
        surchargePct,
        date: fromInputDate(date),
        note: note.trim() || undefined,
      }
      if (expense) await updateExpense(household.id, user.uid, expense.id, input)
      else await addExpense(household.id, user.uid, input)
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
        <CategoryPicker categories={expenseCategories} value={categoryId} onChange={setCategoryId} />
      </Field>

      <Field label="Pagó" hint={paidBy === SHARED_UID ? 'Pagado entre los dos: no genera deuda en el balance.' : undefined}>
        <MemberPicker value={paidBy} onChange={setPaidBy} allowShared />
      </Field>

      <Field label="Medio de pago">
        <Chips options={PAYMENT_METHODS as { id: PaymentMethod; label: string }[]} value={method} onChange={setMethod} />
      </Field>

      {method === 'credit' && (
        <div className="flex flex-col gap-3 rounded-xl border border-line p-3">
          {cards.length === 0 ? (
            <p className="text-sm text-muted">
              No hay tarjetas cargadas.{' '}
              <Link to="/gastos/cuotas" onClick={onClose} className="text-accent underline">
                Agregar tarjeta
              </Link>
            </p>
          ) : (
            <>
              <Field label="Tarjeta">
                <Chips options={cards.map((c) => ({ id: c.id, label: c.name }))} value={card?.id ?? null} onChange={setCardId} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Cuotas">
                  <Input inputMode="numeric" value={installments} onChange={(e) => setInstallments(e.target.value)} />
                </Field>
                <Field label="Recargo %">
                  <Input inputMode="decimal" value={surcharge} onChange={(e) => setSurcharge(e.target.value)} />
                </Field>
              </div>
              {preview && (
                <p className="text-sm text-muted">
                  {preview.length} cuotas de <strong className="text-ink">{money(preview[preview.length - 1].amount)}</strong>, primera
                  en el resumen de {preview[0].statementMonth}.
                </p>
              )}
            </>
          )}
        </div>
      )}

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
        {busy ? 'Guardando…' : expense ? 'Guardar cambios' : 'Guardar gasto'}
      </Button>
      {expense && (
        <Button type="button" variant="ghost" className="text-danger" onClick={() => confirm('¿Eliminar este gasto?') && deleteExpense(household.id, expense.id).then(onClose)}>
          Eliminar gasto
        </Button>
      )}
    </form>
  )
}
