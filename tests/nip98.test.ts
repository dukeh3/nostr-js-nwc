import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createNip98AuthHeader, createNip98AuthHeaderWithMeta } from '../src/nip98.js'
import type { NwcSigner } from '../src/signer/types.js'

describe('NIP-98 Auth', () => {
  let mockSigner: NwcSigner

  beforeEach(() => {
    mockSigner = {
      getPublicKey: vi.fn().mockResolvedValue('aabb'.repeat(16)),
      signEvent: vi.fn().mockImplementation(async (event: any) => ({
        ...event,
        id: 'event-id',
        pubkey: 'aabb'.repeat(16),
        sig: 'event-sig',
      })),
      nip44Encrypt: vi.fn(),
      nip44Decrypt: vi.fn(),
    }
  })

  describe('createNip98AuthHeader', () => {
    it('returns header in "Nostr <base64>" format', async () => {
      const header = await createNip98AuthHeader(
        mockSigner,
        'https://api.example.com/data',
        'GET',
      )

      expect(header).toMatch(/^Nostr [A-Za-z0-9+/]+=*$/)
    })

    it('signs a kind 27235 event', async () => {
      await createNip98AuthHeader(
        mockSigner,
        'https://api.example.com/data',
        'POST',
      )

      expect(mockSigner.signEvent).toHaveBeenCalledOnce()
      const event = vi.mocked(mockSigner.signEvent).mock.calls[0][0]
      expect(event.kind).toBe(27235)
    })

    it('includes u and method tags', async () => {
      await createNip98AuthHeader(
        mockSigner,
        'https://api.example.com/data',
        'POST',
      )

      const event = vi.mocked(mockSigner.signEvent).mock.calls[0][0]
      expect(event.tags).toEqual([
        ['u', 'https://api.example.com/data'],
        ['method', 'POST'],
      ])
    })

    it('uppercases the method', async () => {
      await createNip98AuthHeader(
        mockSigner,
        'https://api.example.com/data',
        'get',
      )

      const event = vi.mocked(mockSigner.signEvent).mock.calls[0][0]
      expect(event.tags[1]).toEqual(['method', 'GET'])
    })

    it('base64 decodes to valid signed event JSON', async () => {
      const header = await createNip98AuthHeader(
        mockSigner,
        'https://api.example.com/data',
        'GET',
      )

      const base64 = header.replace('Nostr ', '')
      const json = atob(base64)
      const event = JSON.parse(json)

      expect(event.kind).toBe(27235)
      expect(event.id).toBe('event-id')
      expect(event.pubkey).toBe('aabb'.repeat(16))
      expect(event.sig).toBe('event-sig')
      expect(event.content).toBe('')
    })

    it('has empty content', async () => {
      await createNip98AuthHeader(
        mockSigner,
        'https://api.example.com/data',
        'GET',
      )

      const event = vi.mocked(mockSigner.signEvent).mock.calls[0][0]
      expect(event.content).toBe('')
    })
  })

  describe('createNip98AuthHeaderWithMeta', () => {
    it('returns header and createdAt', async () => {
      const result = await createNip98AuthHeaderWithMeta(
        mockSigner,
        'https://api.example.com/data',
        'POST',
      )

      expect(result.header).toMatch(/^Nostr [A-Za-z0-9+/]+=*$/)
      expect(typeof result.createdAt).toBe('number')
      expect(result.createdAt).toBeGreaterThan(0)
    })

    it('createdAt matches the event timestamp', async () => {
      const result = await createNip98AuthHeaderWithMeta(
        mockSigner,
        'https://api.example.com/data',
        'GET',
      )

      const event = vi.mocked(mockSigner.signEvent).mock.calls[0][0]
      expect(event.created_at).toBe(result.createdAt)
    })
  })
})
