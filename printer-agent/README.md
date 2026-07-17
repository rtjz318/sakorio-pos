# Sakorio printer agent

This small process runs on a Windows PC or mini-PC inside the restaurant. It
connects outward to the Sakorio API, leases durable receipt jobs, and sends
ESC/POS bytes to a network receipt printer over the restaurant Wi-Fi/LAN.

## Setup

1. Create a printer agent in Sakorio's printing settings/API. Copy the token;
   it is shown only once.
2. Copy `.env.example` values into machine environment variables.
3. Set `PRINTER_HOST` to the printer's fixed LAN IP and confirm raw TCP port
   `9100` is enabled.
4. Start with `python agent.py`.

No inbound port or router forwarding is required. Jobs survive browser closes,
API restarts, printer outages, and agent restarts. Failed jobs retry with
backoff and remain visible to the restaurant owner.

## Test without a printer

Set `PRINTER_DRY_RUN=true`. The agent writes the exact ESC/POS payload into
`print-output/` and still completes the job, allowing end-to-end staging QA.

## Production notes

- Reserve the printer IP in the restaurant router.
- Run one station-scoped agent per prep printer, or one unscoped agent for all
  jobs when a single kitchen printer is used.
- Configure the process as a Windows scheduled task or service so it starts at
  boot and restarts after failure.
- Keep `PRINTER_AGENT_TOKEN` private. Disable and recreate the agent if exposed.
