'use strict';

// Renders the "Where to apply" table and its restricted-submission-day
// callout. Split out of render-schengen-page.js once that file passed
// the ~200-line cap set in the brief.

const { escHtml } = require('./schengen-html-utils');

function renderCentreRow(c) {
    const phone = c.phone ? `\u{1F4DE} ${escHtml(c.phone)}` : 'Not published';
    // data-label feeds the mobile layout in schengen.css, where this
    // table becomes a stack of cards (one per centre) instead of a
    // cramped 5-column table — see the ".schengen-centres-table td"
    // mobile rule for why.
    return `<tr>
  <td data-label="City">${escHtml(c.city)}</td>
  <td data-label="Address">${escHtml(c.address)}</td>
  <td data-label="Hours">${escHtml(c.hours)}</td>
  <td data-label="Appointment only">${c.appointmentOnly ? 'Yes' : 'No'}</td>
  <td data-label="Phone">${phone}</td>
</tr>`;
}

// Flags any centre whose hours are written with a full day name rather
// than the sitewide "Mon-Fri" shorthand — that's the signal a centre does
// NOT take submissions every weekday. Checked against all 15 centres
// across all 5 countries' real data: today this only ever matches
// Germany's Edinburgh centre, but it's written generically so a future
// country with the same quirk is caught automatically instead of needing
// its own special case.
const FULL_DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function findRestrictedDayCentres(centre) {
    return centre.centres.filter((c) => FULL_DAY_NAMES.some((day) => c.hours.includes(day)));
}

// Shown as its own callout above the table, not inside a table cell —
// someone who assumes every centre runs Mon-Fri and only skims the table
// for their own city can miss a day restriction buried in a cell. A
// dedicated callout can't be skimmed past the same way. Renders nothing
// when no centre is restricted, so most countries show no empty box.
function renderRestrictedDayNotice(centre) {
    const restricted = findRestrictedDayCentres(centre);
    if (restricted.length === 0) return '';
    const items = restricted
        .map((c) => `<li><strong>${escHtml(c.city)}:</strong> ${escHtml(c.hours)}</li>`)
        .join('\n');
    return `<div class="schengen-centre-notice">
  <strong>Limited submission days</strong>
  <ul>${items}</ul>
</div>`;
}

function renderCentresTable(centre) {
    const rows = centre.centres.map(renderCentreRow).join('\n');
    return `<section class="schengen-section" aria-labelledby="where-to-apply">
  <span class="schengen-eyebrow">Visa Centres</span>
  <h2 id="where-to-apply">Where to apply</h2>
  ${renderRestrictedDayNotice(centre)}
  <div class="schengen-table-wrap">
    <table class="schengen-centres-table">
      <thead><tr><th>City</th><th>Address</th><th>Hours</th><th class="schengen-col-narrow">Appointment only</th><th>Phone</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
</section>`;
}

module.exports = { renderCentresTable, findRestrictedDayCentres, renderRestrictedDayNotice };
