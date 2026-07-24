# Sakorio Trial Restaurant Setup

Date: 2026-07-24  
Environment: live Sakorio staging domains  
Staff app build observed: POS 2.1.6 `0d141e58`  
Primary trial table: T09

## Purpose

This brief records the software-side setup before the physical restaurant trial. The goal is to give the physical test a clean, controlled lane so iPad, customer phone, kitchen display, cashier payment, and close-table flows can be tested without being confused by old QA records.

## Live browser setup actions completed

| Area | Action | Result |
| --- | --- | --- |
| Queue | Archived 3 stale queue entries through the live Queue confirmation flow. | Queue board now shows 0 waiting, 0 notified, 0 seated, with no stale warning visible in normal service view. |
| Kitchen / beverages | Opened KDS backlog mode and completed the stale T08 backlog ticket via the live "Complete visible backlog" confirmation flow. | KDS now shows "No active tickets" and "No active orders" in the current shift view. |
| Tables / cashier | Settled and closed old T08 bill #225 through the live POS terminal settlement and close-table confirmation flow. | T08 returned to idle table state. |
| Tables / QR | Opened T09 for QR ordering from the live Tables workflow. | T09 now shows seated/start-order state and has an active self-order QR session. |
| Customer QR | Opened the live T09 customer menu link in browser without placing an order. | Customer page loads T09, shows "No active order," and menu items such as Tacos de Carne Asada and Coca Cola are available. |

## Current trial-ready state

| Checkpoint | Status | Notes |
| --- | --- | --- |
| T09 trial lane | Ready | Use T09 for the physical trial. QR ordering is already open. |
| Customer-side menu | Ready | Verified live in browser. No order was submitted during setup. |
| Kitchen display | Ready | Live KDS is clean: no active tickets/orders. |
| Queue | Ready | Live queue board is clean. |
| T08 | Ready | Old bill #225 was settled/closed and table is idle. |
| T01-T05, T07 | Backup tables | Idle and usable if the physical trial needs extra table coverage. |
| T06 | Avoid for trial | Existing staging artifact remains: bill #136 / Luca Rossi. POS currently resolves the selected table to a zero-ticket/zero-total edge state, so it should be cleaned separately instead of used for the physical test. |
| T10 | Avoid for trial | Existing seated staging artifact remains: Emma Wilson / 3 guests. No trial should use this table until it is intentionally reset. |

## Active T09 QR note

The live T09 QR link was verified in browser. The full `qr_access` token is intentionally not committed into this repository document. To use it during the physical test:

1. Go to `https://staff.sakorio.com/tables`.
2. Open T09.
3. Use the `Table QR` panel.
4. Print the QR or copy the link from the modal.

## Recommended physical trial sequence

Use this sequence on the real devices next:

1. iPad cashier/waiter logs in at `https://staff.sakorio.com/login`.
2. Open `Tables`.
3. Confirm T09 is active for QR ordering.
4. Customer phone scans the T09 QR.
5. Customer adds one beverage and one food item.
6. Customer places the order.
7. Kitchen / beverages screen receives the new ticket.
8. Kitchen advances ticket: pending -> in prep -> ready -> served.
9. Cashier opens T09 in POS or Orders.
10. Cashier uses terminal payment.
11. Cashier closes table with the final confirmation.
12. Customer refreshes old QR and sees the table is closed / no longer orderable.
13. Orders history contains the completed T09 bill.
14. Tables board shows T09 idle again.

## Physical device checklist

| Device / role | Required setup |
| --- | --- |
| Waiter iPad | Safari/Chrome logged into staff app, viewport in landscape preferred, stable Wi-Fi. |
| Customer phone | Camera QR scanner or browser, mobile data/Wi-Fi available. |
| Kitchen screen | `https://staff.sakorio.com/kitchen`, keep current shift view open. |
| Cashier terminal | Terminal test/sandbox mode ready; use terminal path for staff-side payment. |
| Optional second staff device | Open `Orders` to watch active order and paid-awaiting-close behavior. |

## Trial constraints

- Do not use T06 or T10 for the physical trial.
- Do not place a real customer payment unless the terminal is explicitly in test/sandbox mode.
- Do not close T09 before the physical test unless you want to regenerate/reopen the QR session.
- If the browser shows old cached state on iPad, hard refresh after login.

## Follow-up cleanup item

T06 should be reviewed separately because it is the only remaining table artifact with an inconsistent state: Tables shows a live bill #136, but the POS drawer loads a zero-ticket/zero-total view for the table. That is not blocking the T09 physical trial, but it should be cleaned before a full restaurant-wide dry run.
