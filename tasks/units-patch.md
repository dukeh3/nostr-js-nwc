# Units patch — `_sats` suffix rule in TS types

Status: **on branch `patch-units`**, pending PR.

## What this patch does

Cascades the NIP-47/XX units clarification ([Red-Token/nips#1](https://github.com/Red-Token/nips/pull/1), merged) into the SDK's TypeScript types. The new spec requires every sats-denominated field to carry a `_sats` suffix; everything else stays msats. This PR brings the TS surface into line.

## Field renames

| File | Interface | Old field | New field |
| --- | --- | --- | --- |
| `nipXX.ts` | `OpenChannelParams` | `amount: number // value in msats` (wrong) | `amount_sats: number` (sats) |
| `nipXX.ts` | `OpenChannelParams` | `push_amount` (comment) | `push_amount` — comment corrected to msats |
| `nip47.ts` | `PayOnchainParams` | `amount: number` | `amount_sats: number` |
| `nip47.ts` | `LookupAddressResult` | `total_received` | `total_received_sats` |
| `nip47.ts` | `LookupAddressResult.transactions[]` | `amount` | `amount_sats` |
| `nip47.ts` | `GetBalanceResult` | `onchain_balance` | `onchain_balance_sats` |
| `nip47.ts` | `AddressInfo` | `total_received` | `total_received_sats` |

Fee policy fields (`base_fee`, `min_htlc`, `max_htlc` on `ChannelPolicy`, `GetChannelFeesResult`, `SetChannelFeesParams`) already match the new plain-name convention. No change needed.

## Runtime changes

None. All changes are type-level. The SDK forwards request params to the wire and parses response JSON by key; renaming the TS field name automatically changes the wire key it reads/writes because these types use default serde/JSON conventions.

## Verification

- `npm run typecheck` — green.
- `npm test` — 137 unit tests pass. 38 failures all in `tests/e2e/*` (pre-existing, require local Docker stack — unrelated to this patch).

End-to-end verification happens next in `nostr-js-nwc-integration-test` (separate task) against the already-deployed alice+bob nodes on d100.

## Upstream pipeline

- [Red-Token/nips#1](https://github.com/Red-Token/nips/pull/1) — spec changes (merged `8ceda52`).
- [dukeh3/nostr#4](https://github.com/dukeh3/nostr/pull/4) — Rust nwc-crate rename (merged `247df9c1`).
- [dukeh3/ldk-controller#122](https://github.com/dukeh3/ldk-controller/pull/122) — service cascade (merged; Jenkins `ldk-controller-deb#6` + `ldk-controller-system-test#3` both green — alice/bob already running the new wire).
- **this PR** — TS SDK types.
- Next: `nostr-js-nwc-integration-test` updates against the deployed alice/bob.

## Deferred

- `list_transactions` polymorphism — on-chain entries should use `amount_sats` / `fees_paid_sats` while Lightning entries keep `amount` / `fees_paid`. Needs a discriminated union on `TransactionInfo`. Separate follow-up.
