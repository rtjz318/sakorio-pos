# Sakorio POS round 2 browser QA results - 50 use cases

Date: 2026-07-19  
Source brief: `docs/0080-sakorio-round-2-browser-qa-50-use-cases-2026-07-19.md`  
Execution surface: deployed Sakorio domains only  
Browser surface: Codex in-app browser  
Staff account used: owner account provided by user  
Primary staff domain: `https://staff.sakorio.com`  
Primary customer domain: `https://order.sakorio.com`

## Executive summary

I executed all 50 use cases, E2E-101 through E2E-150, directly in the browser. The system is much stronger than the earlier passes in the core table/POS/QR/payment lifecycle, especially after seating an active table and using QR ordering. The best flows are:

- reservation creation, seating, terminal payment, paid clear, and automatic reservation finish;
- queue-to-table handoff with best-fit table recommendation;
- customer QR self-order once the table session is actually active;
- QR session reload privacy;
- QR payment options showing HitPay and Card at Table only, with no Cash;
- staff terminal recovery for a QR Card at Table order;
- current orders vs history separation after paid table clear;
- Kitchen backlog safety locking bulk completion above 25 stale tickets.

However, three launch-level issues remain:

1. Oversized staff reservations are accepted even when no table capacity can support the party.
2. Queue duplicate prevention is missing; the same name/phone can be added twice.
3. Logout did not end the visible owner session at iPad/tablet viewport; protected `/users` remained accessible after retry.

There are also several important product/specification gaps: pre-assigning reservation tables before seating, combined tables, moving active bills, manual POS items, item customizations, and staff POS HitPay policy.

## Overall scoring

- Total cases: 50
- PASS: 17
- PASS_WITH_ISSUES: 18
- PASS_PARTIAL: 1
- NEEDS_SPECIFICATION: 9
- BLOCKED: 2
- FAIL: 3

Approximate launch readiness score from this round: 7.2 / 10.

Core table/QR/payment flows are close, but the P0/P1 items below should be fixed before launch.

## P0 / P1 / P2 / P3 defects and improvements

### P0 - launch blockers

| ID | Area | Issue | Evidence | Recommended fix |
| --- | --- | --- | --- | --- |
| P0-01 | Reservations | Staff can create a party-size-25 reservation even though available table capacity is far lower. | E2E-105 accepted oversized synthetic reservation. | Block save when party size exceeds configured maximum or no valid table/combined-table capacity exists. Show clear capacity message. |
| P0-02 | Auth/session | Logout did not end visible session at iPad viewport. `/users` remained accessible after logout retry. | E2E-149. | Fix logout handler/session clearing for responsive layout. Add smoke test: logout, navigate protected route, assert login page. |

### P1 - high priority

| ID | Area | Issue | Evidence | Recommended fix |
| --- | --- | --- | --- | --- |
| P1-01 | Queue | Duplicate queue entries are allowed for same name/phone. | E2E-115 created duplicate phone/name twice. | Add duplicate warning/block for active queue entries with same normalized phone. |
| P1-02 | POS / dine-in service | Staff POS flow lacks a clear Send to kitchen / keep unpaid step. Checkout pushes into payment flow. | E2E-101, E2E-116, E2E-117. | Add explicit `Send order` action separate from `Pay bill`; allow add-on rounds in same current table session. |
| P1-03 | QR activation | POS drawer `Open customer QR` did not expose/open a usable QR tab and did not activate T04 QR session by itself. | E2E-101, E2E-121, E2E-125. | Make QR action deterministic: copy link, open tab, and show table session active/closed status clearly. |
| P1-04 | Orders UI | Orders page shows `No Rows To Show` while populated rows are visible. | E2E-135, E2E-136. | Fix grid empty-state logic so empty copy appears only when the selected filter truly has zero rows. |

### P2 - workflow polish

| ID | Area | Issue | Evidence | Recommended fix |
| --- | --- | --- | --- | --- |
| P2-01 | Reservations | No clear pre-assignment workflow separate from seating. | E2E-102, E2E-108. | Add visible `Assign table` action for future reservations without opening table service. |
| P2-02 | Tables | No visible join/combined-table flow. | E2E-122. | Add combined table/session model or hide this from launch scope. |
| P2-03 | Tables/POS | No visible move-table flow for active bill. | E2E-123. | Add `Move table` action with audit trail and duplicate prevention. |
| P2-04 | POS | No manual/quick item visible. | E2E-131. | Add permission-gated manual item or explicitly exclude from launch. |
| P2-05 | POS/menu | No item customization/options prompt visible. | E2E-133. | Add item notes/options for QR and staff POS, surfaced on kitchen ticket. |
| P2-06 | Orders/payment | Old unpaid recovery could not be tested due missing fixture and QR activation limits. | E2E-125, E2E-137. | Add admin unpaid-order fixture or test-only helper; preserve unpaid state until paid. |
| P2-07 | Timetable | Leave/MC ledger still coming soon. | E2E-144. | Decide whether leave/MC is launch-blocking; if not, label as post-launch. |
| P2-08 | Users/permissions | Waiter-limited permissions not fully verified. | E2E-138, E2E-146. | Provide safe waiter QA login and add smoke tests for restricted actions. |

### P3 - polish / nice-to-have

| ID | Area | Issue | Evidence | Recommended fix |
| --- | --- | --- | --- | --- |
| P3-01 | Queue | Queue cancel happens immediately; accidental taps are possible. | E2E-113. | Add undo toast or confirmation for cancel/no-show on queue. |
| P3-02 | Queue | Queue board says `Newest first`; no explicit sort by party size/wait time. | E2E-112. | Add sort controls for host stand speed. |
| P3-03 | POS iPad | Current POS is usable, but 20-30 item density was not fully tested because seed has only 9-10 items. | E2E-126, E2E-134. | Seed a larger menu for tablet stress testing. |
| P3-04 | Kitchen | Mixed food/drink tickets are readable, but station distinction could be stronger. | E2E-142. | Add visual station badges/lanes inside mixed ticket cards. |
| P3-05 | Reports | Reports are strong but financial reconciliation needs a clearer today closeout bridge. | E2E-148. | Add paid-today/unpaid/table-turnover summary to end-day checklist. |

## 50-case result table

| Case ID | Status | UI/UX | Workflow | Data | Launch blocker | Browser outcome |
| --- | --- | ---: | ---: | --- | --- | --- |
| E2E-101 | PASS_WITH_ISSUES | 7 | 6 | Partial | Watch | Public reservation #44 created, seated T07, bill #62 paid, kitchen showed #62, table cleared. QR open button unreliable; kitchen ticket appeared after payment. |
| E2E-102 | PASS_PARTIAL | 6 | 5 | Not verified | Watch | Reservation cards show seating guidance, but no true pre-assign-table action separate from seating. |
| E2E-103 | PASS | 8 | 8 | Pass | No | Synthetic reservation created, filtered by phone, cancelled successfully. |
| E2E-104 | PASS | 8 | 7 | Partial | No | No-show action worked after in-app confirmation modal; no table/order created. |
| E2E-105 | FAIL | 4 | 3 | Fail | Yes | Party-size-25 reservation was accepted. |
| E2E-106 | PASS | 8 | 8 | Pass | No | Reservation edit saved changed name/notes and persisted. |
| E2E-107 | PASS | 8 | 8 | Pass | No | Reservation-to-queue handoff prefilled guest, phone, party, and notes. |
| E2E-108 | NEEDS_SPECIFICATION | 6 | 5 | Not verified | Watch | Future same-table conflict could not be tested because pre-assignment UI is not visible. |
| E2E-109 | PASS_WITH_ISSUES | 8 | 8 | Pass | No | Reservation auto-finished after paid clear; no manual finish action visible. |
| E2E-110 | PASS | 7 | 7 | Pass | No | Invalid public booking data blocked confirmation; corrected data created token link. Error copy should be clearer. |
| E2E-111 | PASS_WITH_ISSUES | 8 | 7 | Pass | Watch | Queue guest seated to T07, order/payment completed. Same kitchen-after-payment caveat. |
| E2E-112 | PASS_WITH_ISSUES | 8 | 7 | Pass | No | Queue shows party size, quote, fit/readiness. Needs explicit sort controls. |
| E2E-113 | PASS_WITH_ISSUES | 8 | 7 | Pass | No | Queue cancel immediately disabled actions. Add undo/confirmation. |
| E2E-114 | PASS | 8 | 8 | Pass | No | 5-pax queue entry showed no matching ready table; unsafe seating not offered. |
| E2E-115 | FAIL | 5 | 4 | Fail | Watch | Duplicate queue name/phone was accepted twice. |
| E2E-116 | PASS_WITH_ISSUES | 8 | 6 | Pass | Watch | T04 staff order appeared in kitchen after terminal payment; lacks pre-payment send order. |
| E2E-117 | NEEDS_SPECIFICATION | 7 | 5 | Not verified | Watch | Same-session add-on cannot be clearly verified in staff POS due immediate payment model. |
| E2E-118 | PASS | 8 | 8 | Pass | No | Unpaid T09 had Take payment only; Clear paid was not offered while unpaid. |
| E2E-119 | PASS | 8 | 8 | Pass | No | T09 #58 paid by terminal and became clearable. |
| E2E-120 | PASS | 8 | 8 | Pass | No | T04 after close showed Orders 0 and History 14 with recent #64 in history. |
| E2E-121 | PASS | 7 | 6 | Partial | Watch | Closed T04 QR showed Table Closed and no prior history leak. QR-open reliability still weak. |
| E2E-122 | NEEDS_SPECIFICATION | 6 | 5 | Not verified | Watch | No visible combined-table/join-table workflow. |
| E2E-123 | NEEDS_SPECIFICATION | 6 | 5 | Not verified | Watch | No visible move active bill/table workflow. |
| E2E-124 | PASS_WITH_ISSUES | 7 | 7 | Pass | No | iPad POS board is usable; long table history can still push context down. |
| E2E-125 | BLOCKED | 6 | 5 | Not verified | Watch | Could not generate unpaid QR bill because T04 QR stayed closed and staff POS charges immediately. |
| E2E-126 | PASS_WITH_ISSUES | 7 | 7 | Pass | No | iPad menu/search/cart is usable with 9 seeded items; needs 20-30 item stress seed. |
| E2E-127 | PASS_WITH_ISSUES | 7 | 6 | Partial | Watch | Back/switch table with cart kept context but did not give a strong warning. |
| E2E-128 | NEEDS_SPECIFICATION | 7 | 6 | Partial | Watch | Existing live bill + new cart could not be verified with available fixture. |
| E2E-129 | PASS | 8 | 8 | Pass | No | Terminal settlement path works and updates paid/clearable state. |
| E2E-130 | NEEDS_SPECIFICATION | 6 | 6 | Partial | Watch | Staff POS shows Staff cash + Terminal only; no HitPay staff policy copy. |
| E2E-131 | NEEDS_SPECIFICATION | 5 | 5 | Not verified | Watch | No visible manual/quick item. |
| E2E-132 | PASS | 8 | 8 | Pass | No | Removed mistaken cart item before checkout; remaining cart was correct. |
| E2E-133 | NEEDS_SPECIFICATION | 5 | 5 | Not verified | Watch | No visible item customization/options/notes prompt. |
| E2E-134 | PASS_WITH_ISSUES | 7 | 7 | Pass | No | 8-item cart stayed readable; needs true 20-30 item stress. |
| E2E-135 | PASS_WITH_ISSUES | 6 | 6 | Pass | Watch | Orders grid compact enough, but `No Rows To Show` appears above populated rows. |
| E2E-136 | PASS_WITH_ISSUES | 7 | 7 | Pass | No | Active/history separation works, but empty-state copy is contradictory. |
| E2E-137 | BLOCKED | 6 | 5 | Not verified | Watch | No old unpaid order fixture remained after T09 settlement. |
| E2E-138 | NEEDS_SPECIFICATION | 6 | 6 | Not verified | Watch | Manager edit/delete controls need safer audit/permission test; destructive delete not executed. |
| E2E-139 | PASS | 8 | 8 | Pass | No | Activated T07 QR, customer placed order #66, no Cash option visible. |
| E2E-140 | PASS | 8 | 8 | Pass | No | QR reload preserved current session/order #66 and did not show prior history. |
| E2E-141 | PASS | 8 | 8 | Pass | No | QR Pay Now showed HitPay + Card at Table. Staff settled #66 by terminal and cleared T07. |
| E2E-142 | PASS_WITH_ISSUES | 8 | 8 | Pass | No | Kitchen/Beverage board readable with mixed food/drink; improve station distinction. |
| E2E-143 | PASS | 8 | 8 | Pass | No | Backlog mode locked bulk complete above 25 and instructed narrowing first. |
| E2E-144 | PASS_WITH_ISSUES | 8 | 8 | Partial | No | Timetable is strong; leave/MC ledger remains coming soon. |
| E2E-145 | PASS_WITH_ISSUES | 7 | 7 | Partial | No | My Shift has profile selector and shift status; no available shift to clock in. |
| E2E-146 | PASS_WITH_ISSUES | 7 | 7 | Partial | No | Users page shows roles; waiter permission QA still needs safe credential. |
| E2E-147 | PASS | 8 | 8 | Pass | No | Payment Settings masks secrets; QR customer payment options are correct. |
| E2E-148 | PASS_WITH_ISSUES | 7 | 7 | Partial | Watch | Reports and end-day checklist are useful; add stronger paid/unpaid/table-turnover closeout. |
| E2E-149 | FAIL | 5 | 4 | Fail | Yes | Logout did not end visible session; `/users` stayed accessible. |
| E2E-150 | PASS_WITH_ISSUES | 7 | 8 | Pass | No | POS, Orders, Tables, Kitchen, and QR refreshed coherently. Unsent cart refresh not tested. |

## Cleanup log

- Paid and cleared generated terminal test bills for T01, T04, T07, and T09 where applicable.
- Cleared paid states after E2E-101, E2E-111, E2E-116, E2E-119, and E2E-141.
- Cancelled/no-showed some synthetic reservation records.
- One or more synthetic queue duplicates remain visible from E2E-112/E2E-115 unless later cleanup is performed. They are useful evidence for the duplicate-prevention defect.
- Synthetic historical paid orders remain in order history, as expected after payment tests.

## Recommended next implementation order

1. Fix logout/session clearing and add browser smoke test for protected-route redirect.
2. Add reservation capacity validation for oversized parties.
3. Add active queue duplicate prevention by normalized phone.
4. Fix Orders grid empty-state logic.
5. Split staff POS `Send order` from `Pay bill`, so dine-in kitchen tickets can be sent before payment.
6. Make `Open customer QR` deterministic: show/copy exact QR URL, open it reliably, and show whether the table session is active.
7. Decide launch scope for combined tables, move table, manual items, and item customization.
8. Create safe waiter QA credentials and a larger seeded menu for final tablet stress testing.

