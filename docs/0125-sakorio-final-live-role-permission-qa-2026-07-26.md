# Sakorio final live role-permission QA

Date: 2026-07-26  
Surface tested: `https://staff.sakorio.com`  
Live frontend build observed: `2.1.6 b57fb5ce`  
QA mode: Live browser only

## Purpose

This pass verifies the post-fix launch role scope after the navigation and route-guard cleanup. The goal is to confirm that floor/service roles do not see or enter back-office areas, while manager-level users retain launch operations access.

## Fix verified

Code fix deployed before this pass:

- `b57fb5ce fix: tighten launch role navigation scope`

The fix tightened:

- Staff sidebar visibility for Products, Catalog, Timetable, Contracts, Kitchen, Settings, Users, and Reports.
- Route guards for Products, Catalog, Working Plan/Timetable, Contracts, and Kitchen.
- Dashboard shortcut visibility for the same role-scoped areas.

## Live accounts checked

The QA role accounts were reset through the live Users UI before this pass. The password is intentionally not stored in this document.

| Role | Login result | Expected launch scope |
| --- | --- | --- |
| Waiter | Passed | Service-floor access only |
| Host / Receptionist | Passed | Front-of-house access only |
| Kitchen Staff | Passed | Kitchen/order processing access only |
| Manager | Passed | Manager operations/back-office access |

## Browser QA results

### Waiter

Observed navigation:

- Home
- My shift
- POS
- Orders
- Reservations
- Queue
- Tables
- Customers (Invoice)
- Language selector
- Waiter profile
- Logout

Confirmed hidden from navigation:

- Kitchen & beverages
- Products
- Catalog
- Reports
- Timetable
- Users
- Contracts
- Settings

Denied-route behavior:

- Direct access attempts to `/settings`, `/users`, `/reports`, `/products`, `/catalog`, `/working-plan`, `/contracts`, and `/kitchen` did not expose the target screen.
- The app returned/stayed on a safe allowed floor page instead of showing restricted content.

Score: 10/10 for launch role isolation.

### Host / Receptionist

Observed navigation:

- Home
- My shift
- POS
- Orders
- Reservations
- Queue
- Tables
- Customers (Invoice)
- Language selector
- Receptionist profile
- Logout

Confirmed hidden from navigation:

- Kitchen & beverages
- Products
- Catalog
- Reports
- Timetable
- Users
- Contracts
- Settings

Denied-route behavior:

- Direct access attempts to `/settings`, `/users`, `/reports`, `/products`, `/catalog`, `/working-plan`, `/contracts`, and `/kitchen` did not expose the target screen.
- The app returned/stayed on a safe allowed front-of-house page instead of showing restricted content.

Score: 10/10 for launch role isolation.

### Kitchen Staff

Observed navigation:

- Home
- My shift
- Orders
- Kitchen & beverages
- Language selector
- Kitchen Staff profile
- Logout

Confirmed hidden from navigation:

- POS
- Reservations
- Queue
- Tables
- Customers (Invoice)
- Products
- Catalog
- Reports
- Timetable
- Users
- Contracts
- Settings

Denied-route behavior:

- Direct access attempts to `/pos`, `/tables`, `/settings`, `/users`, `/reports`, `/products`, `/catalog`, `/working-plan`, and `/contracts` did not expose the target screen.
- The app returned/stayed on the safe kitchen workspace instead of showing restricted content.

Score: 10/10 for launch role isolation.

### Manager

Observed navigation:

- Home
- My shift
- POS
- Orders
- Reservations
- Queue
- Tables
- Kitchen & beverages
- Customers (Invoice)
- Products
- Catalog
- Reports
- Timetable
- Users
- Contracts
- Settings
- Language selector
- Manager profile
- Logout

Allowed-route behavior:

- Manager-level back-office and service operations links were visible.
- Manager retained access to the operational pages expected for launch management.

Score: 10/10 for launch role breadth.

## Notes on result interpretation

The automated browser route probe originally treated `/dashboard` as the only acceptable redirect for denied routes. Live behavior is safer but slightly different: some blocked routes return the user to the last safe allowed workspace, such as Queue for floor users or Kitchen for kitchen users.

This is acceptable for launch because:

- Restricted screen content is not exposed.
- Restricted navigation entries are not shown.
- Users remain inside their permitted operating area.

## Remaining launch checks outside this role pass

These are operational, not role-scope blockers:

1. Complete physical iPad/tablet camera QA for staff clock-in/clock-out.
2. Decide whether to reset or keep occupied QA tables created during live testing.
3. Run one final owner-led restaurant rehearsal with real devices, printed table QR codes, and real staff roles.

## Final assessment

Role permission launch scope is now ready. The previous issue where Waiter, Host, and Kitchen roles could see excess back-office modules is fixed and verified live in the browser.
