'use strict';

// Generates the static Schengen-from-the-UK country pages from
// data/schengen-uk-centres.json and data/schengen-uk-documents.json.
//
// Why a build step instead of fetching the JSON in the browser: the brief
// requires no hardcoded addresses/fees/documents in the page markup, and
// a build step keeps that true without a client-side fetch — same
// approach already used by scripts/sync-blog.js for blog posts.
//
// Run with: node scripts/build-schengen-pages.js

const fs = require('fs');
const path = require('path');
const { renderSchengenCountryPage } = require('./lib/render-schengen-page');
const { renderHubPage } = require('./lib/schengen-hub');

const ROOT = path.join(__dirname, '..');
const centres = require(path.join(ROOT, 'data/schengen-uk-centres.json'));
const documents = require(path.join(ROOT, 'data/schengen-uk-documents.json'));

// All five countries are now approved to publish. Add a sixth ISO code
// here once its data is ready and reviewed — the hub page below reads
// this same list, so it never links to a country that isn't built yet.
const ISO_CODES_TO_BUILD = ['GR', 'DE', 'ES', 'BE', 'FR'];

function buildCountryPage(iso) {
    const centre = centres.find((c) => c.iso === iso);
    const doc = documents.countries[iso];
    if (!centre || !doc) {
        throw new Error(`Missing data for ISO code "${iso}" in one of the two JSON files.`);
    }

    const html = renderSchengenCountryPage({
        centre,
        doc,
        core: documents.core,
        purposes: documents.purposes,
    });

    const slug = centre.country.toLowerCase().replace(/\s+/g, '-');
    const outDir = path.join(ROOT, 'schengen-visa-uk', slug);
    fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(path.join(outDir, 'index.html'), html);
    console.log(`Wrote schengen-visa-uk/${slug}/index.html`);
}

function buildHubPage() {
    const publishedCentres = ISO_CODES_TO_BUILD.map((iso) => centres.find((c) => c.iso === iso));
    const html = renderHubPage(publishedCentres);
    fs.writeFileSync(path.join(ROOT, 'schengen-visa-uk', 'index.html'), html);
    console.log('Wrote schengen-visa-uk/index.html');
}

ISO_CODES_TO_BUILD.forEach(buildCountryPage);
buildHubPage();
