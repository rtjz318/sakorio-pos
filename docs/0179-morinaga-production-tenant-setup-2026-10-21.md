# Morinaga production tenant setup record

Date: 21 October 2026 (Asia/Singapore)

Status: **Production tenant staged; live ordering remains gated on restaurant-specific payment and identity inputs.**

## 1. Tenant identity

- Tenant ID: `3`
- Business name: `Morinaga Ramen Izakaya`
- Description: `Japanese ramen and izakaya restaurant`
- Demo flag: `false`
- Currency: `SGD`
- Timezone: `Asia/Singapore`
- Country: `SG`
- Default language: English
- Public menu: `https://order.sakorio.com/public-menu/3`
- Public reservation page: `https://order.sakorio.com/book/3`
- Public waitlist: `https://order.sakorio.com/waitlist/3`

The production owner account was created and its temporary credential was
delivered directly to the restaurant owner. Passwords are deliberately not
stored in Git, documentation, logs, or task files. Rotate the temporary
password before launch and add individual staff accounts instead of sharing the
owner login.

## 2. Operational template applied

The reviewed Ajisen demo configuration was used only as an operational
template. The clone command copied:

- 112 products across six categories;
- 90 tenant-owned product images;
- two tax definitions;
- one floor (`Main`);
- ten tables with fresh Morinaga-only QR tokens;
- reviewed reservation, currency, language and operating defaults.

It did **not** copy Ajisen customers, orders, reservations, queue entries,
staff accounts, payment secrets, SMTP secrets, branding identity, location
verification secrets or fiscal secrets.

Table layout:

- T01-T05: four seats each
- T06-T10: two seats each
- All tables start idle, with no active bill or assigned waiter.
- Fixed QR ordering starts closed and must be opened only when guests are
  seated.

## 3. Live-browser verification

The production domains were tested with the new Morinaga owner session.

| Area | Live result |
|---|---|
| Staff login | Pass - authenticated as Morinaga owner and landed on the Morinaga dashboard |
| Tenant identity | Pass - staff shell consistently displayed `Morinaga Ramen Izakaya` |
| POS | Pass - 10 tables loaded, 0 open bills, SGD 0.00 paid today, 112 catalog items |
| Tables | Pass - T01-T10 visible with correct seat counts; all idle and QR ordering closed |
| Products | Pass - copied menu names, categories and SGD prices visible |
| Public menu | Pass - category sections, prices and persisted product images rendered |
| Orders | Pass - clean tenant showed 0 tickets and no Ajisen order history |
| Reservations | Pass - Morinaga booking page and empty staff service-day view loaded |
| Queue | Pass - permanent guest waitlist and empty staff queue board loaded |
| Kitchen | Pass - isolated production board loaded with 0 active tickets |
| Payment settings | Pass with launch gate - SGD and tenant-specific HitPay fields shown; Sandbox selected and credentials blank |

No synthetic order, reservation, queue entry or payment was left behind. This
keeps the production tenant clean for restaurant configuration and physical
acceptance testing.

## 4. Tenant-isolation evidence

- The owner session returned only tenant 3 tables, products, orders,
  reservations and queue data.
- Ajisen remains tenant 1 and marked `is_demo=true`.
- Morinaga is tenant 3 and marked `is_demo=false`.
- Product images were copied to the tenant 3 directory on the persistent disk.
- Morinaga tables received newly generated tokens; Ajisen QR tokens were not
  reused.
- HitPay settings are stored per tenant and Morinaga has no inherited Ajisen
  API key or webhook salt.

## 5. Launch-check result

The corrected production check found:

- 112 products;
- 90 products with images;
- 10 tables and 10 table tokens;
- one owner account;
- zero structural failures;
- warning status only because HitPay is intentionally still in Sandbox and the
  Morinaga API key/webhook salt are not configured.

During verification, the onboarding CLI was found to use a relative `uploads`
path while the Render disk is mounted at
`/opt/render/project/src/uploads`. The resolver was corrected to honor
`UPLOADS_DIR`, use the Render persistent mount when present, and otherwise use
the repository's `back/uploads` directory. This prevents false missing-image
warnings and keeps future template clones on persistent storage.

## 6. Mandatory inputs before live orders

The following must come from Morinaga management and must not be guessed or
copied from the demo tenant:

- legal business name, UEN and GST registration details;
- official address, phone, email, website and map/review links;
- approved logo and public header artwork;
- confirmed opening hours and holiday exceptions;
- final physical table names, capacities and floor layout;
- Morinaga HitPay live API key and webhook salt;
- confirmation that the HitPay webhook is registered for
  `/api/payments/hitpay/webhook` and subscribes to
  `payment_request.completed`;
- restaurant SMTP credentials and sender identity if reservation email is
  required;
- staff roster, roles and individual accounts;
- kitchen routing/stations and printer assignment;
- tax/GST validation by the restaurant's accountant;
- Android tablet and ESC/POS printer physical acceptance test.

Do not change HitPay to Live until a successful Morinaga sandbox payment has
been verified end to end, including webhook completion, paid order state,
receipt output and table close.

## 7. Verification commands

```bash
# Safe dry run from the reviewed template
python -m app.onboarding.company_onboarding clone-tenant-template \
  --source-tenant-id 1 --target-tenant-id 3 --dry-run

# Production readiness check; upload root resolves automatically
python -m app.onboarding.company_onboarding launch-check --tenant-id 3
```

Local verification after the upload resolver correction:

- onboarding tests: 7 passed;
- complete backend suite: 356 passed, 2 dependency deprecation warnings;
- application reachability: HTTP 200;
- backend runtime logs: repeated health-check 200 responses, no application
  errors in the inspected window.

## 8. Backup and recovery evidence

- A fresh post-setup Render logical PostgreSQL export completed successfully at
  3:26 PM Singapore time on 21 October 2026.
- A second post-configuration export completed successfully at 3:47 PM after
  the contact details, operating hours and kitchen routes were saved and the
  overnight-hours code was deployed.
- Render retains database export files for at least seven days.
- Point-in-time recovery is active for timestamps within the preceding seven
  days.
- The export remains in the protected Render workspace; its signed download URL
  and database credentials are deliberately not recorded in this repository.

This recovery point was created after the Morinaga tenant, owner, products,
images, taxes, floor and tables were verified. It provides a rollback point
before restaurant-specific credentials, staff accounts or live transactions
are introduced.

## 9. Restaurant configuration follow-up

The following production-safe configuration was completed after tenant
creation:

- business type set to `Restaurant`;
- public phone and WhatsApp set to `+65 9145 1636`;
- public address set to `150 Orchard Road, #04-21 Orchard Plaza, Singapore
  238841`;
- website set to `https://sites.google.com/view/morinaga-ramen-izakaya`;
- Google Maps destination set to the restaurant's published business-profile
  link;
- opening hours set to Monday-Saturday 18:30-04:30, Sunday closed;
- `Kitchen` and `Beverages` prep stations created;
- food/non-beverage items route to `Kitchen` by default;
- beverage items route to `Beverages` by default.

The phone, website and late-night hours were cross-checked against the
restaurant's public website and current public listings. Management must still
confirm them before QR codes or booking links are distributed.

Live-browser verification exposed that overnight hours were displayed
correctly but produced an empty public booking calendar because reservation
availability assumed closing time was later on the same date. The backend now
splits overnight service by calendar date: the evening segment belongs to the
starting date and the after-midnight segment belongs to the following date.
This keeps reservation dates, host day views and capacity calculations aligned
with the guest's actual calendar date.

Verification for the overnight-hours correction:

- focused opening-hours and reservation tests: 13 passed;
- complete backend suite: 358 passed, 2 dependency deprecation warnings;
- local application reachability: HTTP 200;
- backend runtime logs: repeated health-check 200 responses and no inspected
  application errors;
- Render deployed commit `5702dc03` successfully;
- live public booking showed 18:30-23:45 on the starting calendar date;
- the following calendar date showed 00:00-03:30 carry-over plus
  18:30-23:45 evening service;
- Sunday showed only Saturday's 00:00-03:30 carry-over and no Sunday-evening
  service;
- the public booking header showed the verified phone, WhatsApp, address,
  website, map link and late-night hours.

## 10. Owner login transfer

The requested production owner email previously belonged to the Ajisen demo
tenant, while Morinaga had been provisioned with a temporary email alias. A
one-time, idempotent data migration now transfers the requested email to the
existing Morinaga owner record without moving or deleting either tenant's
orders, staff history, products, tables or other operational data.

The former Ajisen owner record is retained only for referential history under a
reserved, non-deliverable address. Its two-factor secret is cleared and its
token version is incremented. The Morinaga owner token version is also
incremented so every pre-transfer session is invalidated. The owner must sign in
again or use the normal password-reset flow after deployment.

No password or password hash is stored in this document or in the migration.

## 11. Current launch decision

Morinaga is ready for restaurant-specific configuration, staff setup, sandbox
payment testing and physical printer/tablet acceptance. It is **not yet approved
for taking live customer payments** because the restaurant-specific HitPay
credentials and the remaining legal/operational inputs have not been supplied.

