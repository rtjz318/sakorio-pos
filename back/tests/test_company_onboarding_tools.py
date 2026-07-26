from app.onboarding.company_onboarding import (
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

