'use strict';

// Renders one Schengen-from-the-UK country page as a static HTML string.
//
// Why this file exists as its own module (not inlined in the build script):
// Germany, Spain, Belgium and France will all reuse exactly these functions.
// Keeping render logic separate from "read the JSON, write the file" means
// the next build only has to call renderSchengenCountryPage() with its own
// joined data — nothing here should need to change for a new country, only
// for a genuinely new page LAYOUT (e.g. a future Template B/C).
//
// The checklist tabs live in schengen-checklist.js, the centres table and
// its restricted-day callout in schengen-centres.js, and the CTA buttons
// in schengen-cta.js — split out as each pushed this file past the
// brief's ~200-line cap. This file re-exports their functions so nothing
// importing from here breaks.
//
// Shape of the `pageData` object renderSchengenCountryPage() expects:
//   {
//     centre: <one object from data/schengen-uk-centres.json>,
//     doc:    <documents.json.countries[iso]>,
//     core:   <documents.json.core>,
//     purposes: <documents.json.purposes>,
//   }

const { escHtml, buildWhatsAppLink, formatFeeLine, flagEmoji } = require('./schengen-html-utils');
const { assembleChecklist, renderChecklistTabs } = require('./schengen-checklist');
const { renderCentresTable, findRestrictedDayCentres, renderRestrictedDayNotice } = require('./schengen-centres');
const { ctaCopyFor, buildCheckAvailabilityLink, renderCtaButtons } = require('./schengen-cta');
const pageShell = require('./schengen-page-shell');

// Country pages live two directory levels under the site root
// (/schengen-visa-uk/<country>/index.html) — the hub (schengen-hub.js)
// is one level up and passes its own basePath to the same functions.
const SITE_ROOT = '../../';

function renderHead(centre) {
    const title = `${centre.country} Schengen Visa from the UK | Global Visa & Journeys`;
    const description = `Where to apply for a ${centre.country} Schengen visa from the UK, the document checklist, fees and how appointments are booked.`;
    return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(title)}</title>
<meta name="description" content="${escHtml(description)}">
<link rel="icon" type="image/svg+xml" href="../../favicon.svg">
<link rel="stylesheet" href="../schengen.css">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" integrity="sha384-iw3OoTErCYJJB9mCa8LNS2hbsQ7M3C0EpIsO/H5+EGAkPGc6rk+V8i04oW/K5xq0" crossorigin="anonymous" media="print" onload="this.media='all'">
<script src="../../cookie-consent.js"></script>
</head>
<body>`;
}

function renderNav() {
    return pageShell.renderNav(SITE_ROOT);
}

function renderUkResidentsNotice() {
    // These visa centres only accept UK residents — said once, high up, so
    // someone outside the UK does not fill in the checklist for nothing.
    return `<p class="schengen-uk-only-notice">This page is for applicants applying from inside the United Kingdom. The centres below only accept UK residents.</p>`;
}

function renderHero(centre) {
    // The availability CTA also lives here, right under the H1, so a
    // visitor sees it before they've scrolled past any of the detail
    // below — not only at the very bottom of the page.
    const { checkLabel } = ctaCopyFor(centre);
    return `<header class="schengen-hero">
  <h1>${flagEmoji(centre.iso)} ${escHtml(centre.country)} Schengen visa from the UK — where to apply and what to bring</h1>
  <a href="${buildCheckAvailabilityLink(centre)}" class="schengen-btn schengen-btn--whatsapp schengen-top-cta" data-ga-location="check_availability_cta_top" target="_blank" rel="noopener noreferrer">${escHtml(checkLabel)}</a>
</header>`;
}

// Visa fee + service fee come from centres.json; the per-day funds figure
// comes from documents.json — two files joined by ISO code for this one
// section. Any null is shown as "Not published", never printed as "null".
// Greece charges Gambian nationals EUR 120, not the EUR 90 shown above
// for everyone else — this is exactly the kind of fee difference a
// visitor could miss if it weren't pulled out as its own block.
// Renders nothing when the array is empty or missing (e.g. Spain's
// entries aren't about nationality-specific fees at all) rather than
// an empty heading.
function renderNationalityNotes(centre) {
    const notes = centre.nationalityNotes || [];
    if (notes.length === 0) return '';
    const items = notes.map((note) => `<li>${escHtml(note)}</li>`).join('\n');
    return `<div class="schengen-nationality-notes">
  <p class="schengen-nationality-notes-heading">Different rules for some nationalities</p>
  <ul>${items}</ul>
</div>`;
}

function renderCosts(centre, countryDoc) {
    const feeLine = formatFeeLine(centre);
    const fundsLine = countryDoc.fundsPerDay
        ? `${countryDoc.fundsCurrency} ${countryDoc.fundsPerDay} per day${countryDoc.fundsMinimum ? `, minimum ${countryDoc.fundsCurrency} ${countryDoc.fundsMinimum}` : ''}`
        : 'No per-day figure published — see the full funds requirement in your checklist below.';
    return `<section class="schengen-section" aria-labelledby="costs">
  <span class="schengen-eyebrow">Fees</span>
  <h2 id="costs">Costs</h2>
  <dl class="schengen-cost-list">
    <dt>Visa fee</dt><dd>${escHtml(feeLine)}</dd>
    <dt>Service fee</dt><dd>${escHtml(centre.serviceFeeNote || 'Not published')}</dd>
    <dt>Funds required</dt><dd>${escHtml(fundsLine)}</dd>
  </dl>
  ${renderNationalityNotes(centre)}
</section>`;
}

// Already handles both appointment models generically — Germany's
// "allocated" row (queue, first-come-first-served, 24-hour confirm
// window) comes straight from its allocationMechanism field, so this
// function needed no changes to support Germany.
function renderAppointmentSection(centre) {
    const isBrowsable = centre.appointmentModel === 'browsable';
    const explanation = isBrowsable
        ? `For ${centre.country}, you choose your own appointment slot and time directly on the official booking site.`
        : `For ${centre.country}, you do not pick a slot. You register, and an appointment is allocated to you automatically once one becomes available.`;
    const mechanism = !isBrowsable && centre.allocationMechanism
        ? `<p>${escHtml(centre.allocationMechanism)}</p>`
        : '';
    return `<section class="schengen-section" aria-labelledby="appointments">
  <span class="schengen-eyebrow">Appointments</span>
  <h2 id="appointments">How appointments work</h2>
  <p>${escHtml(explanation)}</p>
  ${mechanism}
</section>`;
}

function renderWarnings(countryDoc) {
    // The indicative-status disclaimer (e.g. France's) now renders above
    // the checklist instead (schengen-checklist.js's renderChecklistTabs),
    // not here, so it isn't shown twice on the same page.
    const warnings = countryDoc.warnings || [];
    if (warnings.length === 0) return '';
    const items = warnings.map((w) => `<li>${escHtml(w)}</li>`).join('\n');
    return `<section class="schengen-section schengen-section--warning" aria-labelledby="warnings">
  <span class="schengen-eyebrow">Important</span>
  <h2 id="warnings">Before you apply</h2>
  <ul>${items}</ul>
</section>`;
}

function renderLastChecked(centre) {
    return `<section class="schengen-section schengen-last-checked">
  <p>Last checked ${escHtml(centre.lastChecked)}. See the <a href="${escHtml(centre.officialInfoUrl)}" target="_blank" rel="noopener noreferrer">official source</a>.</p>
</section>`;
}

function renderFooter() {
    return `${pageShell.renderFooter(SITE_ROOT)}
<script src="../schengen.js"></script>
</body>
</html>`;
}

function renderSchengenCountryPage(pageData) {
    const { centre, doc, core, purposes } = pageData;
    return [
        renderHead(centre),
        renderNav(),
        renderUkResidentsNotice(),
        renderHero(centre),
        '<main class="schengen-main">',
        renderCentresTable(centre),
        renderCosts(centre, doc),
        renderAppointmentSection(centre),
        renderChecklistTabs(core, doc, purposes),
        renderWarnings(doc),
        renderCtaButtons(centre),
        renderLastChecked(centre),
        '</main>',
        renderFooter(),
    ].join('\n');
}

module.exports = {
    renderSchengenCountryPage,
    assembleChecklist,
    renderChecklistTabs,
    escHtml,
    buildWhatsAppLink,
    renderHead,
    renderNav,
    renderUkResidentsNotice,
    renderHero,
    renderCentresTable,
    renderCosts,
    renderAppointmentSection,
    renderWarnings,
    renderCtaButtons,
    renderLastChecked,
    renderFooter,
    ctaCopyFor,
    buildCheckAvailabilityLink,
    findRestrictedDayCentres,
    renderRestrictedDayNotice,
};
