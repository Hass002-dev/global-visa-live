---
name: security-review
description: Use this skill whenever the user asks for a security review, security audit, vulnerability check, "check for security issues," or similar requests on a website or codebase. Also trigger this proactively before any major feature launch, and periodically (e.g., "let's do our quarterly security check"). Covers static code analysis for XSS/injection risks, link security, URL validation, database security rules, CDN/dependency integrity, data privacy logging issues, and general debugging (broken links, accessibility, mixed content). Do NOT use this for fixing a specific known bug — use it for a broad, systematic review.
---

# Security & Debugging Review Skill

This skill defines a systematic, static-analysis security and debugging review. It reflects real findings from actual audits performed on this codebase, and should be used consistently every time a security review is requested.

## Ground Rules — read first, every time

1. **Static analysis only. No live exploitation.** Never attempt to actually exploit anything against the live, production site. This is a code review exercise, not a penetration test.
2. **If any live testing is genuinely needed** (e.g., testing a form's actual submission), use only obviously-fake test data, and clearly tell the user what was tested so they can clean up any test entries afterward (e.g., in a connected Google Sheet or database).
3. **Report first. Do not auto-fix.** Produce a full written report, prioritized by severity, before making any code changes. The user reviews and decides what to prioritize before anything is touched.
4. **Be honest about search completeness.** If the scan method has limits (e.g., a capped code search), say so explicitly, and note that findings reflect what was actually inspected, not a guaranteed-complete sweep.
5. **Distinguish confirmed findings from theoretical ones.** If something "could" be a risk depending on unverified conditions (e.g., "if Firestore rules are too permissive"), say so — don't present a hedge as a confirmed vulnerability.

## Part 1 — Security Checklist

### 1.1 Exposed secrets and sensitive data
- Search for hardcoded API keys, webhook URLs, credentials that shouldn't be publicly visible in client-side code
- Check for accidentally-committed `.env`, `.git`, config, or backup files in the deployed web root
- Note: a public client-side Firebase API key is normal, expected practice — security comes from Firestore/Storage rules and Auth, not from hiding this key. Do not flag this as a vulnerability on its own.

### 1.2 Open redirects
- Check any code that reads a URL parameter and uses it to redirect (`window.location.replace()`, `window.location.href =`, etc.)
- Confirm redirects only fire for values matched against a known whitelist/map — never redirect using a raw, unvalidated parameter value
- This is a CRITICAL-severity finding if found unguarded — it enables phishing using the site's own trusted domain

### 1.3 XSS and unsafe DOM insertion
- Search for `innerHTML`, `insertAdjacentHTML`, `document.write`, and template-string HTML construction
- For every instance built from dynamic data (Firestore, user input, URL params): confirm the data is properly escaped or the DOM is built via safe APIs (`createElement`, `textContent`) rather than string concatenation
- Check that any existing escape function (e.g., `escHtml()`) is used *consistently* on every dynamic field, not just some
- For any URL used in an `href` or `style="background-image"`: validate it before use with something like:
```js
  function isSafeHttpUrl(url) {
    try {
      const u = new URL(url, location.origin);
      return (u.protocol === 'http:' || u.protocol === 'https:');
    } catch (e) {
      return false;
    }
  }
```
  Where a URL fails this check, render a fallback (placeholder text), never the raw value.

### 1.4 Sanitizer fail-safe direction
- If a sanitizer library (e.g., DOMPurify) is used before rendering untrusted HTML, confirm the failure mode is fail-*closed*: if the sanitizer fails to load, the content should NOT render (show an error/unavailable message), not fall through to rendering unsanitized HTML.

### 1.5 Link security — `rel="noopener noreferrer"`
- Search every `target="_blank"` anchor tag (hardcoded and programmatically generated) for a matching `rel="noopener noreferrer"` (or at minimum `rel="noopener"`)
- Missing this enables reverse tabnabbing — the opened page can access `window.opener` and redirect the original tab
- This applies uniformly across the whole site; check hardcoded HTML, JS-generated links, and any CMS/dynamic content

### 1.6 Database/backend security rules
- Request and review the current Firestore (or equivalent) security rules directly — do not assume they are correct
- Confirm: writes to sensitive collections require authentication
- Confirm: admin-level write access requires a specific check (custom claim, email allowlist) — not just "any authenticated user"
- Report findings plainly; do not modify rules without explicit approval

### 1.7 CDN and dependency integrity
- List every external script/stylesheet loaded from a CDN
- Flag any missing Subresource Integrity (SRI) hashes, prioritizing security-sensitive libraries (sanitizers, markdown parsers) over purely cosmetic ones (fonts, icons)
- Flag any dependency loaded without a pinned version (e.g., `@latest` instead of a specific version number) — this means the site silently runs whatever the maintainer ships next, with no review

### 1.8 Data privacy — console logging
- Search for `console.log()` statements that output personal data: email addresses, user IDs, uploaded file names, file paths
- This is a genuine privacy concern on any page handling client documents or personal information — remove or guard these, since shared/public devices make this a real exposure risk, not just a code-cleanliness issue

### 1.9 Webhook/endpoint spam protection
- For any public-facing form submitting to a webhook (e.g., Google Apps Script, serverless function): confirm a honeypot field or equivalent basic spam protection exists
- A hidden field real users never fill in, checked server-side, is sufficient:
```html
  <input type="text" name="website" style="display:none" tabindex="-1" autocomplete="off">
```

## Part 2 — General Debugging Checklist

- **Mixed content:** confirm every resource loads over `https://`, no `http://` network requests
- **Broken internal links:** verify every internal link target actually exists as a real file
- **Null-reference fragility:** flag `getElementById().addEventListener()` chains without a null check — a single renamed/removed element shouldn't crash unrelated scripts on the page. Suggest optional chaining (`?.`) for resilience.
- **Accessibility basics:**
  - Every `<img>` has meaningful `alt` text
  - Icon-only buttons/links (e.g., a floating chat button) have `aria-label`
  - Dynamically-generated form inputs have properly associated `<label for="...">` / matching `id`
  - Text/background color contrast passes WCAG AA (4.5:1 minimum)

## Part 3 — Deliverable Format

Produce a written report, organized by severity:
- 🔴 **Critical** — needs fixing immediately (e.g., open redirect, exposed credentials)
- 🟡 **Moderate** — should be fixed soon, not urgent (e.g., missing SRI, unescaped edge case)
- 🟢 **Minor** — worth knowing, low priority (e.g., accessibility labels, dead code cleanup)
- ⚪ **Info** — no action needed, just documented (e.g., confirming the public Firebase key is expected behavior)

For each finding:
- What the issue is, in plain language
- Which file(s) and approximate line(s)
- Why it matters (real-world impact, not just "this is a known pattern")
- A suggested, specific fix

Close the report with a **"What's working well"** section — confirm what was checked and found genuinely fine (e.g., no mixed content, no broken links). This is as important as the findings list: it tells the user what does NOT need attention, and demonstrates the review was systematic, not just problem-hunting.

## Part 4 — After the report

Do not implement any fixes until the user reviews and prioritizes. When the user does ask for fixes:
- Address items in the priority order from the report (Critical → Moderate → Minor)
- Fix items in separate, clearly-scoped passes rather than one giant undifferentiated change
- Re-confirm any existing automated tests (e.g., a self-verifying calculator function) still pass after changes, since security fixes can touch shared code paths
- Show a summary of every file changed, matched back to the specific finding it addresses
