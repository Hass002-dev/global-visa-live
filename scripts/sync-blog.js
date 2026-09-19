#!/usr/bin/env node
'use strict';

/**
 * sync-blog.js
 *
 * Queries Firestore for blog posts where status == 'published' AND live != true,
 * then outputs them as JSON so the sync-blog skill can generate static HTML files.
 *
 * Usage:
 *   node scripts/sync-blog.js                  — list unsynced posts as JSON
 *   node scripts/sync-blog.js --mark-live <id> — set live:true on a post
 *
 * Requires .env.local in the project root with:
 *   GVJ_PASSWORD=your-firebase-password
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const PROJECT_ID  = 'global-visa-journeys';
const API_KEY     = 'AIzaSyCcoyBXRITTblrH0XcaLGMjftUttXYLtj4';
const ADMIN_EMAIL = 'office@globalvisajourneys.com';

function loadPassword() {
    const envPath = path.join(__dirname, '..', '.env.local');
    if (!fs.existsSync(envPath)) {
        console.error('[sync-blog] ERROR: .env.local not found.\nCreate it in the project root with:\n  GVJ_PASSWORD=your-firebase-password');
        process.exit(1);
    }
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
        const m = line.match(/^GVJ_PASSWORD\s*=\s*(.+)$/);
        if (m) return m[1].trim().replace(/^["']|["']$/g, '');
    }
    console.error('[sync-blog] ERROR: GVJ_PASSWORD not found in .env.local');
    process.exit(1);
}

function httpRequest(opts, body) {
    return new Promise((resolve, reject) => {
        const req = https.request(opts, res => {
            let raw = '';
            res.on('data', d => raw += d);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
                catch (e) { resolve({ status: res.statusCode, body: raw }); }
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
        headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'Referer': 'https://globalvisajourneys.com/' }
    }, body);
    if (!res.body.idToken) {
        console.error('[sync-blog] Firebase Auth failed:', res.body?.error?.message || JSON.stringify(res.body));
        process.exit(1);
    }
    return res.body.idToken;
}

async function queryPublishedPosts() {
    const body = JSON.stringify({
        structuredQuery: {
            from: [{ collectionId: 'blog_posts' }],
            where: {
                fieldFilter: {
                    field: { fieldPath: 'status' },
                    op:    'EQUAL',
                    value: { stringValue: 'published' }
                }
            }
        }
    });
    // blog_posts are publicly readable — no auth token needed for this query
    const res = await httpRequest({
        hostname: 'firestore.googleapis.com',
        path:     `/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`,
        method:   'POST',
        headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, body);

    const posts = [];
    for (const item of (Array.isArray(res.body) ? res.body : [])) {
        if (!item.document) continue;
        const fields = item.document.fields || {};
        const live   = fields.live?.booleanValue === true;
        if (!live) {
            posts.push({
                id:             item.document.name.split('/').pop(),
                slug:           fields.slug?.stringValue           || '',
                title:          fields.title?.stringValue          || '',
                category:       fields.category?.stringValue       || '',
                author:         fields.author?.stringValue         || 'GV&J Strategy Team',
                heroImage:      fields.heroImage?.stringValue      || '',
                excerpt:        fields.excerpt?.stringValue        || '',
                bodyHtml:       fields.bodyHtml?.stringValue       || '',
                tags:           (fields.tags?.arrayValue?.values   || []).map(v => v.stringValue || ''),
                ctaType:        fields.ctaType?.stringValue        || 'quickscan',
                seoTitle:       fields.seoTitle?.stringValue       || '',
                seoDescription: fields.seoDescription?.stringValue || '',
                publishedAt:    fields.publishedAt?.stringValue    || '',
                createdAt:      fields.createdAt?.stringValue      || '',
            });
        }
    }
    return posts;
}

async function markLive(token, id) {
    const body = JSON.stringify({
        fields: {
            live:      { booleanValue: true },
            updatedAt: { stringValue: new Date().toISOString() }
        }
    });
    const res = await httpRequest({
        hostname: 'firestore.googleapis.com',
        path:     `/v1/projects/${PROJECT_ID}/databases/(default)/documents/blog_posts/${id}?updateMask.fieldPaths=live&updateMask.fieldPaths=updatedAt`,
        method:   'PATCH',
        headers:  { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body), 'Authorization': `Bearer ${token}` }
    }, body);
    if (res.status !== 200) {
        console.error('[sync-blog] Failed to mark live:', id, res.body);
        process.exit(1);
    }
}

async function main() {
    const args       = process.argv.slice(2);
    const markIdx    = args.indexOf('--mark-live');
    const markLiveId = markIdx >= 0 ? args[markIdx + 1] : null;

    if (markLiveId) {
        // markLive requires auth — sign in first
        const password = loadPassword();
        const token    = await signIn(password);
        await markLive(token, markLiveId);
        process.stdout.write(JSON.stringify({ success: true, id: markLiveId }) + '\n');
        return;
    }

    // Query is public — no sign-in needed
    const posts = await queryPublishedPosts();
    process.stdout.write(JSON.stringify(posts, null, 2) + '\n');
}

main().catch(e => { console.error('[sync-blog]', e.message || e); process.exit(1); });
