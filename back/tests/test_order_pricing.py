from app import models
from app.order_pricing import calculate_order_totals, snapshot_order_billing_rules


def test_morinaga_five_dollar_item_adds_service_then_gst():
    tenant = models.Tenant(
        id=1,
        name="Morinaga Ramen Izakaya",
        service_charge_percent=10,
        prices_include_tax=False,
        default_tax_id=9,
    )
    order = models.Order(id=1, tenant_id=1, table_id=1)
    snapshot_order_billing_rules(order, tenant)
    item = models.OrderItem(
        id=1,
        order_id=1,
        product_id=1,
        product_name="Ramen",
        quantity=1,
        price_cents=500,
        tax_id=9,
        tax_rate_percent=9,
        tax_amount_cents=45,
    )

    totals = calculate_order_totals([item], tenant=tenant, order=order)

    assert totals.subtotal_cents == 500
    assert totals.service_charge_cents == 50
    assert totals.tax_cents == 50
    assert totals.total_cents == 600


def test_legacy_order_does_not_receive_new_tenant_charges_retroactively():
    tenant = models.Tenant(
        id=1,
        name="Morinaga Ramen Izakaya",
        service_charge_percent=10,
        prices_include_tax=False,
    )
    legacy_order = models.Order(id=1, tenant_id=1, table_id=1)
    item = models.OrderItem(
        id=1,
        order_id=1,
        product_id=1,
        product_name="Legacy item",
        quantity=1,
        price_cents=500,
        tax_rate_percent=9,
        tax_amount_cents=41,
    )

    totals = calculate_order_totals([item], tenant=tenant, order=legacy_order)

    assert totals.service_charge_cents == 0
    assert totals.total_cents == 500
