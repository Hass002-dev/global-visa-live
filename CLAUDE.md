# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Watch mode — recompiles output.css on every HTML save
npm run dev

# Production build — minifies output.css
npm run build
```

There is no test runner configured. `output.css` is committed to the repo and must be rebuilt whenever Tailwind classes change.

## Architecture

This is a **static HTML website** with no framework. Every page is a self-contained `.html` file with inline `<style>` and `<script>` blocks. There is no JS bundler or module system.

### CSS approach

Tailwind 3 is compiled from `input.css` → `output.css` via `tailwind.config.js`. Root-level pages link to `./output.css`; pages inside `blog/` link to `../output.css`. Tailwind utility classes are used alongside hand-written component classes (`.btn-gold`, `.gvj-card`, `.fade-in-up`, etc.).

**Design tokens are duplicated in the `<style>` block of every page** — there is no shared CSS file. When changing a token value, update it in every HTML file's `:root` block.

### Standard design tokens (all main pages)

```css
--bg-primary:       #080c10   /* near-black page background */
--bg-card:          #131920   /* card surfaces */
--brand-gold:       #c9a84c   /* primary brand colour */
--brand-gold-light: #e8c97a   /* lighter gold for highlights */
--brand-gold-dim:   #8a6f2e   /* muted gold for borders/disabled */
--text-primary:     #eef2f7
--text-secondary:   #7a8899
```

### Typography

- **Display / headings:** Cormorant Garamond (serif)
- **Body / UI:** DM Sans (sans-serif), `font-weight: 450` as the base

### Pages

| File | Purpose | Indexed |
|------|---------|---------|
| `index.html` | Main marketing homepage | Yes |
| `about.html` | About the consultancy | Yes |
| `calculator.html` | Schengen visa financial readiness checker (vanilla JS) | Yes |
| `days-calculator.html` | Schengen 90/180-day rule calculator | Yes |
| `real-flights.html` | Flight reservation services — two sections: Visa Flight Reservation and Real Flight Reservation | Yes |
| `student.html` | Student visa service page | Yes |
| `diy-toolkit.html` | DIY visa toolkit product page | Yes |
| `fee-list.html` | Service fee schedule | Yes |
| `partnership.html` | Partnership / affiliate page | Yes |
| `leaflet-west-africa.html` | West Africa hub landing page | Yes |
| `privacy-policy.html` | Privacy policy | Yes |
| `refund-policy.html` | Refund policy | Yes |
| `complaints-policy.html` | Complaints policy | Yes |
| `engagement-letter.html` | Client engagement letter template | Yes |
| `blog/index.html` | Blog listing (Firebase/Firestore, JS-rendered) | Yes |
| `portal.html` | Secure client portal (noindex) | No |
| `admin.html` | Admin dashboard — blog post management, client documents (noindex) | No |
| `work.html` | Internal work tracking (noindex) | No |
| `refusal.html` | Visa refusal assessment page | Yes |
| `404.html` | Custom 404 page | — |
| `googleab538d2cdf698372.html` | Google Search Console verification | — |

### Blog posts (static HTML)

Every blog post is a **separate static HTML file** at `blog/{slug}.html`. The slug in Firestore must exactly match the filename. There is no dynamic routing — `blog/post.html` is a legacy stub and is not used for serving content.

**Authoring flow:**
1. Write the post in admin.html → click Publish (sets `status: 'published', live: false` in Firestore)
2. Ask Claude to **"sync blog posts"** — this invokes the `sync-blog` skill, which runs `scripts/sync-blog.js` to query Firestore for unsynced posts, generates `blog/{slug}.html`, updates `sitemap.xml`, and sets `live: true` in Firestore
3. `git push` to deploy — GitHub Pages picks up the new file within ~2 minutes; the post then appears in the blog listing

The blog listing in `blog/index.html` queries `status == 'published' AND live == true` — posts without a static file can never appear as clickable cards, preventing 404s.

The `sync-blog` skill needs `.env.local` in the project root (gitignored) with `GVJ_PASSWORD=...` (Firebase password for office@globalvisajourneys.com). See `.env.local.example` for the format.

The live toggle can also be flipped manually from the admin.html post table (bolt icon = go live; toggle icon = take offline).

Current blog posts in `blog/`:
- `dummy-tickets-visa-applications-guide.html`
- `easiest-schengen-visa-country-west-africans-2026.html`
- `ees-biometric-checks-september-2026-schengen-visa-holders.html`
- `italy-schengen-visa-online-application-2026.html`
- `multi-entry-schengen-visa-nigeria-ghana-2026.html`
- `schengen-90-180-day-rule-ees-2026-west-africa.html`
- `schengen-refusal-nigeria-2026.html`
- `schengen-uk-spain-vs-greece-2026.html`
- `schengen-visa-appointment-delays-summer-2026.html`
- `schengen-visa-appointment-slots-2026-vfs-global-tlscontact.html`
- `schengen-visa-bank-statement-requirements-2026.html`
- `schengen-visa-cover-letter-2026-nigeria-ghana.html`
- `schengen-visa-fees-2026-real-cost-nigeria-ghana-uk.html`
- `schengen-visa-flight-reservation-rules-2026.html`
- `schengen-visa-interview-questions-2026-nigeria-ghana.html`
- `schengen-visa-uk-non-british-passport-2026.html`
- `schengen-visa-gambia-2026-dakar-senegal-consulate.html`

### real-flights.html — dual service page

`real-flights.html` hosts two independent services separated by a gold divider:

1. **Visa Flight Reservation** — anchor `#visa-flight`, all IDs prefixed `vf-`. Sends `service: 'Visa Flight Reservation'` in payload. After form submit, opens Stripe checkout in a new tab, then reveals the payment confirmation panel.
2. **Real Flight Reservation** — anchor `#real-flight`, all IDs prefixed `rf-`. Includes a free check-in checkbox (`rf-checkIn`); payload includes `checkInRequested`.

Both POST to the same `FLIGHT_FORM_WEBHOOK_URL` Google Sheets webhook. Each form is wrapped in its own JS IIFE to prevent ID conflicts.

Payment gate: `gvjTogglePay(id, on)` controls `.gvj-pay-gated[aria-disabled='true']` — disabled state is `opacity:0.42; pointer-events:none; filter:grayscale(25%)`.

Webhook pattern used site-wide:
```js
fetch(URL, { method:'POST', mode:'no-cors', headers:{'Content-Type':'text/plain;charset=utf-8'}, body: JSON.stringify(payload) })
```

### Cookie consent

`cookie-consent.js` implements UK PECR-compliant cookie consent. The banner sits at `z-index:10000` (above the mobile nav at `z-index:9998`). Consent state is stored in `localStorage` under key `gvj_cookie_consent` with values `'all'` or `'necessary'`. GA4 tracking (`G-Q1EZM399KT`) is gated on `'all'` consent.

Every page loads `cookie-consent.js` from the root. Blog pages reference it as `../cookie-consent.js`.

### Assets

| Path | Contents |
|------|----------|
| `assets/testimonials/` | Approval screenshots: `Approval 1 Emma.jpeg`, `Approval Hass.JPG`, `Approval Lass.JPG`, `Approval Lin.jpeg` |

Images in `assets/testimonials/` are referenced in `index.html` and `partnership.html` as `./assets/testimonials/Approval X`.

### Firebase / Firestore

The site uses Firebase (JS SDK via CDN) for:
- **Blog post metadata** — collection structure supports `slug`, `heroImage`, `publishedAt`, `live` fields
- **Client documents** — `admin.html` reads/writes document metadata including a `url` field for uploaded files
- **Lead capture** — `assessments`, `enquiries`, `newsletter_subs` collections accept unauthenticated creates

Admin access is gated by `request.auth.token.email == "office@globalvisajourneys.com"`.

### Security

**Applied fixes (do not revert):**

1. **`rel="noopener noreferrer"` on all `target="_blank"` links** — 206 links across 32 HTML files were patched. Any new `target="_blank"` link must include this attribute.

2. **`isSafeHttpUrl()` URL validation** — present in `admin.html` and `blog/index.html`. Always validate Firestore-sourced URLs before using them as `href` values or CSS `background-image`. Pattern:
   ```js
   function isSafeHttpUrl(url) {
       try {
           const u = new URL(url, location.origin);
           return (u.protocol === 'http:' || u.protocol === 'https:');
       } catch (e) { return false; }
   }
   ```
   Use alongside `escHtml()` — both checks coexist; do not remove either.

3. **`escHtml()` XSS sanitisation** — used in `admin.html` and `blog/index.html` before inserting Firestore strings into innerHTML.

**Do not use `blog/post.html?slug=` dynamic routing** — query-string slug patterns allow path traversal and open redirect risks. All posts are static files.

### Deployment

The site deploys to **GitHub Pages**. The `CNAME` file sets the custom domain `globalvisajourneys.com`. GA4 property ID is `G-Q1EZM399KT` (present in every page's `<head>`). `sitemap.xml` must be updated whenever a new page or blog post is added.
