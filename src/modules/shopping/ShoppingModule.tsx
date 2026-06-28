'use client'

import { useState, useRef } from 'react'
import { useStore } from '@/data/store'
import { Card } from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import { Plus, CheckCircle2, Circle, Trash2, X, CheckCheck, Pencil, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import Empty from '@/components/ui/Empty'
import { showConfirm } from '@/lib/confirm'

const CATEGORIES = ['Obst & Gemüse', 'Milchprodukte', 'Backwaren', 'Fleisch & Fisch', 'Grundnahrung', 'Getränke', 'Tiefkühl', 'Drogerie', 'Sonstiges']

export default function ShoppingModule() {
  const {
    shoppingLists, shoppingItems, activeProfileId,
    addShoppingList, updateShoppingList, deleteShoppingList,
    addShoppingItem, toggleShoppingItem, deleteShoppingItem, clearCheckedItems,
  } = useStore()

  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [newItem, setNewItem] = useState('')
  const [newCategory, setNewCategory] = useState('Sonstiges')
  const [newQuantity, setNewQuantity] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [creatingList, setCreatingList] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const newListRef = useRef<HTMLInputElement>(null)

  const activeList = selectedListId
    ? shoppingLists.find((l) => l.id === selectedListId)
    : shoppingLists.find((l) => l.isActive) || shoppingLists[0]

  const handleSelectList = (id: string) => {
    setSelectedListId(id)
    setShowForm(false)
  }

  const handleCreateList = async () => {
    if (!newListName.trim()) return
    const created = await addShoppingList({ name: newListName.trim(), isActive: false })
    setSelectedListId(created.id)
    setNewListName('')
    setCreatingList(false)
  }

  const handleDeleteList = async (id: string) => {
    if (!(await showConfirm('Liste wirklich löschen?'))) return
    const remaining = shoppingLists.filter((l) => l.id !== id)
    deleteShoppingList(id)
    setSelectedListId(remaining[0]?.id || null)
  }

  const handleRenameConfirm = (id: string) => {
    if (renameValue.trim()) updateShoppingList(id, { name: renameValue.trim() })
    setRenamingId(null)
  }

  const handleAdd = () => {
    if (!newItem.trim() || !activeList) return
    addShoppingItem({
      listId: activeList.id,
      name: newItem.trim(),
      quantity: newQuantity.trim() || undefined,
      category: newCategory,
      checked: false,
      addedById: activeProfileId || undefined,
    })
    setNewItem('')
    setNewQuantity('')
    setShowForm(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd()
    if (e.key === 'Escape') setShowForm(false)
  }

  if (shoppingLists.length === 0) {
    return (
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold text-slate-800">Einkaufsliste</h1>
        <Empty
          icon="🛒"
          title="Keine Listen vorhanden"
          description="Erstelle deine erste Einkaufsliste"
          action={
            <Button size="sm" onClick={() => setCreatingList(true)}>
              <Plus className="w-4 h-4" /> Neue Liste
            </Button>
          }
        />
        {creatingList && (
          <div className="flex gap-2">
            <input
              autoFocus
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateList(); if (e.key === 'Escape') setCreatingList(false) }}
              placeholder="Listenname..."
              className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
            />
            <Button size="sm" onClick={handleCreateList} disabled={!newListName.trim()}>
              <Check className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setCreatingList(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    )
  }

  const listItems = activeList
    ? shoppingItems
        .filter((i) => i.listId === activeList.id)
        .sort((a, b) => {
          if (a.checked !== b.checked) return a.checked ? 1 : -1
          return a.category?.localeCompare(b.category || '') || 0
        })
    : []

  const uncheckedItems = listItems.filter((i) => !i.checked)
  const checkedItems = listItems.filter((i) => i.checked)

  const itemsByCategory = uncheckedItems.reduce<Record<string, typeof uncheckedItems>>((acc, item) => {
    const cat = item.category || 'Sonstiges'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Einkaufsliste</h1>
        <div className="flex items-center gap-2">
          {checkedItems.length > 0 && activeList && (
            <Button variant="ghost" size="sm" onClick={() => clearCheckedItems(activeList.id)} className="text-slate-400">
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:block">Erledigte löschen</span>
            </Button>
          )}
          <Button size="sm" onClick={() => { setShowForm((v) => !v) }}>
            <Plus className="w-4 h-4" /> Artikel
          </Button>
        </div>
      </div>

      {/* List tabs */}
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
        {shoppingLists.map((list) => {
          const isSelected = list.id === (activeList?.id)
          return (
            <div key={list.id} className="flex-shrink-0 group relative">
              {renamingId === list.id ? (
                <div className="flex items-center gap-1">
                  <input
                    autoFocus
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameConfirm(list.id)
                      if (e.key === 'Escape') setRenamingId(null)
                    }}
                    className="w-28 px-2 py-1.5 text-sm rounded-xl border-2 border-primary-400 focus:outline-none"
                  />
                  <button onClick={() => handleRenameConfirm(list.id)} className="p-1 text-emerald-500 hover:text-emerald-600">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setRenamingId(null)} className="p-1 text-slate-400 hover:text-slate-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className={cn(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-xl border-2 text-sm font-medium transition-all cursor-pointer select-none',
                  isSelected
                    ? 'border-primary-400 bg-primary-50 text-primary-700'
                    : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white',
                )}>
                  <button onClick={() => handleSelectList(list.id)} className="flex items-center gap-1.5">
                    <span>🛒</span>
                    <span>{list.name}</span>
                    {(() => {
                      const count = shoppingItems.filter((i) => i.listId === list.id && !i.checked).length
                      return count > 0 ? (
                        <span className={cn('text-xs px-1.5 py-0.5 rounded-lg font-bold',
                          isSelected ? 'bg-primary-200 text-primary-700' : 'bg-slate-100 text-slate-500'
                        )}>{count}</span>
                      ) : null
                    })()}
                  </button>
                  {isSelected && (
                    <div className="flex items-center gap-0.5 ml-1">
                      <button
                        onClick={() => { setRenamingId(list.id); setRenameValue(list.name) }}
                        className="p-0.5 text-primary-300 hover:text-primary-600 transition-colors"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      {shoppingLists.length > 1 && (
                        <button
                          onClick={() => handleDeleteList(list.id)}
                          className="p-0.5 text-primary-300 hover:text-red-500 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* New list */}
        {creatingList ? (
          <div className="flex items-center gap-1 flex-shrink-0">
            <input
              ref={newListRef}
              autoFocus
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateList()
                if (e.key === 'Escape') { setCreatingList(false); setNewListName('') }
              }}
              placeholder="Listenname..."
              className="w-28 px-2 py-1.5 text-sm rounded-xl border-2 border-primary-400 focus:outline-none"
            />
            <button onClick={handleCreateList} disabled={!newListName.trim()} className="p-1.5 text-emerald-500 hover:text-emerald-600 disabled:opacity-40">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => { setCreatingList(false); setNewListName('') }} className="p-1.5 text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setCreatingList(true)}
            className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-primary-300 hover:text-primary-500 text-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Neue Liste
          </button>
        )}
      </div>

      {!activeList ? null : (
        <>
          {/* Quick add form */}
          {showForm && (
            <Card className="border-primary-100 bg-primary-50/30">
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    autoFocus
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Artikel hinzufügen..."
                    className="flex-1 px-3 py-2 rounded-xl border border-primary-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm bg-white"
                  />
                  <input
                    value={newQuantity}
                    onChange={(e) => setNewQuantity(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Menge"
                    className="w-20 px-3 py-2 rounded-xl border border-primary-200 focus:outline-none focus:ring-2 focus:ring-primary-400 text-sm bg-white"
                  />
                </div>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-primary-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowForm(false)} className="flex-1">
                    <X className="w-4 h-4" /> Abbrechen
                  </Button>
                  <Button size="sm" onClick={handleAdd} disabled={!newItem.trim()} className="flex-1">
                    <Plus className="w-4 h-4" /> Hinzufügen
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Progress bar */}
          {listItems.length > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>{checkedItems.length} von {listItems.length} erledigt</span>
                {checkedItems.length === listItems.length && (
                  <span className="text-emerald-500 flex items-center gap-1">
                    <CheckCheck className="w-3.5 h-3.5" /> Alles erledigt!
                  </span>
                )}
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${listItems.length > 0 ? (checkedItems.length / listItems.length) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}

          {/* Items by category */}
          {listItems.length === 0 ? (
            <Empty
              icon="🛒"
              title="Liste ist leer"
              description="Füge deinen ersten Artikel hinzu"
              action={
                <Button size="sm" onClick={() => setShowForm(true)}>
                  <Plus className="w-4 h-4" /> Artikel hinzufügen
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              {Object.entries(itemsByCategory).map(([category, items]) => (
                <div key={category}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
                    {category}
                  </p>
                  <Card noPadding>
                    {items.map((item, idx) => (
                      <ShoppingItemRow
                        key={item.id}
                        item={item}
                        isLast={idx === items.length - 1}
                        onToggle={() => toggleShoppingItem(item.id)}
                        onDelete={() => deleteShoppingItem(item.id)}
                      />
                    ))}
                  </Card>
                </div>
              ))}

              {checkedItems.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2 px-1">
                    Erledigt ({checkedItems.length})
                  </p>
                  <Card noPadding className="opacity-60">
                    {checkedItems.map((item, idx) => (
                      <ShoppingItemRow
                        key={item.id}
                        item={item}
                        isLast={idx === checkedItems.length - 1}
                        onToggle={() => toggleShoppingItem(item.id)}
                        onDelete={() => deleteShoppingItem(item.id)}
                      />
                    ))}
                  </Card>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function ShoppingItemRow({
  item, isLast, onToggle, onDelete
}: {
  item: import('@/data/models').ShoppingItem
  isLast: boolean
  onToggle: () => void
  onDelete: () => void
}) {
  return (
    <div className={cn('flex items-center gap-3 px-4 py-3', !isLast && 'border-b border-slate-50')}>
      <button onClick={onToggle} className="flex-shrink-0 transition-transform active:scale-90">
        {item.checked
          ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          : <Circle className="w-5 h-5 text-slate-300" />
        }
      </button>
      <div className="flex-1 min-w-0">
        <span className={cn('text-sm', item.checked ? 'line-through text-slate-400' : 'text-slate-800')}>
          {item.name}
        </span>
        {item.quantity && (
          <Badge className="ml-2 text-xs">{item.quantity}</Badge>
        )}
      </div>
      <button
        onClick={onDelete}
        className="p-1.5 rounded-lg text-slate-300 hover:text-red-400 hover:bg-red-50 transition-colors flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
