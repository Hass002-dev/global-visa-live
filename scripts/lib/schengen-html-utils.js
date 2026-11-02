'use strict';

// Tiny HTML-building helpers shared by render-schengen-page.js and
// schengen-checklist.js. Split out on its own because both files need
// it and neither one "owns" it.

function escHtml(value) {
    // Mirrors the escHtml() used in admin.html / blog/index.html — same
    // reasoning applies even though this data is build-time, not live user
    // input: never trust a string straight into HTML.
    if (value === null || value === undefined) return '';
    return String(value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function buildWhatsAppLink(phone, text) {
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

// Shared by renderCosts() (render-schengen-page.js) and the hub page's
// country cards (schengen-hub.js), so the EUR/GBP formatting rule only
// exists once.
function formatFeeLine(centre) {
    if (centre.feeEur) {
        return `EUR ${centre.feeEur}${centre.feeGbp ? ` (approx GBP ${centre.feeGbp})` : ''}`;
    }
    return centre.feeGbp ? `GBP ${centre.feeGbp}` : 'Not published';
}

// Keyed by the same ISO code already used throughout centres.json/
// documents.json, so a 6th country just needs its flag added here.
const COUNTRY_FLAG_EMOJI = {
    GR: '\u{1F1EC}\u{1F1F7}',
    ES: '\u{1F1EA}\u{1F1F8}',
    BE: '\u{1F1E7}\u{1F1EA}',
    DE: '\u{1F1E9}\u{1F1EA}',
    FR: '\u{1F1EB}\u{1F1F7}',
};

function flagEmoji(iso) {
    return COUNTRY_FLAG_EMOJI[iso] || '';
}

module.exports = { escHtml, buildWhatsAppLink, formatFeeLine, flagEmoji };
