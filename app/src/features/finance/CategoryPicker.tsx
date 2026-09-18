import { useMemo, useState } from 'react'
import type { Category } from '../../types'

interface Props {
  categories: Category[]
  value: string | null
  onChange: (id: string) => void
}

// Selector en dos niveles: grupo (Niños, Deuda, Ocio…) y luego subcategoría.
export function CategoryPicker({ categories, value, onChange }: Props) {
  const usable = useMemo(() => categories.filter((c) => !c.legacy && !c.hidden && c.group), [categories])
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; name: string; icon?: string; subs: Category[] }>()
    for (const c of usable) {
      const key = c.groupKey ?? c.group!
      if (!map.has(key)) map.set(key, { key, name: c.group!, icon: c.icon, subs: [] })
      map.get(key)!.subs.push(c)
    }
    return [...map.values()]
  }, [usable])

  const selected = usable.find((c) => c.id === value)
  const [openGroup, setOpenGroup] = useState<string | null>(selected?.groupKey ?? null)
  const activeGroup = openGroup ?? selected?.groupKey ?? null
  const subs = groups.find((g) => g.key === activeGroup)?.subs ?? []

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {groups.map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => setOpenGroup(g.key)}
            className={`min-h-10 rounded-full border px-3 text-sm ${g.key === activeGroup ? 'border-accent bg-accent/10 text-accent' : 'border-line bg-card'}`}
          >
            {g.icon} {g.name}
          </button>
        ))}
      </div>
      {subs.length > 0 && (
        <div className="flex flex-wrap gap-2 rounded-xl border border-line p-2">
          {subs.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c.id)}
              className={`min-h-9 rounded-full px-3 text-sm ${c.id === value ? 'bg-accent text-white' : 'bg-surface'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      )}
      {selected && (
        <p className="text-xs text-muted">
          {selected.icon} {selected.group} · <strong className="text-ink">{selected.name}</strong>
        </p>
      )}
    </div>
  )
}

export function categoryLabel(c?: Category) {
  if (!c) return 'Sin categoría'
  return c.group && c.group !== c.name ? `${c.group} · ${c.name}` : c.name
}
