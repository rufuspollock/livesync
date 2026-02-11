# LiveSync Relay

WebSocket relay server for LiveSync, built on Cloudflare Workers + Durable Objects.

Each collaborative session is a Durable Object instance that holds the Yjs CRDT document in memory and broadcasts updates between connected clients.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- A Cloudflare account with Workers paid plan (Durable Objects require paid plan)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) authenticated (`wrangler login`)

## Local Development

```bash
cd relay
npm install
npm run dev
```

This starts the relay at `http://localhost:8787`. The CLI defaults to this URL.

## Deploy to Production

### Manual

```bash
cd relay
npm install
wrangler deploy
```

Wrangler will output the deployed URL (e.g. `https://livesync-relay.<your-subdomain>.workers.dev`).

### Automated

Use the deploy script from the repo root:

```bash
./relay/deploy.sh
```

### Custom Domain

To use a custom domain like `relay.livesync.dev`, add a route in `wrangler.toml`:

```toml
routes = [
  { pattern = "relay.livesync.dev", custom_domain = true }
]
```

Then run `wrangler deploy` again.

## Connecting the CLI to a Deployed Relay

```bash
livesync share myfile.md --relay https://livesync-relay.<your-subdomain>.workers.dev
livesync join abc123 --relay https://livesync-relay.<your-subdomain>.workers.dev
```

## Architecture

- **Worker (`src/index.ts`)** — Routes requests: `POST /session` creates a new session ID, `GET /session/<id>` upgrades to WebSocket and forwards to the Durable Object.
- **Session (`src/session.ts`)** — Durable Object that holds a Yjs doc in memory. Sends full state to new joiners, broadcasts incremental updates between clients. No persistence — state is garbage collected when all clients disconnect.

## Protocol

Binary WebSocket messages with a 1-byte type prefix:

| Type byte | Name        | Description                        |
|-----------|-------------|------------------------------------|
| `0x01`    | SyncState   | Full Yjs state (sent to new joiners) |
| `0x02`    | SyncUpdate  | Incremental Yjs update (broadcast) |

The relay treats payloads as opaque binary blobs — it applies Yjs updates to maintain state for new joiners but doesn't interpret document content.
