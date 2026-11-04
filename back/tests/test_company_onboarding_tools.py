import argparse
import json

from app.onboarding.company_onboarding import (
    TEMPLATE_TENANT_FIELDS,
    _copy_product_image,
    _resolve_uploads_dir,
    clean_text,
    expected_isolation_confirmation,
    parse_price_cents,
    parse_tables,
    row_to_menu,
    render_env_template,
)
from app.models import Tenant


def test_clean_text_removes_pdf_artifacts_and_normalizes_spacing():
    assert clean_text("\ufeffDeep\u00a0Fried   Menu\u2013Item") == "Deep Fried Menu-Item"


def test_parse_price_cents_accepts_common_menu_formats():
    assert parse_price_cents("SGD 10.00") == 1000
    assert parse_price_cents("$7") == 700
    assert parse_price_cents("1250") == 1250


def test_parse_tables_requires_name_and_seats():
    specs = parse_tables("T01:4,T02:2")
    assert [(spec.name, spec.seats) for spec in specs] == [("T01", 4), ("T02", 2)]


def test_row_to_menu_accepts_flexible_headers():
    item = row_to_menu(
        {
            "Item": "  Gyoza\u00a0 ",
            "Price": "SGD 6.00",
            "Category": "Deep Fried Menu",
            "Prep Station": "Kitchen",
            "Image": "gyoza.jpg",
        }
    )
    assert item.name == "Gyoza"
    assert item.price_cents == 600
    assert item.category == "Deep Fried Menu"
    assert item.station == "Kitchen"
    assert item.image_filename == "gyoza.jpg"


def test_template_fields_exclude_identity_and_secrets():
    excluded = {
        "name",
        "is_demo",
        "phone",
        "email",
        "address",
        "logo_filename",
        "header_background_filename",
        "hitpay_api_key",
        "hitpay_webhook_salt",
        "smtp_password",
        "clock_qr_token_encrypted",
        "fiscal_aeat_api_secret",
    }
    assert excluded.isdisjoint(TEMPLATE_TENANT_FIELDS)


def test_copy_product_image_copies_only_safe_tenant_owned_files(tmp_path):
    source = tmp_path / "1" / "products"
    source.mkdir(parents=True)
    (source / "ramen.jpg").write_bytes(b"menu-image")

    assert _copy_product_image(tmp_path, 1, 2, "ramen.jpg") == "copied"
    assert (tmp_path / "2" / "products" / "ramen.jpg").read_bytes() == b"menu-image"
    assert _copy_product_image(tmp_path, 1, 2, "providers/global/products/x.jpg") == "provider"
    assert _copy_product_image(tmp_path, 1, 2, "../secret.txt") == "unsafe"
    assert _copy_product_image(tmp_path, 1, 2, "missing.jpg") == "missing"


def test_uploads_dir_honors_runtime_override(monkeypatch, tmp_path):
    uploads = tmp_path / "persistent-uploads"
    monkeypatch.setenv("UPLOADS_DIR", str(uploads))

    assert _resolve_uploads_dir() == uploads


def test_render_template_contains_tenant_portal_and_per_tenant_payment(capsys):
    args = argparse.Namespace(
        company_slug="morinaga.sakorio",
        tenant_id=3,
        staff_url="https://morinaga-staff.sakorio.com",
        order_url="https://morinaga-order.sakorio.com",
        api_url="https://morinaga-api.sakorio.com",
        management_url=None,
        default_phone_country="SG",
    )

    assert render_env_template(args) == 0
    output = json.loads(capsys.readouterr().out)
    assert output["tenant_id"] == 3
    assert output["staff_web"]["SAKORIO_PORTAL_MODE"] == "staff"
    assert output["order_web"]["SAKORIO_PORTAL_MODE"] == "customer"
    assert output["management_web_optional"]["SAKORIO_PORTAL_MODE"] == "management"
    assert output["native_build"]["SAKORIO_TENANT_ID"] == "3"
    assert "HITPAY_API_KEY" not in output["api_required"]
    assert output["tenant_settings_required"]["HITPAY_MODE"] == "sandbox"


def test_isolation_confirmation_binds_tenant_id_and_name():
    tenant = Tenant(id=3, name="Morinaga Ramen Izakaya", is_demo=False)
    assert expected_isolation_confirmation(tenant) == "ISOLATE:3:Morinaga Ramen Izakaya"

