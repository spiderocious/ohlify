# Handoff — Push notifications + instant-call ringing (Android end-to-end)

Instant calls now cascade to the callee via FCM push with a full-screen ring UI (accept/decline), chat messages push with deep links, and every ring is guaranteed to resolve. Built 2026-07-26. Backend + mobile both typecheck/lint clean.

## The flow

1. **Caller taps Call** → `POST /instant-calls` creates the `ringing` row **and** a `push.incoming_call` outbox event in the same transaction — push fires iff the row committed. Caller lands in `CallSession` (webview) immediately, dialing.
2. **Outbox worker** (≤500ms later) fans out to every device token of the callee: data-only, high-priority FCM message.
3. **Callee's phone** (foreground, background, or killed): notifee renders a full-screen incoming-call notification — looping ringtone, Accept/Decline actions, lock-screen takeover (`USE_FULL_SCREEN_INTENT`), auto-dismiss at the ring deadline.
4. **Accept** → `IncomingCall` screen → `POST /instant-calls/:id/answer` (409s if no longer ringing — push is only a hint) → `CallSession` joins Agora with the creds from the answer response. Caller's webview sees `remote-joined` → call is active.
5. **Decline** → `POST /end` (0s) → backend emits `push.call_cancelled` to the **caller** ("Call declined") and to the callee's other devices.
6. **Nobody answers** → ring-timeout resolver cron (10s cadence, 45s window — `INSTANT_CALL_RING_SECONDS`) marks it `missed`, dismisses all ring UIs, sends the callee a visible "Missed call from X".
7. **Chat message sent** → `push.chat_message` outbox event in the send transaction → visible notification (sender name + preview) on the recipient's devices → tap deep-links into the thread. Suppressed when that thread is on screen.

Reliability model: **pushes are wake-up hints; Postgres is the truth.** Every client action re-validates against the API; every state has a cron that eventually resolves it; the outbox retries with backoff.

## New outbox events (all carry `target_user_id`)

| Event | Rendered | Payload highlights |
|---|---|---|
| `push.incoming_call` | data-only → notifee ring | `call_id`, caller name/avatar, `call_type`, `ring_expires_at` |
| `push.call_cancelled` | data-only → dismiss ring | `call_id`, `reason`: `cancelled` \| `declined` \| `timeout` \| `answered_elsewhere` |
| `push.call_missed` | visible ("Missed call") | `call_id`, caller name/avatar |
| `push.chat_message` | visible (sender + preview) | `conversation_id`, `message_id`, sender name/avatar, `preview` |

## Key files

**Backend**
- `features/instant-calls/instant-calls.service.ts` — start/answer/end now emit the events above transactionally.
- `workers/calls.worker.ts` — new `ring-timeout-resolver` cron (flag: `WORKER_RING_RESOLVER_ENABLED`).
- `workers/outbox.worker.ts` — `buildPushNotification()` maps all `push.*` events; prunes dead tokens.
- `lib/push/` — provider supports data-only messages + Android channel routing; `firebase-admin` now installed.

**Mobile**
- `src/shared/push/push-service.ts` — the single push entrypoint: channels, FCM handlers (fg/bg/killed), notifee events, token register/unregister. All native access lazy-required → web bundle unaffected.
- `src/shared/push/push-intents.ts` — notification-tap navigation, queued until session restored + past Splash/Auth.
- `src/features/instant-calls/screen/incoming-call-screen.tsx` — full-screen ring UI (also handles `autoAccept` from the notification's Accept button).
- `call-session-screen.tsx` — instant mode: joins with creds from start/answer (no `calls/:id/join`), ends via `instant-calls/:id/end`, 45s no-answer timeout for callers, reacts to `call.cancelled` signals.
- `auth-session-provider.tsx` — registers the device token on login/restore (prompts notification permission), unregisters on logout.

## To run it

1. **Env (local + Railway):** `FCM_SERVICE_ACCOUNT_JSON_BASE64` + `FCM_PROJECT_ID=ohlify` are already in local `.env`. The workers must be on: `WORKER_OUTBOX_ENABLED=true` and `WORKER_RING_RESOLVER_ENABLED=true` (both currently `false` locally per the QA convention — flip them to test push).
2. **Build the app** (notifee + RN Firebase are native modules — Expo Go won't work):
   `cd apps/mobile && pnpm expo prebuild --platform android && pnpm expo run:android` (or an EAS dev build; for EAS cloud builds add `google-services.json` as a file secret since it's gitignored).
3. **Test device:** real Android phone, or an emulator image labeled "Google Play" (AOSP images have no FCM).

## Test checklist

- [ ] Login on device → row appears in `device_tokens`.
- [ ] Chat message from web → notification on killed app → tap → lands in the right thread; no notification while that thread is open.
- [ ] Instant call → callee (app killed, screen locked) gets full-screen ring with sound.
- [ ] Accept → both sides connected in Agora; Decline → caller sees "Call declined" within ~2s.
- [ ] Caller hangs up mid-ring → callee's ring dismisses.
- [ ] Let it ring out → both UIs give up at ~45s; callee gets "Missed call from X"; row is `missed`.
- [ ] Ended call with talk time settles minutes exactly as before (settlement path untouched).

## Known limitations / next

- **iOS ringing** needs PushKit + CallKit (separate track; needs Apple Developer account + the small direct-APNs sender). Chat/alert pushes will work on iOS through FCM once the APNs key is uploaded to Firebase — the provider already sends correct `apns` payloads.
- **CallRating after instant calls** submits with the instant `call_id`; the reviews endpoint may not accept instant-call ids — harmless (toast), worth a follow-up.
- Instant calls have **no token renew endpoint**; the Agora token minted at start must outlive `minutes_allotted` (check `bookings.token_expires_seconds` covers your longest package).
- OEM battery killers (Xiaomi etc.) can delay data-only pushes; the foreground incoming poll remains as the safety net.
