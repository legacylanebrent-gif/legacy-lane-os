# Install Customer.io Marketing Automation (Parity with EstateSalen)

Install and activate the Customer.io integration in THIS app so it operates at the same service level and with the same function set as the EstateSalen app. Follow this contract exactly. Do not invent alternative architectures.

## 1. Overview

Customer.io is the marketing automation engine (email campaigns, segments, behavioral triggers). THIS app will:

- Maintain a `ConsumerMarketingProfile` record per user with marketing opt-in flags, location, and identity fields
- Push profile data to Customer.io (identify) whenever a user signs up, completes onboarding, or saves their profile
- Track behavioral events (sales, subscriptions, follows, purchases) in Customer.io via the Track API
- Receive lifecycle webhooks back from Customer.io (opens, clicks, unsubscribes) and log them

## 2. Secrets (declare all — the owner supplies the values, shared from the EstateSalen account)

Declare these secret names EXACTLY (same values as EstateSalen — one shared Customer.io workspace):

- `CUSTOMERIO_ENABLED` — set to `true` to activate
- `CUSTOMERIO_SITE_ID` — Customer.io Track API Site ID
- `CUSTOMERIO_API_KEY` — Customer.io Track API Key (used for identify + events)
- `CUSTOMERIO_APP_API_KEY` — Customer.io App API Key (Bearer auth, for segments API)
- `CUSTOMERIO_PIPELINES_WRITE_KEY` — Pipelines write key (CDP API)
- `CUSTOMERIO_REGION` — `us` or `eu`
- `CUSTOMERIO_API_MODE` — `track_api`
- `CUSTOMERIO_WEBHOOK_KEY` — shared secret for inbound webhook verification (query param `?key=` fallback and HMAC header)
- `CUSTOMERIO_WEBHOOK_SIGNING_SECRET` — HMAC-SHA256 secret for verifying `x-customerio-signature` headers
- `CUSTOMERIO_DEFAULT_FROM_EMAIL`, `CUSTOMERIO_DEFAULT_FROM_NAME` — default sender identity (e.g. "EstateSalen Alerts")

## 3. Entity: `ConsumerMarketingProfile`

Create entity `ConsumerMarketingProfile` with these fields (RLS: users read/update their own by `created_by_id` or `data.user_id`; admins full access; create open for anonymous lead/profile creation):

- `user_id` (string), `email` (string, required), `first_name`, `last_name`, `phone`
- Location: `zip_code`, `city`, `state`, `latitude`, `longitude`
- Marketing: `preferred_radius_miles` (number, default 25), `global_marketing_opt_in` (bool, default true), `estate_sale_alerts_opt_in` (bool, default true), `vip_alerts_opt_in` (bool, default false), `weekly_digest_opt_in` (bool, default false)
- Sync state: `last_synced_to_customerio_at` (date-time), `customerio_profile_id` (string), `suppression_status` (enum: active, unsubscribed_all, bounced, complained, suppressed — default active)
- Source: `source` (enum: website_signup, operator_page, sale_page, import, admin_added — default website_signup), `created_at`, `updated_at` (date-time)
- Identity: `masterUserID` (string — cross-platform identity ID; used as the Customer.io identifier when present), `identityResolutionStatus` (enum: pending, resolved, provisional, review_required, failed, retrying — default pending)

## 4. Backend functions (create all four)

### 4.1 `customerioService` — the service layer (single entry point, action-dispatched)

Read config from env (enabled = `CUSTOMERIO_ENABLED === 'true'`; configured = enabled AND siteId AND apiKey present). Region URLs: Track `https://track.customer.io` (eu: `track-eu.customer.io`), App API `https://api.customer.io` (eu: `api-eu.customer.io`). Auth for Track API: `Basic base64(siteId:apiKey)`. Auth for App API: `Bearer appApiKey`.

POST JSON body: `{ action, ...params }`. Actions:

1. **`getConfig`** (admin only) — returns `{ enabled, configured, apiMode: 'track_api', region, fromName, hasCredentials, status }`
2. **`testConnection`** (admin only) — identify a test person, log a `MarketingIntegrationSettings` record (provider: 'customerio', status, last_tested_at, last_success_at, updated_by), return success/failure with message
3. **`identifyConsumer`** — PUT `/api/v1/customers/{identifier}` (Track API). Identifier = `masterUserID.toLowerCase()` when present, else normalized email (trim + lowercase — log a warning when falling back to email). Attributes sent: email, first_name, last_name, phone (normalized to E.164: strip non-digits, 10-digit → `+1` prefix), role/subscription tier + status, zip/city/state, notification_radius_miles, all opt-in flags, followed operator ids/names, source, created_at, updated_at, and identity flags `is_estatesalen_user: true`, `platforms: ['estatesalen']` (adapt platform flag to THIS app's name), local user id, master_user_id. On success: update the matching `ConsumerMarketingProfile` with `last_synced_to_customerio_at` = now and the identifier. Retry up to 3x with backoff on 429/5xx. Never send the API keys anywhere except the Customer.io auth header — never log or return them.
4. **`trackEvent`** — POST `/api/v1/customers/{identifier}/events` with `{ name, data: { ...data, triggered_at } }`
5. **`syncOperatorSubscription`** — tracks `consumer.subscribed_to_operator` / `consumer.unsubscribed_from_operator` / `consumer.paused_operator_alerts` events from a follower-subscription record
6. **`syncSaleEvent`** — for trigger types `sale_created|sale_updated|sale_approved|sale_reminder|sale_final_day|sale_cancelled`, map to event names `sale.created|sale.updated|sale.approved|sale.reminder_due|sale.final_day|sale.cancelled`; create a `SaleMarketingTrigger` record (status pending → processed with eligible_consumer_count and events_sent_count); fan out to every active follower subscription, skipping profiles with `global_marketing_opt_in: false`, `estate_sale_alerts_opt_in: false`, or `suppression_status !== 'active'`
7. **`listSegments` / `getSegment` / `addCustomersToSegment` / `removeCustomersFromSegment`** (admin only) — App API `/v1/segments...` for manual segment management
8. **Inbound webhook (no action field)** — verify HMAC-SHA256 signature from `x-customerio-signature` header against `CUSTOMERIO_WEBHOOK_KEY`/`CUSTOMERIO_WEBHOOK_SIGNING_SECRET` (or `?key=` query param fallback); invalid → 401. On valid: find the `ConsumerMarketingProfile` by email or identifier and log a `MarketingEventLog` record (event_name `customerio.<type>`, provider 'customerio', status 'received', full payload). Return 200 `{ received: true }`

Every action logs to a `MarketingEventLog` entity: `{ event_name, consumer_user_id, consumer_email, operator_id, sale_id, payload_json, provider: 'customerio', provider_response, status (sent|skipped|failed|received|pending), error_message, created_at }`. Wrap the whole handler in try/catch and log errors.

### 4.2 `syncConsumerProfile` — profile → CIO sync (called from the frontend)

Authenticated (401 if not logged in). Accepts optional `{ user_id }` (target another user — admin only; otherwise sync self). Steps:

1. Find or create the `ConsumerMarketingProfile` for the target user's email (first/last name from full_name, role from primary_account_type, location + subscription tier/status, opt-ins defaulted true for global + sale alerts)
2. Mark the user record `consumer_marketing_synced: true`
3. Invoke `customerioService` action `identifyConsumer` with the profile payload (source: 'profile_sync')
4. Return `{ success, profile_id, synced }`

### 4.3 `syncEntityToCustomerIO` — entity automation bridge

Receives entity event payloads `{ event: { type, entity_name }, data, old_data, changed_fields }` and maps them to CIO identify/track calls via the Pipelines API (`https://cdp.customer.io/v1/identify` and `/v1/track`, auth `Basic <pipelinesWriteKey>:` where the Basic credential is the write key followed by a colon). Handle at minimum: EstateSale create/status changes (`sale.created`, `sale.approved`, `sale.completed`, `sale.updated`), Item/MarketplaceItem create (`item_uploaded`), Subscription create (identify with tier + track `subscription.activated`), and — adapted to THIS app's entities — any signup/follow/checkin events. Log everything to `MarketingEventLog`.

### 4.4 `customerioWebhookIngest` — inbound webhook receiver

Verifies the webhook signature (same HMAC scheme as above), resolves the local profile by identifier, stores the raw event, and applies state changes (e.g. `unsubscribed` → set profile `suppression_status: 'unsubscribed_all'`). Return 200 `{ received: true }` for anything valid so Customer.io doesn't retry.

## 5. Frontend wiring (both ends of the flow)

1. **Signup / onboarding completion** — when onboarding finishes, invoke `syncConsumerProfile` (fire-and-forget with catch). When onboarding hits its final "complete" step, invoke it again.
2. **Profile save** — in the profile page's save handler, after the user record update succeeds, invoke `syncConsumerProfile` fire-and-forget.
3. **Marketing preference changes** — any page that toggles opt-in flags should save them to the profile and then invoke `syncConsumerProfile` so Customer.io segments stay current.

## 6. Customer.io dashboard setup (manual, one-time)

Register the inbound webhook in the Customer.io workspace: point it at THIS app's `customerioWebhookIngest` public function URL, and set the shared webhook key to match the `CUSTOMERIO_WEBHOOK_KEY` secret. Subscribe to delivery/open/click/unsubscribe events.

## 7. Verification (required before declaring done)

1. Run `testConnection` and confirm HTTP 200 from Customer.io's Track API
2. Sync one real profile through `syncConsumerProfile` and confirm the profile's `last_synced_to_customerio_at` was set
3. Backfill: identify every existing `ConsumerMarketingProfile` that has never synced, and report the per-email results
4. Trigger one `trackEvent` and confirm it appears in `MarketingEventLog` with status `sent`
5. Confirm secrets are never returned, logged, or stored outside their auth headers

## 8. Guardrails

- Server-side only: all Customer.io API calls happen in backend functions; browser code never touches credentials or the API directly
- One identifier per person: `masterUserID` (lowercased) when available, else normalized email; never create duplicate people by mixing identifier styles for the same user
- Respect suppression: never send to a profile whose `suppression_status` is not `active`
- Never gate paid access on Customer.io delivery state — it is a marketing layer only
- Log every send/identify/track to `MarketingEventLog` for auditing and reporting