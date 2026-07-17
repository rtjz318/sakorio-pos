"""Durable receipt creation shared by order and payment workflows."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timezone
from uuid import uuid4

from sqlmodel import Session, select

from . import models
from .kitchen_stations_util import resolve_order_item_kds


def enqueue_kitchen_receipts(
    session: Session,
    *,
    tenant: models.Tenant,
    table: models.Table,
    order: models.Order,
    lines: list[dict],
) -> list[models.PrintJob]:
    """Create one durable receipt per prep station for only the newly submitted lines."""
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
    for sequence, ((station_id, station_name, route), station_lines) in enumerate(grouped.items(), start=1):
        job = models.PrintJob(
            tenant_id=tenant.id,
            order_id=order.id,
            kitchen_station_id=station_id,
            job_type="bar_receipt" if route == "bar" else "kitchen_receipt",
            dedupe_key=f"order:{order.id}:batch:{batch_id}:station:{station_id or route}:{sequence}",
            payload={
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
                        "quantity": int(line["quantity"]),
                        "name": str(line["name"]),
                        "notes": line.get("notes"),
                        "customization": line.get("customization"),
                        "modifiers": line.get("modifiers"),
                    }
                    for line in station_lines
                ],
            },
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
        payload={
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
        },
    )
    session.add(job)
    return job
