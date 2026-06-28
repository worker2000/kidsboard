'use client'

import { useEffect } from 'react'
import { useStore } from '@/data/store'
import { startSync, stopSync } from '@/lib/sync'

/**
 * Starts the SSE sync connection when the app is initialized.
 * Handles reconnection automatically via the sync client.
 */
export function useSync() {
  const { initialized, setSyncStatus, refreshEntity } = useStore()

  useEffect(() => {
    if (!initialized) return

    startSync(
      (status) => setSyncStatus(status),
      (entity, action) => {
        // Skip refreshing our own writes — only handle remote changes.
        // Simple approach: always refresh. The store merge is idempotent.
        refreshEntity(entity)
      },
    )

    return () => stopSync()
  }, [initialized, setSyncStatus, refreshEntity])
}
