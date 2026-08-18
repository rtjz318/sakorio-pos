"""Printer setup and local-agent job leasing endpoints."""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, Header, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlmodel import Session, select

from . import models
from .db import get_session
from .permissions import Permission, require_permission


router = APIRouter()


class PrinterAgentCreate(BaseModel):
    name: str = Field(min_length=2, max_length=128)
    kitchen_station_id: int | None = None
    device_type: Literal["local_agent", "ipad_app", "xp80t"] = "local_agent"
    transport: Literal["network", "bluetooth_serial", "ios_bluetooth"] = "network"
    app_version: str | None = Field(default=None, max_length=64)


class PrintJobFailure(BaseModel):
    lease_token: str = Field(min_length=16, max_length=64)
    error: str = Field(min_length=1, max_length=1000)


class PrintJobCompletion(BaseModel):
    lease_token: str = Field(min_length=16, max_length=64)


def _hash_agent_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _agent_dict(agent: models.PrinterAgent) -> dict:
    return {
        "id": agent.id,
        "name": agent.name,
        "kitchen_station_id": agent.kitchen_station_id,
        "device_type": agent.device_type,
        "transport": agent.transport,
        "app_version": agent.app_version,
        "active": agent.active,
        "last_seen_at": agent.last_seen_at.isoformat() if agent.last_seen_at else None,
        "created_at": agent.created_at.isoformat(),
    }


def _get_printer_agent(
    x_printer_agent_token: Annotated[str, Header(alias="X-Printer-Agent-Token")],
    session: Session = Depends(get_session),
) -> models.PrinterAgent:
    token_hash = _hash_agent_token(x_printer_agent_token)
    agent = session.exec(
        select(models.PrinterAgent).where(
            models.PrinterAgent.token_hash == token_hash,
            models.PrinterAgent.active.is_(True),
        )
    ).first()
    if not agent:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid printer agent token")
    return agent


@router.get("/printing/agents")
def list_printer_agents(
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_READ))],
    session: Session = Depends(get_session),
) -> list[dict]:
    agents = session.exec(
        select(models.PrinterAgent)
        .where(models.PrinterAgent.tenant_id == current_user.tenant_id)
        .order_by(models.PrinterAgent.created_at.desc())
    ).all()
    return [_agent_dict(agent) for agent in agents]


@router.post("/printing/agents", status_code=status.HTTP_201_CREATED)
def create_printer_agent(
    body: PrinterAgentCreate,
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_UPDATE))],
    session: Session = Depends(get_session),
) -> dict:
    if body.kitchen_station_id is not None:
        station = session.get(models.KitchenStation, body.kitchen_station_id)
        if not station or station.tenant_id != current_user.tenant_id:
            raise HTTPException(status_code=404, detail="Kitchen station not found")

    raw_token = secrets.token_urlsafe(32)
    agent = models.PrinterAgent(
        tenant_id=current_user.tenant_id,
        name=body.name.strip(),
        kitchen_station_id=body.kitchen_station_id,
        device_type=body.device_type,
        transport=body.transport,
        app_version=body.app_version.strip() if body.app_version else None,
        token_hash=_hash_agent_token(raw_token),
    )
    session.add(agent)
    session.commit()
    session.refresh(agent)
    return {**_agent_dict(agent), "token": raw_token}


@router.delete("/printing/agents/{agent_id}")
def disable_printer_agent(
    agent_id: int,
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_UPDATE))],
    session: Session = Depends(get_session),
) -> dict:
    agent = session.get(models.PrinterAgent, agent_id)
    if not agent or agent.tenant_id != current_user.tenant_id:
        raise HTTPException(status_code=404, detail="Printer agent not found")
    agent.active = False
    session.add(agent)
    session.commit()
    return {"status": "disabled", "agent_id": agent.id}


@router.get("/printing/jobs")
def list_print_jobs(
    current_user: Annotated[models.User, Depends(require_permission(Permission.SETTINGS_READ))],
    session: Session = Depends(get_session),
    limit: int = Query(default=50, ge=1, le=200),
) -> list[dict]:
    jobs = session.exec(
        select(models.PrintJob)
        .where(models.PrintJob.tenant_id == current_user.tenant_id)
        .order_by(models.PrintJob.created_at.desc())
        .limit(limit)
    ).all()
    return [
        {
            "id": job.id,
            "order_id": job.order_id,
            "kitchen_station_id": job.kitchen_station_id,
            "job_type": job.job_type,
            "status": job.status.value,
            "attempts": job.attempts,
            "last_error": job.last_error,
            "created_at": job.created_at.isoformat(),
            "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        }
        for job in jobs
    ]


@router.post("/printer-agent/heartbeat")
def printer_agent_heartbeat(
    agent: Annotated[models.PrinterAgent, Depends(_get_printer_agent)],
    session: Session = Depends(get_session),
) -> dict:
    agent.last_seen_at = datetime.now(timezone.utc)
    session.add(agent)
    session.commit()
    return {"status": "ok", "agent": _agent_dict(agent)}


@router.post("/printer-agent/jobs/lease")
def lease_print_jobs(
    agent: Annotated[models.PrinterAgent, Depends(_get_printer_agent)],
    session: Session = Depends(get_session),
    limit: int = Query(default=5, ge=1, le=20),
) -> list[dict]:
    now = datetime.now(timezone.utc)
    stale = session.exec(
        select(models.PrintJob).where(
            models.PrintJob.tenant_id == agent.tenant_id,
            models.PrintJob.status == models.PrintJobStatus.leased,
            models.PrintJob.lease_expires_at <= now,
        )
    ).all()
    for job in stale:
        job.status = models.PrintJobStatus.failed
        job.available_at = now
        job.lease_token = None
        job.last_error = "Printer agent lease expired"
        session.add(job)

    statement = select(models.PrintJob).where(
        models.PrintJob.tenant_id == agent.tenant_id,
        models.PrintJob.status.in_([models.PrintJobStatus.pending, models.PrintJobStatus.failed]),
        models.PrintJob.available_at <= now,
        models.PrintJob.attempts < 10,
    )
    if agent.kitchen_station_id is not None:
        statement = statement.where(models.PrintJob.kitchen_station_id == agent.kitchen_station_id)
    jobs = session.exec(
        statement.order_by(models.PrintJob.created_at.asc()).with_for_update(skip_locked=True).limit(limit)
    ).all()

    leased: list[dict] = []
    for job in jobs:
        lease_token = secrets.token_urlsafe(24)
        job.status = models.PrintJobStatus.leased
        job.attempts += 1
        job.lease_token = lease_token
        job.leased_at = now
        job.lease_expires_at = now + timedelta(seconds=60)
        job.failed_at = None
        session.add(job)
        leased.append(
            {
                "id": job.id,
                "lease_token": lease_token,
                "job_type": job.job_type,
                "order_id": job.order_id,
                "kitchen_station_id": job.kitchen_station_id,
                "payload": job.payload,
            }
        )
    agent.last_seen_at = now
    session.add(agent)
    session.commit()
    return leased


def _leased_job(
    session: Session,
    agent: models.PrinterAgent,
    job_id: int,
    lease_token: str,
) -> models.PrintJob:
    job = session.get(models.PrintJob, job_id)
    if (
        not job
        or job.tenant_id != agent.tenant_id
        or job.status != models.PrintJobStatus.leased
        or not job.lease_token
        or not secrets.compare_digest(job.lease_token, lease_token)
    ):
        raise HTTPException(status_code=409, detail="Print job lease is no longer valid")
    return job


@router.post("/printer-agent/jobs/{job_id}/complete")
def complete_print_job(
    job_id: int,
    body: PrintJobCompletion,
    agent: Annotated[models.PrinterAgent, Depends(_get_printer_agent)],
    session: Session = Depends(get_session),
) -> dict:
    job = _leased_job(session, agent, job_id, body.lease_token)
    job.status = models.PrintJobStatus.completed
    job.completed_at = datetime.now(timezone.utc)
    job.lease_token = None
    job.lease_expires_at = None
    job.last_error = None
    session.add(job)
    session.commit()
    return {"status": "completed", "job_id": job.id}


@router.post("/printer-agent/jobs/{job_id}/fail")
def fail_print_job(
    job_id: int,
    body: PrintJobFailure,
    agent: Annotated[models.PrinterAgent, Depends(_get_printer_agent)],
    session: Session = Depends(get_session),
) -> dict:
    job = _leased_job(session, agent, job_id, body.lease_token)
    now = datetime.now(timezone.utc)
    job.status = models.PrintJobStatus.failed
    job.failed_at = now
    job.available_at = now + timedelta(seconds=min(300, 5 * (2 ** min(job.attempts, 6))))
    job.lease_token = None
    job.lease_expires_at = None
    job.last_error = body.error.strip()
    session.add(job)
    session.commit()
    return {"status": "retry_scheduled", "job_id": job.id, "attempts": job.attempts}
