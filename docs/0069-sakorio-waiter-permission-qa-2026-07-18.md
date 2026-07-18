# Sakorio Waiter Permission QA — 2026-07-18

Surface: browser-only QA on deployed Sakorio staff domain  
Staff domain: `https://staff.sakorio.com`  
Build after fix: `POS 2.1.6 09768dbb`

## Result

Waiter permission QA passed after fixing POS service-settings access.

The initial browser pass found that a Waiter could open POS, but the POS failed to load operational data because `/tenant/settings` required `settings:read`. That made the cashier screen show `Permission denied. Required: settings:read` and empty/incorrect POS data.

Fix shipped:

- Commit: `09768dbb Fix waiter POS service settings access`
- Added backend endpoint: `GET /tenant/service-settings`
- POS now uses the safe service settings endpoint instead of admin tenant settings.
- The endpoint returns only operational display values needed by staff service screens: tenant id/name, currency, default language, timezone, and resolved UI modules.
- Admin settings/secrets remain protected behind `settings:read`.

## Temporary QA account

A temporary Waiter was created through the browser for this test:

- Name: `QA Waiter Browser`
- Role: `Waiter`
- Email: `qa.waiter.20260718.1784347520498@sakario.sg`

Cleanup:

- The temporary QA waiter was deleted through Users after the test.
- Existing waiter `Jason Tan / rtjz318@gmail.com` was not modified.

## Final browser route matrix

| Route | Waiter result | Outcome |
|---|---|---|
| `/pos` | Loaded POS with 10 tables, 9 catalog items, SGD currency, no permission error | Pass |
| `/tables` | Loaded table board | Pass |
| `/staff/orders` | Loaded Orders with active/current order overview | Pass |
| `/queue` | Loaded host stand / queue | Pass |
| `/reservations` | Loaded reservations/service timeline | Pass |
| `/kitchen` | Loaded Kitchen & beverage display | Pass |
| `/users` | Redirected to dashboard | Pass |
| `/settings` | Redirected to dashboard | Pass |
| `/reports` | Redirected to dashboard | Pass |
| `/inventory` | Redirected to dashboard | Pass |
| `/products` | Loaded read-oriented products list | Pass / policy watch |
| `/catalog` | Loaded catalog | Pass / policy watch |
| `/working-plan` | Loaded timetable | Pass |
| `/contracts` | Loaded staff contracts page | Pass / policy watch |

## Notes

- The core launch requirement passed: waiter can access POS, Tables, Orders, Queue, Reservations, and Kitchen; waiter cannot access admin-only Users, Settings, Reports, or Inventory.
- Products, Catalog, and Contracts are currently visible to Waiter because the small-outlet operator role includes read permissions for product/catalog and own contract access. If Sakorio wants a stricter waiter UI, hide Products/Catalog/Contracts from Waiter in a future policy polish.
- POS no longer broadens waiter permission to `settings:read`; it uses a narrow operational endpoint instead.

