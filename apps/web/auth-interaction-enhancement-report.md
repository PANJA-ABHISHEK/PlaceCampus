# Auth Interaction Enhancement Report

Scope: `/login`, `/register` (and the shared shell used by `/forgot-password`). This work adds motion and interaction on top of the existing dark-navy / white split-screen design. It does not redesign the pages.

## Files modified

| File | Change |
| --- | --- |
| `app/(auth)/layout.tsx` (new) | Route-group layout that renders the shared `AuthLayout`. The navy panel stays mounted when switching between auth routes. |
| `app/(auth)/login/page.tsx`, `register/page.tsx`, `forgot-password/page.tsx` | Each page now renders only its form. Metadata is unchanged. |
| `features/auth/components/auth-layout.tsx` | Now a persistent shell. Heading and description come from a per-route copy map and crossfade on navigation. The form column re-enters with a fade and slide. The mobile/tablet intro now includes the sample readiness card. |
| `features/auth/components/auth-illustration.tsx` | The dashboard card is now in normal layout flow, so it can't be clipped. Adds GSAP ring count-up, bar fill, step reveal, floating badges, slow orbit rotation and pointer parallax. Compact variant for small screens. |
| `features/auth/components/auth-input.tsx` | Orange focus border and halo, hover state, label tint while focused, animated eye/eye-off toggle, success state, staggered entrance index. |
| `features/auth/components/auth-feedback.tsx` (new) | Collapsible feedback row that animates both in and out. Used for field errors, server errors and the password-match message. |
| `features/auth/components/auth-submit-button.tsx` (new) | Submit button with hover lift, shadow, pressed state and spinner. Also exports the `reveal()` stagger helper. |
| `features/auth/components/login-form.tsx` | Staggered entrance, animated Remember Me checkbox, underline link feedback, inline validation, error banner, "Redirecting…" state. |
| `features/auth/components/register-form.tsx` | Staggered entrance, segmented strength meter, confirm-password match feedback, loading state, success transition. |
| `features/auth/components/auth-motion.module.css` | Keyframes and transitions for the above, with `prefers-reduced-motion` overrides. |
| `features/auth/hooks/use-auth-motion.ts` (new) | Scoped GSAP runner: static import, layout effect, `gsap.context` cleanup, skips when reduced motion is on. |

No new dependencies. Motion uses the existing `gsap` package and CSS only.

## Animations implemented

**Left panel (desktop)**
- Readiness ring: animates from 0 to the sample score of 78% over 1.6s with `power3.out`. The percentage counts up alongside it. The card keeps its "Sample UI" pill and the ring keeps its "Sample" label.
- Verified Skills and Evidence Review bars fill with a `scaleX` animation, staggered. A faint decorative sheen passes across them every few seconds, and a slow pulsing dot sits next to "In progress". Neither is driven by data.
- Floating badges (Verified skill, Evidence review, Opportunity match): fade up on entrance, then drift gently (±6px, 3.6s sine). On hover they lift, scale to 1.03 and get an orange glow.
- Decorative orbits: two circles rotate very slowly in opposite directions (140s and 100s per turn). On desktop with a fine pointer they move up to about 8px toward the pointer (parallax). They sit behind the card (`z-0` / card `z-10` / badges `z-20`), ignore pointer events, and stay below the heading.
- Dashboard card: fades up on entrance and lifts slightly on hover with a deeper shadow.
- Heading and description crossfade when switching between login and register.

**Form column (both routes)**
- Order: form slides and fades in, then the heading, description, each field (55ms stagger), remember/forgot row, submit button, and footer link. Movement is 10–12px.
- Form entrances use CSS keyframes rather than GSAP. Server-rendered markup therefore never flashes, and the sequence replays automatically when the next route's form mounts.

**Reduced motion:** GSAP setup is skipped entirely, so the ring shows 78% immediately and nothing drifts, rotates or moves with the pointer. CSS entrances, the sheen and the pulse are disabled. The global reduced-motion rule also shortens transitions.

## Form interactions added

- Inputs: hover border tint; on focus, an orange border plus a soft 4px orange halo (overriding the base input's 2px ring); label turns orange while its field is focused; distinct red error and green success states.
- Password visibility: eye and eye-off icons crossfade with a rotate and scale. Switching the input `type` keeps the value (checked in the browser). The button has `aria-label` "Show/Hide password", `aria-pressed` and `aria-controls`.
- Buttons: lift by 2px on hover with an orange shadow, press down to 0.98 scale on click, and show a spinner with a busy label while submitting. The button is disabled during submission, which blocks both repeat clicks and Enter-key submission.
- Login: "Redirecting…" stays visible between a successful login and the dashboard loading, so the button never re-enables during the redirect.
- Validation: React Hook Form `mode: 'onTouched'` shows errors after blur and on submit. The Zod rules are unchanged. `noValidate` stops native browser tooltips so the animated inline messages appear instead. Error rows expand and collapse smoothly instead of popping in and out.
- Register: 4-segment strength meter using the existing `calculateStrength` rules and Weak/Good/Strong thresholds. An "At least 8 characters" indicator mirrors the actual Zod minimum. Confirm-password shows "Passwords match" or "Passwords don't match yet" with a green or red state. The success screen has an icon pop and staggered text.
- Screen readers: field errors and server errors are announced (`role="alert"`). Live typing feedback such as match status is announced politely.

## Responsive corrections

- The dashboard card is now in normal flow inside a padded container, so it can't overflow or be clipped. Verified at 1440×900: card at 485–768px inside a panel spanning 80–945px.
- Orbits are sized inside the illustration and stay below the heading (heading ends at 326px, highest orbit starts at 363px).
- Removed the large top-left panel circle that crossed the heading, and a bottom-left circle that crossed the tagline.
- The Verified Skill badge is anchored inside the illustration bounds and always visible.
- The form column is vertically centered against the panel on desktop. Both routes share the same `max-w-md` column and spacing.
- Tablet (768–1023px): stacked layout. The navy intro widens and shows the copy beside a scaled readiness card.
- Mobile (<768px): the intro stacks the copy above the compact readiness card, which sits above the form. Only the ring and bar entrances run (no drift, rotation or parallax).
- No horizontal overflow at 360, 390, 768, 1024 or 1440px wide.

## Authentication logic preserved

These are unchanged: `AuthProvider` (not edited in this work), the `apiClient` calls (`POST /auth/login`, `GET /auth/me`, `POST /auth/register`), request payloads, Zod schemas and messages, `getDashboardRoute` role redirects, JWT access token handling, HTTP-only refresh cookie, session persistence, backend authorization, password hashing, and demo accounts. There is still no public role selection on registration. Remember Me remains a visual-only checkbox, as before. It isn't sent to the API and has no effect on the session.

## Validation results

| Check | Result |
| --- | --- |
| `tsc --noEmit` (web) | Passed |
| `eslint features/auth app/(auth)` | 0 errors. 1 warning already present in `auth-provider.tsx` (unused `err`), which this work doesn't touch |
| `next build` | Passed. All routes compiled, `/login` and `/register` prerendered as static |

## Browser testing (Chrome via Playwright, dev server on :3001, live API on :4000)

32 of 32 checks passed:

- Ring measured at 52–55% partway through and 78% at the end. Bars settle at full scale.
- Card fully inside the panel, orbits below the heading, badge visible, no overflow at 1440px.
- Badge box-shadow changes on hover. The orbit layer moves in response to the pointer.
- Focused input shows the orange halo.
- Submitting an empty login form shows both inline errors.
- Password toggle switches `type` and keeps the value, on both login and register.
- Remember Me toggles.
- Mocked 401 login: button shows "Signing in…" and is disabled. The error banner animates in.
- Clicking Login → Register keeps the same panel element in the DOM (no remount) and swaps the heading.
- Empty register submission shows validation. The strength meter reads Weak for `abc` and Strong for `Abcdefg1`. Mismatch and match messages both appear.
- Mocked 201 register: "Creating account…" busy state, then the success screen. No real account was created.
- Browser Back returns to `/login`.
- **Real login** as `student.demo@placecampus.local` redirected to `/student/dashboard`.
- No JavaScript errors. The only console errors were expected 401s from the unauthenticated `/auth/refresh` probe and the mocked 401.
- At 1024, 768, 390 and 360px, on both routes: no overflow, the visible readiness card shows 78%, and the submit button fits the viewport.
- Reduced-motion run: ring at 78% immediately, no orbit transform.

## Remaining limitations

- No exit animation when leaving a route. The new form fades and slides in, and the panel persists so there's no flash, but the old form isn't animated out. That would mean intercepting navigation.
- On a very slow first load, the server-rendered ring briefly shows 78% before GSAP resets it to 0 and counts up. The card's delayed fade-in hides this in normal conditions.
- On short desktop viewports (e.g. 1024×768) the panel is taller than the screen, so the bottom badge sits below the fold until you scroll. Nothing is clipped.
- Registration success was tested with a mocked API response so that no real account was created.
- Remember Me has no functional effect, as before. Session length is still controlled by the refresh cookie.
