import { addDays, differenceInCalendarDays, isToday, startOfDay, startOfWeek } from 'date-fns'
import { BellRing, CalendarDays, NotebookPen, Plus, Receipt, ShoppingCart, UtensilsCrossed, Wallet } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sheet } from '../../components/layout/Sheet'
import { TopBar } from '../../components/layout/TopBar'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { fmtDate, money, monthKey } from '../../lib/format'
import { EventRow } from '../calendar/CalendarPage'
import { useUpcomingCare } from '../care/hooks'
import { useOccurrences, usePendingNotes } from '../calendar/hooks'
import { NoteRow, NoteSheet } from '../calendar/NotesPage'
import { EventSheet } from '../calendar/EventSheet'
import { ExpenseSheet } from '../finance/ExpenseSheet'
import { useServiceInstances, useServices } from '../finance/hooks'
import { MemberDot } from '../finance/ui'
import { isoDate } from '../meals/api'
import { useMealPlan, useRecipes } from '../meals/hooks'
import { useShoppingList } from '../shopping/hooks'
import type { Note } from '../../types'

export function TodayPage() {
  const { user, household } = useRequiredHousehold()
  const { pendingCount } = useShoppingList()
  const { data: services } = useServices()
  const { data: instances } = useServiceInstances(monthKey(new Date()))
  const today = useMemo(() => startOfDay(new Date()), [])
  const dayAfter = useMemo(() => addDays(today, 2), [today])
  const { occurrences } = useOccurrences(today, dayAfter)
  const { data: notes } = usePendingNotes()
  const plan = useMealPlan(startOfWeek(today, { weekStartsOn: 1 }))
  const { data: recipes } = useRecipes()
  const care = useUpcomingCare(14)
  const [menu, setMenu] = useState(false)
  const [sheet, setSheet] = useState<'expense' | 'note' | 'event' | null>(null)
  const [editingNote, setEditingNote] = useState<Note | null>(null)
  const firstName = user.displayName?.split(' ')[0] ?? 'Hola'

  const upcoming = useMemo(() => {
    const byId = new Map(services.map((s) => [s.id, s]))
    return instances
      .filter((i) => i.status === 'pending')
      .map((i) => ({ instance: i, service: byId.get(i.serviceId), days: differenceInCalendarDays(i.dueDate.toDate(), today) }))
      .filter((r) => r.service && r.days <= 7)
      .sort((a, b) => a.days - b.days)
  }, [instances, services, today])

  const visibleNotes = useMemo(() => notes.filter((n) => n.date.toDate() < dayAfter), [notes, dayAfter])
  const todayOcc = occurrences.filter((o) => isToday(o.start))
  const tomorrowOcc = occurrences.filter((o) => !isToday(o.start))

  const todayMeals = plan?.slots?.[isoDate(today)]
  const mealName = (e?: { recipeId?: string; freeText?: string }) => (e?.recipeId ? recipes.find((r) => r.id === e.recipeId)?.name : e?.freeText)
  const lunch = mealName(todayMeals?.lunch)
  const dinner = mealName(todayMeals?.dinner)

  const empty = upcoming.length === 0 && care.length === 0 && todayOcc.length === 0 && tomorrowOcc.length === 0 && visibleNotes.length === 0 && !lunch && !dinner

  return (
    <>
      <TopBar title="Hoy" right={<span className="text-sm capitalize text-muted">{fmtDate(today, 'EEEE d MMM')}</span>} />
      <main className="flex flex-col gap-4 px-4 py-4 pb-28">
        <p className="text-muted">
          Hola, {firstName}. Estás en <strong className="text-ink">{household.name}</strong>.
        </p>

        {(todayOcc.length > 0 || tomorrowOcc.length > 0) && (
          <Section icon={<CalendarDays size={14} />} title="Agenda" to="/agenda">
            {todayOcc.length > 0 && (
              <ul className="divide-y divide-line">
                {todayOcc.map((o) => (
                  <EventRow key={o.key} occurrence={o} />
                ))}
              </ul>
            )}
            {tomorrowOcc.length > 0 && (
              <>
                <p className="px-4 pt-2 text-[10px] font-semibold uppercase text-muted">Mañana</p>
                <ul className="divide-y divide-line">
                  {tomorrowOcc.map((o) => (
                    <EventRow key={o.key} occurrence={o} />
                  ))}
                </ul>
              </>
            )}
          </Section>
        )}

        {visibleNotes.length > 0 && (
          <Section icon={<NotebookPen size={14} />} title="Notas" to="/notas">
            <ul className="divide-y divide-line">
              {visibleNotes.map((n) => (
                <NoteRow key={n.id} note={n} onEdit={() => setEditingNote(n)} />
              ))}
            </ul>
          </Section>
        )}

        {upcoming.length > 0 && (
          <Section icon={<Receipt size={14} />} title="Vencimientos" to="/gastos/servicios">
            <ul className="divide-y divide-line">
              {upcoming.map(({ instance, service, days }) => (
                <li key={instance.id}>
                  <Link to="/gastos/servicios" className="flex min-h-12 items-center gap-3 px-4">
                    <MemberDot uid={instance.assigneeUid} />
                    <span className="flex-1">{service!.name}</span>
                    <span className={`text-sm ${days < 0 ? 'text-danger' : days <= 3 ? 'text-warn' : 'text-muted'}`}>
                      {days < 0 ? 'Vencido' : days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : fmtDate(instance.dueDate.toDate())}
                    </span>
                    {service!.estimatedAmount && <span className="text-sm text-muted">~{money(service!.estimatedAmount)}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {care.length > 0 && (
          <Section icon={<BellRing size={14} />} title="Próximos vencimientos" to="/tramites">
            <ul className="divide-y divide-line">
              {care.map((c) => (
                <li key={c.key}>
                  <Link to={c.to} className="flex min-h-12 items-center gap-3 px-4">
                    {c.assigneeUid !== undefined && <MemberDot uid={c.assigneeUid} />}
                    <span className="flex-1 text-sm">{c.label}</span>
                    <span className={`text-sm ${c.days < 0 ? 'text-danger' : c.days <= 3 ? 'text-warn' : 'text-muted'}`}>
                      {c.days < 0 ? 'Vencido' : c.days === 0 ? 'Hoy' : c.days === 1 ? 'Mañana' : fmtDate(c.dueAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {(lunch || dinner) && (
          <Section icon={<UtensilsCrossed size={14} />} title="Menú de hoy" to="/menus">
            <div className="grid grid-cols-2 divide-x divide-line">
              <div className="p-3">
                <p className="text-[10px] uppercase text-muted">Almuerzo</p>
                <p className="text-sm">{lunch ?? '—'}</p>
              </div>
              <div className="p-3">
                <p className="text-[10px] uppercase text-muted">Cena</p>
                <p className="text-sm">{dinner ?? '—'}</p>
              </div>
            </div>
          </Section>
        )}

        <Link to="/super" className="flex items-center gap-3 rounded-xl border border-line bg-card p-4 active:bg-surface">
          <ShoppingCart className="text-accent" />
          <div className="flex-1">
            <p className="font-medium">Lista del súper</p>
            <p className="text-sm text-muted">
              {pendingCount === 0 ? 'Nada pendiente' : `${pendingCount} producto${pendingCount === 1 ? '' : 's'} por comprar`}
            </p>
          </div>
        </Link>

        {empty && <p className="pt-4 text-center text-sm text-muted">Nada más pendiente para hoy.</p>}
      </main>

      <button
        onClick={() => setMenu(true)}
        aria-label="Acciones rápidas"
        className="fixed bottom-20 right-4 z-20 flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-lg md:bottom-8"
      >
        <Plus size={28} />
      </button>

      <Sheet open={menu} onClose={() => setMenu(false)} title="¿Qué querés cargar?">
        <div className="grid grid-cols-3 gap-3">
          <QuickAction icon={<Wallet />} label="Gasto" onClick={() => { setMenu(false); setSheet('expense') }} />
          <QuickAction icon={<NotebookPen />} label="Nota" onClick={() => { setMenu(false); setSheet('note') }} />
          <QuickAction icon={<CalendarDays />} label="Evento" onClick={() => { setMenu(false); setSheet('event') }} />
        </div>
      </Sheet>

      <ExpenseSheet open={sheet === 'expense'} onClose={() => setSheet(null)} />
      <NoteSheet open={sheet === 'note'} onClose={() => setSheet(null)} note={null} />
      <EventSheet open={sheet === 'event'} onClose={() => setSheet(null)} />
      <NoteSheet open={editingNote !== null} onClose={() => setEditingNote(null)} note={editingNote} />
    </>
  )
}

function Section({ icon, title, to, children }: { icon: React.ReactNode; title: string; to: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-card">
      <Link to={to} className="flex items-center gap-2 px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-muted">
        {icon} {title}
      </Link>
      {children}
    </section>
  )
}

function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border border-line bg-surface text-accent">
      {icon}
      <span className="text-sm text-ink">{label}</span>
    </button>
  )
}
