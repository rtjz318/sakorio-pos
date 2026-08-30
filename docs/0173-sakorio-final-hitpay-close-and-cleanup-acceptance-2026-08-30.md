# Sakorio final HitPay, close-table, and cleanup acceptance — 30 August 2026

## Outcome

The previously outstanding hosted-browser lifecycle is complete:

`T09 fixed QR → order 272 → kitchen/bar → delivered → HitPay sandbox → webhook paid → receipt job → close table → history → clean table reset`

The marked queue record Q003 was also removed from active operations and its customer page updated to the cancelled state.

## HitPay sandbox settlement

1. Reopened the signed T09 customer session and recovered delivered order 272.
2. Selected HitPay from the customer-only payment choices.
3. Verified the sandbox checkout amount was SGD 12.00 and the description was `Order #272 at Ajisen Ramen - T09`.
4. Completed the authorized sandbox payment with a standard sandbox card.
5. HitPay redirected to Sakorio's own `Payment successful` page.
6. Tables changed T09 to `Paid · Online` with bill 272.
7. Orders displayed `Paid by HitPay` while the table awaited closure.

Result: **10/10 — pass.**

## Receipt generation

After payment, Printing generated a new `Customer receipt` for order 272. Together with the earlier station jobs, order 272 has:

- one customer receipt;
- one Bar ticket;
- two Kitchen tickets.

All remain Pending with zero attempts because Printing reports `ONLINE AGENTS 0/3`. Job generation and routing pass; physical output is not claimed.

Result: **Software 10/10; physical paper acceptance blocked by the offline Android agent.**

## Close table and history

1. Opened T09 after payment.
2. Closed the paid table.
3. Verified that order 272 moved to read-only Order History with:
   - T09;
   - A1 Kimchi, Green Tea (Hot or Cold), and Rice;
   - SGD 12.00;
   - Paid.
4. Verified T09 returned to `IDLE TABLE` / `Available` / `Ready for order`.
5. Verified the fixed customer QR was closed for the empty table session.

## Defect found and corrected

Immediately after closure, T09 was idle but still displayed the previous session's `Paid · Online` chip. This could make staff believe a new/empty table still had a payment state.

Fix commit: `89b5fb07` — `Reset payment indicators after table close`.

The Tables list, visual table canvas, and POS floor now return payment state `none` whenever the table has neither an active session nor an active order. Hosted build `2.1.6 89b5fb07` was verified live:

- Tables: T09 shows `IDLE TABLE` with no payment chip.
- POS: T09 shows `Available`, `Ready for order`, and `Start order`, with no paid badge.

Result: **10/10 — pass after deployed fix.**

## Queue cleanup

1. Selected the marked QA entry Q003.
2. Used the host cancellation confirmation.
3. Verified the active waiting count returned to zero.
4. Opened the customer status page and verified:
   - queue number Q003 remains visible for context;
   - status is `Queue entry cancelled`;
   - the copy explains the entry is no longer active;
   - `Join again` is available.

Result: **10/10 — pass.**

## Verification evidence

| Check | Result |
|---|---:|
| HitPay sandbox payment | Pass |
| Sakorio success redirect | Pass |
| Paid webhook/state synchronization | Pass |
| Customer receipt job generation | Pass |
| Paid table close | Pass |
| Order 272 in History | Pass |
| T09 idle/available reset | Pass |
| Stale payment badge removed live | Pass |
| Q003 host cleanup | Pass |
| Q003 customer cancellation state | Pass |
| Angular production-static build | Pass |
| Angular hot-reload compiler log | Pass |

## Remaining physical launch gate

The Android tablet is not connected to this workstation: `adb devices -l` returns no devices. The hosted Printing page reports 0/3 online agents, so the XP-80T cannot consume the 17 pending jobs.

To finish physical acceptance, connect the Android tablet by USB with USB debugging authorized, open the Sakorio app, authenticate its printer agent, pair the XP-80T by Bluetooth, and run one kitchen item slip plus one paid customer receipt. This is now the only blocker discovered in this acceptance sequence.

## Readiness score

- Hosted browser ordering/payment/table/queue lifecycle: **10/10**.
- Print job generation and routing: **10/10 software**.
- Physical Android Bluetooth paper output: **not yet testable**.
- Overall launch readiness including hardware: **9.8/10 pending physical printer acceptance**.
