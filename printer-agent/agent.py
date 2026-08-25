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
import subprocess
import tempfile
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


def load_env_file(path: Path = Path(".env")) -> None:
    """Load simple KEY=VALUE lines so `python agent.py` works from this folder.

    Existing environment variables win over `.env` values. This keeps scheduled
    tasks/services configurable without requiring python-dotenv.
    """
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


load_env_file(Path(__file__).with_name(".env"))

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
PRINTER_SERIAL_DTR_RTS = os.getenv("PRINTER_SERIAL_DTR_RTS", "true").lower() in {
    "1",
    "true",
    "yes",
    "on",
}
PRINTER_SERIAL_OPEN_RETRIES = max(
    1, int(os.getenv("PRINTER_SERIAL_OPEN_RETRIES", "3"))
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
        if os.name == "nt":
            send_windows_serial(data)
            return
        raise RuntimeError(
            "Bluetooth serial printing requires pyserial on this operating system. "
            "Install it in the printer-agent environment with: python -m pip install pyserial"
        ) from exc

    with serial_module.Serial(
        PRINTER_SERIAL_PORT,
        baudrate=PRINTER_SERIAL_BAUDRATE,
        timeout=PRINTER_SERIAL_TIMEOUT_SECONDS,
        write_timeout=PRINTER_SERIAL_TIMEOUT_SECONDS,
    ) as printer:
        if PRINTER_SERIAL_DTR_RTS:
            printer.dtr = True
            printer.rts = True
        printer.write(data)
        printer.flush()


def windows_serial_path(port: str) -> str:
    clean_port = port.strip()
    if clean_port.startswith("\\\\.\\"):
        return clean_port
    return f"\\\\.\\{clean_port}"


def send_windows_serial(data: bytes) -> None:
    """Fallback Windows COM writer for Bluetooth SPP printers.

    This avoids requiring pyserial on a shop PC. Many small Bluetooth receipt
    printers expose an SPP COM port that only opens reliably through Windows'
    SerialPort API with DTR/RTS asserted, so use PowerShell/.NET rather than
    Python's raw file API.
    """
    timeout_ms = int(max(PRINTER_SERIAL_TIMEOUT_SECONDS, 1.0) * 1000)
    data_path: str | None = None
    script_path: str | None = None
    script = r"""
param(
  [string]$PortName,
  [int]$BaudRate,
  [int]$TimeoutMs,
  [int]$UseDtrRts,
  [int]$OpenRetries,
  [string]$DataPath
)
$ErrorActionPreference = 'Stop'
$bytes = [System.IO.File]::ReadAllBytes($DataPath)
$lastError = $null
for ($attempt = 1; $attempt -le $OpenRetries; $attempt++) {
  $printer = New-Object System.IO.Ports.SerialPort $PortName,$BaudRate,'None',8,'One'
  $printer.WriteTimeout = $TimeoutMs
  $printer.ReadTimeout = $TimeoutMs
  if ($UseDtrRts -eq 1) {
    $printer.DtrEnable = $true
    $printer.RtsEnable = $true
  }
  try {
    $printer.Open()
    $printer.Write($bytes, 0, $bytes.Length)
    return
  } catch {
    $lastError = $_
    if ($attempt -lt $OpenRetries) {
      Start-Sleep -Seconds 2
    }
  } finally {
    if ($printer.IsOpen) {
      $printer.Close()
    }
    $printer.Dispose()
  }
}
throw $lastError
"""
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".bin") as data_file:
            data_file.write(data)
            data_path = data_file.name
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=".ps1", mode="w", encoding="utf-8"
        ) as script_file:
            script_file.write(script)
            script_path = script_file.name
        result = subprocess.run(
            [
                "powershell",
                "-NoProfile",
                "-ExecutionPolicy",
                "Bypass",
                "-File",
                script_path,
                "-PortName",
                PRINTER_SERIAL_PORT,
                "-BaudRate",
                str(PRINTER_SERIAL_BAUDRATE),
                "-TimeoutMs",
                str(timeout_ms),
                "-UseDtrRts",
                "1" if PRINTER_SERIAL_DTR_RTS else "0",
                "-OpenRetries",
                str(PRINTER_SERIAL_OPEN_RETRIES),
                "-DataPath",
                data_path,
            ],
            check=True,
            capture_output=True,
            text=True,
        )
        if result.stderr:
            logger.debug("Windows serial stderr: %s", result.stderr.strip())
    except subprocess.CalledProcessError as exc:
        detail = (exc.stderr or exc.stdout or str(exc)).strip()
        raise RuntimeError(
            f"Windows could not open {PRINTER_SERIAL_PORT}. "
            "Confirm the printer is powered on, awake, close to this PC, paired, "
            "and not connected to another device. If Bluetooth settings show the "
            "COM port but this still fails, remove and re-pair the printer, then "
            "recreate the outgoing COM port. "
            f"Details: {detail}"
        ) from exc
    finally:
        for path in (data_path, script_path):
            if path:
                try:
                    Path(path).unlink(missing_ok=True)
                except OSError:
                    logger.debug("Could not delete temporary serial helper %s", path)


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
