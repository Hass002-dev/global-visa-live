// Shared vanilla JS for every /schengen-visa-uk/<country>/ page.
// Relies on JS for tab switching and the checklist/availability actions,
// the same way the rest of the GVJ site relies on JS for its FAQ
// accordions and quizzes — UK mobile coverage makes a no-JS fallback
// an unnecessary constraint here.
(function () {
    'use strict';

    function fireWhatsAppClick(buttonLocation) {
        // Matches the gtag('event','whatsapp_click', {...}) shape already
        // used sitewide (work.html, refusal.html) so this page's clicks
        // land in the same GA4 report as every other WhatsApp CTA.
        if (typeof window.gtag === 'function') {
            window.gtag('event', 'whatsapp_click', {
                page_location: window.location.href,
                page_title: document.title,
                button_location: buttonLocation,
            });
        }
    }

    function setUpWhatsAppTracking() {
        var links = document.querySelectorAll('a[href^="https://wa.me/"][data-ga-location]');
        links.forEach(function (link) {
            link.addEventListener('click', function () {
                fireWhatsAppClick(link.dataset.gaLocation);
            });
        });
    }

    function setUpTabs() {
        var buttons = document.querySelectorAll('.schengen-tab-button');
        buttons.forEach(function (button) {
            button.addEventListener('click', function () {
                var targetKey = button.dataset.tab;
                buttons.forEach(function (b) {
                    b.setAttribute('aria-selected', String(b === button));
                });
                document.querySelectorAll('.schengen-tab-panel').forEach(function (panel) {
                    panel.hidden = panel.dataset.tab !== targetKey;
                });
            });
        });
    }

    function activeChecklistItems() {
        var activePanel = document.querySelector('.schengen-tab-panel:not([hidden])');
        if (!activePanel) return { have: [], missing: [] };
        var have = [];
        var missing = [];
        activePanel.querySelectorAll('.schengen-checklist-item').forEach(function (box) {
            (box.checked ? have : missing).push(box.dataset.label);
        });
        return { have: have, missing: missing };
    }

    function setUpChecklistSender() {
        var sendButton = document.getElementById('schengen-send-checklist');
        var sentNotice = document.getElementById('schengen-checklist-sent');
        if (!sendButton) return;
        var countryName = document.querySelector('.schengen-hero h1').textContent.split(' ')[0];
        sendButton.addEventListener('click', function () {
            var items = activeChecklistItems();
            var lines = [
                'Hi, here is my ' + countryName + ' Schengen checklist.',
                'I have: ' + (items.have.length ? items.have.join('; ') : 'nothing ticked yet'),
                'Still missing: ' + (items.missing.length ? items.missing.join('; ') : 'nothing'),
            ];
            var url = 'https://wa.me/447511219482?text=' + encodeURIComponent(lines.join('\n'));
            fireWhatsAppClick('send_checklist_cta');
            window.open(url, '_blank', 'noopener');
            // WhatsApp opens in a new tab, so this page needs its own quick
            // confirmation or a visitor can't tell the click did anything.
            if (sentNotice) {
                sentNotice.hidden = false;
                setTimeout(function () { sentNotice.hidden = true; }, 4000);
            }
        });
    }

    // Matches the fade-in-up + IntersectionObserver pattern already used
    // on work.html/refusal.html, so this page reveals content the same
    // way the rest of the site does.
    function setUpScrollReveal() {
        var sections = document.querySelectorAll('.schengen-section');
        var observer = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) entry.target.classList.add('schengen-visible');
            });
        }, { threshold: 0.08 });
        sections.forEach(function (section) { observer.observe(section); });
    }

    setUpWhatsAppTracking();
    setUpTabs();
    setUpChecklistSender();
    setUpScrollReveal();
})();
