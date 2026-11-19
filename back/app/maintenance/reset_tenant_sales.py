"""Back up and remove one tenant's sales/order history.

This command is intentionally tenant-scoped, dry-run by default, and guarded by
an exact tenant-name confirmation.  It preserves restaurant configuration,
tables and their QR tokens, menu products/images, reservations, queue entries,
users, shifts, printer agents, and inventory quantities.

Examples::

    # Inspect only (no writes)
    python -m app.maintenance.reset_tenant_sales --tenant-id 3

    # Execute after reviewing the dry-run output
    python -m app.maintenance.reset_tenant_sales \
      --tenant-id 3 \
      --execute \
      --confirm "RESET-SALES:3:Morinaga Ramen Izakaya" \
      --backup-file /tmp/morinaga-prelaunch-sales.json.gz
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
from datetime import date, datetime, time, timezone
from decimal import Decimal
from enum import Enum
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlmodel import Session

from app.db import engine


PRESERVED_COUNT_QUERIES = {
    "tables": 'SELECT COUNT(*) FROM "table" WHERE tenant_id = :tenant_id',
    "floors": "SELECT COUNT(*) FROM floor WHERE tenant_id = :tenant_id",
    "products": "SELECT COUNT(*) FROM product WHERE tenant_id = :tenant_id",
    "product_questions": "SELECT COUNT(*) FROM product_question WHERE tenant_id = :tenant_id",
    "reservations": "SELECT COUNT(*) FROM reservation WHERE tenant_id = :tenant_id",
    "queue_entries": "SELECT COUNT(*) FROM guest_queue_entry WHERE tenant_id = :tenant_id",
    "users": 'SELECT COUNT(*) FROM "user" WHERE tenant_id = :tenant_id',
    "printer_agents": "SELECT COUNT(*) FROM printer_agent WHERE tenant_id = :tenant_id",
}

TRANSACTION_COUNT_QUERIES = {
    "orders": 'SELECT COUNT(*) FROM "order" WHERE tenant_id = :tenant_id',
    "order_items": (
        'SELECT COUNT(*) FROM orderitem WHERE order_id IN '
        '(SELECT id FROM "order" WHERE tenant_id = :tenant_id)'
    ),
    "receipt_adjustments": "SELECT COUNT(*) FROM receiptadjustment WHERE tenant_id = :tenant_id",
    "fiscal_invoices": "SELECT COUNT(*) FROM fiscal_invoice WHERE tenant_id = :tenant_id",
    "print_jobs": "SELECT COUNT(*) FROM print_job WHERE tenant_id = :tenant_id",
    "inventory_links": (
        'SELECT COUNT(*) FROM inventory_transaction WHERE tenant_id = :tenant_id '
        'AND order_id IN (SELECT id FROM "order" WHERE tenant_id = :tenant_id)'
    ),
    "queue_order_links": (
        'SELECT COUNT(*) FROM guest_queue_entry WHERE tenant_id = :tenant_id '
        'AND seated_order_id IN (SELECT id FROM "order" WHERE tenant_id = :tenant_id)'
    ),
    "active_table_order_links": (
        'SELECT COUNT(*) FROM "table" WHERE tenant_id = :tenant_id '
        'AND active_order_id IN (SELECT id FROM "order" WHERE tenant_id = :tenant_id)'
    ),
}


def expected_confirmation(tenant_id: int, tenant_name: str) -> str:
    return f"RESET-SALES:{tenant_id}:{tenant_name}"


def _json_safe(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return str(value)
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(item) for item in value]
    return str(value)


def _count(session: Session, query: str, tenant_id: int) -> int:
    value = session.execute(text(query), {"tenant_id": tenant_id}).scalar_one()
    return int(value)


def _counts(session: Session, queries: dict[str, str], tenant_id: int) -> dict[str, int]:
    return {name: _count(session, query, tenant_id) for name, query in queries.items()}


def _rows(session: Session, query: str, tenant_id: int) -> list[dict[str, Any]]:
    result = session.execute(text(query), {"tenant_id": tenant_id})
    return [_json_safe(dict(row)) for row in result.mappings().all()]


def _preserved_signature(session: Session, tenant_id: int) -> str:
    """Hash launch configuration that must not change during the reset."""

    snapshot = {
        "products": _rows(
            session,
            "SELECT * FROM product WHERE tenant_id = :tenant_id ORDER BY id",
            tenant_id,
        ),
        "product_questions": _rows(
            session,
            "SELECT * FROM product_question WHERE tenant_id = :tenant_id ORDER BY id",
            tenant_id,
        ),
        "floors": _rows(
            session,
            "SELECT * FROM floor WHERE tenant_id = :tenant_id ORDER BY id",
            tenant_id,
        ),
        # Operational session fields are intentionally excluded. All identity,
        # layout, QR, capacity and waiter assignment fields remain protected.
        "tables": _rows(
            session,
            'SELECT id, tenant_id, name, token, floor_id, x_position, y_position, '
            'rotation, shape, width, height, seat_count, table_group_id, '
            'assigned_waiter_id, order_pin FROM "table" '
            'WHERE tenant_id = :tenant_id ORDER BY id',
            tenant_id,
        ),
    }
    payload = json.dumps(snapshot, sort_keys=True, separators=(",", ":"), ensure_ascii=False)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _build_backup(session: Session, tenant_id: int, tenant_name: str) -> dict[str, Any]:
    order_filter = '(SELECT id FROM "order" WHERE tenant_id = :tenant_id)'
    return {
        "format": "sakorio-tenant-sales-backup-v1",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "tenant": {"id": tenant_id, "name": tenant_name},
        "orders": _rows(
            session,
            'SELECT * FROM "order" WHERE tenant_id = :tenant_id ORDER BY id',
            tenant_id,
        ),
        "order_items": _rows(
            session,
            f"SELECT * FROM orderitem WHERE order_id IN {order_filter} ORDER BY id",
            tenant_id,
        ),
        "receipt_adjustments": _rows(
            session,
            "SELECT * FROM receiptadjustment WHERE tenant_id = :tenant_id ORDER BY id",
            tenant_id,
        ),
        "fiscal_invoices": _rows(
            session,
            "SELECT * FROM fiscal_invoice WHERE tenant_id = :tenant_id ORDER BY id",
            tenant_id,
        ),
        "print_jobs": _rows(
            session,
            "SELECT * FROM print_job WHERE tenant_id = :tenant_id ORDER BY id",
            tenant_id,
        ),
        "inventory_order_links": _rows(
            session,
            f"SELECT * FROM inventory_transaction WHERE tenant_id = :tenant_id "
            f"AND order_id IN {order_filter} ORDER BY id",
            tenant_id,
        ),
        "table_session_state": _rows(
            session,
            'SELECT id, is_active, active_order_id, activated_at FROM "table" '
            "WHERE tenant_id = :tenant_id ORDER BY id",
            tenant_id,
        ),
        "queue_order_links": _rows(
            session,
            "SELECT id, seated_order_id FROM guest_queue_entry "
            "WHERE tenant_id = :tenant_id AND seated_order_id IS NOT NULL ORDER BY id",
            tenant_id,
        ),
    }


def _write_backup(path: Path, backup: dict[str, Any]) -> None:
    if path.exists():
        raise ValueError(f"Backup path already exists: {path}")
    path.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(path, "wt", encoding="utf-8") as stream:
        json.dump(backup, stream, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def reset_tenant_sales(
    session: Session,
    *,
    tenant_id: int,
    execute: bool = False,
    confirmation: str | None = None,
    backup_file: Path | None = None,
) -> dict[str, Any]:
    tenant = session.execute(
        text("SELECT id, name FROM tenant WHERE id = :tenant_id FOR UPDATE"),
        {"tenant_id": tenant_id},
    ).mappings().one_or_none()
    if tenant is None:
        raise ValueError(f"Tenant {tenant_id} was not found")

    tenant_name = str(tenant["name"])
    expected = expected_confirmation(tenant_id, tenant_name)
    preserved_before = _counts(session, PRESERVED_COUNT_QUERIES, tenant_id)
    transactions_before = _counts(session, TRANSACTION_COUNT_QUERIES, tenant_id)
    signature_before = _preserved_signature(session, tenant_id)

    summary: dict[str, Any] = {
        "mode": "execute" if execute else "dry-run",
        "tenant": {"id": tenant_id, "name": tenant_name},
        "required_confirmation": expected,
        "transactions_before": transactions_before,
        "preserved_before": preserved_before,
    }
    if not execute:
        session.rollback()
        return summary

    if confirmation != expected:
        session.rollback()
        raise ValueError(f"Exact confirmation required: {expected}")
    if backup_file is None:
        session.rollback()
        raise ValueError("--backup-file is required when --execute is used")

    # Lock the exact order set before backing it up and deleting dependencies.
    session.execute(
        text('SELECT id FROM "order" WHERE tenant_id = :tenant_id FOR UPDATE'),
        {"tenant_id": tenant_id},
    ).all()
    backup = _build_backup(session, tenant_id, tenant_name)
    _write_backup(backup_file, backup)

    statements = [
        # Keep inventory quantities/audit rows; only detach the soon-to-be-deleted order FK.
        """UPDATE inventory_transaction SET order_id = NULL
           WHERE tenant_id = :tenant_id
             AND order_id IN (SELECT id FROM "order" WHERE tenant_id = :tenant_id)""",
        """UPDATE guest_queue_entry SET seated_order_id = NULL
           WHERE tenant_id = :tenant_id
             AND seated_order_id IN (SELECT id FROM "order" WHERE tenant_id = :tenant_id)""",
        """UPDATE "table" SET active_order_id = NULL, is_active = FALSE, activated_at = NULL
           WHERE tenant_id = :tenant_id""",
        "DELETE FROM receiptadjustment WHERE tenant_id = :tenant_id",
        "DELETE FROM fiscal_invoice WHERE tenant_id = :tenant_id",
        "DELETE FROM print_job WHERE tenant_id = :tenant_id",
        """DELETE FROM orderitem WHERE order_id IN
           (SELECT id FROM "order" WHERE tenant_id = :tenant_id)""",
        'DELETE FROM "order" WHERE tenant_id = :tenant_id',
    ]
    for statement in statements:
        session.execute(text(statement), {"tenant_id": tenant_id})

    transactions_after = _counts(session, TRANSACTION_COUNT_QUERIES, tenant_id)
    preserved_after = _counts(session, PRESERVED_COUNT_QUERIES, tenant_id)
    signature_after = _preserved_signature(session, tenant_id)

    if any(transactions_after.values()):
        session.rollback()
        raise RuntimeError(f"Transaction reset verification failed: {transactions_after}")
    if preserved_after != preserved_before or signature_after != signature_before:
        session.rollback()
        raise RuntimeError("Preserved restaurant configuration changed; transaction rolled back")

    session.commit()
    summary.update(
        {
            "backup_file": str(backup_file),
            "transactions_after": transactions_after,
            "preserved_after": preserved_after,
            "preserved_signature_verified": True,
        }
    )
    return summary


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Back up and reset sales/order history for exactly one Sakorio tenant"
    )
    parser.add_argument("--tenant-id", type=int, required=True)
    parser.add_argument("--execute", action="store_true", help="Perform the reset; default is dry-run")
    parser.add_argument("--confirm", help="Exact RESET-SALES:<id>:<tenant name> confirmation")
    parser.add_argument("--backup-file", type=Path, help="New .json.gz backup path (required to execute)")
    return parser


def main() -> int:
    args = build_parser().parse_args()
    try:
        with Session(engine) as session:
            summary = reset_tenant_sales(
                session,
                tenant_id=args.tenant_id,
                execute=args.execute,
                confirmation=args.confirm,
                backup_file=args.backup_file,
            )
    except (ValueError, RuntimeError) as exc:
        print(json.dumps({"status": "error", "detail": str(exc)}, ensure_ascii=False))
        return 2

    print(json.dumps({"status": "ok", **summary}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
