'use strict';

// Renders the lightweight /schengen-visa-uk/ hub page — a front door
// that links to each published country page. This is a different page
// SHAPE from the per-country Template A/B (no checklist, no CTAs), so
// it gets its own small render function instead of reusing
// renderSchengenCountryPage().

const { escHtml, formatFeeLine, flagEmoji } = require('./schengen-html-utils');
const pageShell = require('./schengen-page-shell');

// The hub lives one directory level under the site root
// (/schengen-visa-uk/index.html) — the country pages are two levels
// down and use their own basePath via render-schengen-page.js.
const SITE_ROOT = '../';

// Deliberately a shorter paraphrase of renderAppointmentSection()'s
// fuller explanation (render-schengen-page.js) for a card-sized summary
// — same meaning, not a second source of truth for the wording.
function appointmentModelSummary(centre) {
    return centre.appointmentModel === 'browsable'
        ? 'You choose your own appointment slot.'
        : 'An appointment is allocated to you automatically.';
}

function renderCountryCard(centre) {
    const slug = centre.country.toLowerCase().replace(/\s+/g, '-');
    return `<a class="schengen-hub-card" href="${escHtml(slug)}/">
  <h2>${flagEmoji(centre.iso)} ${escHtml(centre.country)}</h2>
  <p>${escHtml(appointmentModelSummary(centre))}</p>
  <p class="schengen-hub-fee">${escHtml(formatFeeLine(centre))}</p>
</a>`;
}

function renderHubPage(countries) {
    const cards = countries.map(renderCountryCard).join('\n');
    return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Schengen Visa from the UK | Global Visa &amp; Journeys</title>
<meta name="description" content="Where to apply for a Schengen visa from the UK, country by country — visa centres, fees and document checklists.">
<link rel="icon" type="image/svg+xml" href="../favicon.svg">
<link rel="stylesheet" href="./schengen.css">
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@600;700&family=DM+Sans:wght@400;500;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" integrity="sha384-iw3OoTErCYJJB9mCa8LNS2hbsQ7M3C0EpIsO/H5+EGAkPGc6rk+V8i04oW/K5xq0" crossorigin="anonymous" media="print" onload="this.media='all'">
<script src="../cookie-consent.js"></script>
</head>
<body>
${pageShell.renderNav(SITE_ROOT)}
<header class="schengen-hero">
  <h1>Schengen visa from the UK — choose your destination</h1>
</header>
<main class="schengen-main">
<section class="schengen-section schengen-visible" aria-label="Countries">
  <div class="schengen-hub-grid">${cards}</div>
</section>
</main>
${pageShell.renderFooter(SITE_ROOT)}
</body>
</html>`;
}

module.exports = { renderHubPage };
