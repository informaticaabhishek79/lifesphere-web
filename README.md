# LifeSphere — web app

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS 4.

**Languages:** English, Hindi, Bengali, Marathi, Tamil, Telugu, Spanish, French, German and Arabic (right-to-left). The first visit follows the browser's language; anyone can switch from the globe menu at the top or in Settings, and the choice is saved to their account. Translations were machine-assisted — have a native speaker review each one before launch.

**Countries:** the sign-in screen guesses the visitor's country from their time zone and browser (changeable with the flag picker) and checks the phone number for that country. Dates, numbers and money follow the person's language and country.

## Run it (Windows, macOS, Linux)

The API (the **lifesphere-api** repository) must be running first: `npm run dev:all` there.

```bash
cd lifesphere-web
npm ci
npm run setup          # creates .env.local (API_URL=http://localhost:4000)
npm run dev            # http://localhost:3008
```

Sign in with any mobile number (pick the country with the flag first; for India just type the 10 digits). In development the API shows the one-time code on the sign-in screen ("Test mode code").

Want screens full of sample data? With the API running in development:

```bash
npm run demo-data      # six people plus staff data across every module (details below)
```

| Sign in with | Who | Good for trying |
|---|---|---|
| 9810000001 | Kamla Devi | Senior mode + Hindi, check-ins, help button, medicines, complaint with AI draft, booking + review |
| 9810000002 | Priya Sharma | Dashboard, tasks, calendar, household (lists, inventory, budget), groups she runs, moderation reports, provider profile in review, a pending contact invitation |
| 9810000003 | Rahul Sharma | Household member, assigned chores, open service request |
| 9810000004 | Meena Iyer | Community moderator, recommendations |
| 9810000005 | Arjun Kumar | Provider portal: jobs, reviews and replies, an open request to claim |
| 9810000006 | Sunita Rao | Provider portal; author of a reported spam post |
| 9999900001 | Admin | Staff console (moderation queue, privacy requests, providers). Needs `npm run db:seed -- --admin=+919999900001` in the API first |

The main person also gets **Documents** (Bills, Manuals, Recipes and a Private folder), a **Filing helper** agent that can edit Bills and read Recipes but cannot see Private, and a **Mail helper** on the sample mailbox with one reply sent and one waiting for review. The **voice assistant** may read the Bills folder (try “What is the amount due on my electricity bill?”). If you already ran the script, running it again adds just these.

Want the data in **your own account**? Run `npm run demo-data -- --phone=<your 10-digit number>` and your account takes Priya's place (household, groups, complaints, provider profile, invitations…).

The script approves the two providers through the staff console API. If the admin has no authenticator yet, it sets one up and prints the key to add to your authenticator app; if it already has one, pass `ADMIN_TOTP_SECRET=<key>` or approve the providers yourself in **Staff console → Providers** and run `npm run demo-data -- --force`. New sharing takes effect after the API's cooling-off period (`GRANT_COOLOFF_MINUTES`, 10 by default).

## Adding or editing text

All text is in `src/i18n/`: `en.ts` is the source; each other language file has the same keys and falls back to English for anything missing. Keep `{placeholders}` exactly as in English. To add a language: create `xx.ts`, add it to `LOCALES` in `locales.ts` and to `load.ts`, then run `npm run check:i18n -- --strict`. Right-to-left languages work automatically when their `dir` is `'rtl'` (layouts use start/end spacing, not left/right).

## How it talks to the API

The browser never calls the API directly and never sees a token.

- Every request goes to this web server at `/api/v1/...` (`src/app/api/v1/[...path]/route.ts`), which forwards it to `API_URL/v1/...`.
- The access and refresh tokens live in **httpOnly cookies** set by that route when you sign in. JavaScript can't read them.
- Expiring access tokens are refreshed automatically. Refresh tokens rotate on every use and a reused one signs the user out everywhere, so concurrent refreshes are de-duplicated in the web server (run one instance, or use sticky sessions).
- `src/proxy.ts` sends signed-out visitors to `/sign-in`; the API still checks every request.

Request bodies are typed from the API's OpenAPI document, kept here as `openapi.json`. After the API changes: `npm run api:pull` (copies it from the API running on localhost:4000, or `npm run api:pull -- ../lifesphere-api/openapi.json`), then `npm run api:types`, and commit both files.

## Scripts

| Script | What it does |
|---|---|
| `npm run setup` | Create `.env.local` (`-- --api=<url>` to point at another API) |
| `npm run dev` / `build` / `start` | Develop / production build / serve the build (`PORT` respected) |
| `npm run typecheck` | Strict TypeScript |
| `npm run check:i18n` | Every text key used in code exists in English and Hindi, no language has unknown keys or broken `{placeholders}`, and coverage per language. `-- --strict` (used in CI) also fails if any language is missing a key |
| `npm run api:pull` | Copy the API's latest `openapi.json` into this repo |
| `npm run api:types` | Regenerate request types from `openapi.json` |
| `npm run demo-data` | Fill a development API with sample people and content |
| `npm run test:e2e` | Playwright end-to-end tests (see below) |

## Screens

| Area | Routes |
|---|---|
| Sign-in | `/sign-in` (phone/email OTP, new-account details, two-step code), `/privacy-notice`, `/invite/contact`, `/invite/household` |
| Home | `/` — depends on what the person said LifeSphere is for: the family view (caregiver), the simple big-button home (being looked after), or the full dashboard with widgets and quick actions |
| Getting started | `/get-started` — “What will you use LifeSphere for?”, then inviting a parent (caregiver) or choosing who looks out for you, a daily check-in time, medicines and the first person to call (being looked after). New accounts land here. |
| My day | `/tasks`, `/tasks/[id]`, `/reminders`, `/calendar` |
| Home | `/households`, `/households/[id]`, `/lists`, `/lists/[id]`, `/inventory`, `/inventory/[id]`, `/budgets` |
| Family care | `/care` (everyone who shares with you and how they are today), `/contacts`, `/sharing`, `/check-ins`, `/check-ins/events/[id]`, `/help`, `/help/requests/[id]` |
| Community | `/community` (feed, groups, invitations, saved, safety & appeals), `/community/groups/[id]`, `/community/posts/[id]`, `/civic` |
| Help & services | `/services`, `/services/providers/[id]`, `/service-requests`, `/service-requests/[id]`, `/provider-portal`, `/provider-portal/[id]`, `/consumer`, `/consumer/cases/[id]`, `/assistant`, `/knowledge`, `/knowledge/[slug]` |
| Voice assistant | `/voice` (microphone in the top bar opens it listening; spoken or typed questions, answers read aloud, links to the screens used, folder permissions under “What it can read”) |
| Agents | `/agents`, `/agents/[id]` (ask a documents agent, activity, edit access), `/email` (connect Gmail / Outlook / sample mailbox, inbox, ask an agent to reply), `/documents`, `/documents/files/[id]` (folders, uploads, notes, bin, preview) |
| You | `/notifications` (inbox, channel settings, browser push), `/settings` (profile, appearance & accessibility, quiet hours, home screen, features, sign-in & security, activity), `/privacy` |
| Staff console | `/admin` and sub-pages — users, moderation, providers, privacy requests, catalogue, knowledge, assistant quality, delivery failures, staff, config & plans, audit log. Needs a staff role **and** a session signed in with an authenticator code. Staff screens are in English. |

Accessibility: text size 100–200 %, senior mode (bigger text, single-column home), light / dark / high-contrast themes, reduced motion, keyboard focus everywhere, screen-reader labels. Theme and text size are remembered in cookies so pages don't flash.

## End-to-end tests

With the API running in development (`OTP_DEV_ECHO=true`) and `npm run dev` running:

```bash
npx playwright install chromium     # once
npm run test:e2e
```

- `crawl.spec.ts` opens every screen in all ten languages, checks right-to-left for Arabic, and fails on any error. Set `DEMO_PHONE=+919810000002` after `npm run demo-data` to also open detail pages with data.
- `flows.spec.ts` drives real flows: tasks, reminders, calendar, household, lists, inventory, budget; a contact invitation between two people, sharing with cooling-off, check-ins and the help button end to end; community posts and comments, a consumer case with an AI draft, civic issue, provider profile, service request and the assistant.
- `agents.spec.ts` creates folders and files, a documents agent that may use only one of them (and checks it cannot see the other), and an email agent reply on the sample mailbox.
- `care.spec.ts` drives parent care on both sides: a son chooses “I look after a parent” and invites his mother; she accepts on a phone-sized screen, unticks the calendar, sets a check-in time and a medicine, and gets the simple home; his home then shows her.
- `voice.spec.ts` replaces the browser's speech recogniser with a scripted one, asks a spoken question, and checks the answer comes from the right feature and is read aloud.
- `admin.spec.ts` signs in the seeded admin with two-step verification and opens every staff screen.

For the family-care test, start the API with `GRANT_COOLOFF_MINUTES=1` (the test waits 65 s for sharing to start). Tests sign up many accounts, so raise the development limits in the API's `.env`: `OTP_MAX_PER_IP_HOUR=10000` and `OTP_MAX_PER_DESTINATION_HOUR=100`.

## Deploy (Render)

Deploy the API repository first. Then create a Blueprint from this repository (`render.yaml` defines `lifesphere-web`) and set `API_URL` to the API's address: its private address from the API service's **Connect → Internal** panel (keeps traffic on Render's private network, same region), or its public `https://…onrender.com` URL. Then set the API's `APP_BASE_URL` and `CORS_ORIGINS` to this web app's public URL so invitation links point here.

Browser push needs `WEBPUSH_VAPID_PUBLIC_KEY` / `WEBPUSH_VAPID_PRIVATE_KEY` on the API; the service worker is `public/sw.js`.
