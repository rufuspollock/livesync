# LiveSync Design

Real-time collaboration on local files via a relay, no external editors required.

## Overview

LiveSync enables two people to collaboratively edit the same file in real-time, each using their own editor. It watches a file on disk, syncs changes through a relay server using CRDTs, and writes incoming changes back to disk. Editor-agnostic: if your editor can save to disk and reload external changes, it works.

Optimized for markdown files but works with any text file.

## Architecture

Three components:

1. **CLI client (`livesync`)** -- A Node.js command-line tool that watches a local file, maintains a Yjs CRDT document, and syncs updates via WebSocket to the relay.
2. **Relay server** -- A lightweight WebSocket relay on Cloudflare Workers + Durable Objects. Holds session state in memory, broadcasts CRDT updates between clients.
3. **Web viewer (future)** -- A static page connecting to the same session, rendering file content in real-time. Read-only. Not in v1 scope.

### Data Flow

1. Editor saves file to disk
2. CLI detects change via file watcher, reads file, diffs against Yjs doc, applies minimal edits
3. Yjs generates a binary update, sent over WebSocket to relay
4. Relay broadcasts update to other connected clients
5. Other client applies Yjs update to its local doc, writes result to disk
6. Other person's editor picks up the changed file

## CLI Client

### Commands

```
livesync share <filepath>            # Start sharing a file
livesync join <session-id> [filepath] # Join an existing session
```

### Share Flow

1. Validate file exists and is readable
2. Connect to relay via WebSocket, get a session ID
3. Load file contents into a Yjs document
4. Start watching file with chokidar
5. Print: `Sharing myfile.md -- session: abc123` and `Others can join with: livesync join abc123`
6. On file change: read file, diff against Yjs doc, apply changes, sync update to relay
7. On incoming update from relay: apply to Yjs doc, write to disk, skip the next file-watch event
8. Ctrl+C to stop

### Join Flow

1. Connect to relay with session ID
2. Receive current Yjs doc state from relay
3. If local file exists and differs from remote: prompt -- use (r)emote, keep (l)ocal, or (m)erge
4. If local file matches remote or doesn't exist: proceed silently
5. Start watching file, same sync loop as share

### Echo Loop Prevention

When livesync writes to disk after an incoming update, it sets a flag to ignore the next file-watch event for that file. This prevents write-detect-re-send cycles.

## Relay Server

### Platform

Cloudflare Workers + Durable Objects. Each session is a Durable Object instance keyed by session ID.

- In-memory state per session (the Yjs doc)
- WebSocket handling built in
- Auto-scales, no server management
- Free tier is generous for this use case

### Responsibilities

1. **Create session** -- Generate a random session ID (6-character alphanumeric), create a Durable Object, return the ID
2. **Accept connections** -- Clients connect via WebSocket to `wss://relay.livesync.dev/session/<id>`
3. **Sync state** -- When a new client joins, send the current Yjs doc state as the first message
4. **Broadcast updates** -- Forward Yjs updates from one client to all others
5. **Cleanup** -- When all clients disconnect, the Durable Object is garbage collected. No persistence.

### Protocol

Binary WebSocket messages. Yjs has built-in encoding for updates and state vectors. The relay forwards opaque binary blobs -- it doesn't need to understand document contents.

Message types:
- `sync-state` -- Full Yjs state (sent to new joiners)
- `sync-update` -- Incremental Yjs update (broadcast on edits)
- `awareness` -- Cursor position, who's connected (future, not v1)

## CRDT and Diffing

### Document Model

File content stored as a single `Y.Text` instance. Character-level CRDT merging: two people editing different parts merge cleanly, concurrent edits to the same line resolve deterministically.

### File-to-CRDT Diffing

When the file watcher detects a change:

1. Read new file contents from disk
2. Diff against current `Y.Text` content using `fast-diff`
3. Apply minimal insert/delete operations to `Y.Text`
4. Yjs generates the binary update automatically

This is critical -- we don't replace the whole document on every save. That would destroy CRDT history and cause conflicts.

### CRDT-to-File Writing

When an update arrives from the relay:

1. Apply the Yjs update to the local doc
2. Get full text from `Y.Text.toString()`
3. Write to disk
4. Set echo-prevention flag

### Limitations

- Text files only. Binary content detected and warned about.
- Reasonable for typical documents (markdown, code, config). Not designed for huge files.

## Project Structure

```
livesync/
├── package.json
├── tsconfig.json
├── README.md
├── src/
│   ├── cli.ts           # CLI entry point, argument parsing
│   ├── client.ts         # File watching, WebSocket connection, sync loop
│   ├── crdt.ts           # Yjs document management, diffing
│   └── protocol.ts       # Message types, encoding/decoding
├── relay/
│   ├── wrangler.toml     # Cloudflare Workers config
│   └── src/
│       ├── index.ts      # Worker entry point, routing
│       └── session.ts    # Durable Object: session state, WebSocket handling
└── web/                  # Future: web viewer
```

### Dependencies

**CLI:**
- `yjs` -- CRDT
- `fast-diff` -- Text diffing for file-to-CRDT updates
- `chokidar` -- Cross-platform file watching
- `ws` -- WebSocket client for Node
- `commander` -- CLI argument parsing

**Relay:**
- `yjs` -- Maintains doc state for new joiners
- `@cloudflare/workers-types` -- TypeScript types
- `wrangler` -- Dev/deploy tooling

**Dev:**
- TypeScript, `tsx` for dev
- `vitest` for tests

## Editor Compatibility

LiveSync writes to disk; editors must detect and reload external changes. Most do this by default, some need configuration:

- **VS Code** -- Reloads automatically
- **Vim/Neovim** -- Needs `set autoread` and `autocmd FocusGained,CursorHold * checktime`
- **Sublime Text** -- Reloads automatically
- **JetBrains IDEs** -- Reloads on window focus
- **Emacs** -- Needs `auto-revert-mode`

The CLI prints a tip on startup reminding users to configure auto-reload.

## v1 Scope

### In Scope

- `livesync share <file>` and `livesync join <id> [file]`
- CRDT-based merging via Yjs with character-level diffing
- Relay server on Cloudflare Workers + Durable Objects
- Public default relay (no self-hosting required)
- Conflict prompt when joining with a differing local file
- Echo loop prevention
- Text files only with binary detection
- Editor auto-reload tips in README

### Out of Scope

- Web viewer
- Editor plugins
- Multi-file sync
- Persistence / session history
- Authentication / encryption
- Awareness (cursors, who's connected)
- Section-aware markdown diffing
- Single-binary distribution
