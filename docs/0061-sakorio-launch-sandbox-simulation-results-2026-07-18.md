# Sakorio launch sandbox simulation results

Date: 2026-07-18  
Live QA surface: `https://staff.sakorio.com` and `https://order.sakorio.com`  
Hosted version observed: `2.1.6 2f47d236`  
Viewport used: iPad-sized browser viewport, 1024 x 768  
Base brief: `docs/0060-sakorio-launch-sandbox-stress-brief-2026-07-18.md`

## 1. Executive outcome

The 20 launch sandbox use cases were walked through in the hosted browser. The system is broadly functional across POS, Tables, Orders, Queue, Reservations, Kitchen, Timetable, Reports, Inventory, and Settings.

However, "functional" does not mean "10/10 launch smooth." The main launch-polish finding is that the POS selected-table flow still feels heavier than it should on iPad: the table board and surrounding context can dominate the first viewport, while the actual selected-table service controls may sit lower on the page. The recovery/actions exist, but the waiter should not have to think or scroll during service.

Overall launch simulation score: **8.0 / 10**

| Category | Score | Summary |
|---|---:|---|
| Functional route health | 9.2 | Routes load, auth works, no full-page horizontal overflow found |
| POS/table service smoothness | 7.4 | Core actions exist, but selected-table ergonomics still need one more polish pass |
| Orders/queue/reservation usability | 8.5 | Stronger; workflows are discoverable and service-day concepts are clear |
| Kitchen production clarity | 7.6 | Good summary lane, but live backlog/test noise is too high for launch training |
| Support/admin screens | 7.8 | Reports/settings/timetable useful; inventory lacks live data and reports are long |

## 2. Method

- Browser-only QA on hosted Sakorio domains.
- Staff session signed in through `staff.sakorio.com/login`.
- iPad-sized viewport used to simulate likely waiter/cashier tablet usage.
- Non-destructive simulation: no real table clearing, reservation creation, queue creation, payment submission, or settings save.
- Each use case was scored for:
  - functional correctness;
  - first-glance clarity;
  - number of redundant/unclear steps;
  - recovery path;
  - iPad layout smoothness;
  - risk before launch.

## 3. Use case scorecard

| ID | Area | Use case | Functional result | UX score | What needs to improve |
|---|---|---|---|---:|---|
| UC-01 | Staff auth | Staff login and landing | Pass | 8.5 | Dashboard works, but on iPad the navigation system is dense. Keep the dashboard focused on service shortcuts during launch. |
| UC-02 | POS | POS table board loads | Pass | 8.6 | Table board is clear and useful. Consider making open/paid/filter states even more touch-friendly during busy service. |
| UC-03 | POS | Select a paid table | Pass | 8.0 | Clear/receipt/payment-received actions exist, but paid-table cards also show multiple actions like Clear paid / Start order / Orders, which may confuse a cashier. |
| UC-04 | POS | Select an open table | Pass | 6.8 | Critical polish: selected-table order/payment controls exist but are not prominent enough in the first iPad viewport. The selected table should become the main focus immediately. |
| UC-05 | POS | Return from selected table to table board | Pass | 7.3 | Back-to-tables recovery exists, but it should be persistently visible or sticky once a table is selected. |
| UC-06 | POS | Table menu flow remains compact | Pass with UX concern | 6.6 | Menu/payment content is reachable, but the flow still feels scroll-heavy. Selected table should use a tighter split-pane or drawer-first layout. |
| UC-07 | POS | Checkout action visibility | Pass with policy concern | 7.0 | Checkout/HitPay/payment wording is visible. Staff POS still shows Cash; decide before launch whether staff cash remains allowed or should be hidden like public QR. |
| UC-08 | Orders | Active orders overview by table | Pass | 8.8 | Good table-based grouping. Keep this as the service-manager view. |
| UC-09 | Orders | Current vs history split | Pass | 8.6 | Current/history concepts are visible. Improvement: add clearer "current table session" wording if staff still confuse current tickets with history. |
| UC-10 | Tables | Table grid operational overview | Pass | 8.2 | Strong operational grid. "Advanced controls" appears repeatedly and may add noise; keep advanced actions visually secondary. |
| UC-11 | Tables | Paid table clearing affordance | Pass | 8.5 | Clear table is visible for ready-to-clear tables. Good workflow. |
| UC-12 | Tables | Table orders handoff | Pass | 8.1 | Orders/start-order/receipt handoffs are visible. Improve by making POS handoff feel like a single service loop, not separate modules. |
| UC-13 | Queue | Host stand queue overview | Pass | 8.6 | Strong host-stand summary. Good for launch. |
| UC-14 | Queue | Queue-to-table readiness | Pass | 8.3 | Seating language and queue QR are discoverable. Data-mutating test still needed for actual seat/handoff confirmation. |
| UC-15 | Reservations | Reservation service-day overview | Pass | 8.5 | Good service-day metrics and statuses. |
| UC-16 | Reservations | New reservation path discoverability | Pass | 8.3 | New reservation and public booking actions are visible. Actual create/edit/cancel flow still needs a data-mutating sandbox test. |
| UC-17 | Kitchen | Kitchen/beverage production board | Pass | 7.6 | Board structure is good, but old backlog/test tickets create operational noise. Clean backlog before launch training. |
| UC-18 | Timetable | Scheduling command center | Pass | 8.0 | Command strip is useful. Calendar is still dense on iPad; drag/drop is good for desktop but tap-first scheduling should be the main tablet story. |
| UC-19 | Reports/Inventory | Manager handover and stock action | Pass | 7.8 | Reports handover is strong, but page is very long. Inventory stock dashboard is structurally ready but tenant has zero stock items. |
| UC-20 | Settings/Payments | Launch payment settings visibility | Pass | 7.8 | Payment Settings tab loads and shows HitPay/API/webhook/terminal settings. Settings is broad and dense; launch checklist should point directly to payment settings. |

## 4. Supplemental public QR check

Public route checked:

`https://order.sakorio.com/menu/3b89cb81-33d4-402d-acc6-0be4a45d9b68`

| Check | Result |
|---|---|
| Public menu loads | Pass |
| Current order panel visible | Pass |
| Current session starts cleanly | Pass; "No active order" shown |
| Other customer order history visible | Pass; no other history visible in checked session |
| Cash visible | Pass; Cash was not visible |
| HitPay/terminal visible before checkout | Not expected at menu browsing stage |
| Horizontal overflow | Pass |

Public QR score: **8.7 / 10**

Improvement: run a data-mutating public QR test next: add item, submit order, start HitPay sandbox checkout, return, confirm only current session bill is visible.

## 5. High-priority polish findings

### P1 - POS selected-table first viewport

The selected-table flow passes functionally, but it is still the biggest UX risk.

Observed issue:

- On `https://staff.sakorio.com/pos?tableId=1`, the page still begins with the broader POS/table board context.
- The selected table service controls are present, but the first iPad viewport can still feel like "table board first, selected table second."
- During a rush, this creates unnecessary cognitive load.

Recommendation:

- When `tableId` is present, put the selected-table service drawer/panel first.
- Keep table board access available through a sticky "Back to tables" / side rail.
- Keep payment lane visible or sticky on the right where possible.
- Reduce duplicate table actions on paid cards.

Target score after fix: **9.0+**

### P1 - Payment method policy clarity

Public QR surface did not show Cash, which is good.

Staff POS still exposed Cash wording in the payment flow. This may be intentional for staff, but it must be a conscious launch decision.

Recommendation:

- Decide one policy:
  - public QR: HitPay / terminal only;
  - staff POS: terminal / HitPay / cash if restaurant accepts cash;
  - or staff POS also hide cash.
- If cash is staff-only, label it clearly as staff/internal payment.

### P1 - Kitchen backlog cleanup

Kitchen board structure is good, but the live board showed old unresolved backlog/test tickets, including waits over 10 hours.

Recommendation:

- Clean or archive old test tickets before launch training.
- Keep a small clean demo dataset for staff training.
- Add an "archive stale test tickets" admin/support script if this recurs.

### P2 - Tables advanced controls visual noise

Tables tab is functional and strong, but repeated "Advanced controls" blocks add visual noise.

Recommendation:

- Collapse advanced controls by default.
- Keep day-to-day actions prominent: Orders, Start order, View receipt, Clear table.

### P2 - Reports length and manager scanning

Reports now has a good handover strip, but the page is still long.

Recommendation:

- Add anchor chips or a sticky mini nav: Summary, Payment methods, Reservations/Queue, Attendance.
- Keep exports near each section.

### P2 - Inventory has no launch data

Inventory stock dashboard is structurally healthy but currently empty.

Recommendation:

- Load real launch stock items or explicitly mark Inventory as post-launch.
- If launching without inventory, hide it from non-admin day-one navigation.

### P2 - Timetable tablet ergonomics

Timetable command center is useful, but the calendar remains dense on iPad.

Recommendation:

- Keep drag/drop for desktop.
- Make tap-first "Add shift" and "Schedule this person" the primary tablet path.

## 6. Launch-readiness interpretation

The system is not blocked by route failures or obvious broken layouts. The main risk is operator friction under pressure.

Launch status after this pass:

| Area | Status |
|---|---|
| POS core | Functional, needs selected-table polish |
| Tables | Launch-capable, minor noise reduction recommended |
| Orders | Launch-capable |
| Queue | Launch-capable, needs data-mutating handoff test |
| Reservations | Launch-capable, needs data-mutating create/edit/cancel test |
| Public QR menu | Launch-capable for browsing/current session; needs payment-path sandbox run |
| Kitchen | Functionally ready, clean backlog before training |
| Timetable | Good manager layer, tablet scheduling can improve |
| Reports | Good manager handover, long page |
| Inventory | Structurally ready, operationally empty |
| Settings/Payments | Payment settings visible and reviewable |

## 7. Recommended next work

### Next coding polish

1. Rework POS selected-table layout so selected table service content appears first when `tableId` is present.
2. Make Back to tables and payment lane sticky/persistent on iPad.
3. Clarify staff POS payment method policy around Cash.
4. Collapse Tables advanced controls by default.

### Next sandbox run

Run a data-mutating sandbox service rehearsal:

1. Create one QA queue entry.
2. Seat it to a table.
3. Create a QA reservation.
4. Seat/finish/cancel reservation states.
5. Create a POS table order with two items.
6. Add a second order to the same table.
7. Confirm Orders keeps both tickets current until table clear.
8. Run one POS HitPay sandbox checkout.
9. Run one public QR HitPay sandbox checkout.
10. Clear the table and confirm tickets move to history only after clear.

This next run should be done deliberately because it changes live staging data.

