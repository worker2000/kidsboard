'use client'

import { useState, useRef } from 'react'
import { useStore } from '@/data/store'
import { format, addDays } from 'date-fns'
import { de } from 'date-fns/locale'
import { Card, CardHeader, CardTitle } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import Input, { Select, Textarea } from '@/components/ui/Input'
import Empty from '@/components/ui/Empty'
import { Plus, Star, Trash2, Edit3, Calendar, ImagePlus, X as XIcon } from 'lucide-react'
import { cn, CATEGORY_LABELS, MEAL_EMOJIS } from '@/lib/utils'
import { showConfirm } from '@/lib/confirm'
import type { Meal, MealCategory } from '@/data/models'

const TAGS = ['Kinderliebling', 'Vegetarisch', 'Vegan', 'Schnell', 'Gesund', 'Klassiker', 'Freitag', 'Wochenende']
const CATEGORIES: MealCategory[] = ['breakfast', 'lunch', 'dinner', 'snack']

export default function MealsModule() {
  const { meals, mealPlans, addMeal, updateMeal, deleteMeal, addMealPlan, deleteMealPlan } = useStore()
  const [activeTab, setActiveTab] = useState<'plan' | 'list'>('plan')
  const [showMealModal, setShowMealModal] = useState(false)
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null)
  const [filterCategory, setFilterCategory] = useState<MealCategory | 'all'>('all')
  const [showPlanModal, setShowPlanModal] = useState(false)
  const [planDate, setPlanDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [planMealType, setPlanMealType] = useState<MealCategory>('lunch')
  const [planMealId, setPlanMealId] = useState('')

  const today = new Date()
  const planDays = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, i)
    return {
      date: format(d, 'yyyy-MM-dd'),
      label: i === 0 ? 'Heute' : i === 1 ? 'Morgen' : format(d, 'EEE d.M.', { locale: de }),
      plans: mealPlans.filter((p) => p.date === format(d, 'yyyy-MM-dd')),
    }
  })

  const filteredMeals = meals.filter((m) =>
    filterCategory === 'all' ? true : m.category === filterCategory
  )

  const handleDeleteMeal = async (id: string) => {
    if (await showConfirm('Gericht wirklich löschen?')) deleteMeal(id)
  }

  const handleAddPlan = () => {
    const meal = meals.find((m) => m.id === planMealId)
    addMealPlan({
      date: planDate,
      mealType: planMealType,
      mealId: planMealId || undefined,
      customName: meal?.name || planMealId,
    })
    setShowPlanModal(false)
    setPlanMealId('')
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Essen</h1>
        <Button size="sm" onClick={() => { setEditingMeal(null); setShowMealModal(true) }}>
          <Plus className="w-4 h-4" /> Gericht
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {(['plan', 'list'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
              activeTab === tab
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700',
            )}
          >
            {tab === 'plan' ? '📅 Essensplan' : '🍽️ Gerichte'}
          </button>
        ))}
      </div>

      {/* Meal plan tab */}
      {activeTab === 'plan' && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <Button size="sm" variant="secondary" onClick={() => setShowPlanModal(true)}>
              <Calendar className="w-4 h-4" /> Eintrag hinzufügen
            </Button>
          </div>
          {planDays.map(({ date, label, plans }) => (
            <Card key={date} noPadding>
              <div className="px-4 py-3 border-b border-slate-50">
                <span className="text-sm font-semibold text-slate-700">{label}</span>
              </div>
              <div className="p-3">
                {plans.length === 0 ? (
                  <p className="text-xs text-slate-300 py-1">Noch kein Essen geplant</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {plans.map((p) => (
                      <div key={p.id} className="flex items-center gap-1.5 bg-orange-50 border border-orange-100 rounded-xl px-3 py-1.5 group">
                        <span className="text-sm">{MEAL_EMOJIS[p.mealType]}</span>
                        <span className="text-sm font-medium text-orange-800">{p.customName}</span>
                        <button
                          onClick={() => deleteMealPlan(p.id)}
                          className="ml-1 opacity-0 group-hover:opacity-100 text-orange-300 hover:text-red-400 transition-all"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Meals list tab */}
      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Category filter */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <button
              onClick={() => setFilterCategory('all')}
              className={cn('flex-shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium transition-all',
                filterCategory === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
            >
              Alle
            </button>
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setFilterCategory(c)}
                className={cn('flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all',
                  filterCategory === c ? 'bg-orange-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200')}
              >
                {MEAL_EMOJIS[c]} {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>

          {filteredMeals.length === 0 ? (
            <Empty icon="🍽️" title="Keine Gerichte" description="Füge dein erstes Gericht hinzu" />
          ) : (
            <div className="space-y-2">
              {filteredMeals.map((meal) => (
                <Card key={meal.id}>
                  <div className="flex items-start gap-3">
                    {meal.image ? (
                      <img src={meal.image} alt={meal.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                    ) : (
                      <span className="text-2xl flex-shrink-0 mt-0.5">{MEAL_EMOJIS[meal.category]}</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-slate-800">{meal.name}</p>
                        <button
                          onClick={() => updateMeal(meal.id, { favorite: !meal.favorite })}
                          className={cn('flex-shrink-0 transition-transform active:scale-90',
                            meal.favorite ? 'text-amber-400' : 'text-slate-200 hover:text-amber-300')}
                        >
                          <Star className={cn('w-4 h-4', meal.favorite && 'fill-current')} />
                        </button>
                      </div>
                      <Badge color="#f97316" className="mt-1 text-xs">{CATEGORY_LABELS[meal.category]}</Badge>
                      {meal.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {meal.tags.map((t) => (
                            <span key={t} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-lg">{t}</span>
                          ))}
                        </div>
                      )}
                      {meal.lastCooked && (
                        <p className="text-xs text-slate-400 mt-1">
                          Zuletzt: {new Date(meal.lastCooked).toLocaleDateString('de-DE')}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 mt-2 pt-2 border-t border-slate-50">
                    <button onClick={() => { setEditingMeal(meal); setShowMealModal(true) }}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-50">
                      <Edit3 className="w-3.5 h-3.5" /> Bearbeiten
                    </button>
                    <button onClick={() => handleDeleteMeal(meal.id)}
                      className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 ml-auto">
                      <Trash2 className="w-3.5 h-3.5" /> Löschen
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Meal modal */}
      {showMealModal && (
        <MealModal
          meal={editingMeal}
          onSave={(data) => {
            if (editingMeal) updateMeal(editingMeal.id, data)
            else addMeal(data as Omit<Meal, 'id' | 'createdAt'>)
            setShowMealModal(false)
          }}
          onClose={() => setShowMealModal(false)}
        />
      )}

      {/* Plan entry modal */}
      {showPlanModal && (
        <Modal open title="Essensplan Eintrag" onClose={() => setShowPlanModal(false)}>
          <div className="space-y-4">
            <Input label="Datum" type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} />
            <Select label="Mahlzeit" value={planMealType} onChange={(e) => setPlanMealType(e.target.value as MealCategory)}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{MEAL_EMOJIS[c]} {CATEGORY_LABELS[c]}</option>)}
            </Select>
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Gericht aus Sammlung</p>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {meals.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setPlanMealId(m.id)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-left border-2 transition-all',
                      planMealId === m.id ? 'border-primary-400 bg-primary-50' : 'border-transparent hover:bg-slate-50',
                    )}
                  >
                    {MEAL_EMOJIS[m.category]} {m.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowPlanModal(false)}>Abbrechen</Button>
              <Button className="flex-1" onClick={handleAddPlan} disabled={!planMealId}>Eintragen</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}

function MealModal({ meal, onSave, onClose }: {
  meal: Meal | null
  onSave: (data: Partial<Meal>) => void
  onClose: () => void
}) {
  const [name, setName] = useState(meal?.name || '')
  const [category, setCategory] = useState<MealCategory>(meal?.category || 'lunch')
  const [notes, setNotes] = useState(meal?.notes || '')
  const [selectedTags, setSelectedTags] = useState<string[]>(meal?.tags || [])
  const [favorite, setFavorite] = useState(meal?.favorite || false)
  const [image, setImage] = useState<string | undefined>(meal?.image)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setImage(ev.target?.result as string)
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <Modal open title={meal ? 'Gericht bearbeiten' : 'Neues Gericht'} onClose={onClose}>
      <div className="space-y-4">
        <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Pizza" />
        <Select label="Kategorie" value={category} onChange={(e) => setCategory(e.target.value as MealCategory)}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{MEAL_EMOJIS[c]} {CATEGORY_LABELS[c]}</option>)}
        </Select>

        {/* Image upload */}
        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Bild (optional)</p>
          {image ? (
            <div className="relative w-full h-36 rounded-xl overflow-hidden bg-slate-100">
              <img src={image} alt="Vorschau" className="w-full h-full object-cover" />
              <button
                onClick={() => setImage(undefined)}
                className="absolute top-2 right-2 bg-white/80 hover:bg-white rounded-full p-1 text-slate-600 hover:text-red-500 transition-colors"
              >
                <XIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-2 right-2 bg-white/80 hover:bg-white rounded-xl px-2 py-1 text-xs text-slate-600 transition-colors"
              >
                Ändern
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full h-24 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1 hover:border-primary-400 hover:bg-primary-50 transition-all text-slate-400 hover:text-primary-500"
            >
              <ImagePlus className="w-6 h-6" />
              <span className="text-xs">Foto auswählen</span>
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
        </div>

        <div>
          <p className="text-sm font-medium text-slate-700 mb-2">Tags</p>
          <div className="flex flex-wrap gap-2">
            {TAGS.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={cn(
                  'px-3 py-1 rounded-xl text-sm border-2 transition-all',
                  selectedTags.includes(tag)
                    ? 'border-primary-400 bg-primary-50 text-primary-700'
                    : 'border-slate-200 text-slate-600',
                )}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
        <Textarea label="Notizen" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={favorite} onChange={(e) => setFavorite(e.target.checked)} className="rounded" />
          <span className="text-sm text-slate-700">Favorit ⭐</span>
        </label>
        <div className="flex gap-2 pt-2">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Abbrechen</Button>
          <Button className="flex-1" onClick={() => onSave({ name, category, notes: notes || undefined, tags: selectedTags, favorite, image })} disabled={!name.trim()}>
            Speichern
          </Button>
        </div>
      </div>
    </Modal>
  )
}
