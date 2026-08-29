# Sakorio Operations Upgrade — Part 3: Reservation Day and Table Rules

Date: 2026-08-29  
Blueprint: `0159-sakorio-first-iteration-operations-upgrade-blueprint-2026-08-29.md`  
Implementation commit: `7ae241a0`  
Branch: `development`

## 1. Outcome

Reservation visibility on the floor is now driven by the restaurant's local business date. A reservation remains in Reservations until its scheduled date, and appears on Tables/POS only when it is both assigned to a physical table and due today.

## 2. Implemented behaviour

- Future reservations do not appear as table arrivals early.
- Unassigned reservations never occupy or decorate a table.
- An assigned reservation appears on its table only on the tenant-local reservation date.
- The backend remains authoritative for table assignment and conflict detection.
- Existing seating and table-close workflows remain responsible for starting and finishing the visit.
- Date comparison uses the tenant timezone rather than the browser or server date.

## 3. Backend contract

`GET /tables/with-status` now includes a reservation summary only when all of these conditions hold:

1. The reservation belongs to the authenticated tenant.
2. It has a table assignment.
3. Its reservation date is today in the tenant timezone.
4. Its lifecycle state is relevant to today's floor operation.

Future bookings continue to be returned by the Reservations endpoints, so hosts can search and prepare them without cluttering the live floor.

## 4. Verification evidence

- Reservation/table affected regression: **25 passed**.
- Tenant-local date boundary coverage: passed.
- Future reservation exclusion: passed.
- Unassigned reservation exclusion: passed.
- Assigned same-day reservation inclusion: passed.
- Local application and backend health: HTTP `200`.
- Live deployment advanced beyond implementation commit to `52440ac6`, confirming Part 3 is included in the deployed lineage.

A broader legacy SQLite suite exposed five existing JSONB/SQLite harness failures outside the changed reservation path. The focused PostgreSQL-compatible reservation/table tests were clean.

## 5. Acceptance status

| Requirement | Status |
| --- | --- |
| Future reservation stays off the live floor | Passed |
| Unassigned reservation stays off Tables/POS | Passed |
| Assigned reservation appears only on its local day | Passed |
| Reservation remains manageable from Reservations | Passed |
| Conflict authority remains server-side | Passed |
| Live deployment contains the change | Passed |

## 6. Next phase

Part 4 adds stable daily queue numbers and private real-time customer queue updates.
