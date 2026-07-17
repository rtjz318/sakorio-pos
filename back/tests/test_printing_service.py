from datetime import datetime, timezone

from app import models
from app.printing_service import enqueue_customer_receipt, enqueue_kitchen_receipts


class _Rows:
    def __init__(self, rows):
        self._rows = rows

    def all(self):
        return self._rows

    def first(self):
        return self._rows[0] if self._rows else None


class _Session:
    def __init__(self, stations, products):
        self._responses = iter((stations, products))
        self.added = []

    def exec(self, _statement):
        return _Rows(next(self._responses))

    def add(self, value):
        self.added.append(value)


def test_new_round_creates_one_receipt_per_preparation_station():
    kitchen = models.KitchenStation(
        id=10, tenant_id=1, name="Main Kitchen", sort_order=1, display_route="kitchen"
    )
    bar = models.KitchenStation(
        id=20, tenant_id=1, name="Bar", sort_order=2, display_route="bar"
    )
    food = models.Product(
        id=101,
        tenant_id=1,
        name="Noodles",
        price_cents=1200,
        kitchen_station_id=kitchen.id,
    )
    drink = models.Product(
        id=202,
        tenant_id=1,
        name="Tea",
        price_cents=350,
        kitchen_station_id=bar.id,
    )
    session = _Session([kitchen, bar], [food, drink])
    tenant = models.Tenant(id=1, name="Sakorio QA")
    table = models.Table(id=7, tenant_id=1, name="Table 7")
    order = models.Order(id=55, tenant_id=1, table_id=7)

    jobs = enqueue_kitchen_receipts(
        session,
        tenant=tenant,
        table=table,
        order=order,
        lines=[
            {"product_id": food.id, "name": food.name, "quantity": 2, "notes": "No spring onion"},
            {"product_id": drink.id, "name": drink.name, "quantity": 1},
        ],
    )

    assert len(jobs) == 2
    assert {job.job_type for job in jobs} == {"kitchen_receipt", "bar_receipt"}
    assert {job.kitchen_station_id for job in jobs} == {10, 20}
    assert all(job.order_id == 55 for job in jobs)
    assert all(job.payload["table_name"] == "Table 7" for job in jobs)
    kitchen_job = next(job for job in jobs if job.job_type == "kitchen_receipt")
    assert kitchen_job.payload["items"] == [
        {
            "quantity": 2,
            "name": "Noodles",
            "notes": "No spring onion",
            "customization": None,
            "modifiers": None,
        }
    ]
    assert session.added == jobs


def test_empty_round_does_not_create_receipt():
    session = _Session([], [])
    jobs = enqueue_kitchen_receipts(
        session,
        tenant=models.Tenant(id=1, name="Sakorio QA"),
        table=models.Table(id=1, tenant_id=1, name="Table 1"),
        order=models.Order(id=99, tenant_id=1, table_id=1),
        lines=[],
    )

    assert jobs == []
    assert session.added == []


def test_paid_order_creates_one_customer_receipt_with_totals():
    noodles = models.OrderItem(
        id=1,
        order_id=55,
        product_id=101,
        product_name="Noodles",
        quantity=2,
        price_cents=1200,
        customization_summary="Spice: medium",
    )
    session = _Session([], [noodles])
    tenant = models.Tenant(id=1, name="Sakorio QA", currency_code="SGD")
    table = models.Table(id=7, tenant_id=1, name="Table 7")
    order = models.Order(
        id=55,
        tenant_id=1,
        table_id=7,
        status=models.OrderStatus.paid,
        paid_at=datetime.now(timezone.utc),
        payment_method="terminal",
        tip_amount_cents=240,
    )

    job = enqueue_customer_receipt(
        session,
        tenant=tenant,
        table=table,
        order=order,
    )

    assert job is not None
    assert job.job_type == "customer_receipt"
    assert job.kitchen_station_id is None
    assert job.dedupe_key == "order:55:customer-receipt"
    assert job.payload["subtotal_cents"] == 2400
    assert job.payload["tip_cents"] == 240
    assert job.payload["total_cents"] == 2640
    assert job.payload["payment_method"] == "terminal"
    assert job.payload["items"][0]["line_total_cents"] == 2400


def test_customer_receipt_is_idempotent():
    existing = models.PrintJob(
        id=9,
        tenant_id=1,
        order_id=55,
        job_type="customer_receipt",
        dedupe_key="order:55:customer-receipt",
        payload={},
    )
    session = _Session([existing], [])
    job = enqueue_customer_receipt(
        session,
        tenant=models.Tenant(id=1, name="Sakorio QA"),
        table=models.Table(id=7, tenant_id=1, name="Table 7"),
        order=models.Order(id=55, tenant_id=1, table_id=7),
    )

    assert job is existing
    assert session.added == []
