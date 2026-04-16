"use strict";Object.defineProperty(exports, "__esModule", {value: true}); function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { newObj[key] = obj[key]; } } } newObj.default = obj; return newObj; } } function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; } var _class; var _class2; var _class3; var _class4;







var _chunkO2WYPE5Ucjs = require('./chunk-O2WYPE5U.cjs');
















var _chunk6N6AEFRBcjs = require('./chunk-6N6AEFRB.cjs');

// src/signer/secret-key.ts
var _pure = require('nostr-tools/pure');
var _nip44 = require('nostr-tools/nip44'); var nip44 = _interopRequireWildcard(_nip44);
var SecretKeySigner = (_class = class {
  
  
  __init() {this.conversationKeys = /* @__PURE__ */ new Map()}
  constructor(secretKey) {;_class.prototype.__init.call(this);
    this.secretKey = secretKey;
    this.pubkey = _pure.getPublicKey.call(void 0, secretKey);
  }
  async getPublicKey() {
    return this.pubkey;
  }
  async signEvent(event) {
    return _pure.finalizeEvent.call(void 0, event, this.secretKey);
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
}, _class);

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
    if (_optionalChain([ext, 'access', _ => _.nip44, 'optionalAccess', _2 => _2.encrypt])) {
      return ext.nip44.encrypt(pubkey, plaintext);
    }
    if (_optionalChain([ext, 'access', _3 => _3.nip04, 'optionalAccess', _4 => _4.encrypt])) {
      console.warn("NIP-44 not supported by extension, falling back to NIP-04");
      return ext.nip04.encrypt(pubkey, plaintext);
    }
    throw new Error("Extension does not support NIP-44 or NIP-04 encryption");
  }
  async nip44Decrypt(pubkey, ciphertext) {
    const ext = getNip07Extension();
    if (_optionalChain([ext, 'access', _5 => _5.nip44, 'optionalAccess', _6 => _6.decrypt])) {
      return ext.nip44.decrypt(pubkey, ciphertext);
    }
    if (_optionalChain([ext, 'access', _7 => _7.nip04, 'optionalAccess', _8 => _8.decrypt])) {
      console.warn("NIP-44 not supported by extension, falling back to NIP-04");
      return ext.nip04.decrypt(pubkey, ciphertext);
    }
    throw new Error("Extension does not support NIP-44 or NIP-04 decryption");
  }
};

// src/signer/nip46.ts
var Nip46Signer = (_class2 = class {
  __init2() {this.signer = null}
  __init3() {this.connecting = null}
  
  constructor(bunkerUri) {;_class2.prototype.__init2.call(this);_class2.prototype.__init3.call(this);
    this.bunkerUri = bunkerUri;
  }
  async ensureConnected() {
    if (this.signer) return;
    if (this.connecting) return this.connecting;
    this.connecting = (async () => {
      try {
        const { parseBunkerInput, BunkerSigner } = await Promise.resolve().then(() => _interopRequireWildcard(require("nostr-tools/nip46")));
        const { generateSecretKey } = await Promise.resolve().then(() => _interopRequireWildcard(require("nostr-tools")));
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
}, _class2);

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
var BrowserTransport = (_class3 = class {
  
  __init4() {this.ws = null}
  __init5() {this.messageHandlers = /* @__PURE__ */ new Set()}
  __init6() {this.connectionListeners = /* @__PURE__ */ new Set()}
  __init7() {this.connectPromise = null}
  __init8() {this.reconnectAttempt = 0}
  __init9() {this.reconnectTimer = null}
  __init10() {this.heartbeatTimer = null}
  __init11() {this.disconnectedByUser = false}
  __init12() {this.inFlight = 0}
  __init13() {this.queue = []}
  // Configurable
  
  
  
  
  
  constructor(relayUrl, opts) {;_class3.prototype.__init4.call(this);_class3.prototype.__init5.call(this);_class3.prototype.__init6.call(this);_class3.prototype.__init7.call(this);_class3.prototype.__init8.call(this);_class3.prototype.__init9.call(this);_class3.prototype.__init10.call(this);_class3.prototype.__init11.call(this);_class3.prototype.__init12.call(this);_class3.prototype.__init13.call(this);
    this.relayUrl = relayUrl;
    this.connectTimeoutMs = _nullishCoalesce(_optionalChain([opts, 'optionalAccess', _9 => _9.connectTimeoutMs]), () => ( CONNECT_TIMEOUT_MS));
    this.reconnectBaseMs = _nullishCoalesce(_optionalChain([opts, 'optionalAccess', _10 => _10.reconnectBaseMs]), () => ( RECONNECT_BASE_MS));
    this.reconnectMaxMs = _nullishCoalesce(_optionalChain([opts, 'optionalAccess', _11 => _11.reconnectMaxMs]), () => ( RECONNECT_MAX_MS));
    this.heartbeatIntervalMs = _nullishCoalesce(_optionalChain([opts, 'optionalAccess', _12 => _12.heartbeatIntervalMs]), () => ( HEARTBEAT_INTERVAL_MS));
    this.maxConcurrentRequests = _nullishCoalesce(_optionalChain([opts, 'optionalAccess', _13 => _13.maxConcurrentRequests]), () => ( MAX_CONCURRENT_REQUESTS));
  }
  get connected() {
    return _optionalChain([this, 'access', _14 => _14.ws, 'optionalAccess', _15 => _15.readyState]) === WebSocket.OPEN;
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
      _optionalChain([this, 'access', _16 => _16.queue, 'access', _17 => _17.shift, 'call', _18 => _18(), 'optionalCall', _19 => _19()]);
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
        } catch (e) {
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
      } catch (e2) {
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
      } catch (e3) {
      }
    }, delay);
  }
  notifyConnectionChange(connected) {
    for (const listener of this.connectionListeners) {
      listener(connected);
    }
  }
}, _class3);

// src/events.ts
var TransportEventEmitter = (_class4 = class {constructor() { _class4.prototype.__init14.call(this); }
  __init14() {this.handlers = /* @__PURE__ */ new Set()}
  on(handler) {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
  emit(event) {
    const full = { ...event, timestamp: Date.now() };
    for (const handler of this.handlers) {
      try {
        handler(full);
      } catch (e4) {
      }
    }
  }
  removeAllListeners() {
    this.handlers.clear();
  }
}, _class4);






























exports.BrowserTransport = BrowserTransport; exports.NNC_ERROR_CODES = _chunkO2WYPE5Ucjs.NNC_ERROR_CODES; exports.NNC_INFO_KIND = _chunkO2WYPE5Ucjs.NNC_INFO_KIND; exports.NNC_NOTIFICATION_KIND = _chunkO2WYPE5Ucjs.NNC_NOTIFICATION_KIND; exports.NNC_REQUEST_KIND = _chunkO2WYPE5Ucjs.NNC_REQUEST_KIND; exports.NNC_RESPONSE_KIND = _chunkO2WYPE5Ucjs.NNC_RESPONSE_KIND; exports.NWC_ERROR_CODES = _chunk6N6AEFRBcjs.NWC_ERROR_CODES; exports.NWC_INFO_KIND = _chunk6N6AEFRBcjs.NWC_INFO_KIND; exports.NWC_NOTIFICATION_KIND = _chunk6N6AEFRBcjs.NWC_NOTIFICATION_KIND; exports.NWC_REQUEST_KIND = _chunk6N6AEFRBcjs.NWC_REQUEST_KIND; exports.NWC_RESPONSE_KIND = _chunk6N6AEFRBcjs.NWC_RESPONSE_KIND; exports.Nip07Signer = Nip07Signer; exports.Nip46Signer = Nip46Signer; exports.NncClient = _chunkO2WYPE5Ucjs.NncClient; exports.NwcClient = _chunk6N6AEFRBcjs.NwcClient; exports.NwcConnectionError = _chunk6N6AEFRBcjs.NwcConnectionError; exports.NwcDecryptionError = _chunk6N6AEFRBcjs.NwcDecryptionError; exports.NwcPublishError = _chunk6N6AEFRBcjs.NwcPublishError; exports.NwcPublishTimeout = _chunk6N6AEFRBcjs.NwcPublishTimeout; exports.NwcReplyTimeout = _chunk6N6AEFRBcjs.NwcReplyTimeout; exports.NwcRequestError = _chunk6N6AEFRBcjs.NwcRequestError; exports.NwcTimeoutError = _chunk6N6AEFRBcjs.NwcTimeoutError; exports.NwcWalletError = _chunk6N6AEFRBcjs.NwcWalletError; exports.SecretKeySigner = SecretKeySigner; exports.TransportEventEmitter = TransportEventEmitter; exports.createNip98AuthHeader = createNip98AuthHeader; exports.createNip98AuthHeaderWithMeta = createNip98AuthHeaderWithMeta; exports.parseConnectionString = _chunk6N6AEFRBcjs.parseConnectionString; exports.parseNncConnectionString = _chunkO2WYPE5Ucjs.parseConnectionString;
//# sourceMappingURL=index.cjs.map