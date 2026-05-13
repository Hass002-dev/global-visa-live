# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Watch mode — recompiles output.css on every HTML save
npm run dev

# Production build — minifies output.css
npm run build
```

There is no test runner configured. `output.css` is committed to the repo and must be rebuilt whenever Tailwind classes change.

## Architecture

This is a **static HTML website** with no framework. Every page is a self-contained `.html` file with inline `<style>` and `<script>` blocks. There is no JS bundler or module system.

### CSS approach

Tailwind 3 is compiled from `input.css` → `output.css` via `tailwind.config.js`. All pages link to `./output.css` (or `../output.css` from inside `blog/`). Tailwind utility classes are used alongside a set of hand-written component classes (`.btn-gold`, `.gvj-card`, `.fade-in-up`, etc.).

**Design tokens are duplicated in the `<style>` block of every page** — there is no shared CSS file. When changing a token value (e.g. `--brand-gold`), update it in every HTML file's `:root` block.

### Standard design tokens (used on all main pages)

```css
--bg-primary: #080c10   /* near-black page background */
--bg-card:    #131920   /* card surfaces */
--brand-gold: #c9a84c   /* primary brand colour */
--text-primary: #eef2f7
--text-secondary: #7a8899
```

`gambia.html` uses an older token set and different fonts (Inter / Playfair Display instead of DM Sans / Cormorant Garamond) — it is not aligned with the main design system.

### Typography

- **Display / headings:** Cormorant Garamond (serif)
- **Body / UI:** DM Sans (sans-serif), `font-weight: 450` as the base

### Pages

| File | Purpose | Indexed |
|------|---------|---------|
| `index.html` | Main marketing homepage | Yes |
| `about.html` | About the consultancy | Yes |
| `calculator.html` | Schengen visa financial readiness checker (vanilla JS) | Yes |
| `blog/index.html` | Blog listing | Yes |
| `blog/post.html` | Blog post reader | Yes |
| `portal.html` | Secure client portal (noindex) | No |
| `admin.html` | Blog post authoring tool using marked.js + DOMPurify (noindex) | No |
| `404.html` | Custom 404 page | — |
| `gambia.html` | Older country landing page (different design system) | Yes |

### Blog authoring flow

`admin.html` is the write interface. It uses `marked.js` to convert Markdown to HTML and `DOMPurify` to sanitise it. Content is intended to be pasted into `blog/post.html`.

### Deployment

The site deploys to GitHub Pages. The `CNAME` file sets the custom domain. GA4 property ID is `G-Q1EZM399KT` (present in every page's `<head>`).
