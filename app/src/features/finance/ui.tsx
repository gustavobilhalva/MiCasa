import type { ReactNode } from 'react'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { SHARED_UID } from '../../lib/defaults'

export function SharedDot({ className = 'size-3' }: { className?: string }) {
  const { members } = useRequiredHousehold()
  const [a, b] = [members[0]?.color ?? '#999', members[1]?.color ?? members[0]?.color ?? '#999']
  return <span className={`${className} rounded-full`} style={{ background: `linear-gradient(90deg, ${a} 50%, ${b} 50%)` }} />
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-muted">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  )
}

export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[]
  value: T | null
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={`min-h-10 rounded-full border px-3 text-sm ${
            value === o.id ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-card'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function AmountInput({
  value,
  onChange,
  autoFocus,
}: {
  value: string
  onChange: (v: string) => void
  autoFocus?: boolean
}) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-muted">$</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        inputMode="decimal"
        autoFocus={autoFocus}
        placeholder="0"
        className="min-h-14 w-full rounded-xl border border-line bg-card pl-10 pr-4 text-2xl font-semibold placeholder:text-muted focus:border-accent focus:outline-none"
      />
    </div>
  )
}

export function MemberPicker({
  value,
  onChange,
  allowNone,
  allowShared,
}: {
  value: string | null
  onChange: (uid: string | null) => void
  allowNone?: boolean
  allowShared?: boolean
}) {
  const { members } = useRequiredHousehold()
  return (
    <div className="flex flex-wrap gap-2">
      {allowShared && members.length > 1 && (
        <button
          type="button"
          onClick={() => onChange(SHARED_UID)}
          className={`flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm ${
            value === SHARED_UID ? 'border-accent bg-accent/10' : 'border-line bg-card'
          }`}
        >
          <SharedDot />
          Los dos
        </button>
      )}
      {members.map((m) => (
        <button
          key={m.id}
          type="button"
          onClick={() => onChange(m.id)}
          className={`flex min-h-11 items-center gap-2 rounded-full border px-3 text-sm ${
            value === m.id ? 'border-accent bg-accent/10' : 'border-line bg-card'
          }`}
        >
          <span className="size-3 rounded-full" style={{ backgroundColor: m.color }} />
          {m.displayName}
        </button>
      ))}
      {allowNone && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`min-h-11 rounded-full border px-3 text-sm ${
            value === null ? 'border-accent bg-accent/10' : 'border-line bg-card text-muted'
          }`}
        >
          Sin asignar
        </button>
      )}
    </div>
  )
}

export function MemberDot({ uid, size = 'sm' }: { uid?: string | null; size?: 'sm' | 'md' }) {
  const { members } = useRequiredHousehold()
  const m = members.find((x) => x.id === uid)
  const cls = size === 'md' ? 'size-8 text-xs' : 'size-6 text-[10px]'
  if (uid === SHARED_UID) {
    const [a, b] = [members[0]?.color ?? '#999', members[1]?.color ?? '#999']
    return (
      <span className={`${cls} flex items-center justify-center rounded-full font-semibold text-white`} style={{ background: `linear-gradient(90deg, ${a} 50%, ${b} 50%)` }} title="Los dos">
        2
      </span>
    )
  }
  if (!m) return <span className={`${cls} flex items-center justify-center rounded-full border border-dashed border-line text-muted`}>?</span>
  return (
    <span
      className={`${cls} flex items-center justify-center rounded-full font-semibold text-white`}
      style={{ backgroundColor: m.color }}
      title={m.displayName}
    >
      {m.displayName.charAt(0)}
    </span>
  )
}

export function MonthNav({ month, label, onPrev, onNext }: { month: string; label: string; onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 py-2" data-month={month}>
      <button onClick={onPrev} aria-label="Mes anterior" className="flex size-11 items-center justify-center text-muted">
        ‹
      </button>
      <span className="font-medium capitalize">{label}</span>
      <button onClick={onNext} aria-label="Mes siguiente" className="flex size-11 items-center justify-center text-muted">
        ›
      </button>
    </div>
  )
}

export function ProgressBar({ value, max, danger }: { value: number; max: number; danger?: boolean }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  const color = danger || pct >= 100 ? 'bg-danger' : pct >= 80 ? 'bg-warn' : 'bg-accent'
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-line">
      <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}
