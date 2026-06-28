import { create } from 'zustand'

interface ConfirmStore {
  open: boolean
  message: string
  resolve: ((ok: boolean) => void) | null
  confirm: (message: string) => Promise<boolean>
  answer: (ok: boolean) => void
}

export const useConfirmStore = create<ConfirmStore>((set, get) => ({
  open: false,
  message: '',
  resolve: null,
  confirm: (message) =>
    new Promise<boolean>((resolve) => {
      set({ open: true, message, resolve })
    }),
  answer: (ok) => {
    get().resolve?.(ok)
    set({ open: false, message: '', resolve: null })
  },
}))

/** Imperative confirm — replaces window.confirm() */
export const showConfirm = (message: string) =>
  useConfirmStore.getState().confirm(message)
