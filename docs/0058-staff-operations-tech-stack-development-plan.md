# Staff operations technical development plan

Date: 2026-07-17  
Companion brief: `docs/0057-staff-operations-workflow-brief.md`  
Scope: My shift, Working plan, Kitchen & beverages, Orders

## 1. Technical objective

Refactor staff operations into a coherent table-first and shift-first workflow while preserving the current Angular/FastAPI/PostgreSQL stack.

The implementation should avoid creating unrelated new systems. It should extend the existing modules:

- `front/src/app/my-shift/my-shift.component.ts`
- `front/src/app/working-plan/working-plan.component.ts`
- `front/src/app/kitchen-display/kitchen-display.component.ts`
- `front/src/app/orders/orders.component.ts`
- `front/src/app/services/api.service.ts`
- `back/app/main.py`
- `back/app/models.py`

## 2. Current stack

| Layer | Current technology | Notes |
|---|---|---|
| Frontend | Angular 20 standalone components | Signals, computed state, template-driven forms in these modules |
| UI routing | Angular router guards | `authGuard`, `orderAccessGuard`, `scheduleGuard`, `uiModuleGuard` |
| Backend | FastAPI | REST endpoints in `back/app/main.py` |
| ORM | SQLModel / SQLAlchemy | Models in `back/app/models.py` |
| Database | PostgreSQL | Migrations in `back/migrations/` and idempotent sync routines |
| Realtime | WebSocket order updates | Used by kitchen/orders |
| Tests | Angular specs, backend pytest, Puppeteer smoke scripts | Browser-only live QA required for UI/UX sign-off |
| Deployment | Render/staging/prod + Docker dev | Work lands on `development` branch first |

## 3. Architecture direction

### 3.1 Shared operational concepts

Create a consistent domain model in the frontend for table/service state:

```ts
type TableServiceState =
  | 'idle'
  | 'new_items'
  | 'in_prep'
  | 'ready'
  | 'served_unpaid'
  | 'paid'
  | 'needs_attention';
```

This derived state can be computed from existing orders/items without a backend migration at first.

Recommended shared utility:

- `front/src/app/shared/table-service-state.ts`

Responsibilities:

- derive a table-level state from orders
- count active tickets
- count ready items
- sum unpaid amount
- find oldest active ticket time
- provide "next action" labels

Use this in:

- Orders table overview
- POS table board
- Dashboard queue/table pulse

### 3.2 Staff identity and attendance context

The current My shift page is tied to the logged-in user profile. The requested profile selection requires a shared-device attendance context.

Recommended frontend state:

```ts
interface AttendanceProfileOption {
  userId: number;
  fullName: string;
  role: string;
  jobTitle: string | null;
  nextShift: Shift | null;
  currentSession: WorkSession | null;
  readiness: 'ready' | 'upcoming' | 'active' | 'completed' | 'missing_profile' | 'no_shift';
}
```

Recommended API additions:

- `GET /attendance/profiles/today`
  - returns staff users visible to the current manager/kiosk account
  - includes today's shifts, open sessions, profile readiness
- `GET /attendance/profiles/{user_id}/summary`
  - returns selected profile's eligible shifts and attendance summary
- `POST /attendance/profiles/{user_id}/clock-in`
  - manager/kiosk mode clock-in for selected profile and selected shift
- `POST /attendance/profiles/{user_id}/clock-out`
  - manager/kiosk mode clock-out for selected profile

Security rule:

- A user may clock themselves in.
- Owner/admin may clock in eligible profiles if the tenant enables manager-assisted attendance.
- Shared kiosk mode, if added, must require an attendance PIN, QR, or other confirmation before creating work sessions.

### 3.3 Working plan as calendar engine

The current `working-plan.component.ts` already owns most scheduling logic. The next step is to split heavy responsibilities into focused helpers/components.

Recommended frontend structure:

```text
front/src/app/working-plan/
  working-plan.component.ts                 # Page shell and orchestration
  working-plan-calendar.component.ts         # Month/week grid
  working-plan-shift-drawer.component.ts     # Create/edit/detail/clock-in
  working-plan-coverage-panel.component.ts   # Role coverage warnings
  working-plan-today-board.component.ts      # Live attendance today
  working-plan-calendar.util.ts              # date/grid utilities
  working-plan-conflicts.util.ts             # overlaps/rest/coverage
```

If splitting files is too large for one batch, implement the UI inside the current component first, then extract after the behavior is stable.

Recommended API additions:

- `GET /schedule/coverage?from_date=&to_date=`
  - returns required vs scheduled role coverage per day/part
- `GET /schedule/today-board`
  - returns today's shifts joined with attendance sessions
- `POST /schedule/{id}/duplicate`
  - duplicate one shift to another date/time
- `POST /schedule/day-copy`
  - copy one day's pattern to another date
- `POST /schedule/conflicts`
  - validates draft shifts before save

The existing endpoints should remain supported:

- `GET /schedule`
- `POST /schedule`
- `PUT /schedule/{id}`
- `DELETE /schedule/{id}`
- `POST /schedule/copy-week`
- planned-vs-actual endpoints

### 3.4 Kitchen and beverages production board

The existing `kitchen-display.component.ts` has important features already: lanes, station filtering, timers, fullscreen, sound, backlog, status controls.

The improvement should focus on visual hierarchy and workflow state rather than replacing the module.

Recommended frontend extraction:

```text
front/src/app/kitchen-display/
  kitchen-display.component.ts       # Page shell
  production-board.component.ts       # Lanes and stable layout
  production-ticket.component.ts      # Ticket card
  production-ticket.util.ts           # routing/sorting/state
```

Recommended derived model:

```ts
interface ProductionTicket {
  orderId: number;
  tableName: string;
  route: 'kitchen' | 'bar' | 'all';
  stationId: number | null;
  state: 'new' | 'in_prep' | 'ready' | 'handoff';
  ageMinutes: number;
  urgent: boolean;
  items: ProductionTicketItem[];
}
```

Recommended UI changes:

- Route switcher: All / Kitchen / Beverages.
- Station filter stays visible and compact.
- Tickets keep stable order by:
  1. urgency
  2. lane
  3. oldest first
  4. stable order id fallback
- Ticket details can collapse long item lists.
- Ready lane should be visually distinct but not oversized.

Recommended backend support:

- Existing order payload may be enough for phase 1.
- For performance and clarity, add optional endpoint later:
  - `GET /production/tickets?route=&station=&include_backlog=`

This endpoint can return production-ready ticket DTOs and reduce frontend transformation complexity.

### 3.5 Orders table overview

The current orders page already defines `OrderTableGroup`. That is the correct foundation. The redesign should make that grouping the primary view.

Recommended frontend structure:

```text
front/src/app/orders/
  orders.component.ts                 # Page shell and actions
  table-order-board.component.ts       # Compact table overview
  table-order-detail-drawer.component.ts
  order-line-actions.component.ts
  order-table-group.util.ts
```

Recommended table summary DTO:

```ts
interface TableOrderSummary {
  tableId: number | null;
  tableName: string;
  state: TableServiceState;
  activeTickets: number;
  readyTickets: number;
  unpaidTickets: number;
  totalDueCents: number;
  oldestCreatedAt: string | null;
  latestUpdatedAt: string | null;
  nextAction: 'open_pos' | 'start_prep' | 'serve_ready' | 'collect_payment' | 'review';
  orders: Order[];
}
```

Phase 1 can compute this entirely in Angular from `getOrders()`.

Phase 2 can add:

- `GET /orders/table-overview`
  - faster, smaller table summaries for busy restaurants
  - supports pagination/filtering by state
  - returns detail links for drill-down

## 4. Data model changes

### 4.1 Attendance

Potential new fields:

| Table | Field | Purpose |
|---|---|---|
| `work_session` | `clocked_for_user_id` or existing `user_id` enforcement | Ensure manager-assisted sessions still belong to the selected staff member |
| `work_session` | `created_by_user_id` | Audit who performed manager/kiosk-assisted clock-in |
| `work_session` | `source` | `self`, `manager`, `kiosk` |
| `staff_profile` or user-related table | `attendance_pin_hash` optional | Shared kiosk identity check, if chosen |

If existing `WorkSession.user_id` already represents the staff member, only add audit/source fields.

### 4.2 Schedule

Potential additions:

| Table | Field | Purpose |
|---|---|---|
| `shift` | `role_key` | Stable role/coverage grouping independent of user role label |
| `shift` | `location_label` | Optional station/location like Kitchen, Bar, Patio |
| `shift` | `source_template_id` | Future shift templates/copy tracking |
| `shift` | `published_at` | Distinguish draft rota from published rota |
| `shift` | `created_by_user_id` | Audit |
| `shift` | `updated_by_user_id` | Audit |

Avoid adding all fields at once. Start with fields required for immediate workflow.

### 4.3 Orders/production

Potential additions:

| Table | Field | Purpose |
|---|---|---|
| `order_item` | `station_status_updated_at` | Stable production timing |
| `order_item` | `ready_at` | Ready handoff metrics |
| `order_item` | `delivered_at` | Service metrics |
| `order` | `last_staff_action_at` | Sorting and overview freshness |

Some status timestamps may already exist in another form. Verify before migration.

## 5. Implementation phases

### Phase 1: Orders table overview

Goal: Make `/staff/orders` scan-friendly.

Tasks:

1. Keep existing active/not paid/history tabs.
2. Replace active order broad view with compact table cards/rows.
3. Add selected table drawer for detailed tickets.
4. Keep existing item actions inside detail drawer.
5. Add quick actions:
   - Open table POS
   - Mark ready/delivered where permitted
   - Collect payment
6. Add responsive behavior:
   - desktop: board + right drawer
   - tablet/mobile: board then full-width detail

Acceptance:

- 10 tables fit on screen far better than current large order cards.
- One table no longer consumes most of the page.
- Existing actions remain reachable.

### Phase 2: Kitchen/beverage production board

Goal: Make production clear under pressure.

Tasks:

1. Add route switcher: All / Kitchen / Beverages.
2. Improve lane card density and hierarchy.
3. Add stable sorting utility.
4. Collapse long ticket details.
5. Strengthen backlog and ready handoff visuals.
6. Verify station filters still work.

Acceptance:

- Kitchen can focus on food.
- Bar can focus on beverages.
- Board stays readable with many tickets.
- No important order action is hidden.

### Phase 3: My shift profile selector

Goal: Shared-device staff clock-in.

Tasks:

1. Add attendance profile selector.
2. Add profile readiness state.
3. Filter shifts/history by selected profile.
4. Add manager-assisted or kiosk-assisted clock-in path.
5. Preserve current self-service mode.
6. Add permission gates and audit information.

Acceptance:

- Staff can select their profile and clock into the correct shift.
- Staff cannot clock into another profile unless permission/kiosk confirmation allows it.
- Errors are human-readable.

### Phase 4: Working plan shift drawer and click-to-clock-in

Goal: Working plan becomes operational, not just administrative.

Tasks:

1. Shift click opens detail drawer.
2. Empty calendar cell opens create drawer prefilled with date.
3. Shift drawer shows attendance state.
4. Eligible shift can clock in immediately.
5. Add duplicate/copy actions from drawer.
6. Add coverage warnings.

Acceptance:

- Manager can create/edit/copy shifts quickly.
- Staff can clock in from a shift context where authorized.
- Coverage gaps are visible before service.

### Phase 5: Full calendar polish

Goal: Calendar behaves like a serious rota tool.

Tasks:

1. Add today board.
2. Add role/staff filters.
3. Add drag-to-create if feasible with current dependency policy.
4. Add conflict validation before save.
5. Add publish/draft concept if restaurant needs rota confirmation.

Acceptance:

- Working plan feels like a real calendar.
- Common rota tasks are one or two clicks.
- Mistakes are prevented before saving.

## 6. Testing strategy

### 6.1 Unit/component tests

Add or update specs for:

- `table-service-state` utility
- orders table grouping and next-action logic
- kitchen production ticket routing/sorting
- working plan conflict/coverage utility
- attendance profile readiness logic

### 6.2 Backend tests

Add pytest coverage for:

- attendance profile list permission filtering
- manager-assisted clock-in audit fields
- schedule conflict validation
- schedule coverage summaries
- optional production ticket endpoint, if implemented

### 6.3 Browser smoke tests

Add Puppeteer scripts:

- `front/scripts/test-orders-table-overview.mjs`
- `front/scripts/test-kitchen-production-board.mjs`
- `front/scripts/test-my-shift-profile-clock-in.mjs`
- `front/scripts/test-working-plan-calendar-actions.mjs`

Use live browser-only QA for final UI/UX sign-off on:

- `https://staff.sakorio.com/staff/orders`
- `https://staff.sakorio.com/kitchen`
- `https://staff.sakorio.com/my-shift`
- `https://staff.sakorio.com/working-plan`

Do not claim UI/UX completion until the browser view confirms the deployed build.

## 7. API proposal

### Attendance

```http
GET /attendance/profiles/today
GET /attendance/profiles/{user_id}/summary
POST /attendance/profiles/{user_id}/clock-in
POST /attendance/profiles/{user_id}/clock-out
```

Clock-in payload:

```json
{
  "shift_id": 123,
  "proof_type": "photo",
  "photo_data_url": "data:image/jpeg;base64,...",
  "source": "manager"
}
```

### Schedule

```http
GET /schedule/today-board
GET /schedule/coverage?from_date=2026-07-13&to_date=2026-07-19
POST /schedule/conflicts
POST /schedule/{id}/duplicate
POST /schedule/day-copy
```

Conflict validation payload:

```json
{
  "drafts": [
    {
      "user_id": 7,
      "shift_date": "2026-07-17",
      "start_time": "18:00",
      "end_time": "23:00",
      "role_key": "waiter"
    }
  ]
}
```

### Orders

Optional phase 2 endpoint:

```http
GET /orders/table-overview?mode=active
```

Response shape:

```json
{
  "tables": [
    {
      "table_id": 2,
      "table_name": "T02",
      "state": "ready",
      "active_tickets": 3,
      "unpaid_tickets": 1,
      "total_due_cents": 3600,
      "oldest_created_at": "2026-07-17T10:00:00Z",
      "next_action": "serve_ready"
    }
  ]
}
```

### Production

Optional phase 2 endpoint:

```http
GET /production/tickets?route=kitchen&station=all&include_backlog=false
```

## 8. UI design notes

### Orders

- Compact cards should be the default.
- Use a drawer for detail instead of rendering all order lines immediately.
- One table group should not exceed a predictable compact height unless expanded.
- Use strong color/status labels but avoid visually noisy gradients.

### Kitchen/beverages

- Use large text for table/order/age.
- Use compact, high-contrast item rows.
- Avoid reordering cards while a user is interacting with status controls.
- Add a "freeze sorting while touching" interaction if needed for tablets.

### Working plan

- Calendar cells should have an obvious plus affordance.
- Shift drawer should show both planning data and attendance actions.
- Coverage warnings should be clear, not punitive.
- Bulk actions should show preview before save.

### My shift

- Profile cards must be quick to recognize.
- Use role colors or initials.
- Show only the next relevant action for each profile.
- Keep proof capture focused after a profile is selected.

## 9. Rollout and risk management

### Low-risk first

- Orders table overview can be computed from existing order data.
- Kitchen visual cleanup can mostly reuse existing data.

### Medium risk

- Attendance profile selection changes identity and permissions. Add audit fields and conservative permission checks.
- Working plan click-to-clock-in must not bypass authentication/proof.

### Higher risk / optional

- Drag-and-drop calendar creation may require additional UI dependencies or custom implementation. Prefer click-to-add first.
- Kiosk mode should be designed carefully to avoid unauthorized clock-in.

## 10. Developer checklist

Before implementation:

- Confirm whether shared attendance requires PIN, login, QR, manager approval, or photo-only proof.
- Confirm whether Working plan "login on the spot" means login, clock-in, or both.
- Confirm whether kitchen and beverage should be separate routes, one combined route with switcher, or both.
- Confirm preferred Orders default route: `/staff/orders` table board with detail drawer.

During implementation:

- Keep existing APIs backward-compatible.
- Add utilities before duplicating state logic across components.
- Preserve current permissions.
- Avoid huge all-in-one component growth where practical.
- Use small commits per area.

After implementation:

- Run Angular compiler checks.
- Run relevant backend tests if API/model changes are made.
- Run relevant smoke scripts.
- Complete browser-only QA on deployed staff domain.
- Document screenshots or observations in the final handoff.

