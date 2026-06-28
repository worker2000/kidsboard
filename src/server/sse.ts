/**
 * Server-Sent Events broadcast manager.
 * Uses globalThis to persist the client set across hot reloads in dev.
 */

const enc = new TextEncoder()

type Ctrl = ReadableStreamDefaultController<Uint8Array>

const g = globalThis as { _sseClients?: Set<Ctrl> }
if (!g._sseClients) g._sseClients = new Set()

const clients: Set<Ctrl> = g._sseClients

export function broadcast(entity: string, action: string): void {
  if (clients.size === 0) return
  const msg = enc.encode(`data: ${JSON.stringify({ entity, action, ts: Date.now() })}\n\n`)
  clients.forEach((ctrl) => {
    try {
      ctrl.enqueue(msg)
    } catch {
      clients.delete(ctrl)
    }
  })
}

export function getConnectedCount(): number {
  return clients.size
}

export function createSSEStream(): ReadableStream<Uint8Array> {
  let ctrl: Ctrl
  let ping: ReturnType<typeof setInterval>

  return new ReadableStream<Uint8Array>({
    start(controller) {
      ctrl = controller
      clients.add(ctrl)
      ctrl.enqueue(enc.encode(': ping\n\n'))
      ping = setInterval(() => {
        try {
          ctrl.enqueue(enc.encode(': ping\n\n'))
        } catch {
          clearInterval(ping)
          clients.delete(ctrl)
        }
      }, 30_000)
    },
    cancel() {
      clearInterval(ping)
      clients.delete(ctrl)
    },
  })
}
