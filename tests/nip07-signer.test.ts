import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Nip07Signer } from '../src/signer/nip07.js'

describe('Nip07Signer', () => {
  let savedNostr: unknown

  beforeEach(() => {
    savedNostr = (globalThis as any).nostr
  })

  afterEach(() => {
    if (savedNostr === undefined) {
      delete (globalThis as any).nostr
    } else {
      ;(globalThis as any).nostr = savedNostr
    }
  })

  // ─── No extension installed ──────────────────────────────────────────

  describe('no extension installed', () => {
    beforeEach(() => {
      delete (globalThis as any).nostr
    })

    it('getPublicKey throws "No Nostr extension detected"', async () => {
      const signer = new Nip07Signer()
      await expect(signer.getPublicKey()).rejects.toThrow('No Nostr extension detected')
    })

    it('nip44Encrypt throws "No Nostr extension detected"', async () => {
      const signer = new Nip07Signer()
      await expect(signer.nip44Encrypt('pubkey', 'text')).rejects.toThrow(
        'No Nostr extension detected',
      )
    })
  })

  // ─── With mock extension ─────────────────────────────────────────────

  describe('with mock extension', () => {
    const mockExtension = {
      getPublicKey: vi.fn().mockResolvedValue('aabb'.repeat(16)),
      signEvent: vi.fn().mockImplementation(async (event: any) => ({
        ...event,
        id: 'signed-id',
        pubkey: 'aabb'.repeat(16),
        sig: 'signed-sig',
      })),
      nip44: {
        encrypt: vi.fn().mockResolvedValue('encrypted-text'),
        decrypt: vi.fn().mockResolvedValue('decrypted-text'),
      },
    }

    beforeEach(() => {
      ;(globalThis as any).nostr = mockExtension
    })

    it('getPublicKey delegates to extension', async () => {
      const signer = new Nip07Signer()
      const pk = await signer.getPublicKey()

      expect(pk).toBe('aabb'.repeat(16))
      expect(mockExtension.getPublicKey).toHaveBeenCalled()
    })

    it('signEvent delegates to extension', async () => {
      const signer = new Nip07Signer()
      const event = { kind: 1, created_at: 1234, tags: [], content: 'hello' }
      const signed = await signer.signEvent(event)

      expect(signed.id).toBe('signed-id')
      expect(signed.sig).toBe('signed-sig')
      expect(mockExtension.signEvent).toHaveBeenCalledWith(event)
    })

    it('nip44Encrypt delegates to extension.nip44.encrypt', async () => {
      const signer = new Nip07Signer()
      const result = await signer.nip44Encrypt('pubkey123', 'plaintext')

      expect(result).toBe('encrypted-text')
      expect(mockExtension.nip44.encrypt).toHaveBeenCalledWith('pubkey123', 'plaintext')
    })

    it('nip44Decrypt delegates to extension.nip44.decrypt', async () => {
      const signer = new Nip07Signer()
      const result = await signer.nip44Decrypt('pubkey123', 'ciphertext')

      expect(result).toBe('decrypted-text')
      expect(mockExtension.nip44.decrypt).toHaveBeenCalledWith('pubkey123', 'ciphertext')
    })

    it('nip44Encrypt throws when extension has no nip44 or nip04', async () => {
      ;(globalThis as any).nostr = {
        getPublicKey: vi.fn(),
        signEvent: vi.fn(),
        // no nip44, no nip04
      }

      const signer = new Nip07Signer()
      await expect(signer.nip44Encrypt('pk', 'text')).rejects.toThrow(
        'Extension does not support NIP-44 or NIP-04 encryption',
      )
    })

    it('nip44Decrypt throws when extension has no nip44 or nip04', async () => {
      ;(globalThis as any).nostr = {
        getPublicKey: vi.fn(),
        signEvent: vi.fn(),
        // no nip44, no nip04
      }

      const signer = new Nip07Signer()
      await expect(signer.nip44Decrypt('pk', 'ct')).rejects.toThrow(
        'Extension does not support NIP-44 or NIP-04 decryption',
      )
    })
  })

  // ─── NIP-04 fallback ──────────────────────────────────────────────

  describe('NIP-04 fallback', () => {
    it('falls back to nip04.encrypt when nip44 is not available', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      ;(globalThis as any).nostr = {
        getPublicKey: vi.fn(),
        signEvent: vi.fn(),
        nip04: {
          encrypt: vi.fn().mockResolvedValue('nip04-encrypted'),
          decrypt: vi.fn(),
        },
      }

      const signer = new Nip07Signer()
      const result = await signer.nip44Encrypt('pk', 'text')

      expect(result).toBe('nip04-encrypted')
      expect(warnSpy).toHaveBeenCalledWith(
        'NIP-44 not supported by extension, falling back to NIP-04',
      )
      warnSpy.mockRestore()
    })

    it('falls back to nip04.decrypt when nip44 is not available', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      ;(globalThis as any).nostr = {
        getPublicKey: vi.fn(),
        signEvent: vi.fn(),
        nip04: {
          encrypt: vi.fn(),
          decrypt: vi.fn().mockResolvedValue('nip04-decrypted'),
        },
      }

      const signer = new Nip07Signer()
      const result = await signer.nip44Decrypt('pk', 'ct')

      expect(result).toBe('nip04-decrypted')
      expect(warnSpy).toHaveBeenCalledWith(
        'NIP-44 not supported by extension, falling back to NIP-04',
      )
      warnSpy.mockRestore()
    })

    it('prefers nip44 over nip04 when both are available', async () => {
      ;(globalThis as any).nostr = {
        getPublicKey: vi.fn(),
        signEvent: vi.fn(),
        nip44: {
          encrypt: vi.fn().mockResolvedValue('nip44-encrypted'),
          decrypt: vi.fn().mockResolvedValue('nip44-decrypted'),
        },
        nip04: {
          encrypt: vi.fn().mockResolvedValue('nip04-encrypted'),
          decrypt: vi.fn().mockResolvedValue('nip04-decrypted'),
        },
      }

      const signer = new Nip07Signer()

      expect(await signer.nip44Encrypt('pk', 'text')).toBe('nip44-encrypted')
      expect(await signer.nip44Decrypt('pk', 'ct')).toBe('nip44-decrypted')
    })
  })
})
