import { collection, orderBy, query, Timestamp, where } from 'firebase/firestore'
import { useMemo } from 'react'
import { useCollection } from '../../hooks/useCollection'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { db } from '../../lib/firebase'
import { expandEvents } from '../../lib/recurrence'
import type { CalendarEvent, Note } from '../../types'

const col = (hid: string, name: string) => collection(db, 'households', hid, name)

export function useOccurrences(rangeStart: Date, rangeEnd: Date) {
  const { household } = useRequiredHousehold()
  const startMs = rangeStart.getTime()
  const endMs = rangeEnd.getTime()

  const singleQuery = useMemo(
    () =>
      query(
        col(household.id, 'events'),
        where('recurring', '==', false),
        where('start', '>=', Timestamp.fromMillis(startMs)),
        where('start', '<', Timestamp.fromMillis(endMs)),
        orderBy('start'),
      ),
    [household.id, startMs, endMs],
  )
  const recurringQuery = useMemo(() => query(col(household.id, 'events'), where('recurring', '==', true)), [household.id])

  const single = useCollection<CalendarEvent>(singleQuery)
  const recurring = useCollection<CalendarEvent>(recurringQuery)

  const occurrences = useMemo(
    () => expandEvents([...single.data, ...recurring.data], new Date(startMs), new Date(endMs)),
    [single.data, recurring.data, startMs, endMs],
  )

  return { occurrences, loading: single.loading || recurring.loading }
}

export function useNotes(from: Date, to: Date) {
  const { household } = useRequiredHousehold()
  const fromMs = from.getTime()
  const toMs = to.getTime()
  const q = useMemo(
    () =>
      query(
        col(household.id, 'notes'),
        where('date', '>=', Timestamp.fromMillis(fromMs)),
        where('date', '<', Timestamp.fromMillis(toMs)),
        orderBy('date'),
      ),
    [household.id, fromMs, toMs],
  )
  return useCollection<Note>(q)
}

export function usePendingNotes() {
  const { household } = useRequiredHousehold()
  const q = useMemo(() => query(col(household.id, 'notes'), where('done', '==', false), orderBy('date')), [household.id])
  return useCollection<Note>(q)
}
