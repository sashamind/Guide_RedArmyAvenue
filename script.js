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

  // рельсы (#s1860): Lottie-оверлей поверх наброска путей, пауза 3с;
  // наклон синхронизируется со скролом в §12a
  initStopMotionLottie(document.querySelector('.era__rails'), SB + 'rails_lottie.json', {
    className: 'era__rails-anim', hideImg: false, pauseMs: 3000
  });

  // птицы над иллюстрацией реки («Что ещё посмотреть»), маленькие, пауза 3с
  initStopMotionLottie(document.getElementById('riverBirds'), SB + 'birds_lottie.json', {
    className: 'nearby__river-birds-anim', hideImg: false, pauseMs: 3000
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

// мобилка: при тапе на точку карты — плавно проскроллить страницу чуть вниз,
// чтобы описание под картой попало в кадр хотя бы частично
function gubRevealInfo() {
  if (!gubMobile() || !gubInfo) return;
  const target = gubInfo.getBoundingClientRect().top + window.scrollY
                 - window.innerHeight * 0.58;
  if (target > window.scrollY + 4) {         // только вниз
    window.scrollTo({ top: target, behavior: 'smooth' });
  }
}

gubCities.forEach((city) => {
  const select = () => { gubSelect(city.dataset.city); gubRevealInfo(); };
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
  var railsAnim = null;
  /* Lottie-оверлей создаётся по window.load — берём его лениво */
  function anim() {
    if (!railsAnim) railsAnim = document.querySelector('.era__rails-anim');
    return railsAnim;
  }

  function apply(tf) {
    railsImg.style.transform = tf;
    var a = anim();
    if (a) a.style.transform = tf;   // оверлей наклоняется синхронно с наброском
  }

  function railsUpdate() {
    railsTick = false;
    var r = railsImg.getBoundingClientRect();
    var vh = window.innerHeight || 1;
    /* 0 — картинка у нижнего края экрана, 1 — у верхнего */
    var t = 1 - (r.top + r.height / 2) / vh;
    if (t < 0) t = 0;
    if (t > 1) t = 1;
    apply('rotate(' + (7 - 14 * t).toFixed(2) + 'deg)');
  }

  window.addEventListener('scroll', function () {
    if (!railsTick) { railsTick = true; requestAnimationFrame(railsUpdate); }
  }, { passive: true });
  window.addEventListener('resize', railsUpdate);
  /* повторный расчёт после load — к этому моменту Lottie-оверлей уже создан */
  window.addEventListener('load', railsUpdate);
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

  function stop() {
    if (timer) { clearInterval(timer); timer = null; }
  }
  function start() {
    stop();
    timer = setInterval(function () {
      go(current % btns.length + 1);   // 1→2→3→1 по кругу
    }, 4000);
  }

  btns.forEach(function (b) {
    b.addEventListener('click', function () {
      go(+b.dataset.step);
      start();                          // клик перезапускает отсчёт
    });
  });

  /* цикл идёт только пока блок в поле зрения; при появлении всегда
     начинаем с шага 1 («тогда»), смена — через паузу (4с). За экраном —
     пауза и сброс к 1, чтобы при следующем доскролле снова видеть 1 */
  go(1);
  var io = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting) {
      go(1);
      start();
    } else {
      stop();
      go(1);
    }
  }, { threshold: 0.45 });
  io.observe(stack);
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

/* ═══ Панорама реки: стартовое положение скролла по центру (моб.) ═══ */
(() => {
  const box = document.querySelector('.nearby__river');
  if (!box) return;
  const img = box.querySelector('img');
  if (!img) return;
  const hint = document.getElementById('riverHint');

  let programmatic = false;
  let userScrolled = false;
  function center() {
    // не пересчитываем, если пользователь уже листал панораму сам
    if (userScrolled) return;
    // только когда контент шире контейнера (мобильный режим со скроллом)
    const extra = box.scrollWidth - box.clientWidth;
    if (extra > 1) {
      programmatic = true;
      box.scrollLeft = extra / 2;
      setTimeout(() => { programmatic = false; }, 120);
    }
  }

  box.addEventListener('scroll', () => {
    if (programmatic) return;
    // настоящий скролл пользователя — фиксируем позицию и гасим подсказку
    userScrolled = true;
    if (hint) hint.classList.add('is-hidden');
  }, { passive: true });

  if (img.complete) center();
  else img.addEventListener('load', center);

  // ВАЖНО: в мобильном Safari прокрутка страницы показывает/прячет адресную
  // строку → срабатывает resize только по высоте. Пересчитываем центр лишь при
  // реальной смене ширины, иначе горизонтальный скролл панорамы сбрасывался.
  let lastW = window.innerWidth;
  window.addEventListener('resize', () => {
    if (window.innerWidth === lastW) return;
    lastW = window.innerWidth;
    center();
  });
})();

/* ═══ Утки: N штук в случайных местах внутри зоны (зона — в % от иллюстрации) ═══ */
(() => {
  const DUCKS = 3;
  const stage = document.querySelector('.nearby__river-stage');
  const zone  = document.getElementById('riverDuckZone');
  const first = document.querySelector('.nearby__river-duck');
  if (!stage || !zone || !first) return;

  // доводим количество уток до нужного клонированием шаблона
  const ducks = [first];
  for (let i = 1; i < DUCKS; i++) {
    const c = first.cloneNode(true);
    first.parentNode.appendChild(c);
    ducks.push(c);
  }

  // состояние движения для каждой утки (смещения x/y в px поверх базовой позиции)
  const wob = ducks.map((el) => ({
    el, x: 0, y: 0, targetX: 0, targetY: 0,
    dir: Math.random() < 0.5 ? -1 : 1, wait: Math.random() * 60,
    sx: 0, sy: 0                                     // индивидуальный разброс при сборе к точке
  }));

  // точка притяжения (тап/наведение), в координатах вьюпорта
  let attract = null, attractUntil = 0;

  // ограничить смещение так, чтобы утка осталась внутри зоны
  function clampOff(el, ox, oy, s, z) {
    const baseCx = el.offsetLeft + el.offsetWidth  / 2;
    const baseCy = el.offsetTop  + el.offsetHeight / 2;
    const zL = z.left - s.left, zT = z.top - s.top;
    const minX = zL + el.offsetWidth  / 2 - baseCx;
    const maxX = zL + z.width  - el.offsetWidth  / 2 - baseCx;
    const minY = zT + el.offsetHeight / 2 - baseCy;
    const maxY = zT + z.height - el.offsetHeight / 2 - baseCy;
    return [Math.max(minX, Math.min(maxX, ox)), Math.max(minY, Math.min(maxY, oy))];
  }

  function place() {
    const s = stage.getBoundingClientRect();
    const z = zone.getBoundingClientRect();
    if (!s.width || !z.width) return;                 // ещё не отрисовано
    const placed = [];                                // px-центры уже размещённых
    const tops = [];                                  // {duck, ty} — для слоёв по глубине
    ducks.forEach((duck) => {
      const d = duck.getBoundingClientRect();
      if (!d.width) return;
      const freeX = Math.max(0, z.width  - d.width);
      const freeY = Math.max(0, z.height - d.height);
      // случайное место; несколько попыток, чтобы утки сильно не наезжали друг на друга
      let lx = 0, ty = 0;
      for (let t = 0; t < 12; t++) {
        lx = (z.left - s.left) + Math.random() * freeX;
        ty = (z.top  - s.top ) + Math.random() * freeY;
        const cx = lx + d.width / 2, cy = ty + d.height / 2;
        const ok = placed.every((p) =>
          Math.hypot(p.x - cx, p.y - cy) > d.width * 1.4);
        if (ok || t === 11) { placed.push({ x: cx, y: cy }); break; }
      }
      // базовая позиция в % от иллюстрации → сохраняется во всех адаптивах
      duck.style.left = (lx / s.width  * 100) + '%';
      duck.style.top  = (ty / s.height * 100) + '%';
      tops.push({ duck: duck, ty: ty });
    });
    // слои по глубине: кто ниже по экрану (больше ty) — тот выше в стеке (перекрывает)
    tops.sort((a, b) => a.ty - b.ty)
        .forEach((o, i) => { o.duck.style.zIndex = 2 + i; });
  }

  // движение: обычно — лёгкое покачивание; при тапе/наведении — заплыв к точке.
  // едет вправо — иллюстрация как есть, влево — отражается (scaleX -1)
  function tick() {
    const now = performance.now();
    const s = stage.getBoundingClientRect();
    const z = zone.getBoundingClientRect();
    const amp = z.width * 0.10;                        // размах покачивания
    const chasing = attract && now < attractUntil;
    if (!chasing) attract = null;

    wob.forEach((st) => {
      const el = st.el;
      if (chasing) {
        // цель = точка притяжения + индивидуальный разброс (собираются рядом, не в кучу)
        const px = attract.x - s.left, py = attract.y - s.top;
        const baseCx = el.offsetLeft + el.offsetWidth  / 2;
        const baseCy = el.offsetTop  + el.offsetHeight / 2;
        const c = clampOff(el, px + st.sx - baseCx, py + st.sy - baseCy, s, z);
        st.targetX = c[0]; st.targetY = c[1];
        st.wait = 0;
      } else if (st.wait > 0) {
        st.wait -= 1;
      } else {
        const dx = st.targetX - st.x, dy = st.targetY - st.y;
        if (Math.hypot(dx, dy) < 0.6) {               // доплыли — новая случайная цель
          const c = clampOff(el,
            st.x + (Math.random() * 2 - 1) * amp,
            st.y + (Math.random() * 2 - 1) * amp * 0.5, s, z);
          st.targetX = c[0]; st.targetY = c[1];
          st.wait = 60 + Math.random() * 160;
        }
      }
      // шаг к цели: к точке — быстрее, покачивание — медленно
      const dx = st.targetX - st.x, dy = st.targetY - st.y;
      const spd = chasing ? (amp * 0.012 + 0.6) : (amp * 0.0025 + 0.04);
      st.x += Math.sign(dx) * Math.min(Math.abs(dx), spd);
      st.y += Math.sign(dy) * Math.min(Math.abs(dy), spd);
      if (Math.abs(dx) > 0.5) st.dir = dx > 0 ? 1 : -1;  // разворот к направлению движения/точке
      el.style.transform = 'translate(' + st.x.toFixed(2) + 'px,' + st.y.toFixed(2) + 'px) scaleX(' + st.dir + ')';
    });
    requestAnimationFrame(tick);
  }

  // тап/наведение в зоне → утки плывут к точке
  function setAttract(e) {
    const z = zone.getBoundingClientRect();
    if (e.clientX < z.left || e.clientX > z.right ||
        e.clientY < z.top  || e.clientY > z.bottom) return;
    const fresh = !attract;
    attract = { x: e.clientX, y: e.clientY };
    attractUntil = now2() + 2600;                     // держим цель ~2.6с после последнего события
    if (fresh) wob.forEach((st) => {                  // разброс фиксируем на сессию притяжения
      const sc = st.el.offsetWidth * 1.6;
      st.sx = (Math.random() * 2 - 1) * sc;
      st.sy = (Math.random() * 2 - 1) * sc;
    });
  }
  function now2() { return performance.now(); }
  stage.addEventListener('pointerdown', setAttract);
  stage.addEventListener('pointermove', setAttract);

  const illo = stage.querySelector('img');            // основная иллюстрация — первая
  if (illo && !illo.complete) illo.addEventListener('load', place);
  if (!first.complete) first.addEventListener('load', place);
  window.addEventListener('load', place);
  place();
  if (!reducedMotion) requestAnimationFrame(tick);    // движение (кроме reduce-motion)
})();

/* ═══ DEV: настройка зоны утки (открыть страницу с #duckzone) ═══
   Рамку можно двигать и тянуть за угол; панель слева показывает
   top/left/width/height в % — скринишь их, и эти значения фиксируются в CSS. */
(() => {
  const stage   = document.querySelector('.nearby__river-stage');
  const zone    = document.getElementById('riverDuckZone');
  const handle  = zone && zone.querySelector('.nearby__river-zone__handle');
  const readout = document.getElementById('duckZoneReadout');
  if (!stage || !zone) return;

  let active = false;
  function activate() {
    if (active || !/duckzone/i.test(location.hash)) return;
    active = true;
    document.documentElement.classList.add('duckzone-dev');
    show();
  }
  // работает и при полной загрузке с #duckzone, и когда хэш дописали к открытой странице
  window.addEventListener('hashchange', activate);

  function pct() {
    const s = stage.getBoundingClientRect();
    const z = zone.getBoundingClientRect();
    return {
      top:    (z.top  - s.top ) / s.height * 100,
      left:   (z.left - s.left) / s.width  * 100,
      width:   z.width  / s.width  * 100,
      height:  z.height / s.height * 100
    };
  }
  function show() {
    const p = pct();
    if (readout) readout.textContent =
      'top:    ' + p.top.toFixed(1)    + '%\n' +
      'left:   ' + p.left.toFixed(1)   + '%\n' +
      'width:  ' + p.width.toFixed(1)  + '%\n' +
      'height: ' + p.height.toFixed(1) + '%';
  }
  show();
  window.addEventListener('resize', show);

  let mode = null, sx = 0, sy = 0, sLeft = 0, sTop = 0, sW = 0, sH = 0;
  function down(e, m) {
    mode = m;
    const s = stage.getBoundingClientRect();
    const z = zone.getBoundingClientRect();
    sx = e.clientX; sy = e.clientY;
    sLeft = z.left - s.left; sTop = z.top - s.top; sW = z.width; sH = z.height;
    e.preventDefault();
    e.stopPropagation();
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }
  function move(e) {
    if (!mode) return;
    const s = stage.getBoundingClientRect();
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (mode === 'move') {
      zone.style.left = ((sLeft + dx) / s.width  * 100) + '%';
      zone.style.top  = ((sTop  + dy) / s.height * 100) + '%';
    } else {
      zone.style.width  = (Math.max(8, sW + dx) / s.width  * 100) + '%';
      zone.style.height = (Math.max(8, sH + dy) / s.height * 100) + '%';
    }
    show();
  }
  function up() {
    mode = null;
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
  }
  if (handle) handle.addEventListener('pointerdown', (e) => down(e, 'resize'));
  zone.addEventListener('pointerdown', (e) => {
    if (e.target === handle) return;
    down(e, 'move');
  });

  activate();                       // если страница загрузилась уже с #duckzone
  window.addEventListener('load', activate);
})();
