from app import models
from app.printing_routes import _agent_dict


def test_printer_agent_dict_includes_xp80t_metadata():
    agent = models.PrinterAgent(
        id=7,
        tenant_id=1,
        name="Cashier iPad XP-80T",
        token_hash="token-hash",
        kitchen_station_id=None,
        device_type="xp80t",
        transport="ios_bluetooth",
        app_version="ios-0.1.0",
    )

    row = _agent_dict(agent)

    assert row["id"] == 7
    assert row["device_type"] == "xp80t"
    assert row["transport"] == "ios_bluetooth"
    assert row["app_version"] == "ios-0.1.0"
