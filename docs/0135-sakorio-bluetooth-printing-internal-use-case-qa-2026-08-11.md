# Sakorio Bluetooth Printing Internal Use-Case QA

Date: 2026-08-11  
Scope: Internal verification of Bluetooth-compatible receipt printing workflow  
Environment: Local repository on `development`, Docker backend/frontend containers, bundled Python runtime

## Summary

The Bluetooth printing workflow passed internal use-case testing. Sakorio now
keeps the existing durable print-job queue and can deliver receipts through the
printer agent using either:

- `network` transport for WiFi/LAN raw TCP printing; or
- `bluetooth_serial` transport for a paired Bluetooth printer exposed as a
  serial/COM port.

Physical Bluetooth printer validation is still required when the printer
arrives, because internal tests can verify queueing, payload generation,
transport dispatch, and retry logic, but cannot verify the final hardware’s
Bluetooth SDK/serial behavior.

## Test commands run

```powershell
& 'C:\Users\rickt\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' printer-agent/test_agent.py
docker exec pos-back python -m pytest -q tests/test_printing_service.py
docker exec pos-front npm run build -- --configuration production-static
```

## Results overview

| Area | Result | Notes |
| --- | ---: | --- |
| Printer-agent Bluetooth/internal tests | Pass | 7/7 use-case tests passed |
| Backend print-job creation tests | Pass | 5/5 tests passed |
| Frontend build / Printing Settings copy | Pass | Build completed successfully |
| Known existing warnings | Non-blocking | Existing SCSS budget and CommonJS warnings remain |
| Physical Bluetooth printer output | Pending hardware | Must be tested with the actual printer |

## Use-case scorecard

| Case ID | Use case | Expected result | Actual result | Score |
| --- | --- | --- | --- | ---: |
| BT-UC-001 | Default printer bridge starts without explicit transport | Uses existing WiFi/LAN `network` path so current deployments do not break | Passed; `send_to_printer` dispatched to network sender | 10/10 |
| BT-UC-002 | Bluetooth-only printer bridge configured with `PRINTER_TRANSPORT=bluetooth_serial` | Agent dispatches receipt bytes to Bluetooth serial sender | Passed; Bluetooth sender called with receipt bytes | 10/10 |
| BT-UC-003 | Bluetooth mode missing COM/serial port | Clear configuration error instead of silent failure | Passed; raised `PRINTER_SERIAL_PORT is required` | 10/10 |
| BT-UC-004 | Invalid transport value such as `bluetooth` | Clear unsupported transport error | Passed; raised `Unsupported PRINTER_TRANSPORT` | 10/10 |
| BT-UC-005 | Dry-run customer receipt before hardware arrives | ESC/POS receipt file is generated, contains item/totals, includes cut command | Passed; generated file starts with init command and ends with cut command | 10/10 |
| BT-UC-006 | Bluetooth kitchen ticket prints successfully | Agent leases job, renders receipt, sends to Bluetooth transport, marks job complete | Passed; job completed via `/printer-agent/jobs/101/complete` | 10/10 |
| BT-UC-007 | Bluetooth printer disconnects during print | Job is marked failed with error so backend can retry; receipt is not lost | Passed; job reported to `/printer-agent/jobs/102/fail` with disconnect message | 10/10 |
| BT-UC-008 | Kitchen/bar receipt queue still creates prep tickets | Existing backend kitchen/bar print-job behavior remains intact | Passed; backend printing tests 5/5 | 10/10 |
| BT-UC-009 | Customer receipt queue still creates one paid receipt | Existing paid-order receipt behavior remains intact | Passed; backend customer receipt tests included | 10/10 |
| BT-UC-010 | Staff Printing Settings UI still compiles after workflow copy updates | Angular build succeeds with no template/compiler error | Passed; production-static build completed | 10/10 |

## Internal QA observations

1. The Bluetooth workflow is compatible with Sakorio’s current print queue.
2. Existing WiFi/LAN printer-agent behavior remains the default and is not
   broken by the Bluetooth change.
3. The failure path is safe: if Bluetooth printing fails, the job is reported
   as failed and scheduled for retry instead of disappearing.
4. Dry-run mode is useful for setup rehearsal before the physical printer is
   paired.
5. The staff settings screen now describes the bridge correctly: WiFi/LAN or
   paired Bluetooth serial.

## Launch caveats

The final launch score cannot be 10/10 until the actual printer is physically
tested. The unresolved hardware-dependent points are:

1. Whether the printer exposes Bluetooth as a serial/COM port.
2. Whether the printer baud rate is `9600` or requires another value.
3. Whether the printer supports the ESC/POS cut command used by Sakorio.
4. Whether the printer reconnects cleanly after power-off/sleep.
5. Whether an iPad-only setup needs a native iPad companion app instead of a
   small bridge device.

## Physical printer acceptance checklist

When the XP-N160II Bluetooth printer arrives:

1. Pair it with the bridge device.
2. Identify the serial/COM port.
3. Set:

   ```env
   PRINTER_TRANSPORT=bluetooth_serial
   PRINTER_SERIAL_PORT=COM5
   PRINTER_SERIAL_BAUDRATE=9600
   PRINTER_DRY_RUN=false
   ```

4. Create a kitchen order from Sakorio POS.
5. Confirm kitchen ticket prints.
6. Pay the bill.
7. Confirm customer receipt prints once.
8. Turn printer off and submit a test job.
9. Turn printer back on and confirm retry behavior.
10. Confirm Printing Settings shows the bridge online and no failed jobs remain.

## Verdict

Internally, the Bluetooth-compatible Sakorio workflow is working and safe to
deploy to staging/development. It is ready for physical printer acceptance
testing, but not yet fully hardware-certified until tested against the actual
Bluetooth printer in the shop.
