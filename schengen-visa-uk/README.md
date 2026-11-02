# Schengen-from-the-UK country pages

These pages (`/schengen-visa-uk/<country>/`, plus the `/schengen-visa-uk/`
hub page) are **generated**, not hand-written. Don't edit any `index.html`
file under `schengen-visa-uk/` directly — your edit will be silently
overwritten the next time the build script runs.

All five countries (Greece, Spain, Belgium, Germany, France) are published.
The hub at `/schengen-visa-uk/` lists exactly the countries in
`ISO_CODES_TO_BUILD` (`scripts/build-schengen-pages.js`), so it never links
to a country that isn't built — add a sixth country there and it appears
on the hub automatically.

## Where the data lives

Two files, both at the repo root, both loaded by the build script. The
pages rely on JavaScript for their interactive parts (tabs, the checklist
sender) the same way the rest of the site's FAQ accordions and quizzes
do — there is no no-JS fallback, by design:

- `data/schengen-uk-centres.json` — one object per country: operator,
  `operatorShortName` (used in the "Book"/"Register on the official ___
  site" button), booking URL, official info URL, `appointmentModel`
  (`"browsable"` or `"allocated"`), the three visa centres
  (address/hours/phone), fees, nationality notes, the `package` field,
  `lastChecked`.
- `data/schengen-uk-documents.json` — the document checklist, in three
  layers: `core` (every country), `countries.<ISO>.overrides` (replaces a
  core item's text for that country), `purposes` (extra items by trip type:
  tourist / business / conference / family_friends), and
  `countries.<ISO>.extras` (country-specific extra items). The checklist
  shown on the page is: core items (with overrides applied) + the selected
  purpose's items + that country's extras — see
  `assembleChecklist()` in `scripts/lib/schengen-checklist.js`.

  Two more optional fields on a country's object here:
  - `purposeFallback.<tab key>.{usePurpose, note}` — for when a country
    has no checklist of its own for a given tab. Spain's `"ES"` entry
    uses this for `family_friends` (falls back to the `tourist` purpose
    list, with a note explaining why). See `renderChecklistTab()` in
    `scripts/lib/schengen-checklist.js`.
  - `status: "indicative"` + `disclaimer` — shows `disclaimer` prominently
    above the checklist tabs, automatically, for any country with this
    status (France's `"FR"` entry is the current example). See the
    `indicativeDisclaimer` logic in `renderChecklistTabs()`, same file.

## How to update a centre's opening hours (or address, fee, phone, etc.)

1. Open `data/schengen-uk-centres.json`.
2. Find the country, then the centre (`city`) inside its `centres` array.
3. Edit the `hours` field (or whichever field changed).
4. Run `node scripts/build-schengen-pages.js` from the repo root.
5. Commit the changed JSON file **and** the regenerated
   `schengen-visa-uk/<country>/index.html`.

Nothing else needs to change. The page has no hardcoded hours anywhere —
if you grep the generated HTML for the old hours text and find it, that
means the JSON wasn't rebuilt, not that the HTML has its own copy.

## How to fill in the "Get us to handle it" package

Each country object in `data/schengen-uk-centres.json` has:

```json
"package": { "name": null, "price": null, "description": null }
```

Fill in all three fields. The button is hidden automatically while
`price` is `null` — as soon as it has a real value, the button appears
and its WhatsApp message uses `package.name`. Rebuild afterwards.

## How to add a sixth country

1. Add a new object to the array in `data/schengen-uk-centres.json`
   (same shape as the other five — copy Greece's as a starting point,
   include the `package` field).
2. Add a new `"<ISO>": { ... }` entry under `countries` in
   `data/schengen-uk-documents.json` (overrides + extras + warnings).
3. Open `scripts/build-schengen-pages.js` and add the new ISO code to the
   `ISO_CODES_TO_BUILD` array near the top. The hub page picks it up
   automatically from the same array — no separate edit needed there.
4. Run `node scripts/build-schengen-pages.js`.
5. Add the new page's URL to `sitemap.xml` (see the existing
   `/schengen-visa-uk/greece/` entry for the format).

You should **not** need to touch `scripts/lib/*.js` or
`schengen-visa-uk/schengen.css`/`.js` for a sixth country of either
existing `appointmentModel` — those are shared and already generic.
Everything that differs by `appointmentModel` ("browsable" vs
"allocated") is driven from `centre.appointmentModel` in these three
places; if a third appointment model ever appears, these are the
functions to extend, not new ones to write:

- `renderAppointmentSection()` in `scripts/lib/render-schengen-page.js`
  — the "How appointments work" section's wording and whether
  `allocationMechanism` is shown.
- `ctaCopyFor()` in `scripts/lib/schengen-cta.js` — the
  check-availability button's label and the booking button's verb
  ("Book" vs "Register").
- `appointmentModelSummary()` in `scripts/lib/schengen-hub.js` — the
  one-line summary shown on that country's hub card. Keep this in sync
  with `renderAppointmentSection()`'s wording in spirit; it's a shorter
  paraphrase for a card, not a second independent description.

Also generic already, not tied to any specific country:

- `findRestrictedDayCentres()` / `renderRestrictedDayNotice()` in
  `scripts/lib/schengen-centres.js` — the callout above the centres
  table for any centre whose `hours` field names a specific day
  (today only Germany's Edinburgh centre matches; it is detected from
  the data, not hardcoded to Germany).
- `purposeFallback` and `status: "indicative"` — see "Where the data
  lives" above. A sixth country only needs these JSON fields if it
  actually has the same gap; most won't.

## Rebuilding after any data change

```bash
node scripts/build-schengen-pages.js
# or: npm run build:schengen
```

This is a separate step from `npm run build` (which only recompiles
Tailwind's `output.css` and has nothing to do with these pages — they
load their own `schengen.css`, not `output.css`).
