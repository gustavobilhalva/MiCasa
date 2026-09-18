import { ArrowLeft, Calculator, CreditCard, Plus } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Sheet } from '../../components/layout/Sheet'
import { TopBar } from '../../components/layout/TopBar'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { fmtDate, money, monthKey, monthLabel, parseAmount, shiftMonth } from '../../lib/format'
import { buildInstallmentPlan } from '../../lib/installments'
import type { Card } from '../../types'
import { deleteCard, saveCard, toggleInstallmentPaid } from './api'
import { useCards, useInstallments } from './hooks'
import { AmountInput, Chips, Field, MemberPicker } from './ui'

export function InstallmentsPage() {
  const { household } = useRequiredHousehold()
  const { data: cards } = useCards()
  const thisMonth = monthKey(new Date())
  const { data: installments } = useInstallments(thisMonth)
  const [cardSheet, setCardSheet] = useState<Card | null | 'new'>(null)
  const [simOpen, setSimOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(thisMonth)

  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => shiftMonth(thisMonth, i)), [thisMonth])
  const byMonth = useMemo(() => {
    const map = new Map<string, typeof installments>()
    for (const i of installments) map.set(i.statementMonth, [...(map.get(i.statementMonth) ?? []), i])
    return map
  }, [installments])
  const maxTotal = Math.max(1, ...months.map((m) => (byMonth.get(m) ?? []).reduce((s, i) => s + i.amount, 0)))
  const cardName = (id: string) => cards.find((c) => c.id === id)?.name ?? 'Tarjeta'

  return (
    <>
      <TopBar
        title="Cuotas y tarjetas"
        right={
          <Link to="/gastos" className="flex min-h-10 items-center gap-1 text-sm text-muted">
            <ArrowLeft size={16} /> Gastos
          </Link>
        }
      />
      <main className="flex flex-col gap-4 px-4 py-4 pb-28">
        <section className="rounded-xl border border-line bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Tarjetas</h2>
            <button onClick={() => setCardSheet('new')} className="flex min-h-10 items-center gap-1 text-sm text-accent">
              <Plus size={16} /> Agregar
            </button>
          </div>
          {cards.length === 0 ? (
            <p className="text-sm text-muted">Cargá tus tarjetas de crédito con día de cierre y vencimiento para proyectar las cuotas.</p>
          ) : (
            <ul className="divide-y divide-line">
              {cards.map((c) => (
                <li key={c.id}>
                  <button onClick={() => setCardSheet(c)} className="flex min-h-12 w-full items-center gap-3 text-left">
                    <CreditCard size={20} className="text-accent" />
                    <span className="flex-1">
                      {c.name}
                      {c.last4 && <span className="ml-1 text-muted">···{c.last4}</span>}
                    </span>
                    <span className="text-xs text-muted">
                      cierra {c.closingDay} · vence {c.dueDay}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-line bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Próximos 12 meses</h2>
            <button onClick={() => setSimOpen(true)} className="flex min-h-10 items-center gap-1 text-sm text-accent">
              <Calculator size={16} /> Simular
            </button>
          </div>
          {installments.length === 0 && (
            <p className="mb-3 text-sm text-muted">Todavía no hay compras en cuotas. Cargá un gasto con tarjeta de crédito y más de una cuota.</p>
          )}
          <ul className="flex flex-col gap-1">
            {months.map((m) => {
              const items = byMonth.get(m) ?? []
              const total = items.reduce((s, i) => s + i.amount, 0)
              const isOpen = expanded === m
              return (
                <li key={m}>
                  <button onClick={() => setExpanded(isOpen ? null : m)} className="flex w-full items-center gap-3 py-1.5 text-left">
                    <span className="w-16 shrink-0 text-xs capitalize text-muted">{monthLabel(m).slice(0, 3)} {m.slice(2, 4)}</span>
                    <span className="h-5 flex-1 overflow-hidden rounded bg-line">
                      <span className="block h-full bg-accent" style={{ width: `${(total / maxTotal) * 100}%` }} />
                    </span>
                    <span className="w-24 shrink-0 text-right text-sm font-medium">{total ? money(total) : '—'}</span>
                  </button>
                  {isOpen && items.length > 0 && (
                    <ul className="mb-2 ml-16 divide-y divide-line rounded-lg border border-line">
                      {items.map((i) => (
                        <li key={i.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                          <input
                            type="checkbox"
                            checked={i.paid}
                            onChange={(e) => toggleInstallmentPaid(household.id, i.id, e.target.checked)}
                            className="size-5 accent-accent"
                            aria-label="Cuota pagada"
                          />
                          <span className={`flex-1 ${i.paid ? 'text-muted line-through' : ''}`}>
                            {i.label} <span className="text-muted">{i.number}/{i.count} · {cardName(i.cardId)} · vence {fmtDate(i.dueDate.toDate())}</span>
                          </span>
                          <span>{money(i.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      </main>

      <Sheet open={cardSheet !== null} onClose={() => setCardSheet(null)} title={cardSheet === 'new' ? 'Nueva tarjeta' : 'Editar tarjeta'}>
        {cardSheet !== null && <CardForm card={cardSheet === 'new' ? null : cardSheet} onClose={() => setCardSheet(null)} />}
      </Sheet>

      <Sheet open={simOpen} onClose={() => setSimOpen(false)} title="Simular compra en cuotas">
        {simOpen && <Simulator cards={cards} byMonth={byMonth} />}
      </Sheet>
    </>
  )
}

function CardForm({ card, onClose }: { card: Card | null; onClose: () => void }) {
  const { household, user } = useRequiredHousehold()
  const [name, setName] = useState(card?.name ?? '')
  const [holder, setHolder] = useState<string | null>(card?.holderUid ?? user.uid)
  const [last4, setLast4] = useState(card?.last4 ?? '')
  const [closingDay, setClosingDay] = useState(String(card?.closingDay ?? 20))
  const [dueDay, setDueDay] = useState(String(card?.dueDay ?? 5))
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !holder) return
    setBusy(true)
    try {
      await saveCard(
        household.id,
        user.uid,
        {
          name: name.trim(),
          holderUid: holder,
          last4: last4.trim() || undefined,
          closingDay: Math.min(31, Math.max(1, Number(closingDay) || 1)),
          dueDay: Math.min(31, Math.max(1, Number(dueDay) || 1)),
          active: true,
        },
        card?.id,
      )
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Nombre">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Visa Galicia" required autoFocus />
      </Field>
      <Field label="Titular">
        <MemberPicker value={holder} onChange={setHolder} />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Últimos 4">
          <Input inputMode="numeric" maxLength={4} value={last4} onChange={(e) => setLast4(e.target.value)} />
        </Field>
        <Field label="Día cierre">
          <Input inputMode="numeric" value={closingDay} onChange={(e) => setClosingDay(e.target.value)} />
        </Field>
        <Field label="Día vto.">
          <Input inputMode="numeric" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
        </Field>
      </div>
      <Button type="submit" disabled={busy}>
        Guardar
      </Button>
      {card && (
        <Button type="button" variant="ghost" className="text-danger" onClick={() => deleteCard(household.id, card.id).then(onClose)}>
          Dar de baja
        </Button>
      )}
    </form>
  )
}

function Simulator({ cards, byMonth }: { cards: Card[]; byMonth: Map<string, { amount: number }[]> }) {
  const { household } = useRequiredHousehold()
  const [amount, setAmount] = useState('')
  const [count, setCount] = useState('3')
  const [surcharge, setSurcharge] = useState(String(household.settings.installmentSurchargePct ?? 0))
  const [cardId, setCardId] = useState<string | null>(cards[0]?.id ?? null)
  const card = cards.find((c) => c.id === cardId)
  const total = parseAmount(amount)

  const plan = useMemo(() => {
    if (!card || !total) return null
    return buildInstallmentPlan({
      total,
      count: Math.max(1, Math.min(48, Number(count) || 1)),
      surchargePct: Number(surcharge.replace(',', '.')) || 0,
      purchaseDate: new Date(),
      closingDay: card.closingDay,
      dueDay: card.dueDay,
    })
  }, [card, total, count, surcharge])

  return (
    <div className="flex flex-col gap-4">
      <AmountInput value={amount} onChange={setAmount} autoFocus />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Cuotas">
          <Input inputMode="numeric" value={count} onChange={(e) => setCount(e.target.value)} />
        </Field>
        <Field label="Recargo %">
          <Input inputMode="decimal" value={surcharge} onChange={(e) => setSurcharge(e.target.value)} />
        </Field>
      </div>
      {cards.length > 0 && (
        <Field label="Tarjeta">
          <Chips options={cards.map((c) => ({ id: c.id, label: c.name }))} value={cardId} onChange={setCardId} />
        </Field>
      )}
      {!card && <p className="text-sm text-muted">Agregá una tarjeta para simular.</p>}
      {plan && (
        <ul className="divide-y divide-line rounded-xl border border-line text-sm">
          {plan.map((p) => {
            const existing = (byMonth.get(p.statementMonth) ?? []).reduce((s, i) => s + i.amount, 0)
            return (
              <li key={p.number} className="flex items-center gap-2 px-3 py-2">
                <span className="w-16 capitalize text-muted">{monthLabel(p.statementMonth).slice(0, 3)} {p.statementMonth.slice(2, 4)}</span>
                <span className="flex-1">
                  {money(existing)} <span className="text-muted">ya comprometido</span>
                </span>
                <span className="font-medium text-accent">+{money(p.amount)}</span>
                <span className="w-24 text-right font-semibold">{money(existing + p.amount)}</span>
              </li>
            )
          })}
          <li className="px-3 py-2 text-right text-xs text-muted">
            Total con recargo: {money(plan.reduce((s, p) => s + p.amount, 0))}
          </li>
        </ul>
      )}
    </div>
  )
}
