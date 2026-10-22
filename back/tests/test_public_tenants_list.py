"""
Test GET /public/tenants — unauthenticated tenant discovery (landing, picker).
"""
import unittest

from pg_client_mixin import PgClientTestCase

from app import models


class TestPublicTenantsList(PgClientTestCase):
    def setUp(self):
        super().setUp()
        tenant = models.Tenant(
            name="Public List Test",
            email="pos-public-list-test@sakario.sg",
            is_demo=True,
        )
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)
        self.tenant_id = tenant.id

    def test_list_public_tenants_returns_200_and_shape(self):
        response = self.client.get("/public/tenants")
        self.assertEqual(response.status_code, 200, response.text)
        data = response.json()
        self.assertIsInstance(data, list)
        self.assertGreaterEqual(len(data), 1)
        match = next((t for t in data if t["id"] == self.tenant_id), None)
        self.assertIsNotNone(match, "Created tenant must appear in list")
        self.assertEqual(match["name"], "Public List Test")
        self.assertEqual(match["email"], "pos-public-list-test@sakario.sg")
        self.assertIs(match["is_demo"], True)
        for key in (
            "id",
            "name",
            "is_demo",
            "logo_filename",
            "whatsapp",
            "take_away_table_token",
            "terms_of_service_url",
            "privacy_policy_url",
            "timezone",
            "reservation_max_guests_per_slot",
            "website",
        ):
            self.assertIn(key, match, f"TenantSummary must include {key!r}")

    def test_unlisted_tenant_is_hidden_from_discovery_but_still_directly_accessible(self):
        hidden = models.Tenant(
            name="Retired QA Tenant",
            email="pos-retired-qa-tenant@sakario.sg",
            is_demo=True,
            is_publicly_listed=False,
        )
        self.session.add(hidden)
        self.session.commit()
        self.session.refresh(hidden)

        listing = self.client.get("/public/tenants")
        self.assertEqual(listing.status_code, 200, listing.text)
        self.assertNotIn(hidden.id, {tenant["id"] for tenant in listing.json()})

        direct = self.client.get(f"/public/tenants/{hidden.id}")
        self.assertEqual(direct.status_code, 200, direct.text)
        self.assertEqual(direct.json()["name"], "Retired QA Tenant")


if __name__ == "__main__":
    unittest.main()
