import { addDays, addWeeks, isToday, startOfWeek } from 'date-fns'
import { ArrowLeft, BookOpen, Plus, ShoppingCart } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sheet } from '../../components/layout/Sheet'
import { TopBar } from '../../components/layout/TopBar'
import { FoodSwitch } from './FoodSwitch'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { useRequiredHousehold } from '../../hooks/useHousehold'
import { fmtDate } from '../../lib/format'
import { normalize } from '../../lib/text'
import type { MealSlot, Recipe, RecipeIngredient } from '../../types'
import { useProducts } from '../shopping/hooks'
import { addMissingToList, computeMissing, isoDate, setMealSlot, type MissingResult } from './api'
import { useInventory, useMealPlan, useRecipes } from './hooks'
import { RecipeSheet } from './RecipeSheet'

const SLOTS: { id: MealSlot; label: string }[] = [
  { id: 'lunch', label: 'Almuerzo' },
  { id: 'dinner', label: 'Cena' },
]

export function MealsPage() {
  const { household, user, storeSectors } = useRequiredHousehold()
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }))
  const plan = useMealPlan(weekStart)
  const { data: recipes } = useRecipes()
  const { data: products } = useProducts()
  const { data: inventory } = useInventory()
  const [picking, setPicking] = useState<{ date: Date; slot: MealSlot } | null>(null)
  const [missing, setMissing] = useState<{ result: MissingResult; label: string; ref: string } | null>(null)
  const [busy, setBusy] = useState(false)

  const recipesById = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes])
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])

  const ctx = { products, inventory, excludedIngredients: household.settings.excludedIngredients ?? [], storeSectors }

  const checkMissing = async (ingredients: RecipeIngredient[], label: string, ref: string) => {
    setBusy(true)
    try {
      const result = await computeMissing(household.id, ingredients, ctx)
      setMissing({ result, label, ref })
    } finally {
      setBusy(false)
    }
  }

  const weekIngredients = useMemo(() => {
    const out: RecipeIngredient[] = []
    for (const d of days) {
      const entry = plan?.slots?.[isoDate(d)]
      for (const s of SLOTS) {
        const r = entry?.[s.id]?.recipeId ? recipesById.get(entry[s.id]!.recipeId!) : null
        if (r) out.push(...r.ingredients)
      }
    }
    return out
  }, [days, plan, recipesById])

  const confirmAdd = async () => {
    if (!missing) return
    setBusy(true)
    try {
      await addMissingToList(household.id, user.uid, missing.result, missing.ref)
      setMissing(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <TopBar
        title={<FoodSwitch />}
        right={
          <Link to="/menus/recetas" className="flex min-h-10 items-center gap-1 rounded-full bg-accent/10 px-3 text-sm font-medium text-accent">
            <BookOpen size={16} /> Recetas
          </Link>
        }
      />
      <div className="flex items-center justify-between px-4 py-2">
        <button onClick={() => setWeekStart(addWeeks(weekStart, -1))} aria-label="Semana anterior" className="flex size-11 items-center justify-center text-muted">
          ‹
        </button>
        <span className="font-medium">
          Semana del {fmtDate(weekStart, 'd MMM')} al {fmtDate(addDays(weekStart, 6), 'd MMM')}
        </span>
        <button onClick={() => setWeekStart(addWeeks(weekStart, 1))} aria-label="Semana siguiente" className="flex size-11 items-center justify-center text-muted">
          ›
        </button>
      </div>

      {weekIngredients.length > 0 && (
        <div className="px-4 pb-3">
          <Button variant="secondary" className="w-full" disabled={busy} onClick={() => checkMissing(weekIngredients, 'toda la semana', `week_${isoDate(weekStart)}`)}>
            <ShoppingCart size={18} /> Agregar faltantes de la semana a la lista
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2 px-4 pb-28">
        {days.map((d) => {
          const entry = plan?.slots?.[isoDate(d)]
          return (
            <section key={d.toISOString()} className={`rounded-xl border bg-card ${isToday(d) ? 'border-accent' : 'border-line'}`}>
              <h2 className={`px-3 pt-2 text-xs font-semibold uppercase tracking-wide ${isToday(d) ? 'text-accent' : 'text-muted'}`}>
                {fmtDate(d, 'EEEE d')}
              </h2>
              <div className="grid grid-cols-2 divide-x divide-line">
                {SLOTS.map((s) => {
                  const e = entry?.[s.id]
                  const recipe = e?.recipeId ? recipesById.get(e.recipeId) : null
                  return (
                    <div key={s.id} className="flex min-h-16 flex-col p-2">
                      <span className="text-[10px] uppercase text-muted">{s.label}</span>
                      {e ? (
                        <div className="flex flex-1 items-start gap-1">
                          <button onClick={() => setPicking({ date: d, slot: s.id })} className="flex-1 text-left text-sm">
                            {recipe?.name ?? e.freeText}
                          </button>
                          {recipe && recipe.ingredients.length > 0 && (
                            <button
                              onClick={() => checkMissing(recipe.ingredients, recipe.name, recipe.id)}
                              aria-label={`Agregar faltantes de ${recipe.name}`}
                              className="flex size-8 shrink-0 items-center justify-center rounded-full text-accent"
                              disabled={busy}
                            >
                              <ShoppingCart size={16} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <button onClick={() => setPicking({ date: d, slot: s.id })} className="flex flex-1 items-center justify-center text-muted">
                          <Plus size={18} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </section>
          )
        })}
      </div>

      <Sheet open={picking !== null} onClose={() => setPicking(null)} title={picking ? `${SLOTS.find((s) => s.id === picking.slot)?.label} · ${fmtDate(picking.date, 'EEEE d')}` : ''}>
        {picking && (
          <MealPicker
            recipes={recipes}
            current={plan?.slots?.[isoDate(picking.date)]?.[picking.slot]}
            onPick={async (entry) => {
              await setMealSlot(household.id, user.uid, weekStart, picking.date, picking.slot, entry)
              setPicking(null)
            }}
          />
        )}
      </Sheet>

      <Sheet open={missing !== null} onClose={() => setMissing(null)} title={missing ? `Faltantes · ${missing.label}` : ''}>
        {missing && (
          <div className="flex flex-col gap-3">
            {missing.result.toAdd.length > 0 ? (
              <>
                <p className="text-sm text-muted">Se agregan a la lista del súper:</p>
                <ul className="flex flex-wrap gap-2">
                  {missing.result.toAdd.map((t, i) => (
                    <li key={i} className="rounded-full bg-accent/10 px-3 py-1 text-sm">
                      {t.product?.name ?? t.ingredient.name}
                      {t.ingredient.qty && <span className="text-muted"> {t.ingredient.qty}</span>}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm">No falta nada para esto.</p>
            )}
            {missing.result.alreadyListed.length > 0 && (
              <p className="text-xs text-muted">Ya en la lista: {missing.result.alreadyListed.map((i) => i.name).join(', ')}</p>
            )}
            {missing.result.inPantry.length > 0 && (
              <p className="text-xs text-muted">En casa: {missing.result.inPantry.map((i) => i.name).join(', ')}</p>
            )}
            {missing.result.excluded.length > 0 && (
              <p className="text-xs text-warn">Omitidos por preferencias: {missing.result.excluded.map((i) => i.name).join(', ')}</p>
            )}
            {missing.result.toAdd.length > 0 && (
              <Button onClick={confirmAdd} disabled={busy}>
                Agregar {missing.result.toAdd.length} a la lista
              </Button>
            )}
          </div>
        )}
      </Sheet>
    </>
  )
}

function MealPicker({ recipes, current, onPick }: { recipes: Recipe[]; current?: { recipeId?: string; freeText?: string }; onPick: (e: { recipeId?: string; freeText?: string } | null) => void }) {
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const norm = normalize(search)
  const filtered = useMemo(() => {
    const list = norm ? recipes.filter((r) => r.nameNormalized.includes(norm)) : recipes
    return [...list].sort((a, b) => (b.lastPlannedAt?.toMillis() ?? 0) - (a.lastPlannedAt?.toMillis() ?? 0))
  }, [recipes, norm])

  return (
    <div className="flex flex-col gap-3">
      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar receta o escribir algo libre" autoFocus />
      {search.trim() && (
        <button onClick={() => onPick({ freeText: search.trim() })} className="min-h-11 rounded-xl border border-dashed border-line px-3 text-left text-sm">
          Usar "{search.trim()}" como texto libre
        </button>
      )}
      <ul className="max-h-72 divide-y divide-line overflow-y-auto rounded-xl border border-line">
        {filtered.map((r) => (
          <li key={r.id}>
            <button onClick={() => onPick({ recipeId: r.id })} className={`flex min-h-12 w-full items-center px-3 text-left text-sm ${current?.recipeId === r.id ? 'text-accent' : ''}`}>
              <span className="flex-1">{r.name}</span>
              <span className="text-xs text-muted">{r.ingredients.length} ingr.</span>
            </button>
          </li>
        ))}
        {filtered.length === 0 && <li className="px-3 py-4 text-center text-sm text-muted">Sin recetas. Creá una abajo.</li>}
      </ul>
      <div className="flex gap-2">
        <Button variant="secondary" className="flex-1" onClick={() => setCreating(true)}>
          <Plus size={16} /> Nueva receta
        </Button>
        {current && (
          <Button variant="ghost" className="text-danger" onClick={() => onPick(null)}>
            Vaciar
          </Button>
        )}
      </div>
      <RecipeSheet open={creating} onClose={() => setCreating(false)} recipe={null} />
    </div>
  )
}

export function RecipesPage() {
  const { data: recipes } = useRecipes()
  const [editing, setEditing] = useState<Recipe | null | 'new'>(null)
  const [search, setSearch] = useState('')
  const norm = normalize(search)
  const filtered = norm ? recipes.filter((r) => r.nameNormalized.includes(norm)) : recipes

  return (
    <>
      <TopBar
        title="Recetas"
        right={
          <Link to="/menus" className="flex min-h-10 items-center gap-1 text-sm text-muted">
            <ArrowLeft size={16} /> Menús
          </Link>
        }
      />
      <div className="px-4 py-3">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar receta" />
      </div>
      {filtered.length === 0 ? (
        <p className="px-6 py-12 text-center text-sm text-muted">Todavía no hay recetas. Tocá + para crear la primera.</p>
      ) : (
        <ul className="divide-y divide-line bg-card pb-28">
          {filtered.map((r) => (
            <li key={r.id}>
              <button onClick={() => setEditing(r)} className="flex min-h-14 w-full flex-col justify-center px-4 text-left">
                <span>{r.name}</span>
                <span className="text-xs text-muted">
                  {r.ingredients.map((i) => i.name).join(', ') || 'Sin ingredientes'}
                  {r.timesPlanned > 0 && ` · planificada ${r.timesPlanned}×`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <button
        onClick={() => setEditing('new')}
        aria-label="Nueva receta"
        className="fixed bottom-20 right-4 z-20 flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-lg md:bottom-8"
      >
        <Plus size={28} />
      </button>
      <RecipeSheet open={editing !== null} onClose={() => setEditing(null)} recipe={editing === 'new' ? null : editing} />
    </>
  )
}
