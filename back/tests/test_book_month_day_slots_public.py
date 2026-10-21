"""Public GET /reservations/book-month-day-states and book-day-slots — month grid for /book (GitHub #126)."""

import json
import unittest
from datetime import date, timedelta

from pg_client_mixin import PgClientTestCase

from app import models


class TestBookMonthDaySlotsPublic(PgClientTestCase):
    def setUp(self):
        super().setUp()
        oh = {
            "monday": {"open": "10:00", "close": "22:00"},
            "tuesday": {"open": "10:00", "close": "22:00"},
            "wednesday": {"open": "10:00", "close": "22:00"},
            "thursday": {"open": "10:00", "close": "22:00"},
            "friday": {"open": "10:00", "close": "22:00"},
            "saturday": {"open": "10:00", "close": "22:00"},
            "sunday": {"closed": True},
        }
        self.tenant = models.Tenant(
            name="Month Grid Tenant",
            timezone="UTC",
            opening_hours=json.dumps(oh),
        )
        self.session.add(self.tenant)
        self.session.commit()
        self.session.refresh(self.tenant)

        floor = models.Floor(name="Main", tenant_id=self.tenant.id)
        self.session.add(floor)
        self.session.commit()
        self.session.refresh(floor)

        tbl = models.Table(
            name="MG-01",
            tenant_id=self.tenant.id,
            floor_id=floor.id,
            seat_count=4,
            is_active=False,
        )
        self.session.add(tbl)
        self.session.commit()

    def test_book_month_day_states_shape(self):
        today = date.today()
        r = self.client.get(
            "/reservations/book-month-day-states",
            params={
                "tenant_id": self.tenant.id,
                "year": today.year,
                "month": today.month,
                "party_size": 2,
            },
        )
        self.assertEqual(r.status_code, 200, r.text)
        b = r.json()
        self.assertEqual(b["year"], today.year)
        self.assertEqual(b["month"], today.month)
        self.assertIn("days", b)
        self.assertGreaterEqual(len(b["days"]), 28)
        for row in b["days"]:
            self.assertIn("date", row)
            self.assertIn("state", row)
            self.assertIn(
                row["state"],
                (
                    "available",
                    "full",
                    "past",
                    "closed_day",
                    "out_of_hours",
                    "out_of_range",
                ),
            )

    def test_book_month_unknown_tenant(self):
        r = self.client.get(
            "/reservations/book-month-day-states",
            params={"tenant_id": 999999999, "year": 2026, "month": 3, "party_size": 1},
        )
        self.assertEqual(r.status_code, 404, r.text)

    def test_book_day_slots_shape(self):
        d = (date.today() + timedelta(days=1)).isoformat()
        r = self.client.get(
            "/reservations/book-day-slots",
            params={"tenant_id": self.tenant.id, "date": d, "party_size": 2},
        )
        self.assertEqual(r.status_code, 200, r.text)
        b = r.json()
        self.assertEqual(b["date"], d)
        self.assertIn("times", b)
        self.assertIn("cells", b)
        for t in b["times"]:
            self.assertIn(t, b["cells"])
            self.assertIn(
                b["cells"][t],
                (
                    "available",
                    "full",
                    "past",
                    "closed_day",
                    "out_of_hours",
                    "out_of_range",
                ),
            )

    def test_book_day_slots_bad_date(self):
        r = self.client.get(
            "/reservations/book-day-slots",
            params={"tenant_id": self.tenant.id, "date": "not-a-date", "party_size": 2},
        )
        self.assertEqual(r.status_code, 400, r.text)

    def test_book_day_slots_support_overnight_service(self):
        overnight = {
            day: {"open": "18:30", "close": "04:30"}
            for day in [
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday",
            ]
        }
        overnight["sunday"] = {"closed": True}
        self.tenant.opening_hours = json.dumps(overnight)
        self.tenant.reservation_slot_minutes = 30
        self.session.add(self.tenant)
        self.session.commit()

        today = date.today()
        days_until_tuesday = (1 - today.weekday()) % 7 or 7
        tuesday = today + timedelta(days=days_until_tuesday)
        response = self.client.get(
            "/reservations/book-day-slots",
            params={
                "tenant_id": self.tenant.id,
                "date": tuesday.isoformat(),
                "party_size": 2,
            },
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["cells"]["00:00"], "available")
        self.assertEqual(body["cells"]["03:30"], "available")
        self.assertEqual(body["cells"]["18:30"], "available")
        self.assertEqual(body["cells"]["23:30"], "available")

        sunday = tuesday + timedelta(days=5)
        sunday_response = self.client.get(
            "/reservations/book-day-slots",
            params={
                "tenant_id": self.tenant.id,
                "date": sunday.isoformat(),
                "party_size": 2,
            },
        )
        self.assertEqual(sunday_response.status_code, 200, sunday_response.text)
        sunday_body = sunday_response.json()
        self.assertEqual(sunday_body["cells"]["00:00"], "available")
        self.assertNotIn("18:30", sunday_body["times"])


if __name__ == "__main__":
    unittest.main()
