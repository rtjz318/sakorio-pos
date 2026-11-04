import uuid

from pg_client_mixin import PgClientTestCase

from app import models, security


class TestManagementLoginScope(PgClientTestCase):
    def setUp(self) -> None:
        super().setUp()
        suffix = uuid.uuid4().hex
        self.tenant = models.Tenant(name=f"Management Login {suffix}")
        self.other_tenant = models.Tenant(name=f"Other Tenant {suffix}")
        self.session.add(self.tenant)
        self.session.add(self.other_tenant)
        self.session.commit()
        self.session.refresh(self.tenant)
        self.session.refresh(self.other_tenant)

        self.password = "Management-scope-test-123"
        self.owner = models.User(
            email=f"management-owner-{suffix}@sakario.sg",
            hashed_password=security.get_password_hash(self.password),
            full_name="Management Owner",
            tenant_id=self.tenant.id,
            role=models.UserRole.owner,
        )
        self.waiter = models.User(
            email=f"management-waiter-{suffix}@sakario.sg",
            hashed_password=security.get_password_hash(self.password),
            full_name="Management Waiter",
            tenant_id=self.tenant.id,
            role=models.UserRole.waiter,
        )
        self.session.add(self.owner)
        self.session.add(self.waiter)
        self.session.commit()

    def _login(self, email: str, *, tenant_id: int | None, scope: str = "management"):
        query = f"?scope={scope}"
        if tenant_id is not None:
            query += f"&tenant_id={tenant_id}"
        return self.client.post(
            f"/token{query}",
            data={"username": email, "password": self.password},
        )

    def test_owner_can_use_management_login_for_own_tenant(self):
        response = self._login(self.owner.email, tenant_id=self.tenant.id)
        self.assertEqual(response.status_code, 200, response.text)

    def test_waiter_cannot_use_management_login(self):
        response = self._login(self.waiter.email, tenant_id=self.tenant.id)
        self.assertEqual(response.status_code, 401, response.text)

    def test_management_login_cannot_cross_tenants(self):
        response = self._login(self.owner.email, tenant_id=self.other_tenant.id)
        self.assertEqual(response.status_code, 401, response.text)

    def test_management_login_requires_tenant(self):
        response = self._login(self.owner.email, tenant_id=None)
        self.assertEqual(response.status_code, 400, response.text)

    def test_unknown_login_scope_is_rejected(self):
        response = self._login(self.owner.email, tenant_id=self.tenant.id, scope="root")
        self.assertEqual(response.status_code, 400, response.text)
