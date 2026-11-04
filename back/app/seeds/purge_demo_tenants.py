"""One-off purge of explicitly selected demo tenants and their upload dirs.

**Production safety:** there is no hard-coded id list. Every selected tenant must
still have ``is_demo=true`` in the database, and the exact confirmation phrase is
required. Run inside the backend environment where DB is reachable:

    DEMO_PURGE_TENANT_IDS=2,4 \
    DEMO_PURGE_CONFIRM=PURGE_DEMO_TENANTS \
    python -m app.seeds.purge_demo_tenants

Or: docker compose exec back python -m app.seeds.purge_demo_tenants
(with both safety variables passed via compose env or `-e`).
"""

from __future__ import annotations

import logging
import os
import sys
from pathlib import Path

from sqlmodel import Session

from app import models
from app.db import engine
from app.tenant_lifecycle import delete_tenant_cascade, remove_tenant_files

logger = logging.getLogger(__name__)

_UPLOADS_DIR = Path(
    os.getenv("UPLOADS_DIR")
    or (Path(__file__).resolve().parent.parent.parent / "uploads")
)


def parse_demo_tenant_ids(raw: str | None) -> tuple[int, ...]:
    """Parse an explicit, unique positive-id allowlist; empty input is never valid."""
    if not raw or not raw.strip():
        raise ValueError("DEMO_PURGE_TENANT_IDS is required")
    ids: list[int] = []
    for part in raw.split(","):
        value = part.strip()
        if not value.isdigit() or int(value) <= 0:
            raise ValueError(f"Invalid demo tenant id: {value!r}")
        tenant_id = int(value)
        if tenant_id not in ids:
            ids.append(tenant_id)
    return tuple(ids)


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
    if os.environ.get("DEMO_PURGE_CONFIRM") != "PURGE_DEMO_TENANTS":
        logger.error("Refusing to run: exact DEMO_PURGE_CONFIRM phrase is required")
        return 1

    try:
        requested_ids = parse_demo_tenant_ids(os.environ.get("DEMO_PURGE_TENANT_IDS"))
    except ValueError as exc:
        logger.error("Refusing to run: %s", exc)
        return 1

    with Session(engine) as session:
        tenants: list[models.Tenant] = []
        for tid in requested_ids:
            t = session.get(models.Tenant, tid)
            if not t:
                logger.info("Skip tenant_id=%s (not found)", tid)
                continue
            if not t.is_demo:
                logger.error(
                    "Refusing entire purge: tenant_id=%s name=%r is not marked as demo",
                    tid,
                    t.name,
                )
                return 1
            tenants.append(t)

        for t in tenants:
            tid = t.id
            if tid is None:
                continue
            name = t.name
            tokens = delete_tenant_cascade(session, tid)
            session.commit()
            remove_tenant_files(_UPLOADS_DIR, tid, tokens)
            logger.warning("Purged demo tenant id=%s name=%r", tid, name)

    logger.info("Done.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
