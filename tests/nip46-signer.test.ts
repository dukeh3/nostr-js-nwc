import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock nostr-tools modules before importing the signer
const mockConnect = vi.fn()
const mockGetPublicKey = vi.fn()
const mockSignEvent = vi.fn()
const mockClose = vi.fn()
const mockNip44Encrypt = vi.fn()
const mockNip44Decrypt = vi.fn()

const mockBunkerSigner = {
  connect: mockConnect,
  getPublicKey: mockGetPublicKey,
  signEvent: mockSignEvent,
  close: mockClose,
  nip44Encrypt: mockNip44Encrypt,
  nip44Decrypt: mockNip44Decrypt,
}

vi.mock('nostr-tools/nip46', () => ({
  parseBunkerInput: vi.fn().mockResolvedValue({ pubkey: 'aabb'.repeat(16), relays: ['wss://relay.example.com'] }),
  BunkerSigner: {
    fromBunker: vi.fn().mockReturnValue(mockBunkerSigner),
  },
}))

vi.mock('nostr-tools', () => ({
  generateSecretKey: vi.fn().mockReturnValue(new Uint8Array(32)),
}))

import { Nip46Signer } from '../src/signer/nip46.js'

describe('Nip46Signer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockConnect.mockResolvedValue(undefined)
    mockGetPublicKey.mockResolvedValue('aabb'.repeat(16))
    mockSignEvent.mockImplementation(async (event: any) => ({
      ...event,
      id: 'signed-id',
      pubkey: 'aabb'.repeat(16),
      sig: 'signed-sig',
    }))
    mockClose.mockResolvedValue(undefined)
    mockNip44Encrypt.mockResolvedValue('encrypted-text')
    mockNip44Decrypt.mockResolvedValue('decrypted-text')
  })

  it('lazily connects on first getPublicKey call', async () => {
    const signer = new Nip46Signer('bunker://aabb...')
    expect(mockConnect).not.toHaveBeenCalled()

    const pk = await signer.getPublicKey()

    expect(mockConnect).toHaveBeenCalledOnce()
    expect(pk).toBe('aabb'.repeat(16))
  })

  it('does not reconnect on subsequent calls', async () => {
    const signer = new Nip46Signer('bunker://aabb...')

    await signer.getPublicKey()
    await signer.getPublicKey()

    expect(mockConnect).toHaveBeenCalledOnce()
  })

  it('deduplicates concurrent connect attempts', async () => {
    const signer = new Nip46Signer('bunker://aabb...')

    // Fire two calls concurrently
    const [pk1, pk2] = await Promise.all([
      signer.getPublicKey(),
      signer.getPublicKey(),
    ])

    expect(mockConnect).toHaveBeenCalledOnce()
    expect(pk1).toBe('aabb'.repeat(16))
    expect(pk2).toBe('aabb'.repeat(16))
  })

  it('signs events after connecting', async () => {
    const signer = new Nip46Signer('bunker://aabb...')
    const event = { kind: 1, created_at: 1234, tags: [], content: 'hello' }

    const signed = await signer.signEvent(event)

    expect(signed.id).toBe('signed-id')
    expect(signed.sig).toBe('signed-sig')
    expect(mockSignEvent).toHaveBeenCalledWith(event)
  })

  it('encrypts via NIP-44', async () => {
    const signer = new Nip46Signer('bunker://aabb...')

    const result = await signer.nip44Encrypt('pubkey123', 'plaintext')

    expect(result).toBe('encrypted-text')
    expect(mockNip44Encrypt).toHaveBeenCalledWith('pubkey123', 'plaintext')
  })

  it('decrypts via NIP-44', async () => {
    const signer = new Nip46Signer('bunker://aabb...')

    const result = await signer.nip44Decrypt('pubkey123', 'ciphertext')

    expect(result).toBe('decrypted-text')
    expect(mockNip44Decrypt).toHaveBeenCalledWith('pubkey123', 'ciphertext')
  })

  it('close() cleans up and allows reconnect', async () => {
    const signer = new Nip46Signer('bunker://aabb...')

    await signer.getPublicKey()
    expect(mockConnect).toHaveBeenCalledOnce()

    await signer.close()
    expect(mockClose).toHaveBeenCalledOnce()

    // Should reconnect after close
    await signer.getPublicKey()
    expect(mockConnect).toHaveBeenCalledTimes(2)
  })

  it('close() is a no-op when not connected', async () => {
    const signer = new Nip46Signer('bunker://aabb...')

    await signer.close() // Should not throw
    expect(mockClose).not.toHaveBeenCalled()
  })

  it('allows retry after connection failure', async () => {
    mockConnect.mockRejectedValueOnce(new Error('Connection failed'))

    const signer = new Nip46Signer('bunker://aabb...')

    await expect(signer.getPublicKey()).rejects.toThrow('Connection failed')

    // Second attempt should retry (not cache the failure)
    mockConnect.mockResolvedValueOnce(undefined)
    const pk = await signer.getPublicKey()
    expect(pk).toBe('aabb'.repeat(16))
    expect(mockConnect).toHaveBeenCalledTimes(2)
  })

  it('throws when bunker URI is invalid', async () => {
    const { parseBunkerInput } = await import('nostr-tools/nip46')
    vi.mocked(parseBunkerInput).mockResolvedValueOnce(null as any)

    const signer = new Nip46Signer('invalid://uri')

    await expect(signer.getPublicKey()).rejects.toThrow('Invalid bunker URI')
  })
})
