const STATE_EXPIRY_MS = 10 * 60 * 1000 // 10 minutes

export async function createSignedState(secret: string): Promise<string> {
  const timestamp = Date.now().toString()
  const random = crypto.randomUUID()
  const data = `${timestamp}:${random}`

  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data))
  const signatureHex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')

  return btoa(`${data}:${signatureHex}`)
}

export async function verifySignedState(state: string, secret: string): Promise<boolean> {
  try {
    const decoded = atob(state)
    const parts = decoded.split(':')
    if (parts.length !== 3) return false

    const [timestamp, random, signatureHex] = parts
    const data = `${timestamp}:${random}`

    // Check expiry
    const stateTime = parseInt(timestamp, 10)
    if (isNaN(stateTime) || Date.now() - stateTime > STATE_EXPIRY_MS) {
      return false
    }

    // Verify signature
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    )

    const signatureBytes = new Uint8Array(
      signatureHex.match(/.{2}/g)!.map(byte => parseInt(byte, 16))
    )

    return await crypto.subtle.verify('HMAC', key, signatureBytes, encoder.encode(data))
  } catch {
    return false
  }
}
