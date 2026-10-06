# Sign-in and account upgrades: plan

Status: owner approved every item on 2026-10-06 (keep the order, 48 hours, Telegram option A, migration OK, +855 only, no SMS, Facebook links by email, library card). PRs 1–4 built (branches `feature/unverified-signups`, `feature/turnstile`, `feature/social-sign-in`); PRs 5–6 next.
Written 2026-10-06 after reading the auth code in both repos: `bookly_backend_v2` (`AuthController`, `SocialAuthController`, `SocialTokenVerifier`, `OtpService`, the `customers` table, staff `CustomerController`) and this frontend (`src/features/auth`, `src/pages/auth`, `OtpInput`, `AuthShell`).

The four requests, in the order this plan suggests building them:

| # | Feature | Owner sets up | Monthly cost | Size |
|---|---|---|---|---|
| 1 | Unverified sign-ups kept out of the customer list and cleaned up | nothing | $0 | S, both repos |
| 2 | Cloudflare Turnstile on sign-up, sign-in and every "send a code" form | Cloudflare account, 1 widget | $0 | S, both repos |
| 3 | Sign in with Google | Google Cloud OAuth client | $0 | S, mostly frontend (API is ready) |
| 4 | Sign in with Facebook | Meta developer app | $0 | S, mostly frontend (API is ready) |
| 5 | Verification code by Telegram (phone number) | Telegram Gateway account, prepaid balance | ~$0.01 per code delivered | M, both repos, needs a new migration |
| 6 | Verification code by SMS (optional, later) | SMS provider account | ~$0.20 per SMS (Twilio) or less with a local provider | S once #5 exists |
| 7 | Full Cloudflare in front of the site (later) | Custom domain on Cloudflare DNS | domain ~$10/year | M, mostly settings |

Why this order: #1 fixes a problem customers already hit (an unfinished sign-up blocks the email) and needs no accounts. #2 must come **before** any paid code channel, because bots that trigger codes cost real money ("SMS pumping"). #3 and #4 are almost free wins: the API already does the secure part. #5 is the biggest change and needs your decisions on phone-only accounts.

---

## 1. Unverified sign-ups: out of the list, cleaned up

**What happens today.** Sign-up creates the customer row at once (unverified), sends a code, and signs them in. They can't order until they verify (`verified.customer` middleware). The admin's customer list shows everyone; there is a "verified" filter but the default is "all". If someone never finishes, their email stays taken: signing up again says "email already taken" (you hit this yourself).

**Plan.**
- **Sign up again over an unfinished sign-up.** If the email belongs to an account that was never verified, `POST /auth/register` replaces its name, password and phone, cancels its old sessions and codes, and sends a new code, instead of "email taken". Safe: nobody has proven they own that email yet, and verified accounts are never touched.
- **Clean-up.** New command `customers:prune-unverified`: permanently deletes accounts that are unverified, older than **48 hours** (your choice), and have no orders, addresses or reviews (they can't, but it's a guard). Render's free plan has no scheduler, so it runs in three places: (a) on every sign-up (cheap, removes that email's stale row), (b) from the staff customer list when it's opened, at most once an hour, (c) optionally from a free GitHub Actions cron calling a protected endpoint. Pick (a)+(b) to start.
- **Admin list.** The customer list opens on **Verified** by default, with a second tab **Not verified yet (n)** showing "Removed in 1 day" on each row, so you can still help someone stuck on their code.
- No migration: uses `email_verified_at` and `created_at`.

**Risks.** An attacker could repeatedly sign up with someone else's email to send them codes. This is already rate-limited (`otp-send`), and Turnstile (#2) closes it.

---

## 2. Cloudflare Turnstile (bot protection)

**What it is.** Cloudflare's free replacement for CAPTCHAs. In "managed" mode most people see nothing or a single tick box; bots get stopped. It works **without moving the site to Cloudflare**: a script on the page plus one check on the API. Free plan: up to 20 widgets, unlimited challenges, 1 million server checks a month.

**Where.** Sign-up, sign-in, forgot password, "send a new code", and (later) "send a code to my phone". Not checkout or browsing.

**Frontend.** A `<Turnstile>` component (Cloudflare's script, loaded only on those pages so the rest of the site stays fast). It reserves its height before it loads so nothing jumps (we learned this with the footer). Its theme follows the site's light/dark mode. The token goes with the form as `turnstile_token`.

**Backend.** A `turnstile` validation rule that calls Cloudflare's `siteverify` with the secret key and the visitor's IP. With no secret configured (local, CI) it passes, and tests use Cloudflare's official always-pass and always-fail test keys.

**You set up (10 minutes):** Cloudflare account → Turnstile → Add widget → hostnames `bookly-frontend-five.vercel.app` and `localhost` → mode "Managed". Then `VITE_TURNSTILE_SITE_KEY` on Vercel and `TURNSTILE_SECRET_KEY` on Render.

**Risks.** If Cloudflare is down, forms with Turnstile fail closed. Accepted: it's rare and the message says what to do ("Try again in a moment").

---

## 3. Sign in with Google

**What exists.** The API's `POST /auth/social/google` is finished and careful: it checks the token was issued to **our** app (so tokens from other apps can't be replayed), only trusts emails Google says it verified, links to an existing account with the same email, and if that existing account was never verified, wipes its unproven password and sessions. The frontend's buttons are there but disabled ("coming soon").

**Frontend.** Load Google Identity Services only when the button is clicked, ask for an access token (scopes `openid email profile`) in Google's popup, send it to the API, then continue exactly like a password sign-in (same redirect, same welcome toast). If the popup is closed, nothing happens; a blocked popup shows "Allow pop-ups for this site, then try again."

**You set up (15 minutes):** Google Cloud Console → new project "Bookly" → OAuth consent screen (External, app name "Bookly Shop", support email, links to `/privacy` and `/terms`) → **Publish** → Credentials → OAuth client ID, type "Web application", authorised JavaScript origins `https://bookly-frontend-five.vercel.app` and `http://localhost:5173`. Then `VITE_GOOGLE_CLIENT_ID` on Vercel, `GOOGLE_CLIENT_ID` on Render (the secret isn't needed for this flow).

**Risks.** Linking by email: someone who controls a Google account for your email can sign in to your Bookly account. That's standard and acceptable because Google verified that email.

---

## 4. Sign in with Facebook

**What exists.** `POST /auth/social/facebook`, same protections (checks the token belongs to our app with Facebook's `debug_token`). Accounts without an email get a clear message to use email instead.

**Frontend.** Load the Facebook SDK on click, `FB.login` with `email,public_profile`, send the token to the API.

**Extra page needed.** Meta requires a **data deletion** page. Plan: a short section on `/privacy` ("Deleting your account and data": write to the shop's email or Telegram; we delete within 30 days) and give Meta that link.

**You set up (20 minutes):** developers.facebook.com → Create app → "Authenticate and request data from users with Facebook Login" → add the site URL, privacy URL, data deletion URL → switch the app to **Live**. Then `VITE_FACEBOOK_APP_ID` on Vercel, `FACEBOOK_CLIENT_ID` and `FACEBOOK_CLIENT_SECRET` on Render.

**Risks.** Facebook only returns confirmed emails, but it doesn't say so per user as clearly as Google; we keep linking by email (as the API does now). If you'd rather, Facebook could create a new account instead of linking when the email already exists; my suggestion is to keep linking.

---

## 5. Verification code by Telegram (phone number)

**How it works.** Telegram Gateway (official) sends a 6-digit code to a phone number's Telegram account from Telegram's own "Verification Codes" chat. The customer doesn't need to find or start our bot. It costs **$0.01 per code delivered** (you only pay if it arrives in time), prepaid. If the number has no Telegram, the API says so and the customer can choose email (or SMS, #6).

**The big decision: email still required, or phone-only accounts?**

| | A. Phone as a second way to verify | B. Sign up with phone only |
|---|---|---|
| What customers see | Email is still required; they choose where the code goes: email or Telegram | "Email or phone number" on sign-up and sign-in |
| Database | New columns `phone_e164` (unique) and `phone_verified_at` | Same, **plus** `email` becomes optional |
| Order emails, password reset | Unchanged | Need a Telegram/SMS version too |
| Work | M | L |
| Suggestion | **Start here** | Later, if customers ask for it |

Both need **a new migration** (adding columns; old migrations are not edited). That needs your OK.

**Backend (option A).**
- New migration: `customers.phone_e164` (nullable, unique), `phone_verified_at`. Numbers are stored in international form (`+85587860999`) using `libphonenumber`, and only Cambodian numbers are accepted at first (blocks most fraud; widen later).
- `OtpService` gets a channel (`email` / `telegram`); a `TelegramGatewayChannel` calls `sendVerificationMessage` with our own code (we keep checking codes ourselves, so the 5-wrong-guesses lock and expiry stay the same for every channel).
- `POST /auth/register` accepts `verify_by: email|telegram`; `POST /auth/resend-verification` accepts the channel; new `POST /auth/verify-phone` for an existing account (account settings).
- Either channel marks the account verified. A verified phone shows in the admin's customer page.
- Limits: at most 3 codes per number per hour and 10 per day, Turnstile required, only `+855`.

**You set up:** gateway.telegram.org → log in with your Telegram → add a small balance (e.g. $5 = ~500 codes) → copy the API token → `TELEGRAM_GATEWAY_TOKEN` on Render.

**Risks.** Paying for bot traffic (handled by Turnstile + per-number limits + Cambodia only). Someone verifying with a number they don't own: impossible without receiving the code. SIM swap: a phone code is weaker than a password; that's why phone verifies the account but does not replace the password in option A.

---

## 6. Verification code by SMS (optional, later)

For customers without Telegram. Twilio's published price to Cambodia is about **$0.20–0.23 per SMS**; local gateways (e.g. PlasGate) are usually much cheaper but need a business agreement. Once #5 exists this is one more channel class and an env key. Suggestion: wait and see how many customers lack Telegram.

---

## 7. Full Cloudflare in front of the site (later)

Turnstile (#2) needs no domain. Cloudflare's firewall, bot fight mode and DDoS protection need **your own domain** with its DNS on Cloudflare (`*.vercel.app` and `*.onrender.com` can't be proxied). That pairs naturally with a shop email (`hello@yourdomain`). Note: Vercel advises against putting Cloudflare's proxy in front of a Vercel site (two CDNs fight over caching); the usual setup is Cloudflare DNS only for the site, and proxy only for the API. Decide when you buy a domain.

---

## Screens (design, following MASTER v3 "Lapis & Vermilion")

No new colours or fonts: paper `#F6F7FB`, card `#FFFFFF`, ink `#0E1335`, lapis `#14207A`, vermilion `#FF4F2E` (one per view: the main submit), gold `#F2C84B` (on lapis only). Gloock for headings, Hanken Grotesk for everything else, Kantumruy Pro for Khmer. The auth frame stays `AuthShell`: the form on the right, the lapis panel on the left at ≥1024px.

### Signature: the Bookly library card

Today the lapis panel shows rotating reading quotes. During sign-up and verification it becomes a **library card being filled in for the customer**: a card on the lapis panel (hairline gold frame, the "Ex Libris Bookly" eyebrow the site already uses) that writes their name as they type it, shows where the code went ("Code sent to Telegram · +855 87 860 999"), and, when the code is right, gets a **gold "Member" stamp** pressed onto it (one 300 ms press: scale 1.08 → 1, slight rotation, once; with reduced motion it simply appears). Then the page moves on.

Why: it turns a chore (typing a code) into joining a library, it reuses the bookplate language from the content pages, and it's the one bold moment in an otherwise quiet form. Sign-in keeps the quotes: returning readers don't need a ceremony.

On phones the panel is hidden, so the card shrinks to a slim strip above the code boxes: name, where the code went, "Change".

```
Desktop, verify step                                      Phone, verify step
┌──────────── lapis panel ────────────┐ ┌──── form ────────────────┐   ┌──────────────────────────┐
│                                     │ │ ── ALMOST THERE           │   │ ── ALMOST THERE          │
│  ┌ EX LIBRIS · BOOKLY ───────────┐  │ │ Enter your code           │   │ Enter your code          │
│  │  Member                       │  │ │ We sent 6 digits to your  │   │ ┌──────────────────────┐ │
│  │  Sok Dara                     │  │ │ Telegram.                 │   │ │ Sok Dara · Telegram  │ │
│  │  Code sent to Telegram        │  │ │ ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐  │   │ │ +855 87 860 999 Change │ │
│  │  +855 87 860 999              │  │ │ └──┘└──┘└──┘└──┘└──┘└──┘  │   │ └──────────────────────┘ │
│  │                   ( MEMBER )  │  │ │ [ Verify and continue ]   │   │ ┌─┐┌─┐┌─┐┌─┐┌─┐┌─┐      │
│  └───────────────── gold stamp ──┘  │ │ New code in 0:42          │   │ [ Verify and continue ]  │
│                                     │ │ Send it by email instead  │   │ New code in 0:42         │
└─────────────────────────────────────┘ └───────────────────────────┘   └──────────────────────────┘
```

### Sign up

Google and Facebook first (fastest for most people), then email. "Where should we send your code?" uses the same radio cards as payment at checkout, so it already feels familiar.

```
── NEW TO BOOKLY
Create your account
[ G  Continue with Google ]  [ f  Continue with Facebook ]
──────────── or sign up with email ────────────
Full name        [                         ]
Email            [                         ]
Password         [                    👁  ]   ○ 8 characters ○ a letter ○ a number
Where should we send your code?
 (•) Email          Arrives in a minute or two
 ( ) Telegram       Phone number [ 087 860 999 ]
[ Turnstile, reserved 65px, usually invisible ]
[        Create account (vermilion)        ]
Already have an account? Sign in
```

### Sign in

Same order: social buttons, then email and password. Turnstile sits under the password field. After 3 failed attempts the message says how to reset, never which part was wrong.

### Account → Sign-in & security (new card on the account page)

```
Sign-in & security
Email       sok@example.com          Verified ✓
Phone       +855 87 860 999          Verified ✓ (Telegram)     [ Change ]
Google      Connected                                           [ Disconnect ]
Facebook    Not connected                                       [ Connect ]
Password    Last changed 3 days ago                             [ Change ]
```
Disconnecting the last way to sign in is blocked with: "Add a password first, so you can still sign in."

### Admin → Customers

Tabs: **Verified (128)** · **Not verified yet (4)**. Unverified rows show a warning badge "Removed in 1 day".

### Copy (examples, final wording in the PRs)
- Telegram not found: "This number isn't on Telegram. Send the code by email instead?"
- Too many codes: "You've asked for 3 codes in the last hour. Try again at 14:20, or use email."
- Google popup blocked: "Your browser blocked the Google window. Allow pop-ups for this site, then try again."
- Turnstile failed: "We couldn't check that you're a person. Reload the page and try again."

---

## PRs, in order (each one small, tested and shippable on its own)

1. **Unfinished sign-ups**: backend (re-register over unverified, prune command, list default) + frontend (two tabs on Customers). No keys.
2. **Turnstile**: backend rule + frontend component on the auth forms. Needs the Turnstile keys.
3. **Google sign-in**: frontend only (+ API env var). Needs the Google client id.
4. **Facebook sign-in** + data-deletion section on `/privacy`. Needs the Facebook app.
5. **Library card** redesign of the sign-up/verify steps (the signature above), done with #6 or alone with email only.
6. **Telegram codes** (option A): migration, channel, register/resend/verify-phone, sign-up channel picker, account security card. Needs your OK on the migration and the Gateway token.
7. **SMS** (if wanted), **custom domain + Cloudflare** (when you buy a domain).

Every PR: lint, typecheck, unit tests, build, a browser pass, backend tests, docs.

---

## Decisions for the owner

- [ ] **Order**: keep the order above, or change it?
- [ ] **Unverified accounts**: removed after **48 hours**? (or 24h / 7 days)
- [ ] **Telegram**: option **A** (email still required, phone is a second way to get the code) or **B** (phone-only accounts)?
- [ ] **New migration** for phone columns: OK to add (old migrations untouched)?
- [ ] **Numbers**: Cambodia (+855) only at first?
- [ ] **SMS**: skip for now?
- [ ] **Facebook linking**: link to an existing account with the same email (suggested), or keep them separate?
- [ ] **Library card design**: go ahead with the signature card and gold "Member" stamp?
- [ ] **Accounts to create** when we reach each step (I'll give click-by-click steps then): Cloudflare (Turnstile), Google Cloud, Meta for Developers, Telegram Gateway.

Sources for prices and limits (checked 2026-10-06): [Telegram Gateway](https://core.telegram.org/gateway), [Turnstile plans](https://developers.cloudflare.com/turnstile/plans/), [Twilio SMS pricing, Cambodia](https://twilio.com/sms/pricing/kh), [Cambodia SMS pricing overview](https://sent.dm/resources/cambodia-sms-pricing).
