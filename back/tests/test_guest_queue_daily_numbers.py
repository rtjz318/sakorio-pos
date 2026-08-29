"""Stable tenant-local daily guest queue number contract."""
from __future__ import annotations

import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
from uuid import uuid4
from zoneinfo import ZoneInfo

from pg_client_mixin import PgClientTestCase
from sqlalchemy import delete
from sqlmodel import Session

from app import models, security
from app.db import engine


def _bearer_headers(user: models.User) -> dict[str, str]:
    token = security.create_access_token(
        {
            "sub": user.email,
            "tenant_id": user.tenant_id,
            "provider_id": getattr(user, "provider_id", None),
            "token_version": user.token_version,
        },
        expires_delta=timedelta(minutes=30),
    )
    return {"Authorization": f"Bearer {token}"}


class TestGuestQueueDailyNumbers(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        now_utc = datetime.now(timezone.utc)
        timezone_name = next(
            name
            for name in ("Pacific/Pago_Pago", "Pacific/Kiritimati")
            if now_utc.astimezone(ZoneInfo(name)).date() != now_utc.date()
        )
        tenant = models.Tenant(
            name=f"Queue Number Tenant {uuid4().hex[:8]}",
            timezone=timezone_name,
        )
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)
        self.tenant = tenant
        self.local_today = now_utc.astimezone(ZoneInfo(timezone_name)).date()

        owner = models.User(
            email=f"queue-number-owner-{uuid4().hex[:8]}@sakario.sg",
            hashed_password=security.get_password_hash("x"),
            full_name="Owner",
            tenant_id=tenant.id,
            role=models.UserRole.owner,
        )
        self.session.add(owner)
        self.session.commit()
        self.session.refresh(owner)
        self.headers = _bearer_headers(owner)

    def _staff_join(self, name: str, phone: str) -> dict:
        response = self.client.post(
            "/queue",
            headers=self.headers,
            json={"customer_name": name, "customer_phone": phone, "party_size": 2},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return response.json()

    def test_numbers_are_daily_sequential_and_not_database_ids(self) -> None:
        first = self._staff_join("First Party", "+6592000001")
        second = self._staff_join("Second Party", "+6592000002")

        self.assertEqual(first["service_date"], self.local_today.isoformat())
        self.assertEqual(first["queue_number"], 1)
        self.assertEqual(first["queue_label"], "Q001")
        self.assertEqual(first["status_version"], 1)
        self.assertEqual(second["queue_number"], 2)
        self.assertEqual(second["queue_label"], "Q002")

    def test_public_payload_uses_stable_label_and_omits_phone(self) -> None:
        created = self.client.post(
            f"/public/tenants/{self.tenant.id}/queue",
            json={
                "customer_name": "Public Party",
                "customer_phone": "+6592000003",
                "party_size": 3,
            },
        )
        self.assertEqual(created.status_code, 200, created.text)
        body = created.json()
        self.assertEqual(body["reference"], body["queue_label"])
        self.assertEqual(body["queue_label"], "Q001")
        self.assertEqual(body["position"], 1)
        self.assertNotIn("customer_phone", body)

        repeated = self.client.post(
            f"/public/tenants/{self.tenant.id}/queue",
            json={
                "customer_name": "Public Party Again",
                "customer_phone": "+6592000003",
                "party_size": 3,
            },
        )
        self.assertEqual(repeated.status_code, 200, repeated.text)
        self.assertEqual(repeated.json()["queue_label"], "Q001")
        self.assertEqual(repeated.json()["token"], body["token"])

    def test_status_version_increments_on_mutation(self) -> None:
        created = self._staff_join("Version Party", "+6592000004")
        updated = self.client.put(
            f"/queue/{created['id']}/status",
            headers=self.headers,
            json={"status": "notified"},
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertGreater(updated.json()["status_version"], created["status_version"])
        self.assertEqual(updated.json()["queue_label"], created["queue_label"])


class TestGuestQueueConcurrentNumbers(unittest.TestCase):
    """Exercise the database trigger with independent concurrent transactions."""

    def setUp(self) -> None:
        with Session(engine) as session:
            tenant = models.Tenant(
                name=f"Queue Concurrency Tenant {uuid4().hex[:8]}",
                timezone="Asia/Singapore",
            )
            session.add(tenant)
            session.commit()
            session.refresh(tenant)
            self.tenant_id = tenant.id

    def tearDown(self) -> None:
        with Session(engine) as session:
            session.exec(
                delete(models.GuestQueueEntry).where(
                    models.GuestQueueEntry.tenant_id == self.tenant_id
                )
            )
            session.exec(
                delete(models.GuestQueueCounter).where(
                    models.GuestQueueCounter.tenant_id == self.tenant_id
                )
            )
            tenant = session.get(models.Tenant, self.tenant_id)
            if tenant is not None:
                session.delete(tenant)
                session.commit()

    def _join(self, index: int) -> int:
        with Session(engine) as session:
            row = models.GuestQueueEntry(
                tenant_id=self.tenant_id,
                customer_name=f"Concurrent Party {index}",
                customer_phone=f"+6593{index:06d}",
                party_size=2,
                source=models.GuestQueueSource.web_waitlist,
            )
            session.add(row)
            session.commit()
            session.refresh(row)
            assert row.queue_number is not None
            return row.queue_number

    def test_twenty_simultaneous_joins_receive_unique_sequence(self) -> None:
        with ThreadPoolExecutor(max_workers=20) as executor:
            numbers = list(executor.map(self._join, range(20)))

        self.assertEqual(sorted(numbers), list(range(1, 21)))
