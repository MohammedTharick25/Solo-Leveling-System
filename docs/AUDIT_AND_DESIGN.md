# Security audit & design system notes

## Security / validation findings

### Fixed in this pass
| Severity | Issue | Fix |
|---|---|---|
| High | `POST /raids` and `POST /raids/recurring` spread `req.body` into `TaskRaid.create`, so a client could set `userId`, `status`, `completedAt`, `parentRaidId`. | Field whitelist (`pickRaidInput`) in `taskRaid.routes.js`; `userId` always set by the server. |
| Medium | Socket `guild:join` let any signed-in user join any guild room and receive its events. | Membership check against `Guild.members.userId` before joining. |
| Medium | Avatar upload had no size limit or MIME filter (cost / DoS). | 2 MB limit, one file, JPG/PNG/WebP only (`lib/cloudinary.js`). |

### Still open (recommended)
| Severity | Issue | Recommendation |
|---|---|---|
| High | Dependencies with known advisories: mongoose, multer, cloudinary, body-parser (server); follow-redirects (client). | `npm audit fix` in `server/` and `client/`, then run tests. Not applied here because upgrades need your test run. |
| High | `server/.env` in the shared zips holds live credentials (Mongo, JWT, Cloudinary, SMTP, Groq, Resend, Razorpay, VAPID). It was never committed to git, which is good. | Rotate every secret that was in the zip, and never zip `.env` files. |
| Medium | Access JWT lasts 7 days and `protect` never checks the session, so logout / password reset does not end existing access tokens. | Shorten to 15 min and rely on refresh rotation, or check `sessionId` against stored sessions. |
| Medium | Access token is persisted in `localStorage` (zustand `partialize`). Any XSS exposes it. | Keep the token in memory only; the httpOnly refresh cookie restores it on load. |
| Medium | `register` returns the refresh token in the JSON body and does not set the cookie, unlike `login`. | Set the cookie and drop it from the body. |
| Low | Cookie `maxAge` is 7 days but refresh JWT is 30 days. `/auth/refresh-token` and `/logout` have no dedicated rate limit. | Align lifetimes; add `authRateLimiter` to refresh. |
| Low | CSP allows `'unsafe-inline'` scripts; CORS allows requests with no Origin. | Use nonces/hashes for scripts if feasible. |
| Low | Password rule is length-only (min 8, no max). Login timing differs for unknown emails. | Add a max (e.g. 128) and a breached-password check. |
| Low | Client logs `VITE_API_URL` to the console; `Sidebar.jsx` writes `hunterName` via `innerHTML` (currently safe because names are `[A-Za-z0-9_]`). | Remove logs; build the fallback with React instead of `innerHTML`. |
| Info | 15 of 23 route files have no express-validator rules (quests, goals, journal, hunter, stats...). | Add `body/param` validators, at minimum `isMongoId` on `:id` and length limits on free text. |

### Verified OK
Razorpay webhook uses HMAC-SHA256 on the raw body with `timingSafeEqual`; payment verification signs `order|payment`. Reset tokens are 32 random bytes, stored hashed, short-lived, and revoke all sessions. Passwords use bcrypt (12 rounds). `helmet`, `express-mongo-sanitize`, 10 kb body limit, global and auth rate limits are in place. `.env` is git-ignored and absent from history.

## Design system

Everything visual flows from `client/src/styles/tokens.css`.

- **Surfaces / ink / status**: RGB triplets (`--surface-*`, `--ink-*`, `--success|warning|danger`).
- **Accent palettes**: `--accent-50…900` + `--accent-2`, swapped by `:root[data-palette="…"]`. Included: `system` (default), `shadow`, `ember`, `jade`.
- **Adding a palette**: copy a block in `tokens.css`, add one entry to `src/lib/palette.js`. No other change.
- **Tailwind**: `slate-*` = surfaces/ink, `cyan-*` = accent ramp, plus `surface-*`, `accent-*`, `accent2`, `success|warning|danger`. Existing classes follow the palette automatically.
- **Motion** (`motion.css`): `--ease-out`, `--dur-*`, `.anim-rise`, `.stagger`, `.lift`, `.press`, `.sheen`; animated route transitions in `AppShell`; all disabled under `prefers-reduced-motion`.
- **Fonts**: Inter (body), Sora (headings), Orbitron (HUD numerals) are now bundled via Fontsource. Previously they were declared but never loaded, so headings fell back to monospace.
- **Switcher**: `PaletteSwitcher` in the top bar; choice persists in `localStorage` and is applied before first paint.
