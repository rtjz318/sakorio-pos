"""Tenant-local date boundaries used by sales and queue reports."""

from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo

from app.reports_routes import _in_range, _local_report_date


def test_utc_timestamp_after_midnight_singapore_counts_on_local_day() -> None:
    singapore = ZoneInfo("Asia/Singapore")
    value = datetime(2026, 8, 29, 16, 30, tzinfo=timezone.utc)

    assert _local_report_date(value, singapore) == date(2026, 8, 30)
    assert _in_range(value, date(2026, 8, 30), date(2026, 8, 30), singapore)


def test_utc_timestamp_before_singapore_midnight_stays_on_previous_day() -> None:
    singapore = ZoneInfo("Asia/Singapore")
    value = datetime(2026, 8, 29, 15, 59, tzinfo=timezone.utc)

    assert _local_report_date(value, singapore) == date(2026, 8, 29)
    assert not _in_range(value, date(2026, 8, 30), date(2026, 8, 30), singapore)


def test_naive_legacy_timestamp_is_treated_as_utc() -> None:
    singapore = ZoneInfo("Asia/Singapore")
    value = datetime(2026, 8, 29, 16, 0)

    assert _local_report_date(value, singapore) == date(2026, 8, 30)
