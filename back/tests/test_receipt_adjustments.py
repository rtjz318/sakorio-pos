"""Receipt workspace accounting and authorization acceptance tests."""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from uuid import uuid4

from sqlmodel import select

from pg_client_mixin import PgClientTestCase

from app import models, security


def _headers(user: models.User) -> dict[str, str]:
    token = security.create_access_token(
        {
            "sub": user.email,
            "tenant_id": user.tenant_id,
            "provider_id": None,
            "token_version": user.token_version,
        },
        expires_delta=timedelta(minutes=30),
    )
    return {"Authorization": f"Bearer {token}"}


class TestReceiptAdjustments(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        tenant = models.Tenant(name=f"Receipt Tenant {uuid4().hex[:8]}")
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)
        self.tenant = tenant

        self.owner = models.User(
            email=f"receipt-owner-{uuid4().hex[:8]}@sakorio.sg",
            hashed_password=security.get_password_hash("secret"),
            full_name="Receipt Owner",
            tenant_id=tenant.id,
            role=models.UserRole.owner,
        )
        self.waiter = models.User(
            email=f"receipt-waiter-{uuid4().hex[:8]}@sakorio.sg",
            hashed_password=security.get_password_hash("secret"),
            full_name="Receipt Waiter",
            tenant_id=tenant.id,
            role=models.UserRole.waiter,
        )
        self.session.add(self.owner)
        self.session.add(self.waiter)
        self.session.commit()
        self.session.refresh(self.owner)
        self.session.refresh(self.waiter)

        floor = models.Floor(name="Main", sort_order=0, tenant_id=tenant.id)
        self.session.add(floor)
        self.session.commit()
        self.session.refresh(floor)
        table = models.Table(
            name="T01",
            token=f"receipt-table-{uuid4().hex}",
            floor_id=floor.id,
            tenant_id=tenant.id,
            seat_count=4,
            is_active=True,
        )
        product = models.Product(name="Ramen", price_cents=1000, tenant_id=tenant.id)
        self.session.add(table)
        self.session.add(product)
        self.session.commit()
        self.session.refresh(table)
        self.session.refresh(product)
        self.table_id = table.id
        self.product_id = product.id

    def _paid_order(self) -> tuple[int, int]:
        created = self.client.post(
            "/orders/staff",
            json={
                "table_id": self.table_id,
                "items": [{"product_id": self.product_id, "quantity": 2, "source": "product"}],
            },
            headers=_headers(self.owner),
        )
        self.assertEqual(created.status_code, 200, created.text)
        order_id = created.json()["order_id"]
        item = self.session.exec(
            select(models.OrderItem).where(models.OrderItem.order_id == order_id)
        ).one()
        paid = self.client.put(
            f"/orders/{order_id}/mark-paid",
            json={"payment_method": "terminal"},
            headers=_headers(self.owner),
        )
        self.assertEqual(paid.status_code, 200, paid.text)
        return order_id, item.id

    def test_item_refund_and_void_are_audited_and_reduce_net_receipt(self) -> None:
        order_id, item_id = self._paid_order()

        refund = self.client.post(
            f"/receipts/{order_id}/items/{item_id}/refund",
            json={"quantity": 1, "reason": "Guest returned one bowl"},
            headers=_headers(self.owner),
        )
        self.assertEqual(refund.status_code, 200, refund.text)
        self.assertEqual(refund.json()["amount_cents"], 1000)

        listed = self.client.get("/orders", headers=_headers(self.owner))
        self.assertEqual(listed.status_code, 200, listed.text)
        receipt = next(row for row in listed.json() if row["id"] == order_id)
        self.assertEqual(receipt["receipt_number"], f"R-{order_id:06d}")
        self.assertEqual(receipt["receipt_status"], "partially_refunded")
        self.assertEqual(receipt["refunded_cents"], 1000)
        self.assertEqual(receipt["net_total_cents"], 1000)
        self.assertEqual(receipt["items"][0]["refunded_quantity"], 1)
        self.assertEqual(receipt["items"][0]["refundable_quantity"], 1)
        self.assertEqual(receipt["receipt_adjustments"][0]["reason"], "Guest returned one bowl")

        today = datetime.now(timezone.utc).date().isoformat()
        report = self.client.get(
            f"/reports/sales?from_date={today}&to_date={today}",
            headers=_headers(self.owner),
        )
        self.assertEqual(report.status_code, 200, report.text)
        self.assertEqual(report.json()["summary"]["total_revenue_cents"], 1000)
        self.assertEqual(report.json()["summary"]["total_collected_cents"], 1000)

        voided = self.client.post(
            f"/receipts/{order_id}/void",
            json={"reason": "Manager approved full bill cancellation"},
            headers=_headers(self.owner),
        )
        self.assertEqual(voided.status_code, 200, voided.text)
        self.assertEqual(voided.json()["amount_cents"], 1000)
        self.assertTrue(voided.json()["payment_reversal_required"])

        relisted = self.client.get("/orders", headers=_headers(self.owner)).json()
        receipt = next(row for row in relisted if row["id"] == order_id)
        self.assertEqual(receipt["receipt_status"], "voided")
        self.assertEqual(receipt["refunded_cents"], 2000)
        self.assertEqual(receipt["net_total_cents"], 0)
        self.assertEqual(len(receipt["receipt_adjustments"]), 2)

    def test_paid_receipt_cannot_be_silently_edited_or_deleted(self) -> None:
        order_id, item_id = self._paid_order()
        edit = self.client.put(
            f"/orders/{order_id}/items/{item_id}",
            json={"quantity": 3},
            headers=_headers(self.owner),
        )
        self.assertEqual(edit.status_code, 409, edit.text)
        delete = self.client.delete(f"/orders/{order_id}", headers=_headers(self.owner))
        self.assertEqual(delete.status_code, 409, delete.text)

    def test_waiter_can_view_receipts_but_cannot_refund_or_void(self) -> None:
        order_id, item_id = self._paid_order()
        listed = self.client.get("/orders", headers=_headers(self.waiter))
        self.assertEqual(listed.status_code, 200, listed.text)
        refund = self.client.post(
            f"/receipts/{order_id}/items/{item_id}/refund",
            json={"quantity": 1, "reason": "Not manager approved"},
            headers=_headers(self.waiter),
        )
        self.assertEqual(refund.status_code, 403, refund.text)
        voided = self.client.post(
            f"/receipts/{order_id}/void",
            json={"reason": "Not manager approved"},
            headers=_headers(self.waiter),
        )
        self.assertEqual(voided.status_code, 403, voided.text)

    def test_refund_quantity_cannot_exceed_remaining_quantity(self) -> None:
        order_id, item_id = self._paid_order()
        response = self.client.post(
            f"/receipts/{order_id}/items/{item_id}/refund",
            json={"quantity": 3, "reason": "Too many requested"},
            headers=_headers(self.owner),
        )
        self.assertEqual(response.status_code, 409, response.text)

    def test_item_refund_includes_service_charge_and_gst_share(self) -> None:
        tax = models.Tax(
            tenant_id=self.tenant.id,
            name="GST 9%",
            rate_percent=9,
            valid_from=date(2024, 1, 1),
        )
        self.session.add(tax)
        self.session.commit()
        self.session.refresh(tax)
        self.tenant.service_charge_percent = 10
        self.tenant.prices_include_tax = False
        self.tenant.default_tax_id = tax.id
        product = self.session.get(models.Product, self.product_id)
        product.tax_id = tax.id
        self.session.add(self.tenant)
        self.session.add(product)
        self.session.commit()

        order_id, item_id = self._paid_order()
        refund = self.client.post(
            f"/receipts/{order_id}/items/{item_id}/refund",
            json={"quantity": 1, "reason": "Refund with statutory charges"},
            headers=_headers(self.owner),
        )
        self.assertEqual(refund.status_code, 200, refund.text)
        # One $10 item + 10% service ($1) + 9% GST on both ($0.99).
        self.assertEqual(refund.json()["amount_cents"], 1199)

    def test_receipt_adjustments_are_tenant_scoped(self) -> None:
        order_id, item_id = self._paid_order()
        other_tenant = models.Tenant(name=f"Other Receipt Tenant {uuid4().hex[:8]}")
        self.session.add(other_tenant)
        self.session.commit()
        self.session.refresh(other_tenant)
        other_owner = models.User(
            email=f"other-receipt-owner-{uuid4().hex[:8]}@sakorio.sg",
            hashed_password=security.get_password_hash("secret"),
            tenant_id=other_tenant.id,
            role=models.UserRole.owner,
        )
        self.session.add(other_owner)
        self.session.commit()
        self.session.refresh(other_owner)

        response = self.client.post(
            f"/receipts/{order_id}/items/{item_id}/refund",
            json={"quantity": 1, "reason": "Cross tenant attempt"},
            headers=_headers(other_owner),
        )
        self.assertEqual(response.status_code, 404, response.text)

