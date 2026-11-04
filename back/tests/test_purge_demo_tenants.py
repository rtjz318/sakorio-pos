import pytest

from app.seeds.purge_demo_tenants import parse_demo_tenant_ids


def test_demo_purge_requires_explicit_ids():
    with pytest.raises(ValueError, match="required"):
        parse_demo_tenant_ids(None)


def test_demo_purge_parses_unique_positive_ids():
    assert parse_demo_tenant_ids("2, 4,2") == (2, 4)


@pytest.mark.parametrize("raw", ["0", "-1", "3,production", "3,"])
def test_demo_purge_rejects_invalid_ids(raw):
    with pytest.raises(ValueError, match="Invalid"):
        parse_demo_tenant_ids(raw)
