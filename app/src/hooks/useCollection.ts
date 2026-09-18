import { onSnapshot, type DocumentData, type Query } from 'firebase/firestore'
import { useEffect, useState } from 'react'

// Callers must memoize `query` (useMemo) so the listener isn't recreated on every render.
export function useCollection<T extends { id: string }>(query: Query<DocumentData> | null) {
  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!query) {
      setData([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    return onSnapshot(
      query,
      (snap) => {
        setData(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T))
        setLoading(false)
      },
      (err) => {
        console.error('useCollection', err)
        setError(err)
        setLoading(false)
      },
    )
  }, [query])

  return { data, loading, error }
}
