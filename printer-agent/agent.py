"""Small on-premise bridge for durable Sakorio kitchen receipt jobs.

The API is hosted publicly, while the receipt printer remains reachable only
inside the restaurant. This process leases jobs from the API and sends ESC/POS
bytes to a receipt printer through the configured local transport.
"""

from __future__ import annotations

import json
import logging
import os
import socket
import time
from importlib import import_module
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO").upper(),
    format="%(asctime)s %(levelname)s %(message)s",
)
logger = logging.getLogger("sakorio-printer-agent")

API_BASE_URL = os.environ["API_BASE_URL"].rstrip("/")
AGENT_TOKEN = os.environ["PRINTER_AGENT_TOKEN"]
PRINTER_TRANSPORT = os.getenv("PRINTER_TRANSPORT", "network").strip().lower()
PRINTER_HOST = os.getenv("PRINTER_HOST", "").strip()
PRINTER_PORT = int(os.getenv("PRINTER_PORT", "9100"))
PRINTER_ENCODING = os.getenv("PRINTER_ENCODING", "cp437")
PRINTER_SERIAL_PORT = os.getenv("PRINTER_SERIAL_PORT", "").strip()
PRINTER_SERIAL_BAUDRATE = int(os.getenv("PRINTER_SERIAL_BAUDRATE", "9600"))
PRINTER_SERIAL_TIMEOUT_SECONDS = max(
    1.0, float(os.getenv("PRINTER_SERIAL_TIMEOUT_SECONDS", "10"))
)
POLL_SECONDS = max(1.0, float(os.getenv("POLL_SECONDS", "3")))
SOCKET_TIMEOUT_SECONDS = max(1.0, float(os.getenv("SOCKET_TIMEOUT_SECONDS", "10")))
DRY_RUN = os.getenv("PRINTER_DRY_RUN", "false").lower() in {"1", "true", "yes", "on"}
OUTPUT_DIR = Path(os.getenv("PRINT_OUTPUT_DIR", "print-output"))


def api_request(method: str, path: str, body: dict | None = None) -> object:
    data = json.dumps(body).encode("utf-8") if body is not None else None
    request = Request(
        f"{API_BASE_URL}{path}",
        data=data,
        method=method,
        headers={
            "Content-Type": "application/json",
            "X-Printer-Agent-Token": AGENT_TOKEN,
        },
    )
    with urlopen(request, timeout=20) as response:
        return json.loads(response.read().decode("utf-8"))


def clipped(value: object, width: int) -> str:
    text = str(value or "").strip()
    return text if len(text) <= width else f"{text[: width - 3]}..."


def wrap(value: object, width: int = 42) -> list[str]:
    words = str(value or "").strip().split()
    if not words:
        return []
    lines: list[str] = []
    current = words.pop(0)
    for word in words:
        if len(current) + len(word) + 1 <= width:
            current += f" {word}"
        else:
            lines.append(clipped(current, width))
            current = word
    lines.append(clipped(current, width))
    return lines


def money(cents: object, currency_code: object) -> str:
    try:
        amount = int(cents or 0) / 100
    except (TypeError, ValueError):
        amount = 0
    return f"{str(currency_code or 'SGD').upper()} {amount:.2f}"


def receipt_text(payload: dict) -> str:
    width = 42
    rows = [
        str(payload.get("receipt_type") or "KITCHEN").center(width),
        str(payload.get("station_name") or "Kitchen").center(width),
        "=" * width,
        f"ORDER #{payload.get('order_id')}",
        f"TABLE: {payload.get('table_name') or 'Counter'}",
    ]
    if payload.get("customer_name"):
        rows.append(f"GUEST: {payload['customer_name']}")
    rows.extend([f"TIME: {payload.get('submitted_at') or ''}", "-" * width])

    is_customer = str(payload.get("receipt_type") or "").upper() == "CUSTOMER RECEIPT"
    for item in payload.get("items") or []:
        item_label = f"{item.get('quantity', 1)} x {item.get('name')}"
        if is_customer:
            line_total = money(item.get("line_total_cents"), payload.get("currency_code"))
            label_width = max(8, width - len(line_total) - 1)
            rows.append(f"{clipped(item_label, label_width):<{label_width}} {line_total}")
        else:
            rows.extend(wrap(item_label, width))
        for detail_key in ("customization", "modifiers", "notes"):
            if item.get(detail_key):
                rows.extend(wrap(f"  {item[detail_key]}", width))
        rows.append("")

    if payload.get("order_notes"):
        rows.append("ORDER NOTE")
        rows.extend(wrap(payload["order_notes"], width))
        rows.append("")
    if is_customer:
        currency = payload.get("currency_code")
        rows.append("-" * width)
        rows.append(f"{'SUBTOTAL':<18}{money(payload.get('subtotal_cents'), currency):>24}")
        if int(payload.get("tip_cents") or 0) > 0:
            rows.append(f"{'TIP':<18}{money(payload.get('tip_cents'), currency):>24}")
        rows.append(f"{'TOTAL':<18}{money(payload.get('total_cents'), currency):>24}")
        payment_method = str(payload.get("payment_method") or "Paid").replace("_", " ").upper()
        rows.append(f"PAID VIA: {payment_method}")
        rows.extend(["", "THANK YOU".center(width)])
    rows.extend(["=" * width, ""])
    return "\n".join(rows)


def escpos_bytes(payload: dict) -> bytes:
    text = receipt_text(payload).replace("\n", "\r\n")
    return (
        b"\x1b\x40"  # initialize
        + b"\x1b\x61\x00"  # left align
        + text.encode(PRINTER_ENCODING, errors="replace")
        + b"\r\n\r\n\r\n"
        + b"\x1d\x56\x00"  # full cut
    )


def send_network(data: bytes) -> None:
    if not PRINTER_HOST:
        raise RuntimeError("PRINTER_HOST is required when PRINTER_TRANSPORT=network")
    with socket.create_connection(
        (PRINTER_HOST, PRINTER_PORT), timeout=SOCKET_TIMEOUT_SECONDS
    ) as printer:
        printer.sendall(data)


def send_bluetooth_serial(data: bytes) -> None:
    """Send ESC/POS bytes to a paired Bluetooth printer exposed as a serial port.

    This covers Bluetooth Classic/SPP style printers after pairing them in the
    OS. On Windows the port normally looks like COM5; on macOS/Linux it may be a
    /dev/cu.* or /dev/rfcomm* device. pyserial is optional so Wi-Fi deployments
    do not need the dependency.
    """

    if not PRINTER_SERIAL_PORT:
        raise RuntimeError(
            "PRINTER_SERIAL_PORT is required when PRINTER_TRANSPORT=bluetooth_serial"
        )
    try:
        serial_module = import_module("serial")
    except ImportError as exc:
        raise RuntimeError(
            "Bluetooth serial printing requires pyserial. Install it in the "
            "printer-agent environment with: python -m pip install pyserial"
        ) from exc

    with serial_module.Serial(
        PRINTER_SERIAL_PORT,
        baudrate=PRINTER_SERIAL_BAUDRATE,
        timeout=PRINTER_SERIAL_TIMEOUT_SECONDS,
        write_timeout=PRINTER_SERIAL_TIMEOUT_SECONDS,
    ) as printer:
        printer.write(data)
        printer.flush()


def send_to_printer(data: bytes) -> None:
    if PRINTER_TRANSPORT == "network":
        send_network(data)
        return
    if PRINTER_TRANSPORT == "bluetooth_serial":
        send_bluetooth_serial(data)
        return
    raise RuntimeError(
        "Unsupported PRINTER_TRANSPORT. Use network or bluetooth_serial."
    )


def print_job(job: dict) -> None:
    data = escpos_bytes(job.get("payload") or {})
    if DRY_RUN:
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        target = OUTPUT_DIR / f"print-job-{job['id']}.bin"
        target.write_bytes(data)
        logger.info("Dry-run receipt saved to %s", target.resolve())
        return
    send_to_printer(data)


def run_once() -> int:
    jobs = api_request("POST", "/printer-agent/jobs/lease?limit=5")
    if not isinstance(jobs, list):
        raise RuntimeError("Printer lease response was not a list")
    for job in jobs:
        try:
            print_job(job)
            api_request(
                "POST",
                f"/printer-agent/jobs/{job['id']}/complete",
                {"lease_token": job["lease_token"]},
            )
            logger.info("Printed job %s for order %s", job["id"], job.get("order_id"))
        except Exception as exc:  # report the exact device/network failure for retry
            logger.exception("Print job %s failed", job.get("id"))
            try:
                api_request(
                    "POST",
                    f"/printer-agent/jobs/{job['id']}/fail",
                    {"lease_token": job["lease_token"], "error": str(exc)[:1000]},
                )
            except Exception:
                logger.exception("Could not report failed print job %s", job.get("id"))
    return len(jobs)


def main() -> None:
    logger.info(
        "Sakorio printer agent started (transport=%s, dry_run=%s)",
        PRINTER_TRANSPORT,
        DRY_RUN,
    )
    while True:
        try:
            api_request("POST", "/printer-agent/heartbeat")
            processed = run_once()
            if not processed:
                time.sleep(POLL_SECONDS)
        except (HTTPError, URLError, TimeoutError, OSError) as exc:
            logger.warning("Printer API unavailable: %s", exc)
            time.sleep(max(POLL_SECONDS, 5))
        except Exception:
            logger.exception("Unexpected printer-agent error")
            time.sleep(max(POLL_SECONDS, 5))


if __name__ == "__main__":
    main()
