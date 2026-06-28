'use client'

import { useConfirmStore } from '@/lib/confirm'
import Button from './Button'

export default function ConfirmDialog() {
  const { open, message, answer } = useConfirmStore()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-xl w-full max-w-sm p-6 space-y-4 animate-in slide-in-from-bottom-4 duration-200">
        <p className="text-slate-800 text-base font-medium leading-snug">{message}</p>
        <div className="flex gap-3 pt-1">
          <Button variant="secondary" className="flex-1" onClick={() => answer(false)}>
            Abbrechen
          </Button>
          <Button variant="danger" className="flex-1" onClick={() => answer(true)}>
            Löschen
          </Button>
        </div>
      </div>
    </div>
  )
}
