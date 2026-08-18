# Sakorio XP-80T Implementation Pass 11 — No-Mac iPad Printer Worker Simulation

Date: 2026-08-19  
Scope: XP-80T native Bluetooth printing preparation before Mac/Xcode/hardware testing

## Outcome

This pass adds a no-hardware iPad printer worker simulation.

Added:

- `front/src/app/services/ipad-printer-job-runner.ts`
- `front/scripts/test-ipad-printer-worker-simulation.mjs`
- `npm run test:ipad-printer-worker-sim`

Updated:

- `front/src/app/services/ipad-printer-worker.service.ts`
- `front/package.json`

## Why this matters

The real XP-80T Bluetooth test still requires a Mac, Xcode, iPad, and physical printer. Until that hardware path is available, we can still test the critical job lifecycle:

1. leased print job received;
2. receipt payload rendered into ESC/POS bytes;
3. native printer print call attempted;
4. successful jobs complete their lease;
5. failed jobs report an error for backend retry.

This gives Sakorio a stronger pre-hardware safety net.

## Implementation

The print-job execution logic was extracted into a pure runner:

```ts
runIpadPrintJob(job, runner)
```

The live Angular service now calls that runner. The test script also calls the same runner with fake printer/backend functions.

This avoids a fake parallel implementation.

## Simulated use cases

### XP80T-W01 — Kitchen job success

Flow:

1. Simulate a leased kitchen print job.
2. Render ESC/POS receipt bytes.
3. Call fake XP-80T print function.
4. Complete backend lease.

Expected:

- print runs first;
- ESC/POS initialize bytes are present;
- complete is called with the correct job id and lease token;
- fail is not called.

### XP80T-W02 — Customer receipt success

Flow:

1. Simulate a leased customer receipt.
2. Render item totals, subtotal, tip, total, and terminal payment method.
3. Print successfully.
4. Complete backend lease.

Expected:

- receipt produces a larger paid-bill byte payload;
- complete is called;
- no failure path is triggered.

### XP80T-W03 — Bluetooth disconnect failure

Flow:

1. Simulate a leased kitchen job.
2. Fake XP-80T print function throws `Simulated Bluetooth disconnect`.
3. Runner reports failure to backend.

Expected:

- complete is not called;
- fail is called with the same job id and lease token;
- original error message is preserved for operator troubleshooting.

## Verification commands

```bash
docker exec pos-front npm run test:ipad-printer-worker-sim
docker exec pos-front npm run test:xp80t-receipt-renderer
docker exec pos-front npm run build -- --configuration production-static
docker exec pos-back python -m pytest -q tests/test_printing_service.py tests/test_printing_routes.py
```

## Remaining physical requirement

This pass does not prove Bluetooth radio behavior. It proves the iPad worker lifecycle around the native print call.

Still required:

1. Mac/Xcode project generation.
2. Build onto real iPad.
3. Pair real XP-80T.
4. Run kitchen ticket print.
5. Run cashier paid receipt print.
6. Test reconnect after iPad/printer sleep.

