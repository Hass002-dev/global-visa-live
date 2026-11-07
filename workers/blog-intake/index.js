/**
 * GVJ Blog Intake Worker
 *
 * Accepts POST requests from the co-work agent (or any trusted caller) containing
 * blog post data, and creates a Firestore document in the blog_posts collection.
 *
 * POST /intake
 * Headers:
 *   Authorization: Bearer <INTAKE_SECRET>
 *   Content-Type: application/json
 *
 * Body (all string unless noted):
 *   title, slug, category, heroImage, excerpt, body, bodyHtml  (required)
 *   author, tags (array), ctaType, seoTitle, seoDescription    (optional)
 *   publishedAt                                                 (optional ISO string)
 *
 * Environment variables (set via: wrangler secret put <NAME>):
 *   INTAKE_SECRET      — shared secret the co-work agent sends in Authorization header
 *   FIREBASE_API_KEY   — Firebase Web API key (public, already in codebase)
 *   FIREBASE_EMAIL     — office@globalvisajourneys.com
 *   FIREBASE_PASSWORD  — (set via wrangler secret, not stored here)
 *   FIREBASE_PROJECT   — global-visa-journeys
 *
 * Deploy:
 *   wrangler deploy   (from workers/blog-intake/)
 *   or paste into Cloudflare Dashboard → Workers → Create → Quick Edit
 */

const CORS = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

/* ── SHARED BLOG-HTML ALLOWLIST ──
   This exact tag/attribute list also lives in admin.html
   (GVJ_BLOG_SANITIZE_CONFIG, used with DOMPurify) and in
   scripts/create-post.js / scripts/sync-blog.js (isomorphic-dompurify
   with this same config). All four are the only places bodyHtml is ever
   written or re-written — keep them in sync if this list ever changes.
   A Worker has no DOM, so DOMPurify can't run here — this uses
   Cloudflare's native HTMLRewriter instead to the same effect. ── */
const ALLOWED_TAGS = new Set(['h1','h2','h3','h4','p','strong','b','em','i','a','ul','ol','li','blockquote','img','code','pre','hr','br']);
const ALLOWED_ATTR = new Set(['href','src','alt']);
// Tags dangerous enough to drop along with their content, not just unwrap.
const STRIP_WITH_CONTENT = new Set(['script','style','iframe','object','embed','form','svg','math','link','meta','base','noscript','template']);
const SAFE_URI = /^(?:https?|mailto):/i;

class GvjSanitizeHandler {
    element(el) {
        const tag = el.tagName.toLowerCase();
        if (STRIP_WITH_CONTENT.has(tag)) {
            el.remove();
            return;
        }
        if (!ALLOWED_TAGS.has(tag)) {
            el.removeAndKeepContent();
            return;
        }
        const names = [];
        for (const [name] of el.attributes) names.push(name);
        for (const name of names) {
            const lower = name.toLowerCase();
            // Belt and braces: drop any on* handler even if it somehow
            // ended up in ALLOWED_ATTR, and drop anything not allowlisted.
            if (lower.startsWith('on') || !ALLOWED_ATTR.has(lower)) {
                el.removeAttribute(name);
                continue;
            }
            if (lower === 'href' || lower === 'src') {
                const value = (el.getAttribute(name) || '').trim();
                if (!SAFE_URI.test(value)) el.removeAttribute(name);
            }
        }
    }
}

// Runs untrusted HTML through HTMLRewriter's streaming parser and returns
// the sanitised string. Wrapping in <body> and reading the result back out
// is the standard way to use HTMLRewriter on a plain string rather than a
// real request/response pipeline.
async function sanitizeBodyHtml(html) {
    const rewriter = new HTMLRewriter().on('*', new GvjSanitizeHandler());
    const wrapped  = new Response(`<body>${html}</body>`, { headers: { 'Content-Type': 'text/html' } });
    return (await rewriter.transform(wrapped).text()).trim();
}

export default {
    async fetch(request, env) {
        // Top-level catch: always return JSON, never let Cloudflare serve its error page
        try {
            return await handleRequest(request, env);
        } catch (err) {
            return json({ error: 'Worker error', detail: err.message ?? String(err) }, 500);
        }
    }
};

async function handleRequest(request, env) {
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: CORS });
    }

    if (request.method !== 'POST') {
        return json({ error: 'Method not allowed' }, 405);
    }

    // Auth
    const auth = request.headers.get('Authorization') || '';
    if (auth !== `Bearer ${env.INTAKE_SECRET}`) {
        return json({ error: 'Unauthorised' }, 401);
    }

    let input;
    try {
        input = await request.json();
    } catch {
        return json({ error: 'Invalid JSON body' }, 400);
    }

    const required = ['title', 'slug', 'category', 'heroImage', 'excerpt', 'body', 'bodyHtml'];
    const missing  = required.filter(f => !input[f]);
    if (missing.length) {
        return json({ error: 'Missing required fields', missing }, 400);
    }

    // Never trust bodyHtml as-is — this is the only one of three writers
    // to blog_posts that isn't a human using admin.html's own DOMPurify
    // pass, so it must sanitise itself rather than assume the caller did.
    const cleanBodyHtml = await sanitizeBodyHtml(input.bodyHtml);

    // Sign in to Firebase (with timeout protection)
    let authData;
    try {
        const authRes = await Promise.race([
            fetch(
                `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${env.FIREBASE_API_KEY}`,
                {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify({
                        email:             env.FIREBASE_EMAIL,
                        password:          env.FIREBASE_PASSWORD,
                        returnSecureToken: true,
                    }),
                }
            ),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Firebase auth timeout')), 10000)),
        ]);
        authData = await authRes.json();
    } catch (err) {
        return json({ error: 'Firebase auth failed', detail: err.message }, 500);
    }

    if (!authData.idToken) {
        return json({ error: 'Firebase auth failed', detail: authData?.error?.message }, 500);
    }

    const now  = new Date().toISOString();
    const data = {
        title:          { stringValue:  input.title },
        slug:           { stringValue:  input.slug.toLowerCase().trim() },
        category:       { stringValue:  input.category },
        author:         { stringValue:  input.author || 'GV&J Strategy Team' },
        heroImage:      { stringValue:  input.heroImage },
        excerpt:        { stringValue:  input.excerpt },
        body:           { stringValue:  input.body },
        bodyHtml:       { stringValue:  cleanBodyHtml },
        tags:           { arrayValue:   { values: (input.tags || []).map(t => ({ stringValue: t })) } },
        ctaType:        { stringValue:  input.ctaType        || 'quickscan' },
        seoTitle:       { stringValue:  input.seoTitle       || input.title },
        seoDescription: { stringValue:  input.seoDescription || input.excerpt },
        status:         { stringValue:  'published' },
        live:           { booleanValue: false },
        createdAt:      { stringValue:  now },
        updatedAt:      { stringValue:  now },
        publishedAt:    { stringValue:  input.publishedAt || now },
    };

    // Write to Firestore (with timeout protection)
    let fsRes, fsData;
    try {
        fsRes = await Promise.race([
            fetch(
                `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT}/databases/(default)/documents/blog_posts`,
                {
                    method:  'POST',
                    headers: {
                        'Content-Type':  'application/json',
                        'Authorization': `Bearer ${authData.idToken}`,
                    },
                    body: JSON.stringify({ fields: data }),
                }
            ),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Firestore write timeout')), 10000)),
        ]);
        fsData = await fsRes.json();
    } catch (err) {
        return json({ error: 'Firestore write failed', detail: err.message }, 500);
    }

    if (fsRes.status !== 200) {
        return json({ error: 'Firestore write failed', detail: fsData }, 500);
    }

    const id = fsData.name.split('/').pop();
    return json({ success: true, id, slug: input.slug.toLowerCase().trim() }, 201, CORS);
}

function json(body, status = 200, extraHeaders = {}) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json', ...CORS, ...extraHeaders },
    });
}
