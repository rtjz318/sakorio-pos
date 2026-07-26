"""Repeatable company onboarding utilities.

Usage examples:

  # Create or update a tenant, owner and default tables
  SAKORIO_OWNER_PASSWORD='...' python -m app.onboarding.company_onboarding create-tenant \
    --name "Ajisen Ramen" --owner-email owner@example.sg --tables T01:4,T02:4,T03:2

  # Import products from CSV
  python -m app.onboarding.company_onboarding import-menu-csv \
    --tenant-id 1 --csv menu.csv

  # Run non-browser launch data checks
  python -m app.onboarding.company_onboarding launch-check --tenant-id 1

The tool intentionally does not store secrets in files. Passwords must come from
environment variables. Destructive menu replacement requires an explicit
confirmation phrase.
"""

from __future__ import annotations

import argparse
import csv
import json
import os
import re
import sys
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable
from uuid import uuid4

from sqlalchemy import text
from sqlmodel import Session, select

from app.db import engine
from app.models import Floor, KitchenStation, Product, Table, Tenant, User, UserRole
from app.security import get_password_hash


DEFAULT_TABLES = "T01:4,T02:4,T03:4,T04:4,T05:4,T06:2,T07:2,T08:2,T09:2,T10:2"
DELETE_CONFIRMATION = "DELETE_PRODUCTS"


@dataclass(frozen=True)
class TableSpec:
    name: str
    seats: int


@dataclass(frozen=True)
class MenuRow:
    name: str
    price_cents: int
    category: str | None
    subcategory: str | None
    description: str | None
    station: str | None
    image_filename: str | None


def clean_text(value: object) -> str:
    """Clean copied/PDF-extracted text without changing normal menu names."""
    if value is None:
        return ""
    text_value = unicodedata.normalize("NFKC", str(value))
    replacements = {
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u2013": "-",
        "\u2014": "-",
        "\u00a0": " ",
        "\ufeff": "",
    }
    for source, target in replacements.items():
        text_value = text_value.replace(source, target)
    text_value = "".join(ch for ch in text_value if ch == "\n" or ch == "\t" or not unicodedata.category(ch).startswith("C"))
    text_value = re.sub(r"\s+", " ", text_value).strip()
    return text_value


def parse_price_cents(value: object) -> int:
    """Parse SGD 10.00 / $10 / 1000 cents into integer cents."""
    raw = clean_text(value)
    if not raw:
        raise ValueError("missing price")
    stripped = re.sub(r"(?i)\b(sgd|usd|eur|myr|s\$)\b", "", raw)
    stripped = stripped.replace("$", "").replace(",", "").strip()
    if re.fullmatch(r"\d+", stripped):
        # Treat large integers as cents, small integers as whole currency units.
        amount = int(stripped)
        return amount if amount >= 1000 else amount * 100
    if re.fullmatch(r"\d+(\.\d{1,2})?", stripped):
        dollars, _, cents = stripped.partition(".")
        return int(dollars) * 100 + int((cents + "00")[:2])
    raise ValueError(f"invalid price: {raw!r}")


def parse_tables(raw: str) -> list[TableSpec]:
    specs: list[TableSpec] = []
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        if ":" not in part:
            raise ValueError(f"table spec must be NAME:SEATS, got {part!r}")
        name, seats_raw = part.split(":", 1)
        name = clean_text(name)
        seats = int(seats_raw)
        if not name:
            raise ValueError("table name cannot be empty")
        if seats < 1:
            raise ValueError(f"table {name} must have at least 1 seat")
        specs.append(TableSpec(name=name, seats=seats))
    if not specs:
        raise ValueError("at least one table is required")
    return specs


def _set_if_present(entity: object, field: str, value: str | None) -> None:
    cleaned = clean_text(value)
    if cleaned:
        setattr(entity, field, cleaned)


def _find_or_create_tenant(session: Session, tenant_id: int | None, name: str) -> tuple[Tenant, bool]:
    tenant: Tenant | None = None
    if tenant_id is not None:
        tenant = session.get(Tenant, tenant_id)
        if tenant is None:
            raise SystemExit(f"Tenant id {tenant_id} not found.")
    if tenant is None:
        tenant = session.exec(select(Tenant).where(Tenant.name == name)).first()
    if tenant is not None:
        return tenant, False
    tenant = Tenant(name=name)
    session.add(tenant)
    session.flush()
    return tenant, True


def _find_or_create_floor(session: Session, tenant_id: int, name: str, dry_run: bool) -> tuple[int | None, bool]:
    floor = session.exec(
        select(Floor).where(Floor.tenant_id == tenant_id).where(Floor.name == name)
    ).first()
    if floor is not None:
        return floor.id, False
    if dry_run:
        return None, True
    floor = Floor(tenant_id=tenant_id, name=name, sort_order=0, is_active=True, seating_zone="any")
    session.add(floor)
    session.flush()
    return floor.id, True


def _upsert_tables(
    session: Session,
    tenant_id: int,
    floor_id: int | None,
    table_specs: Iterable[TableSpec],
    dry_run: bool,
) -> dict[str, int]:
    created = 0
    updated = 0
    for spec in table_specs:
        table = session.exec(
            select(Table).where(Table.tenant_id == tenant_id).where(Table.name == spec.name)
        ).first()
        if table is None:
            created += 1
            if not dry_run:
                session.add(
                    Table(
                        tenant_id=tenant_id,
                        name=spec.name,
                        token=str(uuid4()),
                        floor_id=floor_id,
                        seat_count=spec.seats,
                        is_active=False,
                    )
                )
        else:
            changed = False
            if table.seat_count != spec.seats:
                table.seat_count = spec.seats
                changed = True
            if floor_id is not None and table.floor_id != floor_id:
                table.floor_id = floor_id
                changed = True
            if changed:
                updated += 1
                if not dry_run:
                    session.add(table)
    return {"created": created, "updated": updated}


def _upsert_owner(
    session: Session,
    tenant_id: int,
    email: str,
    full_name: str | None,
    password_env: str,
    rotate_existing: bool,
    dry_run: bool,
) -> dict[str, object]:
    password = os.getenv(password_env, "").strip()
    if not password:
        raise SystemExit(f"Set {password_env} before creating an owner user.")
    if len(password) < 12:
        raise SystemExit(f"{password_env} must be at least 12 characters.")

    email = clean_text(email).lower()
    if "@" not in email:
        raise SystemExit("Owner email must be a valid email address.")

    user = session.exec(select(User).where(User.email == email)).first()
    if user is None:
        if not dry_run:
            user = User(
                tenant_id=tenant_id,
                email=email,
                hashed_password=get_password_hash(password),
                full_name=clean_text(full_name) or "Company Owner",
                role=UserRole.owner,
            )
            session.add(user)
        return {"created": 1, "updated": 0, "password_rotated": True}

    if user.tenant_id not in (None, tenant_id):
        raise SystemExit(f"Owner email {email} already belongs to tenant {user.tenant_id}.")

    if not dry_run:
        user.tenant_id = tenant_id
        user.role = UserRole.owner
        if full_name:
            user.full_name = clean_text(full_name)
        if rotate_existing:
            user.hashed_password = get_password_hash(password)
        session.add(user)
    return {"created": 0, "updated": 1, "password_rotated": rotate_existing}


def create_tenant(args: argparse.Namespace) -> int:
    name = clean_text(args.name)
    if not name:
        raise SystemExit("--name is required.")
    table_specs = parse_tables(args.tables)
    summary: dict[str, object] = {
        "dry_run": args.dry_run,
        "tenant_created": False,
        "tenant_updated": False,
        "floor_created": False,
        "tables": {"created": 0, "updated": 0},
        "owner": None,
    }

    with Session(engine) as session:
        tenant, created = _find_or_create_tenant(session, args.tenant_id, name)
        summary["tenant_created"] = created
        summary["tenant_updated"] = not created

        tenant.name = name
        _set_if_present(tenant, "description", args.description)
        _set_if_present(tenant, "phone", args.phone)
        _set_if_present(tenant, "whatsapp", args.whatsapp)
        _set_if_present(tenant, "email", args.email)
        _set_if_present(tenant, "address", args.address)
        _set_if_present(tenant, "website", args.website)
        _set_if_present(tenant, "tax_id", args.tax_id)
        _set_if_present(tenant, "cif", args.uen)
        _set_if_present(tenant, "currency_code", args.currency_code)
        _set_if_present(tenant, "currency", args.currency_symbol)
        _set_if_present(tenant, "timezone", args.timezone)
        _set_if_present(tenant, "country_code", args.country_code)
        _set_if_present(tenant, "default_language", args.default_language)
        if not args.dry_run:
            session.add(tenant)
            session.flush()

        if tenant.id is None:
            raise SystemExit("Tenant id was not assigned.")
        floor_id, floor_created = _find_or_create_floor(session, tenant.id, args.floor_name, args.dry_run)
        summary["floor_created"] = floor_created
        summary["tables"] = _upsert_tables(session, tenant.id, floor_id, table_specs, args.dry_run)

        if args.owner_email:
            summary["owner"] = _upsert_owner(
                session,
                tenant.id,
                args.owner_email,
                args.owner_name,
                args.owner_password_env,
                args.rotate_owner_password,
                args.dry_run,
            )

        if args.dry_run:
            session.rollback()
        else:
            session.commit()
        summary["tenant_id"] = tenant.id

    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


def row_to_menu(row: dict[str, str]) -> MenuRow:
    lower = {clean_text(k).lower().replace(" ", "_"): v for k, v in row.items()}
    name = clean_text(lower.get("name") or lower.get("item") or lower.get("product"))
    if not name:
        raise ValueError("row missing name")
    price_source = lower.get("price_cents") or lower.get("price") or lower.get("amount")
    return MenuRow(
        name=name,
        price_cents=parse_price_cents(price_source),
        category=clean_text(lower.get("category")) or None,
        subcategory=clean_text(lower.get("subcategory") or lower.get("sub_category")) or None,
        description=clean_text(lower.get("description")) or None,
        station=clean_text(lower.get("station") or lower.get("prep_station")) or None,
        image_filename=clean_text(lower.get("image_filename") or lower.get("image")) or None,
    )


def _station_route(station_name: str) -> str:
    station = station_name.lower()
    if any(keyword in station for keyword in ("bar", "beverage", "drink", "tea", "coffee")):
        return "bar"
    return "kitchen"


def _find_or_create_station(session: Session, tenant_id: int, station_name: str, dry_run: bool) -> int | None:
    station = session.exec(
        select(KitchenStation).where(KitchenStation.tenant_id == tenant_id).where(KitchenStation.name == station_name)
    ).first()
    if station is not None:
        return station.id
    if dry_run:
        return None
    station = KitchenStation(
        tenant_id=tenant_id,
        name=station_name,
        display_route=_station_route(station_name),
    )
    session.add(station)
    session.flush()
    return station.id


def import_menu_csv(args: argparse.Namespace) -> int:
    csv_path = Path(args.csv)
    if not csv_path.exists():
        raise SystemExit(f"CSV file not found: {csv_path}")
    if args.delete_existing and args.confirm_delete_products != DELETE_CONFIRMATION:
        raise SystemExit(f"--delete-existing requires --confirm-delete-products {DELETE_CONFIRMATION}")

    parsed: list[MenuRow] = []
    errors: list[str] = []
    with csv_path.open("r", encoding=args.encoding, newline="") as handle:
        reader = csv.DictReader(handle)
        for index, row in enumerate(reader, start=2):
            try:
                parsed.append(row_to_menu(row))
            except Exception as exc:
                errors.append(f"line {index}: {exc}")

    if errors and not args.allow_errors:
        print("\n".join(errors), file=sys.stderr)
        raise SystemExit("Fix CSV errors or rerun with --allow-errors.")

    summary = {
        "dry_run": args.dry_run,
        "tenant_id": args.tenant_id,
        "rows_parsed": len(parsed),
        "errors": errors,
        "created": 0,
        "updated": 0,
        "deleted_existing": 0,
        "stations_created_or_reused": sorted({row.station for row in parsed if row.station}),
    }

    with Session(engine) as session:
        tenant = session.get(Tenant, args.tenant_id)
        if tenant is None:
            raise SystemExit(f"Tenant id {args.tenant_id} not found.")

        if args.delete_existing:
            existing_products = session.exec(select(Product).where(Product.tenant_id == args.tenant_id)).all()
            summary["deleted_existing"] = len(existing_products)
            if not args.dry_run:
                for product in existing_products:
                    session.delete(product)
                session.flush()

        for item in parsed:
            product = None
            if not args.delete_existing:
                product = session.exec(
                    select(Product)
                    .where(Product.tenant_id == args.tenant_id)
                    .where(Product.name == item.name)
                    .where(Product.category == item.category)
                ).first()
            station_id = _find_or_create_station(session, args.tenant_id, item.station, args.dry_run) if item.station else None
            if product is None:
                summary["created"] += 1
                if not args.dry_run:
                    session.add(
                        Product(
                            tenant_id=args.tenant_id,
                            name=item.name,
                            price_cents=item.price_cents,
                            category=item.category,
                            subcategory=item.subcategory,
                            description=item.description,
                            image_filename=item.image_filename,
                            kitchen_station_id=station_id,
                        )
                    )
            else:
                summary["updated"] += 1
                if not args.dry_run:
                    product.price_cents = item.price_cents
                    product.category = item.category
                    product.subcategory = item.subcategory
                    product.description = item.description
                    product.image_filename = item.image_filename
                    product.kitchen_station_id = station_id
                    session.add(product)

        if args.dry_run:
            session.rollback()
        else:
            session.commit()

    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0


def launch_check(args: argparse.Namespace) -> int:
    uploads_dir = Path(args.uploads_dir)
    result: dict[str, object] = {
        "tenant_id": args.tenant_id,
        "status": "pass",
        "checks": {},
        "warnings": [],
        "failures": [],
    }

    with Session(engine) as session:
        tenant = session.get(Tenant, args.tenant_id)
        if tenant is None:
            raise SystemExit(f"Tenant id {args.tenant_id} not found.")

        users = session.exec(select(User).where(User.tenant_id == args.tenant_id)).all()
        tables = session.exec(select(Table).where(Table.tenant_id == args.tenant_id)).all()
        products = session.exec(select(Product).where(Product.tenant_id == args.tenant_id)).all()

        result["tenant_name"] = tenant.name
        result["checks"] = {
            "users_total": len(users),
            "roles": {role.value: sum(1 for user in users if user.role == role) for role in UserRole},
            "tables_total": len(tables),
            "tables_with_tokens": sum(1 for table in tables if table.token),
            "products_total": len(products),
            "products_with_images": sum(1 for product in products if product.image_filename),
            "hitpay_mode": tenant.hitpay_mode,
            "has_hitpay_api_key": bool(tenant.hitpay_api_key),
            "has_hitpay_webhook_salt": bool(tenant.hitpay_webhook_salt),
            "currency_code": tenant.currency_code,
            "timezone": tenant.timezone,
        }

        failures: list[str] = result["failures"]  # type: ignore[assignment]
        warnings: list[str] = result["warnings"]  # type: ignore[assignment]
        if not users:
            failures.append("No staff users found.")
        if not any(user.role in (UserRole.owner, UserRole.admin) for user in users):
            failures.append("No owner/admin user found.")
        if len(tables) < args.min_tables:
            failures.append(f"Only {len(tables)} tables found; expected at least {args.min_tables}.")
        if len(products) < args.min_products:
            failures.append(f"Only {len(products)} products found; expected at least {args.min_products}.")
        if not tenant.currency_code:
            warnings.append("Tenant currency_code is not set.")
        if not tenant.timezone:
            warnings.append("Tenant timezone is not set.")
        if tenant.hitpay_mode in (None, "", "sandbox"):
            warnings.append("HitPay is not in live/production mode.")
        if not tenant.hitpay_api_key:
            warnings.append("HitPay API key is not configured.")
        if not tenant.hitpay_webhook_salt:
            warnings.append("HitPay webhook salt is not configured.")

        missing_images = []
        for product in products:
            if not product.image_filename:
                continue
            if product.image_filename.startswith("providers/"):
                # Provider images may live outside tenant uploads; skip file check here.
                continue
            image_path = uploads_dir / str(args.tenant_id) / "products" / product.image_filename
            if not image_path.exists():
                missing_images.append({"product_id": product.id, "name": product.name, "image": product.image_filename})
        if missing_images:
            warnings.append(f"{len(missing_images)} product image file(s) are referenced but missing on disk.")
            result["missing_images"] = missing_images[:25]

    if result["failures"]:
        result["status"] = "fail"
    elif result["warnings"]:
        result["status"] = "warn"

    print(json.dumps(result, indent=2, sort_keys=True))
    return 1 if result["status"] == "fail" else 0


def render_env_template(args: argparse.Namespace) -> int:
    company_slug = clean_text(args.company_slug).lower().replace(" ", "-")
    staff = args.staff_url or f"https://staff.{company_slug}.com"
    order = args.order_url or f"https://order.{company_slug}.com"
    api = args.api_url or f"https://api.{company_slug}.com"
    template = {
        "company_slug": company_slug,
        "api_required": {
            "DATABASE_URL": "<render-postgres-internal-url>",
            "REDIS_URL": "<render-redis-internal-url>",
            "SECRET_KEY": "<unique-generated-secret>",
            "PUBLIC_APP_BASE_URL": order,
            "STAFF_APP_BASE_URL": staff,
            "API_BASE_URL": api,
            "PRODUCTION": "true",
            "DEFAULT_PHONE_COUNTRY": args.default_phone_country,
            "ALLOWED_ORIGINS": f"{staff},{order}",
            "TRUSTED_HOSTS": ",".join([api.replace("https://", ""), staff.replace("https://", ""), order.replace("https://", "")]),
            "HITPAY_MODE": "sandbox",
            "HITPAY_API_KEY": "<company-hitpay-api-key>",
            "HITPAY_WEBHOOK_SALT": "<company-hitpay-webhook-salt>",
        },
        "staff_web": {"API_BASE_URL": api, "STAFF_APP_BASE_URL": staff},
        "order_web": {"API_BASE_URL": api, "PUBLIC_APP_BASE_URL": order},
    }
    print(json.dumps(template, indent=2, sort_keys=True))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Sakorio company onboarding utilities")
    sub = parser.add_subparsers(dest="command", required=True)

    create = sub.add_parser("create-tenant", help="Create/update tenant, owner and default tables")
    create.add_argument("--tenant-id", type=int, default=None, help="Existing tenant id to update")
    create.add_argument("--name", required=True, help="Restaurant/company display name")
    create.add_argument("--description")
    create.add_argument("--phone")
    create.add_argument("--whatsapp")
    create.add_argument("--email")
    create.add_argument("--address")
    create.add_argument("--website")
    create.add_argument("--tax-id")
    create.add_argument("--uen")
    create.add_argument("--currency-code", default="SGD")
    create.add_argument("--currency-symbol", default="SGD")
    create.add_argument("--timezone", default="Asia/Singapore")
    create.add_argument("--country-code", default="SG")
    create.add_argument("--default-language", default="en")
    create.add_argument("--floor-name", default="Main")
    create.add_argument("--tables", default=DEFAULT_TABLES, help="Comma list like T01:4,T02:2")
    create.add_argument("--owner-email")
    create.add_argument("--owner-name")
    create.add_argument("--owner-password-env", default="SAKORIO_OWNER_PASSWORD")
    create.add_argument("--rotate-owner-password", action="store_true")
    create.add_argument("--dry-run", action="store_true")
    create.set_defaults(func=create_tenant)

    menu = sub.add_parser("import-menu-csv", help="Import/upsert products from a CSV")
    menu.add_argument("--tenant-id", type=int, required=True)
    menu.add_argument("--csv", required=True)
    menu.add_argument("--encoding", default="utf-8-sig")
    menu.add_argument("--allow-errors", action="store_true")
    menu.add_argument("--delete-existing", action="store_true")
    menu.add_argument("--confirm-delete-products", default="")
    menu.add_argument("--dry-run", action="store_true")
    menu.set_defaults(func=import_menu_csv)

    check = sub.add_parser("launch-check", help="Run non-browser tenant launch data checks")
    check.add_argument("--tenant-id", type=int, required=True)
    check.add_argument("--uploads-dir", default="uploads")
    check.add_argument("--min-tables", type=int, default=1)
    check.add_argument("--min-products", type=int, default=1)
    check.set_defaults(func=launch_check)

    env = sub.add_parser("render-env-template", help="Generate a per-company Render env checklist")
    env.add_argument("--company-slug", required=True)
    env.add_argument("--staff-url")
    env.add_argument("--order-url")
    env.add_argument("--api-url")
    env.add_argument("--default-phone-country", default="SG")
    env.set_defaults(func=render_env_template)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())

