# 0073 — Post-Deploy Live QA for `0e59ede8`

Date: 2026-07-18  
Environment: live Sakorio staging domains  
Build observed in staff app: POS 2.1.6 `0e59ede8`  
Browser-only rule: followed.

## Render deployment

Render showed `Deploy live for 0e59ede: Default POS checkout to terminal` on the staff web service.

## QA results

| Area | Browser path | Result |
| --- | --- | --- |
| POS checkout default | `staff.sakorio.com/pos` → opened existing T07 bill → Checkout | Passed. Selected method was `Terminal`; primary action was `Charge terminal - SGD 0.00`. Staff Cash remained visible as a manual option. |
| Kitchen live shift | `staff.sakorio.com/kitchen` | Passed. Live board showed no stale tickets. `Review backlog 56` was visible, with copy explaining unresolved tickets older than `6h` are hidden from live shift. |
| Tables QR activation | `staff.sakorio.com/tables` → T04 → Start order | Passed. Idle drawer showed `Open table for QR ordering`; clicking it changed drawer to `Ready`, switched to Table QR, and changed T04 card to `SEATED · START ORDER`. |
| Customer QR activation | `order.sakorio.com/menu/...` for T04 | Passed. After activation, customer QR showed menu items and ordering prompt. |
| Cleanup | Staff Tables → T04 → Close table → Confirm | Passed. T04 returned to `IDLE TABLE`; customer QR returned to `Table Closed`. |

## Notes

- No order was created during the QR activation check.
- T04 was cleaned back to idle after the test.
- Existing old KDS tickets are intentionally preserved behind backlog mode; this pass only validated the live-shift split.
