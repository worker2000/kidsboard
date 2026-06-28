'use client'

import { useState } from 'react'
import { useStore } from '@/data/store'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Modal from '@/components/ui/Modal'
import Input, { Textarea } from '@/components/ui/Input'
import Badge from '@/components/ui/Badge'
import Empty from '@/components/ui/Empty'
import { Plus, Trash2, Clock, Users, Link as LinkIcon, ChevronDown, ChevronUp, X, UtensilsCrossed, ShoppingCart, Download, CalendarPlus } from 'lucide-react'
import { cn, CATEGORY_LABELS, MEAL_EMOJIS } from '@/lib/utils'
import { showConfirm } from '@/lib/confirm'
import { toast } from '@/lib/toast'
import type { Recipe, RecipeIngredient, MealCategory, ShoppingList } from '@/data/models'
import { v4 as uuid } from 'uuid'
import { format } from 'date-fns'

const MEAL_TYPES: MealCategory[] = ['breakfast', 'lunch', 'dinner', 'snack']

export default function RecipesModule() {
  const { recipes, meals, shoppingLists, addRecipe, updateRecipe, deleteRecipe, addMeal, addMealPlan, addShoppingList, addShoppingItem } = useStore()
  const [showModal, setShowModal] = useState(false)
  const [addToListRecipe, setAddToListRecipe] = useState<Recipe | null>(null)
  const [addToPlanRecipe, setAddToPlanRecipe] = useState<Recipe | null>(null)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)
  const [showImportModal, setShowImportModal] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filtered = recipes.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    r.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))
  )

  const handleDelete = async (id: string) => {
    if (await showConfirm('Rezept wirklich löschen?')) deleteRecipe(id)
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Rezepte</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowImportModal(true)}>
            <Download className="w-4 h-4" /> URL
          </Button>
          <Button size="sm" onClick={() => { setEditingRecipe(null); setShowModal(true) }}>
            <Plus className="w-4 h-4" /> Rezept
          </Button>
        </div>
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Rezepte suchen..."
        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
      />

      {filtered.length === 0 ? (
        <Empty icon="📖" title="Keine Rezepte" description="Füge dein erstes Rezept hinzu" />
      ) : (
        <div className="space-y-3">
          {filtered.map((recipe) => (
            <Card key={recipe.id} noPadding>
              <button
                className="w-full text-left p-4"
                onClick={() => setExpandedId(expandedId === recipe.id ? null : recipe.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800">{recipe.title}</p>
                    {recipe.description && (
                      <p className="text-sm text-slate-500 mt-0.5 line-clamp-1">{recipe.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {recipe.prepTime && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="w-3 h-3" /> Vorbereitung: {recipe.prepTime} Min.
                        </span>
                      )}
                      {recipe.cookTime && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="w-3 h-3" /> Zubereitung: {recipe.cookTime} Min.
                        </span>
                      )}
                      {recipe.servings && (
                        <span className="flex items-center gap-1 text-xs text-slate-400">
                          <Users className="w-3 h-3" /> {recipe.servings} Portionen
                        </span>
                      )}
                    </div>
                    {recipe.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {recipe.tags.map((t) => (
                          <span key={t} className="text-xs bg-lime-50 text-lime-700 px-2 py-0.5 rounded-lg">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  {expandedId === recipe.id
                    ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
                    : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />
                  }
                </div>
              </button>

              {expandedId === recipe.id && (
                <div className="border-t border-slate-50 px-4 pb-4 space-y-4">
                  {recipe.sourceUrl && (
                    <a
                      href={recipe.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-sm text-primary-600 hover:underline mt-3"
                    >
                      <LinkIcon className="w-3.5 h-3.5" /> Originalrezept
                    </a>
                  )}

                  {recipe.ingredients.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-slate-700 mb-2">Zutaten</p>
                      <div className="space-y-1">
                        {recipe.ingredients.map((ing) => (
                          <div key={ing.id} className="flex items-baseline gap-2 text-sm">
                            <span className="text-slate-500 min-w-[60px] text-right">
                              {ing.amount && `${ing.amount} ${ing.unit || ''}`}
                            </span>
                            <span className="text-slate-800">{ing.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {recipe.steps.length > 0 && (
                    <div>
                      <p className="text-sm font-semibold text-slate-700 mb-2">Zubereitung</p>
                      <ol className="space-y-2">
                        {recipe.steps.map((step, i) => (
                          <li key={i} className="flex gap-3 text-sm">
                            <span className="flex-shrink-0 w-5 h-5 bg-primary-100 text-primary-700 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">
                              {i + 1}
                            </span>
                            <span className="text-slate-700">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-slate-50 flex-wrap">
                    <button
                      onClick={() => { setEditingRecipe(recipe); setShowModal(true) }}
                      className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-50"
                    >
                      Bearbeiten
                    </button>
                    <button
                      onClick={() => setAddToPlanRecipe(recipe)}
                      className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 px-2 py-1 rounded-lg hover:bg-orange-50"
                    >
                      <CalendarPlus className="w-3.5 h-3.5" /> Zum Essensplan
                    </button>
                    {recipe.ingredients.length > 0 && (
                      <button
                        onClick={() => setAddToListRecipe(recipe)}
                        className="flex items-center gap-1 text-xs text-sky-600 hover:text-sky-700 px-2 py-1 rounded-lg hover:bg-sky-50"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" /> Zutaten einkaufen
                      </button>
                    )}
                    {!meals.some((m) => m.recipeId === recipe.id) && (
                      <button
                        onClick={() => {
                          addMeal({
                            name: recipe.title,
                            category: 'lunch' as MealCategory,
                            tags: recipe.tags,
                            favorite: false,
                            notes: recipe.description,
                            image: recipe.image,
                            recipeId: recipe.id,
                          })
                          toast.success(`"${recipe.title}" zu Gerichten hinzugefügt`)
                        }}
                        className="flex items-center gap-1 text-xs text-lime-600 hover:text-lime-700 px-2 py-1 rounded-lg hover:bg-lime-50"
                      >
                        <UtensilsCrossed className="w-3.5 h-3.5" /> Als Gericht übernehmen
                      </button>
                    )}
                    {meals.some((m) => m.recipeId === recipe.id) && (
                      <span className="flex items-center gap-1 text-xs text-lime-500 px-2 py-1">
                        <UtensilsCrossed className="w-3.5 h-3.5" /> Gericht vorhanden
                      </span>
                    )}
                    <button
                      onClick={() => handleDelete(recipe.id)}
                      className="text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 ml-auto"
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {showModal && (
        <RecipeModal
          recipe={editingRecipe}
          onSave={(data) => {
            if (editingRecipe) updateRecipe(editingRecipe.id, data)
            else addRecipe(data as Omit<Recipe, 'id' | 'createdAt'>)
            setShowModal(false)
          }}
          onClose={() => setShowModal(false)}
        />
      )}

      {showImportModal && (
        <RecipeImportModal
          onImport={(data) => {
            addRecipe(data as Omit<Recipe, 'id' | 'createdAt'>)
            setShowImportModal(false)
            toast.success(`"${data.title}" importiert`)
          }}
          onClose={() => setShowImportModal(false)}
        />
      )}

      {addToPlanRecipe && (
        <AddToPlanModal
          recipe={addToPlanRecipe}
          onAdd={(date, mealType) => {
            addMealPlan({
              date,
              mealType,
              mealId: undefined,
              customName: addToPlanRecipe.title,
            })
            toast.success(`"${addToPlanRecipe.title}" am ${new Date(date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })} eingeplant`)
            setAddToPlanRecipe(null)
          }}
          onClose={() => setAddToPlanRecipe(null)}
        />
      )}

      {addToListRecipe && (
        <AddToShoppingListModal
          recipe={addToListRecipe}
          lists={shoppingLists}
          onAdd={async (listId, newListName) => {
            let targetId = listId
            if (!listId && newListName) {
              try {
                const created = await addShoppingList({ name: newListName, isActive: true })
                targetId = created.id
              } catch {
                return
              }
            }
            if (!targetId) return
            const items = addToListRecipe.ingredients.filter((i) => i.name.trim())
            items.forEach((ing) => {
              addShoppingItem({
                listId: targetId!,
                name: ing.name,
                quantity: [ing.amount, ing.unit].filter(Boolean).join(' ') || undefined,
                checked: false,
              })
            })
            toast.success(`${items.length} Zutaten zur Einkaufsliste hinzugefügt`)
            setAddToListRecipe(null)
          }}
          onClose={() => setAddToListRecipe(null)}
        />
      )}
    </div>
  )
}

function RecipeModal({ recipe, onSave, onClose }: {
  recipe: Recipe | null
  onSave: (data: Partial<Recipe>) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(recipe?.title || '')
  const [description, setDescription] = useState(recipe?.description || '')
  const [sourceUrl, setSourceUrl] = useState(recipe?.sourceUrl || '')
  const [prepTime, setPrepTime] = useState(recipe?.prepTime?.toString() || '')
  const [cookTime, setCookTime] = useState(recipe?.cookTime?.toString() || '')
  const [servings, setServings] = useState(recipe?.servings?.toString() || '')
  const [tags, setTags] = useState(recipe?.tags.join(', ') || '')
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>(
    recipe?.ingredients || [{ id: uuid(), name: '', amount: '', unit: '' }]
  )
  const [steps, setSteps] = useState<string[]>(recipe?.steps || [''])

  const addIngredient = () => setIngredients((prev) => [...prev, { id: uuid(), name: '', amount: '', unit: '' }])
  const removeIngredient = (id: string) => setIngredients((prev) => prev.filter((i) => i.id !== id))
  const updateIngredient = (id: string, field: keyof RecipeIngredient, value: string) =>
    setIngredients((prev) => prev.map((i) => i.id === id ? { ...i, [field]: value } : i))

  const addStep = () => setSteps((prev) => [...prev, ''])
  const removeStep = (idx: number) => setSteps((prev) => prev.filter((_, i) => i !== idx))
  const updateStep = (idx: number, value: string) =>
    setSteps((prev) => prev.map((s, i) => i === idx ? value : s))

  const handleSave = () => {
    if (!title.trim()) return
    onSave({
      title: title.trim(),
      description: description.trim() || undefined,
      sourceUrl: sourceUrl.trim() || undefined,
      prepTime: prepTime ? parseInt(prepTime) : undefined,
      cookTime: cookTime ? parseInt(cookTime) : undefined,
      servings: servings ? parseInt(servings) : undefined,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      ingredients: ingredients.filter((i) => i.name.trim()),
      steps: steps.filter((s) => s.trim()),
    })
  }

  return (
    <Modal open title={recipe ? 'Rezept bearbeiten' : 'Neues Rezept'} onClose={onClose} size="lg">
      <div className="space-y-5">
        <Input label="Titel" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z.B. Spaghetti Bolognese" />
        <Textarea label="Beschreibung (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        <Input label="Quell-URL (optional)" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://..." />
        <div className="grid grid-cols-3 gap-3">
          <Input label="Vorb. (Min)" type="number" value={prepTime} onChange={(e) => setPrepTime(e.target.value)} />
          <Input label="Kochen (Min)" type="number" value={cookTime} onChange={(e) => setCookTime(e.target.value)} />
          <Input label="Portionen" type="number" value={servings} onChange={(e) => setServings(e.target.value)} />
        </div>
        <Input label="Tags (kommagetrennt)" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="z.B. Pasta, Familie" />

        {/* Ingredients */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Zutaten</p>
          <div className="space-y-2">
            {ingredients.map((ing) => (
              <div key={ing.id} className="flex gap-2">
                <input
                  value={ing.amount || ''}
                  onChange={(e) => updateIngredient(ing.id, 'amount', e.target.value)}
                  placeholder="Menge"
                  className="w-16 px-2 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
                <input
                  value={ing.unit || ''}
                  onChange={(e) => updateIngredient(ing.id, 'unit', e.target.value)}
                  placeholder="Einheit"
                  className="w-16 px-2 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
                <input
                  value={ing.name}
                  onChange={(e) => updateIngredient(ing.id, 'name', e.target.value)}
                  placeholder="Zutat"
                  className="flex-1 px-2 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
                <button onClick={() => removeIngredient(ing.id)} className="text-slate-300 hover:text-red-400 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={addIngredient}>
              <Plus className="w-3.5 h-3.5" /> Zutat hinzufügen
            </Button>
          </div>
        </div>

        {/* Steps */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Zubereitung</p>
          <div className="space-y-2">
            {steps.map((step, idx) => (
              <div key={idx} className="flex gap-2">
                <span className="flex-shrink-0 w-6 h-8 flex items-center justify-center text-xs font-bold text-slate-400">{idx + 1}.</span>
                <input
                  value={step}
                  onChange={(e) => updateStep(idx, e.target.value)}
                  placeholder={`Schritt ${idx + 1}...`}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
                />
                <button onClick={() => removeStep(idx)} className="text-slate-300 hover:text-red-400 p-1">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={addStep}>
              <Plus className="w-3.5 h-3.5" /> Schritt hinzufügen
            </Button>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Abbrechen</Button>
          <Button className="flex-1" onClick={handleSave} disabled={!title.trim()}>Speichern</Button>
        </div>
      </div>
    </Modal>
  )
}

// ── AddToPlanModal ────────────────────────────────────────────────────────────

function AddToPlanModal({ recipe, onAdd, onClose }: {
  recipe: Recipe
  onAdd: (date: string, mealType: MealCategory) => void
  onClose: () => void
}) {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [mealType, setMealType] = useState<MealCategory>('lunch')

  return (
    <Modal open title="Zum Essensplan hinzufügen" onClose={onClose}>
      <div className="space-y-4">
        <div className="bg-orange-50 border border-orange-100 rounded-2xl px-4 py-3">
          <p className="text-sm font-semibold text-orange-800">{recipe.title}</p>
          {recipe.description && <p className="text-xs text-orange-600 mt-0.5 line-clamp-2">{recipe.description}</p>}
        </div>

        <Input label="Datum" type="date" value={date} onChange={(e) => setDate(e.target.value)} />

        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Mahlzeit</p>
          <div className="grid grid-cols-2 gap-2">
            {MEAL_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setMealType(type)}
                className={cn(
                  'flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all',
                  mealType === type
                    ? 'border-orange-400 bg-orange-50 text-orange-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300',
                )}
              >
                <span className="text-base">{MEAL_EMOJIS[type]}</span>
                {CATEGORY_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Abbrechen</Button>
          <Button className="flex-1" onClick={() => onAdd(date, mealType)} disabled={!date}>
            <CalendarPlus className="w-4 h-4" /> Einplanen
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── AddToShoppingListModal ────────────────────────────────────────────────────

function AddToShoppingListModal({ recipe, lists, onAdd, onClose }: {
  recipe: Recipe
  lists: ShoppingList[]
  onAdd: (listId: string | null, newListName?: string) => void
  onClose: () => void
}) {
  const activeList = lists.find((l) => l.isActive)
  const [selectedListId, setSelectedListId] = useState(activeList?.id || lists[0]?.id || '')
  const [newListName, setNewListName] = useState('')
  const [createNew, setCreateNew] = useState(lists.length === 0)

  const ingredients = recipe.ingredients.filter((i) => i.name.trim())

  return (
    <Modal open title="Zutaten einkaufen" onClose={onClose}>
      <div className="space-y-4">
        {/* Ingredient preview */}
        <div className="bg-slate-50 rounded-2xl p-3 max-h-40 overflow-y-auto space-y-1">
          <p className="text-xs font-medium text-slate-400 mb-2">{ingredients.length} Zutaten aus &quot;{recipe.title}&quot;</p>
          {ingredients.map((ing) => (
            <div key={ing.id} className="flex items-baseline gap-2 text-sm">
              <span className="text-slate-400 w-16 text-right text-xs flex-shrink-0">
                {[ing.amount, ing.unit].filter(Boolean).join(' ')}
              </span>
              <span className="text-slate-700">{ing.name}</span>
            </div>
          ))}
        </div>

        {!createNew && lists.length > 0 ? (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Zur Liste hinzufügen:</p>
            {lists.map((list) => (
              <button key={list.id} onClick={() => setSelectedListId(list.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all text-left',
                  selectedListId === list.id ? 'border-primary-400 bg-primary-50' : 'border-slate-200 hover:border-slate-300',
                )}>
                <span className="text-lg">🛒</span>
                <span className="font-medium text-slate-800 text-sm flex-1">{list.name}</span>
                {list.isActive && <span className="text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg">Aktiv</span>}
              </button>
            ))}
            <button onClick={() => setCreateNew(true)} className="text-sm text-primary-600 hover:underline px-1">
              + Neue Liste erstellen
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">Neue Einkaufsliste:</p>
            <Input value={newListName} onChange={(e) => setNewListName(e.target.value)} placeholder="z.B. Wocheneinkauf" />
            {lists.length > 0 && (
              <button onClick={() => setCreateNew(false)} className="text-sm text-slate-500 hover:underline">
                Bestehende Liste wählen
              </button>
            )}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Abbrechen</Button>
          <Button
            className="flex-1"
            onClick={() => createNew || lists.length === 0 ? onAdd(null, newListName) : onAdd(selectedListId)}
            disabled={createNew || lists.length === 0 ? !newListName.trim() : !selectedListId}
          >
            <ShoppingCart className="w-4 h-4" /> Hinzufügen
          </Button>
        </div>
      </div>
    </Modal>
  )
}

// ── RecipeImportModal ─────────────────────────────────────────────────────────

function RecipeImportModal({ onImport, onClose }: {
  onImport: (data: Partial<Recipe>) => void
  onClose: () => void
}) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<(Partial<Recipe> & { imageUrl?: string }) | null>(null)

  const handleFetch = async () => {
    if (!url.trim()) return
    setLoading(true); setError(''); setPreview(null)
    try {
      const { api } = await import('@/lib/api')
      const data = await api.recipes.importUrl(url.trim()) as Partial<Recipe> & { imageUrl?: string }
      setPreview(data)
    } catch (e: unknown) {
      setError((e as Error).message || 'Import fehlgeschlagen')
    }
    setLoading(false)
  }

  return (
    <Modal open title="Rezept per URL importieren" onClose={onClose} size="md">
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.chefkoch.de/rezepte/…"
            onKeyDown={(e) => { if (e.key === 'Enter') handleFetch() }}
          />
          <Button onClick={handleFetch} disabled={loading || !url.trim()}>
            {loading ? '…' : 'Laden'}
          </Button>
        </div>
        <p className="text-xs text-slate-400">Funktioniert mit Seiten die schema.org/Recipe nutzen (Chefkoch, Lecker, AllRecipes …)</p>

        {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-3 py-2">{error}</p>}

        {preview && (
          <div className="space-y-3 border border-slate-100 rounded-2xl p-4 bg-slate-50">
            <div className="flex gap-3 items-start">
              {preview.imageUrl && (
                <img src={preview.imageUrl} alt="" className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-bold text-slate-800">{preview.title}</p>
                {preview.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{preview.description}</p>}
                <div className="flex flex-wrap gap-2 mt-1 text-xs text-slate-400">
                  {preview.prepTime && <span>⏱ {preview.prepTime} Min. Vorbereitung</span>}
                  {preview.cookTime && <span>🍳 {preview.cookTime} Min. Kochen</span>}
                  {preview.servings && <span>👥 {preview.servings} Portionen</span>}
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              {(preview.ingredients as { name: string }[] | undefined)?.length ?? 0} Zutaten ·{' '}
              {(preview.steps as string[] | undefined)?.length ?? 0} Schritte
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" className="flex-1" onClick={onClose}>Abbrechen</Button>
              <Button className="flex-1" onClick={() => onImport(preview)}>Speichern</Button>
            </div>
          </div>
        )}

        {!preview && !loading && (
          <Button variant="secondary" className="w-full" onClick={onClose}>Abbrechen</Button>
        )}
      </div>
    </Modal>
  )
}
