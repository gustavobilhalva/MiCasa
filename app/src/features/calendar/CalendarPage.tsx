import { addMonths, isSameDay, isToday, isTomorrow, startOfMonth } from 'date-fns'
import { MapPin, NotebookPen, Plus, UtensilsCrossed } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { TopBar } from '../../components/layout/TopBar'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { EVENT_CATEGORIES, EVENT_ROLES } from '../../lib/defaults'
import { fmtDate, monthKey, monthLabel } from '../../lib/format'
import type { Occurrence } from '../../lib/recurrence'
import { useUpcomingCare, type UpcomingItem } from '../care/hooks'
import { useServiceInstances, useServices } from '../finance/hooks'
import { MemberDot, MonthNav } from '../finance/ui'
import { EventSheet } from './EventSheet'
import { useOccurrences } from './hooks'

type Filter = 'all' | string

const KIND_ICON: Record<UpcomingItem['kind'], string> = { health: '🩺', document: '📄', procedure: '📋', maintenance: '🔧', warranty: '🛡️' }

export function CalendarPage() {
  const { user, members } = useRequiredHousehold()
  const [monthStart, setMonthStart] = useState(startOfMonth(new Date()))
  const monthEnd = useMemo(() => addMonths(monthStart, 1), [monthStart])
  const { occurrences, loading } = useOccurrences(monthStart, monthEnd)
  const { data: services } = useServices()
  const { data: instances } = useServiceInstances(monthKey(monthStart))
  const care = useUpcomingCare(400)
  const [filter, setFilter] = useState<Filter>('all')
  const [editing, setEditing] = useState<Occurrence | null>(null)
  const [creating, setCreating] = useState<Date | null>(null)

  const filtered = useMemo(() => {
    if (filter === 'all') return occurrences
    return occurrences.filter((o) => Object.values(o.event.roles ?? {}).includes(filter) || o.event.createdBy === filter)
  }, [occurrences, filter])

  const serviceDues = useMemo(() => {
    const byId = new Map(services.map((s) => [s.id, s]))
    return instances
      .filter((i) => i.status === 'pending' && (filter === 'all' || i.assigneeUid === filter))
      .map((i) => ({ instance: i, service: byId.get(i.serviceId) }))
      .filter((r) => r.service)
  }, [instances, services, filter])

  const careInMonth = useMemo(
    () => care.filter((c) => c.dueAt >= monthStart && c.dueAt < monthEnd && (filter === 'all' || c.assigneeUid === filter)),
    [care, monthStart, monthEnd, filter],
  )

  const days = useMemo(() => {
    const map = new Map<string, { date: Date; items: Occurrence[]; dues: typeof serviceDues; care: UpcomingItem[] }>()
    const add = (d: Date) => {
      const k = d.toDateString()
      if (!map.has(k)) map.set(k, { date: new Date(d.getFullYear(), d.getMonth(), d.getDate()), items: [], dues: [], care: [] })
      return map.get(k)!
    }
    for (const o of filtered) add(o.start).items.push(o)
    for (const d of serviceDues) add(d.instance.dueDate.toDate()).dues.push(d)
    for (const c of careInMonth) add(c.dueAt).care.push(c)
    return [...map.values()].sort((a, b) => a.date.getTime() - b.date.getTime())
  }, [filtered, serviceDues, careInMonth])

  const dayLabel = (d: Date) => (isToday(d) ? 'Hoy' : isTomorrow(d) ? 'Mañana' : fmtDate(d, 'EEEE d'))

  return (
    <>
      <TopBar title="Agenda" />
      <div className="flex gap-2 overflow-x-auto px-4 py-3">
        <Link to="/notas" className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-line bg-card px-3 text-sm">
          <NotebookPen size={16} /> Notas del día
        </Link>
        <Link to="/menus" className="flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border border-line bg-card px-3 text-sm">
          <UtensilsCrossed size={16} /> Menús
        </Link>
      </div>

      <MonthNav
        month={monthKey(monthStart)}
        label={monthLabel(monthKey(monthStart))}
        onPrev={() => setMonthStart(addMonths(monthStart, -1))}
        onNext={() => setMonthStart(addMonths(monthStart, 1))}
      />

      <div className="flex gap-2 overflow-x-auto px-4 pb-3">
        <FilterChip active={filter === 'all'} onClick={() => setFilter('all')}>
          Todos
        </FilterChip>
        {members.map((m) => (
          <FilterChip key={m.id} active={filter === m.id} onClick={() => setFilter(m.id)}>
            <span className="size-2.5 rounded-full" style={{ backgroundColor: m.color }} /> {m.id === user.uid ? 'Yo' : m.displayName}
          </FilterChip>
        ))}
      </div>

      {loading ? (
        <p className="p-6 text-center text-muted">Cargando…</p>
      ) : days.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-muted">Nada agendado este mes. Tocá + para crear un evento.</p>
      ) : (
        <div className="pb-28">
          {days.map(({ date, items, dues, care }) => (
            <section key={date.toISOString()}>
              <h2 className={`sticky top-14 z-[5] bg-surface px-4 py-2 text-xs font-semibold uppercase tracking-wide ${isSameDay(date, new Date()) ? 'text-accent' : 'text-muted'}`}>
                {dayLabel(date)}
              </h2>
              <ul className="divide-y divide-line bg-card">
                {dues.map(({ instance, service }) => (
                  <li key={instance.id}>
                    <Link to="/gastos/servicios" className="flex min-h-12 items-center gap-3 px-4 opacity-80">
                      <span className="w-12 text-xs text-muted">vence</span>
                      <span className="flex-1 text-sm">💡 {service!.name}</span>
                      <MemberDot uid={instance.assigneeUid} />
                    </Link>
                  </li>
                ))}
                {care.map((c) => (
                  <li key={c.key}>
                    <Link to={c.to} className="flex min-h-12 items-center gap-3 px-4 opacity-80">
                      <span className="w-12 text-xs text-muted">vence</span>
                      <span className="flex-1 text-sm">{KIND_ICON[c.kind]} {c.label}</span>
                      {c.assigneeUid !== undefined && <MemberDot uid={c.assigneeUid} />}
                    </Link>
                  </li>
                ))}
                {items.map((o) => (
                  <EventRow key={o.key} occurrence={o} onClick={() => setEditing(o)} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <button
        onClick={() => setCreating(new Date())}
        aria-label="Nuevo evento"
        className="fixed bottom-20 right-4 z-20 flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-lg md:bottom-8"
      >
        <Plus size={28} />
      </button>

      <EventSheet open={creating !== null} onClose={() => setCreating(null)} defaultDate={creating ?? undefined} />
      <EventSheet open={editing !== null} onClose={() => setEditing(null)} event={editing?.event} />
    </>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-sm ${active ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-card text-muted'}`}
    >
      {children}
    </button>
  )
}

export function EventRow({ occurrence, onClick }: { occurrence: Occurrence; onClick?: () => void }) {
  const { event, start, end } = occurrence
  const cat = EVENT_CATEGORIES.find((c) => c.id === event.categoryId)
  const roles = Object.entries(event.roles ?? {}).filter(([, uid]) => uid)
  return (
    <li>
      <button onClick={onClick} className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left">
        <span className="w-12 shrink-0 text-xs text-muted">
          {event.allDay ? 'todo el día' : fmtDate(start, 'HH:mm')}
          {end && !event.allDay && <br />}
          {end && !event.allDay && fmtDate(end, 'HH:mm')}
        </span>
        <div className="flex-1">
          <p>
            {cat?.icon} {event.title}
            {event.recurring && <span className="ml-1 text-xs text-muted">↻</span>}
          </p>
          {(event.location || roles.length > 0) && (
            <p className="flex flex-wrap items-center gap-x-2 text-xs text-muted">
              {event.location && (
                <span className="flex items-center gap-0.5">
                  <MapPin size={11} /> {event.location}
                </span>
              )}
              {roles.map(([role, uid]) => (
                <span key={role} className="flex items-center gap-1">
                  {EVENT_ROLES.find((r) => r.id === role)?.label.toLowerCase()} <MemberDot uid={uid} />
                </span>
              ))}
            </p>
          )}
        </div>
      </button>
    </li>
  )
}
