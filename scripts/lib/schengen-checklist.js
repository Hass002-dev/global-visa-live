'use strict';

// Builds and renders the document checklist tabs (Tourist / Business /
// Family and friends) for one Schengen country page. Split out from
// render-schengen-page.js so that file stays about the page's other
// sections, and this one stays about the checklist only.

const { escHtml } = require('./schengen-html-utils');

// A short, human subheading for each core item, shown above its detail
// text in the checklist. Overrides for these items are often one dense
// paragraph of rules (e.g. Greece's funds override) — a subheading lets
// a reader scan "what is this about" before reading the detail. Keyed
// by core item id, not duplicated in the JSON, so it never needs
// updating per country.
const CORE_ITEM_HEADINGS = {
    application_form: 'Application Form',
    photo: 'Photo',
    passport: 'Passport',
    passport_copy: 'Passport Copy',
    uk_residence: 'UK Residence Status',
    funds: 'UK Bank Statement',
    travel: 'Return Travel',
    accommodation: 'Accommodation',
    insurance: 'Travel Insurance',
    occupation: 'Proof of Occupation',
};

// A precise emoji per core item, instead of one generic document emoji
// for everything — e.g. a flight for return travel, a bed for
// accommodation. Keyed by the same core item id as CORE_ITEM_HEADINGS,
// so the two stay in sync automatically. Items with no core id (purpose
// list entries, extras) fall back to the generic document emoji below.
const CORE_ITEM_EMOJI = {
    application_form: '\u{1F4DD}', // memo
    photo: '\u{1F4F7}',            // camera
    passport: '\u{1F6C2}',         // passport control
    passport_copy: '\u{1F6C2}',
    uk_residence: '\u{1F3E0}',     // house
    funds: '\u{1F3E6}',            // bank
    travel: '\u{2708}\u{FE0F}',    // airplane
    accommodation: '\u{1F6CE}\u{FE0F}', // bellhop bell (hotel)
    insurance: '\u{1F6E1}\u{FE0F}',     // shield
    occupation: '\u{1F4BC}',       // briefcase
};

// Several countries' extras/purpose text already starts with a short
// "Label: detail" convention written by whoever authored the JSON (e.g.
// Greece's "Travelling by car: photocopy of..."). Split that off into
// the same { heading, text } shape the core items use, so it gets the
// same bold-subheading treatment. A colon past 60 characters in is
// treated as part of a sentence, not a label — e.g. Belgium's "...to
// support. From a parent: proof of..." must stay as one block of text.
const LABEL_PREFIX_MAX_LENGTH = 60;

function splitLabelPrefix(text) {
    const colonIndex = text.indexOf(':');
    if (colonIndex === -1 || colonIndex > LABEL_PREFIX_MAX_LENGTH) {
        return { heading: null, text };
    }
    return {
        heading: text.slice(0, colonIndex).trim(),
        text: text.slice(colonIndex + 1).trim(),
    };
}

// Documents.json's own stated assembly rule: core items (with any country
// override swapped in), then the chosen purpose's items, then the
// country's extras. Purpose-list entries that carry only an editorial
// "_note" (no "label") are not checklist items and must be skipped.
// Each item returned is { id, heading, text } — id is null for purpose
// and extras items (no core item to point back to), heading is null
// when there is no core id and no "Label:" prefix to use.
function assembleChecklist(core, countryDoc, purposeItems) {
    const overrides = countryDoc.overrides || {};
    const coreItems = core.map((item) => ({
        id: item.id,
        heading: CORE_ITEM_HEADINGS[item.id] || null,
        text: overrides[item.id] || item.label,
    }));
    const purposeItemsWithLabels = purposeItems
        .filter((item) => item.label)
        .map((item) => ({ id: null, ...splitLabelPrefix(item.label) }));
    const extraItems = (countryDoc.extras || []).map((text) => ({ id: null, ...splitLabelPrefix(text) }));
    return [...coreItems, ...purposeItemsWithLabels, ...extraItems];
}

// Fallback for anything without a core id (purpose items, extras) —
// still a document to gather, just not one of the 10 with its own
// precise emoji above.
const GENERIC_DOCUMENT_EMOJI = '\u{1F4C4}';

function renderChecklistItem(item) {
    const emoji = CORE_ITEM_EMOJI[item.id] || GENERIC_DOCUMENT_EMOJI;
    // The WhatsApp message (see schengen.js) reads data-label as the
    // item's full text, so fold heading + text into one string there
    // even though the heading is shown as its own line visually.
    const whatsAppLabel = item.heading ? `${item.heading}: ${item.text}` : item.text;
    const body = item.heading
        ? `<span class="schengen-checklist-heading">${emoji} ${escHtml(item.heading)}</span><span class="schengen-checklist-text">${escHtml(item.text)}</span>`
        : `<span class="schengen-checklist-text">${emoji} ${escHtml(item.text)}</span>`;
    return `<li><label><input type="checkbox" class="schengen-checklist-item" data-label="${escHtml(whatsAppLabel)}"><span class="schengen-checklist-body">${body}</span></label></li>`;
}

// Some countries have no checklist of their own for a given tab (e.g.
// Spain publishes no family-and-friends list) and point to another
// purpose's list instead, with an explanatory note. Driven entirely by
// countryDoc.purposeFallback — see Spain's "ES" entry in
// documents.json — so a future country with the same gap just gets the
// same JSON field, no code change here.
function renderChecklistTab(key, tabLabel, active, core, countryDoc, purposes) {
    const fallback = countryDoc.purposeFallback && countryDoc.purposeFallback[key];
    const purposeItems = fallback ? (purposes[fallback.usePurpose] || []) : (purposes[key] || []);
    const fallbackNote = fallback
        ? `<p class="schengen-disclaimer">${escHtml(fallback.note)}</p>`
        : '';
    const items = assembleChecklist(core, countryDoc, purposeItems)
        .map(renderChecklistItem)
        .join('\n');
    return `<div class="schengen-tab-panel" id="tab-${key}" data-tab="${key}" ${active ? '' : 'hidden'}>
  <h3 class="schengen-tab-heading">${escHtml(tabLabel)}</h3>
  ${fallbackNote}
  <ul class="schengen-checklist">${items}</ul>
</div>`;
}

function renderChecklistTabs(core, countryDoc, purposes) {
    const tabs = [
        ['tourist', 'Tourist'],
        ['business', 'Business'],
        ['family_friends', 'Family and friends'],
    ];
    // Shown here, above the checklist, rather than in "Before you apply"
    // (render-schengen-page.js's renderWarnings) — this disclaimer
    // qualifies the checklist specifically, so it belongs right above
    // it. Generic on countryDoc.status, not hardcoded to France: any
    // future "indicative" country gets this automatically.
    const indicativeDisclaimer = countryDoc.status === 'indicative' && countryDoc.disclaimer
        ? `<p class="schengen-disclaimer">${escHtml(countryDoc.disclaimer)}</p>`
        : '';
    const buttons = tabs
        .map(([key, label], i) => `<button type="button" class="schengen-tab-button" data-tab="${key}" aria-selected="${i === 0}">${escHtml(label)}</button>`)
        .join('\n');
    const panels = tabs
        .map(([key, label], i) => renderChecklistTab(key, label, i === 0, core, countryDoc, purposes))
        .join('\n');
    return `<section class="schengen-section" aria-labelledby="checklist">
  <span class="schengen-eyebrow">Checklist</span>
  <h2 id="checklist">Document checklist</h2>
  ${indicativeDisclaimer}
  <div class="schengen-tabs" role="tablist">${buttons}</div>
  ${panels}
  <button type="button" id="schengen-send-checklist" class="schengen-btn schengen-btn--whatsapp">Send my checklist to WhatsApp</button>
  <p id="schengen-checklist-sent" class="schengen-sent-confirmation" hidden><i class="fa-solid fa-circle-check"></i> Sent — check WhatsApp.</p>
</section>`;
}

module.exports = { assembleChecklist, renderChecklistTabs };
