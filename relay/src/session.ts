import * as Y from 'yjs'
import { MessageType, encodeMessage, decodeMessage } from '../../src/protocol.js'

export class Session {
  private doc: Y.Doc
  private connections: Set<WebSocket>

  constructor(private state: DurableObjectState, private env: unknown) {
    this.doc = new Y.Doc()
    this.connections = new Set()
  }

  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 400 })
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    server.accept()
    this.connections.add(server)

    // Send current document state to new joiner
    const state = Y.encodeStateAsUpdate(this.doc)
    server.send(encodeMessage(MessageType.SyncState, state))

    server.addEventListener('message', (event) => {
      const msg = decodeMessage(new Uint8Array(event.data as ArrayBuffer))
      if (msg.type === MessageType.SyncUpdate) {
        Y.applyUpdate(this.doc, msg.data)
        // Broadcast to all other connections
        for (const conn of this.connections) {
          if (conn !== server) {
            conn.send(encodeMessage(MessageType.SyncUpdate, msg.data))
          }
        }
      }
    })

    server.addEventListener('close', () => {
      this.connections.delete(server)
    })

    server.addEventListener('error', () => {
      this.connections.delete(server)
    })

    return new Response(null, { status: 101, webSocket: client })
  }
}
