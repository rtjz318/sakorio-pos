"""Regression: sensitive upload paths must not be served by the public /uploads StaticFiles mount."""
from __future__ import annotations

import shutil
import unittest
from datetime import timedelta
from pathlib import Path
from uuid import uuid4

from pg_client_mixin import PgClientTestCase

from app import models, security
from app.main import UPLOADS_DIR


def _bearer_headers(user: models.User) -> dict[str, str]:
    data = {
        "sub": user.email,
        "tenant_id": user.tenant_id,
        "provider_id": getattr(user, "provider_id", None),
        "token_version": user.token_version,
    }
    token = security.create_access_token(data, expires_delta=timedelta(minutes=30))
    return {"Authorization": f"Bearer {token}"}


class TestUploadsSecurity(PgClientTestCase):
    def tearDown(self) -> None:
        d = UPLOADS_DIR / "999001" / "contracts"
        if d.exists():
            shutil.rmtree(UPLOADS_DIR / "999001", ignore_errors=True)
        super().tearDown()

    def test_contracts_path_not_served_publicly(self) -> None:
        """Signed PDFs under uploads/{tid}/contracts/ must not be readable without auth."""
        tenant_dir = UPLOADS_DIR / "999001" / "contracts"
        tenant_dir.mkdir(parents=True, exist_ok=True)
        pdf_path = tenant_dir / "secret.pdf"
        pdf_path.write_bytes(b"%PDF-1.4 fake contract content for security test")

        r = self.client.get("/uploads/999001/contracts/secret.pdf")
        self.assertEqual(r.status_code, 403, r.text)
        self.assertIn("not available", r.json().get("detail", "").lower())

    def test_tenant_logo_rejects_svg_upload(self) -> None:
        """Tenant logos are raster-only to avoid raw SVG active-content risk."""
        tenant = models.Tenant(name="SVG Reject Tenant")
        self.session.add(tenant)
        self.session.commit()
        self.session.refresh(tenant)

        owner = models.User(
            email=f"svg-logo-owner-{uuid4().hex[:8]}@sakorio.sg",
            hashed_password=security.get_password_hash("secret"),
            full_name="SVG Logo Owner",
            tenant_id=tenant.id,
            role=models.UserRole.owner,
        )
        self.session.add(owner)
        self.session.commit()
        self.session.refresh(owner)

        response = self.client.post(
            "/tenant/logo",
            headers=_bearer_headers(owner),
            files={
                "file": (
                    "logo.svg",
                    b"<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>",
                    "image/svg+xml",
                )
            },
        )

        self.assertEqual(response.status_code, 400, response.text)
        self.assertIn("Invalid file type", response.json()["detail"])


if __name__ == "__main__":
    unittest.main()
