import importlib.util
import unittest
import tempfile
from pathlib import Path
from unittest.mock import mock_open, patch


def load_agent(env: dict[str, str] | None = None):
    base_env = {
        "API_BASE_URL": "https://api.sakorio.test",
        "PRINTER_AGENT_TOKEN": "test-token",
        "PRINTER_TRANSPORT": "network",
        "PRINTER_SERIAL_PORT": "",
    }
    if env:
        base_env.update(env)
    with patch.dict("os.environ", base_env, clear=True):
        spec = importlib.util.spec_from_file_location(
            "sakorio_printer_agent", Path(__file__).with_name("agent.py")
        )
        module = importlib.util.module_from_spec(spec)
        assert spec.loader is not None
        spec.loader.exec_module(module)
        return module


class PrinterAgentTransportTests(unittest.TestCase):
    def test_network_transport_is_default(self):
        agent = load_agent()
        sent = []

        agent.send_network = lambda data: sent.append(data)
        agent.send_to_printer(b"receipt")

        self.assertEqual(sent, [b"receipt"])

    def test_bluetooth_serial_transport_dispatches_to_serial_sender(self):
        agent = load_agent({"PRINTER_TRANSPORT": "bluetooth_serial"})
        sent = []

        agent.send_bluetooth_serial = lambda data: sent.append(data)
        agent.send_to_printer(b"receipt")

        self.assertEqual(sent, [b"receipt"])

    def test_bluetooth_serial_requires_serial_port(self):
        agent = load_agent({"PRINTER_TRANSPORT": "bluetooth_serial"})

        with self.assertRaisesRegex(RuntimeError, "PRINTER_SERIAL_PORT is required"):
            agent.send_bluetooth_serial(b"receipt")

    def test_unsupported_transport_fails_with_clear_message(self):
        agent = load_agent({"PRINTER_TRANSPORT": "bluetooth"})

        with self.assertRaisesRegex(RuntimeError, "Unsupported PRINTER_TRANSPORT"):
            agent.send_to_printer(b"receipt")

    def test_dry_run_writes_escpos_receipt_file(self):
        output_dir = Path("tmp/printer-agent-test-output")
        target = output_dir / "print-job-88.bin"
        if target.exists():
            target.unlink()
        agent = load_agent(
            {
                "PRINTER_DRY_RUN": "true",
                "PRINT_OUTPUT_DIR": str(output_dir),
            }
        )

        agent.print_job(
            {
                "id": 88,
                "payload": {
                    "receipt_type": "CUSTOMER RECEIPT",
                    "tenant_name": "seow ting restaurant",
                    "station_name": "Cashier",
                    "order_id": 88,
                    "table_name": "T09",
                    "submitted_at": "2026-08-11T14:00:00+08:00",
                    "currency_code": "SGD",
                    "items": [
                        {
                            "quantity": 2,
                            "name": "Gyoza",
                            "unit_price_cents": 600,
                            "notes": "No chilli",
                        }
                    ],
                    "subtotal_cents": 1200,
                    "total_cents": 1200,
                    "payment_method": "terminal",
                },
            }
        )

        data = target.read_bytes()
        self.assertTrue(data.startswith(b"\x1b\x40"))
        self.assertIn(b"SEOW TING RESTAURANT", data)
        self.assertIn(b"CUSTOMER RECEIPT", data)
        self.assertIn(b"Gyoza", data)
        self.assertIn(b"SGD 12.00", data)
        self.assertTrue(data.endswith(b"\x1d\x56\x00"))

    def test_env_file_loader_does_not_override_existing_environment(self):
        agent = load_agent()
        with tempfile.TemporaryDirectory() as tmp:
            env_path = Path(tmp) / ".env"
            env_path.write_text(
                "API_BASE_URL=https://from-file.test\n"
                "PRINTER_AGENT_TOKEN=file-token\n"
                "PRINTER_SERIAL_PORT=COM4\n",
                encoding="utf-8",
            )
            with patch.dict(
                "os.environ",
                {"API_BASE_URL": "https://existing.test", "PRINTER_AGENT_TOKEN": "existing-token"},
                clear=True,
            ):
                agent.load_env_file(env_path)
                self.assertEqual(agent.os.environ["API_BASE_URL"], "https://existing.test")
                self.assertEqual(agent.os.environ["PRINTER_AGENT_TOKEN"], "existing-token")
                self.assertEqual(agent.os.environ["PRINTER_SERIAL_PORT"], "COM4")

    def test_windows_serial_path_handles_com_ports(self):
        agent = load_agent()

        self.assertEqual(agent.windows_serial_path("COM4"), "\\\\.\\COM4")
        self.assertEqual(agent.windows_serial_path("\\\\.\\COM7"), "\\\\.\\COM7")

    def test_bluetooth_serial_falls_back_to_windows_com_writer_without_pyserial(self):
        agent = load_agent(
            {
                "PRINTER_TRANSPORT": "bluetooth_serial",
                "PRINTER_SERIAL_PORT": "COM4",
                "PRINTER_SERIAL_BAUDRATE": "9600",
            }
        )
        def missing_serial(_name):
            raise ImportError("no pyserial")

        with (
            patch.object(agent, "import_module", missing_serial),
            patch.object(agent.os, "name", "nt"),
            patch.object(agent.subprocess, "run") as run,
        ):
            agent.send_bluetooth_serial(b"receipt")

        run.assert_called_once()
        command = run.call_args.args[0]
        self.assertIn("powershell", command[0])
        self.assertIn("-PortName", command)
        self.assertIn("COM4", command)
        self.assertIn("-UseDtrRts", command)
        self.assertIn("1", command)
        self.assertIn("-OpenRetries", command)
        self.assertIn("3", command)

    def test_run_once_completes_printed_bluetooth_job(self):
        agent = load_agent({"PRINTER_TRANSPORT": "bluetooth_serial", "PRINTER_SERIAL_PORT": "COM5"})
        calls = []

        def fake_api_request(method, path, body=None):
            calls.append((method, path, body))
            if path.startswith("/printer-agent/jobs/lease"):
                return [
                    {
                        "id": 101,
                        "lease_token": "lease-token-101",
                        "job_type": "kitchen_receipt",
                        "order_id": 501,
                        "kitchen_station_id": 1,
                        "payload": {"order_id": 501, "items": [{"quantity": 1, "name": "Tea"}]},
                    }
                ]
            return {"status": "ok"}

        printed = []
        agent.api_request = fake_api_request
        agent.send_bluetooth_serial = lambda data: printed.append(data)

        processed = agent.run_once()

        self.assertEqual(processed, 1)
        self.assertEqual(len(printed), 1)
        self.assertIn(b"Tea", printed[0])
        self.assertIn(
            (
                "POST",
                "/printer-agent/jobs/101/complete",
                {"lease_token": "lease-token-101"},
            ),
            calls,
        )

    def test_run_once_reports_failed_bluetooth_job_for_retry(self):
        agent = load_agent({"PRINTER_TRANSPORT": "bluetooth_serial", "PRINTER_SERIAL_PORT": "COM5"})
        calls = []

        def fake_api_request(method, path, body=None):
            calls.append((method, path, body))
            if path.startswith("/printer-agent/jobs/lease"):
                return [
                    {
                        "id": 102,
                        "lease_token": "lease-token-102",
                        "job_type": "customer_receipt",
                        "order_id": 502,
                        "kitchen_station_id": None,
                        "payload": {"order_id": 502, "items": [{"quantity": 1, "name": "Ramen"}]},
                    }
                ]
            return {"status": "ok"}

        agent.api_request = fake_api_request

        def fail_send(_data):
            raise RuntimeError("Bluetooth printer disconnected")

        agent.send_bluetooth_serial = fail_send

        processed = agent.run_once()

        self.assertEqual(processed, 1)
        fail_calls = [call for call in calls if call[1] == "/printer-agent/jobs/102/fail"]
        self.assertEqual(len(fail_calls), 1)
        self.assertEqual(fail_calls[0][2]["lease_token"], "lease-token-102")
        self.assertIn("Bluetooth printer disconnected", fail_calls[0][2]["error"])


if __name__ == "__main__":
    unittest.main()
