# Sakorio final non-destructive launch regression — 31 August 2026

## Executive result

The final hosted-browser regression passed all tested software workflows on build `2.1.6 89b5fb07`. The system is not yet limited to only the physical printer test: two operational launch items were also found.

1. The staff web service cold-started behind a Render wake-up page for approximately 18 seconds.
2. The live database still contains three unresolved Kitchen backlog tickets and four open bills from earlier testing/service sessions.

No new functional code defect was found in this pass.

## Test scorecard

| ID | Workflow | Result | Score |
|---|---|---:|---:|
| FINAL-001 | Staff service load and login | Login passed after Render cold start | 7.5/10 |
| FINAL-002 | POS floor load | 10 tables, four open bills, no load errors | 9.5/10 |
| FINAL-003 | T09 closed-table reset | Available, no stale paid badge | 10/10 |
| FINAL-004 | Tables workflow | T09 idle, fixed QR closed, Start order available | 10/10 |
| FINAL-005 | Order 272 history | T09, three items, SGD 12.00, Paid | 10/10 |
| FINAL-006 | Kitchen live board | No active tickets and no UI error | 9/10 |
| FINAL-007 | Kitchen backlog | Three old unresolved tickets remain | 6.5/10 operational |
| FINAL-008 | Queue | 0 waiting, 0 notified, Q003 absent | 10/10 |
| FINAL-009 | Reservations | Current service-day empty state loaded correctly | 10/10 |
| FINAL-010 | Closed T09 customer QR | Table Closed, no Add or Pay action | 10/10 |
| FINAL-011 | Printing queue | Order 272 jobs present, 0 failures | 10/10 software |
| FINAL-012 | Physical printer readiness | 0/3 agents; no ADB tablet | Blocked |

## Detailed evidence

### Staff service and authentication

- Opening `staff.sakorio.com/login` first displayed Render's service-waking interstitial.
- The sign-in page became available after approximately 18 seconds.
- The existing owner login then succeeded and opened the dashboard.
- Hosted footer: `2.1.6 89b5fb07`.

Launch impact: a restaurant POS should not depend on an asleep/free web service. The staff web service should be on an always-on paid instance before launch.

### POS and Tables

- POS loaded all 10 tables.
- T09 displayed `Available`, `Ready for order`, and `Start order`.
- The previous `Paid · Online` state did not leak into the closed table.
- Tables displayed T09 as `IDLE TABLE` with its fixed QR closed.
- The old signed T09 customer URL displayed `Table Closed` and disabled ordering/payment actions.

Result: pass.

### Orders and HitPay record

Order History search for 272 returned:

- order #272;
- table T09;
- A1 Kimchi, Green Tea (Hot or Cold), and Rice;
- SGD 12.00;
- Paid.

Result: pass.

### Kitchen

The live production board showed:

- 0 new tickets;
- 0 in preparation;
- 0 ready tickets;
- no active order 272;
- no load error.

Backlog maintenance reported three unresolved tickets older than six hours:

- #257 / T01;
- #261;
- #263.

These records must be reviewed and completed/cancelled through an authorized manager decision before opening live service.

### Queue and Reservations

- Queue: 0 waiting, 0 notified, no active Q003 record, permanent queue QR present.
- Reservations: current service-day view loaded, with 0 expected/awaiting/seated guests and no load error.

Result: pass.

### Printing

Printing showed:

- Online agents: 0/3;
- Waiting jobs: 17;
- Needs attention: 0;
- Printed in recent window: 33;
- order 272 jobs present.

The workstation also reported no Android device through `adb devices -l`.

Result: print generation is healthy; physical Bluetooth paper output remains blocked.

## Required actions before launch

1. Upgrade the staff Render web service from a sleeping/free instance to an always-on paid instance and repeat the cold-start check.
2. Review and resolve Kitchen backlog orders #257, #261, and #263.
3. Review the four open POS bills and close/cancel only those confirmed as historical QA sessions.
4. Connect the Android tablet with USB debugging authorized.
5. Authenticate the Sakorio printer agent and confirm at least one agent online.
6. Print one kitchen item slip and one paid customer receipt on the XP-80T.

## Readiness assessment

- Application workflow and security guardrails tested here: **10/10**.
- Operational database cleanliness: **8/10 until old sessions are resolved**.
- Hosting availability: **7.5/10 until staff web is always-on**.
- Physical printing: **blocked until the Android agent is connected**.

The code path is ready. Launch approval should wait for the hosting, stale-session, and physical printer actions above.
