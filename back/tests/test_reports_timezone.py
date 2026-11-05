"""Tenant-local date boundaries and durable queue outcomes used by reports."""

from datetime import date, datetime, timezone
from types import SimpleNamespace
from zoneinfo import ZoneInfo

from app import models
from app.reports_routes import _in_range, _local_report_date, _queue_entry_was_seated


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


def test_completed_queue_entry_keeps_seated_outcome_for_reports() -> None:
    entry = SimpleNamespace(
        status=models.GuestQueueStatus.completed,
        seated_at=datetime(2026, 11, 5, 11, 30, tzinfo=timezone.utc),
    )

    assert _queue_entry_was_seated(entry)


def test_completed_queue_entry_without_seating_is_not_reported_as_seated() -> None:
    entry = SimpleNamespace(status=models.GuestQueueStatus.completed, seated_at=None)

    assert not _queue_entry_was_seated(entry)


def test_live_seated_legacy_entry_without_timestamp_still_counts() -> None:
    entry = SimpleNamespace(status=models.GuestQueueStatus.seated, seated_at=None)

    assert _queue_entry_was_seated(entry)
