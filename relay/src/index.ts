import { Session } from './session.js'

interface Env {
  SESSION: DurableObjectNamespace
}

function generateSessionId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => chars[b % chars.length]).join('')
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // CORS headers for web viewer (future)
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    // Create new session
    if (url.pathname === '/session' && request.method === 'POST') {
      const sessionId = generateSessionId()
      return new Response(JSON.stringify({ sessionId }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    // Connect to existing session via WebSocket
    const match = url.pathname.match(/^\/session\/([a-z0-9]+)$/)
    if (match) {
      const sessionId = match[1]
      const id = env.SESSION.idFromName(sessionId)
      const stub = env.SESSION.get(id)
      return stub.fetch(request)
    }

    return new Response('Not found', { status: 404 })
  },
}

export { Session }
