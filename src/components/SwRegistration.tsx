'use client'

import { useEffect } from 'react'

export default function SwRegistration() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/familytool/sw.js', { scope: '/familytool/' })
        .catch(() => {})
    }
  }, [])

  return null
}
