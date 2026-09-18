import { Check, Trash2 } from 'lucide-react'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import type { Product, ShoppingItem } from '../../types'
import { removeItem, toggleItem } from './api'

interface Props {
  item: ShoppingItem
  product?: Product
  large?: boolean
}

export function ShoppingItemRow({ item, product, large = false }: Props) {
  const { household, user, members } = useRequiredHousehold()
  const checked = item.status === 'checked'
  const adder = members.find((m) => m.id === item.addedBy)
  const mutedText = large ? 'text-neutral-500' : 'text-muted'

  return (
    <li className={`flex items-center gap-3 px-4 ${large ? 'min-h-16' : 'min-h-14'}`}>
      <button
        onClick={() => toggleItem(household.id, item, user.uid)}
        aria-label={checked ? `Desmarcar ${item.name}` : `Marcar ${item.name}`}
        aria-pressed={checked}
        className={`flex size-11 shrink-0 items-center justify-center rounded-full border-2 transition ${
          checked ? 'border-ok bg-ok text-white' : large ? 'border-neutral-300 bg-white' : 'border-line bg-card'
        }`}
      >
        {checked && <Check size={22} strokeWidth={3} />}
      </button>
      <button
        onClick={() => toggleItem(household.id, item, user.uid)}
        className={`flex min-h-11 flex-1 flex-col justify-center text-left ${checked ? `${mutedText} line-through` : ''}`}
      >
        <span className={large ? 'text-xl' : 'text-base'}>
          {item.name}
          {item.qty && <span className={`ml-2 text-sm ${mutedText}`}>{item.qty}</span>}
        </span>
        {(product?.preferredBrand || product?.notes) && (
          <span className={`text-xs ${mutedText} ${large ? 'text-sm' : ''}`}>
            {product.preferredBrand}
            {product.preferredBrand && product.notes && ' · '}
            {product.notes}
          </span>
        )}
      </button>
      {adder && !large && (
        <span
          className="flex size-6 items-center justify-center rounded-full text-[10px] font-semibold text-white"
          style={{ backgroundColor: adder.color }}
          title={`Agregado por ${adder.displayName}`}
        >
          {adder.displayName.charAt(0)}
        </span>
      )}
      {!large && (
        <button
          onClick={() => removeItem(household.id, item.id)}
          aria-label={`Quitar ${item.name}`}
          className="flex size-11 items-center justify-center text-muted"
        >
          <Trash2 size={18} />
        </button>
      )}
    </li>
  )
}
