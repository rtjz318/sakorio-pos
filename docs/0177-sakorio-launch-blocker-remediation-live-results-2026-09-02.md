# Sakorio Launch-Blocker Remediation — Live Browser Results

**Execution date:** 2 September 2026 (Singapore time)  
**Parent result:** `0176-sakorio-master-150-case-live-browser-qa-results-2026-09-02.md`  
**Live builds verified:** `2.1.6 1355dbe8`, then `2.1.6 05737dd7`  
**Method:** All workflow and UI acceptance evidence below was observed on the deployed `staff.sakorio.com` or `order.sakorio.com` interfaces. Local code checks are listed separately and are not treated as live acceptance.

## Executive outcome

The most important cashier-controlled service chain now works live:

`public queue join → realtime notify → seat at T07 → POS order → kitchen/beverage routing → Served → terminal payment → close table → Orders History → Reports`

The queue seating defect was fixed, deployed and retested. The iPad/tablet POS and Tables layouts were also polished and verified on the deployed build in portrait and landscape simulations.

This materially improves the original result, but Sakorio is **not yet 100% launch-ready**. Two P0 dependencies remain outside this code pass:

1. Render staff/order frontends must be always-on or provide an equivalent no-cold-start production delivery path.
2. The Android printer agent and XP-80T must pass physical paper acceptance; the live system currently has no online printer agent.

The final fixed-QR customer ordering portion was not repeated in this controlled transaction because the live browser did not expose the current T07 fixed QR token. It must be included in the physical-table acceptance pass.

## Correction to the original outage diagnosis

The original report stated that the staff service did not recover. Continued live observation showed that it did recover after approximately 55–60 seconds. The accurate diagnosis is therefore a severe Render cold start, not a permanent outage.

| Observation | Corrected result |
|---|---|
| Initial protected-route load | Render wake/interstitial instead of the POS |
| Recovery | Staff shell returned after about 55–60 seconds |
| Session/deep link | Authenticated access was usable after recovery |
| Launch implication | Still unacceptable for restaurant operations; an operator cannot wait about a minute during service |
| Required action | Upgrade the relevant frontend service(s) to always-on production delivery, or move static frontend delivery to an always-on/static host; then run ten cold/deep-link attempts |

## Fix 1 — Queue seating versus future reservations

### Defect reproduced live

A labelled synthetic guest joined the public queue as `Q002`. The guest page showed a large queue number, live status and zero parties ahead. Staff notification updated the guest page automatically without a manual refresh. Seating Q002 at the recommended available T07 then failed with a generic message.

The table board considered only today's reservation state, while the seating API rejected any booked reservation attached to the table, including a future booking. This produced a false conflict between host recommendations and the seating action.

### Implemented change

- Backend seating conflict checks now use the tenant's current service date.
- A booked reservation blocks queue seating only when its reservation date matches that service date.
- The Queue screen now displays the backend conflict detail instead of replacing it with a generic failure.
- Added regression coverage for both sides of the rule: a future reservation does not block today's queue seating; a same-day reservation does.

**Commit:** `1355dbe8 Fix queue seating with future reservations`

### Verification

| Check | Result |
|---|---:|
| Targeted backend regression tests | PASS — 4 tests |
| Angular live compiler | PASS |
| Deployed build observed | PASS — `2.1.6 1355dbe8` |
| Retry seat Q002 at T07 | PASS |
| Staff redirected to T07 POS | PASS |
| Guest page changed to `You are seated` without refresh | PASS |

## Controlled live lifecycle — Q002 / T07 / order #273

No pre-existing operational bill, old kitchen ticket or legacy queue row was edited during this run.

| Step | Live-browser evidence | Result | Usability score |
|---|---|---:|---:|
| Public queue join | Q002 was prominent with party size, live status and zero ahead | PASS | 9.5/10 |
| Host notification | Guest status changed to `Your table is nearly ready` without refresh | PASS | 9.5/10 |
| Host seating | T07 accepted the queue guest after the fix; guest changed to `You are seated` | PASS | 9.5/10 |
| POS order entry | Added A1 Kimchi (SGD 4) and Sprite (SGD 5), with `QA launch test - no chilli` | PASS | 9.0/10 |
| Temporary deploy/API interruption | First Send failed visibly and preserved the cart; retry succeeded | PASS with resilience | 8.5/10 |
| Order creation | Bill/order `#273`, T07, total SGD 9.00 | PASS | 9.0/10 |
| Station routing | Kitchen showed only A1 Kimchi; Beverages showed only Sprite | PASS | 9.5/10 |
| Beverage progression | Pending → Preparing → Ready → Served; completion toast/countdown shown | PASS | 9.5/10 |
| Kitchen progression | Pending → Preparing → Ready → Served; completion toast/countdown shown | PASS | 9.5/10 |
| Terminal settlement | Paid state showed `Terminal settled - SGD 9.00` | PASS | 9.0/10 |
| Close-table guard | Explicit `Close T07?` and `Yes, close table` confirmation required | PASS | 9.5/10 |
| Table reset | T07 returned to Available and the active guest queue returned to zero | PASS | 9.0/10 |
| Orders History | History contained `#273`, T07, the two items, SGD 9.00 and Paid | PASS | 9.0/10 |
| Reports reconciliation | Terminal total became 7 payments / SGD 56.30; today included SGD 9.00 | PASS | 9.0/10 |

### Minor observation

After the beverage line was served, the previous `#273 cleared from KDS (1 item)` completion message remained visible briefly while the kitchen ticket was still open. It cleared on the next state transition. This is not a transaction blocker, but the toast should ideally remain globally positioned rather than visually associating with the remaining ticket.

## Fix 2 — Tablet POS category discoverability and touch targets

### Implemented change

- Added a portrait-only `Menu categories / Swipe to see more →` guide.
- Added a right-edge fade, thin scrollbar, contained horizontal overscroll and category snap points.
- Made the category strip keyboard focusable and labelled it as a scrollable region.
- Raised POS drawer button targets to a minimum 44 px at tablet breakpoints.
- Raised primary Tables button targets to a minimum 44 px without enlarging the table cards themselves.

**Commit:** `05737dd7 Improve tablet POS navigation targets`

### Live iPad/tablet simulation

| Surface | Viewport simulation | Live result | Score |
|---|---:|---|---:|
| POS table drawer | 820 × 1180 portrait | No overlap; right-side cart/payment pane remained stable; swipe guide and edge affordance were visible | 9.3/10 |
| POS category interaction | 820 × 1180 portrait | `Drink Menu 41` activated and exactly 41 product cards rendered | 9.5/10 |
| POS table drawer | 1180 × 820 landscape | Dense four-column menu plus fixed right cart rendered cleanly with no hidden workflow controls | 9.3/10 |
| Tables | 820 × 1180 portrait | Header, host stand, floor controls and two-column table cards remained readable; no error state | 9.2/10 |
| Tables | 1180 × 820 landscape | Three-column table grid and 44 px actions rendered without container overlap | 9.3/10 |

The deployed footer hash `2.1.6 05737dd7` was confirmed during every viewport check.

## Updated case interpretation

These are targeted post-remediation updates, not a rewrite of all 150 historical executions.

| Original case | Updated result | Updated score | Reason |
|---|---:|---:|---|
| MASTER-E2E-001 | PARTIAL | 6.5 | Staff recovered, but the 55–60 second cold start still fails restaurant-grade availability. |
| MASTER-E2E-002 | PARTIAL | 7.0 | Protected route/session became usable after recovery; ten-attempt reliability is outstanding. |
| MASTER-E2E-021 | PARTIAL | 8.8 | Queue join, realtime notify, seat, staff POS order, KDS, terminal payment and close passed; fixed-QR customer ordering was not repeated. |
| MASTER-E2E-041 | PASS | 9.0 | POS order, routing, settlement, close and reset completed live. |
| MASTER-E2E-061 | PASS | 9.5 | Food and drink routed only to their correct lanes. |
| MASTER-E2E-062 | PASS | 9.3 | Kitchen and beverage lines progressed independently. |
| MASTER-E2E-066 | PASS | 9.5 | Both lanes completed through Served with completion feedback. |
| MASTER-E2E-071 | PASS | 9.0 | Terminal settlement, paid state and close guard completed. |
| MASTER-E2E-080 | PARTIAL | 8.7 | Lifecycle and accounting reconciled; physical customer receipt remains unproven. |
| MASTER-E2E-081 | PASS | 9.0 | Closed order appeared in table-scoped History. |
| MASTER-E2E-083 | PASS | 9.0 | Reports reflected the exact SGD 9 terminal settlement. |
| MASTER-UX-131 | PASS | 9.3 | Live tablet drawer fit and touch-target polish verified. |
| MASTER-UX-132 | PASS | 9.3 | Portrait category scroll is now visibly discoverable and functionally verified. |
| MASTER-UX-147 | PASS | 9.4 | Product browsing and category filtering are clear at tablet width. |
| MASTER-UX-149 | PARTIAL | 8.5 | Staff-controlled queue-to-close journey passed; reservation and customer QR variants remain. |
| MASTER-UX-150 | BLOCKED | 4.0 | Physical Android printer journey is still unavailable. |

## Printing state after order #273

The lifecycle produced the expected three print jobs, but they remain queued because no printer agent is online.

| Live Settings value | Observed state |
|---|---:|
| Online agents | 0/3 |
| Waiting jobs | 20 |
| Needs attention | 0 |
| Printed in recent window | 30 |
| New customer receipt | #273 pending |
| New bar ticket | #273 pending |
| New kitchen ticket | #273 pending |
| Android/native plugin in browser build | Unavailable, as expected |

Do not retry the pending jobs blindly. Connect the designated Android agent and XP-80T first, confirm the expected agent identity, then drain controlled jobs while checking for duplicate suppression.

## Remaining launch blockers and owners

### P0-A — Always-on production web delivery

**Owner:** Deployment/account administrator  
**Action:** Sign in to Render, upgrade the staff and relevant public frontend delivery services from any free/sleeping instance to an always-on plan, or move static frontend delivery to an always-on static host.  
**Exit test:** Ten cold/deep-link attempts to Login, POS, Queue, Tables and Orders; no wake interstitial, no lost route, maximum acceptable time agreed and measured.

### P0-B — Physical Android + XP-80T printing

**Owner:** On-site launch lead with the paired tablet and printer  
**Action:** Start the Sakorio Android printer worker, obtain at least one expected online agent, print one kitchen slip, one beverage slip and one paid customer receipt, then test disconnect/reconnect, retry and duplicate suppression.  
**Exit test:** The relevant MASTER-XCUT-121–130 cases pass on real paper.

### P0-C — Fixed-QR physical table chain

**Owner:** On-site launch lead  
**Action:** Open a fresh table session, scan the printed fixed QR on a separate customer phone, submit food and drink in two rounds, request payment, settle, close and rescan the same QR for the next clean session.  
**Exit test:** Customer sees only the current session and bill; no previous history; no Cash option; station routing and reset are exact.

### P1 — Existing operational data decision

The following older state was deliberately preserved because it may be real operational/accounting data:

- T01 bill #257 — unpaid
- T02 bill #263 — unpaid
- T05 bill #261 — unpaid
- T06 bill #270 — payment requested
- T10 Emma Wilson — over-capacity seated record
- Three older KDS backlog tickets

An administrator must decide whether each is valid operational data, an accounting correction, or approved QA cleanup. Automation must not silently close or delete it.

## Launch decision

**Current decision: CONDITIONAL NO-GO.**

The core staff-operated ordering, station routing, terminal payment, close, history and reporting path is now healthy and scores around 9/10. The tablet UI issue is also remediated. Launch approval still requires always-on web delivery, physical printer proof, and one full fixed-QR customer journey on the actual shop devices. No responsible QA report can guarantee that software will have zero future errors; the correct launch gate is that all P0 acceptance tests pass with recoverable failure behavior and accountable operational procedures.
