# Morinaga: one Android tablet, two Bluetooth printers

Date: 24 November 2026

Target tenant: Morinaga Ramen Izakaya (tenant 3)

Target device: one Android POS tablet

Transport: Bluetooth Classic SPP, ESC/POS

## Required routing

| Output | Physical printer | Sakorio station | Customer receipt |
|---|---|---|---|
| Ramen preparation tickets | Printer 1 | Ramen — Printer 1 | No |
| Fried food, drinks, and all other preparation tickets | Printer 2 | Other Food & Drinks — Printer 2 | Yes |

The tablet runs two independent printer workers. Each profile has its own:

- paired Bluetooth MAC address;
- station-scoped Sakorio printer-agent token;
- Bluetooth socket;
- heartbeat, lease loop, and status display;
- print-completion and retry lifecycle.

This prevents the two printers from racing to claim the same job. Printer 2 is also explicitly permitted to lease customer/cashier receipts, which do not belong to a kitchen station.

## Implementation delivered

1. Added `PrinterAgent.receives_customer_receipts` and an idempotent database migration.
2. Updated print leasing so a station agent receives only its station jobs, plus customer receipts only when explicitly enabled.
3. Added concurrent Bluetooth SPP connections keyed by printer MAC address in the Android plugin.
4. Replaced the single-token tablet worker with multiple encrypted printer profiles.
5. Added a Settings UI for adding, monitoring, reconnecting, starting, stopping, and removing each profile.
6. Added automatic startup so both saved profiles reconnect and resume when the Sakorio app or tablet restarts.
7. Kept legacy unscoped agents backward compatible until the new physical setup passes its live print test.

## Restaurant setup procedure

### 1. Pair both printers in Android

1. Give each printer a unique Bluetooth name if its hardware supports it, for example `MORINAGA-RAMEN` and `MORINAGA-OTHER`.
2. Pair both printers in Android Settings > Connected devices > Bluetooth.
3. Print each device's hardware self-test page and record its Bluetooth MAC address.

### 2. Create kitchen stations

In Sakorio Settings > Kitchen stations:

1. Create or rename station `Ramen — Printer 1`.
2. Create or rename station `Other Food & Drinks — Printer 2`.
3. Set the general kitchen and beverage fallback/default routes to Printer 2's station.
4. Assign every ramen product to Printer 1's station.
5. Assign fried-food, drink, and other products to Printer 2's station, or allow them to use the Printer 2 fallback.

Do not activate the new routing until every active product has been reviewed. A product with the wrong station assignment will print correctly, but at the wrong physical printer.

### 3. Create two print agents

In Sakorio Settings > Printing:

1. Create `Morinaga Ramen Printer 1` and select `Ramen — Printer 1`.
2. Leave **Print customer/cashier receipts on this printer** off.
3. Copy the one-time token immediately.
4. Create `Morinaga Other Printer 2` and select `Other Food & Drinks — Printer 2`.
5. Enable **Print customer/cashier receipts on this printer**.
6. Copy the second one-time token immediately.

Never reuse one token for both physical printers.

### 4. Add two tablet printer profiles

On the Morinaga Sakorio Android app:

1. Open Settings > Printing > Android tablet printing.
2. Allow Bluetooth and scan paired printers.
3. Add profile `Printer 1 — Ramen`, choose the ramen printer, and paste Printer 1's token.
4. Add profile `Printer 2 — Other + Receipts`, choose the other printer, and paste Printer 2's token.
5. Confirm the header shows `2/2 printers ready`.
6. Confirm each profile shows Connected, Running, and a recent heartbeat.

Tokens and device addresses are stored through the Android Keystore-backed secure storage plugin. They are not stored in browser local storage.

## Mandatory physical acceptance cases

| ID | Workflow | Expected result |
|---|---|---|
| DUAL-01 | Order one ramen item | One preparation ticket on Printer 1 only |
| DUAL-02 | Order one fried item | One preparation ticket on Printer 2 only |
| DUAL-03 | Order one drink | One preparation ticket on Printer 2 only |
| DUAL-04 | Order ramen + fried item + drink in one round | Ramen ticket on Printer 1; other two tickets on Printer 2; no duplicates |
| DUAL-05 | Print customer bill | Customer receipt on Printer 2 only |
| DUAL-06 | Turn Printer 1 off, submit mixed order, then restore it | Printer 2 prints its jobs; ramen job remains retryable and prints after Printer 1 reconnects |
| DUAL-07 | Turn Printer 2 off, submit mixed order, then restore it | Printer 1 prints ramen; other jobs remain retryable and print after Printer 2 reconnects |
| DUAL-08 | Force-close and reopen Sakorio app | Both profiles automatically reconnect; settings visit is not required |
| DUAL-09 | Restart tablet | Both profiles resume; both heartbeats return online |
| DUAL-10 | Submit two tables concurrently | Every item routes once to the correct printer with table/order identity intact |

## Automated verification completed

- Backend printer/payment regression: 34 tests passed.
- Dedicated two-printer routing test: Printer 1 leased ramen only; Printer 2 leased other-station and customer-receipt jobs only.
- Angular production-static build: passed.
- Android strict readiness: passed.
- ESC/POS worker, native scaffold, and printer readiness simulations: passed.
- Android Java/native compile: passed.
- Debug APK signature: verified with Android v2 signature.
- Packaged runtime: verified as tenant 3, staff portal, `https://api.sakorio.com` and `https://order.sakorio.com`.

Physical acceptance cases DUAL-01 through DUAL-10 must still be performed with the two actual printers before the old legacy agents are disabled.
