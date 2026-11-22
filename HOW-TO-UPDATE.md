# How to update the Aidin Caye site

Edit files in `src/content/` through a pull request. When it is merged to `main`, Cloudflare Pages rebuilds automatically (about a minute). Check the **production** deployment afterwards, not only the preview.

| File | What it controls |
|---|---|
| `site.json` | Name, role, location, page title and description, public booking email (optional), public Turnstile site key |
| `bio.md` | The Story text (first paragraph is shown larger). Facts only, confirmed by Aidin |
| `shows.json` | Upcoming Shows. **Filled automatically from Aidin's gig calendar** once `GIG_CALENDAR_ICS` is set (see below); otherwise edited by hand (example below). Past dates hide themselves |
| `links.json` | Instagram, YouTube, Spotify, Apple Music, SoundCloud, Facebook. Empty links are hidden. The Spotify, Apple Music and YouTube links also drive the automatic releases and latest video |
| `releases.json` | Fallback releases, used only when the automatic lookup returns nothing |
| `gallery.json` | Gallery. Replaced automatically by his 6 newest Instagram posts once the token is set; until then his own photos show |
| `accolades.json`, `stats.manual.json` | Optional accolades and stream totals. Only verified facts |
| `legal.json` | Company details used by the Privacy, Terms and Cookie pages |
| `photos/hero.*`, `photos/portrait.*` | The hero banner and the About photo (one source file each: JPEG, PNG or WebP). Every size, the phone crop and the link preview are made at build time by `scripts/photos.mjs` |
| `photos.json` | Photo placement: `heroPersonX` / `portraitPersonX` (where the person stands, 0-100) and `heroSpaceAbove` (0-40, plain space above the hero so the logo clears his face) |

**Caretaker limits:** pull requests from anyone other than Kevin may only change `bio.md`, `accolades.json`, `numbers.json`, `releases.json`, `photos.json` and the two photos. The **Content guard** workflow enforces this (and checks the content) and should be a required check on `main`. After a photo change, run `npm run photos` locally and commit the regenerated `public/img`/`public/images` files and `photos/.stamp` when convenient, so builds can skip the step again.

## shows.json example
```json
[
  { "date": "2026-12-12", "venue": "Venue name", "city": "Johannesburg, ZA", "event": "Event name",
    "status": "tickets", "url": "https://ticket-link", "uid": "calendar-event-id@google.com" }
]
```
`status` is `tickets`, `free` or `soldout`. Bad entries are never published and make `npm test` fail.

## Gigs: straight from Aidin's calendar
Every build reads his gig calendar and rewrites `shows.json` with the upcoming gigs (and an empty list when there are none). There is no approval step: **whatever is in that calendar goes on the site**, so use a calendar that holds only public gigs.
- **Title** = event name, e.g. `The Garden Party`.
- **Location** = `Venue, City` (a full Google Maps address also works: the first part is the venue, the town is picked out after it).
- **Description** (optional), one per line: `Tickets: https://...`, or `Free entry`, or `Sold out`. An unlabelled link is also used if it is on a ticketing site (Quicket, Howler, Computicket, Webtickets, TicketPro, Ticketmaster, Eventbrite, Resident Advisor, Dice). Nothing else from the description is ever used, so meeting links, fees and contacts there stay private.
- A venue typed as "Venue Cnr X & Y Rd" is shortened to "Venue".
- **Skipped automatically:** events marked Private, Cancelled or Tentative, and titles containing HOLD, TBC, TBA, PRIVATE or TENTATIVE.
- **Setup:** Google Calendar → the gig calendar's Settings → Integrate calendar → **Secret address in iCal format**. Save it in Cloudflare Pages as the encrypted secret `GIG_CALENDAR_ICS`. It is a secret: never put it in the repo, a chat or an email. If it ever leaks, reset it in Google Calendar and save the new one.
- New gigs appear after the next build: the daily rebuild at about 05:41 SAST, or any merge.

## What updates by itself (every build, plus a daily rebuild at about 05:41 SAST)
- **Latest video:** newest upload on the YouTube channel in `links.json`.
- **Latest releases:** Spotify (if `SPOTIFY_CLIENT_ID`/`SPOTIFY_CLIENT_SECRET` are set) or Apple Music (no key, needs the Apple Music artist link).
- **Gallery:** 6 newest Instagram posts, needs `INSTAGRAM_ACCESS_TOKEN` (Meta system-user token, read-only `instagram_basic` + `pages_show_list`) and `INSTAGRAM_USER_ID`. There is no fallback account ID, by design.
- **Live numbers:** YouTube views (`YOUTUBE_API_KEY`, read-only) and Instagram followers.
All images are saved on our own domain, so the strict CSP holds. If a lookup fails, the previous content stays and the build never breaks.

## One-time Cloudflare / GitHub setup
1. Pages project from this repo: production branch `main`, build command `npm run build`, output `dist`.
2. **Contact form secrets** (Pages -> Settings -> Variables and Secrets, all encrypted). Without them the form says it is unavailable and sends nothing:
   `TURNSTILE_SECRET`, `SMTP_HOST` (DNS-only, not orange-cloud), `SMTP_PORT` (465 or 587), `SMTP_USER` (a dedicated sending mailbox), `SMTP_PASS`, `BOOKING_FROM_EMAIL` (same mailbox), `BOOKING_TO_EMAIL` (comma-separated recipients).
3. Turnstile widget: list both `aidincaye.com` and `www.aidincaye.com`; put the public site key in `site.json`.
4. Weekly refresh: create a Pages deploy hook and save it as the GitHub Actions secret `CF_DEPLOY_HOOK`.
5. WAF rate-limit rule on `/api/booking` (e.g. 2 requests / 10 s, block 10 s). Branch protection on `main`. 2FA everywhere.
6. **Domain cutover:** never touch mail DNS (MX, SPF, DKIM, DMARC, mail host records, autodiscover). Record them before and check them after.

## Photo credits
Photographer credits and licences for the hero, portrait and gallery photos are still to be confirmed with Aidin.
