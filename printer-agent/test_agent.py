import importlib.util
import unittest
from pathlib import Path
from unittest.mock import patch


def load_agent(env: dict[str, str] | None = None):
    base_env = {
        "API_BASE_URL": "https://api.sakorio.test",
        "PRINTER_AGENT_TOKEN": "test-token",
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


if __name__ == "__main__":
    unittest.main()
