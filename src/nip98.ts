/**
 * NIP-98 HTTP Auth — constructs signed kind 27235 events for backend API auth.
 *
 * Every authenticated HTTP request carries:
 *   Authorization: Nostr <base64(JSON(signedEvent))>
 *
 * The event includes `u` (URL) and `method` (HTTP method) tags
 * so the backend can verify the request matches the signed intent.
 */

import type { NwcSigner } from './signer/types.js'

const NIP98_EVENT_KIND = 27235

/**
 * Create a NIP-98 Authorization header value for an HTTP request.
 * Returns the full header value: "Nostr <base64>"
 */
export async function createNip98AuthHeader(
  signer: NwcSigner,
  url: string,
  method: string,
): Promise<string> {
  const created_at = Math.floor(Date.now() / 1000)
  const event = {
    kind: NIP98_EVENT_KIND,
    created_at,
    tags: [
      ['u', url],
      ['method', method.toUpperCase()],
    ],
    content: '',
  }

  const signed = await signer.signEvent(event)
  const json = JSON.stringify(signed)
  const base64 = btoa(json)

  return `Nostr ${base64}`
}

/**
 * Same as createNip98AuthHeader but also returns the created_at epoch
 * so callers can detect clock skew.
 */
export async function createNip98AuthHeaderWithMeta(
  signer: NwcSigner,
  url: string,
  method: string,
): Promise<{ header: string; createdAt: number }> {
  const createdAt = Math.floor(Date.now() / 1000)
  const event = {
    kind: NIP98_EVENT_KIND,
    created_at: createdAt,
    tags: [
      ['u', url],
      ['method', method.toUpperCase()],
    ],
    content: '',
  }

  const signed = await signer.signEvent(event)
  const json = JSON.stringify(signed)
  const base64 = btoa(json)

  return { header: `Nostr ${base64}`, createdAt }
}
