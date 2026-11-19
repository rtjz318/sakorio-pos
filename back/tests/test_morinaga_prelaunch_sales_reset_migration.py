"""Integration guard for the one-time Morinaga launch sales reset migration."""

from __future__ import annotations

from datetime import date, time
from pathlib import Path

from pg_client_mixin import PgClientTestCase
from sqlalchemy import text

from app import models
from app.migrate import MigrationRunner


class TestMorinagaPrelaunchSalesResetMigration(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        # The local/CI database is expected not to contain production tenant 3.
        existing = self.session.execute(text("SELECT id FROM tenant WHERE id = 3")).first()
        if existing is not None:
            self.skipTest("Database already contains tenant id 3")

        self.session.add(
            models.Tenant(id=3, name="Morinaga Ramen Izakaya", is_demo=False)
        )
        self.session.flush()
        product = models.Product(
            id=990003,
            tenant_id=3,
            name="Launch Ramen",
            price_cents=1200,
            image_filename="launch-ramen.jpg",
        )
        table = models.Table(
            id=990003,
            tenant_id=3,
            name="T01",
            token="morinaga-reset-migration-test",
        )
        reservation = models.Reservation(
            id=990003,
            tenant_id=3,
            customer_name="Launch Guest",
            customer_phone="+6590000000",
            party_size=2,
            reservation_date=date(2026, 11, 20),
            reservation_time=time(18, 0),
        )
        self.session.add(product)
        self.session.add(table)
        self.session.add(reservation)
        self.session.flush()

        order = models.Order(id=990003, tenant_id=3, table_id=table.id)
        self.session.add(order)
        self.session.flush()
        self.session.add(
            models.OrderItem(
                id=990003,
                order_id=order.id,
                product_id=product.id,
                product_name=product.name,
                quantity=1,
                price_cents=product.price_cents,
            )
        )
        table.is_active = True
        table.active_order_id = order.id
        self.session.add(table)
        self.session.flush()

    def _run_migration_sql(self) -> None:
        migration = (
            Path(__file__).resolve().parent.parent
            / "migrations"
            / "20261119160000_reset_morinaga_prelaunch_sales.sql"
        )
        sql = migration.read_text(encoding="utf-8")
        for statement in MigrationRunner(migration.parent)._split_sql_statements(sql):
            self.session.execute(text(statement))
        self.session.flush()

    def test_migration_resets_sales_and_preserves_launch_configuration(self) -> None:
        self._run_migration_sql()

        self.assertEqual(
            self.session.execute(text('SELECT COUNT(*) FROM "order" WHERE tenant_id = 3')).scalar_one(),
            0,
        )
        self.assertEqual(
            self.session.execute(text("SELECT COUNT(*) FROM orderitem WHERE id = 990003")).scalar_one(),
            0,
        )
        self.assertEqual(
            self.session.execute(text("SELECT COUNT(*) FROM product WHERE id = 990003")).scalar_one(),
            1,
        )
        table = self.session.execute(
            text(
                'SELECT token, is_active, active_order_id FROM "table" WHERE id = 990003'
            )
        ).mappings().one()
        self.assertEqual(table["token"], "morinaga-reset-migration-test")
        self.assertFalse(table["is_active"])
        self.assertIsNone(table["active_order_id"])
        self.assertEqual(
            self.session.execute(text("SELECT COUNT(*) FROM reservation WHERE id = 990003")).scalar_one(),
            1,
        )
        backup = self.session.execute(
            text(
                """
                SELECT completed_at, payload
                FROM launch_sales_reset_backup
                WHERE reset_key = 'morinaga-tenant-3-prelaunch-2026-11-19'
                """
            )
        ).mappings().one()
        self.assertIsNotNone(backup["completed_at"])
        self.assertEqual(len(backup["payload"]["orders"]), 1)
        self.assertEqual(len(backup["payload"]["order_items"]), 1)

        # The production deploy performs an idempotent migration sync. A second
        # execution must not touch any post-reset data.
        self._run_migration_sql()
        self.assertEqual(
            self.session.execute(text("SELECT COUNT(*) FROM product WHERE id = 990003")).scalar_one(),
            1,
        )


if __name__ == "__main__":
    import unittest

    unittest.main()
