"""Guest queue duplicate protection for active staff-created entries."""
from __future__ import annotations

import unittest
from datetime import timedelta
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


class TestGuestQueueDuplicates(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        tenant = models.Tenant(name=f"Queue Duplicate Tenant {uuid4().hex[:8]}")
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)

        owner = models.User(
            email=f"queue-dup-owner-{uuid4().hex[:8]}@sakario.sg",
            hashed_password=security.get_password_hash("x"),
            full_name="Owner",
            tenant_id=tenant.id,
            role=models.UserRole.owner,
        )
        self.session.add(owner)
        self.session.commit()
        self.session.refresh(owner)
        self.headers = _bearer_headers(owner)

    def test_staff_queue_create_rejects_duplicate_active_phone(self) -> None:
        first = self.client.post(
            "/queue",
            headers=self.headers,
            json={
                "customer_name": "Queue Alpha",
                "customer_phone": "+65 9100 0001",
                "party_size": 2,
                "quoted_wait_minutes": 10,
            },
        )
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(first.json()["customer_phone"], "+6591000001")

        duplicate = self.client.post(
            "/queue",
            headers=self.headers,
            json={
                "customer_name": "Queue Alpha Again",
                "customer_phone": "+6591000001",
                "party_size": 2,
                "quoted_wait_minutes": 15,
            },
        )
        self.assertEqual(duplicate.status_code, 409, duplicate.text)
        self.assertIn("already in the active queue", duplicate.json()["detail"])

    def test_staff_queue_update_rejects_collision_with_another_active_phone(self) -> None:
        first = self.client.post(
            "/queue",
            headers=self.headers,
            json={"customer_name": "Queue Bravo", "customer_phone": "+65 9100 0002", "party_size": 2},
        )
        second = self.client.post(
            "/queue",
            headers=self.headers,
            json={"customer_name": "Queue Charlie", "customer_phone": "+65 9100 0003", "party_size": 3},
        )
        self.assertEqual(first.status_code, 200, first.text)
        self.assertEqual(second.status_code, 200, second.text)

        collision = self.client.put(
            f"/queue/{second.json()['id']}",
            headers=self.headers,
            json={"customer_phone": "+6591000002"},
        )
        self.assertEqual(collision.status_code, 409, collision.text)
        self.assertIn("already in the active queue", collision.json()["detail"])

    def test_staff_queue_create_allows_same_phone_after_previous_entry_closed(self) -> None:
        first = self.client.post(
            "/queue",
            headers=self.headers,
            json={"customer_name": "Queue Delta", "customer_phone": "+65 9100 0004", "party_size": 2},
        )
        self.assertEqual(first.status_code, 200, first.text)
        closed = self.client.put(
            f"/queue/{first.json()['id']}/status",
            headers=self.headers,
            json={"status": "cancelled", "reason": "duplicate test cleanup"},
        )
        self.assertEqual(closed.status_code, 200, closed.text)

        second = self.client.post(
            "/queue",
            headers=self.headers,
            json={"customer_name": "Queue Delta Return", "customer_phone": "+6591000004", "party_size": 2},
        )
        self.assertEqual(second.status_code, 200, second.text)


if __name__ == "__main__":
    unittest.main()
