"""Regression coverage for staff menu tokens used by the cashier POS."""

from unittest.mock import patch

from app import main


class _DotContainingHmac:
    def digest(self) -> bytes:
        # Raw HMAC bytes are arbitrary and may contain the payload separator.
        return (b"a" * 10) + b"." + (b"b" * 21)


def test_staff_menu_token_accepts_dot_inside_raw_hmac() -> None:
    with patch.object(main.hmac, "new", return_value=_DotContainingHmac()):
        token = main._sign_staff_menu_token("table-token")
        assert main._verify_staff_menu_token("table-token", token) is True


def test_staff_menu_token_rejects_different_table() -> None:
    token = main._sign_staff_menu_token("table-one")
    assert main._verify_staff_menu_token("table-two", token) is False


def test_public_table_qr_access_is_stable_and_table_bound() -> None:
    token = main._sign_public_table_qr_access("table-one")

    assert token == main._sign_public_table_qr_access("table-one")
    assert main._verify_public_table_qr_access("table-one", token) is True
    assert main._verify_public_table_qr_access("table-two", token) is False


def test_public_table_qr_access_rejects_tampering() -> None:
    token = main._sign_public_table_qr_access("table-one")
    replacement = "A" if token[-1] != "A" else "B"

    assert main._verify_public_table_qr_access("table-one", token[:-1] + replacement) is False
