# Morinaga Ramen Izakaya — final live pilot end-to-end results

Execution date: 6 November 2026 (Asia/Singapore)  
Environment: live Sakorio production domains  
Tenant: `3` — Morinaga Ramen Izakaya  
Staff build observed: `2.1.6 / 288f1b05`  
Execution method: every operational transition was performed and verified in
the live browser; no API or database shortcut was used to manufacture a pass.

## 1. Pilot scope and safety boundary

This pilot exercised one complete restaurant visit:

1. public reservation;
2. same-day host visibility;
3. table assignment and seating;
4. first-round ordering;
5. second-round add-on ordering;
6. Orders overview reconciliation;
7. Kitchen Display System preparation and hand-off;
8. staff Terminal settlement;
9. table close/reset;
10. automatic reservation completion;
11. order-history and customer-status verification.

The payment used Sakorio's internal **Terminal — machine confirmed** settlement
path. It did not charge a real card or call HitPay. GST remained at the
owner-deferred pre-launch state and was not included in this SGD 32.80 pilot
bill. Physical printer output was outside this browser-only execution.

## 2. Synthetic pilot records

| Record | Live value |
| --- | --- |
| Reservation | `#101` |
| Customer | `PILOT QA 1106` |
| Booking | 6 November 2026, 18:30, party of 2 |
| Notes | `PILOT QA - reservation to ordering to checkout` |
| Assigned table | T06, 2 seats |
| Bill/order | `#275` |
| Payment method | Terminal |
| Final total | SGD 32.80 |
| Final state | Paid, table closed, reservation finished |

## 3. End-to-end execution scorecard

| ID | Workflow | Score | Result | Live evidence |
| --- | --- | ---: | --- | --- |
| PILOT-E2E-001 | Create public reservation | 10/10 | PASS | Confirmation page created reservation `#101` with the intended date, time, party, phone and notes |
| PILOT-E2E-002 | Find the new booking on today's host view | 10/10 | PASS | Reservation appeared immediately on the 6 November service timeline |
| PILOT-E2E-003 | Assign and seat the reservation | 9/10 | PASS WITH NOTE | T06 was assigned and seating succeeded; the UI did not warn that the operator was seating before the booked 18:30 time |
| PILOT-E2E-004 | Submit first ordering round | 10/10 | PASS | A1 Kimchi, Green Tea and Tonkotsu Ramen created bill `#275` for SGD 21.80 |
| PILOT-E2E-005 | Add a second round to the same visit | 10/10 | PASS | A7 Edamame and Coca-Cola were appended to bill `#275`; no duplicate bill or premature history entry was created |
| PILOT-E2E-006 | Reconcile live bill and Orders overview | 10/10 | PASS | One active T06 bill showed five items and SGD 32.80; table-session History remained `0` before close |
| PILOT-E2E-007 | Verify kitchen and beverage routing | 10/10 | PASS | KDS ticket `#275` showed all five items, T06, guest identity and notes; food and drinks carried the correct station labels |
| PILOT-E2E-008 | Complete the KDS lifecycle | 10/10 | PASS | Ticket moved through Preparing, Ready and Served/Delivered, then left the live board; the board returned to `No active orders` |
| PILOT-E2E-009 | Review the final payment panel | 10/10 | PASS | Amount due was SGD 32.80 for five items; Terminal was visibly selected and the settlement control stated the exact amount |
| PILOT-E2E-010 | Record Terminal payment | 10/10 | PASS | POS changed the bill to `Paid · Terminal`, open bills from 1 to 0 and paid-today from SGD 0.00 to SGD 32.80 |
| PILOT-E2E-011 | Close and reset the table | 10/10 | PASS | Final confirmation explained QR-session termination and History movement; T06 returned to `Available — Ready for order` |
| PILOT-E2E-012 | Finish the linked reservation | 10/10 | PASS | Closing T06 automatically finished reservation `#101`; staff Finished filter and the customer confirmation page both showed `Finished` |
| PILOT-E2E-013 | Preserve the closed bill in history | 10/10 | PASS | Order History retained `#275`, T06, guest, all five item lines, SGD 32.80 and Paid status |

Core live-pilot score: **9.9/10**.

## 4. Financial reconciliation

| Item | Amount |
| --- | ---: |
| Tonkotsu Ramen | SGD 12.80 |
| Green Tea (Hot or Cold) | SGD 5.00 |
| A1 Kimchi | SGD 4.00 |
| Coca-Cola | SGD 5.00 |
| A7 Edamame | SGD 6.00 |
| **Total** | **SGD 32.80** |

The first round totalled SGD 21.80. The second round added SGD 11.00. The POS,
payment panel, paid-today metric and Order History all reconciled to SGD 32.80.

## 5. Operational observations

### Confirmed strengths

- The booking-to-table hand-off preserved the same customer and reservation.
- Multiple ordering rounds stayed under one live bill for the table session.
- Food and beverage items were visible together without losing station routing.
- Payment did not make the table disappear prematurely; the cashier received a
  clear, separate table-close step.
- The close dialog disclosed the important consequences before reset.
- Closing the table ended the live ordering session, moved the bill into
  read-only History and finished the linked reservation automatically.
- The customer reservation link reflected the final Finished state without
  exposing another guest's reservation.

### Improvement logged from this run

| Priority | Finding | Recommended change |
| --- | --- | --- |
| P2 | A host can seat a reservation before its booked time without a warning | If seating is more than a configurable number of minutes early, show a non-blocking confirmation containing the booked time and current time |

This should not block a controlled pilot because early seating can be a valid
restaurant decision. The warning would reduce accidental selection of a later
booking during busy service.

## 6. What this pilot did not certify

The following are separate launch gates and must not be inferred from the
9.9/10 browser-pilot score:

1. physical Android tablet and XP-80T Bluetooth cashier/kitchen receipt output;
2. final 9% GST configuration, rounding, receipt display and reporting;
3. HitPay sandbox payment creation, customer return, webhook idempotency,
   duplicate callback, cancellation, retry and reconciliation;
4. waiter, cashier, host, kitchen and manager role-matrix testing with named
   staff accounts;
5. transactional email/password-recovery delivery;
6. owner MFA and recovery procedure;
7. customer QR self-ordering in this exact pilot visit.

## 7. Pilot-readiness decision

**PASS for a supervised non-HitPay, pre-GST restaurant pilot.**

The complete reservation-to-terminal-payment-to-table-reset software loop is
operational in the live browser and reconciles correctly. Morinaga should not
be declared fully production-payment ready until the physical printer, 9% GST
and HitPay gates are executed and recorded. Role accounts, email recovery and
MFA also remain operational-security requirements before an unsupervised public
launch.

