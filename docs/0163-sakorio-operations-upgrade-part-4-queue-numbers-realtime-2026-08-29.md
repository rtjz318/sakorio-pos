# Sakorio Operations Upgrade — Part 4: Queue Numbers and Real-Time Updates

Date: 2026-08-29  
Blueprint: `0159-sakorio-first-iteration-operations-upgrade-blueprint-2026-08-29.md`  
Implementation commits: `52440ac6`, `1960acc2`  
Branch: `development`

## 1. Outcome

Every guest queue entry now receives a stable, restaurant-local daily number such as `Q001`. Customers see that number prominently and receive status changes automatically through a private WebSocket channel, with polling as a resilient fallback.

## 2. Daily queue number design

The database now stores:

- `service_date`: tenant-local operating date;
- `queue_number`: daily integer sequence;
- `status_version`: monotonically increasing lifecycle version.

A PostgreSQL counter row and trigger allocate numbers atomically. The unique constraint on tenant, service date, and number prevents duplicates under concurrent joins. The migration also backfills existing entries deterministically.

The API exposes both the integer and the display label:

```json
{
  "queue_number": 21,
  "queue_label": "Q021",
  "service_date": "2026-08-29",
  "status_version": 1
}
```

## 3. Customer experience

- The queue number is the main visual element on the status page.
- Connection state is visible as Connecting, Live, Reconnecting, or Polling.
- The page reconnects with capped exponential backoff and jitter.
- A 20-second polling fallback remains active if WebSocket delivery is unavailable.
- Returning to a backgrounded tab triggers an immediate refresh.
- A notified guest receives an available device vibration cue.
- Terminal states stop the connection cleanly.
- The saved customer link stores the access token in the URL fragment, preventing normal HTTP request logs from receiving it.

## 4. Real-time and security architecture

The public client connects to a generic `/public/queue` WebSocket path and transmits its token in the first WebSocket frame. The bridge validates it through a private backend endpoint, hashes it to a channel fingerprint, and subscribes only that customer connection to its entry.

Public events contain no customer name, phone number, or raw access token. They contain only lifecycle data such as event type, status version, and terminal state. Raw tokens are not placed in WebSocket URLs or application logs.

Connection abuse is bounded to five simultaneous public sockets per token. Legacy token-in-path HTTP endpoints remain temporarily available for old links, while the current frontend uses token-safe JSON POST endpoints.

## 5. Staff behaviour

- Queue cards lead with the stable `Q###` label.
- The current queue is scoped to the restaurant's local day.
- All lifecycle mutations publish both a tenant staff event and a private customer event.
- Notify, seat, convert, close, move, and cancel updates increment the version, preventing stale browser events from overwriting newer state.

## 6. Verification evidence

- Queue/table regression: **26 passed**.
- Concurrent allocation: **20 simultaneous joins received exactly 1–20**.
- Angular production-static build: passed.
- Latest Angular Docker hot-reload build: passed.
- Local application smoke: HTTP `200`.
- Full local transport test through HAProxy: join → generic WebSocket handshake → cancel → immediate private terminal event → final cancelled status: passed.
- WebSocket logs showed the generic path and no raw access token.

## 7. Acceptance status

| Requirement | Status |
| --- | --- |
| Customer receives a large, stable daily queue number | Passed |
| Concurrent joins cannot duplicate a number | Passed |
| Customer status changes without manual refresh | Passed |
| Reconnect and polling fallback are available | Passed |
| Customer token is isolated per connection | Passed |
| WebSocket event excludes PII and raw token | Passed |
| Current queue is tenant-local-day scoped | Passed |
| Live deployment contains daily-number commit | Passed |
| Live deployment contains real-time commit | Passed — live footer reached descendant `156708df` |

## 8. Next phase

Part 5 brings the queue into the cashier/POS workspace so staff can see `Q###`, notify, cancel, and seat guests without switching away from the active service screen.
