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

window.addEventListener('scroll', () => {
  const scrollY    = window.scrollY;
  const maxScroll  = document.body.scrollHeight - window.innerHeight;
  const pct        = maxScroll > 0 ? scrollY / maxScroll : 0;

  nav.classList.toggle('scrolled', scrollY > 60);

  if (window.innerWidth > 860) {
    progress.style.transform = `scaleY(${pct})`;
  } else {
    progress.style.transform = `scaleX(${pct})`;
  }
}, { passive: true });

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
    const offset = window.innerWidth <= 860 ? nav.offsetHeight + 16 : 16;
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

/* ─── 14. DUCK POND — кормление утки ─── */

const pond = document.getElementById('duckPond');

if (pond) {
  const svg      = pond.querySelector('svg');
  const duck     = document.getElementById('duck');
  const duckFlip = svg.querySelector('.duck-flip');
  const duckBody = svg.querySelector('.duck-body');
  const WATER_Y  = 240;            // уровень воды, куда падает крошка
  const MIN_X    = 60, MAX_X = 580;
  let duckX      = 320;
  let crumb      = null;
  let eatTimer   = null;

  duck.style.transform = 'translate(320px, 0)';

  pond.addEventListener('click', (e) => {
    const rect = svg.getBoundingClientRect();
    const x = Math.min(MAX_X, Math.max(MIN_X,
      ((e.clientX - rect.left) / rect.width) * 640));

    // одна крошка за раз: новая заменяет старую
    if (crumb) crumb.remove();
    clearTimeout(eatTimer);

    crumb = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    crumb.setAttribute('class', 'duck-crumb');
    crumb.setAttribute('r', '5');
    crumb.setAttribute('cx', x);
    crumb.setAttribute('cy', '20');
    svg.appendChild(crumb);

    // падение крошки (cy — CSS-свойство для SVG2)
    crumb.animate(
      [{ cy: '20px' }, { cy: WATER_Y + 'px' }],
      { duration: reducedMotion ? 0 : 450, easing: 'ease-in', fill: 'forwards' }
    );
    crumb.setAttribute('cy', WATER_Y);

    // утка плывёт к крошке
    const swimMs = reducedMotion ? 0 : Math.min(1600, Math.abs(x - duckX) * 4 + 400);
    duck.style.transitionDuration = swimMs + 'ms';
    duck.style.transform = `translate(${x}px, 0)`;
    // повернуть утку по направлению движения (клюв слева)
    duckFlip.style.transform = x > duckX ? 'scaleX(-1)' : '';
    duckX = x;

    // доплыла — съела
    eatTimer = setTimeout(() => {
      if (crumb) { crumb.remove(); crumb = null; }
      duckBody.classList.add('eating');
      setTimeout(() => duckBody.classList.remove('eating'), 750);
    }, swimMs);
  });
}
