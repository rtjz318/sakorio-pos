"""Guest queue live summaries exclude stale active rows."""
from __future__ import annotations

import unittest
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from pg_client_mixin import PgClientTestCase

from app import models, security


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


class TestGuestQueueSummaryStaleRows(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        tenant = models.Tenant(name=f"Queue Summary Tenant {uuid4().hex[:8]}")
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)
        self.tenant = tenant

        owner = models.User(
            email=f"queue-summary-owner-{uuid4().hex[:8]}@sakario.sg",
            hashed_password=security.get_password_hash("x"),
            full_name="Owner",
            tenant_id=tenant.id,
            role=models.UserRole.owner,
        )
        self.session.add(owner)
        self.session.commit()
        self.session.refresh(owner)
        self.headers = _bearer_headers(owner)

    def _add_queue_row(
        self,
        *,
        name: str,
        status: models.GuestQueueStatus,
        party_size: int,
        requested_at: datetime,
    ) -> models.GuestQueueEntry:
        row = models.GuestQueueEntry(
            tenant_id=self.tenant.id,
            customer_name=name,
            customer_phone=f"+659{uuid4().hex[:7]}",
            party_size=party_size,
            status=status,
            requested_at=requested_at,
            source=models.GuestQueueSource.web_waitlist,
        )
        self.session.add(row)
        self.session.commit()
        self.session.refresh(row)
        return row

    def test_staff_queue_summary_counts_only_non_stale_active_rows(self) -> None:
        now = datetime.now(timezone.utc)
        self._add_queue_row(
            name="Fresh waiting",
            status=models.GuestQueueStatus.waiting,
            party_size=2,
            requested_at=now - timedelta(minutes=5),
        )
        self._add_queue_row(
            name="Stale waiting",
            status=models.GuestQueueStatus.waiting,
            party_size=4,
            requested_at=now - timedelta(hours=13),
        )
        self._add_queue_row(
            name="Fresh notified",
            status=models.GuestQueueStatus.notified,
            party_size=3,
            requested_at=now - timedelta(minutes=30),
        )

        response = self.client.get("/queue/summary", headers=self.headers)
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()

        self.assertEqual(body["total_entries"], 2)
        self.assertEqual(body["waiting_guests"], 2)
        self.assertEqual(body["notified_guests"], 3)
        self.assertEqual(body["counts"]["waiting"], 1)
        self.assertEqual(body["counts"]["notified"], 1)

    def test_public_queue_info_counts_only_non_stale_waiting_and_notified_rows(self) -> None:
        now = datetime.now(timezone.utc)
        self._add_queue_row(
            name="Fresh public",
            status=models.GuestQueueStatus.waiting,
            party_size=2,
            requested_at=now - timedelta(minutes=10),
        )
        self._add_queue_row(
            name="Stale public",
            status=models.GuestQueueStatus.notified,
            party_size=5,
            requested_at=now - timedelta(hours=13),
        )

        response = self.client.get(f"/public/tenants/{self.tenant.id}/queue")
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()

        self.assertEqual(body["active_entries"], 1)
        self.assertEqual(body["waiting_guests"], 2)


if __name__ == "__main__":
    unittest.main()
