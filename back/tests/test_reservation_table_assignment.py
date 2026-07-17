"""Advance reservation table assignment must be slot-safe and non-operational."""
from __future__ import annotations

import unittest
from datetime import date, time, timedelta
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


class TestReservationTableAssignment(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        tenant = models.Tenant(
            name=f"Assignment Tenant {uuid4().hex[:8]}",
            reservation_average_table_turn_minutes=90,
        )
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)

        owner = models.User(
            email=f"assignment-owner-{uuid4().hex[:8]}@sakorio.sg",
            hashed_password=security.get_password_hash("x"),
            full_name="Owner",
            tenant_id=tenant.id,
            role=models.UserRole.owner,
        )
        self.session.add(owner)
        self.session.commit()
        self.session.refresh(owner)
        self.headers = _bearer_headers(owner)

        floor = models.Floor(name="Main", sort_order=0, tenant_id=tenant.id)
        self.session.add(floor)
        self.session.commit()
        self.session.refresh(floor)

        table = models.Table(
            name="T1",
            token=f"assignment-table-{uuid4().hex}",
            floor_id=floor.id,
            tenant_id=tenant.id,
            seat_count=4,
            is_active=False,
        )
        self.session.add(table)
        self.session.commit()
        self.session.refresh(table)

        self.tenant_id = tenant.id
        self.table_id = table.id
        self.booking_date = date.today() + timedelta(days=1)

    def _reservation(self, at: time, name: str) -> models.Reservation:
        reservation = models.Reservation(
            tenant_id=self.tenant_id,
            customer_name=name,
            customer_phone="+6590000000",
            reservation_date=self.booking_date,
            reservation_time=at,
            party_size=2,
            status=models.ReservationStatus.booked,
            token=f"assignment-reservation-{uuid4().hex}",
        )
        self.session.add(reservation)
        self.session.commit()
        self.session.refresh(reservation)
        return reservation

    def _assign(self, reservation: models.Reservation):
        return self.client.put(
            f"/reservations/{reservation.id}/assign-table",
            headers=self.headers,
            json={"table_id": self.table_id},
        )

    def test_assignment_keeps_future_booking_and_table_inactive(self) -> None:
        reservation = self._reservation(time(18, 0), "Future Party")

        response = self._assign(reservation)

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["status"], "booked")
        self.assertEqual(response.json()["table_id"], self.table_id)
        self.assertIsNone(response.json()["seated_at"])
        self.session.expire_all()
        table = self.session.get(models.Table, self.table_id)
        self.assertIsNotNone(table)
        assert table is not None
        self.assertFalse(table.is_active)

        table_status = self.client.get("/tables/with-status", headers=self.headers)
        self.assertEqual(table_status.status_code, 200, table_status.text)
        table_row = next(row for row in table_status.json() if row["id"] == self.table_id)
        self.assertEqual(
            table_row["upcoming_reservation"]["reservation_date"],
            self.booking_date.isoformat(),
        )

    def test_overlapping_assignment_is_rejected(self) -> None:
        first = self._reservation(time(18, 0), "First Party")
        second = self._reservation(time(18, 30), "Overlapping Party")
        self.assertEqual(self._assign(first).status_code, 200)

        response = self._assign(second)

        self.assertEqual(response.status_code, 409, response.text)
        self.assertIn("another reservation", response.json()["detail"])

    def test_non_overlapping_booking_does_not_block_seating(self) -> None:
        arriving = self._reservation(time(18, 0), "Arriving Party")
        later = self._reservation(time(20, 0), "Later Party")
        self.assertEqual(self._assign(arriving).status_code, 200)
        self.assertEqual(self._assign(later).status_code, 200)

        response = self.client.put(
            f"/reservations/{arriving.id}/seat",
            headers=self.headers,
            json={"table_id": self.table_id},
        )

        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["status"], "seated")
        self.session.expire_all()
        table = self.session.get(models.Table, self.table_id)
        self.assertIsNotNone(table)
        assert table is not None
        self.assertTrue(table.is_active)


if __name__ == "__main__":
    unittest.main()
