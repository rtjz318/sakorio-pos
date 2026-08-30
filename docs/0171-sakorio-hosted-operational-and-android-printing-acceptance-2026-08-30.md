# Sakorio hosted operational and Android printing acceptance — 30 August 2026

## Scope

This pass combined a real hosted-browser restaurant workflow with software-level Android APK verification. It used an isolated QA order and did not alter the pre-existing open bills or historical restaurant sessions.

## Hosted workflow executed

### POS and table lifecycle

1. Signed in to the hosted staff application with the existing owner account.
2. Selected available table T07.
3. Added Kimchi (SGD 4.00), Green Tea (SGD 5.00), and Tonkotsu Ramen (SGD 12.80).
4. Sent the three-item order to the kitchen as order 271.
5. Verified that the active table bill was SGD 21.80.
6. Recorded an isolated terminal payment for order 271.
7. Verified the `Paid · Terminal` state and paid-today amount of SGD 21.80.
8. Closed T07 through the final confirmation.
9. Verified that T07 returned to `Available`.
10. Verified order 271 in Orders → History with the correct table, three items, total, and paid state.

Result: **Pass, with one refresh polish item fixed in code.** Immediately after the original send, the hosted POS briefly showed an empty/new-order drawer until reloaded. A bounded one-time refresh retry is now implemented so a newly created order becomes visible without asking the cashier to reload.

### Kitchen display

- Order 271 reached the live Kitchen board.
- Item routing was correct: Kimchi and Tonkotsu Ramen to Kitchen; Green Tea to Beverage.
- The ticket advanced through New → Preparing → Ready → Served.
- Serving displayed the completion toast, item count, and countdown.
- The served ticket then left the active board.

Result: **Pass.**

### Print-job generation

The hosted backend generated the expected jobs for order 271:

- one Beverage ticket for Green Tea;
- two Kitchen tickets, preserving item-per-slip behavior;
- one customer receipt after settlement.

The Printing page showed all three configured agents offline, with 12 jobs waiting and no jobs requiring operator attention. Therefore queue generation and routing passed, but physical paper output was not claimed.

Result: **Software pass; physical output still gated by an online Android printer agent.**

### Orders and history

- The closed order was absent from the active order view.
- Searching History for `271` returned the correct table session and items.
- Existing orders 257, 261, 263, and payment-requested order 270 were left untouched.

Result: **Pass.**

### Attendance and timetable

- The shared-device profile selector listed the configured staff profiles.
- Selecting QA Waiter updated the clock-in view without requiring a preplanned shift.
- The page explained that actual clock-in/out times populate the Timetable.
- Timetable exposed scheduling, employee readiness, and leave/MC ledger controls without console errors.

No attendance event was created because a real staff member and camera proof were not present.

Result: **UI and workflow pass; physical staff acceptance remains.**

### Reservations and queue

- Reservations opened on the current service date with search/filter controls and no console errors.
- Queue showed zero waiting/notified/seated guests and exposed the permanent public QR.
- One stale queue record remains behind Review/Archive controls.

The stale record was not archived because archival is an operational deletion decision and was not required for the isolated order test.

Result: **Pass for current-day empty-state operation; stale-data cleanup remains a manager task.**

### HitPay

- Hosted settings confirmed Sandbox mode, SGD currency, and configured API credentials/webhook salt.
- POS correctly separated staff counter methods from customer QR HitPay/card checkout.
- The signed fixed-QR URL could not be opened by the automated browser because its credential-bearing URL was blocked by browser security policy.

Result: **Configuration verified; the real sandbox checkout lifecycle still requires a customer device/manual browser that is permitted to open the signed QR.**

## Android printing improvements completed

### Secure printer token

- Added a Capacitor `SakorioSecureStorage` Android plugin.
- The agent token is encrypted using AES-GCM.
- The AES key is generated and retained by Android Keystore.
- Only ciphertext and IV are stored in app-private SharedPreferences.
- The generated Android app registers the plugin in `MainActivity`.
- Clearing app data or uninstalling the app intentionally removes the stored token and key.

### Operator wording

The live configuration copy is now platform-accurate:

- `XP-80T tablet app`, not `XP-80T iPad app`;
- `Sakorio tablet app`, not `Sakorio iPad app`;
- `Native tablet Bluetooth`, not `Native iPad Bluetooth`;
- Android Keystore guidance, not iOS Keychain guidance.

Existing backend enum values remain unchanged to avoid a migration or compatibility break.

## Verification evidence

| Check | Result |
|---|---:|
| XP-80T readiness scenarios | Pass |
| XP-80T native scaffold validation | Pass |
| Capacitor Android readiness validation | Pass |
| Printer worker simulations | Pass |
| ESC/POS receipt-renderer scenarios | Pass |
| Angular production-static build | Pass |
| Angular hot-reload compiler log | Pass |
| Local HAProxy application response | Pass — HTTP 200 |
| Isolated JDK 21 Android `assembleDebug` | Pass — 93 tasks |

The Android build was run in an isolated temporary copy because Android Studio/OneDrive held generated resource folders in the normal project output. The isolated build compiled the same tracked source and produced an APK successfully. The required build JDK remains the existing JDK 21; Android Studio's bundled Java 25 is incompatible with the current Gradle/Groovy chain.

Known non-blocking build warnings remain: the existing Angular component-style budgets, the `dijkstrajs` CommonJS optimization warning, Gradle `flatDir` guidance, and an existing deprecated Android Bluetooth API note.

The landing Puppeteer script completed its reachability probe but could not launch because its container was configured with a macOS Chrome executable path on this Windows host. The minimum local smoke was therefore completed directly against HAProxy (HTTP 200), while the functional evidence comes from the executed hosted-browser workflow above.

## Post-deployment hosted verification

- `staff.sakorio.com` reported version `2.1.6 0c1b2619` after the development deployment completed.
- Settings → Printing displayed `XP-80T TABLET APP`, `Sakorio tablet app`, `Native tablet Bluetooth`, Android-tablet setup guidance, and the Android Keystore security note.
- The former XP-80T/Sakorio/native iPad labels were absent.
- Browser mode correctly reported that the native printer and secure-storage plugins are unavailable there; those capabilities are intentionally exposed only by the Android APK.
- The hosted Printing page produced no browser console errors during this verification.

## Remaining launch gates

1. Install the newly built APK on the shop Android tablet.
2. Pair the physical XP-80T and configure one active agent token in Settings → Printing.
3. Confirm the agent count changes from 0/3 to online.
4. Print a three-item kitchen order and verify three separate item slips, cut behavior, company heading, and routing.
5. Print a paid customer receipt and verify item prices and SGD total.
6. Power-cycle the tablet/app and confirm the Keystore-backed token survives and the worker reconnects.
7. Complete HitPay sandbox success, cancel, retry, abandonment, webhook, and POS-return scenarios.
8. Run one real camera-backed staff clock-in/break/clock-out cycle.
9. Obtain a manager decision before archiving the stale queue entry or settling pre-existing order 270.

## Assessment

The isolated hosted POS order lifecycle, Kitchen flow, terminal settlement, table reset, order history, print-job generation, and Android software build are verified. Sakorio is software-ready for the next physical acceptance session. It should not yet be described as 100% launch-accepted until the physical XP-80T, HitPay sandbox lifecycle, and real attendance cycle are completed.
