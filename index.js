/* ============================================================
   FILE 3 OF 3: leads.js
   PROJECT: Syncly — SaaS Lead Generator Landing Page
   SECTIONS:
     1.  State & Config
     2.  Email Submission (hero + second CTA)
     3.  Email Validation
     4.  Announcement Bar Dismiss
     5.  FAQ Accordion
     6.  Mobile Menu Toggle
     7.  Navbar Scroll Behaviour
     8.  Scroll Progress Bar
     9.  Scroll Animations (IntersectionObserver)
    10.  Active Nav Link Highlighting
    11.  Waitlist Counter Animation
    12.  Toast Notification
    13.  Keyboard Accessibility
    14.  Initialisation (DOMContentLoaded)
   ============================================================ */


/* ── 1. STATE & CONFIG ────────────────────────────────────────
   Central place to store app state and configurable values.
   ──────────────────────────────────────────────────────────── */

var CONFIG = {
  /* Starting waitlist count displayed in the hero */
  waitlistStart: 12483,

  /* How fast the counter ticks up on load (ms between increments) */
  counterTickMs: 18,

  /* Announcement bar spots remaining */
  spotsRemaining: 342,

  /* How long toast messages stay visible (ms) */
  toastDuration: 3500,

  /* Replace this URL with your real email API endpoint
     e.g. Mailchimp, ConvertKit, Loops, Resend, etc.       */
  apiEndpoint: null   /* null = simulate success for demo */
};

/* Tracks which emails have already been submitted this session */
var submittedEmails = new Set();

/* Tracks which FAQ items are currently open */
var openFaqIndex = null;


/* ── 2. EMAIL SUBMISSION ──────────────────────────────────────
   Handles both the hero form and the second-CTA form.
   formId: 'hero' | 'second'

   Flow:
     1. Validate email format
     2. Check for duplicate submissions
     3. Show loading state
     4. POST to API (or simulate success)
     5. Show success state + update waitlist counter
   ──────────────────────────────────────────────────────────── */

/**
 * Called when either capture form is submitted.
 *
 * @param {Event}  event  — the form submit event
 * @param {string} formId — 'hero' or 'second'
 */
function submitEmail(event, formId) {
  event.preventDefault();

  var inputId   = formId === 'hero' ? 'heroEmail'   : 'secondEmail';
  var btnId     = formId === 'hero' ? 'heroSubmitBtn'  : 'secondSubmitBtn';
  var formElId  = formId === 'hero' ? 'heroForm'    : 'secondForm';
  var successId = formId === 'hero' ? 'heroSuccess'  : 'secondSuccess';
  var confirmId = formId === 'hero' ? 'heroEmailConfirm' : 'secondEmailConfirm';

  var inputEl   = document.getElementById(inputId);
  var btnEl     = document.getElementById(btnId);
  var formEl    = document.getElementById(formElId);
  var successEl = document.getElementById(successId);
  var confirmEl = document.getElementById(confirmId);

  if (!inputEl) return;

  var email = inputEl.value.trim();

  /* 1. Validate format */
  if (!isValidEmail(email)) {
    shakeField(inputEl);
    showToast('Please enter a valid work email address.');
    return;
  }

  /* 2. Check for duplicate */
  if (submittedEmails.has(email.toLowerCase())) {
    showToast("✓ You're already on the list! We'll be in touch.");
    return;
  }

  /* 3. Loading state */
  if (btnEl) {
    btnEl.classList.add('loading');
    btnEl.disabled = true;
  }

  /* 4. Submit to API or simulate */
  postEmail(email)
    .then(function () {
      /* 5. Success */
      submittedEmails.add(email.toLowerCase());

      /* Show success block */
      if (formEl)    formEl.style.display    = 'none';
      if (successEl) {
        successEl.style.display = 'flex';
      }
      if (confirmEl) confirmEl.textContent = email;

      /* Bump the waitlist counter */
      bumpWaitlistCount();

      /* Decrement spots remaining */
      decrementSpots();

      showToast("🎉 You're on the list! Check your inbox shortly.");

      /* Track in analytics if available */
      trackLead(email);
    })
    .catch(function (err) {
      console.error('Submission error:', err);
      showToast('Something went wrong. Please try again.');

      /* Reset button */
      if (btnEl) {
        btnEl.classList.remove('loading');
        btnEl.disabled = false;
      }
    });
}

/**
 * POSTs the email to CONFIG.apiEndpoint.
 * If apiEndpoint is null, simulates a 900ms network delay.
 *
 * @param  {string} email
 * @returns {Promise}
 */
function postEmail(email) {
  if (!CONFIG.apiEndpoint) {
    /* Simulate API call */
    return new Promise(function (resolve) {
      setTimeout(resolve, 900);
    });
  }

  return fetch(CONFIG.apiEndpoint, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email: email, source: 'landing_page' })
  }).then(function (res) {
    if (!res.ok) throw new Error('API error: ' + res.status);
    return res.json();
  });
}

/**
 * Fires a lightweight analytics event if window.gtag or
 * window.analytics exists. Safe to remove if not needed.
 *
 * @param {string} email
 */
function trackLead(email) {
  /* Google Analytics 4 */
  if (typeof window.gtag === 'function') {
    window.gtag('event', 'generate_lead', {
      event_category: 'engagement',
      event_label:    'waitlist_signup'
    });
  }

  /* Segment */
  if (typeof window.analytics !== 'undefined') {
    window.analytics.identify({ email: email });
    window.analytics.track('Waitlist Signup', { email: email });
  }
}


/* ── 3. EMAIL VALIDATION ──────────────────────────────────────
   Simple regex check. Deliberately not too strict —
   real validation happens server-side.
   ──────────────────────────────────────────────────────────── */

/**
 * Returns true if the string looks like a valid email.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/**
 * Applies a brief shake animation to an input to signal invalid input.
 * @param {HTMLElement} el
 */
function shakeField(el) {
  if (!el) return;
  el.style.animation = 'shake 0.35s ease';
  el.style.borderColor = 'rgba(239,68,68,0.6)';
  setTimeout(function () {
    el.style.animation   = '';
    el.style.borderColor = '';
  }, 700);
}


/* ── 4. ANNOUNCEMENT BAR DISMISS ─────────────────────────────
   Hides the bar and saves preference to sessionStorage
   so it stays hidden on refresh.
   ──────────────────────────────────────────────────────────── */

function dismissAnn() {
  var bar = document.getElementById('annBar');
  if (bar) {
    bar.classList.add('dismissed');
    sessionStorage.setItem('syncly_ann_dismissed', '1');
  }
}

/** Checks sessionStorage on load and hides bar if previously dismissed. */
function initAnnBar() {
  if (sessionStorage.getItem('syncly_ann_dismissed')) {
    var bar = document.getElementById('annBar');
    if (bar) bar.style.display = 'none';
  }
}


/* ── 5. FAQ ACCORDION ─────────────────────────────────────────
   One item open at a time. Clicking an open item closes it.
   ──────────────────────────────────────────────────────────── */

/**
 * Toggles the FAQ item at the given index.
 * @param {number} index
 */
function toggleFaq(index) {
  var items = document.querySelectorAll('.faq-item');

  items.forEach(function (item, i) {
    if (i === index) {
      var isOpen = item.classList.contains('open');
      item.classList.toggle('open', !isOpen);
    } else {
      item.classList.remove('open');
    }
  });

  openFaqIndex = (openFaqIndex === index) ? null : index;
}


/* ── 6. MOBILE MENU TOGGLE ────────────────────────────────────
   Opens / closes the fullscreen mobile nav overlay.
   ──────────────────────────────────────────────────────────── */

function toggleMobileMenu() {
  var menu      = document.getElementById('mobileMenu');
  var hamburger = document.getElementById('hamburger');

  if (!menu) return;

  var isOpen = menu.classList.toggle('open');
  if (hamburger) hamburger.classList.toggle('active', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
}


/* ── 7. NAVBAR SCROLL BEHAVIOUR ───────────────────────────────
   Adds a shadow class when the page scrolls down.
   ──────────────────────────────────────────────────────────── */

function initNavbarScroll() {
  var navbar = document.getElementById('navbar');
  if (!navbar) return;

  window.addEventListener('scroll', function () {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  }, { passive: true });
}


/* ── 8. SCROLL PROGRESS BAR ───────────────────────────────────
   Fills a thin bar at the top of the viewport as the user scrolls.
   Communicates reading progress without being intrusive.
   ──────────────────────────────────────────────────────────── */

function initScrollProgress() {
  var bar = document.getElementById('scrollProgress');
  if (!bar) return;

  window.addEventListener('scroll', function () {
    var scrollTop  = window.scrollY;
    var docHeight  = document.documentElement.scrollHeight - window.innerHeight;
    var pct        = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = Math.min(pct, 100) + '%';
  }, { passive: true });
}


/* ── 9. SCROLL ANIMATIONS ─────────────────────────────────────
   Uses IntersectionObserver to trigger .fade-up CSS transitions
   as elements enter the viewport.
   ──────────────────────────────────────────────────────────── */

var fadeObserver = new IntersectionObserver(function (entries) {
  entries.forEach(function (entry) {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      fadeObserver.unobserve(entry.target); /* animate once */
    }
  });
}, {
  threshold:  0.1,
  rootMargin: '0px 0px -24px 0px'
});

function initScrollAnimations() {
  document.querySelectorAll('.fade-up').forEach(function (el) {
    fadeObserver.observe(el);
  });
}


/* ── 10. ACTIVE NAV LINK HIGHLIGHTING ────────────────────────
   Watches each section with an id and adds .active to the
   matching nav link as the user scrolls.
   ──────────────────────────────────────────────────────────── */

function initActiveNav() {
  var sections = document.querySelectorAll('section[id]');
  var navLinks = document.querySelectorAll('.nav-link');

  if (!sections.length || !navLinks.length) return;

  var navObserver = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        var id = entry.target.id;
        navLinks.forEach(function (link) {
          link.classList.toggle(
            'active',
            link.getAttribute('href') === '#' + id
          );
        });
      }
    });
  }, { threshold: 0.4 });

  sections.forEach(function (sec) { navObserver.observe(sec); });
}


/* ── 11. WAITLIST COUNTER ANIMATION ──────────────────────────
   Animates the hero waitlist count from 0 up to the
   CONFIG.waitlistStart value on page load.
   Also exposed as bumpWaitlistCount() to increment on signup.
   ──────────────────────────────────────────────────────────── */

var currentCount = 0;

/**
 * Counts up to the target number and writes it to #waitlistCount.
 * @param {number} target
 * @param {number} duration — total animation duration in ms
 */
function animateCounter(target, duration) {
  var el = document.getElementById('waitlistCount');
  if (!el) return;

  var start    = 0;
  var steps    = duration / CONFIG.counterTickMs;
  var inc      = target / steps;
  var current  = start;

  var timer = setInterval(function () {
    current += inc;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    el.textContent = Math.floor(current).toLocaleString();
  }, CONFIG.counterTickMs);

  currentCount = target;
}

/**
 * Increments the displayed waitlist count by 1 after a new signup.
 */
function bumpWaitlistCount() {
  currentCount += 1;
  var el = document.getElementById('waitlistCount');
  if (el) {
    el.textContent = currentCount.toLocaleString();

    /* Brief highlight */
    el.style.color      = 'var(--indigo)';
    el.style.transition = 'color 0.3s';
    setTimeout(function () { el.style.color = ''; }, 1000);
  }
}

/**
 * Decrements the announcement bar spots remaining.
 */
function decrementSpots() {
  CONFIG.spotsRemaining = Math.max(0, CONFIG.spotsRemaining - 1);
  var el = document.getElementById('annSpots');
  if (el && CONFIG.spotsRemaining > 0) {
    el.textContent = CONFIG.spotsRemaining + ' spots left.';
  } else if (el) {
    el.textContent = 'All spots claimed!';
    el.style.background = 'rgba(239,68,68,0.3)';
  }
}


/* ── 12. TOAST NOTIFICATION ───────────────────────────────────
   Single reusable bottom-screen toast.
   ──────────────────────────────────────────────────────────── */

var _toastTimer = null;

/**
 * Shows a temporary toast message.
 * @param {string} message
 * @param {number} [duration] — override CONFIG.toastDuration
 */
function showToast(message, duration) {
  duration = duration || CONFIG.toastDuration;
  var toast = document.getElementById('toast');
  if (!toast) return;

  if (_toastTimer) clearTimeout(_toastTimer);

  toast.textContent = message;
  toast.classList.add('show');

  _toastTimer = setTimeout(function () {
    toast.classList.remove('show');
  }, duration);
}


/* ── 13. KEYBOARD ACCESSIBILITY ──────────────────────────────
   Global keyboard listeners for common interactions.
   ──────────────────────────────────────────────────────────── */

document.addEventListener('keydown', function (e) {
  /* Escape — close mobile menu */
  if (e.key === 'Escape') {
    var menu = document.getElementById('mobileMenu');
    if (menu && menu.classList.contains('open')) {
      toggleMobileMenu();
    }
  }
});

/* Close mobile menu when clicking outside it */
document.addEventListener('click', function (e) {
  var menu      = document.getElementById('mobileMenu');
  var hamburger = document.getElementById('hamburger');
  if (
    menu &&
    menu.classList.contains('open') &&
    !menu.contains(e.target) &&
    hamburger &&
    !hamburger.contains(e.target)
  ) {
    toggleMobileMenu();
  }
});


/* ── 14. INITIALISATION ───────────────────────────────────────
   Runs once the DOM is fully loaded.
   Calls every init function in the correct order.
   ──────────────────────────────────────────────────────────── */

document.addEventListener('DOMContentLoaded', function () {

  /* Restore dismissed announcement bar */
  initAnnBar();

  /* Scroll behaviours */
  initNavbarScroll();
  initScrollProgress();
  initScrollAnimations();
  initActiveNav();

  /* Animate waitlist counter on load */
  animateCounter(CONFIG.waitlistStart, 1800);

  /* Log useful info to the console */
  console.log([
    '⬡ Syncly Lead Generator — leads.js loaded',
    '─────────────────────────────────────────',
    '',
    'CONFIGURATION (edit CONFIG object at top of file):',
    '  apiEndpoint    : ' + (CONFIG.apiEndpoint || 'null (simulated)'),
    '  waitlistStart  : ' + CONFIG.waitlistStart,
    '  spotsRemaining : ' + CONFIG.spotsRemaining,
    '',
    'TO CONNECT YOUR EMAIL SERVICE:',
    '  1. Set CONFIG.apiEndpoint to your API URL',
    '     e.g. "https://api.loops.so/v1/contacts/create"',
    '  2. Update the postEmail() function headers',
    '     to include your API key',
    '  3. Map the response to your service\'s format',
    '',
    'POPULAR INTEGRATIONS:',
    '  Mailchimp  → https://mailchimp.com/developer/marketing/api/list-members/',
    '  ConvertKit → https://developers.convertkit.com/#create-a-subscriber',
    '  Loops      → https://loops.so/docs/api-reference/create-contact',
    '  Resend     → https://resend.com/docs/api-reference/contacts/create-contact',
  ].join('\n'));

});