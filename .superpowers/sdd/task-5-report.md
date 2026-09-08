# Task 5 report: Groups list badge + leave/delete UX

## Status

Complete.

- Groups list rows display an `Owned` or `Shared` chip using `groupListBadge`.
- Mobile swipe actions remain `Delete` for owners/local groups and become `Leave` for cloud members.
- Member leave actions require confirmation, call `leaveGroup`, and reload server data.
- Group detail uses owner-only delete behavior and presents cloud members with a leave action.
- Leave failures keep the group visible and display an error message.

## Verification

- `npm test`: 57 tests passed, 0 failed.
- `npm run build`: passed with the existing large-chunk and stale Browserslist data warnings.

## Commits

- `70d4f0b feat(ui): owned/shared badges and leave group for members`

## Concerns

- The two-account Supabase Phase A checkpoint was not run because this environment does not provide test account credentials.
- No component test framework is configured; UI behavior is covered by the production build and existing membership helper tests.
