'use strict';

// The nav and footer shared by every /schengen-visa-uk/ page — the five
// country pages (two directory levels under the site root) and the hub
// (one level under it). basePath is how many "../" steps get back to
// the site root, so the same markup works at either depth instead of
// render-schengen-page.js and schengen-hub.js each hand-rolling their
// own copy with a different number of "../".

function renderNav(basePath) {
    return `<nav class="schengen-nav">
  <a href="${basePath}index.html" class="schengen-nav__brand"><span class="text-gold">GLOBAL VISA</span> &amp; JOURNEYS</a>
  <a href="${basePath}index.html" class="schengen-nav__link">Home</a>
</nav>`;
}

// Hass's call: these pages had no way back to the site's policy pages
// or any sign of the company behind them — worth the extra weight for
// a page that's about to ask a visitor for their travel details. Kept
// lighter than the homepage's footer: no newsletter signup here, since
// that pulls in its own Mailchimp fetch call this page doesn't need.
function renderFooter(basePath) {
    return `<footer class="schengen-footer">
  <nav class="schengen-footer-links" aria-label="Policies">
    <a href="${basePath}fee-list.html">Full Fee List</a>
    <a href="${basePath}refund-policy.html">Refund Policy</a>
    <a href="${basePath}complaints-policy.html">Complaints Policy</a>
    <a href="${basePath}engagement-letter.html">Client Engagement Letter</a>
    <a href="${basePath}privacy-policy.html">Privacy Policy</a>
  </nav>
  <p class="schengen-footer-trust">
    <i class="fa-solid fa-building-columns"></i> Companies House
    <i class="fa-solid fa-shield-halved"></i> PI Insured
    <i class="fa-solid fa-lock"></i> GDPR Compliant
  </p>
  <p>Global Visa &amp; Journeys Ltd. Registered in England &amp; Wales (No: 16959031).</p>
  <a href="${basePath}index.html">Back to Global Visa &amp; Journeys</a>
</footer>`;
}

module.exports = { renderNav, renderFooter };
