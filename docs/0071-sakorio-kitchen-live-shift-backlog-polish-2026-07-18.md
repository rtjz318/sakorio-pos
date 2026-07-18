# 0071 — Kitchen Live Shift Backlog Polish

Date: 2026-07-18  
Scope: Kitchen & beverages launch polish

## Reason

Browser QA showed that the Kitchen board was technically working, but old unresolved rehearsal tickets still dominated the live service view. The existing backlog feature was present, but the “current shift” window was 24 hours, so tickets from many hours earlier still appeared as live work.

## Change

- Kitchen live board now treats the current shift as the last 6 hours.
- Tickets older than 6 hours remain unresolved but are hidden from the live pass.
- Managers can still open `Review backlog` and use the existing backlog clear workflow.
- The backlog notice now explains that hidden tickets are older than `6h`, so staff understand why the live board is cleaner.

## Expected launch effect

- New food/drink tickets stay visible and route normally.
- Old demo/rehearsal tickets stop drowning the pass.
- Backlog cleanup remains deliberate, manager-visible, and separate from active service.
