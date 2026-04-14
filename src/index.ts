// ─── Layer 1: Protocol modules (upstreamable to nostr-tools) ─────────────
export * from '../nip47.js'
export {
  // Event kinds
  NNC_INFO_KIND, NNC_REQUEST_KIND, NNC_RESPONSE_KIND, NNC_NOTIFICATION_KIND,
  // Error codes
  NNC_ERROR_CODES,
  // Client
  NncClient,
  // Connection string
  parseConnectionString as parseNncConnectionString,
  // Types
  type NncErrorCode, type NncResponse, type NncNotification,
  type NotificationMeta, type SubscribeOptions,
  type NncConnectionParams, type NncClientOptions,
  type ChannelInfo, type ListChannelsResult,
  type OpenChannelParams, type CloseChannelParams,
  type PeerInfo, type ListPeersResult,
  type ConnectPeerParams, type DisconnectPeerParams,
  type ChannelFeeInfo, type GetChannelFeesParams, type GetChannelFeesResult,
  type SetChannelFeesParams,
  type GetForwardingHistoryParams, type ForwardInfo, type GetForwardingHistoryResult,
  type HtlcInfo, type GetPendingHtlcsResult,
  type QueryRoutesParams, type RouteHop, type RouteInfo, type QueryRoutesResult,
  type NetworkNodeInfo, type ListNetworkNodesParams, type ListNetworkNodesResult,
  type GetNetworkStatsResult,
  type GetNetworkNodeParams, type GetNetworkNodeResult,
  type ChannelPolicy, type GetNetworkChannelParams, type GetNetworkChannelResult,
  type UsageProfile, type GrantInfo,
} from '../nipXX.js'

// ─── Layer 2: SDK value-add ──────────────────────────────────────────────

// Signer interface + implementations
export type { NwcSigner } from './signer/types.js'
export { SecretKeySigner } from './signer/secret-key.js'
export { Nip07Signer } from './signer/nip07.js'
export { Nip46Signer } from './signer/nip46.js'

// NIP-98 HTTP Auth
export { createNip98AuthHeader, createNip98AuthHeaderWithMeta } from './nip98.js'

// Transport
export type { Transport } from './transport/types.js'
export { BrowserTransport } from './transport/browser.js'
export type { BrowserTransportOptions } from './transport/browser.js'

// Event emitter
export { TransportEventEmitter } from './events.js'
export type { TransportEvent } from './events.js'
