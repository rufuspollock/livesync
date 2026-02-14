import { describe, test, expect } from 'vitest'
import { MessageType, encodeMessage, decodeMessage } from '../src/protocol.js'

describe('protocol', () => {
  test('round-trips sync-state message', () => {
    const data = new Uint8Array([1, 2, 3, 4, 5])
    const encoded = encodeMessage(MessageType.SyncState, data)
    const decoded = decodeMessage(encoded)
    expect(decoded.type).toBe(MessageType.SyncState)
    expect(decoded.data).toEqual(data)
  })

  test('round-trips sync-update message', () => {
    const data = new Uint8Array([10, 20, 30])
    const encoded = encodeMessage(MessageType.SyncUpdate, data)
    const decoded = decodeMessage(encoded)
    expect(decoded.type).toBe(MessageType.SyncUpdate)
    expect(decoded.data).toEqual(data)
  })

  test('handles empty payload', () => {
    const data = new Uint8Array([])
    const encoded = encodeMessage(MessageType.SyncState, data)
    const decoded = decodeMessage(encoded)
    expect(decoded.type).toBe(MessageType.SyncState)
    expect(decoded.data.length).toBe(0)
  })

  test('first byte is message type', () => {
    const encoded = encodeMessage(MessageType.SyncUpdate, new Uint8Array([99]))
    expect(encoded[0]).toBe(MessageType.SyncUpdate)
    expect(encoded[1]).toBe(99)
  })
})
