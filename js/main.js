  /* ── BibTeX copy ─────────────────────────────── */
  (function () {
    const btn = document.getElementById('copyBtn');
    const src = document.getElementById('bibtex');
    if (!btn || !src) return;
    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(src.textContent.trim());
        btn.textContent = 'Copied ✓';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = 'Copy'; btn.classList.remove('copied'); }, 1800);
      } catch (e) {
        const range = document.createRange();
        range.selectNodeContents(src);
        const sel = window.getSelection();
        sel.removeAllRanges(); sel.addRange(range);
      }
    });
  })();

  /* ── scroll progress bar ─────────────────────── */
  (function () {
    const bar = document.getElementById('progress');
    if (!bar) return;
    const update = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  })();

  /* ── navigator: click-scroll + scroll-spy ────── */
  (function () {
    const navEl = document.querySelector('.nav');
    const rail = document.getElementById('rail');
    const items = Array.from(document.querySelectorAll('.rail-item'));
    const sections = Array.from(document.querySelectorAll('section.section'));
    if (!rail || !items.length || !sections.length) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const navH = () => (navEl ? navEl.offsetHeight : 62);
    const OFFSET = 18;

    const byId = {};
    items.forEach(it => { byId[it.getAttribute('href').slice(1)] = it; });

    /* keep the active item visible inside the rail only — never scroll the page */
    function revealInRail(item) {
      const r = rail.getBoundingClientRect();
      const i = item.getBoundingClientRect();
      if (i.left < r.left + 8) {
        rail.scrollBy({ left: i.left - r.left - 20, behavior: reduce ? 'auto' : 'smooth' });
      } else if (i.right > r.right - 8) {
        rail.scrollBy({ left: i.right - r.right + 20, behavior: reduce ? 'auto' : 'smooth' });
      }
    }

    let currentId = null;
    function setActive(id) {
      if (id === currentId) return;
      currentId = id;
      items.forEach(it => it.classList.remove('active'));
      const item = byId[id];
      if (item) { item.classList.add('active'); revealInRail(item); }
    }

    /* controlled smooth scroll, offset for the sticky nav.
       offsetTop is used (not getBoundingClientRect) so the reveal
       transform never skews the landing position. */
    function goTo(id) {
      const target = document.getElementById(id);
      if (!target) return;
      const y = target.offsetTop - navH() - OFFSET;
      window.scrollTo({ top: Math.max(0, y), behavior: reduce ? 'auto' : 'smooth' });
    }

    /* intercept every in-page anchor (rail items + wordmark) */
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href').slice(1);
        if (!id || !document.getElementById(id)) return;
        e.preventDefault();
        if (id === 'top') {
          window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
        } else {
          goTo(id);
          setActive(id);
        }
        if (history.replaceState) history.replaceState(null, '', '#' + id);
      });
    });

    /* scroll-spy: the last section whose top has crossed the nav line */
    function syncSpy() {
      const line = navH() + 48;
      const y = window.scrollY;
      let activeId = sections[0].id;
      for (const s of sections) {
        if (s.offsetTop - y <= line) activeId = s.id;
        else break;
      }
      setActive(activeId);
    }

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => { syncSpy(); ticking = false; });
        ticking = true;
      }
    }, { passive: true });
    window.addEventListener('resize', syncSpy);
    syncSpy();

    /* honour an incoming hash on load */
    if (location.hash && document.getElementById(location.hash.slice(1))) {
      window.requestAnimationFrame(() => goTo(location.hash.slice(1)));
    }
  })();

  /* ── section reveal on scroll ────────────────── */
  (function () {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const els = document.querySelectorAll('.reveal');
    if (reduce) { els.forEach(e => e.classList.add('in')); return; }
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(en => {
        if (en.isIntersecting) { en.target.classList.add('in'); obs.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
    els.forEach(e => obs.observe(e));
  })();

  /* ── London clock (footer) ───────────────────── */
  (function () {
    const el = document.getElementById('clock');
    if (!el) return;
    const tick = () => {
      const t = new Date().toLocaleTimeString('en-GB', {
        timeZone: 'Europe/London', hour12: false,
        hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
      el.innerHTML = 'LDN · <span class="tick">' + t + '</span>';
    };
    tick();
    setInterval(tick, 1000);
  })();
