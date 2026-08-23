---
name: sync-blog
description: Run this skill when the user asks to "sync blog posts", "publish pending blog posts", "generate static blog files", or "deploy unsynced posts". Queries Firestore for posts where status==published but live!=true, generates a complete static HTML file for each, updates sitemap.xml, and marks each post as live in Firestore. This is the correct way to bridge the gap between writing a post in admin.html and having it appear on the live site.
---

# Blog Post Sync Skill

## What this does

Finds all posts that have been published in Firestore (via admin.html) but whose static HTML file has not yet been generated and deployed. For each one: creates the static file, adds it to sitemap.xml, and sets `live: true` so it appears in the blog listing.

## Before you start

### Check for `.env.local`

The `scripts/sync-blog.js` script needs `.env.local` in the project root with:
```
GVJ_PASSWORD=the-firebase-password-for-office@globalvisajourneys.com
```

If the file doesn't exist, tell the user:
> "I need your Firebase password to query Firestore. Please create a file called `.env.local` in the project root with:
> ```
> GVJ_PASSWORD=your-password-here
> ```
> It's already gitignored — it won't be committed."

Do not proceed until `.env.local` exists.

---

## Step 1 — Query for unsynced posts

```
node scripts/sync-blog.js
```

This outputs a JSON array of posts where `status == 'published'` but `live != true`. Parse the output.

**If the array is empty:** Tell the user "No unsynced posts found — all published posts are already live." and stop.

**If there's an error:** Show the error. Common causes: wrong password in `.env.local`, no internet connection, Firestore rules blocking the query.

---

## Step 2 — For each unsynced post, generate `blog/{slug}.html`

If the static file already exists, skip that post (don't overwrite it).

Build the complete file matching the structure of any existing static post (e.g., `blog/schengen-visa-appointment-slots-2026-vfs-global-tlscontact.html`). Every section is required — do not omit nav, footer, WhatsApp float, mobile nav, or scripts.

### Field mapping

| Template slot | Firestore field | Notes |
|---|---|---|
| `<title>` | `seoTitle \|\| title` | HTML-escape; append ` \| Global Visa & Journeys` |
| Meta description | `seoDescription \|\| excerpt` | |
| Canonical / OG URL | `https://www.globalvisajourneys.com/blog/{slug}.html` | |
| OG / Twitter title | `seoTitle \|\| title` | |
| OG / Twitter description | `seoDescription \|\| excerpt` | |
| OG / Twitter image | `heroImage` | Only if `isSafeHttpUrl(heroImage)` |
| JSON-LD `headline` | `title` | |
| JSON-LD `datePublished` | `publishedAt \|\| createdAt` | ISO string |
| JSON-LD `dateModified` | `publishedAt \|\| createdAt` | ISO string |
| JSON-LD `description` | `excerpt` | |
| JSON-LD `image` | `[heroImage]` | |
| JSON-LD `url` | canonical URL | |
| Hero background CSS | `heroImage` | `style="background-image:url('{heroImage}')"` — HTML-escape the URL |
| Category pill | `category` | HTML-escape |
| Article `<h1>` | `title` | HTML-escape |
| Author line | `author` | HTML-escape |
| Date line | `publishedAt \|\| createdAt` | Format as "DD Mon YYYY" |
| Read time | `bodyHtml` word count | `Math.max(3, Math.ceil(wordCount / 200))` min |
| Article body `.article-body` | `bodyHtml` | Raw HTML — already DOMPurify-sanitized; do NOT re-escape |
| Tags | `tags` array | Each tag: `<span class="tag-pill">{tag}</span>` — HTML-escape tag text |

### CTA cards

Use `ctaType` to pick the CTA block:

**`quickscan`** (gold card):
```html
<div class="cta-card gold">
  <i class="fa-solid fa-magnifying-glass-chart text-3xl text-gold mb-3 block"></i>
  <h3 class="text-2xl md:text-3xl font-bold text-white mb-3">Stop Refusals Before They Happen</h3>
  <p class="text-[#adb8c4] mb-6 max-w-md mx-auto font-medium">Before you pay the embassy fee, let our senior strategists forensically review your documents. Our £39.99 QuickScan Audit identifies every fatal flaw in your application so you submit with absolute confidence.</p>
  <label class="gvj-terms-label" style="justify-content:center;"><input type="checkbox" onchange="gvjTogglePay('blog-pay-btn',this.checked)"><span>I confirm I have read and accept GVJ's <a href="../engagement-letter.html" target="_blank" rel="noopener">Client Engagement Letter and Terms &amp; Conditions</a>.</span></label>
  <a href="https://book.stripe.com/28E4gygLremKd0Ogx50sU00" id="blog-pay-btn" target="_blank" rel="noopener noreferrer" class="btn-gold px-8 py-3.5 rounded-full text-sm gvj-pay-gated" aria-disabled="true">Book QuickScan — £39.99</a>
</div>
```

**`whatsapp`** (green card):
```html
<div class="cta-card green">
  <i class="fa-brands fa-whatsapp text-3xl mb-3 block" style="color:#25d366;"></i>
  <h3 class="text-2xl md:text-3xl font-bold text-white mb-3">Speak to a Visa Strategist</h3>
  <p class="text-[#adb8c4] mb-6 max-w-md mx-auto font-medium">Got a specific question about your application? Our strategists are available on WhatsApp to give you a direct, honest answer.</p>
  <a href="https://wa.me/447511219482" onclick="gtag('event','whatsapp_click',{'page_location':window.location.href,'page_title':document.title,'button_location':'article_cta'})" target="_blank" rel="noopener noreferrer" class="btn-gold px-8 py-3.5 rounded-full text-sm">WhatsApp a Strategist</a>
</div>
```

**`calculator`** (gold card):
```html
<div class="cta-card gold">
  <i class="fa-solid fa-clipboard-list text-3xl text-gold mb-3 block"></i>
  <h3 class="text-2xl md:text-3xl font-bold text-white mb-3">Check Your Application Readiness</h3>
  <p class="text-[#adb8c4] mb-6 max-w-md mx-auto font-medium">Our free Schengen Visa Readiness Calculator assesses your financial profile, travel history, and documentation against embassy requirements.</p>
  <a href="../calculator.html" class="btn-gold px-8 py-3.5 rounded-full text-sm">Run Free Check</a>
</div>
```

### Security rules for generated files
- All Firestore string fields except `bodyHtml` must be HTML-escaped before inserting into HTML attributes or text nodes
- `bodyHtml` is trusted output from our DOMPurify pipeline — insert it directly as innerHTML content
- `rel="noopener noreferrer"` on every `target="_blank"` link
- The generated file must pass an isSafeHttpUrl check on `heroImage` before using it in background-image or OG tags; if the URL fails the check, omit that attribute rather than inserting a potentially unsafe value

---

## Step 3 — Update `sitemap.xml`

For each new post whose file was created in Step 2, add an entry inside the blog posts section:

```xml
  <url>
    <loc>https://www.globalvisajourneys.com/blog/{slug}.html</loc>
    <lastmod>{publishedAt in YYYY-MM-DD}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
```

Before adding, grep `sitemap.xml` for `{slug}.html` to confirm the entry doesn't already exist.

---

## Step 4 — Mark each synced post as live in Firestore

For each post that was successfully processed (file created or already existed):

```
node scripts/sync-blog.js --mark-live {id}
```

Run this only after the static file exists locally (not necessarily deployed — the deployment happens when the user git-pushes).

---

## Step 5 — Report to the user

Show a summary table:

| Title | Slug | Result |
|---|---|---|
| Post title | post-slug | ✓ File created, marked live |
| Post title | post-slug | ⚠ File already existed, marked live |

Then remind them:

> **Deploy these files to make them visible on the site:**
> ```
> git add blog/{slug}.html sitemap.xml
> git commit -m "sync: publish N blog post(s)"
> git push
> ```
> The posts will appear in the blog listing as soon as GitHub Pages deploys (usually under 2 minutes).

---

## Notes

- The `live: true` flag in Firestore is what controls whether a post appears in the blog listing (blog/index.html queries for `live == true`). Setting it before git push means the listing card appears before the static file is deployed — a brief window where clicking the card gives a 404. For low-traffic sites this is acceptable; if timing is critical, git push first, then run `--mark-live`.
- `blog/post.html` is a legacy redirect stub — do not generate content into it.
- The sync script uses the Firebase REST API directly (no npm dependencies beyond Node.js built-ins).
