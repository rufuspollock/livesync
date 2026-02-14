#!/usr/bin/env node
import { Command } from 'commander'
import { share, join } from './client.js'
import { resolve } from 'node:path'

const DEFAULT_RELAY = 'http://localhost:8787'

const program = new Command()

program
  .name('livesync')
  .description('Real-time collaboration on local files')
  .version('0.1.0')

program
  .command('share <filepath>')
  .description('Share a file for real-time collaboration')
  .option('-r, --relay <url>', 'Relay server URL', DEFAULT_RELAY)
  .action(async (filepath: string, options: { relay: string }) => {
    const fullPath = resolve(filepath)

    console.log(`Tip: Make sure your editor auto-reloads files changed on disk.`)
    console.log()

    try {
      const session = await share(fullPath, options.relay)

      console.log(`Sharing ${filepath}`)
      console.log(`Session: ${session.sessionId}`)
      console.log()
      console.log(`Others can join with:`)
      console.log(`  livesync join ${session.sessionId}`)
      console.log()
      console.log(`Press Ctrl+C to stop sharing.`)

      process.on('SIGINT', () => {
        session.stop()
        console.log('\nStopped sharing.')
        process.exit(0)
      })
    } catch (err) {
      console.error('Failed to share:', (err as Error).message)
      process.exit(1)
    }
  })

program
  .command('join <session-id> [filepath]')
  .description('Join a shared file session')
  .option('-r, --relay <url>', 'Relay server URL', DEFAULT_RELAY)
  .action(
    async (
      sessionId: string,
      filepath: string | undefined,
      options: { relay: string }
    ) => {
      // Default filename: use session ID if not specified
      const file = filepath ?? `${sessionId}.md`
      const fullPath = resolve(file)

      console.log(`Tip: Make sure your editor auto-reloads files changed on disk.`)
      console.log()

      try {
        const session = await join(sessionId, fullPath, options.relay)

        console.log(`Joined session ${sessionId}`)
        console.log(`Syncing to ${file}`)
        console.log()
        console.log(`Press Ctrl+C to stop.`)

        process.on('SIGINT', () => {
          session.stop()
          console.log('\nDisconnected.')
          process.exit(0)
        })
      } catch (err) {
        console.error('Failed to join:', (err as Error).message)
        process.exit(1)
      }
    }
  )

program.parse()
