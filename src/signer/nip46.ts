import type { EventTemplate, VerifiedEvent } from 'nostr-tools/core'
import type { NwcSigner } from './types.js'

/**
 * Signer that delegates to a NIP-46 remote signer via bunker:// URI.
 *
 * Uses dynamic import for nostr-tools/nip46 so the dependency is optional —
 * apps that don't use NIP-46 pay no bundle cost.
 *
 * The bunker connection is established lazily on first use and deduplicated
 * so concurrent calls don't race. On connection failure, the next call retries.
 */
export class Nip46Signer implements NwcSigner {
  private signer: {
    getPublicKey: () => Promise<string>
    signEvent: (e: EventTemplate) => Promise<VerifiedEvent>
    close: () => Promise<void>
  } | null = null
  private connecting: Promise<void> | null = null
  private bunkerUri: string

  constructor(bunkerUri: string) {
    this.bunkerUri = bunkerUri
  }

  private async ensureConnected(): Promise<void> {
    if (this.signer) return
    if (this.connecting) return this.connecting

    this.connecting = (async () => {
      try {
        const { parseBunkerInput, BunkerSigner } = await import('nostr-tools/nip46')
        const { generateSecretKey } = await import('nostr-tools')

        const bp = await parseBunkerInput(this.bunkerUri)
        if (!bp) {
          throw new Error('Invalid bunker URI')
        }

        const clientSecret = generateSecretKey()
        const signer = BunkerSigner.fromBunker(clientSecret, bp)
        await signer.connect()
        this.signer = signer as unknown as typeof this.signer
      } catch (err) {
        this.connecting = null // Allow retry on next call
        throw err
      }
    })()

    return this.connecting
  }

  async getPublicKey(): Promise<string> {
    await this.ensureConnected()
    return this.signer!.getPublicKey()
  }

  async signEvent(event: EventTemplate): Promise<VerifiedEvent> {
    await this.ensureConnected()
    return this.signer!.signEvent(event)
  }

  async nip44Encrypt(pubkey: string, plaintext: string): Promise<string> {
    await this.ensureConnected()
    const s = this.signer as unknown as { nip44Encrypt?: (pk: string, pt: string) => Promise<string> }
    if (s.nip44Encrypt) {
      return s.nip44Encrypt(pubkey, plaintext)
    }
    throw new Error('Remote signer does not support NIP-44 encryption')
  }

  async nip44Decrypt(pubkey: string, ciphertext: string): Promise<string> {
    await this.ensureConnected()
    const s = this.signer as unknown as { nip44Decrypt?: (pk: string, ct: string) => Promise<string> }
    if (s.nip44Decrypt) {
      return s.nip44Decrypt(pubkey, ciphertext)
    }
    throw new Error('Remote signer does not support NIP-44 decryption')
  }

  async close(): Promise<void> {
    if (this.signer) {
      await this.signer.close()
      this.signer = null
      this.connecting = null
    }
  }
}
