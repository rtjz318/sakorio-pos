# Sakorio Operations Upgrade — Part 5: POS Queue Operations

Date: 2026-08-29  
Blueprint: `0159-sakorio-first-iteration-operations-upgrade-blueprint-2026-08-29.md`  
Implementation commit: `900de20c`  
Branch: `development`

## 1. Outcome

The cashier POS now contains a collapsible live guest-queue rail. Cashiers and hosts can manage the waitlist without leaving the table board, while the standalone Queue tab continues to use the same API and lifecycle.

## 2. POS queue workflow

The rail shows:

- waiting and pinged party counts;
- total waiting guests;
- next queue label;
- longest elapsed wait;
- large `Q###` identity on every entry;
- guest name, party size, phone, elapsed wait, and current state.

Available actions are:

1. `Ping` — changes Waiting to Pinged and updates the customer's open page automatically.
2. `Assign table` — shows only currently eligible tables with enough seats.
3. `Seat and open POS` — seats the queue entry, activates the table, reloads canonical table state, and opens that table's order drawer.
4. `No show` — explicit confirmation followed by a terminal queue state.
5. `Cancel` — explicit confirmation followed by a terminal queue state.

Backend permissions remain authoritative. Direct mutation endpoints still require reservation/host write authority.

## 3. Seated handoff

`GET /tables/with-status` now returns a safe seated queue summary:

```json
{
  "seated_queue_entry": {
    "id": 456,
    "queue_number": 23,
    "queue_label": "Q023",
    "customer_name": "Guest",
    "party_size": 3,
    "status": "seated"
  }
}
```

The same label appears on the table tile and inside the table-service drawer until the table is closed. Joined table groups share the seated queue context.

## 4. Realtime behaviour

The POS subscribes to the existing tenant queue WebSocket. Queue events are coalesced for 180 ms, then only the queue and table resources are refreshed. This prevents event storms from reloading the menu and order catalog.

## 5. Tablet layout

- The rail is collapsed by default so the table board remains primary.
- Actions wrap instead of overflowing.
- The seat selector becomes a single column below 920 px.
- At phone widths, cards and actions reflow without hiding `Q###`.
- Queue context wraps inside table tiles and the table drawer header.

## 6. Verification

- Focused queue/table backend suite: **17 passed**.
- Seated queue serializer and table-label test: passed.
- Angular production-static build: passed.
- Latest Docker Angular hot-reload build: passed.
- Local application through HAProxy: HTTP `200`.

## 7. Acceptance status

| Requirement | Status |
| --- | --- |
| Queue summary visible from POS | Passed |
| Same `Q###` on customer, queue, POS, and table | Passed contract/build |
| Ping uses shared API and realtime event | Passed |
| Seat filters by availability and capacity | Passed |
| Seat opens the assigned table in POS | Passed |
| No-show/cancel require confirmation | Passed |
| Seated label remains until table close | Passed |
| Tablet controls wrap without overlap | Passed build/layout implementation; live authenticated visual checkpoint pending |

## 8. Next phase

Part 6 removes mandatory planned shifts and makes factual attendance the default Timetable view.
