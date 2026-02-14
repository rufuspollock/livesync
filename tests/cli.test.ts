import { describe, test, expect } from 'vitest'
import { execFile } from 'node:child_process'
import { resolve } from 'node:path'

const CLI = resolve(import.meta.dirname, '../src/cli.ts')

function run(...args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    execFile('npx', ['tsx', CLI, ...args], (error, stdout, stderr) => {
      resolve({ stdout, stderr, code: error?.code ?? 0 })
    })
  })
}

describe('cli', () => {
  test('--help shows usage', async () => {
    const { stdout, code } = await run('--help')
    expect(code).toBe(0)
    expect(stdout).toContain('Usage: livesync')
    expect(stdout).toContain('share')
    expect(stdout).toContain('join')
  })

  test('--version shows version', async () => {
    const { stdout, code } = await run('--version')
    expect(code).toBe(0)
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+$/)
  })

  test('share requires filepath argument', async () => {
    const { stderr, code } = await run('share')
    expect(code).not.toBe(0)
    expect(stderr).toContain("missing required argument 'filepath'")
  })

  test('join requires session-id argument', async () => {
    const { stderr, code } = await run('join')
    expect(code).not.toBe(0)
    expect(stderr).toContain("missing required argument 'session-id'")
  })

  test('unknown command shows help', async () => {
    const { stderr, code } = await run('bogus')
    expect(code).not.toBe(0)
    expect(stderr).toContain("unknown command 'bogus'")
  })

  test('share --help shows relay option', async () => {
    const { stdout, code } = await run('share', '--help')
    expect(code).toBe(0)
    expect(stdout).toContain('--relay')
    expect(stdout).toContain('Relay server URL')
  })

  test('join --help shows relay option and optional filepath', async () => {
    const { stdout, code } = await run('join', '--help')
    expect(code).toBe(0)
    expect(stdout).toContain('--relay')
    expect(stdout).toContain('[filepath]')
  })
})
