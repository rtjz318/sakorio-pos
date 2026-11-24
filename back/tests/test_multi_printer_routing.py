"""PostgreSQL routing coverage for one tablet with two station printer profiles."""

from __future__ import annotations

import hashlib

from pg_client_mixin import PgClientTestCase

from app import models


class TestMultiPrinterRouting(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        tenant = models.Tenant(name="Two Printer Ramen")
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)

        ramen_station = models.KitchenStation(
            tenant_id=tenant.id,
            name="Ramen — Printer 1",
            display_route="kitchen",
        )
        other_station = models.KitchenStation(
            tenant_id=tenant.id,
            name="Other Food & Drinks — Printer 2",
            display_route="kitchen",
        )
        table = models.Table(tenant_id=tenant.id, name="T01")
        self.session.add(ramen_station)
        self.session.add(other_station)
        self.session.add(table)
        self.session.commit()
        self.session.refresh(ramen_station)
        self.session.refresh(other_station)
        self.session.refresh(table)

        order = models.Order(tenant_id=tenant.id, table_id=table.id)
        self.session.add(order)
        self.session.commit()
        self.session.refresh(order)

        self.ramen_token = "ramen-printer-token"
        self.other_token = "other-printer-token"
        self.session.add(
            models.PrinterAgent(
                tenant_id=tenant.id,
                name="Printer 1",
                token_hash=_hash(self.ramen_token),
                kitchen_station_id=ramen_station.id,
                receives_customer_receipts=False,
            )
        )
        self.session.add(
            models.PrinterAgent(
                tenant_id=tenant.id,
                name="Printer 2",
                token_hash=_hash(self.other_token),
                kitchen_station_id=other_station.id,
                receives_customer_receipts=True,
            )
        )
        self.session.add(
            models.PrintJob(
                tenant_id=tenant.id,
                order_id=order.id,
                kitchen_station_id=ramen_station.id,
                job_type="kitchen_receipt",
                dedupe_key=f"routing:{order.id}:ramen",
                payload={"station_name": ramen_station.name, "items": [{"name": "Ramen"}]},
            )
        )
        self.session.add(
            models.PrintJob(
                tenant_id=tenant.id,
                order_id=order.id,
                kitchen_station_id=other_station.id,
                job_type="kitchen_receipt",
                dedupe_key=f"routing:{order.id}:fried",
                payload={"station_name": other_station.name, "items": [{"name": "Karaage"}]},
            )
        )
        self.session.add(
            models.PrintJob(
                tenant_id=tenant.id,
                order_id=order.id,
                kitchen_station_id=None,
                job_type="customer_receipt",
                dedupe_key=f"routing:{order.id}:customer",
                payload={"station_name": "Customer Copy", "items": [{"name": "Ramen"}]},
            )
        )
        self.session.commit()

    def test_printer_two_gets_other_station_and_customer_receipt_only(self) -> None:
        response = self.client.post(
            "/printer-agent/jobs/lease?limit=5",
            headers={"X-Printer-Agent-Token": self.other_token},
        )
        self.assertEqual(response.status_code, 200, response.text)
        jobs = response.json()
        self.assertEqual({job["job_type"] for job in jobs}, {"kitchen_receipt", "customer_receipt"})
        self.assertEqual(len(jobs), 2)
        self.assertNotIn("Ramen — Printer 1", {job["payload"]["station_name"] for job in jobs})

        ramen_response = self.client.post(
            "/printer-agent/jobs/lease?limit=5",
            headers={"X-Printer-Agent-Token": self.ramen_token},
        )
        self.assertEqual(ramen_response.status_code, 200, ramen_response.text)
        ramen_jobs = ramen_response.json()
        self.assertEqual(len(ramen_jobs), 1)
        self.assertEqual(ramen_jobs[0]["payload"]["station_name"], "Ramen — Printer 1")


def _hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


if __name__ == "__main__":
    import unittest

    unittest.main()
