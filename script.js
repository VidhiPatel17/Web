/* =========================================================================
   Vidhi & Jay — Heritage Scroll
   Progressive enhancement only: with scripting off the page still reads as a
   complete invitation (the scroll is simply already unrolled).
   ========================================================================= */
(function () {
  'use strict';

  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)');
  var FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)');
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  /* ------------------------------------------------------------- topbar */
  var topbar = document.getElementById('topbar');
  var nav = document.getElementById('siteNav');
  var burger = document.getElementById('burger');

  function onStuck() {
    if (!topbar) return;
    topbar.classList.toggle('is-stuck', window.scrollY > window.innerHeight * 0.55);
  }

  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!open));
      burger.setAttribute('aria-label', open ? 'Open menu' : 'Close menu');
      nav.classList.toggle('is-open', !open);
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        burger.setAttribute('aria-expanded', 'false');
        burger.setAttribute('aria-label', 'Open menu');
        nav.classList.remove('is-open');
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && nav.classList.contains('is-open')) {
        burger.setAttribute('aria-expanded', 'false');
        burger.setAttribute('aria-label', 'Open menu');
        nav.classList.remove('is-open');
        burger.focus();
      }
    });
  }

  /* ------------------------------------------------------------- reveals
     Deterministic rather than IntersectionObserver-driven: an element is
     revealed once its box enters the viewport. Content must never be able to
     stay invisible if an observer callback is dropped. */
  var revealables = Array.prototype.slice.call(document.querySelectorAll('.reveal'));
  var pending = revealables.slice();

  function sweepReveal() {
    if (!pending.length) return;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    var keep = [];
    for (var i = 0; i < pending.length; i++) {
      var el = pending[i];
      var r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > -vh * 0.1) {
        el.classList.add('is-in');
      } else {
        keep.push(el);
      }
    }
    pending = keep;
  }

  /* -------------------------------------------------------- active links */
  var navLinks = nav ? Array.prototype.slice.call(nav.querySelectorAll('a')) : [];
  var sections = navLinks.map(function (a) {
    return document.getElementById(a.getAttribute('href').slice(1));
  }).filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var seen = new Map();
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { seen.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0); });
      var best = null, bestRatio = 0;
      seen.forEach(function (ratio, id) { if (ratio > bestRatio) { bestRatio = ratio; best = id; } });
      navLinks.forEach(function (a) {
        var on = best && a.getAttribute('href') === '#' + best;
        if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
      });
    }, { threshold: [0.12, 0.3, 0.55], rootMargin: '-20% 0px -30% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------------------------------------------------------- countdown */
  var target = new Date('2027-01-29T11:00:00+05:30').getTime();
  var cd = {
    d: document.getElementById('cd-d'),
    h: document.getElementById('cd-h'),
    m: document.getElementById('cd-m'),
    s: document.getElementById('cd-s')
  };
  var grid = document.getElementById('countGrid');
  var done = document.getElementById('countDone');

  function tick() {
    if (!cd.d) return;
    var diff = target - Date.now();
    if (diff <= 0) {
      if (grid) grid.hidden = true;
      if (done) done.hidden = false;
      clearInterval(timer);
      return;
    }
    var secs = Math.floor(diff / 1000);
    var parts = {
      d: Math.floor(secs / 86400),
      h: Math.floor((secs % 86400) / 3600),
      m: Math.floor((secs % 3600) / 60),
      s: secs % 60
    };
    cd.d.textContent = String(parts.d);
    cd.h.textContent = ('0' + parts.h).slice(-2);
    cd.m.textContent = ('0' + parts.m).slice(-2);
    cd.s.textContent = ('0' + parts.s).slice(-2);
  }
  tick();
  var timer = setInterval(tick, 1000);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) tick(); });

  /* --------------------------------------------------- invitation unroll */
  var invite = document.getElementById('invitation');
  var scrollCard = document.getElementById('scrollCard');
  var scrollPaper = document.getElementById('scrollPaper');
  var unrollBtn = document.getElementById('unrollBtn');
  var unrollHint = document.getElementById('unrollHint');
  var desktopMq = window.matchMedia('(min-width: 861px)');

  var p = 1;

  function measurePaper() {
    if (!scrollCard || !scrollPaper) return;
    scrollCard.style.setProperty('--paper-h', scrollPaper.offsetHeight + 'px');
  }

  function setP(value) {
    p = clamp(value, 0, 1);
    if (scrollCard) scrollCard.style.setProperty('--p', p.toFixed(4));
    if (unrollBtn) {
      var finished = p > 0.985;
      unrollBtn.hidden = finished;
    }
    if (unrollHint) {
      unrollHint.textContent = p > 0.985 ? 'Unrolled — keep reading' : 'Scroll to unroll the invitation';
    }
  }

  function scrollProgress() {
    if (!invite) return 1;
    var total = invite.offsetHeight - window.innerHeight;
    if (total <= 0) return 1;
    var passed = -invite.getBoundingClientRect().top;
    return clamp(passed / total, 0, 1);
  }

  var mobileOpening = false;
  var mobileOpened = false;

  function animateOpen() {
    if (mobileOpening) return;
    mobileOpening = true;
    var start = p;
    var t0 = performance.now();
    function step(t) {
      var k = Math.min(1, (t - t0) / 1300);
      setP(start + (1 - start) * (1 - Math.pow(1 - k, 3)));
      if (k < 1) window.requestAnimationFrame(step);
      else mobileOpening = false;
    }
    window.requestAnimationFrame(step);
  }

  function updateUnroll() {
    if (REDUCED.matches) { setP(1); return; }
    if (!desktopMq.matches) {
      if (!mobileOpened && scrollCard) {
        var r = scrollCard.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.9) { mobileOpened = true; animateOpen(); }
      }
      return;
    }
    setP(clamp(scrollProgress() / 0.82, 0, 1));
  }

  if (scrollCard && scrollPaper) {
    measurePaper();
    window.addEventListener('resize', measurePaper);
    if ('ResizeObserver' in window) {
      new ResizeObserver(measurePaper).observe(scrollPaper);
    }
    if (!desktopMq.matches && !REDUCED.matches) setP(0);
    updateUnroll();

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(function () { updateUnroll(); ticking = false; });
    }, { passive: true });

    if (unrollBtn) {
      unrollBtn.addEventListener('click', function () {
        if (!desktopMq.matches) { mobileOpened = true; animateOpen(); return; }
        if (!invite) return;
        var total = invite.offsetHeight - window.innerHeight;
        var top = invite.offsetTop + Math.max(0, total) * 0.82;
        window.scrollTo({ top: top, behavior: REDUCED.matches ? 'auto' : 'smooth' });
      });
    }
  }

  /* ------------------------------------------------------ ribbon progress */
  var ribbonGlow = document.getElementById('ribbonGlow');
  var journey = document.getElementById('journey');
  if (ribbonGlow && journey) {
    var glowTick = function () {
      var r = journey.getBoundingClientRect();
      var span = r.height + window.innerHeight * 0.6;
      var seenPct = clamp((window.innerHeight * 0.8 - r.top) / span, 0.08, 1);
      ribbonGlow.style.height = (seenPct * 100).toFixed(1) + '%';
    };
    glowTick();
    window.addEventListener('scroll', glowTick, { passive: true });
    window.addEventListener('resize', glowTick);
  }

  /* ------------------------------------------- gallery rail (endless loop)
     Three identical sets are laid side by side and the strip is parked on the
     middle one. Whenever it comes to rest near either end it is nudged by
     exactly one set-width, so the picture under the finger never changes and
     the loop is invisible. Clones are hidden from assistive tech and from the
     tab order, so there are still only twelve real photographs. */
  var rail = document.getElementById('polaroids');
  if (rail) {
    var originals = Array.prototype.slice.call(rail.children);
    var setSize = originals.length;
    var railBtns = Array.prototype.slice.call(document.querySelectorAll('[data-gal]'));

    function makeSet() {
      return originals.map(function (card) {
        var copy = card.cloneNode(true);
        copy.setAttribute('data-clone', '1');
        copy.setAttribute('aria-hidden', 'true');
        copy.tabIndex = -1;
        return copy;
      });
    }

    if (setSize > 3) {
      makeSet().forEach(function (c) { rail.insertBefore(c, rail.firstChild); });
      makeSet().forEach(function (c) { rail.appendChild(c); });
    }

    var nodes = Array.prototype.slice.call(rail.children);
    var setWidth = 0;

    function measure() {
      if (nodes.length > setSize) {
        setWidth = nodes[setSize].offsetLeft - nodes[0].offsetLeft;
      }
      if (!setWidth) setWidth = 0;
    }

    function park() {
      measure();
      if (setWidth > 0) rail.scrollLeft = setWidth;
    }

    var settle = null;
    function recentre() {
      if (setWidth <= 0) return;
      var x = rail.scrollLeft;
      if (x < setWidth * 0.75) rail.scrollLeft = x + setWidth;
      else if (x > setWidth * 1.75) rail.scrollLeft = x - setWidth;
    }

    rail.addEventListener('scroll', function () {
      if (settle) window.clearTimeout(settle);
      settle = window.setTimeout(recentre, 140);
    }, { passive: true });

    var step = function () { return Math.max(180, rail.clientWidth * 0.8); };

    railBtns.forEach(function (btn) {
      btn.disabled = false;
      btn.addEventListener('click', function () {
        var dir = btn.getAttribute('data-gal') === 'next' ? 1 : -1;
        rail.scrollBy({ left: dir * step(), behavior: REDUCED.matches ? 'auto' : 'smooth' });
      });
    });

    rail.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      rail.scrollBy({
        left: (e.key === 'ArrowRight' ? 1 : -1) * step(),
        behavior: REDUCED.matches ? 'auto' : 'smooth'
      });
    });

    // start on the middle set, and re-park if the layout changes
    park();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(park);
    window.addEventListener('load', park);
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(park, 180);
    });
  }

  /* ----------------------------------------------- bride & groom curtain
     Each portrait starts draped. The tag pulls the drapes apart; pressing it
     again draws them back. Purely decorative, so it is skipped entirely when
     the visitor asks for reduced motion. */
  var badges = Array.prototype.slice.call(document.querySelectorAll('.portrait__badge'));
  badges.forEach(function (badge) {
    var card = badge.closest('.portrait');
    if (!card) return;

    badge.addEventListener('click', function () {
      var open = card.classList.toggle('is-open');
      badge.setAttribute('aria-expanded', String(open));
      var who = badge.getAttribute('aria-label') || '';
      badge.setAttribute('aria-label',
        (open ? who.replace('Open the curtain', 'Close the curtain')
              : who.replace('Close the curtain', 'Open the curtain')));
    });
  });

  /* ------------------------------------------------------------ lightbox */
  var PHOTOS = [
    { src: 'assets/photos/couple-01.jpg', cap: 'Under the lights', alt: 'Vidhi and Jay together at night in a garden lit by fairy lights' },
    { src: 'assets/photos/couple-02.jpg', cap: 'Beside the car', alt: 'Vidhi and Jay beside a flower-decorated car' },
    { src: 'assets/photos/couple-03.jpg', cap: 'Rooftop afternoon', alt: 'Vidhi and Jay together on a rooftop' },
    { src: 'assets/photos/couple-04.jpg', cap: 'By the water', alt: 'Vidhi and Jay walking together by the water' },
    { src: 'assets/photos/couple-05.jpg', cap: 'Close', alt: 'A close photograph of Vidhi and Jay together' },
    { src: 'assets/photos/couple-06.jpg', cap: 'The city', alt: 'Vidhi and Jay standing together beside a building' },
    { src: 'assets/photos/couple-07.jpg', cap: 'Night out', alt: 'Vidhi and Jay together at night' },
    { src: 'assets/photos/couple-08.jpg', cap: 'The fair', alt: 'Vidhi and Jay at a fairground at night' },
    { src: 'assets/photos/couple-09.jpg', cap: 'Festive', alt: 'Vidhi and Jay together in festive clothes' },
    { src: 'assets/photos/couple-10.jpg', cap: 'Colour and light', alt: 'Vidhi and Jay together under coloured lights' },
    { src: 'assets/photos/couple-11.jpg', cap: 'Balloons', alt: 'Vidhi and Jay together outdoors with balloons' },
    { src: 'assets/photos/couple-12.jpg', cap: 'Sparks', alt: 'Vidhi and Jay together with sparklers at night' }
  ];

  var dialog = document.getElementById('lightbox');
  var lbImage = document.getElementById('lbImage');
  var lbCaption = document.getElementById('lbCaption');
  var lbCount = document.getElementById('lbCount');
  var index = 0;
  var opener = null;

  function render(i) {
    index = (i + PHOTOS.length) % PHOTOS.length;
    var photo = PHOTOS[index];
    if (!lbImage) return;
    lbImage.src = photo.src;
    lbImage.alt = photo.alt;
    if (lbCaption) lbCaption.textContent = photo.cap;
    if (lbCount) lbCount.textContent = (index + 1) + ' / ' + PHOTOS.length;
  }

  function openAt(i, trigger) {
    if (!dialog || typeof dialog.showModal !== 'function') return;
    opener = trigger || null;
    render(i);
    dialog.showModal();
  }

  function closeLightbox() {
    if (dialog && dialog.open) dialog.close();
    if (opener) opener.focus();
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-photo]'), function (btn) {
    btn.addEventListener('click', function () {
      openAt(parseInt(btn.getAttribute('data-photo'), 10) || 0, btn);
    });
  });

  if (dialog) {
    var closeBtn = document.getElementById('lbClose');
    var prevBtn = document.getElementById('lbPrev');
    var nextBtn = document.getElementById('lbNext');
    if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
    if (prevBtn) prevBtn.addEventListener('click', function () { render(index - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { render(index + 1); });
    dialog.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); render(index - 1); }
      if (e.key === 'ArrowRight') { e.preventDefault(); render(index + 1); }
    });
    dialog.addEventListener('click', function (e) {
      if (e.target === dialog) closeLightbox();
    });
    // swipe
    var x0 = null;
    dialog.addEventListener('touchstart', function (e) { x0 = e.changedTouches[0].clientX; }, { passive: true });
    dialog.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 46) render(index + (dx < 0 ? 1 : -1));
      x0 = null;
    }, { passive: true });
  }

  /* ------------------------------------------------------------ calendar */
  function icsFile() {
    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Vidhi and Jay//Wedding Invitation//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VTIMEZONE',
      'TZID:Asia/Kolkata',
      'BEGIN:STANDARD',
      'DTSTART:19700101T000000',
      'TZOFFSETFROM:+0530',
      'TZOFFSETTO:+0530',
      'TZNAME:IST',
      'END:STANDARD',
      'END:VTIMEZONE',
      'BEGIN:VEVENT',
      'UID:vidhi-jay-wedding-20270129@local',
      'DTSTAMP:20260101T000000Z',
      'DTSTART;TZID=Asia/Kolkata:20270129T110000',
      'DTEND;TZID=Asia/Kolkata:20270129T160000',
      'SUMMARY:Vidhi \\& Jay — Wedding',
      'LOCATION:Parsoda',
      'DESCRIPTION:The wedding ceremony of Vidhi and Jay. Ceremony at 11:00 AM.',
      'END:VEVENT',
      'END:VCALENDAR'
    ];
    return lines.join('\r\n') + '\r\n';
  }

  function downloadCalendar(trigger) {
    try {
      var blob = new Blob([icsFile()], { type: 'text/calendar;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = 'vidhi-and-jay-wedding.ics';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(url); }, 2500);
      if (trigger) trigger.setAttribute('data-saved', 'true');
    } catch (err) {
      window.alert('The calendar file could not be created. The wedding is on Friday, 29 January 2027 at 11:00 AM, Parsoda.');
    }
  }

  Array.prototype.forEach.call(document.querySelectorAll('[data-calendar]'), function (btn) {
    btn.addEventListener('click', function () { downloadCalendar(btn); });
  });

  /* ------------------------------------------------------------- playful */

  /* a small burst of gold at a screen point */
  function spawnSpecks(x, y, count, colours) {
    if (REDUCED.matches) return;
    var stage = document.body;
    for (var i = 0; i < count; i++) {
      var s = document.createElement('span');
      s.className = 'speck';
      s.style.left = (x + (Math.random() - 0.5) * 18) + 'px';
      s.style.top = (y + (Math.random() - 0.5) * 18) + 'px';
      s.style.background = colours[(Math.random() * colours.length) | 0];
      s.style.setProperty('--dx', ((Math.random() - 0.5) * 150).toFixed(0) + 'px');
      s.style.setProperty('--dy', (-(50 + Math.random() * 110)).toFixed(0) + 'px');
      s.style.animationDelay = (Math.random() * 160).toFixed(0) + 'ms';
      stage.appendChild(s);
      (function (el) { window.setTimeout(function () { el.remove(); }, 1500); })(s);
    }
  }

  function burstFrom(el, colours) {
    if (!el) return;
    var r = el.getBoundingClientRect();
    spawnSpecks(r.left + r.width / 2, r.top + r.height / 2, 14, colours);
  }

  /* --- gold-foil scratch cards over each ritual's time and venue --------- */
  var scratchCards = Array.prototype.slice.call(document.querySelectorAll('[data-scratch]'));

  function revealScratch(card) {
    if (!card || card.classList.contains('is-revealed')) return;
    card.classList.add('is-revealed');
    var foil = card.querySelector('.scratch__foil');
    if (foil) {
      foil.style.opacity = '0';
      window.setTimeout(function () { if (foil.parentNode) foil.parentNode.removeChild(foil); }, 520);
    }
    var hint = card.querySelector('.scratch__hint');
    if (hint) hint.remove();
    var btn = card.querySelector('.scratch__reveal') ||
              (card.parentNode && card.parentNode.querySelector('.scratch__reveal'));
    if (btn) btn.remove();
    burstFrom(card, ['#D9B55C', '#B08A3E', '#E9D2A0', '#8FA06E', '#FFF0C9']);
  }

  var canScratch = 'HTMLCanvasElement' in window;

  if (scratchCards.length && canScratch && !REDUCED.matches) {
    scratchCards.forEach(function (card) {
      var canvas = document.createElement('canvas');
      canvas.className = 'scratch__foil';
      canvas.setAttribute('aria-hidden', 'true');
      card.appendChild(canvas);

      var hint = document.createElement('span');
      hint.className = 'scratch__hint';
      hint.setAttribute('aria-hidden', 'true');
      hint.textContent = 'Scratch me';
      card.appendChild(hint);

      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'scratch__reveal';
      btn.textContent = 'Reveal the time and venue';
      btn.addEventListener('click', function () { revealScratch(card); });
      // sits after the panel: a visible one-tap control on touch screens,
      // a screen-reader/keyboard control everywhere else
      if (card.parentNode) card.parentNode.insertBefore(btn, card.nextSibling);
      else card.appendChild(btn);

      var ctx = canvas.getContext('2d');
      if (!ctx) { revealScratch(card); return; }

      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var drawing = false;
      var last = null;
      var checkAt = 0;

      function paint() {
        var box = card.getBoundingClientRect();
        var w = Math.max(1, Math.round(box.width));
        var h = Math.max(1, Math.round(box.height));
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        var g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#EBD6A6');
        g.addColorStop(0.3, '#C9A75B');
        g.addColorStop(0.52, '#F2E1BA');
        g.addColorStop(0.74, '#BE9440');
        g.addColorStop(1, '#A9822F');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        var dots = Math.min(220, Math.round((w * h) / 1100));
        for (var i = 0; i < dots; i++) {
          ctx.fillStyle = 'rgba(255,255,255,' + (0.04 + Math.random() * 0.13).toFixed(3) + ')';
          ctx.beginPath();
          ctx.arc(Math.random() * w, Math.random() * h, 0.5 + Math.random() * 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      function erase(x, y, radius) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0,0,0,1)';   // must be fully opaque or the foil only fades
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      function clearedRatio() {
        try {
          var data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          var step = 4 * 16;
          var total = 0;
          var gone = 0;
          for (var i = 3; i < data.length; i += step) {
            total++;
            if (data[i] < 40) gone++;
          }
          return total ? gone / total : 0;
        } catch (err) {
          return 1;
        }
      }

      paint();
      var lastWidth = Math.round(card.getBoundingClientRect().width);
      if ('ResizeObserver' in window) {
        new ResizeObserver(function () {
          var w = Math.round(card.getBoundingClientRect().width);
          if (Math.abs(w - lastWidth) > 2) {
            lastWidth = w;
            if (!card.classList.contains('is-revealed')) paint();
          }
        }).observe(card);
      }

      function localPoint(e) {
        var r = canvas.getBoundingClientRect();
        return { x: e.clientX - r.left, y: e.clientY - r.top };
      }

      // every tap clears a patch, so a phone that reports odd pointer types
      // still works - and four taps always finishes the job
      canvas.addEventListener('click', function (e) {
        if (card.classList.contains('is-revealed')) return;
        var r = canvas.getBoundingClientRect();
        erase(e.clientX - r.left, e.clientY - r.top, 54);
        touchTaps++;
        if (touchTaps >= 4 || clearedRatio() > 0.44) revealScratch(card);
      });

      function onMove(e) {
        if (!drawing) return;
        var p = localPoint(e);
        var radius = e.pointerType === 'touch' ? 46 : 15;
        if (last) {
          var dx = p.x - last.x;
          var dy = p.y - last.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          var steps = Math.max(1, Math.ceil(dist / Math.max(4, radius * 0.55)));
          for (var i = 1; i <= steps; i++) {
            erase(last.x + (dx * i) / steps, last.y + (dy * i) / steps, radius);
          }
        } else {
          erase(p.x, p.y, radius);
        }
        last = p;
        var now = performance.now();
        if (now - checkAt > 200) {
          checkAt = now;
          if (clearedRatio() > 0.46) revealScratch(card);
        }
      }

      function stopDrawing() {
        if (!drawing) return;
        drawing = false;
        last = null;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', stopDrawing);
        window.removeEventListener('pointercancel', stopDrawing);
        if (clearedRatio() > 0.3) revealScratch(card);
      }

      var touchTaps = 0;

      // touch fallback: some mobile browsers deliver touch events before pointer events
      canvas.addEventListener('touchstart', function (e) {
        if (card.classList.contains('is-revealed')) return;
        touchTaps++;
        if (touchTaps >= 3) { revealScratch(card); return; }
        var t = e.touches && e.touches[0];
        if (!t) return;
        var r = canvas.getBoundingClientRect();
        erase(t.clientX - r.left, t.clientY - r.top, 46);
      }, { passive: true });

      canvas.addEventListener('pointerdown', function (e) {
        if (card.classList.contains('is-revealed')) return;
        if (e.pointerType === 'touch') {
          touchTaps++;
          if (touchTaps >= 4) { revealScratch(card); return; }
        }
        drawing = true;
        var p = localPoint(e);
        last = p;
        erase(p.x, p.y, e.pointerType === 'touch' ? 46 : 16);
        checkAt = performance.now();
        window.addEventListener('pointermove', onMove, { passive: true });
        window.addEventListener('pointerup', stopDrawing);
        window.addEventListener('pointercancel', stopDrawing);
        e.preventDefault();
      });
    });
  } else {
    scratchCards.forEach(revealScratch);
  }

  var revealAll = document.getElementById('revealAll');
  if (revealAll) {
    revealAll.addEventListener('click', function () {
      scratchCards.forEach(revealScratch);
      revealAll.textContent = 'All revealed ✦';
      revealAll.disabled = true;
    });
  }

  /* --- light the lanterns ---------------------------------------------- */
  var lanternToggle = document.getElementById('lanternToggle');
  var heroSection = document.querySelector('.hero');
  if (lanternToggle && heroSection) {
    lanternToggle.addEventListener('click', function () {
      var lit = heroSection.classList.toggle('is-lit');
      lanternToggle.setAttribute('aria-pressed', String(lit));
      lanternToggle.innerHTML = lit ? '<span aria-hidden="true">✦</span> Lanterns lit' : '<span aria-hidden="true">✦</span> Light the lanterns';
      if (lit) burstFrom(lanternToggle, ['#FFD68A', '#FFB347', '#FFF0C9', '#FFE2AC']);
    });
  }

  /* --- release a wish lantern ------------------------------------------ */
  var wishBtn = document.getElementById('wishBtn');
  var wishSky = document.getElementById('wishSky');
  var wishNote = document.getElementById('wishNote');
  var wishCount = 0;

  if (wishBtn && wishSky) {
    wishBtn.addEventListener('click', function () {
      wishCount++;
      if (!REDUCED.matches) {
        var wl = document.createElement('span');
        wl.className = 'wish-lantern';
        wl.style.left = (34 + Math.random() * 32) + '%';
        wl.style.setProperty('--drift', ((Math.random() - 0.5) * 110).toFixed(0) + 'px');
        wl.style.animationDuration = (5.4 + Math.random() * 2.6).toFixed(1) + 's';
        wishSky.appendChild(wl);
        window.setTimeout(function () { wl.remove(); }, 9500);
        burstFrom(wishBtn, ['#FFD68A', '#FFB347', '#FFF0C9']);
      }
      if (wishNote) {
        wishNote.textContent = wishCount === 1 ? 'One wish on its way ✦'
          : wishCount < 5 ? wishCount + ' wishes floating up ✦'
          : 'The sky is full of wishes ✦';
      }
    });
  }

  /* --- petals when the calendar file lands ------------------------------ */
  Array.prototype.forEach.call(document.querySelectorAll('[data-calendar]'), function (btn) {
    btn.addEventListener('click', function () {
      burstFrom(btn, ['#E9B949', '#D97706', '#F3DDB0', '#B45309', '#F5C441']);
    });
  });

  /* ------------------------------------------------------- day-of mode */
  var EVENTS = [
    { name: 'Mehndi',        date: '2027-01-26', time: '10:00 AM', venue: 'Kaswada', note: 'Bride side only', map: 'https://maps.app.goo.gl/Fkx2JdvGDVSCQrqRA' },
    { name: 'Mandap Muhrat', date: '2027-01-28', time: '9:00 AM',  venue: 'Laljina Pahadiya & Kaswada', note: 'Both sides', map: 'https://maps.app.goo.gl/kHQATaXLa1Q4qLBV9' },
    { name: 'Haldi',         date: '2027-01-28', time: '1:00 PM',  venue: 'Laljina Pahadiya & Kaswada', note: 'Both sides', map: 'https://maps.app.goo.gl/kHQATaXLa1Q4qLBV9' },
    { name: 'Garba Night',   date: '2027-01-28', time: '9:00 PM',  venue: 'Laljina Pahadiya & Kaswada', note: 'Both sides', map: 'https://maps.app.goo.gl/kHQATaXLa1Q4qLBV9' },
    { name: 'The Wedding',   date: '2027-01-29', time: '11:00 AM', venue: 'Parsoda', note: 'With our families', map: 'https://maps.app.goo.gl/CCPjUxXjS8K94XkF6' }
  ];

  function istDay(offset) {
    var d = new Date(Date.now() + (offset || 0) * 86400000);
    try {
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(d);
    } catch (err) {
      return d.toISOString().slice(0, 10);
    }
  }

  var todayBlock = document.getElementById('todayBlock');
  var todayList = document.getElementById('todayList');
  var countNext = document.getElementById('countNext');
  var countKicker = document.getElementById('countKicker');

  function renderDayOf() {
    if (!todayBlock || !todayList) return;
    var today = istDay(0);
    var todays = EVENTS.filter(function (e) { return e.date === today; });
    var upcoming = EVENTS.filter(function (e) { return e.date > today; });

    if (todays.length) {
      todayList.textContent = '';
      todays.forEach(function (ev) {
        var item = document.createElement('div');
        item.className = 'today__item';

        var name = document.createElement('p');
        name.className = 'today__name';
        name.textContent = ev.name;

        var meta = document.createElement('p');
        meta.className = 'today__meta';
        meta.textContent = ev.time + ' \u00b7 ' + ev.venue;

        var link = document.createElement('a');
        link.className = 'btn btn--onwine';
        link.href = ev.map;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Get directions';
        link.setAttribute('aria-label', 'Directions to ' + ev.venue);

        item.appendChild(name);
        item.appendChild(meta);
        item.appendChild(link);
        todayList.appendChild(item);
      });
      todayBlock.hidden = false;
      if (grid) grid.hidden = true;
      if (done) done.hidden = true;
      if (countKicker) countKicker.textContent = 'Happening today';
    } else if (upcoming.length) {
      todayBlock.hidden = true;
      var next = upcoming[0];
      var days = Math.round((new Date(next.date + 'T00:00:00+05:30').getTime() - Date.now()) / 86400000);
      if (countNext) {
        countNext.hidden = false;
        countNext.textContent = 'Next up: ' + next.name + ' \u2014 ' +
          (days <= 0 ? 'today' : days === 1 ? 'tomorrow' : 'in ' + days + ' days');
      }
    } else {
      todayBlock.hidden = true;
      if (countNext) countNext.hidden = true;
    }
  }
  renderDayOf();

  /* ------------------------------------------------------ blessing wall
     Static site, so there is no server to write to. data/blessings.json in the
     repo is the guest book: the wall reads it, so every visitor sees the same
     list. A guest's new wish is sent to the couple (WhatsApp, or copied) and
     shown on their own device at once; it joins the wall when the JSON is
     updated and re-uploaded. */
  var WISH_KEY = 'vj-blessings-v1';
  var WHATSAPP = '';
  var DATA_URL = 'data/blessings.json';
  /* Paste the Google Apps Script /exec URL here to make the wall live.
     While this is empty the wall is read-only and only shows blessings.json. */
  var WISH_ENDPOINT = 'https://script.google.com/macros/s/AKfycbx-Drj2QJjtUWqztmy3tXgXWYHU1rQq1QXoi6uwG1qEnmFvisJ__Ig7YsUmnWucwz9h4g/exec';
  var blessingForm = document.getElementById('blessingForm');
  var blessingName = document.getElementById('blessingName');
  var blessingText = document.getElementById('blessingText');
  var blessingStatus = document.getElementById('blessingStatus');
  var diyaWall = document.getElementById('diyaWall');
  var diyaEmpty = document.getElementById('diyaEmpty');
  var diyaSummary = document.getElementById('diyaSummary');
  var diyaCount = document.getElementById('diyaCount');
  var diyaNames = document.getElementById('diyaNames');
  var diyaNote = document.getElementById('diyaNote');
  var wallItems = [];

  function localList() {
    try { return JSON.parse(window.localStorage.getItem(WISH_KEY) || '[]'); }
    catch (err) { return []; }
  }
  function saveLocal(list) {
    try { window.localStorage.setItem(WISH_KEY, JSON.stringify(list.slice(-60))); }
    catch (err) {}
  }

  function shape(items) {
    var names = [];
    items.forEach(function (it) {
      if (it.name && names.indexOf(it.name) === -1) names.push(it.name);
    });
    return { count: items.length, people: names.length, names: names, items: items };
  }
  /* the sheet hands back real dates, which stringify as
     "Thu Oct 29 2026 00:00:00 GMT+0530 (India Standard Time)" */
  function prettyWhen(v) {
    if (!v) return '';
    var text = String(v);
    if (text.length > 12) {
      var d = new Date(v);
      if (!isNaN(d.getTime())) {
        return new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric'
        }).format(d);
      }
    }
    return text;
  }

  function normalise(raw) {
    var items = (raw && raw.items) ? raw.items : (Array.isArray(raw) ? raw : []);
    return items.map(function (w) {
      if (!w) return null;
      var wish = w.wish || w.blessing || w.message || w.text;
      if (!w.name || !wish) return null;
      return {
        name: String(w.name),
        wish: String(wish),
        when: prettyWhen(w.when || w.date)
      };
    }).filter(Boolean);
  }

  /* read the book twice before giving up, and say why if it cannot be read */
  function readBook() {
    function grab(u) {
      return window.fetch(u, { cache: 'no-store' }).then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.text();
      });
    }
    return grab(DATA_URL + '?v=' + Date.now())
      .catch(function () { return grab(DATA_URL); })
      .then(function (text) {
        var raw;
        try {
          raw = JSON.parse(text.replace(/^\uFEFF/, ''));
        } catch (err) {
          throw new Error('data/blessings.json has a formatting error \u2014 check the commas and quotes.');
        }
        return normalise(raw);
      });
  }

  function paint(state, note) {
    if (!diyaWall) return;
    var items = (state.items || []).slice().reverse();
    diyaWall.textContent = '';

    items.forEach(function (w, i) {
      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'diya';
      btn.style.animationDelay = Math.min(i * 45, 400) + 'ms';

      var lamp = document.createElement('span');
      lamp.className = 'diya__lamp';
      lamp.setAttribute('aria-hidden', 'true');
      var flame = document.createElement('span');
      flame.className = 'diya__flame';
      lamp.appendChild(flame);

      var text = document.createElement('span');
      text.className = 'diya__text';
      text.textContent = '\u201C' + w.wish + '\u201D';

      var name = document.createElement('span');
      name.className = 'diya__name';
      name.textContent = '\u2014 ' + w.name;

      var send = document.createElement('span');
      send.className = 'diya__send';
      send.textContent = w.when || (WHATSAPP ? 'Tap to send on WhatsApp' : 'Tap to copy');

      btn.appendChild(lamp);
      btn.appendChild(text);
      btn.appendChild(name);
      btn.appendChild(send);
      btn.setAttribute('aria-label', 'Blessing from ' + w.name + ': ' + w.wish);
      btn.addEventListener('click', function () { sendWish(w); });
      li.appendChild(btn);
      diyaWall.appendChild(li);
    });

    if (diyaEmpty) diyaEmpty.hidden = items.length > 0;

    if (diyaSummary) {
      diyaSummary.hidden = items.length === 0;
      if (items.length) {
        var names = state.names || [];
        diyaCount.textContent = items.length + (items.length === 1 ? ' blessing' : ' blessings') +
          (state.people ? ' \u00b7 ' + state.people + (state.people === 1 ? ' person' : ' people') : '');
        var shown = names.slice(0, 8).join(', ');
        if (names.length > 8) shown += ' and ' + (names.length - 8) + ' more';
        diyaNames.textContent = shown;
      }
    }
    if (diyaNote && note) diyaNote.textContent = note;
  }

  function sendWish(w) {
    var text = '\u201C' + w.wish + '\u201D \u2014 ' + w.name;
    if (WHATSAPP) {
      window.open('https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
      return true;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {}, function () {});
      return true;
    }
    return false;
  }

  var myWish = document.getElementById('myWish');
  var myWishText = document.getElementById('myWishText');

  function renderMine() {
    if (!myWish) return;
    var list = localList();
    var last = list[list.length - 1];
    if (!last) { myWish.hidden = true; return; }
    if (myWishText) myWishText.textContent = '\u201C' + last.wish + '\u201D';
    myWish.hidden = false;
  }

  function paintNow(note) { paint(shape(wallItems), note); }

  /* the live book wins when it is configured; the file is the fallback */
  function readBookLive() {
    if (!WISH_ENDPOINT || !window.fetch) return readBook();
    return window.fetch(WISH_ENDPOINT + '?action=list&v=' + Date.now(), { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (raw) {
        if (raw && raw.ok === false) throw new Error(raw.error || 'rejected');
        return normalise(raw);
      })
      .catch(function () { return readBook(); });
  }

  /* Apps Script answers a POST with a redirect to script.googleusercontent.com,
     which some browsers refuse to expose to JavaScript even though the row was
     written. So the response is never trusted: the book is read back and the
     wish is looked for there. That is the only honest definition of saved. */
  function postWish(entry) {
    var body = JSON.stringify(entry);
    var refused = null;

    var attempt = window.fetch(WISH_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: body
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function (text) {
      try {
        var res = JSON.parse(text);
        if (res && res.ok === false) throw new Error(res.error || 'rejected');
      } catch (err) {
        if (err instanceof SyntaxError) return;   // unreadable is fine, we verify below
        throw err;
      }
    }).catch(function (err) {
      refused = err;                              // network / CORS refusal
    });

    return attempt.then(function () {
      return window.fetch(WISH_ENDPOINT + '?action=list&v=' + Date.now(), { cache: 'no-store' });
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (raw) {
      var items = normalise(raw);
      var saved = items.some(function (w) {
        return w.name === entry.name && w.wish === entry.wish;
      });
      if (!saved) {
        throw new Error(refused
          ? 'could not reach ' + WISH_ENDPOINT
          : 'the wish was not written to the sheet');
      }
      wallItems = items;
      return items;
    });
  }

  /* open the console and run wallCheck() to see what the endpoint actually says */
  window.wallCheck = function () {
    if (!WISH_ENDPOINT) {
      console.log('WISH_ENDPOINT is empty - the wall is read-only from blessings.json.');
      return 'no endpoint';
    }
    console.log('endpoint:', WISH_ENDPOINT);
    if (!/\/exec$/.test(WISH_ENDPOINT)) {
      console.warn('This URL does not end in /exec. A /dev URL only works while you are signed in.');
    }
    return window.fetch(WISH_ENDPOINT + '?action=list&v=' + Date.now(), { cache: 'no-store' })
      .then(function (r) {
        return r.text().then(function (t) {
          console.log('GET', r.status, r.headers.get('content-type'));
          console.log('first 160 chars:', t.slice(0, 160));
          try {
            var j = JSON.parse(t);
            console.log('parsed ok, wishes:', (j.items || []).length);
            return j;
          } catch (err) {
            console.warn('Not JSON. If this is an HTML login page, the deployment is not set to "Anyone".');
            return null;
          }
        });
      })
      .catch(function (err) {
        console.error('GET failed:', err.message);
        return null;
      });
  };

  function refresh() {
    paintNow('Our guest book.');
    renderMine();
    if (!window.fetch) return;
    readBookLive().then(function (items) {
      wallItems = items;
      paintNow(items.length
        ? 'Every light here is saved in our guest book.'
        : 'No lights on the wall yet.');
    }).catch(function (err) {
      paintNow(err && err.message ? err.message : 'The guest book could not be loaded.');
    });
  }

  if (blessingForm) {
    blessingForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = (blessingName.value || '').trim();
      var wish = (blessingText.value || '').trim();
      if (!name || !wish) {
        if (blessingStatus) {
          blessingStatus.textContent = 'A name and a few words, please.';
          blessingStatus.classList.add('is-error');
        }
        (name ? blessingText : blessingName).focus();
        return;
      }
      blessingStatus.classList.remove('is-error');

      var entry = {
        name: name.slice(0, 40),
        wish: wish.slice(0, 200),
        when: new Intl.DateTimeFormat('en-GB', {
          timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric'
        }).format(new Date())
      };
      var list = localList();
      list.push(entry);
      saveLocal(list);
      blessingText.value = '';
      renderMine();

      /* live wall: the wish goes straight into the sheet and shows for everyone */
      if (WISH_ENDPOINT) {
        if (blessingStatus) {
          blessingStatus.textContent = 'Lighting your diya\u2026';
          blessingStatus.classList.remove('is-error');
        }
        postWish(entry).then(function (items) {
          try { saveLocal([]); } catch (err) {}
          if (myWish) myWish.hidden = true;
          if (blessingStatus) blessingStatus.textContent = 'Your light is on the wall. Thank you.';
          burstFrom(diyaWall, ['#FFD68A', '#FFB347', '#FFF0C9']);
          if (items) paintNow('Our guest book \u2014 every wish here is saved in the sheet.');
        }).catch(function (err) {
          if (window.console) console.error('wish wall:', err && err.message, '- run wallCheck()');
          var sent = sendWish(entry);
          if (blessingStatus) {
            blessingStatus.textContent = sent
              ? 'Your wish could not reach the wall, so it has been copied \u2014 please paste it to us on WhatsApp.'
              : 'Your wish could not reach the wall. Please send it to us directly.';
            blessingStatus.classList.add('is-error');
          }
        });
        return;
      }

      var sent = sendWish(entry);
      if (blessingStatus) {
        blessingStatus.textContent = WHATSAPP
          ? 'Sent to us on WhatsApp. It appears on the wall once we add it.'
          : (sent ? 'Copied \u2014 paste it to Vidhi & Jay on WhatsApp. It appears on the wall once we add it.'
                  : 'Thank you. It appears on the wall once we add it.');
      }
      burstFrom(diyaWall, ['#FFD68A', '#FFB347', '#FFF0C9']);
    });
  }
  refresh();

  /* ------------------------------------------------------------- music
     Starts by itself where the browser allows it, and on the first tap or key
     press where it does not. The button stops it, and that choice is remembered. */
  var musicToggle = document.getElementById('musicToggle');
  var musicTrack = document.getElementById('musicTrack');
  var MUSIC_KEY = 'vj-music';
  if (musicToggle && musicTrack) {
    musicTrack.volume = 0.3;

    var stored = null;
    try { stored = window.localStorage.getItem(MUSIC_KEY); } catch (err) {}
    var stoppedByUser = stored === 'off';

    function remember(on) {
      try { window.localStorage.setItem(MUSIC_KEY, on ? 'on' : 'off'); } catch (err) {}
    }
    function syncMusic() {
      var playing = !musicTrack.paused;
      musicToggle.setAttribute('aria-pressed', String(playing));
      musicToggle.setAttribute('aria-label', playing ? 'Stop background music' : 'Play background music');
      musicToggle.classList.toggle('is-playing', playing);
      if (playing) musicToggle.classList.remove('is-waiting');
    }
    function start() {
      var promise = musicTrack.play();
      if (promise && promise.catch) promise.catch(function () {});
    }

    musicTrack.addEventListener('play', syncMusic);
    musicTrack.addEventListener('pause', syncMusic);
    musicTrack.addEventListener('error', function () { musicToggle.hidden = true; });

    musicToggle.addEventListener('click', function () {
      if (musicTrack.paused) {
        stoppedByUser = false;
        remember(true);
        start();
      } else {
        stoppedByUser = true;
        remember(false);
        musicTrack.pause();
      }
    });

    if (!stoppedByUser) {
      start();   // succeeds only if the browser permits it

      // browsers only allow sound after a gesture, so take the first one of any kind
      var events = ['pointerdown', 'pointerup', 'mousedown', 'touchstart', 'touchend',
                    'keydown', 'click', 'wheel', 'scroll'];
      var resume = function (e) {
        if (e && e.target && e.target.closest && e.target.closest('#musicToggle')) return;
        if (musicTrack.paused && !stoppedByUser) start();
        if (!musicTrack.paused) {
          events.forEach(function (ev) { document.removeEventListener(ev, resume, true); });
        }
      };
      events.forEach(function (ev) {
        document.addEventListener(ev, resume, { passive: true, capture: true });
      });

      // if it is still silent shortly after load, ask for a tap
      window.setTimeout(function () {
        if (musicTrack.paused && !stoppedByUser) musicToggle.classList.add('is-waiting');
      }, 700);
    }
  }

  /* --------------------------------------------------------------- misc */
  onStuck();
  sweepReveal();

  var frameQueued = false;
  function onScrollFrame() {
    if (frameQueued) return;
    frameQueued = true;
    window.requestAnimationFrame(function () {
      onStuck();
      sweepReveal();
      frameQueued = false;
    });
  }
  window.addEventListener('scroll', onScrollFrame, { passive: true });
  window.addEventListener('resize', onScrollFrame);
  window.addEventListener('load', sweepReveal);
  setTimeout(sweepReveal, 400);

  // keep layout measurements honest when fonts land
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      measurePaper();
      updateUnroll();
    });
  }
})();
