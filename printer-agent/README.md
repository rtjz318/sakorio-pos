# Sakorio printer agent

This small process runs on a device inside the restaurant. It connects outward
to the Sakorio API, leases durable receipt jobs, and sends ESC/POS bytes to a
receipt printer through the configured local transport.

Supported transports:

- `network` — Wi-Fi/LAN printer by fixed IP and raw TCP port, usually `9100`.
- `bluetooth_serial` — paired Bluetooth printer exposed by the operating system
  as a serial port such as `COM5`, `/dev/cu.*`, or `/dev/rfcomm*`.

## Setup

1. Create a printer agent in Sakorio's printing settings/API. Copy the token;
   it is shown only once.
2. Copy `.env.example` values into machine environment variables.
3. Set `PRINTER_TRANSPORT=network`.
4. Set `PRINTER_HOST` to the printer's fixed LAN IP and confirm raw TCP port
   `9100` is enabled.
5. Start with `python agent.py`.

No inbound port or router forwarding is required. Jobs survive browser closes,
API restarts, printer outages, and agent restarts. Failed jobs retry with
backoff and remain visible to the restaurant owner.

## Bluetooth-only printer setup

Bluetooth printing works when the printer is paired to a device that can expose
it as a serial port. This is closest to a Loyverse-style local printer bridge:
Sakorio queues the receipt, the bridge device keeps the Bluetooth connection,
then the bridge writes ESC/POS bytes to the printer.

1. Pair the Bluetooth receipt printer in the operating system settings.
2. Find the assigned serial port:
   - Windows: Device Manager → Ports, usually `COM5`, `COM6`, etc.
   - macOS: `/dev/cu.*`.
   - Linux/Raspberry Pi: `/dev/rfcomm*` after binding the device.
3. Install the optional serial dependency in the agent environment:
   `python -m pip install pyserial`.
4. Configure:

   ```env
   PRINTER_TRANSPORT=bluetooth_serial
   PRINTER_SERIAL_PORT=COM5
   PRINTER_SERIAL_BAUDRATE=9600
   PRINTER_DRY_RUN=false
   ```

5. Start with `python agent.py`, create a test order, and confirm the delivery
   log changes from `pending` to `completed`.

If the printer uses a vendor iOS SDK instead of Bluetooth serial, keep using
the Sakorio print-job API but implement the Bluetooth delivery inside a native
iPad companion app. The browser POS should still create orders/payments; the
native companion app should lease jobs from `/printer-agent/jobs/lease`, print
over the vendor Bluetooth SDK, and mark jobs complete.

## Test without a printer

Set `PRINTER_DRY_RUN=true`. The agent writes the exact ESC/POS payload into
`print-output/` and still completes the job, allowing end-to-end staging QA.

## Production notes

- Reserve the printer IP in the restaurant router.
- Run one station-scoped agent per prep printer, or one unscoped agent for all
  jobs when a single kitchen printer is used.
- Configure the process as a Windows scheduled task or service so it starts at
  boot and restarts after failure.
- For Bluetooth-only printers, keep the bridge device close to the printer and
  test reconnect behaviour after printer power-off, iPad sleep, and router
  restart before launch.
- Keep `PRINTER_AGENT_TOKEN` private. Disable and recreate the agent if exposed.
