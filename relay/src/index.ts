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

    // Landing page at root
    if (url.pathname === '/') {
      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LiveSync Relay</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 640px; margin: 4rem auto; padding: 0 1rem; color: #1a1a1a; line-height: 1.6; }
    h1 { margin-bottom: 0.25rem; }
    .subtitle { color: #666; margin-top: 0; }
    code { background: #f0f0f0; padding: 0.15em 0.4em; border-radius: 3px; font-size: 0.9em; }
    pre { background: #f0f0f0; padding: 1rem; border-radius: 6px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    a { color: #2563eb; }
    hr { border: none; border-top: 1px solid #e0e0e0; margin: 2rem 0; }
  </style>
</head>
<body>
  <h1>LiveSync Relay</h1>
  <p class="subtitle">This is a <a href="https://trylivesync.dev">LiveSync</a> relay server.</p>

  <p>LiveSync enables real-time collaborative editing of local files. Open a file in your editor, share it with a single command, and others can join and edit simultaneously &mdash; changes sync instantly to everyone&rsquo;s disk.</p>

  <h2>Quick start</h2>
  <pre><code># Install
npm install -g livesync

# Share a file
livesync share myfile.md

# On another machine, join with the session ID
livesync join abc123</code></pre>

  <h2>API</h2>
  <p>This relay exposes two endpoints for LiveSync clients:</p>
  <ul>
    <li><code>POST /session</code> &mdash; Create a new session</li>
    <li><code>GET /session/:id</code> &mdash; Connect via WebSocket</li>
  </ul>

  <hr>
  <p>Learn more at <a href="https://trylivesync.dev">trylivesync.dev</a></p>
</body>
</html>`
      return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders },
      })
    }

    return new Response('Not found', { status: 404 })
  },
}

export { Session }
