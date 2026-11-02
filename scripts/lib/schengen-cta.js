'use strict';

// The three "do something now" buttons shared by every Schengen country
// page (check-your-case, official booking, GVJ-handles-it). Split out of
// render-schengen-page.js once that file passed the ~200-line cap set in
// the brief — this is the one place button wording differs by
// appointmentModel, so it stays together rather than scattered.

const { escHtml, buildWhatsAppLink } = require('./schengen-html-utils');

// A browsable country (Greece, Spain, Belgium) has availability to look
// at; an allocated one (Germany, France) does not — there is no slot to
// check, only a case to register. Kept in one helper so the hero's top
// CTA and the bottom CTA row can't end up with mismatched wording.
function ctaCopyFor(centre) {
    const isBrowsable = centre.appointmentModel === 'browsable';
    return {
        checkLabel: isBrowsable ? 'Ask us to check availability' : 'Ask us to check your case',
        bookVerb: isBrowsable ? 'Book' : 'Register',
    };
}

// Shared by the top-of-page CTA and the bottom CTA row, so the WhatsApp
// prefill text only has to be written once.
function buildCheckAvailabilityLink(centre) {
    const isBrowsable = centre.appointmentModel === 'browsable';
    const text = isBrowsable
        ? `Hi, I'd like you to check ${centre.country} appointment availability. City: ... Travel dates: ... Travellers: ...`
        : `Hi, I'd like you to check my ${centre.country} visa case. City: ... Travel dates: ... Travellers: ...`;
    return buildWhatsAppLink('447511219482', text);
}

// The "Get us to handle it" button is intentionally data-driven: it does
// not exist on the page at all until centre.package.price is filled in
// (see data/schengen-uk-centres.json). Never show a CTA with a blank price.
function renderCtaButtons(centre) {
    const { checkLabel, bookVerb } = ctaCopyFor(centre);
    const packageButton = centre.package && centre.package.price
        ? `<a href="${buildWhatsAppLink('447511219482', `Hi, I'd like GVJ to handle my ${centre.country} Schengen application (${escHtml(centre.package.name)}). City: ... Travel dates: ... Travellers: ...`)}" class="schengen-btn schengen-btn--whatsapp" data-ga-location="package_cta" target="_blank" rel="noopener noreferrer">Get us to handle it</a>`
        : '';
    return `<section class="schengen-section schengen-cta-row" aria-label="Next steps">
  <a href="${buildCheckAvailabilityLink(centre)}" class="schengen-btn schengen-btn--whatsapp" data-ga-location="check_availability_cta" target="_blank" rel="noopener noreferrer">${escHtml(checkLabel)}</a>
  <a href="${escHtml(centre.bookingUrl)}" class="schengen-btn schengen-btn--outline" data-ga-location="official_booking_cta" target="_blank" rel="noopener noreferrer">${escHtml(bookVerb)} on the official ${escHtml(centre.operatorShortName)} site</a>
  ${packageButton}
</section>`;
}

module.exports = { ctaCopyFor, buildCheckAvailabilityLink, renderCtaButtons };
