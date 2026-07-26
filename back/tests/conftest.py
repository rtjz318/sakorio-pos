"""Pytest: env before any test module imports `app`."""
import os
import sys
from pathlib import Path

os.environ["RATE_LIMIT_ENABLED"] = "false"

BACK_ROOT = Path(__file__).resolve().parents[1]
if str(BACK_ROOT) not in sys.path:
    sys.path.insert(0, str(BACK_ROOT))

loaded_app = sys.modules.get("app")
if loaded_app is not None and Path(getattr(loaded_app, "__file__", "")).resolve() == (BACK_ROOT / "__init__.py").resolve():
    del sys.modules["app"]
