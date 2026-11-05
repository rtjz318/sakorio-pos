"""Queue reporting preserves the seated outcome after the live visit is completed."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
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


class TestQueueConversionReport(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        tenant = models.Tenant(
            name=f"Queue Report Tenant {uuid4().hex[:8]}",
            timezone="Asia/Singapore",
        )
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)

        owner = models.User(
            email=f"queue-report-owner-{uuid4().hex[:8]}@sakario.sg",
            hashed_password=security.get_password_hash("x"),
            full_name="Owner",
            tenant_id=tenant.id,
            role=models.UserRole.owner,
        )
        self.session.add(owner)
        self.session.commit()
        self.session.refresh(owner)

        self.tenant = tenant
        self.headers = _bearer_headers(owner)

    def test_completed_seated_visit_counts_in_conversion_and_daily_throughput(self) -> None:
        now = datetime.now(timezone.utc)
        seated = models.GuestQueueEntry(
            tenant_id=self.tenant.id,
            customer_name="Completed seated party",
            customer_phone="+6591111111",
            party_size=2,
            status=models.GuestQueueStatus.completed,
            source=models.GuestQueueSource.staff_manual,
            requested_at=now - timedelta(minutes=20),
            seated_at=now - timedelta(minutes=10),
            completed_at=now,
        )
        cancelled = models.GuestQueueEntry(
            tenant_id=self.tenant.id,
            customer_name="Cancelled party",
            customer_phone="+6592222222",
            party_size=2,
            status=models.GuestQueueStatus.cancelled,
            source=models.GuestQueueSource.staff_manual,
            requested_at=now - timedelta(minutes=15),
            completed_at=now,
        )
        self.session.add(seated)
        self.session.add(cancelled)
        self.session.commit()

        today = date.today().isoformat()
        response = self.client.get(
            f"/reports/sales?from_date={today}&to_date={today}",
            headers=self.headers,
        )
        self.assertEqual(response.status_code, 200, response.text)

        queue = response.json()["queue"]
        self.assertEqual(queue["total"], 2)
        self.assertEqual(queue["seated_count"], 1)
        self.assertEqual(queue["seat_conversion_pct"], 50.0)
        self.assertEqual(len(queue["daily"]), 1)
        self.assertEqual(queue["daily"][0]["count"], 2)
        self.assertEqual(queue["daily"][0]["seated_count"], 1)

    def test_reservation_report_uses_explicit_source_even_when_all_have_tokens(self) -> None:
        today = date.today()
        for index, source in enumerate(
            [
                models.ReservationSource.public,
                models.ReservationSource.staff,
                models.ReservationSource.queue,
            ],
            start=1,
        ):
            self.session.add(
                models.Reservation(
                    tenant_id=self.tenant.id,
                    customer_name=f"Source {source.value}",
                    customer_phone=f"+659100000{index}",
                    reservation_date=today,
                    reservation_time=datetime.now().time().replace(microsecond=0),
                    party_size=2,
                    token=str(uuid4()),
                    source=source,
                )
            )
        self.session.commit()

        response = self.client.get(
            f"/reports/sales?from_date={today.isoformat()}&to_date={today.isoformat()}",
            headers=self.headers,
        )
        self.assertEqual(response.status_code, 200, response.text)
        by_source = {
            row["source"]: row["count"] for row in response.json()["reservations"]["by_source"]
        }
        self.assertEqual(by_source, {"public": 1, "queue": 1, "staff": 1})


if __name__ == "__main__":
    import unittest

    unittest.main()
