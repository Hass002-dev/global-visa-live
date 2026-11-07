'use strict';

/**
 * sanitize-blog-html.js
 *
 * Shared by create-post.js and sync-blog.js — both write or re-write
 * bodyHtml, so both must sanitise it the same way. This exact tag/attribute
 * list also lives in admin.html (GVJ_BLOG_SANITIZE_CONFIG) and in
 * workers/blog-intake/index.js (hand-written, no DOMPurify in a Worker).
 * Keep all four in sync if this list ever changes.
 *
 * Why sync-blog.js sanitises again even though create-post.js and the
 * Worker already do: it's the last step before untrusted-origin HTML
 * becomes a public static file, and it should never simply trust that
 * whatever wrote the Firestore document did its job correctly.
 */

const DOMPurify = require('isomorphic-dompurify');

const GVJ_BLOG_SANITIZE_CONFIG = {
    ALLOWED_TAGS: ['h1', 'h2', 'h3', 'h4', 'p', 'strong', 'b', 'em', 'i', 'a', 'ul', 'ol', 'li', 'blockquote', 'img', 'code', 'pre', 'hr', 'br'],
    ALLOWED_ATTR: ['href', 'src', 'alt'],
    ALLOWED_URI_REGEXP: /^(?:https?|mailto):/i,
};

function sanitizeBodyHtml(html) {
    return DOMPurify.sanitize(html || '', GVJ_BLOG_SANITIZE_CONFIG);
}

module.exports = { sanitizeBodyHtml, GVJ_BLOG_SANITIZE_CONFIG };
