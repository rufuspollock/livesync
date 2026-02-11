export enum MessageType {
  SyncState = 0x01,
  SyncUpdate = 0x02,
}

export function encodeMessage(type: MessageType, data: Uint8Array): Uint8Array {
  const msg = new Uint8Array(1 + data.length)
  msg[0] = type
  msg.set(data, 1)
  return msg
}

export function decodeMessage(msg: Uint8Array): { type: MessageType; data: Uint8Array } {
  return {
    type: msg[0] as MessageType,
    data: msg.slice(1),
  }
}
