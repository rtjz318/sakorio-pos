# Priced menu add-ons and larger receipt printing

Date: 2026-11-24  
Target: Morinaga Ramen Izakaya and future Sakorio tenants

## Delivered workflow

- A menu item can ask one or more choice questions in a popup on the customer QR menu, Tables order flow, and Cashier POS.
- The staff product catalog includes customization questions in one request, so Cashier POS never silently bypasses a configured popup.
- Every choice can have a zero or positive surcharge.
- The UI displays priced choices such as `Add noodles (+SGD 1.50)`.
- The cart uses the base item price plus selected add-ons before calculating service charge and GST.
- The API validates the selected option and recalculates its surcharge from server-owned product settings. A modified client request cannot submit its own price.
- The final unit-price snapshot is stored on the order item, so bills, reports, void/refund calculations, customer receipts, and payment totals use the same amount.
- ESC/POS output now uses double-height, normal-width text and resets the font before cutting. The 42-character 80 mm layout remains unchanged.

## Product setup

Open **Products**, edit a product, and add a choice question. Enter one option per line. A priced option uses:

```text
No extra noodles
Add noodles | 1.50
Double noodles | 3.00
```

The value after `|` is the surcharge in the tenant currency. Unpriced lines add zero. The same format supports a karaage size question:

```text
2 pc
4 pc | 5.00
```

For the existing SGD 6.00 two-piece and SGD 11.00 four-piece karaage prices, the four-piece surcharge is SGD 5.00. Once the popup is confirmed live, the separate four-piece product can be disabled to avoid duplicate choices.

## Verification completed

- Backend customization, order-pricing, and receipt regressions: 16 passed.
- Customer/staff add-on price utility: passed for SGD 1.50 and SGD 3.00 options.
- XP-80T renderer: four receipt use cases passed, including large-font ESC/POS commands and the existing paper-cut command.
- Printer agent: ten tests passed, including dry-run receipt bytes and Bluetooth retry behavior.
- Angular production build: passed.

## Live acceptance checklist

1. Configure one ramen with the three noodle choices above.
2. Scan a fixed table QR and select `Add noodles (+SGD 1.50)`.
3. Confirm the customer cart increases by SGD 1.50 before service charge and GST.
4. Confirm the Cashier POS and table bill show the same total.
5. Print a kitchen ticket and customer receipt; confirm the chosen option is legible and the receipt text is larger.
6. Configure karaage as `2 pc` / `4 pc (+SGD 5.00)`, then repeat the total and print checks.

