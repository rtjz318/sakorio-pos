"""Authoritative order total calculation.

Menu prices stay as the advertised base price.  Tenant billing rules are
snapshotted on each order so a later configuration change cannot rewrite a
historical bill.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from . import models


@dataclass(frozen=True)
class OrderTotals:
    subtotal_cents: int
    service_charge_percent: int
    service_charge_cents: int
    tax_cents: int
    tip_cents: int
    total_cents: int

    def as_dict(self) -> dict[str, int]:
        return {
            "subtotal_cents": self.subtotal_cents,
            "service_charge_percent": self.service_charge_percent,
            "service_charge_cents": self.service_charge_cents,
            "tax_cents": self.tax_cents,
            "tip_amount_cents": self.tip_cents,
            "total_cents": self.total_cents,
        }


def percentage_cents(amount_cents: int, rate_percent: int) -> int:
    """Round a percentage to the nearest cent using integer arithmetic."""
    amount = max(0, int(amount_cents or 0))
    rate = max(0, int(rate_percent or 0))
    return (amount * rate + 50) // 100


def order_uses_tax_inclusive_prices(order: models.Order, tenant: models.Tenant) -> bool:
    snapshot = getattr(order, "prices_include_tax_applied", None)
    if snapshot is not None:
        return bool(snapshot)
    # A null snapshot identifies a legacy order created before billing-rule snapshots.
    return True


def order_service_charge_percent(order: models.Order, tenant: models.Tenant) -> int:
    snapshot = getattr(order, "service_charge_percent_applied", None)
    if snapshot is not None:
        return max(0, min(100, int(snapshot)))
    # Do not retroactively charge legacy open or historical orders.
    return 0


def snapshot_order_billing_rules(order: models.Order, tenant: models.Tenant) -> None:
    if getattr(order, "service_charge_percent_applied", None) is None:
        order.service_charge_percent_applied = max(
            0, min(100, int(getattr(tenant, "service_charge_percent", 0) or 0))
        )
    if getattr(order, "prices_include_tax_applied", None) is None:
        order.prices_include_tax_applied = bool(
            getattr(tenant, "prices_include_tax", True)
        )


def calculate_order_totals(
    items: Iterable[models.OrderItem],
    *,
    tenant: models.Tenant,
    order: models.Order,
    tip_cents: int | None = None,
) -> OrderTotals:
    active_items = [
        item
        for item in items
        if not bool(getattr(item, "removed_by_customer", False))
        and getattr(item, "removed_by_user_id", None) is None
        and getattr(item, "status", None) != models.OrderItemStatus.cancelled
    ]
    subtotal = sum(max(0, int(item.price_cents)) * max(0, int(item.quantity)) for item in active_items)
    service_percent = order_service_charge_percent(order, tenant)
    service_cents = percentage_cents(subtotal, service_percent)

    if order_uses_tax_inclusive_prices(order, tenant):
        # Legacy prices already contain tax; stored line tax is a reporting breakdown.
        tax_cents = sum(max(0, int(getattr(item, "tax_amount_cents", 0) or 0)) for item in active_items)
        payable_tax_cents = 0
    else:
        line_tax_cents = sum(
            percentage_cents(
                max(0, int(item.price_cents)) * max(0, int(item.quantity)),
                int(getattr(item, "tax_rate_percent", 0) or 0),
            )
            for item in active_items
        )
        service_tax_rate = 0
        default_tax_id = getattr(tenant, "default_tax_id", None)
        for item in active_items:
            if default_tax_id and getattr(item, "tax_id", None) == default_tax_id:
                service_tax_rate = int(getattr(item, "tax_rate_percent", 0) or 0)
                break
        tax_cents = line_tax_cents + percentage_cents(service_cents, service_tax_rate)
        payable_tax_cents = tax_cents

    tip = max(0, int(tip_cents if tip_cents is not None else (order.tip_amount_cents or 0)))
    return OrderTotals(
        subtotal_cents=subtotal,
        service_charge_percent=service_percent,
        service_charge_cents=service_cents,
        tax_cents=tax_cents,
        tip_cents=tip,
        total_cents=subtotal + service_cents + payable_tax_cents + tip,
    )
