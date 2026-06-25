/* ═══════════════════════════════════════════════════════════
   КРАСНОАРМЕЙСКИЙ ПРОСПЕКТ — script.js
═══════════════════════════════════════════════════════════ */

/* ─── 1. SCROLL ANIMATION OBSERVER ─── */

const animateObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      animateObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.10, rootMargin: '0px 0px -48px 0px' }
);

document.querySelectorAll('[data-animate]').forEach((el) => {
  animateObserver.observe(el);
});

/* ─── 2. COUNTER ANIMATION ─── */

function runCounter(el, target, duration = 1800) {
  const start = performance.now();

  function tick(now) {
    const elapsed  = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // ease-out cubic
    const ease     = 1 - Math.pow(1 - progress, 3);
    const current  = Math.round(target * ease);

    el.textContent = current.toLocaleString('ru-RU');
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

const counterObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const el     = entry.target;
      const target = parseInt(el.dataset.counter, 10);
      runCounter(el, target);
      counterObserver.unobserve(el);
    });
  },
  { threshold: 0.6 }
);

document.querySelectorAll('[data-counter]').forEach((el) => {
  counterObserver.observe(el);
});

/* ─── 3. PARALLAX ON HERO IMAGE ─── */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const parallaxImg = document.querySelector('[data-parallax]');

if (parallaxImg && !reducedMotion) {
  let ticking = false;

  function applyParallax() {
    const scrollY = window.scrollY;
    parallaxImg.style.transform = `translateY(${scrollY * 0.28}px)`;
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(applyParallax);
      ticking = true;
    }
  }, { passive: true });
}

/* ─── 4. NAV — SCROLL STATE & PROGRESS BAR ─── */

const nav      = document.getElementById('nav');
const progress = document.getElementById('navProgress');

if (nav) {
  window.addEventListener('scroll', () => {
    const scrollY    = window.scrollY;
    const maxScroll  = document.body.scrollHeight - window.innerHeight;
    const pct        = maxScroll > 0 ? scrollY / maxScroll : 0;

    nav.classList.toggle('scrolled', scrollY > 60);

    if (progress) {
      progress.style.transform = window.innerWidth > 860
        ? `scaleY(${pct})`
        : `scaleX(${pct})`;
    }
  }, { passive: true });
}

/* ─── 5. ACTIVE NAV LINK ON SCROLL ─── */

const navLinks = document.querySelectorAll('.nav__links a[href^="#"]');
const targets  = Array.from(navLinks)
  .map((a) => document.querySelector(a.getAttribute('href')))
  .filter(Boolean);

function setActiveLink() {
  const mid = window.innerHeight * 0.45;
  let current = null;

  targets.forEach((section) => {
    const rect = section.getBoundingClientRect();
    if (rect.top <= mid && rect.bottom > mid) {
      current = section.id;
    }
  });

  navLinks.forEach((a) => {
    const href = a.getAttribute('href').slice(1);
    a.classList.toggle('active', href === current);
  });
}

window.addEventListener('scroll', setActiveLink, { passive: true });
setActiveLink();

/* ─── 6. SMOOTH SCROLL for same-page links ─── */

document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', (e) => {
    const href = anchor.getAttribute('href');

    // bare "#" (logo link): querySelector('#') would throw — scroll to top instead
    if (href === '#') {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    const target = document.querySelector(href);
    if (!target) return;
    e.preventDefault();
    const offset = (window.innerWidth <= 860 && nav) ? nav.offsetHeight + 16 : 16;
    const top    = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

/* ─── 7. TABLE ROW STAGGER ON SCROLL ─── */

const tableObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const rows = entry.target.querySelectorAll('tbody tr');
      rows.forEach((row, i) => {
        row.style.opacity    = '0';
        row.style.transform  = 'translateY(16px)';
        row.style.transition = `opacity 0.5s ease ${i * 0.07}s, transform 0.5s ease ${i * 0.07}s`;
        setTimeout(() => {
          row.style.opacity   = '';
          row.style.transform = '';
        }, 50);
      });
      tableObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.15 }
);

document.querySelectorAll('.arch-tbl').forEach((tbl) => {
  tableObserver.observe(tbl);
});

/* ─── 8. CURSOR GLOW (subtle blue trail) ─── */

if (!reducedMotion) {
const glow = document.createElement('div');
glow.style.cssText = `
  position: fixed;
  pointer-events: none;
  z-index: 9999;
  width: 360px;
  height: 360px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(77,109,211,0.06) 0%, transparent 70%);
  transform: translate(-50%,-50%);
  transition: left 0.6s ease, top 0.6s ease;
  will-change: left, top;
`;
document.body.appendChild(glow);

let glowX = 0, glowY = 0;
let glowRaf = false;

document.addEventListener('mousemove', (e) => {
  glowX = e.clientX;
  glowY = e.clientY;
  if (!glowRaf) {
    requestAnimationFrame(() => {
      glow.style.left = glowX + 'px';
      glow.style.top  = glowY + 'px';
      glowRaf = false;
    });
    glowRaf = true;
  }
});
}

/* ─── 9. BURGER MENU ─── */

const burger   = document.getElementById('navBurger');
const navMenu  = document.querySelector('.nav__links');

if (burger && navMenu) {
  const toggleMenu = (open) => {
    burger.classList.toggle('is-open', open);
    navMenu.classList.toggle('is-open', open);
    burger.setAttribute('aria-expanded', String(open));
  };

  burger.addEventListener('click', () => {
    toggleMenu(!burger.classList.contains('is-open'));
  });

  navMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => toggleMenu(false));
  });

  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target)) toggleMenu(false);
  });
}

/* ─── 10. BACK TO TOP ─── */

const backToTop = document.getElementById('backToTop');

if (backToTop) {
  window.addEventListener('scroll', () => {
    backToTop.classList.toggle('is-visible', window.scrollY > 600);
  }, { passive: true });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ─── 11. HERO TITLE — letter-by-letter on load ─── */

window.addEventListener('DOMContentLoaded', () => {
  const heroTitle = document.querySelector('.hero__title');
  if (!heroTitle) return;

  heroTitle.style.opacity = '1'; // override any animation class initially
});

/* ─── 12. GUB MAP — интерактивная схема губернии ─── */

const gubData = {
  tula: {
    name: 'Тула',
    text: 'Козырем туляков были богатые залежи каменного угля. Дворянство и купечество пяти уездов писали императору, чтобы Московско-Курская дорога прошла именно здесь. Итог — Тула стала крупным индустриальным центром губернии.',
  },
  bogorodick: {
    name: 'Богородицк',
    text: 'Железнодорожная ветка прошла рядом — город сохранил масштаб и статус. В конце XIX века Богородицк и Епифань были сопоставимы, но их судьбы разошлись.',
  },
  epifan: {
    name: 'Епифань',
    text: 'Дорога обошла Епифань стороной. Город, сопоставимый с Богородицком в конце XIX века, постепенно угас и со временем превратился в посёлок.',
  },
  plavsk: {
    name: 'Плавск',
    text: 'Здесь была лишь станция «Сергиево» в селе Крапивенского уезда. После прокладки железнодорожных путей село выросло в современный город Плавск.',
  },
};

const gubName   = document.getElementById('gubName');
const gubText   = document.getElementById('gubText');
const gubCities = document.querySelectorAll('.gub-city');

gubCities.forEach((city) => {
  const select = () => {
    const data = gubData[city.dataset.city];
    if (!data) return;
    gubCities.forEach((c) => c.classList.remove('is-active'));
    city.classList.add('is-active');
    gubName.textContent = data.name;
    gubText.textContent = data.text;
  };

  city.addEventListener('click', select);
  city.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      select();
    }
  });
});

/* ─── 13. DOVE EASTER EGG ─── */

const dove       = document.getElementById('doveEgg');
const doveReveal = document.getElementById('doveReveal');

if (dove && doveReveal) {
  dove.addEventListener('click', () => {
    if (!doveReveal.hidden) return;
    dove.classList.add('found');
    doveReveal.hidden = false;
    doveReveal.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest' });
  });
}

/* ─── 14. HUB STOPS — авто-выделение по центру экрана (мобильный) ─── */

const hubStops = document.querySelectorAll('.hub-stop');

if (hubStops.length) {
  const touchMq = window.matchMedia('(max-width: 860px)');
  let stopsTicking = false;

  function updateActiveStop() {
    stopsTicking = false;

    // на десктопе работает hover — авто-выделение не нужно
    if (!touchMq.matches) {
      hubStops.forEach((s) => s.classList.remove('is-active'));
      return;
    }

    const mid = window.innerHeight / 2;
    let best = null;
    let bestDist = Infinity;

    hubStops.forEach((s) => {
      const r = s.getBoundingClientRect();
      const center = r.top + r.height / 2;
      const dist = Math.abs(center - mid);
      if (dist < bestDist) { bestDist = dist; best = s; }
    });

    // выделяем только если ближайшая остановка реально около центра
    const active = best && bestDist < window.innerHeight * 0.5 ? best : null;
    hubStops.forEach((s) => s.classList.toggle('is-active', s === active));
  }

  window.addEventListener('scroll', () => {
    if (!stopsTicking) {
      requestAnimationFrame(updateActiveStop);
      stopsTicking = true;
    }
  }, { passive: true });

  window.addEventListener('resize', updateActiveStop, { passive: true });
  updateActiveStop();
}

/* ─── 15. ТИПОГРАФ — убираем висячие предлоги/союзы в текстах ─── */

(function () {
  // body-копия (без крупных дисплейных заголовков)
  const SEL = 'p, li, figcaption, cite, .label, .credits__role, .credits__name,'
    + '.hub-hero__sub, .hub-stop__kicker, .hub-stop__name, .hub-stop__desc';

  // короткое слово (1–2 буквы: в, на, и, с, от, по, к, о, до, из, за, не, …)
  // + обычный пробел после него → неразрывный пробел
  const re = /(^|[\s(«„—])([а-яёa-z]{1,2})[ \t]+/gi;

  function glue(t) {
    for (let i = 0; i < 2; i++) t = t.replace(re, '$1$2 '); // дважды — для «и в», «а по»
    return t;
  }

  document.querySelectorAll(SEL).forEach((el) => {
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((n) => {
      const v = glue(n.nodeValue);
      if (v !== n.nodeValue) n.nodeValue = v;
    });
  });
})();

