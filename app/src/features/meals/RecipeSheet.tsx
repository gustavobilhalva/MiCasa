import { Plus, X } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { Sheet } from '../../components/layout/Sheet'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { normalize } from '../../lib/text'
import type { Recipe, RecipeIngredient } from '../../types'
import { Field } from '../finance/ui'
import { parseItemText } from '../shopping/parseItem'
import { useProducts } from '../shopping/hooks'
import { deleteRecipe, saveRecipe } from './api'

export function RecipeSheet({ open, onClose, recipe }: { open: boolean; onClose: () => void; recipe: Recipe | null }) {
  return (
    <Sheet open={open} onClose={onClose} title={recipe ? 'Editar receta' : 'Nueva receta'}>
      {open && <RecipeForm key={recipe?.id ?? 'new'} recipe={recipe} onClose={onClose} />}
    </Sheet>
  )
}

function RecipeForm({ recipe, onClose }: { recipe: Recipe | null; onClose: () => void }) {
  const { household, user } = useRequiredHousehold()
  const { data: products } = useProducts()
  const [name, setName] = useState(recipe?.name ?? '')
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(recipe?.ingredients ?? [])
  const [ingText, setIngText] = useState('')
  const [servings, setServings] = useState(recipe?.servings ? String(recipe.servings) : '')
  const [prep, setPrep] = useState(recipe?.prepMinutes ? String(recipe.prepMinutes) : '')
  const [notes, setNotes] = useState(recipe?.notes ?? '')
  const [busy, setBusy] = useState(false)

  const parsed = parseItemText(ingText)
  const norm = normalize(parsed.name)
  const suggestions = useMemo(
    () => (norm.length < 2 ? [] : products.filter((p) => p.nameNormalized.includes(norm)).slice(0, 4)),
    [products, norm],
  )

  const addIngredient = (productId?: string, productName?: string) => {
    const n = productName ?? parsed.name.trim()
    if (!n) return
    setIngredients([...ingredients, { name: n, qty: parsed.qty, productId }])
    setIngText('')
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      await saveRecipe(
        household.id,
        user.uid,
        {
          name: name.trim(),
          ingredients,
          servings: Number(servings) || undefined,
          prepMinutes: Number(prep) || undefined,
          notes: notes.trim() || undefined,
        },
        recipe?.id,
      )
      onClose()
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Nombre">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Milanesas con puré" required autoFocus />
      </Field>

      <Field label="Ingredientes" hint='Escribí y tocá +. Podés poner cantidad: "papas 1kg"'>
        <div className="flex gap-2">
          <Input
            value={ingText}
            onChange={(e) => setIngText(e.target.value)}
            placeholder="Ingrediente"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addIngredient()
              }
            }}
          />
          <button type="button" onClick={() => addIngredient()} aria-label="Agregar ingrediente" className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-accent text-white">
            <Plus size={22} />
          </button>
        </div>
        {suggestions.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {suggestions.map((p) => (
              <button key={p.id} type="button" onClick={() => addIngredient(p.id, p.name)} className="min-h-9 rounded-full border border-line bg-card px-3 text-sm">
                {p.name} <span className="text-muted">· catálogo</span>
              </button>
            ))}
          </div>
        )}
        {ingredients.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {ingredients.map((ing, i) => (
              <li key={i} className="flex items-center gap-1 rounded-full bg-accent/10 py-1 pl-3 pr-1 text-sm">
                {ing.name}
                {ing.qty && <span className="text-muted">{ing.qty}</span>}
                <button type="button" onClick={() => setIngredients(ingredients.filter((_, j) => j !== i))} aria-label={`Quitar ${ing.name}`} className="flex size-7 items-center justify-center rounded-full">
                  <X size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Porciones">
          <Input inputMode="numeric" value={servings} onChange={(e) => setServings(e.target.value)} />
        </Field>
        <Field label="Minutos">
          <Input inputMode="numeric" value={prep} onChange={(e) => setPrep(e.target.value)} />
        </Field>
      </div>
      <Field label="Notas">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" />
      </Field>

      <Button type="submit" disabled={busy}>
        Guardar
      </Button>
      {recipe && (
        <Button type="button" variant="ghost" className="text-danger" onClick={() => deleteRecipe(household.id, recipe.id).then(onClose)}>
          Eliminar receta
        </Button>
      )}
    </form>
  )
}
