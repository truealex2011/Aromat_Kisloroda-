/* ============ Аромат Кислорода / v2 ============ */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const root = document.documentElement;
  const body = document.body;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---------- загрузчик ---------- */
  const loader = $('#loader');
  const loaderNum = $('#loaderNum');
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    loader.classList.add('out');
    body.classList.remove('loading');
    body.classList.add('ready');
    P.v = 2.4; // стартовый толчок маятника
  };
  // страховка: контент покажется, даже если что-то ниже сломается
  setTimeout(start, 3200);
  const loadT0 = performance.now();
  const loadTick = (now) => {
    const p = clamp((now - loadT0) / 1500, 0, 1);
    loaderNum.textContent = Math.round((1 - Math.pow(1 - p, 3)) * 21);
    if (p < 1) requestAnimationFrame(loadTick); else setTimeout(start, 350);
  };

  /* ---------- маятник (состояние) ---------- */
  const P = { a: -0.5, v: 0, rest: 0, ry: 0, ryT: 0, drag: false, lastA: 0, lastT: 0 };
  requestAnimationFrame(loadTick);

  /* ---------- разбивка текста на слова ---------- */
  const splitWords = (el, inner) => {
    let i = 0;
    const fill = (target, nodes) => {
      nodes.forEach((n) => {
        if (n.nodeType === 3) {
          n.textContent.split(/(\s+)/).forEach((tok) => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { target.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w';
            w.style.setProperty('--i', i++);
            if (inner) { const s = document.createElement('span'); s.textContent = tok; w.appendChild(s); }
            else w.textContent = tok;
            target.appendChild(w);
          });
        } else if (n.nodeType === 1) {
          const c = n.cloneNode(false);
          target.appendChild(c);
          fill(c, Array.from(n.childNodes));
        }
      });
    };
    const nodes = Array.from(el.childNodes);
    el.textContent = '';
    fill(el, nodes);
    return $$('.w', el);
  };
  $$('[data-split]').forEach((el) => splitWords(el, true));
  const scrubEl = $('#scrub');
  const scrubWords = splitWords(scrubEl, false);

  /* ---------- плавный скролл ---------- */
  let lenis = null;
  if (window.Lenis && !reduced) {
    try { lenis = new window.Lenis({ lerp: 0.1 }); } catch (_) { lenis = null; }
  }
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const t = $(a.getAttribute('href'));
      if (!t) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(t, { duration: 1.6 });
      else t.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
    });
  });
  const lockScroll = (on) => { if (lenis) { if (on) lenis.stop(); else lenis.start(); } };

  /* ---------- появление, счётчики, тёмные секции ---------- */
  const animateCount = (el) => {
    const to = Number(el.dataset.count);
    const from = Number(el.dataset.from || 0);
    const t0 = performance.now();
    const step = (now) => {
      const p = clamp((now - t0) / 2000, 0, 1);
      const e = 1 - Math.pow(1 - p, 4);
      el.textContent = Math.round(lerp(from, to, e)).toLocaleString('ru-RU');
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  $$('.rise').forEach((el) => {
    const sibs = Array.from(el.parentElement.children).filter((c) => c.classList.contains('rise'));
    el.style.setProperty('--i', sibs.indexOf(el));
  });
  const revealEls = $$('.rise, [data-split]');
  const themeMeta = $('meta[name="theme-color"]');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        $$('[data-count]', en.target).forEach(animateCount);
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach((el) => io.observe(el));

    const inkNow = new Set();
    const dio = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) inkNow.add(en.target); else inkNow.delete(en.target); });
      const ink = inkNow.size > 0;
      body.classList.toggle('ink', ink);
      if (themeMeta) themeMeta.content = ink ? '#0c0c0d' : '#edeae3';
    }, { rootMargin: '-50% 0px -50% 0px' });
    $$('[data-ink]').forEach((el) => dio.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  /* ---------- курсор ---------- */
  const cursor = $('#cursor');
  const cursorDot = $('span', cursor);
  const mouse = { x: innerWidth / 2, y: innerHeight / 2, cx: innerWidth / 2, cy: innerHeight / 2, seen: false };
  if (fine) {
    root.classList.add('has-cursor');
    $$('[data-cursor]').forEach((el) => {
      el.addEventListener('pointerenter', () => { cursorDot.textContent = el.dataset.cursor; cursor.classList.add('big'); });
      el.addEventListener('pointerleave', () => cursor.classList.remove('big'));
    });
    // магнитные кнопки
    $$('.btn').forEach((b) => {
      b.addEventListener('pointermove', (e) => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${((e.clientX - r.left) / r.width - 0.5) * 14}px, ${((e.clientY - r.top) / r.height - 0.5) * 10}px)`;
      });
      b.addEventListener('pointerleave', () => { b.style.transform = ''; });
    });
  }

  /* ---------- бегущая строка ---------- */
  const ticker = $('#ticker');
  ticker.innerHTML += ticker.innerHTML;
  let tickerX = 0, tickerHalf = 0, tickerDir = -1;

  /* ---------- горизонтальная секция ---------- */
  const pin = $('#notes');
  const pinTrack = $('#pinTrack');
  const pinBar = $('#pinBar');
  const pinNow = $('#pinNow');
  const panels = $$('.panel', pinTrack);
  let pinMax = 0, pinTop = 0;

  const measure = () => {
    tickerHalf = ticker.scrollWidth / 2;
    pinMax = Math.max(0, pinTrack.scrollWidth - innerWidth);
    pin.style.height = (innerHeight + pinMax) + 'px';
    pinTop = pin.getBoundingClientRect().top + window.scrollY;
  };

  /* ---------- 3D: ароматизатор ---------- */
  const hero = $('#hero');
  const canvas = $('#gl');
  let gl = null;

  const initGL = () => {
    const T = window.THREE;
    if (!T) throw new Error('three.js не загружен');
    const renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    const scene = new T.Scene();
    const camera = new T.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.z = 10;
    const VIS_H = 2 * 10 * Math.tan((35 / 2) * Math.PI / 180);

    scene.add(new T.AmbientLight(0xffffff, 1.5));
    const key = new T.DirectionalLight(0xffffff, 2.4);
    key.position.set(-3, 4, 6);
    scene.add(key);
    const rim = new T.DirectionalLight(0x9fb0ff, 1.6);
    rim.position.set(4, -2, 3);
    scene.add(rim);

    // печать на картоне
    const tex = document.createElement('canvas');
    tex.width = 1320; tex.height = 920;
    const texture = new T.CanvasTexture(tex);
    texture.colorSpace = T.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    texture.repeat.set(1 / 3.3, 1 / 2.3);
    texture.offset.set(0.5, 0.5);
    const paint = () => {
      const c = tex.getContext('2d');
      const U = 400; // пикселей на единицу
      const X = (x) => (x / 3.3 + 0.5) * tex.width;
      const Y = (y) => (0.5 - y / 2.3) * tex.height;
      c.fillStyle = '#2740ff';
      c.fillRect(0, 0, tex.width, tex.height);
      c.strokeStyle = 'rgba(237,234,227,.9)';
      c.fillStyle = '#edeae3';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      [-0.65, 0.65].forEach((cx, i) => {
        c.lineWidth = 5;
        c.beginPath(); c.arc(X(cx), Y(0), 0.9 * U, 0, Math.PI * 2); c.stroke();
        c.lineWidth = 2;
        c.setLineDash([4, 10]);
        c.beginPath(); c.arc(X(cx), Y(0), 0.82 * U, 0, Math.PI * 2); c.stroke();
        c.setLineDash([]);
        c.font = '900 380px Unbounded, "Arial Black", sans-serif';
        c.fillText('O', X(cx), Y(0.1));
        c.font = '500 30px "JetBrains Mono", Consolas, monospace';
        c.fillText(i ? 'КИСЛОРОДА' : 'АРОМАТ', X(cx), Y(-0.56));
      });
      c.font = '500 24px "JetBrains Mono", Consolas, monospace';
      c.fillText('№ 001', X(0), Y(0.52));
      texture.needsUpdate = true;
    };
    paint();
    if (document.fonts && document.fonts.load) {
      Promise.all([document.fonts.load('900 100px Unbounded'), document.fonts.load('500 30px "JetBrains Mono"', 'АРОМАТ')]).then(paint).catch(() => {});
    }

    // форма: две окружности (молекула O2) и ушко
    const A = Math.atan2(Math.sqrt(1 - 0.65 * 0.65), -0.65);
    const shape = new T.Shape();
    shape.absarc(0.65, 0, 1, -A, A, false);
    shape.absarc(-0.65, 0, 1, Math.PI - A, Math.PI + A, false);
    const ext = { depth: 0.09, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 3, curveSegments: 72 };
    const faceMat = new T.MeshStandardMaterial({ map: texture, roughness: 0.42, metalness: 0.05 });
    const sideMat = new T.MeshStandardMaterial({ color: 0x1528c4, roughness: 0.6 });
    const cardGeo = new T.ExtrudeGeometry(shape, ext);
    cardGeo.translate(0, 0, -0.045);
    const card = new T.Mesh(cardGeo, [faceMat, sideMat]);

    const TAB_Y = 0.98;
    const tabShape = new T.Shape();
    tabShape.absarc(0, TAB_Y, 0.2, 0, Math.PI * 2, false);
    const hole = new T.Path();
    hole.absarc(0, TAB_Y + 0.04, 0.07, 0, Math.PI * 2, true);
    tabShape.holes.push(hole);
    const tabGeo = new T.ExtrudeGeometry(tabShape, { depth: 0.07, bevelEnabled: false, curveSegments: 32 });
    tabGeo.translate(0, 0, -0.035);
    const tab = new T.Mesh(tabGeo, sideMat);

    const cardGroup = new T.Group();
    cardGroup.add(card, tab);
    const pivot = new T.Group();
    pivot.add(cardGroup);
    const lineGeo = new T.BufferGeometry().setFromPoints([new T.Vector3(0, 0, 0), new T.Vector3(0, -1, 0)]);
    const line = new T.Line(lineGeo, new T.LineBasicMaterial({ color: 0x0c0c0d }));
    pivot.add(line);
    scene.add(pivot);

    // свободные молекулы
    const molGeo = new T.SphereGeometry(1, 20, 14);
    const molMat = new T.MeshStandardMaterial({ color: 0x2740ff, roughness: 0.3 });
    const mols = [];
    for (let i = 0; i < 9; i++) {
      const g = new T.Group();
      const s1 = new T.Mesh(molGeo, molMat), s2 = new T.Mesh(molGeo, molMat);
      s1.position.x = -0.7; s2.position.x = 0.7;
      g.add(s1, s2);
      g.userData = { sp: 0.12 + Math.random() * 0.25, rs: (Math.random() - 0.5) * 0.8, seed: Math.random() };
      g.scale.setScalar(0.035 + Math.random() * 0.07);
      mols.push(g);
      scene.add(g);
    }

    const S = { W: 1, H: 1, visW: 1, visH: VIS_H, scale: 1, L: 1, px: 0, py: 0 };
    const resize = () => {
      S.W = hero.clientWidth; S.H = hero.clientHeight;
      renderer.setSize(S.W, S.H, false);
      camera.aspect = S.W / S.H;
      camera.updateProjectionMatrix();
      S.visW = VIS_H * camera.aspect;
      const mobile = S.W < 820;
      S.scale = Math.min(S.visW * (mobile ? 0.8 : 0.34), VIS_H * (mobile ? 0.42 : 0.5)) / 3.3;
      S.px = mobile ? 0 : S.visW * 0.3; // на десктопе висит справа от слова «Аромат»
      S.py = VIS_H / 2 + 0.2;
      S.L = VIS_H * (mobile ? 0.38 : 0.43) + 0.2;
      pivot.position.set(S.px, S.py, 0);
      cardGroup.position.y = -S.L;
      cardGroup.scale.setScalar(S.scale);
      line.scale.y = S.L - (TAB_Y + 0.04) * S.scale;
      mols.forEach((m) => {
        m.position.set((Math.random() - 0.5) * S.visW, (Math.random() - 0.5) * VIS_H, -1 - Math.random() * 3);
      });
    };
    resize();

    const toScreen = (wx, wy) => ({ x: (wx / S.visW + 0.5) * S.W, y: (0.5 - wy / S.visH) * S.H });
    const local = (e) => { const r = canvas.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const overCard = (p) => {
      const c = toScreen(S.px + Math.sin(P.a) * S.L, S.py - Math.cos(P.a) * S.L);
      const rad = (S.scale * 1.75 / S.visW) * S.W;
      return Math.hypot(p.x - c.x, p.y - c.y) < rad;
    };
    const angleTo = (p) => {
      const o = toScreen(S.px, S.py);
      return clamp(Math.atan2(p.x - o.x, Math.max(30, p.y - o.y)), -1.2, 1.2);
    };

    canvas.addEventListener('pointerdown', (e) => {
      const p = local(e);
      if (!overCard(p)) return;
      P.drag = true; P.v = 0; P.lastA = P.a; P.lastT = performance.now();
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      const D = window.DeviceOrientationEvent;
      if (D && typeof D.requestPermission === 'function') D.requestPermission().catch(() => {});
    });
    canvas.addEventListener('pointermove', (e) => {
      const p = local(e);
      if (P.drag) {
        const now = performance.now();
        const a = angleTo(p);
        P.v = clamp((a - P.lastA) / (Math.max(8, now - P.lastT) / 1000), -8, 8);
        P.lastA = a; P.lastT = now; P.a = a;
        return;
      }
      const over = overCard(p);
      canvas.style.cursor = over ? 'grab' : '';
      if (over && e.pointerType === 'mouse') P.v += clamp(e.movementX * 0.012, -0.5, 0.5);
    });
    const release = () => { P.drag = false; };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);

    let visible = true;
    if ('IntersectionObserver' in window) new IntersectionObserver((en) => { visible = en[0].isIntersecting; }).observe(hero);

    return {
      resize,
      hideCard() { pivot.visible = false; canvas.style.pointerEvents = 'none'; },
      render(t, dt) {
        if (!visible) return;
        pivot.rotation.z = P.a;
        cardGroup.rotation.y = P.ry + (reduced ? 0 : Math.sin(t * 0.7) * 0.16);
        cardGroup.rotation.x = Math.sin(t * 0.5) * 0.04;
        mols.forEach((m) => {
          m.position.y += m.userData.sp * dt;
          m.position.x += Math.sin(t * 0.4 + m.userData.seed * 9) * 0.02 * dt * 10;
          m.rotation.z += m.userData.rs * dt;
          if (m.position.y > VIS_H / 2 + 0.6) m.position.y = -VIS_H / 2 - 0.6;
        });
        renderer.render(scene, camera);
      }
    };
  };

  try { gl = initGL(); } catch (err) { root.classList.add('no-gl'); gl = null; }

  /* ---------- фото ароматизатора вместо 3D, если файл есть ---------- */
  const photo = $('#photo');
  const photoImg = $('#photoImg');
  let hasPhoto = false;
  const probe = new Image();
  probe.onload = () => {
    photoImg.src = probe.src;
    hasPhoto = true;
    root.classList.add('has-photo');
    if (gl) gl.hideCard();
  };
  probe.src = 'assets/vonyuchka.webp';

  const photoAngle = (e) => {
    const r = hero.getBoundingClientRect();
    const ox = r.left + photo.offsetLeft, oy = r.top;
    return clamp(Math.atan2(e.clientX - ox, Math.max(30, e.clientY - oy)), -1.2, 1.2);
  };
  photoImg.addEventListener('pointerdown', (e) => {
    P.drag = true; P.v = 0; P.lastA = P.a; P.lastT = performance.now();
    try { photoImg.setPointerCapture(e.pointerId); } catch (_) {}
    const D = window.DeviceOrientationEvent;
    if (D && typeof D.requestPermission === 'function') D.requestPermission().catch(() => {});
  });
  photoImg.addEventListener('pointermove', (e) => {
    if (P.drag) {
      const now = performance.now();
      const a = photoAngle(e);
      P.v = clamp((a - P.lastA) / (Math.max(8, now - P.lastT) / 1000), -8, 8);
      P.lastA = a; P.lastT = now; P.a = a;
    } else if (e.pointerType === 'mouse') {
      P.v += clamp(e.movementX * 0.012, -0.5, 0.5);
    }
  });
  const photoRelease = () => { P.drag = false; };
  photoImg.addEventListener('pointerup', photoRelease);
  photoImg.addEventListener('pointercancel', photoRelease);
  photoImg.addEventListener('dragstart', (e) => e.preventDefault());

  window.addEventListener('pointermove', (e) => {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.seen = true;
    if (e.pointerType === 'mouse') P.ryT = (e.clientX / innerWidth - 0.5) * 0.9;
  }, { passive: true });
  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma == null) return;
    P.rest = clamp(e.gamma, -40, 40) * 0.012;
    P.ryT = clamp(e.gamma, -30, 30) * 0.02;
  });

  let lastW = innerWidth, lastH = innerHeight;
  window.addEventListener('resize', () => {
    // на телефонах высота прыгает из-за адресной строки: игнорируем
    if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 160) return;
    lastW = innerWidth; lastH = innerHeight;
    measure();
    if (gl) gl.resize();
  });
  measure();
  window.addEventListener('load', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  /* ---------- общий цикл ---------- */
  const footerWord = $('#footerWord');
  let prev = performance.now(), lastY = window.scrollY, vel = 0, lastPanel = -1;
  const frame = (now) => {
    const dt = Math.min(0.033, (now - prev) / 1000);
    prev = now;
    const t = now / 1000;
    if (lenis) lenis.raf(now);

    const y = window.scrollY;
    const dy = y - lastY;
    lastY = y;
    vel = lerp(vel, dy, 0.2);
    if (Math.abs(dy) > 0.5) tickerDir = dy > 0 ? -1 : 1;

    // маятник
    if (!P.drag) {
      P.v += clamp(dy * 0.004, -0.4, 0.4);
      const breeze = reduced ? 0 : Math.sin(t * 0.9) * 0.35;
      P.v += (-9 * (P.a - P.rest) - 0.75 * P.v + breeze) * dt;
      P.a = clamp(P.a + P.v * dt, -1.3, 1.3);
    }
    P.ry = lerp(P.ry, P.ryT + P.v * 0.12, Math.min(1, dt * 4));
    if (gl) gl.render(t, dt);
    if (hasPhoto && y < innerHeight) {
      photo.style.transform = `rotate(${(-P.a).toFixed(4)}rad)`;
      photoImg.style.transform = `translateX(-50%) perspective(900px) rotateY(${(P.ry * 0.6).toFixed(4)}rad)`;
    }

    // курсор
    if (fine && mouse.seen) {
      mouse.cx = lerp(mouse.cx, mouse.x, 0.22);
      mouse.cy = lerp(mouse.cy, mouse.y, 0.22);
      cursor.style.transform = `translate(${mouse.cx.toFixed(1)}px, ${mouse.cy.toFixed(1)}px)`;
    }

    // бегущая строка
    if (tickerHalf > 0 && !reduced) {
      tickerX += tickerDir * (70 * dt + Math.abs(vel) * 0.45);
      if (tickerX <= -tickerHalf) tickerX += tickerHalf;
      if (tickerX > 0) tickerX -= tickerHalf;
      ticker.style.transform = `translateX(${tickerX.toFixed(1)}px)`;
    }

    // манифест: слова проявляются по скроллу
    const sr = scrubEl.getBoundingClientRect();
    if (sr.bottom > 0 && sr.top < innerHeight) {
      const p = clamp((innerHeight * 0.85 - sr.top) / (sr.height + innerHeight * 0.35), 0, 1);
      const n = Math.round(p * scrubWords.length);
      scrubWords.forEach((w, i) => w.classList.toggle('on', i < n));
    }

    // горизонтальная секция
    if (pinMax > 0) {
      const p = clamp((y - pinTop) / pinMax, 0, 1);
      pinTrack.style.transform = `translateX(${(-p * pinMax).toFixed(1)}px)`;
      pinBar.style.transform = `scaleX(${p.toFixed(4)})`;
      const idx = Math.min(panels.length - 1, Math.round(p * (panels.length - 1)));
      if (idx !== lastPanel) { lastPanel = idx; pinNow.textContent = String(idx + 1).padStart(2, '0'); }
    }

    // подвал дышит
    if (!reduced) footerWord.style.transform = `scaleY(${(1 + Math.sin(t * Math.PI / 4) * 0.05).toFixed(4)})`;

    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  /* ---------- счётчик вдохов ---------- */
  const breaths = $('#breaths');
  let breathCount = 0;
  setInterval(() => { breathCount++; breaths.textContent = breathCount; }, 4000);

  /* ---------- засекреченная формула ---------- */
  const docLog = $('#docLog');
  const denials = [
    'Доступ запрещён. Ваш уровень допуска: покупатель.',
    'Запрос отклонён. Сведения составляют коммерческую тайну.',
    'Попытка зафиксирована. Служба безопасности уведомлена.',
    'Повторная попытка зафиксирована. Рекомендуем продолжать дышать, пока это возможно.',
    'Формула не будет раскрыта. Благодарим за проявленный интерес.'
  ];
  let denial = 0;
  $$('.redact').forEach((el) => {
    el.addEventListener('click', () => {
      el.classList.remove('shake');
      void el.offsetWidth;
      el.classList.add('shake');
      docLog.textContent = '> ' + denials[Math.min(denial, denials.length - 1)];
      denial++;
    });
  });

  /* ---------- перекрытие кислорода ---------- */
  const cut = $('#cut');
  const cutTimer = $('#cutTimer');
  const statusText = $('#statusText');
  const valveLabel = $('#valveLabel');
  let cutInterval = null;
  const restoreAir = () => {
    clearInterval(cutInterval);
    cutInterval = null;
    cut.hidden = true;
    body.classList.remove('cutting');
    statusText.textContent = 'Подача O₂: активна';
    valveLabel.textContent = 'Демонстрация перекрытия';
    lockScroll(false);
  };
  $('#valveBtn').addEventListener('click', () => {
    if (cutInterval) return;
    let left = 5;
    cutTimer.textContent = left;
    cut.hidden = false;
    body.classList.add('cutting');
    statusText.textContent = 'Подача O₂: перекрыта';
    valveLabel.textContent = 'Подача перекрыта';
    lockScroll(true);
    cutInterval = setInterval(() => {
      left--;
      cutTimer.textContent = left;
      if (left <= 0) restoreAir();
    }, 1000);
  });
  $('#cutBtn').addEventListener('click', restoreAir);

  /* ---------- покупка ---------- */
  const BASE_PRICE = 1999;
  const form = $('#buyForm');
  const phone = $('#phone');
  const phoneError = $('#phoneError');
  const dialog = $('#doneDialog');
  let digits = '';
  let purchases = 0;

  const extract = (value) => {
    const v = value.trim();
    let d;
    if (v.startsWith('+7')) d = v.slice(2).replace(/\D/g, '');
    else {
      d = v.replace(/\D/g, '');
      if (d[0] === '7' || d[0] === '8') d = d.slice(1);
    }
    return d.slice(0, 10);
  };
  const format = (d) => {
    if (!d) return '';
    let s = '+7 (' + d.slice(0, 3);
    if (d.length >= 4) s += ') ' + d.slice(3, 6);
    if (d.length >= 7) s += '-' + d.slice(6, 8);
    if (d.length >= 9) s += '-' + d.slice(8, 10);
    return s;
  };
  phone.addEventListener('input', (e) => {
    let d = extract(phone.value);
    const deleting = e.inputType && e.inputType.startsWith('delete');
    // если стёрли символ оформления, убираем и цифру перед ним
    if (deleting && d === digits) d = d.slice(0, -1);
    digits = d;
    phone.value = format(d);
    phoneError.textContent = '';
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    digits = extract(phone.value);
    if (digits.length < 10) {
      phoneError.textContent = 'Укажите номер полностью. Нам необходимо знать, кому перекрывать кислород.';
      phone.focus();
      return;
    }
    $('#doneNum').textContent = format(digits);
    $('#doneId').textContent = String(purchases + 1).padStart(6, '0');
    lockScroll(true);
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  });
  const closeDialog = () => {
    if (typeof dialog.close === 'function' && dialog.open) dialog.close();
    else { dialog.removeAttribute('open'); afterPurchase(); }
  };
  const afterPurchase = () => {
    lockScroll(false);
    // скидка на повторную покупку: 1 ₽ за каждую предыдущую
    purchases++;
    const discount = Math.min(purchases, 99);
    $('#oldPrice').hidden = false;
    $('#price').textContent = (BASE_PRICE - discount).toLocaleString('ru-RU') + ' ₽';
    $('#priceNote').textContent = `Скидка на повторную покупку: ${discount} ₽`;
    $('span', $('#buyBtn')).textContent = 'Купить повторно';
  };
  $('#doneClose').addEventListener('click', closeDialog);
  dialog.addEventListener('click', (e) => { if (e.target === dialog) closeDialog(); });
  dialog.addEventListener('close', afterPurchase);
})();
