# Staff operations workflow brief

Date: 2026-07-17  
Scope: My shift, Working plan, Kitchen & beverages, Orders  
Status: Product brief for the next implementation batch

## 1. Executive summary

The staff operations area should feel like one connected restaurant operating system, not four separate pages.

The target workflow is:

1. A staff member can identify themselves quickly and clock into the correct shift.
2. A manager can build and adjust the working plan like a real calendar.
3. Clicking a shift in the working plan can become an immediate attendance action when the staff member is present.
4. Kitchen and beverage teams can see only the tickets that matter, in a steady production board that is readable under pressure.
5. Orders should be table-first. The broad overview should show tables, table state, active tickets, payment state, and next action without one order consuming most of the page.

The goal is speed, clarity, and confidence during service. The interface should make the next correct action obvious.

## 2. Guiding principles

- **Table-first service:** Waiters and managers think in tables first, then tickets/orders.
- **Shift-first attendance:** Staff clock in against a scheduled shift, not against a generic anonymous attendance button.
- **One-click recovery:** If the user lands in the wrong context, the UI should offer the correct nearby action: open POS, clock in, start prep, mark ready, collect payment.
- **No crowded cards:** Dense operational pages should summarize first and expand details only when needed.
- **Station clarity:** Kitchen and beverage teams should not have to mentally filter irrelevant items.
- **Browser-only QA for UI/UX:** All staff workflow QA should be performed on the real Sakorio browser surface after deployment.
- **Fast under pressure:** The UI should assume a busy shift, wet hands, one-handed tablet use, and multiple staff glancing at the screen.

## 3. Current pain points

### My shift

- Staff can clock in, but the workflow is still centered on the currently logged-in user.
- The user request is that staff must be able to select their profile to clock in.
- This supports shared tablets or a manager station where multiple staff members need to clock in from the same device.

### Working plan

- The page has shift CRUD and week/calendar views, but it needs to behave more like a full calendar.
- Clicking a shift should expose direct actions, including clock-in when the shift belongs to the present staff member.
- Adding a shift should be easy from the calendar itself, not only from a header button.

### Kitchen and beverages

- Orders can feel messy when many tickets are present.
- The board needs stronger hierarchy: station, table, age, item status, urgency, and handoff.
- Kitchen and beverage workflows should be clearly split or filterable without losing the overall service picture.

### Orders

- The broad overview must be based on tables.
- A single table order currently takes too much vertical and horizontal space.
- Staff need a compressed operational overview first, then drill into the table/order detail.

## 4. Target experience by area

### 4.1 My shift: profile-select clock-in

Target behavior:

- The attendance page starts with a **staff profile selector** when the current account has permission to clock in multiple profiles.
- The staff member selects their profile card: name, role, next scheduled shift, clock state.
- After profile selection, the page shows only that staff member's eligible shifts and current attendance state.
- If the selected person has a shift in the valid clock-in window, the primary button becomes **Clock in for this shift**.
- If no shift is eligible, the UI explains why: too early, too late, already completed, no scheduled shift, or profile incomplete.
- Clock-in still requires the configured proof flow, such as photo capture or venue QR, where already supported.

Recommended profile selector states:

| State | Meaning | Primary action |
|---|---|---|
| Ready | Shift is within the allowed clock-in window | Clock in |
| Upcoming | Shift exists but is too early | View shift |
| Active | Staff member is already clocked in | Continue shift |
| Completed | Shift already has attendance | View record |
| Missing profile | Profile lacks required payroll fields | Complete profile |
| No shift | No shift is scheduled today | Ask manager / view working plan |

### 4.2 Working plan: calendar-first scheduling

Target behavior:

- The calendar supports direct add/edit actions inside the grid.
- Clicking an empty calendar cell opens a new shift drawer prefilled with that date.
- Dragging across time/day creates a draft shift range when a time-grid view is available.
- Clicking a shift opens a detail popover or side drawer with:
  - staff member
  - date/time
  - role
  - label
  - planned vs actual, if attendance exists
  - edit/delete/copy actions
  - **Clock in now** when the shift is eligible and the selected staff can clock into it
- Managers can duplicate a shift, copy day, copy week, and bulk assign common patterns.
- The calendar should warn about:
  - overlapping shifts for the same staff member
  - understaffed roles versus opening-hours staffing targets
  - missing hourly rate/profile readiness
  - short rest periods
  - shifts outside opening hours unless explicitly marked as preparation/cleaning

Recommended calendar views:

| View | Purpose |
|---|---|
| Today board | Who is working now, late, on break, clocked in, missing |
| Week calendar | Main planning surface for managers |
| Month calendar | High-level rota coverage |
| Staff view | One person's shifts and attendance |
| Role view | Waiter/kitchen/bar/reception coverage by day |

### 4.3 Working plan shift click-to-login / clock-in

The request says staff should be able to "login on the spot" by clicking their shift. For security and clarity, the recommended interpretation is:

- If the staff member is already authenticated or using an authorized attendance kiosk, clicking the shift opens **Clock in for this profile**.
- If not authenticated, the shift action opens a login/identity step first, then returns to the selected shift.
- The shift should not silently clock in a person without identity confirmation and attendance proof.

Recommended flow:

1. Staff opens Working plan on shared staff tablet.
2. Staff clicks their shift.
3. Shift drawer opens.
4. If not authenticated as that staff member, the drawer asks for profile confirmation or login.
5. After confirmation, the clock-in proof flow appears.
6. Clock-in completes and the working plan immediately marks the shift as **Clocked in**.

### 4.4 Kitchen and beverages: steady production board

Target behavior:

- The kitchen/beverage board should be a production board, not just an order list.
- It should be readable from a distance and stable enough that cards do not jump around constantly.
- Tickets should be grouped by production state:
  - New
  - In prep
  - Ready
  - Handoff / delivered
- Station filtering should be prominent:
  - All
  - Kitchen
  - Beverages / Bar
  - configured stations, such as Grill, Cold, Fryer, Drinks
- Each ticket should display only essential information in collapsed form:
  - table
  - order number
  - elapsed time
  - urgent marker
  - item count by station
  - next action
- Details expand when the station needs to work the ticket.

Recommended kitchen card hierarchy:

1. Top line: Table, ticket number, age, status.
2. Production line: station or route.
3. Item list: large quantity + item name; modifiers below; notes highlighted.
4. Action row: Start, Ready, Deliver, Flag issue.
5. Footer: source, waiter note, last update.

Important behavior:

- The board should avoid layout thrashing. New tickets can appear in a "New" lane, but existing cards should not reorder aggressively unless the user chooses sort by priority.
- Ready tickets should be visually loud but not cover the rest of the board.
- Old unresolved tickets should move into backlog with a clear count.
- Beverage-only orders should not force the kitchen to scan irrelevant food tickets, and vice versa.

### 4.5 Orders: table-based operational overview

Target behavior:

- `/staff/orders` should default to a **table overview board**.
- Each table row/card should summarize all open activity for that table.
- Expanding a table shows the detailed tickets.
- A single order should not consume two-thirds of the page unless the user intentionally opens its detail view.

Recommended table overview card:

| Element | Purpose |
|---|---|
| Table name | Primary identity: T02, Patio 4, Counter |
| State | Open, New items, In prep, Ready, Unpaid, Paid |
| Active tickets | Count of active order sessions/tickets |
| Total due | Total unpaid amount |
| Oldest wait | Operational urgency |
| Next action | Open POS, Send to kitchen, Mark served, Collect payment |
| Expand | Shows ticket details only when needed |

Recommended default layout:

- Left/top: summary counters and filters.
- Main board: compact table cards grouped by service state.
- Right drawer: selected table/ticket details.
- Detail view should be progressive: table summary -> tickets -> item lines -> item actions.

## 5. Workflow simulations and use cases

These simulations should become QA scenarios and implementation acceptance tests.

### Use case 1: Staff clocks in from profile selector

Actor: Waiter using shared tablet  
Precondition: Waiter has a scheduled shift today and a complete profile.

Steps:

1. Waiter opens My shift.
2. Waiter selects their profile card.
3. Page shows today's eligible shift.
4. Waiter taps **Clock in for this shift**.
5. Photo/QR proof is completed.

Expected result:

- Work session starts for the selected user and selected shift.
- Profile card changes to Active.
- Working plan marks the shift as Clocked in.

### Use case 2: Staff tries to clock in too early

Actor: Kitchen staff  
Precondition: Shift starts at 18:00; staff attempts at 15:30.

Steps:

1. Staff selects profile.
2. Shift appears as Upcoming.
3. Staff taps the disabled or explanatory clock-in area.

Expected result:

- UI explains when clock-in opens.
- No work session is created.
- Manager can still manually adjust if permission allows.

### Use case 3: Manager clicks a shift and clocks staff in on the spot

Actor: Manager at host station  
Precondition: Staff member is present and shift is within the allowed window.

Steps:

1. Manager opens Working plan.
2. Manager clicks the staff member's shift.
3. Shift drawer opens.
4. Manager selects **Clock in now**.
5. Staff confirms identity / proof.

Expected result:

- Staff member is clocked into that shift.
- Shift card updates without full page confusion.
- Attendance history records the correct shift id and user id.

### Use case 4: Add a shift directly from the calendar

Actor: Owner  
Precondition: Week calendar is open.

Steps:

1. Owner clicks an empty cell on Friday.
2. Add shift drawer opens with Friday prefilled.
3. Owner selects staff, role, start/end, and label.
4. Owner saves.

Expected result:

- New shift appears in the Friday cell.
- Coverage counters update.
- If the role target is now met, understaffed warning clears.

### Use case 5: Drag or quick-create repeated shifts

Actor: Manager  
Precondition: Same waiter works lunch Monday to Friday.

Steps:

1. Manager creates Monday waiter lunch shift.
2. Manager uses duplicate/copy pattern.
3. Manager applies to Tue-Fri.

Expected result:

- Five shifts are created or updated.
- Conflicts are flagged before saving.
- The calendar remains readable and does not require opening five modals manually.

### Use case 6: Kitchen receives new food and beverage order

Actor: Kitchen screen  
Precondition: Customer orders ramen and cola from T04.

Steps:

1. Order arrives via WebSocket.
2. Kitchen route shows food item in New lane.
3. Beverage route shows cola in Drinks/New lane.
4. Overall order remains linked to T04.

Expected result:

- Kitchen does not need to process the cola.
- Beverage staff do not need to scan food items.
- Waiter can still see one table-level order context.

### Use case 7: Kitchen marks food ready and waiter serves it

Actor: Cook and waiter  
Precondition: Food ticket is in prep.

Steps:

1. Cook marks item/ticket Ready.
2. Ready lane highlights the table.
3. Waiter sees T04 ready status in Orders/POS.
4. Waiter marks item delivered after serving.

Expected result:

- Kitchen board clears delivered item.
- Table overview reflects remaining unpaid amount.
- Order history preserves the status timeline.

### Use case 8: Bar handles beverage-only ticket during rush

Actor: Bartender  
Precondition: Multiple tables order drinks.

Steps:

1. Bartender opens Beverages route.
2. Board shows only drinks grouped by New/In prep/Ready.
3. Bartender starts the oldest drink ticket.
4. Bartender marks it ready.

Expected result:

- Board remains stable and readable.
- Ready drinks are obvious.
- Food kitchen is not cluttered by drink tickets.

### Use case 9: Orders broad overview by table

Actor: Waiter  
Precondition: T02 has three active tickets and one unpaid completed ticket.

Steps:

1. Waiter opens Orders.
2. T02 appears as one compact table card/row.
3. Card shows active count, ready count, total due, and next action.
4. Waiter expands T02 only when detail is needed.

Expected result:

- One table no longer consumes most of the page.
- Waiter can scan all tables quickly.
- Detailed ticket actions are still available on demand.

### Use case 10: Manager finds unpaid completed tables

Actor: Manager  
Precondition: Several tables have completed but unpaid orders.

Steps:

1. Manager opens Orders.
2. Manager selects Unpaid / payment due filter.
3. Table cards show unpaid totals and age.
4. Manager opens the selected table in POS to collect cash/card/HitPay.

Expected result:

- Payment risk is visible at table level.
- Manager does not need to inspect every order card.
- POS opens directly to the selected table payment dock.

### Use case 11: Shift coverage warning during planning

Actor: Owner  
Precondition: Saturday dinner requires three waiters but only one is scheduled.

Steps:

1. Owner opens week calendar.
2. Saturday dinner cell shows coverage warning.
3. Owner opens role coverage panel.
4. Owner adds two waiter shifts.

Expected result:

- Warning clears after staffing target is met.
- Calendar shows who covers the role.
- No duplicate/conflicting shifts are introduced.

### Use case 12: Late staff and live service awareness

Actor: Manager  
Precondition: Kitchen staff shift started 15 minutes ago but no clock-in happened.

Steps:

1. Manager opens Today board in Working plan.
2. Late shift is highlighted.
3. Manager clicks shift.
4. Manager can call staff, clock in on arrival, or mark absence.

Expected result:

- Attendance gaps are surfaced before service is affected.
- Actions happen from the same shift context.

## 6. Acceptance criteria

### My shift

- Staff profile selector exists for authorized shared-device contexts.
- Selecting a profile filters shifts and attendance state to that profile.
- Clock-in requires an eligible shift unless manager override is explicitly used.
- Error states explain exactly why clock-in is unavailable.

### Working plan

- Empty calendar cells support add-shift actions.
- Shift cards open a detail drawer/popover.
- Shift detail includes edit, delete, duplicate/copy, and clock-in actions where permitted.
- Calendar warns about coverage gaps, overlaps, profile/payroll gaps, and rest issues.
- Today board distinguishes scheduled, active, late, on break, completed, and absent states.

### Kitchen and beverages

- Food and beverage work can be viewed separately and together.
- Tickets are grouped by production state.
- Ticket cards show table, age, station, essential items, and next action.
- Ready tickets are obvious without overwhelming the board.
- Old/backlog tickets are isolated but discoverable.

### Orders

- Default active view is table-based.
- A table summary consumes a compact amount of space.
- Table detail opens in drawer/expand mode.
- Staff can jump from table overview to POS/payment.
- Unpaid and ready states are visible without inspecting every order line.

## 7. Key learning points

- The POS and orders workflow should share the same mental model: **table first, tickets second, item lines third**.
- Attendance must support the real restaurant pattern of a shared staff tablet.
- Working plan is not just admin data entry; it should become the operational bridge into attendance.
- Kitchen displays need stability as much as information. Constant reordering can make a board feel messy even if all data is correct.
- Card density matters. Large cards are good for focused preparation; compact table cards are better for management overview.
- Every page should answer: "What needs attention right now?"

## 8. Recommended implementation order

1. Orders table-overview redesign.
2. Kitchen/beverage production board cleanup.
3. My shift profile selector and shared attendance mode.
4. Working plan shift drawer with click-to-clock-in.
5. Calendar add/duplicate/coverage enhancements.

This order improves live restaurant operations quickly while keeping attendance and planning changes grounded in the actual table/order workflow.

