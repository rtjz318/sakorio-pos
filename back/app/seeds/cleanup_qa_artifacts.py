"""
Archive clearly marked Sakorio QA/test artifacts from live/staging boards.

This avoids destructive broad cleanup. It only touches:
- reservations whose name/notes clearly identify automated QA records;
- queue rows whose name/notes clearly identify automated QA records;
- the known synthetic timetable shift created during E2E-083
  (Ajisen/Owner, 2026-07-26, 10:00-12:00).

Usage:
  python -m app.seeds.cleanup_qa_artifacts
  SAKORIO_QA_TENANT_ID=1 python -m app.seeds.cleanup_qa_artifacts
"""

from __future__ import annotations

import os

from sqlalchemy import text
from sqlmodel import Session

from app.db import engine


TENANT_ID = int(os.getenv("SAKORIO_QA_TENANT_ID", "1"))


def run() -> None:
    with Session(engine) as session:
        reservation_result = session.execute(
            text(
                """
                UPDATE reservation
                SET status = 'finished',
                    table_id = NULL,
                    updated_at = NOW()
                WHERE tenant_id = :tenant_id
                  AND status IN ('booked', 'seated')
                  AND (
                    customer_name ILIKE 'QA %'
                    OR customer_name ILIKE 'Final QA%'
                    OR customer_name ILIKE 'SKR-%'
                    OR COALESCE(client_notes, '') ILIKE '%QA%'
                    OR COALESCE(owner_notes, '') ILIKE '%QA%'
                    OR COALESCE(client_notes, '') ILIKE '%SKR-FINAL%'
                    OR COALESCE(owner_notes, '') ILIKE '%SKR-FINAL%'
                  )
                """
            ),
            {"tenant_id": TENANT_ID},
        )

        queue_result = session.execute(
            text(
                """
                UPDATE guest_queue_entry
                SET status = 'expired',
                    cancel_reason = COALESCE(cancel_reason, 'Archived by QA cleanup'),
                    updated_at = NOW()
                WHERE tenant_id = :tenant_id
                  AND status IN ('waiting', 'notified', 'seated')
                  AND (
                    customer_name ILIKE 'QA %'
                    OR customer_name ILIKE 'Final QA%'
                    OR customer_name ILIKE 'SKR-%'
                    OR COALESCE(notes, '') ILIKE '%QA%'
                    OR COALESCE(notes, '') ILIKE '%SKR-FINAL%'
                  )
                """
            ),
            {"tenant_id": TENANT_ID},
        )

        shift_result = session.execute(
            text(
                """
                DELETE FROM shift
                WHERE tenant_id = :tenant_id
                  AND shift_date = DATE '2026-07-26'
                  AND start_time = TIME '10:00'
                  AND end_time = TIME '12:00'
                  AND user_id IN (
                    SELECT id
                    FROM "user"
                    WHERE tenant_id = :tenant_id
                      AND role = 'owner'
                      AND (
                        full_name ILIKE 'Ajisen%'
                        OR email = 'ricktan318@hotmail.com'
                      )
                  )
                """
            ),
            {"tenant_id": TENANT_ID},
        )

        session.commit()

    print(
        "QA cleanup complete for tenant "
        f"{TENANT_ID}: reservations={reservation_result.rowcount}, "
        f"queue={queue_result.rowcount}, synthetic_shifts={shift_result.rowcount}"
    )


if __name__ == "__main__":
    run()
