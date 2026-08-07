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


def test_new_round_creates_one_preparation_receipt_per_ordered_unit():
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

    assert len(jobs) == 3
    assert [
        (
            job.payload["items"][0]["name"],
            job.kitchen_station_id,
            job.job_type,
        )
        for job in jobs
    ] == [
        ("Noodles", 10, "kitchen_receipt"),
        ("Noodles", 10, "kitchen_receipt"),
        ("Tea", 20, "bar_receipt"),
    ]
    assert all(job.order_id == 55 for job in jobs)
    assert all(job.payload["table_name"] == "Table 7" for job in jobs)
    assert all(len(job.payload["items"]) == 1 for job in jobs)
    assert all(job.payload["items"][0]["quantity"] == 1 for job in jobs)
    assert all(
        job.payload["items"]
        == [
            {
                "quantity": 1,
                "name": "Noodles",
                "notes": "No spring onion",
                "customization": None,
                "modifiers": None,
            }
        ]
        for job in jobs[:2]
    )
    assert len({job.dedupe_key for job in jobs}) == 3
    assert session.added == jobs


def test_ten_ordered_units_create_ten_prep_receipts_plus_customer_receipt():
    kitchen = models.KitchenStation(
        id=10, tenant_id=1, name="Main Kitchen", sort_order=1, display_route="kitchen"
    )
    food = models.Product(
        id=101,
        tenant_id=1,
        name="Noodles",
        price_cents=1200,
        kitchen_station_id=kitchen.id,
    )
    tenant = models.Tenant(id=1, name="Sakorio QA")
    table = models.Table(id=1, tenant_id=1, name="Table 1")
    order = models.Order(
        id=99,
        tenant_id=1,
        table_id=1,
        status=models.OrderStatus.pending,
    )
    session = _Session([kitchen], [food])

    jobs = enqueue_kitchen_receipts(
        session,
        tenant=tenant,
        table=table,
        order=order,
        lines=[{"product_id": food.id, "name": food.name, "quantity": 10}],
    )

    assert len(jobs) == 10
    assert all(job.job_type == "kitchen_receipt" for job in jobs)
    assert all(
        job.payload["items"]
        == [
            {
                "quantity": 1,
                "name": "Noodles",
                "notes": None,
                "customization": None,
                "modifiers": None,
            }
        ]
        for job in jobs
    )
    assert session.added == jobs

    order.status = models.OrderStatus.paid
    order.paid_at = datetime.now(timezone.utc)
    assert len({job.dedupe_key for job in jobs}) == 10

    customer_session = _Session(
        [],
        [
            models.OrderItem(
                id=1,
                order_id=99,
                product_id=101,
                product_name="Noodles",
                quantity=10,
                price_cents=1200,
            )
        ],
    )
    customer_job = enqueue_customer_receipt(
        customer_session,
        tenant=tenant,
        table=table,
        order=order,
    )

    assert customer_job is not None
    assert customer_job.job_type == "customer_receipt"
    assert customer_job.payload["items"][0]["quantity"] == 10
    assert customer_session.added == [customer_job]
    assert len(jobs) + len(customer_session.added) == 11


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
    tea = models.OrderItem(
        id=2,
        order_id=55,
        product_id=202,
        product_name="Tea",
        quantity=1,
        price_cents=350,
    )
    session = _Session([], [noodles, tea])
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
    assert job.payload["subtotal_cents"] == 2750
    assert job.payload["tip_cents"] == 240
    assert job.payload["total_cents"] == 2990
    assert job.payload["payment_method"] == "terminal"
    assert [item["name"] for item in job.payload["items"]] == ["Noodles", "Tea"]
    assert [item["line_total_cents"] for item in job.payload["items"]] == [2400, 350]


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
