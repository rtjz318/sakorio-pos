# Sakorio XP-80T Implementation Pass 10 — Receipt Payload Contract

Date: 2026-08-18  
Scope: XP-80T / receipt printing reliability

## Outcome

This pass adds backend receipt payload normalization before print jobs are stored and leased to printer agents.

Updated:

- `back/app/printing_service.py`
- `back/tests/test_printing_service.py`

## Why this matters

Bluetooth printing failures are painful to debug during live service. Some failures are not actually Bluetooth issues; they come from malformed payloads, odd notes, empty item names, null bytes, bad totals, or very large item arrays.

This pass makes the print queue more boring and predictable before the iPad/XP-80T layer receives a job.

## Guardrails added

Receipt payloads are now normalized through `validate_receipt_payload()` before durable `PrintJob` creation.

The normalizer:

- removes null bytes from receipt text;
- trims empty strings;
- caps free-text fields;
- defaults missing table names to `Counter`;
- defaults missing station names to `Kitchen`;
- uppercases currency code;
- coerces money fields to non-negative integers;
- coerces quantities to at least `1`;
- drops empty item names;
- drops non-dict item rows;
- caps each receipt to `MAX_RECEIPT_ITEMS`;
- preserves the existing kitchen-ticket shape by not adding price fields unless they are present.

## Use cases verified

### XP80T-P01 — Messy customer receipt payload

Input includes:

- null bytes;
- blank table name;
- lowercase currency;
- negative tip;
- invalid total;
- empty item name;
- non-object item row.

Expected:

- clean receipt type;
- clean station/table/customer fields;
- safe totals;
- valid item retained;
- invalid items dropped.

Result: passed.

### XP80T-P02 — Oversized receipt item array

Input includes more than the printer-safe max item count.

Expected:

- payload keeps only the first `MAX_RECEIPT_ITEMS`.
- ordering stays deterministic.

Result: passed.

### Existing kitchen/customer receipt regressions

Existing tests still verify:

- one prep receipt per ordered unit;
- station routing between kitchen/bar;
- high-quantity order creates the expected number of tickets;
- empty rounds create no receipts;
- paid order creates one customer receipt with totals;
- customer receipt creation remains idempotent;
- XP-80T printer agent metadata stays exposed.

Result: passed.

## Verification

Command:

```bash
docker exec pos-back python -m pytest -q tests/test_printing_service.py tests/test_printing_routes.py
```

Result:

```text
8 passed
```

## Remaining physical launch requirement

This improves payload reliability before jobs reach the iPad. It still does not replace the physical test:

1. Build native iPad shell on Mac/Xcode.
2. Pair XP-80T through Bluetooth.
3. Run live POS kitchen ticket print.
4. Run live POS customer receipt print.
5. Confirm paper width, cut behavior, font readability, and reconnect behavior.

