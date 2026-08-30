"""Guest feedback public POST and tenant list."""
import unittest
from datetime import date, time

from pg_client_mixin import PgClientTestCase
from sqlmodel import select

from app import models


class TestGuestFeedback(PgClientTestCase):
    def setUp(self):
        super().setUp()
        tenant = models.Tenant(
            name="T1",
            address="123 Main St",
            public_google_review_url="https://g.page/r/test-place/review",
            public_google_maps_url="https://maps.google.com/?q=Test",
        )
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)
        self.tenant_id = tenant.id
        res = models.Reservation(
            tenant_id=self.tenant_id,
            customer_name="A",
            customer_phone="+34123456789",
            reservation_date=date.today(),
            reservation_time=time(20, 0),
            party_size=2,
            status=models.ReservationStatus.finished,
            token="tok-test-1",
        )
        self.session.add(res)
        self.session.commit()
        self.session.refresh(res)
        self.res_id = res.id

    def test_public_tenant_includes_google_review_url(self):
        r = self.client.get(f"/public/tenants/{self.tenant_id}")
        self.assertEqual(r.status_code, 200, r.text)
        data = r.json()
        self.assertEqual(data.get("public_google_review_url"), "https://g.page/r/test-place/review")
        self.assertEqual(data.get("public_google_maps_url"), "https://maps.google.com/?q=Test")
        self.assertIsNone(data.get("public_openstreetmap_url"))
        self.assertEqual(data.get("address"), "123 Main St")
        self.assertIsNone(data.get("terms_of_service_url"))
        self.assertIsNone(data.get("privacy_policy_url"))

    def test_public_legal_urls_endpoint(self):
        from app.settings import settings

        prev_t = settings.public_terms_of_service_url
        prev_p = settings.public_privacy_policy_url
        settings.public_terms_of_service_url = "https://legal.example/tos"
        settings.public_privacy_policy_url = "https://legal.example/privacy"
        try:
            r = self.client.get("/public/legal-urls")
            self.assertEqual(r.status_code, 200, r.text)
            d = r.json()
            self.assertEqual(d.get("terms_of_service_url"), "https://legal.example/tos")
            self.assertEqual(d.get("privacy_policy_url"), "https://legal.example/privacy")
        finally:
            settings.public_terms_of_service_url = prev_t
            settings.public_privacy_policy_url = prev_p

    def test_public_legal_urls_fallback_to_app_base(self):
        from app.settings import settings

        prev_base = settings.public_app_base_url
        prev_t = settings.public_terms_of_service_url
        prev_p = settings.public_privacy_policy_url
        settings.public_app_base_url = "https://app.example"
        settings.public_terms_of_service_url = ""
        settings.public_privacy_policy_url = ""
        try:
            r = self.client.get("/public/legal-urls")
            self.assertEqual(r.status_code, 200, r.text)
            d = r.json()
            self.assertEqual(d.get("terms_of_service_url"), "https://app.example/terms")
            self.assertEqual(d.get("privacy_policy_url"), "https://app.example/privacy")
        finally:
            settings.public_app_base_url = prev_base
            settings.public_terms_of_service_url = prev_t
            settings.public_privacy_policy_url = prev_p

    def test_public_legal_urls_explicit_overrides_app_base(self):
        from app.settings import settings

        prev_base = settings.public_app_base_url
        prev_t = settings.public_terms_of_service_url
        prev_p = settings.public_privacy_policy_url
        settings.public_app_base_url = "https://wrong.example"
        settings.public_terms_of_service_url = "https://right.example/tos"
        settings.public_privacy_policy_url = "https://right.example/privacy"
        try:
            r = self.client.get("/public/legal-urls")
            self.assertEqual(r.status_code, 200, r.text)
            d = r.json()
            self.assertEqual(d.get("terms_of_service_url"), "https://right.example/tos")
            self.assertEqual(d.get("privacy_policy_url"), "https://right.example/privacy")
        finally:
            settings.public_app_base_url = prev_base
            settings.public_terms_of_service_url = prev_t
            settings.public_privacy_policy_url = prev_p

    def test_public_tenant_legal_urls_tenant_overrides_global(self):
        from app.settings import settings

        tenant = self.session.get(models.Tenant, self.tenant_id)
        assert tenant is not None
        tenant.public_terms_of_service_url = "https://tenant.example/terms"
        tenant.public_privacy_policy_url = None
        self.session.add(tenant)
        self.session.commit()

        prev_t = settings.public_terms_of_service_url
        prev_p = settings.public_privacy_policy_url
        settings.public_terms_of_service_url = "https://global.example/tos"
        settings.public_privacy_policy_url = "https://global.example/privacy"
        try:
            r = self.client.get(f"/public/tenants/{self.tenant_id}")
            self.assertEqual(r.status_code, 200, r.text)
            d = r.json()
            self.assertEqual(d.get("terms_of_service_url"), "https://tenant.example/terms")
            self.assertEqual(d.get("privacy_policy_url"), "https://global.example/privacy")
        finally:
            settings.public_terms_of_service_url = prev_t
            settings.public_privacy_policy_url = prev_p

    def test_submit_guest_feedback_minimal(self):
        r = self.client.post(
            f"/public/tenants/{self.tenant_id}/guest-feedback",
            json={"rating": 5, "comment": "Great"},
        )
        self.assertEqual(r.status_code, 200, r.text)
        self.assertTrue(r.json().get("ok"))
        row = self.session.exec(
            select(models.GuestFeedback)
            .where(models.GuestFeedback.tenant_id == self.tenant_id)
            .order_by(models.GuestFeedback.id.desc())
        ).first()
        self.assertIsNotNone(row)
        assert row is not None
        self.assertEqual(row.rating, 5)
        self.assertEqual(row.comment, "Great")

    def test_submit_with_reservation_token(self):
        r = self.client.post(
            f"/public/tenants/{self.tenant_id}/guest-feedback",
            json={"rating": 4, "reservation_token": "tok-test-1"},
        )
        self.assertEqual(r.status_code, 200, r.text)
        row = self.session.exec(
            select(models.GuestFeedback)
            .where(models.GuestFeedback.tenant_id == self.tenant_id)
            .order_by(models.GuestFeedback.id.desc())
        ).first()
        self.assertIsNotNone(row)
        assert row is not None
        self.assertEqual(row.reservation_id, self.res_id)

    def test_invalid_reservation_token_400(self):
        r = self.client.post(
            f"/public/tenants/{self.tenant_id}/guest-feedback",
            json={"rating": 3, "reservation_token": "nope"},
        )
        self.assertEqual(r.status_code, 400, r.text)

    def test_invalid_reservation_token_localized_de(self):
        r = self.client.post(
            f"/public/tenants/{self.tenant_id}/guest-feedback",
            json={"rating": 3, "reservation_token": "nope"},
            headers={"Accept-Language": "de,en;q=0.5"},
        )
        self.assertEqual(r.status_code, 400, r.text)
        detail = r.json().get("detail")
        self.assertIsInstance(detail, dict)
        self.assertEqual(detail.get("code"), "invalid_reservation_token")
        self.assertIn("Reservierungslink", detail.get("message", ""))

    def test_get_public_tenant_404_localized_de(self):
        missing_id = self.tenant_id + 9_999_999
        r = self.client.get(
            f"/public/tenants/{missing_id}",
            headers={"Accept-Language": "de,en;q=0.5"},
        )
        self.assertEqual(r.status_code, 404, r.text)
        detail = r.json().get("detail")
        self.assertIsInstance(detail, dict)
        self.assertEqual(detail.get("code"), "tenant_not_found")
        self.assertIn("Mandant", detail.get("message", ""))


if __name__ == "__main__":
    unittest.main()
