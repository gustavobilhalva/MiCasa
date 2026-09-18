import { ChevronRight, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { normalize } from '../../lib/text'
import type { Product } from '../../types'
import { ProductSheet } from './ProductSheet'

export function CatalogTab({ products }: { products: Product[] }) {
  const { storeSectors } = useRequiredHousehold()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Product | null>(null)

  const filtered = useMemo(() => {
    const q = normalize(search)
    return q ? products.filter((p) => p.nameNormalized.includes(q)) : products
  }, [products, search])

  const grouped = useMemo(() => {
    const map = new Map<string, Product[]>()
    for (const p of filtered) {
      const list = map.get(p.storeCategoryId) ?? []
      list.push(p)
      map.set(p.storeCategoryId, list)
    }
    return storeSectors
      .map((sector) => ({ sector, products: map.get(sector.id) ?? [] }))
      .filter((g) => g.products.length > 0)
  }, [filtered, storeSectors])

  return (
    <>
      <div className="sticky top-14 z-10 border-b border-line bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar en el catálogo"
            className="min-h-12 w-full rounded-xl border border-line bg-card pl-10 pr-4 text-base placeholder:text-muted focus:border-accent focus:outline-none"
          />
        </div>
      </div>

      {products.length === 0 ? (
        <p className="px-6 py-16 text-center text-sm text-muted">
          El catálogo se arma solo a medida que agregás productos a la lista.
        </p>
      ) : grouped.length === 0 ? (
        <p className="px-6 py-16 text-center text-sm text-muted">Nada coincide con "{search}".</p>
      ) : (
        <div className="pb-24">
          {grouped.map(({ sector, products }) => (
            <section key={sector.id}>
              <h2 className="sticky top-[7.25rem] z-[5] bg-surface px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                {sector.icon} {sector.name}
              </h2>
              <ul className="divide-y divide-line bg-card">
                {products.map((p) => (
                  <li key={p.id}>
                    <button
                      onClick={() => setSelected(p)}
                      className="flex min-h-14 w-full items-center gap-3 px-4 text-left"
                    >
                      <div className="flex-1">
                        <p>
                          {p.name}
                          {p.defaultQty && <span className="ml-2 text-sm text-muted">{p.defaultQty}</span>}
                        </p>
                        {(p.preferredBrand || p.notes) && (
                          <p className="text-xs text-muted">
                            {p.preferredBrand && <span>{p.preferredBrand}</span>}
                            {p.preferredBrand && p.notes && ' · '}
                            {p.notes}
                          </p>
                        )}
                      </div>
                      <ChevronRight size={18} className="text-muted" />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <ProductSheet product={selected} onClose={() => setSelected(null)} />
    </>
  )
}
