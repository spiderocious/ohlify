# Handoff — Mobile updates for `/calls/history`

Backend now returns three new fields on every `GET /api/v1/calls/history` and `GET /api/v1/calls/history/:id` row. Mobile should adopt them so the calls list shows real names + avatars instead of the `callee_user_id` placeholder.

## What changed on the wire

Each `CallHistoryItem` now includes:

```jsonc
{
  // … existing fields …
  "peer_user_id":     "u_01k…",      // the OTHER user from the viewer's POV
  "peer_name":        "Jane Doe",    // string | null (null if soft-deleted)
  "peer_avatar_url":  "8204e793.jpg" // file-service KEY (not URL); string | null
}
```

`caller_user_id` and `callee_user_id` are still on the response — `peer_*` is just the convenience pair.

The peer is computed server-side by comparing `req.userId` to the booking sides:
- if you're the **caller** (booked the call), the peer is the **callee** (the professional).
- if you're the **callee** (the professional), the peer is the **caller** (the customer).

`peer_avatar_url` is a file-service key (e.g. `8204e793-….jpg`), **not** a presigned URL. Render via the existing avatar file-preview helper.

## What mobile should change

### 1. `CallHistoryItem` model — add the three fields

`mobile/lib/features/calls/types/call_models.dart`:

```dart
class CallHistoryItem {
  // … existing fields …
  final String peerUserId;
  final String? peerName;
  final String? peerAvatarKey;

  factory CallHistoryItem.fromJson(Map<String, dynamic> json) {
    return CallHistoryItem(
      // … existing …
      peerUserId: json['peer_user_id'] as String? ?? '',
      peerName: json['peer_name'] as String?,
      peerAvatarKey: json['peer_avatar_url'] as String?,
    );
  }
}
```

The existing `peerIdFor(me)` helper can be deleted — or kept as a fallback that prefers `peerUserId` when present:

```dart
String? peerIdFor(String? me) {
  if (peerUserId.isNotEmpty) return peerUserId;
  // legacy fallback
  if (me == null || me.isEmpty) return null;
  if (callerUserId == me) return calleeUserId;
  if (calleeUserId == me) return callerUserId;
  return null;
}
```

### 2. Adapters in `calls_screen.dart`

Replace the `c.peerName` / `c.peerAvatarKey` lookups (which today mostly resolve to nulls/IDs) with the new fields directly:

```dart
ScheduledCallItem _toScheduled(api.CallHistoryItem c) => ScheduledCallItem(
      id: c.id,
      name: c.peerName ?? 'Unknown',
      role: c.callType == 'video' ? 'Video call' : 'Audio call',
      // …
      avatarUrl: c.peerAvatarKey, // file-service key, not URL
    );
```

The `_ScheduledCallCard` avatar today uses `Image.network(call.avatarUrl)`. Since `peer_avatar_url` is a file-service KEY, switch to the same flow used elsewhere in mobile for keys (e.g. the avatar widget that resolves a key → presigned URL). If you don't have one in `parts/`, the `Image.network` path with a `MockService.viewUriFor(...)` (or however mobile resolves keys) is the right hook.

### 3. UI parity (web ↔ mobile)

The web now matches the mobile two-layer card: outer `surface-dark` tray → inner white card with avatar + name + AUDIO/VIDEO solid pill + meta row, actions (Cancel + Reschedule, or single Join call) live in the outer tray. No mobile changes needed there — that design already lives in `parts/scheduled_calls_list.dart`.

### 4. Tabs collapsed on web — 4 → 2

Web went from `All / Scheduled / Completed / Cancelled` → just `Scheduled / Completed`. The Completed tab now houses cancelled, missed (no_show_*), and disconnected rows, each tagged with a free-form `stateLabel` (`'Cancelled' | 'Missed' | 'Disconnected' | 'Completed' | 'In progress' | 'Pending'`).

Mobile is currently 4 tabs. **Optional alignment:** drop `All` and `Cancelled`, fold them into `Completed` with the same `stateLabel` row prefix. Filtering rules:

- **Scheduled:** `bookingStatus == 'confirmed' && callStatus NOT IN terminalCallStatuses`
- **Completed (catch-all):** everything else

```dart
const _terminalCallStatuses = {
  'completed',
  'no_show_caller',
  'no_show_callee',
  'no_show_both',
  'disconnected_caller',
  'disconnected_callee',
};

bool isScheduled(CallHistoryItem c) =>
    c.bookingStatus == 'confirmed' &&
    !_terminalCallStatuses.contains(c.callStatus);
```

`stateLabel` mapping (use it as a small leading text on the completed row):

```
booking_status startsWith 'cancelled_' → 'Cancelled'
call_status == 'completed'              → 'Completed'
booking_status == 'fulfilled'           → 'Completed'
call_status == 'in_progress'            → 'In progress'
call_status startsWith 'no_show_'       → 'Missed'
call_status startsWith 'disconnected_'  → 'Disconnected'
otherwise                               → 'Pending'
```

### 5. Backwards compatibility

Old mobile builds (no `peer_*` parsing) will keep working — the new fields are additive and JSON parsers already ignore unknown keys. No flag day required.

## Why the change

Previously `CallHistoryItem` carried only raw user IDs; both web and mobile were rendering `u_01kq2xx7…` as the name. Backend now picks the peer-side user once (server-known viewer) and joins their `full_name` + `avatar_url` so every client gets a clean display tuple without a second round-trip per row.

## Backend reference

- SQL join + extra select cols: `apps/backend/src/features/calls/calls.repo.ts` (`HISTORY_SELECT`, `HISTORY_FROM`)
- View transform with peer pick: `apps/backend/src/features/calls/calls.service.ts` (`pickPeer`, `toHistoryView`)
- API contract type: `packages/api/src/calls/types.ts` (`CallHistoryItem`)
