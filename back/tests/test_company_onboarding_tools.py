from app.onboarding.company_onboarding import (
    TEMPLATE_TENANT_FIELDS,
    _copy_product_image,
    clean_text,
    parse_price_cents,
    parse_tables,
    row_to_menu,
)


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

