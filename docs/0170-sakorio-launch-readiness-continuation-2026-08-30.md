# Sakorio launch-readiness continuation — 30 August 2026

## Purpose

This continuation closes the automated baseline failures left after the sub-8 workflow remediation and records the software-only acceptance state for the XP-80T Android printing path. It does not represent physical hardware, live settlement, or staff-device acceptance where the real external device or a financial mutation is required.

## Changes completed

### 1. Database model portability

- Added a shared JSON column definition that uses PostgreSQL `JSONB` in production and ordinary `JSON` under SQLite.
- Applied the definition to tenant preferences, printer payloads, product options, fiscal payloads, order customizations, and delivery event details.
- Production remains on PostgreSQL `JSONB`; no schema migration or loss of JSONB behavior is introduced.
- Focused floor/zone reservation tests can now create their minimal SQLite schemas without PostgreSQL compiler errors.

### 2. Public API error-contract tests

- Updated German guest-feedback tests to validate the current structured error contract: stable `code` plus localized `message`.
- Retained checks for the localized German reservation-link and tenant-not-found messages.

### 3. Contact normalization test

- Corrected the email expectation so normalization lowercases the domain without changing `.de` into a different top-level domain.
- This prevents a test from endorsing silent email-address mutation.

### 4. Overbooking test isolation

- Parameterized the overbooking seed/check utility by tenant and optional session.
- The regression test now creates its own tenant and three tables inside the normal rollback transaction.
- It no longer depends on tenant 1 or pre-existing demo data, and leaves no persistent test records.

## Automated evidence

### Backend

Command: `docker compose -f docker-compose.yml -f docker-compose.dev.yml exec -T back pytest -q`

- Result: **345 passed**
- Failures: **0**
- Warnings: two non-blocking dependency deprecations (`httpx` TestClient compatibility and Redis pubsub close method)

### XP-80T and Android software path

| Check | Result | Coverage |
|---|---:|---|
| XP-80T receipt renderer | Pass | Kitchen ticket, paid receipt, long names, counter fallback |
| XP-80T configuration readiness | Pass | Required configuration and readiness states |
| Native Bluetooth scaffold | Pass | Capacitor bridge and native plugin files |
| Capacitor Android readiness | Pass | Android dependency/configuration/native permission markers |
| Printer worker simulation | Pass | Kitchen job completion, customer receipt completion, Bluetooth failure/retry state |

## Launch gates that software simulation cannot close

These remain operational acceptance items, not unimplemented software fixes:

1. **Physical XP-80T acceptance** — Android tablet paired to the real printer; print a kitchen item-per-slip batch and a cashier receipt; verify paper width, accents, cut command, reconnect, and duplicate prevention.
2. **HitPay sandbox lifecycle** — complete success, cancel, retry, abandoned/timeout, webhook reconciliation, and return-to-POS checks using the sandbox checkout.
3. **Existing bill settlement** — bill/order 270 must only be marked paid and its table closed after the operator confirms that settlement is correct.
4. **Old QA data cleanup** — stale bills, queue entries, and reservations require a manager decision on archive versus delete before mutation.
5. **Physical attendance acceptance** — real staff profile selection, camera permission/proof, clock-in, break, clock-out, and administrator-only hourly-rate visibility on the shop tablet.
6. **Multi-role hosted matrix** — waiter, cashier, kitchen, manager, and administrator accounts must be supplied as disposable test identities or created through the approved operational process.

## Current assessment

The automated code baseline and the no-hardware Android printer path are green. Sakorio should not be described as 100% physically launch-accepted until the six operational gates above are completed on the actual tablet, printer, HitPay sandbox, and staff accounts. No financial record or historical restaurant record was altered during this continuation.

## Hosted browser verification after deployment

The customer deployment exposed commit `08bee0f2` in its live footer and the following flows were inspected in the hosted browser:

- Staff login rendered the minimal sign-in form with password recovery and legal links; the removed provider/courier/register shortcuts did not reappear on the staff login page.
- Public booking for tenant 1 loaded the current local date, available time slots, seating choices, international-phone guidance, and a disabled submit action until the required fields are valid.
- Public menu browsing loaded the full categorized Ajisen Ramen catalogue with collapsible category headers, SGD prices, and the available product images.
- A closed-table signed QR rendered a clear `Table Closed` state and did not expose an order or permit ordering.
- A deliberately invalid waitlist status token recovered to the join form, showed zero parties ahead, kept the join action disabled until required fields are supplied, and produced no browser console errors.
- A previously seated queue session rendered its large queue number and final seated state. Automatic refresh remains implemented with WebSocket delivery and a 20-second polling fallback; the observed completed session correctly displayed the fallback state because terminal queue sessions stop realtime updates.

No live reservation, queue entry, order, payment, attendance record, or other restaurant data was created or changed in this read-only hosted pass.
