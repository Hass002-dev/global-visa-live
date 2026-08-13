/*!
 * GVJ Cookie Consent — UK PECR compliant
 * Blocks GA4 and Tawk.to until the visitor actively consents.
 * Stores choice in localStorage ('gvj_cookie_consent': 'all' | 'necessary').
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'gvj_cookie_consent';
    var GA_ID       = 'G-Q1EZM399KT';
    var TAWK_SRC    = 'https://embed.tawk.to/69ab4b7560e0031c3443b1b0/1jj2htghu';

    /* ── GA4 stub — defined immediately (synchronously) so inline gtag()
       event handlers in onclick attributes never throw, regardless of whether
       the visitor has consented.  When GA4 actually loads later it will
       replay all queued dataLayer commands. ──────────────────────────────── */
    window.dataLayer = window.dataLayer || [];
    if (!window.gtag) {
        window.gtag = function () { window.dataLayer.push(arguments); };
    }

    /* ── Script loaders ─────────────────────────────────────────────────── */
    function loadGA() {
        window.gtag('js', new Date());
        window.gtag('config', GA_ID);
        var s = document.createElement('script');
        s.async = true;
        s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
        document.head.appendChild(s);
    }

    function loadTawk() {
        if (window._gvjTawkLoaded) return;
        window._gvjTawkLoaded = true;
        window.Tawk_API = window.Tawk_API || {};
        window.Tawk_LoadStart = new Date();
        var s1 = document.createElement('script');
        var s0 = document.getElementsByTagName('script')[0];
        s1.async = true;
        s1.src = TAWK_SRC;
        s1.charset = 'UTF-8';
        s1.setAttribute('crossorigin', '*');
        s0.parentNode.insertBefore(s1, s0);
    }

    /* ── Consent actions ────────────────────────────────────────────────── */
    function acceptAll() {
        localStorage.setItem(STORAGE_KEY, 'all');
        hideBanner();
        loadGA();
        loadTawk();
    }

    function necessaryOnly() {
        localStorage.setItem(STORAGE_KEY, 'necessary');
        hideBanner();
    }

    function showBanner() {
        var el = document.getElementById('gvj-cookie-banner');
        if (el) el.style.display = '';
    }

    function hideBanner() {
        var el = document.getElementById('gvj-cookie-banner');
        if (el) el.style.display = 'none';
    }

    /* ── Resolve privacy policy href (handles /blog/ subdirectory) ──────── */
    function privacyHref() {
        return (window.location.pathname.indexOf('/blog/') !== -1)
            ? '../privacy-policy.html'
            : 'privacy-policy.html';
    }

    /* ── Banner CSS ─────────────────────────────────────────────────────── */
    var BANNER_CSS = [
        /* Outer wrapper — full-width anchor at bottom, pointer-events only on card */
        '#gvj-cookie-banner{',
            'position:fixed;bottom:0;left:0;right:0;z-index:9900;',
            'display:flex;justify-content:center;align-items:flex-end;',
            'pointer-events:none;',
        '}',
        /* Card */
        '#gvj-cookie-card{',
            'pointer-events:all;',
            'background:#0f1419;',
            'border:1px solid rgba(201,168,76,0.38);',
            'border-bottom:none;',
            'border-radius:14px 14px 0 0;',
            'box-shadow:0 -6px 40px rgba(0,0,0,0.6),0 0 0 1px rgba(201,168,76,0.06);',
            'padding:18px 20px 22px;',
            'width:100%;max-width:680px;',
            'display:flex;flex-direction:column;gap:14px;',
        '}',
        /* On screens >= 640 px, float the card above the bottom edge */
        '@media(min-width:640px){',
            '#gvj-cookie-banner{bottom:24px;padding:0 20px;}',
            '#gvj-cookie-card{',
                'border-bottom:1px solid rgba(201,168,76,0.38);',
                'border-radius:14px;',
            '}',
        '}',
        /* Typography */
        '#gvj-cookie-card p{margin:0;font-size:0.83rem;line-height:1.65;color:#adb8c4;}',
        '#gvj-cookie-card p a{color:#c9a84c;text-decoration:underline;}',
        '#gvj-cookie-card p a:hover{color:#e0c069;}',
        '#gvj-cookie-card strong{color:#eef2f7;}',
        /* Buttons row */
        '.gvj-cc-btns{display:flex;gap:10px;flex-wrap:wrap;}',
        '#gvj-accept-all{',
            'flex:1;min-width:130px;',
            'background:linear-gradient(135deg,#c9a84c 0%,#e0c069 100%);',
            'color:#080c10;font-weight:800;font-size:0.78rem;',
            'text-transform:uppercase;letter-spacing:0.07em;',
            'border:none;border-radius:8px;padding:10px 18px;',
            'cursor:pointer;transition:opacity .2s;',
        '}',
        '#gvj-accept-all:hover{opacity:0.88;}',
        '#gvj-necessary-only{',
            'flex:1;min-width:130px;',
            'background:transparent;',
            'border:1px solid rgba(201,168,76,0.4);',
            'color:#c9a84c;font-weight:700;font-size:0.78rem;',
            'text-transform:uppercase;letter-spacing:0.07em;',
            'border-radius:8px;padding:10px 18px;',
            'cursor:pointer;transition:border-color .2s,color .2s;',
        '}',
        '#gvj-necessary-only:hover{border-color:#c9a84c;color:#e0c069;}',
    ].join('');

    /* ── Inject banner into DOM ─────────────────────────────────────────── */
    function injectBanner() {
        if (document.getElementById('gvj-cookie-banner')) return;

        var style = document.createElement('style');
        style.textContent = BANNER_CSS;
        document.head.appendChild(style);

        var banner = document.createElement('div');
        banner.id = 'gvj-cookie-banner';
        banner.setAttribute('role', 'region');
        banner.setAttribute('aria-label', 'Cookie consent');
        banner.innerHTML =
            '<div id="gvj-cookie-card">' +
                '<p><strong>We use cookies</strong> to improve your experience and understand how our site is used. ' +
                'See our <a href="' + privacyHref() + '">Privacy Policy</a> for details.</p>' +
                '<div class="gvj-cc-btns">' +
                    '<button id="gvj-accept-all" type="button">Accept All</button>' +
                    '<button id="gvj-necessary-only" type="button">Necessary Only</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(banner);

        document.getElementById('gvj-accept-all').addEventListener('click', acceptAll);
        document.getElementById('gvj-necessary-only').addEventListener('click', necessaryOnly);
    }

    /* ── Wire "Cookie Settings" footer links ────────────────────────────── */
    function wireSettingsLinks() {
        document.querySelectorAll('.gvj-cookie-settings').forEach(function (el) {
            el.addEventListener('click', function (e) {
                e.preventDefault();
                localStorage.removeItem(STORAGE_KEY);
                injectBanner();
                showBanner();
            });
        });
    }

    /* ── Init ───────────────────────────────────────────────────────────── */
    function init() {
        var pref = localStorage.getItem(STORAGE_KEY);
        if (pref === 'all') {
            loadGA();
            loadTawk();
        } else if (pref !== 'necessary') {
            injectBanner();
        }
        wireSettingsLinks();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
