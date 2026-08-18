"""Durable receipt creation shared by order and payment workflows."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from uuid import uuid4

from sqlmodel import Session, select

from . import models
from .kitchen_stations_util import resolve_order_item_kds


MAX_RECEIPT_TEXT_LENGTH = 500
MAX_RECEIPT_ITEM_NAME_LENGTH = 120
MAX_RECEIPT_ITEMS = 100


def _receipt_text(value: object, *, max_length: int = MAX_RECEIPT_TEXT_LENGTH) -> str | None:
    if value is None:
        return None
    text = str(value).replace("\x00", "").strip()
    if not text:
        return None
    return text[:max_length]


def _receipt_int(value: object, *, default: int = 0, minimum: int = 0) -> int:
    try:
        result = int(value or default)
    except (TypeError, ValueError):
        return default
    return max(minimum, result)


def validate_receipt_payload(payload: dict) -> dict:
    """Normalize a receipt payload before it is stored and leased to a printer.

    This is intentionally small and conservative: it removes null bytes, caps free text,
    keeps money/quantity fields numeric, and drops empty item names. The printer agent
    should receive boring, predictable payloads even if upstream order notes are messy.
    """
    cleaned: dict = {
        "receipt_type": _receipt_text(payload.get("receipt_type"), max_length=64) or "KITCHEN",
        "tenant_name": _receipt_text(payload.get("tenant_name"), max_length=128),
        "station_name": _receipt_text(payload.get("station_name"), max_length=128) or "Kitchen",
        "order_id": payload.get("order_id"),
        "table_name": _receipt_text(payload.get("table_name"), max_length=80) or "Counter",
        "customer_name": _receipt_text(payload.get("customer_name"), max_length=120),
        "order_notes": _receipt_text(payload.get("order_notes")),
        "submitted_at": _receipt_text(payload.get("submitted_at"), max_length=80),
        "payment_method": _receipt_text(payload.get("payment_method"), max_length=80),
        "currency_code": (_receipt_text(payload.get("currency_code"), max_length=8) or "SGD").upper(),
        "subtotal_cents": _receipt_int(payload.get("subtotal_cents")),
        "tip_cents": _receipt_int(payload.get("tip_cents")),
        "total_cents": _receipt_int(payload.get("total_cents")),
    }

    items = []
    for item in list(payload.get("items") or [])[:MAX_RECEIPT_ITEMS]:
        if not isinstance(item, dict):
            continue
        name = _receipt_text(item.get("name"), max_length=MAX_RECEIPT_ITEM_NAME_LENGTH)
        if not name:
            continue
        quantity = _receipt_int(item.get("quantity"), default=1, minimum=1)
        cleaned_item = {
            "quantity": quantity,
            "name": name,
            "notes": _receipt_text(item.get("notes")),
            "customization": _receipt_text(item.get("customization")),
            "modifiers": _receipt_text(item.get("modifiers")),
        }
        if "unit_price_cents" in item:
            unit_price_cents = _receipt_int(item.get("unit_price_cents"))
            cleaned_item["unit_price_cents"] = unit_price_cents
        if "line_total_cents" in item:
            cleaned_item["line_total_cents"] = _receipt_int(item.get("line_total_cents"))
        elif "unit_price_cents" in cleaned_item:
            cleaned_item["line_total_cents"] = cleaned_item["unit_price_cents"] * quantity
        items.append(cleaned_item)
    cleaned["items"] = items
    return cleaned


def enqueue_kitchen_receipts(
    session: Session,
    *,
    tenant: models.Tenant,
    table: models.Table,
    order: models.Order,
    lines: list[dict],
) -> list[models.PrintJob]:
    """Create one durable prep receipt per newly submitted item unit."""
    if not lines or order.id is None:
        return []

    stations = session.exec(
        select(models.KitchenStation).where(models.KitchenStation.tenant_id == tenant.id)
    ).all()
    station_by_id = {station.id: station for station in stations if station.id is not None}
    product_ids = {int(line["product_id"]) for line in lines if line.get("product_id") is not None}
    products = (
        session.exec(
            select(models.Product).where(
                models.Product.tenant_id == tenant.id,
                models.Product.id.in_(product_ids),
            )
        ).all()
        if product_ids
        else []
    )
    product_by_id = {product.id: product for product in products if product.id is not None}

    grouped: dict[tuple[int | None, str, str], list[dict]] = defaultdict(list)
    for line in lines:
        product = product_by_id.get(line.get("product_id"))
        station_id, station_name, route = resolve_order_item_kds(product, tenant, station_by_id)
        label = station_name or ("Bar" if route == "bar" else "Kitchen")
        grouped[(station_id, label, route)].append(line)

    batch_id = uuid4().hex
    created_at = datetime.now(timezone.utc)
    jobs: list[models.PrintJob] = []
    sequence = 0
    for (station_id, station_name, route), station_lines in grouped.items():
        for line in station_lines:
            for _ in range(max(0, int(line["quantity"]))):
                sequence += 1
                job = models.PrintJob(
                    tenant_id=tenant.id,
                    order_id=order.id,
                    kitchen_station_id=station_id,
                    job_type="bar_receipt" if route == "bar" else "kitchen_receipt",
                    dedupe_key=(
                        f"order:{order.id}:batch:{batch_id}:"
                        f"station:{station_id or route}:item:{sequence}"
                    ),
                    payload=validate_receipt_payload(
                        {
                            "receipt_type": "BAR" if route == "bar" else "KITCHEN",
                            "tenant_name": tenant.name,
                            "station_name": station_name,
                            "order_id": order.id,
                            "table_name": table.name,
                            "customer_name": order.customer_name,
                            "order_notes": order.notes,
                            "submitted_at": created_at.isoformat(),
                            "items": [
                                {
                                    "quantity": 1,
                                    "name": str(line["name"]),
                                    "notes": line.get("notes"),
                                    "customization": line.get("customization"),
                                    "modifiers": line.get("modifiers"),
                                }
                            ],
                        }
                    ),
                )
                session.add(job)
                jobs.append(job)
    return jobs


def enqueue_customer_receipt(
    session: Session,
    *,
    tenant: models.Tenant,
    table: models.Table | None,
    order: models.Order,
) -> models.PrintJob | None:
    """Create one idempotent customer receipt when an order becomes paid."""
    if order.id is None:
        return None

    dedupe_key = f"order:{order.id}:customer-receipt"
    existing = session.exec(
        select(models.PrintJob).where(
            models.PrintJob.tenant_id == tenant.id,
            models.PrintJob.dedupe_key == dedupe_key,
        )
    ).first()
    if existing:
        return existing

    items = session.exec(
        select(models.OrderItem).where(models.OrderItem.order_id == order.id)
    ).all()
    active_items = [
        item
        for item in items
        if not item.removed_by_customer
        and item.removed_by_user_id is None
        and item.status != models.OrderItemStatus.cancelled
    ]
    if not active_items:
        return None

    subtotal_cents = sum(item.price_cents * item.quantity for item in active_items)
    tip_cents = int(order.tip_amount_cents or 0)
    paid_at = order.paid_at or datetime.now(timezone.utc)
    job = models.PrintJob(
        tenant_id=tenant.id,
        order_id=order.id,
        kitchen_station_id=None,
        job_type="customer_receipt",
        dedupe_key=dedupe_key,
        payload=validate_receipt_payload(
            {
                "receipt_type": "CUSTOMER RECEIPT",
                "tenant_name": tenant.name,
                "station_name": "Customer Copy",
                "order_id": order.id,
                "table_name": table.name if table else "Counter",
                "customer_name": order.customer_name,
                "order_notes": order.notes,
                "submitted_at": paid_at.isoformat(),
                "payment_method": order.payment_method,
                "currency_code": (tenant.currency_code or "SGD").upper(),
                "subtotal_cents": subtotal_cents,
                "tip_cents": tip_cents,
                "total_cents": subtotal_cents + tip_cents,
                "items": [
                    {
                        "quantity": item.quantity,
                        "name": item.product_name,
                        "unit_price_cents": item.price_cents,
                        "line_total_cents": item.price_cents * item.quantity,
                        "notes": item.notes,
                        "customization": item.customization_summary,
                        "modifiers": item.line_modifiers_summary,
                    }
                    for item in active_items
                ],
            }
        ),
    )
    session.add(job)
    return job
