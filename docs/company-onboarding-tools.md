# Sakorio company-onboarding tools

This document explains the first repeatable onboarding utility package.

Main command:

```bash
cd back
python -m app.onboarding.company_onboarding --help
```

Run it inside the backend container when possible:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml exec back \
  python -m app.onboarding.company_onboarding --help
```

## What this package does

It provides four safe first-step utilities:

1. `create-tenant`
   - Creates or updates a tenant/company.
   - Creates a default floor.
   - Creates default tables with fixed QR tokens.
   - Optionally creates an owner account from an environment-provided password.
2. `import-menu-csv`
   - Imports menu products from CSV.
   - Cleans copied/PDF text artifacts.
   - Parses common price formats such as `SGD 10.00`, `$7`, and cents.
   - Optionally creates kitchen/beverage stations.
3. `launch-check`
   - Performs non-browser preflight checks for one tenant.
   - Reports staff roles, table count, product count, image references, HitPay setup, timezone, and currency.
4. `render-env-template`
   - Generates a company-specific Render environment checklist without secret values.

## Important safety notes

- The tool never stores passwords in files.
- Owner password creation requires an environment variable.
- Destructive product deletion requires `--confirm-delete-products DELETE_PRODUCTS`.
- `--dry-run` is available for tenant creation and menu import.
- Browser QA is still required before launch. This tool only handles repeatable data/setup checks.

## CSV menu format

Recommended columns:

```csv
name,price,category,subcategory,description,station,image_filename
DAIYAME/Glass,10.00,Drink Menu,Glass Shochu,Daiyame glass pour,Bar,daiyame-glass.jpg
C1 Gyoza,6.00,Deep Fried Menu,Dumplings,Deep fried gyoza,Kitchen,c1-gyoza.jpg
```

Flexible accepted headers:

- `name`, `item`, or `product`
- `price`, `price_cents`, or `amount`
- `category`
- `subcategory` or `sub_category`
- `description`
- `station` or `prep_station`
- `image_filename` or `image`

## Create a company tenant

Dry run:

```bash
cd back
SAKORIO_OWNER_PASSWORD='replace-with-temporary-password' \
python -m app.onboarding.company_onboarding create-tenant \
  --dry-run \
  --name "Company Restaurant" \
  --owner-email owner@company.com \
  --owner-name "Company Owner" \
  --tables T01:4,T02:4,T03:2,T04:2
```

Real run:

```bash
cd back
SAKORIO_OWNER_PASSWORD='replace-with-temporary-password' \
python -m app.onboarding.company_onboarding create-tenant \
  --name "Company Restaurant" \
  --owner-email owner@company.com \
  --owner-name "Company Owner" \
  --phone "+65 6123 4567" \
  --email operations@company.com \
  --address "Restaurant address" \
  --currency-code SGD \
  --timezone Asia/Singapore \
  --country-code SG \
  --tables T01:4,T02:4,T03:2,T04:2
```

## Import menu CSV

Dry run:

```bash
cd back
python -m app.onboarding.company_onboarding import-menu-csv \
  --dry-run \
  --tenant-id 1 \
  --csv ../tmp/company-menu.csv
```

Real run:

```bash
cd back
python -m app.onboarding.company_onboarding import-menu-csv \
  --tenant-id 1 \
  --csv ../tmp/company-menu.csv
```

Replace existing products:

```bash
cd back
python -m app.onboarding.company_onboarding import-menu-csv \
  --tenant-id 1 \
  --csv ../tmp/company-menu.csv \
  --delete-existing \
  --confirm-delete-products DELETE_PRODUCTS
```

## Run launch data checks

```bash
cd back
python -m app.onboarding.company_onboarding launch-check \
  --tenant-id 1 \
  --uploads-dir uploads \
  --min-tables 10 \
  --min-products 50
```

The command exits:

- `0` for pass or warning.
- `1` when a hard failure is detected.

## Generate Render env checklist

```bash
cd back
python -m app.onboarding.company_onboarding render-env-template \
  --company-slug ajisen \
  --staff-url https://staff.ajisen.example \
  --order-url https://order.ajisen.example \
  --api-url https://api.ajisen.example
```

Do not paste real secrets into generated docs. Fill actual secret values only inside Render.

## Full onboarding sequence

1. Create Render services and database.
2. Configure env vars.
3. Deploy API/staff/order services.
4. Run migrations.
5. Run `create-tenant`.
6. Upload logo/header.
7. Run `import-menu-csv`.
8. Upload product images.
9. Run `launch-check`.
10. Run live browser QA using the launch QA brief.
11. Create database export.
12. Lock down database network access.
13. Switch HitPay to production.
14. Rotate temporary owner/QA passwords.

