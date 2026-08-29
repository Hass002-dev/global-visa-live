---
name: write-blog
description: Run this skill when the user asks to "write a blog post", "draft a blog post", "create a blog post about X", or "publish a blog post on X". Generates a complete, on-brand GVJ blog post and saves it directly to Firestore so it immediately appears in the admin.html dashboard. The user then runs sync-blog to generate the static file and git-pushes to make it live.
---

# Write Blog Post Skill

## What this does

Writes a complete blog post in GVJ's voice, converts it to HTML, and saves it to Firestore via `scripts/create-post.js`. The post appears in admin.html immediately with `status: published, live: false`. The user then runs the `sync-blog` skill to generate the static file and deploy.

---

## Before you start

### 1. Confirm `.env.local` exists

`scripts/create-post.js` needs `.env.local` in the project root with:
```
GVJ_PASSWORD=the-firebase-password-for-office@globalvisajourneys.com
```

If missing, tell the user to create it. Do not proceed until it exists.

### 2. Clarify the brief (if not already given)

If the user has not given a topic, ask for one. You need at minimum:
- **Topic** — what the post is about
- **Audience** (optional) — defaults to West African travellers (Nigeria, Ghana, Gambia) unless the user specifies UK-based readers

---

## Step 1 — Choose the category

Pick exactly one of these three values:

| Value | Use when |
|---|---|
| `Africa Residents` | Aimed at applicants in Nigeria, Ghana, Gambia, Senegal, or West Africa generally |
| `UK Residents` | Aimed at UK-based readers, including African diaspora in the UK |
| `General Visa Strategy` | Topic applies equally to both audiences |

---

## Step 2 — Choose a hero image

Pick a high-quality Unsplash image URL relevant to the topic. Use the format:
```
https://images.unsplash.com/photo-{ID}?w=1200&auto=format&fit=crop
```

Before using any URL, verify it returns HTTP 200:
```powershell
(Invoke-WebRequest -Uri "https://images.unsplash.com/photo-{ID}?w=1200" -Method HEAD -ErrorAction SilentlyContinue).StatusCode
```

Good photo IDs for common GVJ topics:
- Passport / travel documents: `1554224155-6726b3ff858f`, `1436491865332-7a61a109cc05`
- European city / travel: `1467269204165-f537ef15e4c7`, `1512453979798-5ea266f8880c`
- Money / bank / finance: `1579621970563-ebec7560ff3e`, `1565514020179-026b92b2d257`
- Documents / paperwork: `1568219656418-15c329312bf1`, `1450101499163-c8848c66ca85`
- Airport / flying: `1436491865332-7a61a109cc05`, `1488085061851-09535db28b65`
- People / consultation: `1573496359142-b8d87734a5a2`, `1551836022-d5d88e9218df`

If none fit, choose a thematically relevant Unsplash ID and verify it.

---

## Step 3 — Choose a CTA type

| Value | When to use |
|---|---|
| `quickscan` | Post discusses refusals, document quality, or preparation — upsells QuickScan Audit (£39.99) |
| `whatsapp` | Post is conversational / advisory and suits a direct WhatsApp reply |
| `calculator` | Post discusses financial readiness, funds required, or Schengen eligibility checks |

---

## Step 4 — Write the post

Write a complete blog post following GVJ's editorial standards:

### Voice and tone
- Authoritative but plain-spoken — no jargon unexplained
- Specific and honest — name real requirements, real fees, real timelines
- Address the reader directly ("you", not "applicants")
- West African context by default: reference Nigerian/Ghanaian applicants, West African consulates, VFS Global / TLSContact, common local pain-points
- Never use hollow filler phrases like "In conclusion" or "It goes without saying"

### Structure
- **Title**: Specific, keyword-forward, includes the year (2026 or 2026–27). 60–80 characters ideal.
- **Excerpt**: One punchy sentence (under 200 characters) that states the core value or problem. No "In this post we will..."
- **Body** (in Markdown, 600–900 words):
  - Opening paragraph: state the problem or stakes immediately
  - 3–5 H2 sections covering the key points
  - Use bullet lists for requirements/documents; use numbered lists for steps
  - End with a natural lead-in to the CTA (do not write the CTA itself — that comes from ctaType)
- **Tags**: 3–5 tags, lowercase with hyphens e.g. `schengen-visa`, `nigeria`, `bank-statements`
- **SEO title**: Same as title or a slight variation (under 70 characters)
- **SEO description**: One sentence, under 160 characters, includes primary keyword

### What NOT to write
- Do not mention Poland as a primary or core route — only as a named example within broader European framing (see Poland constraint in project memory)
- Do not fabricate specific embassy phone numbers, exact processing times presented as guaranteed, or statistics without noting they are estimates
- Do not promise visa approval

---

## Step 5 — Convert body markdown to HTML

Convert the Markdown body to HTML manually (no library available here). Rules:

| Markdown | HTML |
|---|---|
| `# Heading` | `<h1>…</h1>` (will be hidden by CSS — title shown separately) |
| `## Heading` | `<h2>…</h2>` |
| `### Heading` | `<h3>…</h3>` |
| `**bold**` | `<strong>…</strong>` |
| `*italic*` | `<em>…</em>` |
| `- item` | `<ul><li>…</li></ul>` |
| `1. item` | `<ol><li>…</li></ol>` |
| `> quote` | `<blockquote>…</blockquote>` |
| Blank line between paragraphs | `<p>…</p>` |
| `---` | `<hr>` |

All output must be valid HTML. Escape `&`, `<`, `>` in plain text but NOT inside intentional HTML tags.

---

## Step 6 — Build the JSON payload

Assemble a single-line JSON object:

```json
{
  "title": "...",
  "slug": "keyword-rich-slug-2026",
  "category": "Africa Residents | UK Residents | General Visa Strategy",
  "heroImage": "https://images.unsplash.com/photo-{ID}?w=1200&auto=format&fit=crop",
  "excerpt": "Under 200 chars...",
  "body": "## First Section\n\nParagraph text...",
  "bodyHtml": "<h2>First Section</h2><p>Paragraph text...</p>",
  "tags": ["tag-one", "tag-two"],
  "ctaType": "quickscan | whatsapp | calculator",
  "seoTitle": "...",
  "seoDescription": "Under 160 chars..."
}
```

**Slug rules:**
- Lowercase, hyphens only, no special characters
- Include year (e.g. `-2026`)
- 50–70 characters
- Must match the filename that sync-blog will create: `blog/{slug}.html`

---

## Step 7 — Save to Firestore

Write the JSON to a temporary file and pipe it through `create-post.js`:

```powershell
$json = '{...single-line JSON...}'
$json | node scripts/create-post.js
```

**Success output:**
```json
{"success":true,"id":"DOCUMENT_ID","slug":"the-slug"}
```

If you see an error instead:
- `Firebase Auth failed` — check `.env.local` password
- `Missing required fields` — re-check JSON has all required keys
- `Firestore write failed` — check internet connection; retry once

---

## Step 8 — Report to the user

On success, tell the user:

> ✓ **"{title}"** saved to Firestore (ID: `{id}`)
>
> The post is now visible in the **admin dashboard** under the Blog Posts table (status: Published, live: Pending).
>
> To make it live on the site, ask me to **sync blog posts** — I'll generate `blog/{slug}.html`, update `sitemap.xml`, and mark it live. Then `git push` to deploy.

---

## Notes

- `live: false` is always set by create-post.js on new posts — this is intentional to prevent 404s before the static file is deployed
- The admin dashboard "Live" toggle (bolt icon) can be used to flip `live: true` manually, but the static file must exist first or blog listing cards will 404
- Do not run `sync-blog` automatically after `write-blog` unless the user explicitly asks — give them a chance to review the post in admin first
- The `bodyHtml` field is inserted directly as innerHTML in the static post page — it must be clean, valid HTML; do not include `<html>`, `<head>`, `<body>`, or `<script>` tags
