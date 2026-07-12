/* ═══════════════════════════════════════════════════════════════
   DEV: перетаскивание + масштаб картинок для настройки раскладки.

   Двигать можно ТОЛЬКО активную картинку — ту, у которой в HTML стоит
   атрибут data-adjust. Остальные (просто data-imgnum) заблокированы:
   у них показывается номер и уже зафиксированное значение, но мышью
   они не двигаются. Так по очереди: настроил #2 → снял data-adjust с
   #2, повесил на #3, и т.д.

   Управление активной картинкой:
     • тащить мышью / пальцем      → двигать (translate)
     • колесо мыши над картинкой   → масштаб (scale)
     • щипок двумя пальцами        → масштаб (scale)
     • двойной клик                → сброс

   В левом-нижнем углу — HUD со значениями каждой картинки в виде
   готовой CSS-строки:  transform: translate(Xpx, Ypx) scale(S);

   Чтобы выключить: убрать <script src="dev-adjust.js"> из HTML.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  const els = document.querySelectorAll('[data-imgnum]');
  if (!els.length) return;

  // ── общий HUD в углу ──────────────────────────────────────────
  const hud = document.createElement('div');
  hud.className = 'dev-hud';
  hud.innerHTML = '<div class="dev-hud__title">IMG ADJUST — значения для CSS</div>';
  document.body.appendChild(hud);

  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const dist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

  // Считать уже зафиксированный в CSS transform, чтобы продолжать
  // настройку с этой точки. Матрица translate+scale (без вращения):
  // matrix(a, b, c, d, e, f) → scale = a, x = e, y = f.
  function readInitial(el) {
    const t = getComputedStyle(el).transform;
    const m = t && t.match(/matrix\(([^)]+)\)/);
    if (m) {
      const p = m[1].split(',').map(parseFloat);
      return { x: p[4], y: p[5], scale: p[0] };
    }
    return { x: 0, y: 0, scale: 1 };
  }

  els.forEach((el) => {
    const num = el.dataset.imgnum;
    const active = el.hasAttribute('data-adjust');
    const state = readInitial(el);

    // строка в HUD
    const row = document.createElement('div');
    row.className = 'dev-hud__row' + (active ? '' : ' is-locked');
    hud.appendChild(row);

    function render() {
      row.innerHTML =
        `<b>#${num}</b> transform: translate(${Math.round(state.x)}px, ` +
        `${Math.round(state.y)}px) scale(${state.scale.toFixed(3)});` +
        (active ? '' : ' ← fixed');
    }

    // Заблокированная картинка: показываем значение, ничего не трогаем
    // (её transform остаётся из CSS, inline-стиль не навешиваем).
    if (!active) {
      render();
      return;
    }

    el.style.cursor = 'grab';
    el.style.touchAction = 'none';
    el.style.pointerEvents = 'auto'; // на случай pointer-events:none в CSS

    function apply() {
      el.style.transform =
        `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
      render();
    }

    // ── drag + pinch через pointer events ──
    const pointers = new Map();
    let dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
    let pinchDist = 0, pinchScale = 1;

    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, e);
      row.classList.add('is-active');
      if (pointers.size === 1) {
        dragging = true;
        sx = e.clientX; sy = e.clientY; ox = state.x; oy = state.y;
        el.style.cursor = 'grabbing';
      } else if (pointers.size === 2) {
        const p = [...pointers.values()];
        pinchDist = dist(p[0], p[1]);
        pinchScale = state.scale;
        dragging = false;
      }
      e.preventDefault();
    });

    el.addEventListener('pointermove', (e) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, e);
      if (pointers.size >= 2) {
        const p = [...pointers.values()];
        const d = dist(p[0], p[1]);
        if (pinchDist > 0) {
          state.scale = clamp(pinchScale * (d / pinchDist), 0.1, 8);
          apply();
        }
      } else if (dragging) {
        state.x = ox + (e.clientX - sx);
        state.y = oy + (e.clientY - sy);
        apply();
      }
    });

    function endPointer(e) {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinchDist = 0;
      if (pointers.size === 0) {
        dragging = false;
        el.style.cursor = 'grab';
        row.classList.remove('is-active');
      }
    }
    el.addEventListener('pointerup', endPointer);
    el.addEventListener('pointercancel', endPointer);

    // ── колесо = масштаб ──
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      state.scale = clamp(state.scale * (e.deltaY < 0 ? 1.04 : 0.96), 0.1, 8);
      apply();
    }, { passive: false });

    // ── двойной клик = сброс ──
    el.addEventListener('dblclick', () => {
      state.x = 0; state.y = 0; state.scale = 1;
      apply();
    });

    apply();
  });
})();
