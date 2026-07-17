"""Shared JSON shape for WorkSession (clock in/out, reports)."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlmodel import Session, select

from app import models

# Default “normal day” length for overtime visibility (not persisted; not legal advice).
WORK_SESSION_CONTRACT_THRESHOLD_MINUTES = 480


def _total_break_seconds(
    session: Session | None,
    ws: models.WorkSession,
    *,
    now_utc: datetime,
) -> int:
    """Sum completed and in-progress break intervals for this session."""
    if session is None:
        return 0
    rows = session.exec(
        select(models.WorkSessionBreak).where(models.WorkSessionBreak.work_session_id == ws.id)
    ).all()
    total = 0
    for br in rows:
        if br.ended_at is not None and br.started_at is not None:
            total += max(0, int((br.ended_at - br.started_at).total_seconds()))
        elif br.started_at is not None:
            total += max(0, int((now_utc - br.started_at).total_seconds()))
    return total


def serialize_work_session(
    ws: models.WorkSession,
    user_name: str,
    *,
    now_utc: datetime | None = None,
    session: Session | None = None,
) -> dict:
    """Build API dict. Open sessions include active work time (excluding breaks) and over-contract flag."""
    now = now_utc if now_utc is not None else datetime.now(timezone.utc)
    break_sec = _total_break_seconds(session, ws, now_utc=now)

    on_break = getattr(ws, "break_started_at", None) is not None

    duration_minutes: int | None = None
    if ws.ended_at is not None and ws.started_at is not None:
        gross = max(0, int((ws.ended_at - ws.started_at).total_seconds() // 60))
        duration_minutes = max(0, gross - break_sec // 60)

    open_work_minutes: int | None = None
    open_duration_minutes: int | None = None
    over_contract = False
    if ws.ended_at is None and ws.started_at is not None:
        wall_sec = max(0, int((now - ws.started_at).total_seconds()))
        work_sec = max(0, wall_sec - break_sec)
        open_work_minutes = work_sec // 60
        open_duration_minutes = open_work_minutes
        over_contract = open_work_minutes >= WORK_SESSION_CONTRACT_THRESHOLD_MINUTES

    user = session.get(models.User, ws.user_id) if session is not None else None
    shift = session.get(models.Shift, ws.shift_id) if session is not None and ws.shift_id else None
    proof_types: set[str] = set()
    if session is not None and ws.id is not None:
        proof_types = {
            row.proof_type
            for row in session.exec(
                select(models.WorkSessionPhoto).where(models.WorkSessionPhoto.work_session_id == ws.id)
            ).all()
        }
    worked_minutes = duration_minutes if duration_minutes is not None else open_work_minutes
    hourly_rate_cents = int(getattr(user, "hourly_rate_cents", 0) or 0)
    estimated_pay_cents = (
        (worked_minutes * hourly_rate_cents + 30) // 60
        if worked_minutes is not None and hourly_rate_cents > 0
        else 0
    )

    return {
        "id": ws.id,
        "tenant_id": ws.tenant_id,
        "user_id": ws.user_id,
        "user_name": user_name,
        "shift_id": ws.shift_id,
        "shift_date": shift.shift_date.isoformat() if shift else None,
        "shift_start_time": shift.start_time.isoformat() if shift else None,
        "shift_end_time": shift.end_time.isoformat() if shift else None,
        "shift_label": shift.label if shift else None,
        "started_at": ws.started_at.isoformat() if ws.started_at else None,
        "ended_at": ws.ended_at.isoformat() if ws.ended_at else None,
        "duration_minutes": duration_minutes,
        "open_duration_minutes": open_duration_minutes,
        "contract_threshold_minutes": WORK_SESSION_CONTRACT_THRESHOLD_MINUTES,
        "over_contract": over_contract,
        "start_ip": ws.start_ip,
        "end_ip": ws.end_ip,
        "on_break": on_break,
        "break_started_at": ws.break_started_at.isoformat() if getattr(ws, "break_started_at", None) else None,
        "break_seconds_total": break_sec,
        "clock_in_photo_present": "clock_in" in proof_types,
        "clock_out_photo_present": "clock_out" in proof_types,
        "hourly_rate_cents": hourly_rate_cents,
        "estimated_pay_cents": estimated_pay_cents,
    }


def work_session_net_duration_minutes(ws: models.WorkSession, session: Session) -> int | None:
    """Net worked minutes for a closed session (breaks excluded). None if still open or missing times."""
    if ws.ended_at is None or ws.started_at is None:
        return None
    break_sec = _total_break_seconds(session, ws, now_utc=ws.ended_at)
    gross = max(0, int((ws.ended_at - ws.started_at).total_seconds() // 60))
    return max(0, gross - break_sec // 60)
