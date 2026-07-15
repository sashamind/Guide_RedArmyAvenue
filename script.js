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

/* ─── 3. TRAIN ALONG THE TRACK (hero, scroll-driven) ─── */

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const trainImg = document.querySelector('.hero__train-mover'); // картинка + Lottie-оверлей едут вместе
const roadImg  = document.querySelector('.hero__band-img');
const birdsEl  = document.querySelector('.hero__birds');
const heroEl   = document.querySelector('.hero');

// Вся сцена — внутри функции, а не блока if: в Safari (WebKit, Annex B)
// объявление function внутри блока рядом с let даёт
// «ReferenceError: Can't find variable» при вызове через rAF.
(function initTrainScene() {
  if (!trainImg || !heroEl || reducedMotion) return;

  // Постоянный rAF-цикл вместо связки «scroll-событие → rAF»: в Safari
  // события скролла с трекпадом приходят нестабильно, и поезд замирал
  // после первых пикселей. Цикл читает scrollY каждый кадр и пишет
  // transform только при изменении — в простое это одно сравнение строк.
  var lastKey = '';

  var applyScene = function () {
    const h = heroEl.offsetHeight || window.innerHeight;
    // scrollY читаем из всех возможных источников: в Safari при
    // overflow-x:hidden на html/body скроллером может быть body,
    // и window.scrollY остаётся 0
    const y = Math.max(
      window.scrollY || 0,
      document.documentElement.scrollTop || 0,
      document.body.scrollTop || 0
    );
    // прогресс скролла сквозь первый экран: 0 (верх) … 1 (низ hero)
    const p = Math.min(1, Math.max(0, y / h));
    const w = window.innerWidth;
    const key = p.toFixed(4) + ':' + w;

    if (key !== lastKey) {
      lastKey = key;
      // translate3d, а не translateX: десктопный Safari без собственного
      // GPU-слоя не перерисовывает transform внутри scale-родителя
      if (w <= 860) {
        // мобильный параллакс: поезд влево, дорога и птицы слегка вправо.
        // Величины «визуальные»: сцена теперь увеличена шириной, не scale
        trainImg.style.transform = `translate3d(${-p * 269}px, 0, 0)`;
        if (roadImg)  roadImg.style.transform  = `translate3d(${p * 80}px, 0, 0)`;
        if (birdsEl)  birdsEl.style.transform  = `translate3d(${p * 75}px, 0, 0)`;
      } else {
        // десктоп: паровоз едет влево (вперёд) вдвое медленнее, дорога/птицы неподвижны
        trainImg.style.transform = `translate3d(${-p * w * 0.65}px, 0, 0)`;
        if (roadImg)  roadImg.style.transform  = 'translate3d(0, 0, 0)';
        if (birdsEl)  birdsEl.style.transform  = 'translate3d(0, 0, 0)';
      }
    }
    requestAnimationFrame(applyScene);
  };

  requestAnimationFrame(applyScene);

  // Safari: после въезда снимаем с обёртки анимацию с fill:forwards —
  // иначе компоузер продолжает «держать» слой и мешает трансформам ниже
  var trainWrap = document.querySelector('.hero__train');
  if (trainWrap) {
    trainWrap.addEventListener('animationend', function (e) {
      if (e.animationName === 'train-move') {
        trainWrap.style.opacity = '1';
        trainWrap.style.animation = 'none';
      }
    });
  }
})();

/* ─── 3a. LOTTIE-АНИМАЦИИ hero (птицы, поезд) — покадровый режим.
   Stop-motion: длительность как в файле, но кадр обновляется STEP_FPS
   раз в секунду; между итерациями пауза. Статичные PNG остаются
   фолбэком: без JS/CDN или при reduced-motion анимация не стартует.
   Инициализация по window.load — deferred-плеер к этому моменту готов. ─── */

var initStopMotionLottie = function (wrap, path, opts) {
  if (!wrap || reducedMotion || !window.lottie) return;

  var img = wrap.querySelector('img');
  var box = document.createElement('div');
  box.className = opts.className;
  wrap.appendChild(box);

  var anim = window.lottie.loadAnimation({
    container: box,
    renderer: 'svg',
    loop: false,
    autoplay: false,          // воспроизведение вручную — покадрово
    path: path
  });

  var STEP_FPS = 12;          // визуальная частота кадров

  anim.addEventListener('DOMLoaded', function () {
    if (opts.hideImg && img) img.style.display = 'none';
    anim.setSubframe(false);  // без межкадровой интерполяции

    var srcFps = anim.frameRate || 30;
    var total  = anim.totalFrames;
    var frame  = 0;

    var startPlayback = function () {
      var timer = setInterval(function () {
        frame += srcFps / STEP_FPS;
        if (frame >= total) {
          clearInterval(timer);
          frame = 0;
          anim.goToAndStop(0, true);
          setTimeout(startPlayback, opts.pauseMs);
          return;
        }
        anim.goToAndStop(frame, true);
      }, 1000 / STEP_FPS);
    };

    startPlayback();
  });
};

window.addEventListener('load', function () {
  var SB = 'https://vxxzyggeogbjxjlrhcus.supabase.co/storage/v1/object/public/images/';

  // птицы: анимация вместо статичной картинки, пауза 3с
  initStopMotionLottie(document.querySelector('.hero__birds'), SB + 'birds_lottie.json', {
    className: 'hero__birds-anim', hideImg: true, pauseMs: 3000
  });

  // поезд: Lottie-оверлей ПОВЕРХ картинки, пауза на секунду дольше — 4с
  initStopMotionLottie(document.querySelector('.hero__train-mover'), SB + 'train_lottie.json?v=2', {
    className: 'hero__train-anim', hideImg: false, pauseMs: 4000
  });
});

/* ─── 3b. HERO TITLE FIT (мобильный): максимально крупный, но в экран ─── */

(function fitHeroTitle() {
  var t = document.querySelector('.hero__title');
  if (!t) return;

  var fit = function () {
    if (window.innerWidth > 860) { t.style.fontSize = ''; return; }
    // старт ~13vw (≈ ×1.5 к прежним 8.8vw), потолок 64px
    var size = Math.min(Math.round(window.innerWidth * 0.13), 64);
    t.style.fontSize = size + 'px';
    // ужимаем по пикселю, пока самая длинная строка не поместится
    var guard = 48;
    while (guard-- > 0 && t.scrollWidth > t.clientWidth && size > 20) {
      size -= 1;
      t.style.fontSize = size + 'px';
    }
  };

  window.addEventListener('resize', fit);
  fit();
  // пересчитать после загрузки шрифта (метрики меняются)
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
})();

/* ─── 4. NAV — SCROLL STATE & PROGRESS BAR ─── */

const nav      = document.getElementById('nav');
const progress = document.getElementById('navProgress');

if (nav) {
  window.addEventListener('scroll', () => {
    const scrollY    = window.scrollY;
    const maxScroll  = document.body.scrollHeight - window.innerHeight;
    const pct        = maxScroll > 0 ? scrollY / maxScroll : 0;

    nav.classList.toggle('scrolled', scrollY > 60);

    // проскроллили дальше — гасим мигание кнопки «Начать прогулку»
    if (scrollY > 40) document.body.classList.add('cta-stop');

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

/* skip-link не перехватываем: нативный переход по якорю переносит фокус */
document.querySelectorAll('a[href^="#"]:not(.skip-link)').forEach((anchor) => {
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
  z-index: -1;
  width: 360px;
  height: 360px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255,224,198,0.55) 0%, rgba(255,224,198,0.22) 40%, transparent 72%);
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

const gubCities = document.querySelectorAll('.gub-city');
const gubInfo   = document.querySelector('.gub-info');
const gubView   = document.querySelector('.gub-info__viewport');
const gubTrack  = document.getElementById('gubTrack');
const gubItems  = gubTrack ? Array.prototype.slice.call(gubTrack.querySelectorAll('.gub-info__item')) : [];
const gubDots   = Array.prototype.slice.call(document.querySelectorAll('.gub-info__dot'));
const gubMobile = () => window.matchMedia('(max-width: 860px)').matches;

/* веб: активное описание — по центру видимой области слайдера */
function gubCenter() {
  if (!gubTrack || !gubView) return;
  if (gubMobile()) { gubTrack.style.transform = ''; return; }
  const active = gubTrack.querySelector('.gub-info__item.is-active');
  if (!active) return;
  const y = gubView.clientHeight / 2 - (active.offsetTop + active.offsetHeight / 2);
  gubTrack.style.transform = 'translateY(' + y + 'px)';
}

/* мобилка: докрутить горизонтальный слайдер до активной карточки */
function gubScrollToActive(instant) {
  if (!gubTrack) return;
  const active = gubTrack.querySelector('.gub-info__item.is-active');
  if (!active) return;
  gubTrack.scrollTo({
    left: active.offsetLeft - (gubTrack.clientWidth - active.offsetWidth) / 2,
    behavior: instant ? 'auto' : 'smooth',
  });
}

function gubSelect(key, fromScroll) {
  gubCities.forEach((c) => c.classList.toggle('is-active', c.dataset.city === key));
  gubItems.forEach((i) => i.classList.toggle('is-active', i.dataset.city === key));
  gubDots.forEach((d) => d.classList.toggle('is-active', d.dataset.city === key));
  if (gubMobile()) {
    if (!fromScroll) gubScrollToActive();
  } else {
    gubCenter();
  }
}

gubCities.forEach((city) => {
  const select = () => gubSelect(city.dataset.city);
  city.addEventListener('click', select);
  city.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      select();
    }
  });
});

gubItems.forEach((item) => {
  item.addEventListener('click', () => gubSelect(item.dataset.city));
});

gubDots.forEach((dot) => {
  dot.addEventListener('click', () => gubSelect(dot.dataset.city));
});

/* мобилка: свайп слайдера — активной сразу становится карточка,
   ближайшая к центру экрана (без ожидания конца скролла) */
var gubScrollRaf = 0;
if (gubTrack) {
  gubTrack.addEventListener('scroll', function () {
    if (!gubMobile() || gubScrollRaf) return;
    gubScrollRaf = requestAnimationFrame(function () {
      gubScrollRaf = 0;
      const center = gubTrack.scrollLeft + gubTrack.clientWidth / 2;
      let best = null;
      let bestD = Infinity;
      gubItems.forEach(function (i) {
        const d = Math.abs(i.offsetLeft + i.offsetWidth / 2 - center);
        if (d < bestD) { bestD = d; best = i; }
      });
      if (best && !best.classList.contains('is-active')) {
        gubSelect(best.dataset.city, true);
      }
    });
  }, { passive: true });
}

/* колесо над слайдером листает точки; на границах отдаём скролл странице */
var gubWheelAt = 0;
if (gubInfo) {
  gubInfo.addEventListener('wheel', function (e) {
    if (gubMobile() || !gubItems.length) return;
    const idx  = gubItems.findIndex((i) => i.classList.contains('is-active'));
    const next = idx + (e.deltaY > 0 ? 1 : -1);
    if (next < 0 || next >= gubItems.length) return;
    e.preventDefault();
    const now = Date.now();
    if (now - gubWheelAt < 450) return;
    gubWheelAt = now;
    gubSelect(gubItems[next].dataset.city);
  }, { passive: false });

  const gubSync = () => { gubMobile() ? gubScrollToActive(true) : gubCenter(); };
  window.addEventListener('resize', gubSync);
  window.addEventListener('load', gubSync);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(gubSync);
  gubSync();
}

/* «Подробнее»: разворачивание скрытой части абзаца под картой */
const gubMoreBox = document.getElementById('gubMore');
const gubMoreBtn = document.getElementById('gubMoreBtn');

if (gubMoreBox && gubMoreBtn) {
  gubMoreBtn.addEventListener('click', () => {
    const open = gubMoreBox.classList.toggle('is-open');
    gubMoreBtn.classList.toggle('is-open', open);
    gubMoreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    gubMoreBtn.querySelector('.expand-toggle__label').textContent =
      open ? 'Свернуть' : 'Узнать больше';
  });
}

/* ─── 12a. RAILS SKETCH — наклон меняется при скроле (7° → −7°) ─── */

(function () {
  var railsImg = document.querySelector('.era__rails img');
  if (!railsImg) return;
  var railsTick = false;

  function railsUpdate() {
    railsTick = false;
    /* на мобильном рельсы стоят в потоке между заголовком и текстом — без наклона */
    if (window.matchMedia('(max-width: 860px)').matches) {
      railsImg.style.transform = '';
      return;
    }
    var r = railsImg.getBoundingClientRect();
    var vh = window.innerHeight || 1;
    /* 0 — картинка у нижнего края экрана, 1 — у верхнего */
    var t = 1 - (r.top + r.height / 2) / vh;
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    railsImg.style.transform = 'rotate(' + (7 - 14 * t).toFixed(2) + 'deg)';
  }

  window.addEventListener('scroll', function () {
    if (!railsTick) { railsTick = true; requestAnimationFrame(railsUpdate); }
  }, { passive: true });
  window.addEventListener('resize', railsUpdate);
  railsUpdate();
})();

/* ─── 12b. PORTICO STACK — накопительное наложение облика вокзала ─── */

(function () {
  var steps  = document.getElementById('porticoSteps');
  var stack  = document.getElementById('porticoStack');
  if (!steps || !stack) return;

  var btns    = Array.prototype.slice.call(steps.querySelectorAll('.portico-step'));
  var layers  = Array.prototype.slice.call(stack.querySelectorAll('.portico-layer'));
  var caption = document.getElementById('porticoCaption');

  function setStep(n) {
    layers.forEach(function (l) {
      l.classList.toggle('is-on', +l.dataset.step <= n);
    });
    btns.forEach(function (b) {
      var on = +b.dataset.step === n;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      if (on && caption) caption.textContent = b.dataset.caption;
    });
  }

  var current = 1;
  var timer = null;

  function go(n) {
    current = n;
    setStep(n);
  }

  function schedule() {
    if (timer) clearInterval(timer);
    timer = setInterval(function () {
      go(current % btns.length + 1);   // 1→2→3→1 по кругу
    }, 4000);
  }

  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      go(+b.dataset.step);
      schedule();                       // клик перезапускает отсчёт
    });
  });

  schedule();
})();

/* ─── 12c. STACK GALLERY — стопка фото + лайтбокс ─── */

(function () {
  var gallery = document.getElementById('stackGallery');
  var lightbox = document.getElementById('lightbox');
  if (!gallery) return;

  var cards = Array.prototype.slice.call(gallery.querySelectorAll('.stack-card'));
  var n = cards.length;

  /* случайный порядок при каждой загрузке */
  var order = cards.map(function (_, i) { return i; });
  for (var i = order.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var t = order[i]; order[i] = order[j]; order[j] = t;
  }

  function rnd(min, max) { return min + Math.random() * (max - min); }

  cards.forEach(function (card, idx) {
    var pos = order[idx];                 // позиция при разъезде (0..n-1)
    card.style.setProperty('--i', pos);
    card.style.setProperty('--n', n);
    card.style.setProperty('--z', pos + 1); // верхняя = наибольший индекс
    /* случайный лёгкий наклон в стопке */
    card.style.setProperty('--rp', rnd(-6, 6).toFixed(2) + 'deg');
    /* хаотичный разлёт: свой наклон и вертикальный сдвиг */
    var rs = rnd(-11, 11);
    card.style.setProperty('--rs', rs.toFixed(2) + 'deg');
    card.style.setProperty('--sy', rnd(6, 128).toFixed(0) + 'px');
    /* при наведении — доворот на пару градусов в сторону от текущего угла */
    card.style.setProperty('--rh', (rs + (rs >= 0 ? -4 : 4)).toFixed(2) + 'deg');
    /* мобильный: ячейка в сетке 2×2 берётся по DOM-порядку (как раскладывает
       grid auto-flow), иначе сбор в кучу считается от чужой ячейки и разъезжается;
       перемешивание оставляем стопке (z-index) и наклону */
    card.style.setProperty('--col', idx % 2);
    card.style.setProperty('--row', Math.floor(idx / 2));
    card.style.setProperty('--my', rnd(0, 20).toFixed(0) + 'px');
  });

  /* лайтбокс */
  if (lightbox) {
    var lbImg = document.getElementById('lightboxImg');
    var lbClose = document.getElementById('lightboxClose');

    function open(src, alt) {
      lbImg.src = src;
      lbImg.alt = alt || '';
      lightbox.hidden = false;
      lightbox.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(function () { lightbox.classList.add('is-open'); });
    }
    function close() {
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      setTimeout(function () { lightbox.hidden = true; lbImg.src = ''; }, 300);
    }

    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        var img = card.querySelector('img');
        open(card.dataset.full, img ? img.alt : '');
      });
    });
    lbClose.addEventListener('click', close);
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox) close();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !lightbox.hidden) close();
    });
  }

  /* мобильный: стопка плавно разъезжается в сетку, когда её центр
     подходит к центру экрана, и собирается обратно при прокрутке дальше */
  var galMq = window.matchMedia('(max-width: 860px)');
  var galTick = false;
  function galUpdate() {
    galTick = false;
    if (!galMq.matches) { gallery.classList.remove('is-expanded'); return; }
    var r = gallery.getBoundingClientRect();
    var vh = window.innerHeight || 1;
    var c = r.top + r.height / 2;
    gallery.classList.toggle('is-expanded', c > vh * 0.40 && c < vh * 0.62);
  }
  window.addEventListener('scroll', function () {
    if (!galTick) { galTick = true; requestAnimationFrame(galUpdate); }
  }, { passive: true });
  window.addEventListener('resize', galUpdate);
  galUpdate();
})();

/* ─── 12d. ЦИТАТА-ЗАЯВЛЕНИЕ — печатается при появлении в экране ─── */

(function () {
  var el = document.getElementById('statementType');
  if (!el) return;
  var full = el.textContent.replace(/\s+/g, ' ').trim();
  el.textContent = full;
  if (reducedMotion) return;

  /* фиксируем высоту по полному тексту, чтобы контент ниже не прыгал,
     затем очищаем — печать начнётся, когда доскроллим */
  requestAnimationFrame(function () {
    el.style.minHeight = el.offsetHeight + 'px';
    el.textContent = '';

    var started = false;
    function type() {
      if (started) return;
      started = true;
      el.classList.add('is-typing');
      var i = 0;
      (function step() {
        el.textContent = full.slice(0, i);
        if (i < full.length) {
          i++;
          /* чуть медленнее на паузах-знаках — живее */
          var ch = full.charAt(i - 1);
          setTimeout(step, ch === ',' || ch === '—' ? 120 : 30);
        } else {
          el.classList.remove('is-typing');
        }
      })();
    }

    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { type(); io.disconnect(); }
    }, { threshold: 0.6 });
    io.observe(el);
  });
})();

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

/* ─── 14. HUB STOPS — выделение + линия-прогресс ─── */
/* десктоп: по наведению на карточку; мобильный: по центру экрана при скролле */

const hubStops     = document.querySelectorAll('.hub-stop');
const stopsEl      = document.querySelector('.hub-stops');
const routeProgress = document.querySelector('.hub-stops__progress');

if (hubStops.length && stopsEl) {
  const nodes    = stopsEl.querySelectorAll('.hub-stop__node');
  // десктоп = наведение, ≤860 = скролл (совпадает с CSS-гейтингом)
  const hoverMq  = window.matchMedia('(min-width: 861px)');

  function nodeCenterY(node) {
    const sr = stopsEl.getBoundingClientRect();
    const nr = node.getBoundingClientRect();
    return (nr.top + nr.height / 2) - sr.top;
  }

  // отрисовка: fillY — докуда залита линия (коорд. списка), active — выделенная
  // синеет только активная остановка; линия доходит до неё
  function render(fillY, activeStop) {
    if (!nodes.length) return;
    const firstY = nodeCenterY(nodes[0]);
    const lastY  = nodeCenterY(nodes[nodes.length - 1]);
    const clamped = Math.min(lastY, Math.max(firstY, fillY));

    hubStops.forEach((s) => {
      s.classList.toggle('is-active', s === activeStop);
    });

    if (routeProgress) {
      const span = Math.max(1, lastY - firstY);
      routeProgress.style.top    = firstY + 'px';
      routeProgress.style.height = span + 'px';
      const ratio = activeStop ? (clamped - firstY) / span : 0;
      routeProgress.style.transform       = 'scaleY(' + ratio + ')';
      routeProgress.style.webkitTransform = 'scaleY(' + ratio + ')';
    }
  }

  if (hoverMq.matches) {
    /* ── ДЕСКТОП: карточка раскрывается, прогресс опускается до неё ── */
    let settleTimer;
    function activate(stop) {
      render(nodeCenterY(stop.querySelector('.hub-stop__node')), stop);
      // карточка раскрывается ~0.5s, её узел смещается — пересчитаем после
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        if (stop.classList.contains('is-active')) {
          render(nodeCenterY(stop.querySelector('.hub-stop__node')), stop);
        }
      }, 540);
    }

    hubStops.forEach((stop) => {
      stop.addEventListener('mouseenter', () => activate(stop));
    });
    stopsEl.addEventListener('mouseleave', () => { clearTimeout(settleTimer); render(-1e6, null); });
    render(-1e6, null);
  } else {
    /* ── МОБИЛЬНЫЙ: активна остановка у центра экрана, прогресс по «указателю» ── */
    let ticking = false;

    function onScroll() {
      ticking = false;
      const mid = window.innerHeight / 2;
      let best = null;
      let bestDist = Infinity;

      hubStops.forEach((s) => {
        const r = s.getBoundingClientRect();
        const c = r.top + r.height / 2;
        const d = Math.abs(c - mid);
        if (d < bestDist) { bestDist = d; best = s; }
      });

      // активной считаем только реально подведённую к центру (а не «где-то рядом»),
      // иначе первая карточка вспыхивает ещё пока листаешь hero
      const active = best && bestDist < window.innerHeight * 0.28 ? best : null;
      // линия не ползёт за скроллом, а «проводится» до активной остановки
      if (active) {
        render(nodeCenterY(active.querySelector('.hub-stop__node')), active);
      } else {
        render(-1e6, null);
      }
    }

    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(onScroll); ticking = true; }
    }, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    window.addEventListener('load', onScroll);
    onScroll();
  }

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
