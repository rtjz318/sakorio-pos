# 0072 — POS Terminal Default Payment Polish

Date: 2026-07-18  
Scope: Staff POS checkout

## Reason

Launch QA showed that the public customer QR checkout correctly exposes only HitPay and card terminal, but staff POS still defaulted to Cash. Cash remains a business-policy decision, so it was not removed.

## Change

- Staff POS now defaults to `card_terminal`.
- If HitPay is selected but unavailable, the POS falls back to `card_terminal` instead of Cash.
- Staff Cash remains available as an explicit manual staff choice.

## Expected launch effect

Waiters/cashiers are guided toward terminal settlement by default, while managers still retain the option to record staff Cash if the restaurant chooses to accept it.
