"""
Seed controlled role-specific QA staff users for browser regression.

This script is intentionally env-driven: it never hardcodes a password into git.

Usage:
  SAKORIO_QA_PASSWORD='...' python -m app.seeds.seed_role_qa_users
  SAKORIO_QA_TENANT_ID=1 SAKORIO_QA_PASSWORD='...' python -m app.seeds.seed_role_qa_users

The script is idempotent. Existing QA users are updated to the expected role/profile
and have their password rotated to SAKORIO_QA_PASSWORD.
"""

from __future__ import annotations

import os
from datetime import date, datetime, timezone

from sqlmodel import Session, select

from app.db import engine
from app.models import User, UserRole
from app.security import get_password_hash


TENANT_ID = int(os.getenv("SAKORIO_QA_TENANT_ID", "1"))
PASSWORD = os.getenv("SAKORIO_QA_PASSWORD", "").strip()

QA_USERS = [
    {
        "email": "qa.waiter@sakario.sg",
        "full_name": "QA Waiter",
        "role": UserRole.waiter,
        "job_title": "QA Waiter",
        "hourly_rate_cents": 1200,
    },
    {
        "email": "qa.host@sakario.sg",
        "full_name": "QA Host",
        "role": UserRole.receptionist,
        "job_title": "QA Host",
        "hourly_rate_cents": 1200,
    },
    {
        "email": "qa.kitchen@sakario.sg",
        "full_name": "QA Kitchen",
        "role": UserRole.kitchen,
        "job_title": "QA Kitchen",
        "hourly_rate_cents": 1200,
    },
    {
        "email": "qa.manager@sakario.sg",
        "full_name": "QA Manager",
        "role": UserRole.admin,
        "job_title": "QA Manager",
        "hourly_rate_cents": 1800,
    },
]


def run() -> None:
    if not PASSWORD:
        raise SystemExit("Set SAKORIO_QA_PASSWORD before seeding QA users.")
    if len(PASSWORD) < 8:
        raise SystemExit("SAKORIO_QA_PASSWORD must be at least 8 characters.")

    password_hash = get_password_hash(PASSWORD)
    created = 0
    updated = 0

    with Session(engine) as session:
        for spec in QA_USERS:
            user = session.exec(select(User).where(User.email == spec["email"])).first()
            if user is None:
                user = User(
                    tenant_id=TENANT_ID,
                    email=spec["email"],
                    hashed_password=password_hash,
                    full_name=spec["full_name"],
                    role=spec["role"],
                    job_title=spec["job_title"],
                    hourly_rate_cents=spec["hourly_rate_cents"],
                    employment_start_date=date.today(),
                    profile_completed_at=datetime.now(timezone.utc),
                )
                session.add(user)
                created += 1
            else:
                user.tenant_id = TENANT_ID
                user.hashed_password = password_hash
                user.full_name = spec["full_name"]
                user.role = spec["role"]
                user.job_title = spec["job_title"]
                user.hourly_rate_cents = spec["hourly_rate_cents"]
                if user.employment_start_date is None:
                    user.employment_start_date = date.today()
                if user.profile_completed_at is None:
                    user.profile_completed_at = datetime.now(timezone.utc)
                session.add(user)
                updated += 1

        session.commit()

    print(f"QA role users ready for tenant {TENANT_ID}: created={created}, updated={updated}")
    for spec in QA_USERS:
        print(f"- {spec['email']} ({spec['role'].value})")


if __name__ == "__main__":
    run()
