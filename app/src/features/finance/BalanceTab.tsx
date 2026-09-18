import { useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { money } from '../../lib/format'
import type { Expense } from '../../types'
import { SETTLEMENT_CATEGORY_ID } from '../../lib/financeCategories'
import { addExpense } from './api'
import { useEffectiveSplit } from './hooks'
import { MemberDot } from './ui'

export function BalanceTab({ month, expenses }: { month: string; expenses: Expense[] }) {
  const { household, user, members, expenseCategories } = useRequiredHousehold()
  const defaultSplit = useEffectiveSplit()
  const [busy, setBusy] = useState(false)

  const stats = useMemo(() => {
    const paid = new Map<string, number>()
    const share = new Map<string, number>()
    for (const m of members) {
      paid.set(m.id, 0)
      share.set(m.id, 0)
    }
    for (const e of expenses) {
      paid.set(e.paidBy, (paid.get(e.paidBy) ?? 0) + e.amount)
      const split = e.split ?? defaultSplit
      for (const [uid, pct] of Object.entries(split)) {
        share.set(uid, (share.get(uid) ?? 0) + (e.amount * pct) / 100)
      }
    }
    return members.map((m) => ({
      member: m,
      paid: paid.get(m.id) ?? 0,
      share: share.get(m.id) ?? 0,
      net: (paid.get(m.id) ?? 0) - (share.get(m.id) ?? 0),
    }))
  }, [expenses, members, defaultSplit])

  const creditor = stats.reduce((a, b) => (b.net > a.net ? b : a), stats[0])
  const debtor = stats.reduce((a, b) => (b.net < a.net ? b : a), stats[0])
  const diff = creditor && debtor ? Math.round(Math.abs(creditor.net) * 100) / 100 : 0
  const settled = diff < 1

  const settle = async () => {
    if (!creditor || !debtor) return
    const cat = expenseCategories.find((c) => c.id === SETTLEMENT_CATEGORY_ID) ?? expenseCategories.find((c) => c.name === 'Ajuste entre nosotros') ?? expenseCategories[0]
    setBusy(true)
    try {
      await addExpense(household.id, user.uid, {
        amount: diff,
        categoryId: cat.id,
        paidBy: debtor.member.id,
        method: 'transfer',
        date: new Date(),
        note: `Saldo ${month}`,
        split: { [creditor.member.id]: 100 },
        settlement: true,
      })
    } finally {
      setBusy(false)
    }
  }

  if (members.length < 2) {
    return <p className="px-6 py-12 text-center text-sm text-muted">El balance aparece cuando hay dos miembros en el hogar.</p>
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-28">
      <div className="rounded-xl border border-line bg-card p-4">
        {settled ? (
          <p className="text-center font-medium">Están a mano este mes.</p>
        ) : (
          <>
            <p className="text-center text-sm text-muted">
              <strong className="text-ink">{debtor.member.displayName}</strong> le debe a{' '}
              <strong className="text-ink">{creditor.member.displayName}</strong>
            </p>
            <p className="my-2 text-center text-3xl font-semibold">{money(diff)}</p>
            <Button onClick={settle} disabled={busy} className="w-full">
              {busy ? 'Registrando…' : 'Marcar como saldado'}
            </Button>
            <p className="mt-2 text-center text-xs text-muted">Registra una transferencia de {debtor.member.displayName} a {creditor.member.displayName}.</p>
          </>
        )}
      </div>

      <ul className="divide-y divide-line rounded-xl border border-line bg-card">
        {stats.map((s) => (
          <li key={s.member.id} className="flex items-center gap-3 px-4 py-3">
            <MemberDot uid={s.member.id} size="md" />
            <div className="flex-1">
              <p className="font-medium">{s.member.displayName}</p>
              <p className="text-xs text-muted">
                Pagó {money(s.paid)} · le corresponde {money(s.share)}
              </p>
            </div>
            <span className={`font-medium ${s.net > 0 ? 'text-ok' : s.net < 0 ? 'text-danger' : ''}`}>
              {s.net > 0 ? '+' : ''}
              {money(s.net)}
            </span>
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted">
        Reparto por defecto:{' '}
        {members.map((m) => `${m.displayName} ${Math.round(defaultSplit[m.id] ?? 0)}%`).join(' · ')}
      </p>
    </div>
  )
}
