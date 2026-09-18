import type { ReactNode } from 'react'

export function TopBar({ title, right }: { title: ReactNode; right?: ReactNode }) {
  return (
    <header className="sticky top-0 z-10 flex min-h-14 items-center justify-between border-b border-line bg-surface/90 px-4 backdrop-blur">
      {typeof title === 'string' ? <h1 className="text-xl font-semibold">{title}</h1> : <div className="flex items-center gap-2">{title}</div>}
      {right && <div className="flex items-center gap-2">{right}</div>}
    </header>
  )
}
