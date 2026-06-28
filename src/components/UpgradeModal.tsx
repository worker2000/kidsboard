'use client'

import Modal from './ui/Modal'
import Button from './ui/Button'
import { ShieldAlert, ExternalLink } from 'lucide-react'
import Link from 'next/link'

interface UpgradeModalProps {
  open: boolean
  message?: string
  onClose: () => void
}

export default function UpgradeModal({ open, message, onClose }: UpgradeModalProps) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="flex flex-col items-center gap-4 text-center py-2">
        <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center">
          <ShieldAlert className="w-8 h-8 text-amber-500" />
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-800">Premium-Lizenz benötigt</h2>
          <p className="text-slate-500 text-sm mt-1">
            {message || 'Die kostenlose Version erlaubt max. 1 Erwachsener + 1 Kind.'}
          </p>
        </div>

        <div className="w-full bg-amber-50 rounded-2xl p-4 text-sm space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🆓</span>
            <div className="text-left">
              <p className="font-semibold text-slate-700">Community</p>
              <p className="text-slate-500">1 Erwachsener + 1 Kind</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">⭐</span>
            <div className="text-left">
              <p className="font-semibold text-slate-700">Premium — 2,99€/Monat</p>
              <p className="text-slate-500">Unbegrenzt viele Familienmitglieder</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🚀</span>
            <div className="text-left">
              <p className="font-semibold text-slate-700">Unlimited — 9,99€/Monat</p>
              <p className="text-slate-500">Alle Module, Wallboard, Küchentafel, Discord</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full">
          <a
            href="https://licensing.flessinglabs.com/shop/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full"
          >
            <Button className="w-full" size="lg">
              <ExternalLink className="w-4 h-4" />
              Lizenz erwerben
            </Button>
          </a>
          <Link href="/settings" onClick={onClose}>
            <Button variant="secondary" className="w-full" size="sm">
              Lizenzschlüssel eingeben
            </Button>
          </Link>
          <button onClick={onClose} className="text-sm text-slate-400 hover:text-slate-600">
            Abbrechen
          </button>
        </div>
      </div>
    </Modal>
  )
}
