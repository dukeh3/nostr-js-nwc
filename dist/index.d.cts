export { AddressInfo, CancelHoldInvoiceParams, DisableOfferParams, EstimateOnchainFeesResult, EstimateRoutingFeesParams, EstimateRoutingFeesResult, GetBalanceResult, GetInfoResult, InvoiceInfo, ListAddressesParams, ListAddressesResult, ListInvoicesParams, ListInvoicesResult, ListOffersParams, ListOffersResult, ListTransactionsParams, ListTransactionsResult, LookupAddressParams, LookupAddressResult, LookupInvoiceParams, LookupInvoiceResult, LookupOfferParams, LookupOfferResult, MakeBip321Params, MakeBip321Result, MakeHoldInvoiceParams, MakeHoldInvoiceResult, MakeInvoiceParams, MakeInvoiceResult, MakeNewAddressParams, MakeNewAddressResult, MakeOfferParams, MakeOfferResult, NWC_ERROR_CODES, NWC_INFO_KIND, NWC_NOTIFICATION_KIND, NWC_REQUEST_KIND, NWC_RESPONSE_KIND, NwcClient, NwcClientOptions, NwcConnectionError, NwcConnectionParams, NwcDecryptionError, NwcErrorCode, NwcNotification, NwcPublishError, NwcPublishTimeout, NwcReplyTimeout, NwcRequestError, NwcResponse, NwcTimeoutError, NwcWalletError, OfferInfo, PayBip321Params, PayBip321Result, PayInvoiceParams, PayInvoiceResult, PayKeysendParams, PayKeysendResult, PayOfferParams, PayOfferResult, PayOnchainParams, PayOnchainResult, SettleHoldInvoiceParams, SignMessageParams, SignMessageResult, TransactionInfo, parseConnectionString } from './nip47.cjs';
export { ChannelFeeInfo, ChannelInfo, ChannelPolicy, CloseChannelParams, ConnectPeerParams, DisconnectPeerParams, ForwardInfo, GetChannelFeesParams, GetChannelFeesResult, GetForwardingHistoryParams, GetForwardingHistoryResult, GetNetworkChannelParams, GetNetworkChannelResult, GetNetworkNodeParams, GetNetworkNodeResult, GetNetworkStatsResult, GetPendingHtlcsResult, GrantInfo, HtlcInfo, ListChannelsResult, ListNetworkNodesParams, ListNetworkNodesResult, ListPeersResult, NNC_ERROR_CODES, NNC_INFO_KIND, NNC_NOTIFICATION_KIND, NNC_REQUEST_KIND, NNC_RESPONSE_KIND, NetworkNodeInfo, NncClient, NncClientOptions, NncConnectionParams, NncErrorCode, NncNotification, NncResponse, OpenChannelParams, PeerInfo, QueryRoutesParams, QueryRoutesResult, RouteHop, RouteInfo, SetChannelFeesParams, UsageProfile, parseConnectionString as parseNncConnectionString } from './nipXX.cjs';
import { N as NwcSigner } from './types-BisFYdAo.cjs';
import { EventTemplate, VerifiedEvent } from 'nostr-tools/core';
import 'nostr-tools/abstract-pool';
import 'nostr-tools/signer';

/**
 * Signer that wraps a raw secret key. Uses nostr-tools finalizeEvent + nip44.
 * Caches NIP-44 conversation keys per pubkey for performance.
 *
 * Suitable for Node.js, backend, and CLI usage where the secret key is available.
 */
declare class SecretKeySigner implements NwcSigner {
    private secretKey;
    private pubkey;
    private conversationKeys;
    constructor(secretKey: Uint8Array);
    getPublicKey(): Promise<string>;
    signEvent(event: EventTemplate): Promise<VerifiedEvent>;
    nip44Encrypt(pubkey: string, plaintext: string): Promise<string>;
    nip44Decrypt(pubkey: string, ciphertext: string): Promise<string>;
    private getConversationKey;
}

/**
 * Signer that delegates to a NIP-07 browser extension (Alby, nos2x, etc.).
 * Falls back to NIP-04 when the extension doesn't support NIP-44.
 */
declare class Nip07Signer implements NwcSigner {
    getPublicKey(): Promise<string>;
    signEvent(event: EventTemplate): Promise<VerifiedEvent>;
    nip44Encrypt(pubkey: string, plaintext: string): Promise<string>;
    nip44Decrypt(pubkey: string, ciphertext: string): Promise<string>;
}

/**
 * Signer that delegates to a NIP-46 remote signer via bunker:// URI.
 *
 * Uses dynamic import for nostr-tools/nip46 so the dependency is optional —
 * apps that don't use NIP-46 pay no bundle cost.
 *
 * The bunker connection is established lazily on first use and deduplicated
 * so concurrent calls don't race. On connection failure, the next call retries.
 */
declare class Nip46Signer implements NwcSigner {
    private signer;
    private connecting;
    private bunkerUri;
    constructor(bunkerUri: string);
    private ensureConnected;
    getPublicKey(): Promise<string>;
    signEvent(event: EventTemplate): Promise<VerifiedEvent>;
    nip44Encrypt(pubkey: string, plaintext: string): Promise<string>;
    nip44Decrypt(pubkey: string, ciphertext: string): Promise<string>;
    close(): Promise<void>;
}

/**
 * NIP-98 HTTP Auth — constructs signed kind 27235 events for backend API auth.
 *
 * Every authenticated HTTP request carries:
 *   Authorization: Nostr <base64(JSON(signedEvent))>
 *
 * The event includes `u` (URL) and `method` (HTTP method) tags
 * so the backend can verify the request matches the signed intent.
 */

/**
 * Create a NIP-98 Authorization header value for an HTTP request.
 * Returns the full header value: "Nostr <base64>"
 */
declare function createNip98AuthHeader(signer: NwcSigner, url: string, method: string): Promise<string>;
/**
 * Same as createNip98AuthHeader but also returns the created_at epoch
 * so callers can detect clock skew.
 */
declare function createNip98AuthHeaderWithMeta(signer: NwcSigner, url: string, method: string): Promise<{
    header: string;
    createdAt: number;
}>;

/**
 * Transport interface for relay communication.
 * The default NwcClient uses nostr-tools SimplePool directly.
 * BrowserTransport adds auto-reconnect, heartbeat, and throttling.
 */
interface Transport {
    /** Send raw JSON frame to the relay. */
    send(frame: string): void;
    /** Register handler for incoming frames. */
    onMessage(handler: (data: string) => void): void;
    /** Whether the transport is currently connected. */
    readonly connected: boolean;
    /** Connect to the relay. */
    connect(): Promise<void>;
    /** Disconnect from the relay. */
    disconnect(): void;
}

interface BrowserTransportOptions {
    connectTimeoutMs?: number;
    reconnectBaseMs?: number;
    reconnectMaxMs?: number;
    heartbeatIntervalMs?: number;
    maxConcurrentRequests?: number;
}
/**
 * Browser WebSocket transport with auto-reconnect, heartbeat, and throttling.
 *
 * Adapted from LP's NostrNodeClient — provides the connection management
 * layer that SimplePool doesn't offer.
 */
declare class BrowserTransport implements Transport {
    private relayUrl;
    private ws;
    private messageHandlers;
    private connectionListeners;
    private connectPromise;
    private reconnectAttempt;
    private reconnectTimer;
    private heartbeatTimer;
    private disconnectedByUser;
    private inFlight;
    private queue;
    private connectTimeoutMs;
    private reconnectBaseMs;
    private reconnectMaxMs;
    private heartbeatIntervalMs;
    private maxConcurrentRequests;
    constructor(relayUrl: string, opts?: BrowserTransportOptions);
    get connected(): boolean;
    onMessage(handler: (data: string) => void): void;
    onConnectionChange(listener: (connected: boolean) => void): () => void;
    connect(): Promise<void>;
    send(frame: string): void;
    /**
     * Send with throttling — waits if too many requests are in-flight.
     * Returns a release function the caller MUST invoke when the request completes.
     */
    sendThrottled(frame: string): Promise<() => void>;
    disconnect(): void;
    /**
     * Pre-connect WebSocket. Safe to call multiple times.
     */
    preconnect(): void;
    private ensureConnection;
    private startHeartbeat;
    private stopHeartbeat;
    private scheduleReconnect;
    private notifyConnectionChange;
}

/**
 * Structured event emitter for SDK diagnostics.
 * Replaces LP's pushConsoleLog() with typed events.
 */
interface TransportEvent {
    type: 'request' | 'response' | 'notification' | 'error' | 'connection';
    timestamp: number;
    method?: string;
    servicePubkey?: string;
    kind?: number;
    latencyMs?: number;
    error?: string;
    eventId?: string;
}
type EventHandler = (event: TransportEvent) => void;
declare class TransportEventEmitter {
    private handlers;
    on(handler: EventHandler): () => void;
    emit(event: Omit<TransportEvent, 'timestamp'>): void;
    removeAllListeners(): void;
}

export { BrowserTransport, type BrowserTransportOptions, Nip07Signer, Nip46Signer, NwcSigner, SecretKeySigner, type Transport, type TransportEvent, TransportEventEmitter, createNip98AuthHeader, createNip98AuthHeaderWithMeta };
