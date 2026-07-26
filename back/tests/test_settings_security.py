"""Production launch security guardrails for Settings."""

from __future__ import annotations

import pytest
from pydantic import ValidationError


def _clear_security_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for key in (
        "PRODUCTION",
        "SECRET_KEY",
        "REFRESH_SECRET_KEY",
        "CORS_ORIGINS",
        "ALLOWED_HOSTS",
    ):
        monkeypatch.delenv(key, raising=False)


def test_production_rejects_default_secrets(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.settings import Settings

    _clear_security_env(monkeypatch)
    monkeypatch.setenv("PRODUCTION", "true")
    monkeypatch.setenv("SECRET_KEY", "CHANGE_THIS_IN_PRODUCTION")
    monkeypatch.setenv("REFRESH_SECRET_KEY", "CHANGE_THIS_REFRESH_SECRET_IN_PRODUCTION")
    monkeypatch.setenv("CORS_ORIGINS", "https://staff.sakorio.com")

    with pytest.raises(ValidationError, match="SECRET_KEY must be a unique random value"):
        Settings()


def test_production_rejects_wildcard_cors(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.settings import Settings

    _clear_security_env(monkeypatch)
    monkeypatch.setenv("PRODUCTION", "true")
    monkeypatch.setenv("SECRET_KEY", "s" * 64)
    monkeypatch.setenv("REFRESH_SECRET_KEY", "r" * 64)
    monkeypatch.setenv("CORS_ORIGINS", "https://staff.sakorio.com,*")

    with pytest.raises(ValidationError, match="CORS_ORIGINS cannot contain"):
        Settings()


def test_production_accepts_exact_https_origins_and_hosts(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.settings import Settings

    _clear_security_env(monkeypatch)
    monkeypatch.setenv("PRODUCTION", "true")
    monkeypatch.setenv("SECRET_KEY", "s" * 64)
    monkeypatch.setenv("REFRESH_SECRET_KEY", "r" * 64)
    monkeypatch.setenv("CORS_ORIGINS", "https://staff.sakorio.com,https://order.sakorio.com")
    monkeypatch.setenv("ALLOWED_HOSTS", "api.sakorio.com,staff.sakorio.com,order.sakorio.com")

    settings = Settings()

    assert settings.is_production is True
    assert settings.cors_origins == "https://staff.sakorio.com,https://order.sakorio.com"
    assert settings.allowed_hosts == "api.sakorio.com,staff.sakorio.com,order.sakorio.com"

