# Carer Vista Pro — Maintenance Log

## Problem statement
> "Look very closely over the code of this app. A wingman messed it up... Vercel is not building it is error after error. This is the current error: Type error: File 'src/components/app-header.tsx' is not a module."

## Root cause (2026-01)
On branch `fix/review-pass-1` a series of "Verify build: ..." commits replaced
the entire contents of two source files with a single base64-encoded line:

- `src/components/app-header.tsx` — base64 string + trailing plain-text
  `EmergencyFallbackIcon` function. The base64, once decoded, also contained
  embedded typos (`/ <AppLogo`, non-existent `text-navy-600` color).
- `src/lib/i18n.ts` — single base64 line that decoded to a severely broken
  fragment (no `es` dictionary, no `TranslationKey` type, stray quote chars).

TypeScript refused to treat these as modules → Vercel build failed.

## Fix (branch `fix/review-pass-2`, commit 11d3642)
- Restored `app-header.tsx` from decoded base64, fixed typos (`forest-600`,
  removed stray `/`).
- Restored `i18n.ts` from `main` and re-added the `auth.*` + `setup.*` keys
  plus the `useTranslation()` hook needed by `login/page.tsx` and
  `setup/setup-wizard.tsx`.
- Verified locally: `yarn build` succeeds with 0 warnings, 53/53 pages.

## Next action items
- Push branch via "Save to GitHub" and open PR `fix/review-pass-2` →
  `fix/review-pass-1` (or merge directly).
- Re-run Vercel build; it should pass.
- After merge, consider deleting the noisy "Verify build: ..." history with a
  squash-merge to keep the log readable.

## Backlog / future
- Audit the rest of the review-pass-1 commits for any other base64-corrupted
  artifacts (scan script at `/tmp/scan2.py` returned only these two, but the
  history shows many "restoration" commits — worth a manual eyeball).
- Remove `package-lock.json` (yarn is the package manager) to silence the
  Vercel mixed-lockfile warning.
