import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function hashPin(pin: string): string {
  // Simple hash for PIN storage (not cryptographic, this is a family app)
  let hash = 0
  for (let i = 0; i < pin.length; i++) {
    const char = pin.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return hash.toString(36)
}

export function verifyPin(pin: string, stored: string): boolean {
  return hashPin(pin) === stored
}

export function formatDate(dateStr: string, locale = 'de-DE'): string {
  return new Date(dateStr).toLocaleDateString(locale, {
    weekday: 'short', day: '2-digit', month: '2-digit',
  })
}

export function formatTime(time: string): string {
  return time.substring(0, 5)
}

export const DAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag']
export const DAY_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr']

export const CATEGORY_COLORS: Record<string, string> = {
  school: '#6366f1',
  doctor: '#ef4444',
  family: '#10b981',
  leisure: '#f59e0b',
  sport: '#0ea5e9',
  other: '#94a3b8',
}

export const CATEGORY_LABELS: Record<string, string> = {
  school: 'Schule',
  doctor: 'Arzt',
  family: 'Familie',
  leisure: 'Freizeit',
  sport: 'Sport',
  other: 'Sonstiges',
  breakfast: 'Frühstück',
  lunch: 'Mittagessen',
  dinner: 'Abendessen',
  snack: 'Snack',
}

export const MEAL_EMOJIS: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
}

export const WISH_STATUS_LABELS: Record<string, string> = {
  wished: 'Gewünscht',
  planned: 'Geplant',
  cooked: 'Gekocht',
}

export const WISH_STATUS_COLORS: Record<string, string> = {
  wished: '#f59e0b',
  planned: '#6366f1',
  cooked: '#10b981',
}
