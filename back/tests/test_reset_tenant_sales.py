"""Safety coverage for the tenant-scoped sales reset command."""

from __future__ import annotations

from pathlib import Path
from tempfile import TemporaryDirectory

from pg_client_mixin import PgClientTestCase
from sqlmodel import select

from app import models
from app.maintenance.reset_tenant_sales import expected_confirmation, reset_tenant_sales


class TestResetTenantSales(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        tenant = models.Tenant(name="Reset Safety Ramen")
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)
        self.tenant = tenant

        product = models.Product(
            tenant_id=tenant.id,
            name="Launch Ramen",
            price_cents=1200,
            image_filename="ramen.jpg",
        )
        table = models.Table(tenant_id=tenant.id, name="T01", token="reset-safety-table-token")
        reservation = models.Reservation(
            tenant_id=tenant.id,
            customer_name="Launch Guest",
            customer_email="launch-guest@sakario.sg",
            customer_phone="+6590000000",
            party_size=2,
            reservation_date="2026-11-20",
            reservation_time="18:00",
        )
        self.session.add(product)
        self.session.add(table)
        self.session.add(reservation)
        self.session.commit()
        self.session.refresh(product)
        self.session.refresh(table)

        order = models.Order(tenant_id=tenant.id, table_id=table.id, customer_name="QA Guest")
        self.session.add(order)
        self.session.commit()
        self.session.refresh(order)
        table.is_active = True
        table.active_order_id = order.id
        self.session.add(table)
        self.session.add(
            models.OrderItem(
                order_id=order.id,
                product_id=product.id,
                product_name=product.name,
                quantity=1,
                price_cents=product.price_cents,
            )
        )
        self.session.add(
            models.PrintJob(
                tenant_id=tenant.id,
                order_id=order.id,
                dedupe_key=f"reset-test-{order.id}",
                payload={"kind": "test"},
            )
        )
        self.session.commit()
        self.product_id = product.id
        self.table_id = table.id
        self.table_token = table.token
        self.order_id = order.id

    def test_dry_run_does_not_change_data(self) -> None:
        result = reset_tenant_sales(self.session, tenant_id=self.tenant.id)
        self.assertEqual(result["mode"], "dry-run")
        self.assertEqual(result["transactions_before"]["orders"], 1)
        self.assertIsNotNone(self.session.get(models.Order, self.order_id))
        self.assertIsNotNone(self.session.get(models.Product, self.product_id))

    def test_execute_requires_exact_confirmation(self) -> None:
        with TemporaryDirectory() as directory:
            with self.assertRaisesRegex(ValueError, "Exact confirmation required"):
                reset_tenant_sales(
                    self.session,
                    tenant_id=self.tenant.id,
                    execute=True,
                    confirmation="wrong",
                    backup_file=Path(directory) / "backup.json.gz",
                )
        self.assertIsNotNone(self.session.get(models.Order, self.order_id))

    def test_execute_removes_sales_and_preserves_menu_and_table(self) -> None:
        with TemporaryDirectory() as directory:
            backup_file = Path(directory) / "backup.json.gz"
            result = reset_tenant_sales(
                self.session,
                tenant_id=self.tenant.id,
                execute=True,
                confirmation=expected_confirmation(self.tenant.id, self.tenant.name),
                backup_file=backup_file,
            )
            self.assertTrue(backup_file.exists())

        self.assertEqual(result["transactions_after"]["orders"], 0)
        self.assertTrue(result["preserved_signature_verified"])
        self.assertIsNone(self.session.get(models.Order, self.order_id))
        self.assertIsNotNone(self.session.get(models.Product, self.product_id))

        table = self.session.get(models.Table, self.table_id)
        self.assertIsNotNone(table)
        self.assertEqual(table.token, self.table_token)
        self.assertFalse(table.is_active)
        self.assertIsNone(table.active_order_id)
        self.assertEqual(
            len(
                self.session.exec(
                    select(models.Reservation).where(
                        models.Reservation.tenant_id == self.tenant.id
                    )
                ).all()
            ),
            1,
        )


if __name__ == "__main__":
    import unittest

    unittest.main()
