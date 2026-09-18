import { ShoppingBag } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { TopBar } from '../../components/layout/TopBar'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { AddItemBar } from './AddItemBar'
import { archiveChecked } from './api'
import { PantryTab } from '../meals/PantryTab'
import { CatalogTab } from './CatalogTab'
import { useProducts, useShoppingList } from './hooks'
import { ShoppingItemRow } from './ShoppingItemRow'

type Tab = 'list' | 'catalog' | 'pantry'

export function ShoppingPage() {
  const { household } = useRequiredHousehold()
  const { sections, pendingCount, checkedCount, loading } = useShoppingList()
  const { data: products } = useProducts()
  const [tab, setTab] = useState<Tab>('list')

  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])

  return (
    <>
      <TopBar
        title="Súper"
        right={
          <>
            <Tabs value={tab} onChange={setTab} />
            {tab === 'list' && pendingCount > 0 && (
              <Link
                to="/super/modo-compra"
                className="flex min-h-10 items-center gap-1.5 rounded-full bg-accent/10 px-3 text-sm font-medium text-accent"
              >
                <ShoppingBag size={16} /> <span className="hidden sm:inline">Modo compra</span>
              </Link>
            )}
          </>
        }
      />

      {tab === 'catalog' ? (
        <CatalogTab products={products} />
      ) : tab === 'pantry' ? (
        <PantryTab />
      ) : (
        <>
          <AddItemBar />
          {loading ? (
            <p className="p-6 text-center text-muted">Cargando…</p>
          ) : sections.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <ShoppingBag size={40} className="text-muted" />
              <p className="font-medium">La lista está vacía</p>
              <p className="text-sm text-muted">Escribí un producto arriba para empezar.</p>
            </div>
          ) : (
            <div className="pb-24">
              {sections.map(({ sector, items }) => (
                <section key={sector.id}>
                  <h2 className="sticky top-[7.25rem] z-[5] bg-surface px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted">
                    {sector.icon} {sector.name}
                  </h2>
                  <ul className="divide-y divide-line bg-card">
                    {items.map((item) => (
                      <ShoppingItemRow
                        key={item.id}
                        item={item}
                        product={item.productId ? productsById.get(item.productId) : undefined}
                      />
                    ))}
                  </ul>
                </section>
              ))}

              {checkedCount > 0 && (
                <div className="px-4 pt-6">
                  <button
                    onClick={() => archiveChecked(household.id)}
                    className="min-h-12 w-full rounded-xl border border-line bg-card font-medium text-muted"
                  >
                    Limpiar {checkedCount} tachado{checkedCount === 1 ? '' : 's'}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  )
}

function Tabs({ value, onChange }: { value: Tab; onChange: (t: Tab) => void }) {
  const opts: { id: Tab; label: string }[] = [
    { id: 'list', label: 'Lista' },
    { id: 'catalog', label: 'Catálogo' },
    { id: 'pantry', label: 'Despensa' },
  ]
  return (
    <div role="tablist" className="flex rounded-full border border-line bg-card p-0.5">
      {opts.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={`min-h-9 rounded-full px-2.5 text-sm font-medium ${
            value === o.id ? 'bg-accent text-white' : 'text-muted'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
