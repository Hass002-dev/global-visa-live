#!/usr/bin/env node
'use strict';

/**
 * create-post.js
 *
 * Creates a new blog_posts document in Firestore from JSON supplied on stdin.
 * Reads .env.local for GVJ_PASSWORD.
 *
 * Usage:
 *   echo '{"title":"...","slug":"...","body":"...","bodyHtml":"..."}' | node scripts/create-post.js
 *
 * Required fields: title, slug, category, heroImage, excerpt, body, bodyHtml
 * Optional fields: author, tags, ctaType, seoTitle, seoDescription
 * Auto-set: status="published", live=false, createdAt, updatedAt, publishedAt
 */

const https    = require('https');
const fs       = require('fs');
const path     = require('path');
const readline = require('readline');

const PROJECT_ID  = 'global-visa-journeys';
const API_KEY     = 'AIzaSyCcoyBXRITTblrH0XcaLGMjftUttXYLtj4';
const ADMIN_EMAIL = 'office@globalvisajourneys.com';

function loadPassword() {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (!fs.existsSync(envPath)) {
        console.error('[create-post] ERROR: .env.local not found.');
        process.exit(1);
    }
    for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
        const m = line.match(/^GVJ_PASSWORD\s*=\s*(.+)$/);
        if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    }
    console.error('[create-post] ERROR: GVJ_PASSWORD not found in .env.local');
    process.exit(1);
}

function httpRequest(opts, body) {
    return new Promise((resolve, reject) => {
        const req = https.request(opts, res => {
            let raw = '';
            res.on('data', d => raw += d);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
                catch { resolve({ status: res.statusCode, body: raw }); }
            });
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

async function signIn(password) {
    const body = JSON.stringify({ email: ADMIN_EMAIL, password, returnSecureToken: true });
    const res = await httpRequest({
        hostname: 'identitytoolkit.googleapis.com',
        path:     `/v1/accounts:signInWithPassword?key=${API_KEY}`,
        method:   'POST',
        headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, body);
    if (!res.body.idToken) {
        console.error('[create-post] Firebase Auth failed:', res.body?.error?.message);
        process.exit(1);
    }
    return res.body.idToken;
}

function toFirestoreValue(val) {
    if (typeof val === 'string')  return { stringValue: val };
    if (typeof val === 'boolean') return { booleanValue: val };
    if (typeof val === 'number')  return { integerValue: String(val) };
    if (Array.isArray(val))       return { arrayValue: { values: val.map(toFirestoreValue) } };
    if (val === null)             return { nullValue: 'NULL_VALUE' };
    return { stringValue: String(val) };
}

function toFirestoreFields(obj) {
    const fields = {};
    for (const [k, v] of Object.entries(obj)) fields[k] = toFirestoreValue(v);
    return fields;
}

async function createDocument(token, data) {
    const body = JSON.stringify({ fields: toFirestoreFields(data) });
    const res = await httpRequest({
        hostname: 'firestore.googleapis.com',
        path:     `/v1/projects/${PROJECT_ID}/databases/(default)/documents/blog_posts`,
        method:   'POST',
        headers:  {
            'Content-Type':  'application/json',
            'Content-Length': Buffer.byteLength(body),
            'Authorization': `Bearer ${token}`
        }
    }, body);
    if (res.status !== 200) {
        console.error('[create-post] Firestore write failed:', JSON.stringify(res.body));
        process.exit(1);
    }
    return res.body.name.split('/').pop(); // return the new document ID
}

async function readStdin() {
    const rl = readline.createInterface({ input: process.stdin });
    const lines = [];
    for await (const line of rl) lines.push(line);
    return lines.join('\n');
}

async function main() {
    const raw = await readStdin();
    let input;
    try {
        input = JSON.parse(raw.replace(/^﻿/, ''));
    } catch (e) {
        console.error('[create-post] ERROR: Could not parse stdin as JSON.\n', e.message);
        process.exit(1);
    }

    const required = ['title', 'slug', 'category', 'heroImage', 'excerpt', 'body', 'bodyHtml'];
    const missing  = required.filter(f => !input[f]);
    if (missing.length) {
        console.error('[create-post] ERROR: Missing required fields:', missing.join(', '));
        process.exit(1);
    }

    const now  = new Date().toISOString();
    const data = {
        title:          input.title,
        slug:           input.slug.toLowerCase().trim(),
        category:       input.category,
        author:         input.author         || 'GV&J Strategy Team',
        heroImage:      input.heroImage,
        excerpt:        input.excerpt,
        body:           input.body,
        bodyHtml:       input.bodyHtml,
        tags:           input.tags           || [],
        ctaType:        input.ctaType        || 'quickscan',
        seoTitle:       input.seoTitle       || input.title,
        seoDescription: input.seoDescription || input.excerpt,
        status:         'published',
        live:           false,
        createdAt:      now,
        updatedAt:      now,
        publishedAt:    input.publishedAt    || now,
    };

    const password = loadPassword();
    const token    = await signIn(password);
    const id       = await createDocument(token, data);

    process.stdout.write(JSON.stringify({ success: true, id, slug: data.slug }) + '\n');
}

main().catch(e => { console.error('[create-post]', e.message || e); process.exit(1); });
