# Cashier POS Module Plan

Last reviewed: 2026-06-29

Repository: `tanjunnan0101/pos`

## 1. Purpose

This document defines how to add a dedicated cashier POS module to the current POS2 codebase without replacing the existing architecture.

The goal is not to invent a second product. The goal is to build a faster front-counter workflow on top of the current Angular + FastAPI + SQLModel stack, reusing:

- table activation and table operational state
- staff order management
- item-level status updates
- cash and terminal settlement
- HitPay hosted checkout
- kitchen/bar handoff
- tenant permissions and UI module guards

The cashier POS module should become the staff-facing operational surface for:

- walk-in order creation
- table-linked order entry
- counter pickup / takeaway entry
- fast payment collection
- order release into kitchen/bar
- fast reopen / recovery of active tickets

## 2. Current State

The repo already contains strong operational primitives, but they are spread across separate modules:

- `/tables`
  - activate tables
  - open public menu with staff bypass token
  - assign waiter
  - inspect floor and table state
- `/staff/orders`
  - edit live orders
  - update item status
  - mark paid
  - finish order
  - unmark paid
  - remove items
  - invoice / fiscal invoice actions
- `/kitchen` and `/bar`
  - station workflow and item preparation state
- public `/menu/:token`
  - customer-facing table order flow
  - HitPay checkout

What is missing is a single cashier-first surface that combines these into one tight operator flow.

## 3. Problem Statement

The current product is functionally broad but operationally fragmented for cashiers.

Pain points:

- The cashier has to mentally switch between tables, orders, and public-menu concepts.
- Table operations and order operations are not presented as one continuous lane.
- Walk-in / counter order entry is not treated as a first-class route.
- Payment collection is implemented, but not wrapped in a dedicated cashier shell.
- Kitchen handoff exists, but not as a tightly coupled “build → pay → release” cashier action model.
- The current modules are good admin/staff screens, but not yet a fast retail-grade POS terminal.

## 4. Product Goal

Build a dedicated cashier POS module that feels like a real restaurant terminal:

- left side: table / ticket / service context
- center: menu and item selection
- right side: active cart / totals / payment / send-to-kitchen

The module must support both:

- table service
- counter / takeaway service

It must reuse the current backend and coexist with the existing screens.

## 5. Non-Goals

This phase should not:

- replace existing `/staff/orders`, `/tables`, or `/kitchen`
- rewrite backend order models
- introduce a new payment provider abstraction
- bypass tenant / role security
- break public QR ordering

The cashier POS should be additive and incremental.

## 6. Existing Backend Capabilities To Reuse

The backend already exposes the core endpoints needed for a cashier POS.

### Tables

- `GET /tables`
- `GET /tables/with-status`
- `POST /tables/{table_id}/activate`
- `POST /tables/{table_id}/close`
- `POST /tables/{table_id}/regenerate-pin`
- `PUT /tables/{table_id}/assign-waiter`
- `GET /tables/{table_id}/staff-menu-token`

### Public menu / order creation

- `GET /menu/{table_token}`
- `GET /menu/{table_token}/order`
- `GET /menu/{table_token}/order-history`
- `POST /menu/{table_token}/order`
- `POST /menu/{table_token}/order/{order_id}/request-payment`
- `POST /menu/{table_token}/call-waiter`

### Staff order management

- `GET /orders`
- `PUT /orders/{order_id}/status`
- `PUT /orders/{order_id}/mark-paid`
- `PUT /orders/{order_id}/finish`
- `PUT /orders/{order_id}/unmark-paid`
- `DELETE /orders/{order_id}`
- `PUT /orders/{order_id}/items/{item_id}/status`
- `PUT /orders/{order_id}/items/{item_id}/reset-status`
- `PUT /orders/{order_id}/items/{item_id}/cancel`
- `PUT /orders/{order_id}/items/{item_id}`
- `DELETE /orders/{order_id}/items/{item_id}`

### Payments

- `POST /orders/{order_id}/create-hitpay-payment-request`
- `POST /orders/{order_id}/confirm-hitpay-payment`
- `POST /payments/hitpay/webhook`

## 7. Existing Frontend Services To Reuse

`front/src/app/services/api.service.ts` already contains:

- `getTables()`
- `getTablesWithStatus()`
- `activateTable()`
- `closeTable()`
- `getStaffMenuToken()`
- `getOrders()`
- `updateOrderStatus()`
- `markOrderPaid()`
- `finishOrder()`
- `unmarkOrderPaid()`
- `updateOrderItemStatus()`
- `updateOrderItemStaff()`
- `removeOrderItemStaff()`
- `getMenu()`
- `submitOrder()`
- `getCurrentOrder()`
- `createHitPayPaymentRequest()`
- `confirmHitPayPayment()`

This is enough to ship a first cashier module without a major backend expansion.

## 8. Proposed Frontend Module Structure

Add a new route cluster:

- `/pos`
- optional future variants:
  - `/pos/table/:tableId`
  - `/pos/counter`
  - `/pos/order/:orderId`

Recommended implementation:

- new feature folder: `front/src/app/cashier-pos/`
- new route entry in `app.routes.ts`
- guarded with `authGuard`
- permission access aligned with current order/table access roles

### Proposed components

- `cashier-pos.component.ts`
  - main shell
- `cashier-pos-table-dock.component.ts`
  - table context and quick switching
- `cashier-pos-menu-lane.component.ts`
  - categories, products, modifiers
- `cashier-pos-cart-lane.component.ts`
  - active ticket, line edits, totals
- `cashier-pos-payment-drawer.component.ts`
  - cash / terminal / HitPay
- `cashier-pos-active-orders-rail.component.ts`
  - reopen and recover live orders

These can initially live in one screen component, then be split if the module stabilizes.

## 9. Information Architecture

### Primary cashier workflow

1. Choose service context
   - table
   - counter
   - takeaway

2. Build ticket
   - select category
   - add items
   - apply modifiers / notes
   - adjust quantities

3. Review cart
   - customer name optional
   - service type
   - linked table
   - subtotal / tax / total

4. Choose settlement path
   - pay now
   - send unpaid
   - send and finish
   - HitPay checkout

5. Release into kitchen / bar
   - rely on current order and item state logic

6. Recover live ticket if needed
   - reopen from active orders

### Secondary flows

- transfer from table board into POS
- open an active table’s order
- close or clear a table after settlement
- reopen a paid or partially processed order for staff recovery

## 10. UI Layout Spec

### Desktop / tablet layout

Three-column operational layout:

- left rail
  - outlet context
  - service mode selector
  - table quick picker
  - active ticket shortcuts
- center workspace
  - menu search
  - category tabs
  - product grid
  - modifier drawer
- right rail
  - cart
  - guest/table tags
  - totals
  - payment actions
  - kitchen release state

### Core screen blocks

#### A. Context strip

Top row:

- tenant / outlet name
- current station
- current cashier
- current service mode
- connectivity / realtime status

#### B. Table selector

Must show:

- all active tables
- occupied / available / reserved state
- active ticket count
- latest ticket summary

This should reuse `getTablesWithStatus()`.

#### C. Menu area

Must support:

- category switching
- product search
- quick item add
- modifier / question flow
- sold out / hidden state display

Reuse menu payload from `GET /menu/{table_token}` for table-linked flow.
For counter mode, a new staff menu payload may be needed later if public-menu assumptions become too table-specific.

#### D. Cart lane

Must show:

- item list
- quantity controls
- notes / modifiers
- remove action
- subtotal
- tax
- grand total
- order status chips

#### E. Payment lane

Must support:

- cash
- terminal
- HitPay
- mark paid
- finish order
- send without payment

The cashier should never need to jump to `/staff/orders` just to collect payment.

## 11. Required UX Rules

### Table-linked mode

- Selecting a table should surface the active order if one exists.
- If no active order exists, cashier can start a fresh one.
- “Open POS” from tables should deep-link into cashier POS with table context.

### Counter mode

- Counter orders should not require table activation.
- They should still create standard orders and use existing order endpoints.
- If backend requires `table_id`, define one of:
  - special counter pseudo-table per tenant
  - dedicated order source mode

This must be verified before implementation.

### Payment behavior

- Cash and terminal should use current staff endpoints:
  - `markOrderPaid()`
  - `finishOrder()`
- HitPay should:
  1. create payment request
  2. open hosted checkout
  3. on success return and confirm payment

### Kitchen handoff behavior

- Paid order should still continue through item prep if item statuses are not done.
- “Finish order” should remain the fast terminal action when service wants:
  - deliver active items
  - mark order paid
  - complete in one path

### Recovery behavior

- A cashier must be able to reopen:
  - action-needed tickets
  - unpaid tickets
  - table-linked tickets

without leaving the POS shell.

## 12. Proposed Route And Linking Changes

### Add new route

In `front/src/app/app.routes.ts` add:

- `/pos`

Guard recommendation:

- `authGuard`
- same functional access profile as orders + tables

### Linking updates

Add POS entry points from:

- dashboard
- staff toolbar
- tables list
- tables canvas
- maybe orders board

Deep-link query examples:

- `/pos?table=12`
- `/pos?order=154`
- `/pos?mode=counter`

## 13. Backend Gaps To Confirm

These are the only backend questions that still need validation before full implementation:

### A. Counter orders without table

Need to confirm whether current `Order` creation path can support cashier-created orders without a real table token.

If not, the safest pattern is:

- create a hidden “Counter” table per tenant
- use that table for walk-in / counter orders

This avoids backend schema churn in phase 1.

### B. Staff-side direct order creation

Current public order creation uses `POST /menu/{table_token}/order`.

For a true cashier flow, phase 2 should likely add a dedicated staff endpoint:

- `POST /orders`

Suggested payload:

- tenant context from auth
- table id optional
- customer name optional
- service mode
- items with modifiers
- initial payment intent optional

This is not required for phase 1 if we proxy through staff-access table tokens, but it is the cleaner long-term direction.

### C. Optional receipt / print queue

If cashier POS is expected to print automatically, current browser print is not enough.

Future enhancement:

- print-job queue on backend
- local print agent in restaurant network

Not required for cashier MVP shell, but relevant for market-ready rollout.

## 14. Recommended Delivery Phases

### Phase 1: Cashier shell over current APIs

Deliver:

- `/pos` route
- table selector
- menu picker
- cart lane
- cash / terminal settlement
- active ticket reopen

Reuse:

- `getTablesWithStatus()`
- `getOrders()`
- `markOrderPaid()`
- `finishOrder()`
- `updateOrderItemStaff()`
- existing menu payload

### Phase 2: Table-deep integration

Deliver:

- “Open POS” from tables
- recover active table order in POS
- clear / settle table actions
- active order dock by table

### Phase 3: HitPay in cashier POS

Deliver:

- create hosted checkout from POS
- confirm payment return
- show pending / paid / failed states clearly

### Phase 4: Staff direct order creation endpoint

Deliver:

- backend staff-side `POST /orders`
- cleaner counter mode
- less dependency on public-menu path assumptions

### Phase 5: Production polish

Deliver:

- ticket history rail
- void / refund hooks
- printer queue integration
- denser tablet layout
- keyboard / numpad workflow

## 15. Frontend Technical Notes

### State model

Recommended local state groups:

- `selectedTable`
- `selectedServiceMode`
- `activeMenu`
- `selectedCategory`
- `cartLines`
- `currentOrder`
- `paymentDrawerOpen`
- `activeOrders`

Angular signals are already used heavily in the repo and should remain the default pattern.

### Reuse existing primitives

- `SidebarComponent`
- `PermissionService`
- `StaffPosToolbarComponent`
- `ApiService`

### Keep module isolated

Do not mutate orders, tables, and kitchen screens just to approximate POS behavior.

Instead:

- build cashier orchestration in the new module
- only add small shared helpers where appropriate

## 16. QA Checklist For Cashier POS MVP

The module is not ready until these pass:

1. Cashier can open `/pos` and see outlet context.
2. Cashier can select an active table.
3. Cashier can reopen that table’s active order.
4. Cashier can add menu items quickly.
5. Cashier can update quantities and modifiers.
6. Cashier can mark paid with cash.
7. Cashier can mark paid with terminal.
8. Cashier can send order to kitchen without losing context.
9. Cashier can reopen a live ticket from the same screen.
10. Kitchen still sees the resulting order correctly.
11. Table state still reflects order / payment progression.
12. HitPay checkout can be launched from the POS shell.

## 17. Integration Safety Rules

To keep this implementation safe inside the current repo:

- do not break public QR menu
- do not remove existing `/staff/orders`
- do not duplicate backend payment logic
- do not bypass role guards
- do not fork menu pricing logic
- do not create a second order status model

The cashier POS is an orchestration layer, not a replacement backend.

## 18. Immediate Next Step

The recommended next implementation step is:

1. add `/pos` route
2. scaffold `cashier-pos.component.ts`
3. load `getTablesWithStatus()`, `getOrders()`, and tenant settings
4. render a basic cashier shell
5. wire table-to-order recovery first

That gives the repo a true cashier entry point while preserving the current architecture.
