import {
  NNC_ERROR_CODES,
  NNC_INFO_KIND,
  NNC_NOTIFICATION_KIND,
  NNC_REQUEST_KIND,
  NNC_RESPONSE_KIND,
  NncClient,
  parseConnectionString as parseConnectionString2
} from "./chunk-SAHPIKNV.js";
import {
  NWC_ERROR_CODES,
  NWC_INFO_KIND,
  NWC_NOTIFICATION_KIND,
  NWC_REQUEST_KIND,
  NWC_RESPONSE_KIND,
  NwcClient,
  NwcConnectionError,
  NwcDecryptionError,
  NwcPublishError,
  NwcPublishTimeout,
  NwcReplyTimeout,
  NwcRequestError,
  NwcTimeoutError,
  NwcWalletError,
  parseConnectionString
} from "./chunk-KQQ3DFCC.js";

// src/signer/secret-key.ts
import { finalizeEvent, getPublicKey } from "nostr-tools/pure";
import * as nip44 from "nostr-tools/nip44";
var SecretKeySigner = class {
  secretKey;
  pubkey;
  conversationKeys = /* @__PURE__ */ new Map();
  constructor(secretKey) {
    this.secretKey = secretKey;
    this.pubkey = getPublicKey(secretKey);
  }
  async getPublicKey() {
    return this.pubkey;
  }
  async signEvent(event) {
    return finalizeEvent(event, this.secretKey);
  }
  async nip44Encrypt(pubkey, plaintext) {
    return nip44.encrypt(plaintext, this.getConversationKey(pubkey));
  }
  async nip44Decrypt(pubkey, ciphertext) {
    return nip44.decrypt(ciphertext, this.getConversationKey(pubkey));
  }
  getConversationKey(pubkey) {
    let key = this.conversationKeys.get(pubkey);
    if (!key) {
      key = nip44.getConversationKey(this.secretKey, pubkey);
      this.conversationKeys.set(pubkey, key);
    }
    return key;
  }
};

// src/signer/nip07.ts
function getNip07Extension() {
  const ext = globalThis.nostr;
  if (!ext) {
    throw new Error(
      "No Nostr extension detected. Install Alby, nos2x, or another NIP-07 signer."
    );
  }
  return ext;
}
var Nip07Signer = class {
  async getPublicKey() {
    return getNip07Extension().getPublicKey();
  }
  async signEvent(event) {
    return getNip07Extension().signEvent(event);
  }
  async nip44Encrypt(pubkey, plaintext) {
    const ext = getNip07Extension();
    if (ext.nip44?.encrypt) {
      return ext.nip44.encrypt(pubkey, plaintext);
    }
    if (ext.nip04?.encrypt) {
      console.warn("NIP-44 not supported by extension, falling back to NIP-04");
      return ext.nip04.encrypt(pubkey, plaintext);
    }
    throw new Error("Extension does not support NIP-44 or NIP-04 encryption");
  }
  async nip44Decrypt(pubkey, ciphertext) {
    const ext = getNip07Extension();
    if (ext.nip44?.decrypt) {
      return ext.nip44.decrypt(pubkey, ciphertext);
    }
    if (ext.nip04?.decrypt) {
      console.warn("NIP-44 not supported by extension, falling back to NIP-04");
      return ext.nip04.decrypt(pubkey, ciphertext);
    }
    throw new Error("Extension does not support NIP-44 or NIP-04 decryption");
  }
};

// src/signer/nip46.ts
var Nip46Signer = class {
  signer = null;
  connecting = null;
  bunkerUri;
  constructor(bunkerUri) {
    this.bunkerUri = bunkerUri;
  }
  async ensureConnected() {
    if (this.signer) return;
    if (this.connecting) return this.connecting;
    this.connecting = (async () => {
      try {
        const { parseBunkerInput, BunkerSigner } = await import("nostr-tools/nip46");
        const { generateSecretKey } = await import("nostr-tools");
        const bp = await parseBunkerInput(this.bunkerUri);
        if (!bp) {
          throw new Error("Invalid bunker URI");
        }
        const clientSecret = generateSecretKey();
        const signer = BunkerSigner.fromBunker(clientSecret, bp);
        await signer.connect();
        this.signer = signer;
      } catch (err) {
        this.connecting = null;
        throw err;
      }
    })();
    return this.connecting;
  }
  async getPublicKey() {
    await this.ensureConnected();
    return this.signer.getPublicKey();
  }
  async signEvent(event) {
    await this.ensureConnected();
    return this.signer.signEvent(event);
  }
  async nip44Encrypt(pubkey, plaintext) {
    await this.ensureConnected();
    const s = this.signer;
    if (s.nip44Encrypt) {
      return s.nip44Encrypt(pubkey, plaintext);
    }
    throw new Error("Remote signer does not support NIP-44 encryption");
  }
  async nip44Decrypt(pubkey, ciphertext) {
    await this.ensureConnected();
    const s = this.signer;
    if (s.nip44Decrypt) {
      return s.nip44Decrypt(pubkey, ciphertext);
    }
    throw new Error("Remote signer does not support NIP-44 decryption");
  }
  async close() {
    if (this.signer) {
      await this.signer.close();
      this.signer = null;
      this.connecting = null;
    }
  }
};

// src/nip98.ts
var NIP98_EVENT_KIND = 27235;
async function createNip98AuthHeader(signer, url, method) {
  const created_at = Math.floor(Date.now() / 1e3);
  const event = {
    kind: NIP98_EVENT_KIND,
    created_at,
    tags: [
      ["u", url],
      ["method", method.toUpperCase()]
    ],
    content: ""
  };
  const signed = await signer.signEvent(event);
  const json = JSON.stringify(signed);
  const base64 = btoa(json);
  return `Nostr ${base64}`;
}
async function createNip98AuthHeaderWithMeta(signer, url, method) {
  const createdAt = Math.floor(Date.now() / 1e3);
  const event = {
    kind: NIP98_EVENT_KIND,
    created_at: createdAt,
    tags: [
      ["u", url],
      ["method", method.toUpperCase()]
    ],
    content: ""
  };
  const signed = await signer.signEvent(event);
  const json = JSON.stringify(signed);
  const base64 = btoa(json);
  return { header: `Nostr ${base64}`, createdAt };
}

// src/transport/browser.ts
var CONNECT_TIMEOUT_MS = 5e3;
var RECONNECT_BASE_MS = 1e3;
var RECONNECT_MAX_MS = 3e4;
var HEARTBEAT_INTERVAL_MS = 3e4;
var MAX_CONCURRENT_REQUESTS = 6;
var BrowserTransport = class {
  relayUrl;
  ws = null;
  messageHandlers = /* @__PURE__ */ new Set();
  connectionListeners = /* @__PURE__ */ new Set();
  connectPromise = null;
  reconnectAttempt = 0;
  reconnectTimer = null;
  heartbeatTimer = null;
  disconnectedByUser = false;
  inFlight = 0;
  queue = [];
  // Configurable
  connectTimeoutMs;
  reconnectBaseMs;
  reconnectMaxMs;
  heartbeatIntervalMs;
  maxConcurrentRequests;
  constructor(relayUrl, opts) {
    this.relayUrl = relayUrl;
    this.connectTimeoutMs = opts?.connectTimeoutMs ?? CONNECT_TIMEOUT_MS;
    this.reconnectBaseMs = opts?.reconnectBaseMs ?? RECONNECT_BASE_MS;
    this.reconnectMaxMs = opts?.reconnectMaxMs ?? RECONNECT_MAX_MS;
    this.heartbeatIntervalMs = opts?.heartbeatIntervalMs ?? HEARTBEAT_INTERVAL_MS;
    this.maxConcurrentRequests = opts?.maxConcurrentRequests ?? MAX_CONCURRENT_REQUESTS;
  }
  get connected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
  onMessage(handler) {
    this.messageHandlers.add(handler);
  }
  onConnectionChange(listener) {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }
  async connect() {
    await this.ensureConnection();
  }
  send(frame) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("WebSocket not connected");
    }
    this.ws.send(frame);
  }
  /**
   * Send with throttling — waits if too many requests are in-flight.
   * Returns a release function the caller MUST invoke when the request completes.
   */
  async sendThrottled(frame) {
    if (this.inFlight >= this.maxConcurrentRequests) {
      await new Promise((resolve) => this.queue.push(resolve));
    }
    this.inFlight++;
    const ws = await this.ensureConnection();
    ws.send(frame);
    return () => {
      this.inFlight--;
      this.queue.shift()?.();
    };
  }
  disconnect() {
    this.disconnectedByUser = true;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    for (const resolve of this.queue) {
      resolve();
    }
    this.queue = [];
    this.inFlight = 0;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  /**
   * Pre-connect WebSocket. Safe to call multiple times.
   */
  preconnect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;
    this.ensureConnection().catch(() => {
    });
  }
  // ─── Internals ─────────────────────────────────────────────────────────
  async ensureConnection() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      return this.ws;
    }
    if (this.connectPromise) return this.connectPromise;
    this.disconnectedByUser = false;
    this.connectPromise = new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
        try {
          this.ws.close();
        } catch {
        }
      }
      const ws = new WebSocket(this.relayUrl);
      this.ws = ws;
      ws.onopen = () => {
        this.reconnectAttempt = 0;
        this.startHeartbeat(ws);
        this.notifyConnectionChange(true);
        resolve(ws);
      };
      ws.onerror = () => {
        reject(new Error(`Relay connection failed: ${this.relayUrl}`));
      };
      ws.onclose = () => {
        this.stopHeartbeat();
        this.ws = null;
        this.notifyConnectionChange(false);
        if (!this.disconnectedByUser) {
          this.scheduleReconnect();
        }
      };
      ws.onmessage = (event) => {
        const data = event.data;
        for (const handler of this.messageHandlers) {
          handler(data);
        }
      };
      setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          reject(new Error("Relay connection timeout"));
        }
      }, this.connectTimeoutMs);
    }).finally(() => {
      this.connectPromise = null;
    });
    return this.connectPromise;
  }
  startHeartbeat(ws) {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) return;
      try {
        ws.send(JSON.stringify(["REQ", "hb", { kinds: [0], limit: 0, since: 2147483647 }]));
        ws.send(JSON.stringify(["CLOSE", "hb"]));
      } catch {
        ws.close();
      }
    }, this.heartbeatIntervalMs);
  }
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
  scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(
      this.reconnectBaseMs * 2 ** this.reconnectAttempt,
      this.reconnectMaxMs
    );
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(async () => {
      this.reconnectTimer = null;
      try {
        await this.ensureConnection();
      } catch {
      }
    }, delay);
  }
  notifyConnectionChange(connected) {
    for (const listener of this.connectionListeners) {
      listener(connected);
    }
  }
};

// src/events.ts
var TransportEventEmitter = class {
  handlers = /* @__PURE__ */ new Set();
  on(handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
  emit(event) {
    const full = { ...event, timestamp: Date.now() };
    for (const handler of this.handlers) {
      try {
        handler(full);
      } catch {
      }
    }
  }
  removeAllListeners() {
    this.handlers.clear();
  }
};
export {
  BrowserTransport,
  NNC_ERROR_CODES,
  NNC_INFO_KIND,
  NNC_NOTIFICATION_KIND,
  NNC_REQUEST_KIND,
  NNC_RESPONSE_KIND,
  NWC_ERROR_CODES,
  NWC_INFO_KIND,
  NWC_NOTIFICATION_KIND,
  NWC_REQUEST_KIND,
  NWC_RESPONSE_KIND,
  Nip07Signer,
  Nip46Signer,
  NncClient,
  NwcClient,
  NwcConnectionError,
  NwcDecryptionError,
  NwcPublishError,
  NwcPublishTimeout,
  NwcReplyTimeout,
  NwcRequestError,
  NwcTimeoutError,
  NwcWalletError,
  SecretKeySigner,
  TransportEventEmitter,
  createNip98AuthHeader,
  createNip98AuthHeaderWithMeta,
  parseConnectionString,
  parseConnectionString2 as parseNncConnectionString
};
//# sourceMappingURL=index.js.map