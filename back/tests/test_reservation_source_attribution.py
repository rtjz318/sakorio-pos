"""Reservation creation persists an explicit reporting source."""

from __future__ import annotations

from datetime import date, timedelta
from uuid import uuid4

from pg_client_mixin import PgClientTestCase
from sqlmodel import select

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


class TestReservationSourceAttribution(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        self.tenant = models.Tenant(
            name=f"Reservation Source Tenant {uuid4().hex[:8]}",
            timezone="UTC",
        )
        self.session.add(self.tenant)
        self.session.commit()
        self.session.refresh(self.tenant)

        self.floor = models.Floor(
            name="Main",
            tenant_id=self.tenant.id,
            is_active=True,
        )
        self.session.add(self.floor)
        self.session.commit()
        self.session.refresh(self.floor)
        for index in range(2):
            self.session.add(
                models.Table(
                    name=f"RS-{index + 1}",
                    tenant_id=self.tenant.id,
                    floor_id=self.floor.id,
                    seat_count=4,
                )
            )

        self.owner = models.User(
            email=f"reservation-source-owner-{uuid4().hex[:8]}@sakario.sg",
            hashed_password=security.get_password_hash("x"),
            full_name="Owner",
            tenant_id=self.tenant.id,
            role=models.UserRole.owner,
        )
        self.session.add(self.owner)
        self.session.commit()

    def test_public_and_staff_creations_keep_distinct_sources(self) -> None:
        booking_date = (date.today() + timedelta(days=1)).isoformat()
        public_response = self.client.post(
            "/reservations",
            json={
                "tenant_id": self.tenant.id,
                "customer_name": "Public Guest",
                "customer_phone": "+6591111111",
                "reservation_date": booking_date,
                "reservation_time": "12:00",
                "party_size": 2,
            },
        )
        self.assertEqual(public_response.status_code, 200, public_response.text)
        self.assertEqual(public_response.json()["source"], "public")

        staff_response = self.client.post(
            "/reservations",
            headers=_bearer_headers(self.owner),
            json={
                "customer_name": "Staff Guest",
                "customer_phone": "+6592222222",
                "reservation_date": booking_date,
                "reservation_time": "12:15",
                "party_size": 2,
            },
        )
        self.assertEqual(staff_response.status_code, 200, staff_response.text)
        self.assertEqual(staff_response.json()["source"], "staff")

        rows = self.session.exec(
            select(models.Reservation).where(models.Reservation.tenant_id == self.tenant.id)
        ).all()
        self.assertEqual(
            {row.customer_name: row.source for row in rows},
            {
                "Public Guest": models.ReservationSource.public,
                "Staff Guest": models.ReservationSource.staff,
            },
        )


if __name__ == "__main__":
    import unittest

    unittest.main()
