'use client'

/**
 * SSE-based real-time sync client.
 * Connects to /familytool/api/sync/events and dispatches store refreshes
 * when the server broadcasts a "changed" event.
 */

export type SyncStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

type SyncEvent = { entity: string; action: string; ts: number }
type EntityHandler = (entity: string, action: string) => void

let eventSource: EventSource | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let statusCallback: ((s: SyncStatus) => void) | null = null
let entityHandler: EntityHandler | null = null
let reconnectDelay = 2000

export function startSync(onStatus: (s: SyncStatus) => void, onEntity: EntityHandler) {
  statusCallback = onStatus
  entityHandler  = onEntity
  connect()
}

export function stopSync() {
  if (reconnectTimer) clearTimeout(reconnectTimer)
  if (eventSource) { eventSource.close(); eventSource = null }
  statusCallback?.('disconnected')
}

function connect() {
  if (eventSource) { eventSource.close(); eventSource = null }
  statusCallback?.('connecting')

  const es = new EventSource('/familytool/api/sync/events')
  eventSource = es

  es.onopen = () => {
    reconnectDelay = 2000
    statusCallback?.('connected')
  }

  es.onmessage = (e) => {
    if (!e.data || e.data.startsWith(':')) return
    try {
      const payload: SyncEvent = JSON.parse(e.data)
      entityHandler?.(payload.entity, payload.action)
    } catch {}
  }

  es.onerror = () => {
    es.close()
    eventSource = null
    statusCallback?.('error')
    // Exponential backoff, max 30s
    reconnectDelay = Math.min(reconnectDelay * 1.5, 30_000)
    reconnectTimer = setTimeout(connect, reconnectDelay)
  }
}

export async function getSyncStatus(): Promise<{ connected: number }> {
  try {
    const r = await fetch('/familytool/api/sync/status')
    return r.json()
  } catch {
    return { connected: 0 }
  }
}
