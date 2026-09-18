import { differenceInCalendarMonths } from 'date-fns'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Sheet } from '../../components/layout/Sheet'
import { TopBar } from '../../components/layout/TopBar'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { fmtDate, fromInputDate, money, parseAmount, toInputDate } from '../../lib/format'
import type { Fund } from '../../types'
import { addContribution, archiveFund, deleteContribution, removeFund, saveFund } from './api'
import { useContributions, useFunds } from './hooks'
import { AmountInput, Field, MemberDot } from './ui'
import { Timestamp } from 'firebase/firestore'

const ICONS = ['🏖️', '🏠', '🚗', '🎓', '💍', '🛋️', '✈️', '🎁', '🩺', '💰']

export function FundsPage() {
  const { data: funds } = useFunds()
  const [creating, setCreating] = useState(false)
  const active = funds.filter((f) => !f.archived)
  const archived = funds.filter((f) => f.archived)

  return (
    <>
      <TopBar
        title="Fondos de ahorro"
        right={
          <Link to="/gastos" className="flex min-h-10 items-center gap-1 text-sm text-muted">
            <ArrowLeft size={16} /> Gastos
          </Link>
        }
      />
      <main className="flex flex-col gap-3 px-4 py-4 pb-28">
        {active.length === 0 && (
          <div className="px-2 py-12 text-center">
            <p className="font-medium">Sin fondos todavía</p>
            <p className="mt-1 text-sm text-muted">Creá uno para las vacaciones, una refacción o lo que quieran juntar.</p>
          </div>
        )}
        {active.map((f) => (
          <FundCard key={f.id} fund={f} />
        ))}
        {archived.length > 0 && (
          <details className="mt-4">
            <summary className="text-sm text-muted">Archivados ({archived.length})</summary>
            <div className="mt-2 flex flex-col gap-3 opacity-70">
              {archived.map((f) => (
                <FundCard key={f.id} fund={f} />
              ))}
            </div>
          </details>
        )}
      </main>

      <button
        onClick={() => setCreating(true)}
        aria-label="Nuevo fondo"
        className="fixed bottom-20 right-4 z-20 flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-lg md:bottom-8"
      >
        <Plus size={28} />
      </button>

      <Sheet open={creating} onClose={() => setCreating(false)} title="Nuevo fondo">
        {creating && <FundForm fund={null} onClose={() => setCreating(false)} />}
      </Sheet>
    </>
  )
}

function FundCard({ fund }: { fund: Fund }) {
  const pct = fund.goalAmount > 0 ? Math.min(100, (fund.currentAmount / fund.goalAmount) * 100) : 0
  return (
    <Link to={`/gastos/fondos/${fund.id}`} className="flex items-center gap-4 rounded-xl border border-line bg-card p-4">
      <Ring pct={pct} icon={fund.icon ?? '💰'} />
      <div className="flex-1">
        <p className="font-medium">{fund.name}</p>
        <p className="text-sm text-muted">
          {money(fund.currentAmount)} de {money(fund.goalAmount)}
        </p>
        <Projection fund={fund} />
      </div>
    </Link>
  )
}

function Ring({ pct, icon }: { pct: number; icon: string }) {
  const r = 26
  const c = 2 * Math.PI * r
  return (
    <div className="relative size-16 shrink-0">
      <svg viewBox="0 0 64 64" className="size-16 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--color-line)" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke={pct >= 100 ? 'var(--color-ok)' : 'var(--color-accent)'}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-2xl">{icon}</span>
    </div>
  )
}

function Projection({ fund }: { fund: Fund }) {
  if (!fund.targetDate) return null
  const months = Math.max(0, differenceInCalendarMonths(fund.targetDate.toDate(), new Date()))
  const remaining = Math.max(0, fund.goalAmount - fund.currentAmount)
  if (remaining === 0) return <p className="text-xs text-ok">Meta alcanzada</p>
  if (months === 0) return <p className="text-xs text-warn">Faltan {money(remaining)} y la fecha ya llegó</p>
  return (
    <p className="text-xs text-muted">
      {money(Math.ceil(remaining / months))} por mes hasta {fmtDate(fund.targetDate.toDate(), 'MMM yyyy')}
    </p>
  )
}

export function FundDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { household, user } = useRequiredHousehold()
  const { data: funds } = useFunds()
  const { data: contributions } = useContributions(id)
  const fund = funds.find((f) => f.id === id)
  const [contributing, setContributing] = useState<'add' | 'withdraw' | null>(null)
  const [editing, setEditing] = useState(false)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

  const byMember = useMemo(() => {
    const map = new Map<string, number>()
    for (const c of contributions) if (c.amount > 0) map.set(c.byUid, (map.get(c.byUid) ?? 0) + c.amount)
    return map
  }, [contributions])

  if (!fund) return null
  const pct = fund.goalAmount > 0 ? Math.min(100, (fund.currentAmount / fund.goalAmount) * 100) : 0

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const n = parseAmount(amount)
    if (!n || n <= 0) return
    setBusy(true)
    try {
      await addContribution(household.id, fund.id, user.uid, contributing === 'withdraw' ? -n : n, note.trim() || undefined)
      setContributing(null)
      setAmount('')
      setNote('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <TopBar
        title={fund.name}
        right={
          <Link to="/gastos/fondos" className="flex min-h-10 items-center gap-1 text-sm text-muted">
            <ArrowLeft size={16} /> Fondos
          </Link>
        }
      />
      <main className="flex flex-col gap-4 px-4 py-4 pb-28">
        <section className="flex flex-col items-center gap-2 rounded-xl border border-line bg-card p-6">
          <Ring pct={pct} icon={fund.icon ?? '💰'} />
          <p className="text-3xl font-semibold">{money(fund.currentAmount)}</p>
          <p className="text-sm text-muted">
            de {money(fund.goalAmount)} · {Math.round(pct)}%
          </p>
          <Projection fund={fund} />
          <div className="mt-2 flex w-full gap-2">
            <Button onClick={() => setContributing('add')} className="flex-1">
              Aportar
            </Button>
            <Button variant="secondary" onClick={() => setContributing('withdraw')} className="flex-1">
              Retirar
            </Button>
          </div>
          <button onClick={() => setEditing(true)} className="mt-1 text-sm text-muted underline">
            Editar fondo
          </button>
        </section>

        {byMember.size > 0 && (
          <section className="flex gap-3">
            {[...byMember.entries()].map(([uid, total]) => (
              <div key={uid} className="flex flex-1 items-center gap-2 rounded-xl border border-line bg-card p-3">
                <MemberDot uid={uid} size="md" />
                <span className="text-sm">{money(total)}</span>
              </div>
            ))}
          </section>
        )}

        <section>
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Movimientos</h2>
          {contributions.length === 0 ? (
            <p className="text-sm text-muted">Todavía no hay aportes.</p>
          ) : (
            <ul className="divide-y divide-line rounded-xl border border-line bg-card">
              {contributions.map((c) => (
                <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                  <MemberDot uid={c.byUid} />
                  <div className="flex-1">
                    <p className={`text-sm ${c.amount < 0 ? 'text-danger' : ''}`}>
                      {c.amount < 0 ? 'Retiro' : 'Aporte'} {c.note && <span className="text-muted">· {c.note}</span>}
                    </p>
                    <p className="text-xs text-muted">{fmtDate(c.date.toDate(), 'd MMM yyyy')}</p>
                  </div>
                  <span className={`font-medium ${c.amount < 0 ? 'text-danger' : 'text-ok'}`}>
                    {c.amount < 0 ? '−' : '+'}
                    {money(Math.abs(c.amount))}
                  </span>
                  <button
                    onClick={() => confirm('¿Eliminar este movimiento?') && deleteContribution(household.id, fund.id, c.id, c.amount)}
                    aria-label="Eliminar"
                    className="flex size-9 items-center justify-center text-muted"
                  >
                    <Trash2 size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <Sheet open={contributing !== null} onClose={() => setContributing(null)} title={contributing === 'withdraw' ? 'Retirar del fondo' : 'Aportar al fondo'}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <AmountInput value={amount} onChange={setAmount} autoFocus />
          <Field label="Nota">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcional" />
          </Field>
          <Button type="submit" disabled={busy}>
            Confirmar
          </Button>
        </form>
      </Sheet>

      <Sheet open={editing} onClose={() => setEditing(false)} title="Editar fondo">
        {editing && (
          <FundForm
            fund={fund}
            onClose={() => setEditing(false)}
            onDeleted={() => navigate('/gastos/fondos')}
          />
        )}
      </Sheet>
    </>
  )
}

function FundForm({ fund, onClose, onDeleted }: { fund: Fund | null; onClose: () => void; onDeleted?: () => void }) {
  const { household, user } = useRequiredHousehold()
  const [name, setName] = useState(fund?.name ?? '')
  const [icon, setIcon] = useState(fund?.icon ?? ICONS[0])
  const [goal, setGoal] = useState(fund ? String(fund.goalAmount) : '')
  const [target, setTarget] = useState(fund?.targetDate ? toInputDate(fund.targetDate.toDate()) : '')
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const g = parseAmount(goal)
    if (!name.trim() || !g || g <= 0) return
    setBusy(true)
    try {
      await saveFund(
        household.id,
        user.uid,
        {
          name: name.trim(),
          icon,
          goalAmount: g,
          targetDate: target ? Timestamp.fromDate(fromInputDate(target)) : undefined,
          archived: fund?.archived ?? false,
        },
        fund?.id,
      )
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Nombre">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Vacaciones 2027" required autoFocus />
      </Field>
      <Field label="Ícono">
        <div className="flex flex-wrap gap-2">
          {ICONS.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => setIcon(i)}
              className={`flex size-11 items-center justify-center rounded-full border text-xl ${icon === i ? 'border-accent bg-accent/10' : 'border-line'}`}
            >
              {i}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Meta">
        <AmountInput value={goal} onChange={setGoal} />
      </Field>
      <Field label="Fecha objetivo" hint="Opcional; sirve para calcular cuánto aportar por mes">
        <Input type="date" value={target} onChange={(e) => setTarget(e.target.value)} />
      </Field>
      <Button type="submit" disabled={busy}>
        Guardar
      </Button>
      {fund && (
        <div className="flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={() => archiveFund(household.id, fund.id, !fund.archived).then(onClose)}>
            {fund.archived ? 'Desarchivar' : 'Archivar'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="flex-1 text-danger"
            onClick={() => confirm('¿Eliminar el fondo y sus movimientos?') && removeFund(household.id, fund.id).then(() => onDeleted?.())}
          >
            Eliminar
          </Button>
        </div>
      )}
    </form>
  )
}
