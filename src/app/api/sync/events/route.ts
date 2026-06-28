import { createSSEStream } from '@/server/sse'

export const dynamic = 'force-dynamic'

export function GET() {
  return new Response(createSSEStream(), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
