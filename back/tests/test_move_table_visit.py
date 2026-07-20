"""POST /tables/{id}/move-bill moves seated visits before orders exist."""
from __future__ import annotations

import unittest
from datetime import date, time, timedelta
from uuid import uuid4

from pg_client_mixin import PgClientTestCase

from app import models, security


def _bearer_headers(user: models.User) -> dict[str, str]:
    data = {
        "sub": user.email,
        "tenant_id": user.tenant_id,
        "provider_id": getattr(user, "provider_id", None),
        "token_version": user.token_version,
    }
    token = security.create_access_token(data, expires_delta=timedelta(minutes=30))
    return {"Authorization": f"Bearer {token}"}


class TestMoveTableVisit(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        tenant = models.Tenant(name="MoveTable Tenant")
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)

        owner = models.User(
            email=f"move-table-owner-{uuid4().hex[:8]}@sakario.sg",
            hashed_password=security.get_password_hash("x"),
            full_name="Owner",
            tenant_id=tenant.id,
            role=models.UserRole.owner,
        )
        self.session.add(owner)
        self.session.commit()
        self.session.refresh(owner)
        self.owner = owner

        floor = models.Floor(name="Main", sort_order=0, tenant_id=tenant.id)
        self.session.add(floor)
        self.session.commit()
        self.session.refresh(floor)

        source = models.Table(
            name="T-source",
            token=f"tok-source-{uuid4().hex}",
            floor_id=floor.id,
            tenant_id=tenant.id,
            x_position=0,
            y_position=0,
            rotation=0,
            shape="rectangle",
            width=1,
            height=1,
            seat_count=4,
            is_active=True,
        )
        target = models.Table(
            name="T-target",
            token=f"tok-target-{uuid4().hex}",
            floor_id=floor.id,
            tenant_id=tenant.id,
            x_position=2,
            y_position=0,
            rotation=0,
            shape="rectangle",
            width=1,
            height=1,
            seat_count=4,
            is_active=False,
        )
        self.session.add(source)
        self.session.add(target)
        self.session.commit()
        self.session.refresh(source)
        self.session.refresh(target)
        self.source_id = source.id
        self.target_id = target.id

        reservation = models.Reservation(
            tenant_id=tenant.id,
            customer_name="Moving Party",
            customer_phone="+1000000002",
            reservation_date=date.today(),
            reservation_time=time(12, 0),
            party_size=2,
            status=models.ReservationStatus.seated,
            table_id=source.id,
            token=f"tok-res-{uuid4().hex}",
        )
        queue_entry = models.GuestQueueEntry(
            tenant_id=tenant.id,
            customer_name="Moving Walk-in",
            customer_phone="+1000000003",
            party_size=2,
            status=models.GuestQueueStatus.seated,
            source=models.GuestQueueSource.staff_manual,
            seated_table_id=source.id,
        )
        self.session.add(reservation)
        self.session.add(queue_entry)
        self.session.commit()
        self.session.refresh(reservation)
        self.session.refresh(queue_entry)
        self.reservation_id = reservation.id
        self.queue_entry_id = queue_entry.id

    def test_move_seated_visit_without_live_bill(self) -> None:
        headers = _bearer_headers(self.owner)

        response = self.client.post(
            f"/tables/{self.source_id}/move-bill",
            json={"target_table_id": self.target_id, "reason": "Guest requested quieter table"},
            headers=headers,
        )
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        self.assertEqual(payload["status"], "moved")
        self.assertEqual(payload["active_order_id"], None)
        self.assertEqual(payload["moved_order_ids"], [])
        self.assertEqual(payload["moved_reservation_ids"], [self.reservation_id])
        self.assertEqual(payload["moved_queue_entry_ids"], [self.queue_entry_id])

        self.session.expire_all()
        source = self.session.get(models.Table, self.source_id)
        target = self.session.get(models.Table, self.target_id)
        reservation = self.session.get(models.Reservation, self.reservation_id)
        queue_entry = self.session.get(models.GuestQueueEntry, self.queue_entry_id)
        assert source is not None and target is not None and reservation is not None and queue_entry is not None
        self.assertFalse(source.is_active)
        self.assertTrue(target.is_active)
        self.assertEqual(reservation.table_id, self.target_id)
        self.assertEqual(queue_entry.seated_table_id, self.target_id)


if __name__ == "__main__":
    unittest.main()
