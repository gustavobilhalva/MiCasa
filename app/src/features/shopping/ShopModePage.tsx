import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { archiveChecked } from './api'
import { useProducts, useShoppingList } from './hooks'
import { ShoppingItemRow } from './ShoppingItemRow'

export function ShopModePage() {
  const { household } = useRequiredHousehold()
  const { sections, pendingCount, checkedCount } = useShoppingList()
  const { data: products } = useProducts()
  const productsById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products])
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const finish = async () => {
    await archiveChecked(household.id)
    navigate('/super')
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-white text-black">
      <header className="flex min-h-14 items-center justify-between border-b border-neutral-200 px-4">
        <span className="text-lg font-semibold">
          {pendingCount === 0 ? 'Todo listo' : `Faltan ${pendingCount}`}
        </span>
        <button onClick={() => navigate('/super')} aria-label="Salir del modo compra" className="flex size-11 items-center justify-center">
          <X size={26} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto pb-28">
        {sections.map(({ sector, items }) => {
          const pending = items.filter((i) => i.status === 'pending')
          const isCollapsed = collapsed.has(sector.id) || pending.length === 0
          return (
            <section key={sector.id}>
              <button
                onClick={() => toggle(sector.id)}
                className="flex min-h-12 w-full items-center justify-between bg-neutral-100 px-4 text-sm font-semibold uppercase tracking-wide text-neutral-600"
              >
                <span>
                  {sector.icon} {sector.name}
                  {pending.length === 0 && <span className="ml-2 normal-case text-green-600">✓</span>}
                </span>
                {isCollapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
              </button>
              {!isCollapsed && (
                <ul className="divide-y divide-neutral-200">
                  {pending.map((item) => (
                    <ShoppingItemRow
                      key={item.id}
                      item={item}
                      product={item.productId ? productsById.get(item.productId) : undefined}
                      large
                    />
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-white p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          onClick={finish}
          className="min-h-14 w-full rounded-xl bg-green-600 text-lg font-semibold text-white"
        >
          Terminé{checkedCount > 0 ? ` · limpiar ${checkedCount}` : ''}
        </button>
      </div>
    </div>
  )
}
