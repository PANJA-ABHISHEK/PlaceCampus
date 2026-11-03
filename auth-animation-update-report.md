# PlaceCampus Authentication Animation Update Report

## Scope

Updated the shared authentication presentation used by `/login`, `/register`, and the existing forgot-password page. Authentication provider, API client, JWT/session behavior, role redirects, backend routes, registration DTOs, and Zod rules were preserved.

## Files changed

- `apps/web/features/auth/components/auth-layout.tsx`
- `apps/web/features/auth/components/auth-illustration.tsx` (new)
- `apps/web/features/auth/components/auth-motion.module.css` (new)
- `apps/web/features/auth/components/auth-input.tsx`
- `apps/web/features/auth/components/login-form.tsx`
- `apps/web/features/auth/components/register-form.tsx`
- `auth-animation-update-report.md` (this report)

## Changes

- Replaced the shared undefined navy color token that caused white-on-pale text with the defined navy token and accessible white copy.
- Replaced the illustration placeholder with a responsive CSS/SVG readiness composition: profile card, sample readiness ring, verified skill, faculty evidence review, and opportunity match. It uses no external image or named company claim.
- Added a compact branded illustration header for mobile, while keeping the split-panel layout on desktop.
- Added scoped GSAP panel/form entrances, staggered form-field entrances, and restrained illustration motion. The existing reduced-motion hook disables GSAP motion; feedback CSS also disables its entrance animation under `prefers-reduced-motion`.
- Improved password toggles with accessible show/hide names and pressed state, input invalid/described-by attributes, focus styles, and animated validation feedback.
- Added live registration password-strength and confirmation-match feedback, plus explicit busy labels and disabled submit states.
- Kept existing forgot-password and login/register links in place.

## Verification

- Web TypeScript check (`tsc --noEmit`): passed.
- Focused ESLint on the changed auth components: passed with no warnings.
- Next.js production build: passed; all 37 static pages generated.
- Chrome checks at 390, 768, 1024, and 1440 px on login and registration: no horizontal overflow; desktop split and mobile compact header switch at the expected breakpoint.
- Login: invalid-field messages and password visibility toggle verified. A mocked 401 response verified the busy/disabled state and server-error feedback.
- Registration: password strength and live match/mismatch feedback verified; invalid submission showed validation feedback. A mocked 201 response verified the busy state and success screen without creating an account.
- Real demo login using the existing student demo account: succeeded and redirected to `/student/dashboard`. No browser JavaScript errors were observed.
- Responsive browser checks ran with reduced motion enabled. Forgot-password route and form logic were not changed.

## Remaining verification note

Registration success presentation was tested with a mocked API response; a real account was not created as part of this visual update. The real demo login and role redirect were tested against the running local API.
