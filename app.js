(() => {
  'use strict';

  /* ------------------------------------------------------------------------
     Config
     ------------------------------------------------------------------------ */

  const CA = 'BvP5kfxFcJ69DA7XJzZcRkyRkqYpPsBA3HSuZbTppump';

  // Empty links show a "soon" toast instead of navigating.
  const LINKS = {
    x: 'https://x.com/Wasted_PF',
    pump: `https://pump.fun/coin/${CA}`,
    dex: `https://dexscreener.com/solana/${CA}`,
    jup: `https://jup.ag/swap/SOL-${CA}`,
  };

  const PAGES = ['home', 'lore', 'buy', 'stats', 'memes', 'studio'];

  const STATS = [
    // label, value, filled segments (of 10), style
    ['Total supply', '1,000,000,000', 10],
    ['Buy tax', '0%', 0],
    ['Sell tax', '0%', 0],
    ['Mint authority', 'Revoked', 10],
    ['Freeze authority', 'Revoked', 10],
    ['Presale', 'None', 0],
    ['Launch', 'Fair · pump.fun', 10],
    ['Times wasted', '∞', 10, 'red'],
    ['Respect', 'Maxed', 10, 'red'],
  ];

  const MEMES = window.MEMES || [];
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const memeSrc = (id, ext) => `assets/memes/${id}.${ext}`;
  const shuffle = (arr) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const isTyping = (el) => el && el.closest && el.closest('input, textarea, select, [contenteditable="true"]');

  /* ------------------------------------------------------------------------
     Toast
     ------------------------------------------------------------------------ */

  const toastEl = $('#toast');
  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2800);
  }

  /* ------------------------------------------------------------------------
     Links, contract address, copy
     ------------------------------------------------------------------------ */

  $$('[data-ca]').forEach((el) => (el.textContent = CA));
  $$('[data-ca-short]').forEach((el) => (el.textContent = `${CA.slice(0, 6)}…${CA.slice(-6)}`));

  $$('[data-link]').forEach((a) => {
    const url = LINKS[a.dataset.link];
    if (url) {
      a.href = url;
      a.target = '_blank';
      a.rel = 'noopener';
    } else {
      a.href = '#';
      a.addEventListener('click', (e) => {
        e.preventDefault();
        toast(`${a.dataset.name || 'That link'} drops soon. Stay wasted.`);
      });
    }
  });

  async function copyCA() {
    try {
      await navigator.clipboard.writeText(CA);
    } catch {
      const ta = Object.assign(document.createElement('textarea'), { value: CA });
      ta.style.cssText = 'position:fixed;opacity:0';
      document.body.append(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    toast('Contract address copied. Paste it, don’t type it.');
    bumpWanted(1);
    $$('[data-copy]').forEach((b) => {
      b.classList.add('copied');
      const t = $('.copy-txt', b);
      if (t) {
        t.dataset.orig ??= t.textContent;
        t.textContent = 'Copied';
      }
      setTimeout(() => {
        b.classList.remove('copied');
        if (t) t.textContent = t.dataset.orig;
      }, 1500);
    });
  }
  $$('[data-copy]').forEach((b) => b.addEventListener('click', copyCA));

  /* ------------------------------------------------------------------------
     Wanted level
     ------------------------------------------------------------------------ */

  const wantedEl = $('#wanted');
  const stars = $$('svg', wantedEl);
  let wanted = 0;

  function setWanted(n, flash = true) {
    wanted = Math.max(0, Math.min(5, n));
    stars.forEach((s, i) => s.classList.toggle('on', i < wanted));
    wantedEl.setAttribute('aria-label', `Wanted level ${wanted} of 5`);
    if (flash) {
      wantedEl.classList.remove('flash');
      void wantedEl.offsetWidth;
      wantedEl.classList.add('flash');
    }
  }
  const bumpWanted = (n) => setWanted(wanted + n);
  $$('[data-link="pump"], [data-link="jup"]').forEach((a) => a.addEventListener('click', () => bumpWanted(2)));
  $$('[data-link="dex"]').forEach((a) => a.addEventListener('click', () => bumpWanted(1)));

  /* ------------------------------------------------------------------------
     Pages
     ------------------------------------------------------------------------ */

  let page = 'home';
  const onEnter = {};
  const onLeave = {};

  function go(next, { updateHash = true } = {}) {
    if (!PAGES.includes(next)) next = 'home';
    if (next === page && document.body.dataset.page === next) return;
    onLeave[page]?.();
    page = next;
    document.body.dataset.page = next;

    $$('.tab').forEach((t) => {
      if (t.dataset.go === next) t.setAttribute('aria-current', 'page');
      else t.removeAttribute('aria-current');
    });
    $('#page-home').inert = next !== 'home';
    $$('.panel').forEach((p) => {
      const open = p.id === `page-${next}`;
      p.classList.toggle('is-open', open);
      p.inert = !open;
      if (open) $('.panel-body', p).scrollTop = 0;
    });

    if (updateHash) {
      try {
        history.replaceState(null, '', next === 'home' ? location.pathname + location.search : `#${next}`);
      } catch {
        /* sandboxed or <base>-shifted documents can refuse this; the page still switches */
      }
    }
    onEnter[next]?.();
  }

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-go]');
    if (!el) return;
    e.preventDefault();
    go(el.dataset.go);
  });
  addEventListener('hashchange', () => go(location.hash.slice(1) || 'home', { updateHash: false }));

  /* ------------------------------------------------------------------------
     Endless meme wall
     ------------------------------------------------------------------------ */

  const wall = $('#wall');
  const wallShift = $('#wallShift');
  const visible = new Set();
  const awake = [];
  let wallKey = '';

  const maxLive = () => (innerWidth < 700 ? 4 : innerWidth < 1400 ? 10 : 14);

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) visible.add(e.target);
      else {
        visible.delete(e.target);
        sleep(e.target, true);
      }
    }
  });

  function wake(tile) {
    if (tile.classList.contains('awake') || tile.dataset.v !== '1') return;
    tile.classList.add('awake');
    const v = document.createElement('video');
    v.muted = true;
    v.loop = true;
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.preload = 'auto';
    v.src = memeSrc(tile.dataset.id, 'mp4');
    v.addEventListener('playing', () => tile.classList.add('live'), { once: true });
    tile.append(v);
    v.play().catch(() => {});
    awake.push(tile);
    while (awake.length > maxLive()) sleep(awake[0]);
  }

  function sleep(tile, now = false) {
    const i = awake.indexOf(tile);
    if (i > -1) awake.splice(i, 1);
    if (!tile.classList.contains('awake')) return;
    tile.classList.remove('awake', 'live');
    const v = $('video', tile);
    if (!v) return;
    const kill = () => {
      if (tile.classList.contains('awake')) return;
      v.pause();
      v.removeAttribute('src');
      v.load();
      v.remove();
    };
    now ? kill() : setTimeout(kill, 550);
  }

  const tileHTML = ([id, w, h, v]) =>
    `<figure class="tile" data-id="${id}" data-v="${v}" style="aspect-ratio:${w}/${h}">` +
    `<img src="${memeSrc(id, 'jpg')}" alt="" width="${w}" height="${h}" loading="lazy" decoding="async"></figure>`;

  function buildWall() {
    if (!MEMES.length) return;
    const W = innerWidth;
    const H = innerHeight;
    const colW = W < 600 ? 150 : W < 1000 ? 190 : W < 1700 ? 230 : 270;
    const gap = W < 600 ? 10 : 14;
    const cols = Math.ceil((W * 1.4) / (colW + gap)) + 1;
    const key = `${cols}:${colW}:${Math.round(H / 200)}`;
    if (key === wallKey) return;
    wallKey = key;

    io.disconnect();
    visible.clear();
    awake.length = 0;
    wall.style.setProperty('--colw', `${colW}px`);
    wall.style.setProperty('--gap', `${gap}px`);

    const pool = shuffle(MEMES);
    let cursor = 0;
    const frag = document.createDocumentFragment();
    for (let c = 0; c < cols; c++) {
      const col = document.createElement('div');
      col.className = c % 2 ? 'col down' : 'col';
      const track = document.createElement('div');
      track.className = 'track';
      const items = [];
      let h = 0;
      // Each half of the track must be taller than the (rotated, oversized) wall
      while (h < H * 1.9) {
        const m = pool[cursor++ % pool.length];
        items.push(m);
        h += (colW * m[2]) / m[1] + gap;
      }
      const html = items.map(tileHTML).join('');
      track.innerHTML = html + html;
      const speed = 16 + Math.random() * 16; // px per second
      const dur = h / speed;
      track.style.setProperty('--dur', `${dur.toFixed(1)}s`);
      track.style.animationDelay = `-${(Math.random() * dur).toFixed(1)}s`;
      col.append(track);
      frag.append(col);
    }
    wall.replaceChildren(frag);
    $$('.tile', wall).forEach((t) => io.observe(t));
  }

  // Bring a random visible tile to life every so often
  setInterval(() => {
    if (document.hidden || reduceMotion || document.body.classList.contains('is-dying')) return;
    const pool = [...visible].filter((t) => t.dataset.v === '1' && !t.classList.contains('awake'));
    if (pool.length) wake(pool[(Math.random() * pool.length) | 0]);
  }, 650);

  wall.addEventListener('mouseover', (e) => {
    const t = e.target.closest('.tile');
    if (t) wake(t);
  });

  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(buildWall, 200);
  });

  // Subtle parallax
  if (!reduceMotion && finePointer) {
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
    const tick = () => {
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      wallShift.style.transform = `translate3d(${cx.toFixed(2)}px, ${cy.toFixed(2)}px, 0)`;
      raf = Math.abs(tx - cx) + Math.abs(ty - cy) > 0.1 ? requestAnimationFrame(tick) : 0;
    };
    addEventListener('pointermove', (e) => {
      tx = (e.clientX / innerWidth - 0.5) * -28;
      ty = (e.clientY / innerHeight - 0.5) * -28;
      if (!raf) raf = requestAnimationFrame(tick);
    });
  }

  /* ------------------------------------------------------------------------
     Get wasted
     ------------------------------------------------------------------------ */

  // The death sound loops in the background with a random pause between plays.
  // Browsers block audio until the first interaction, so the loop starts then.
  const LOOP_VOLUME = 0.45;
  const DEATH_VOLUME = 0.9;
  const LOOP_GAP = [7000, 14000]; // ms of silence between plays

  const sfx = new Audio('assets/audio/wasted.mp3');
  sfx.preload = 'auto';
  const soundBtn = $('#sound');
  let soundOn = true;
  let unlocked = false;
  let loopTimer = 0;
  let unlockedBySoundBtn = false;

  try {
    soundOn = localStorage.getItem('wasted-sound') !== 'off';
  } catch {
    /* storage unavailable: default to on */
  }
  soundBtn.setAttribute('aria-pressed', String(soundOn));

  function play(volume) {
    clearTimeout(loopTimer);
    sfx.volume = volume;
    sfx.currentTime = 0;
    sfx.play().catch(() => {});
  }

  function scheduleLoop() {
    clearTimeout(loopTimer);
    if (!soundOn || !unlocked) return;
    const [min, max] = LOOP_GAP;
    loopTimer = setTimeout(() => {
      if (document.hidden || document.body.classList.contains('is-dying')) scheduleLoop();
      else play(LOOP_VOLUME);
    }, min + Math.random() * (max - min));
  }
  sfx.addEventListener('ended', scheduleLoop);

  function unlock(e) {
    if (unlocked) return;
    unlocked = true;
    unlockedBySoundBtn = !!e.target.closest?.('#sound');
    soundBtn.classList.remove('idle');
    removeEventListener('pointerdown', unlock, true);
    removeEventListener('keydown', unlock, true);
    if (soundOn) play(LOOP_VOLUME);
  }
  addEventListener('pointerdown', unlock, true);
  addEventListener('keydown', unlock, true);

  function setSound(on) {
    soundOn = on;
    soundBtn.setAttribute('aria-pressed', String(on));
    try {
      localStorage.setItem('wasted-sound', on ? 'on' : 'off');
    } catch {
      /* not persisted */
    }
    if (on) play(LOOP_VOLUME);
    else {
      clearTimeout(loopTimer);
      sfx.pause();
    }
  }
  soundBtn.addEventListener('click', () => {
    // The click that unlocked audio already started it; don't immediately mute
    if (unlockedBySoundBtn) {
      unlockedBySoundBtn = false;
      if (soundOn) return;
    }
    setSound(!soundOn);
    toast(soundOn ? 'Sound on.' : 'Sound off.');
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearTimeout(loopTimer);
      sfx.pause();
    } else scheduleLoop();
  });

  function playWasted() {
    if (soundOn && unlocked) play(DEATH_VOLUME);
  }

  let deathTimer;
  let diedAt = 0;

  function die() {
    if (document.body.classList.contains('is-dying')) return;
    diedAt = performance.now();
    document.body.classList.remove('is-respawn');
    document.body.classList.add('is-dying');
    $('#death').setAttribute('aria-hidden', 'false');
    playWasted();
    deathTimer = setTimeout(respawn, 5200);
  }

  function respawn() {
    if (!document.body.classList.contains('is-dying')) return;
    if (performance.now() - diedAt < 900) return;
    clearTimeout(deathTimer);
    document.body.classList.remove('is-dying');
    document.body.classList.add('is-respawn');
    $('#death').setAttribute('aria-hidden', 'true');
    setTimeout(() => document.body.classList.remove('is-respawn'), 1100);
    if (wanted) setWanted(0, false);
    setTimeout(() => toast('Respawned. Wanted level cleared, bags intact.'), 500);
  }

  $$('[data-action="die"]').forEach((b) => b.addEventListener('click', die));
  $('#death').addEventListener('click', respawn);

  /* ------------------------------------------------------------------------
     Lore: rotating exhibit
     ------------------------------------------------------------------------ */

  const exhibit = $('#exhibit');
  const exhibitNo = $('#exhibitNo');
  const exhibitOrder = shuffle(MEMES.filter((m) => m[3]));
  let exhibitI = -1;
  let exhibitTimer;

  function nextExhibit() {
    if (!exhibitOrder.length) return;
    exhibitI = (exhibitI + 1) % exhibitOrder.length;
    const [id] = exhibitOrder[exhibitI];
    const v = document.createElement('video');
    Object.assign(v, { muted: true, loop: true, playsInline: true, autoplay: true });
    v.poster = memeSrc(id, 'jpg');
    v.src = memeSrc(id, 'mp4');
    v.style.opacity = '0';
    v.addEventListener('loadeddata', () => {
      v.style.opacity = '1';
      const old = $$('video', exhibit).filter((x) => x !== v);
      setTimeout(() => old.forEach((x) => x.remove()), 650);
    }, { once: true });
    exhibit.append(v);
    v.play().catch(() => {});
    exhibitNo.textContent = `Exhibit #${id.slice(1)}`;
    clearTimeout(exhibitTimer);
    exhibitTimer = setTimeout(nextExhibit, 7000);
  }

  $('#exhibitNext').addEventListener('click', nextExhibit);
  onEnter.lore = () => nextExhibit();
  onLeave.lore = () => {
    clearTimeout(exhibitTimer);
    setTimeout(() => page !== 'lore' && exhibit.replaceChildren(), 500);
  };

  /* ------------------------------------------------------------------------
     Tokenomics + live market data
     ------------------------------------------------------------------------ */

  const statRows = $('#statRows');
  statRows.innerHTML = STATS.map(([label, val, n, style]) => `
    <div class="stat-row">
      <span class="label">${label}</span>
      <span class="seg${style ? ` ${style}` : ''}" data-n="${n}">${'<i></i>'.repeat(10)}</span>
      <span class="val">${val}</span>
    </div>`).join('');

  function fillBars() {
    $$('.seg', statRows).forEach((seg, r) => {
      const n = +seg.dataset.n;
      $$('i', seg).forEach((i, k) => {
        i.classList.remove('on');
        i.style.transitionDelay = `${r * 60 + k * 35}ms`;
      });
      requestAnimationFrame(() => requestAnimationFrame(() => {
        $$('i', seg).forEach((i, k) => i.classList.toggle('on', k < n));
      }));
    });
  }
  onEnter.stats = () => {
    fillBars();
    loadMarket();
  };

  const usd = (n, digits = 0) =>
    `$${Number(n).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })}`;
  const compact = (n) =>
    `$${Number(n).toLocaleString('en-US', { notation: 'compact', maximumFractionDigits: 2 })}`;

  function price(p) {
    if (!p) return '—';
    if (p >= 1) return usd(p, 4);
    const lead = Math.max(0, -Math.floor(Math.log10(p)) - 1); // zeros after the decimal point
    const sub = (n) => String(n).replace(/\d/g, (d) => '₀₁₂₃₄₅₆₇₈₉'[d]);
    if (lead >= 4) return `$0.0${sub(lead)}${Math.round(p * 10 ** (lead + 4))}`;
    return `$${p.toFixed(lead + 4)}`;
  }

  const mcapEl = $('#mcap');
  let shownCap = 0;
  function countTo(to) {
    const from = shownCap;
    const t0 = performance.now();
    const dur = 1400;
    const step = (now) => {
      const k = Math.min(1, Math.max(0, (now - t0) / dur));
      const e = 1 - Math.pow(1 - k, 3);
      mcapEl.textContent = Math.round(from + (to - from) * e).toLocaleString('en-US');
      if (k < 1) requestAnimationFrame(step);
      else shownCap = to;
    };
    requestAnimationFrame(step);
  }

  let market = null;
  let marketAt = 0;

  async function loadMarket(force = false) {
    if (!force && Date.now() - marketAt < 20000) return renderMarket();
    marketAt = Date.now();
    try {
      const r = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${CA}`);
      if (!r.ok) throw new Error(r.status);
      const j = await r.json();
      const pairs = (j.pairs || []).filter((p) => p.chainId === 'solana');
      if (!pairs.length) throw new Error('no pairs');
      pairs.sort((a, b) => (b.liquidity?.usd || 0) - (a.liquidity?.usd || 0));
      const p = pairs[0];
      market = {
        price: +p.priceUsd || 0,
        cap: +(p.marketCap || p.fdv || 0),
        liq: +(p.liquidity?.usd || 0),
        vol: +(p.volume?.h24 || 0),
        chg: +(p.priceChange?.h24 || 0),
      };
    } catch {
      market = null;
    }
    renderMarket();
  }

  function renderMarket() {
    const dot = $('#liveDot');
    const label = $('#liveLabel');
    const chg = $('#mChg');
    if (!market) {
      dot.classList.remove('on');
      label.textContent = 'Market · chart data not live yet';
      ['#mPrice', '#mCap', '#mLiq', '#mVol'].forEach((s) => ($(s).textContent = '—'));
      chg.textContent = '—';
      chg.className = 'v';
      return;
    }
    dot.classList.add('on');
    label.textContent = `Live · DexScreener · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    $('#mPrice').textContent = price(market.price);
    $('#mCap').textContent = market.cap ? compact(market.cap) : '—';
    $('#mLiq').textContent = market.liq ? compact(market.liq) : '—';
    $('#mVol').textContent = market.vol ? compact(market.vol) : '—';
    chg.textContent = `${market.chg > 0 ? '+' : ''}${market.chg.toFixed(2)}%`;
    chg.className = `v ${market.chg >= 0 ? 'up' : 'down'}`;
    if (market.cap) countTo(Math.round(market.cap));
  }

  loadMarket(true);
  setInterval(() => !document.hidden && loadMarket(true), 30000);

  /* ------------------------------------------------------------------------
     Meme wall gallery + lightbox
     ------------------------------------------------------------------------ */

  const gallery = $('#gallery');
  let galleryOrder = MEMES;

  function buildGallery() {
    gallery.innerHTML = galleryOrder.map(([id, w, h, v], i) =>
      `<button class="g-item" data-i="${i}" style="aspect-ratio:${w}/${h}" aria-label="Open meme ${i + 1}">` +
      `<img src="${memeSrc(id, 'jpg')}" alt="" width="${w}" height="${h}" loading="lazy" decoding="async">` +
      `${v ? '<span class="g-play" aria-hidden="true">GIF</span>' : ''}</button>`).join('');
    $('#memeCount').textContent = `${galleryOrder.length} certified fails`;
  }

  gallery.addEventListener('mouseover', (e) => {
    const item = e.target.closest('.g-item');
    if (!item || $('video', item)) return;
    const [id, , , v] = galleryOrder[+item.dataset.i];
    if (!v) return;
    const vid = document.createElement('video');
    Object.assign(vid, { muted: true, loop: true, playsInline: true, autoplay: true, src: memeSrc(id, 'mp4') });
    item.append(vid);
    vid.play().catch(() => {});
    item.addEventListener('mouseleave', () => vid.remove(), { once: true });
  });
  gallery.addEventListener('click', (e) => {
    const item = e.target.closest('.g-item');
    if (item) openLightbox(+item.dataset.i);
  });
  $('#shuffle').addEventListener('click', () => {
    galleryOrder = shuffle(MEMES);
    buildGallery();
    $('#page-memes .panel-body').scrollTop = 0;
  });
  onEnter.memes = () => gallery.childElementCount || buildGallery();

  const lb = $('#lightbox');
  const lbMedia = $('#lbMedia');
  let lbI = 0;
  let lbReturn = null;

  function showLightbox() {
    const [id, w, h, v] = galleryOrder[lbI];
    const el = document.createElement(v ? 'video' : 'img');
    if (v) {
      Object.assign(el, { muted: true, loop: true, playsInline: true, autoplay: true, controls: false });
      el.poster = memeSrc(id, 'jpg');
      el.src = memeSrc(id, 'mp4');
    } else {
      el.src = memeSrc(id, 'jpg');
      el.alt = '';
    }
    el.width = w;
    el.height = h;
    lbMedia.replaceChildren(el);
    if (v) el.play().catch(() => {});
    $('#lbCount').textContent = `${String(lbI + 1).padStart(2, '0')} / ${galleryOrder.length}`;
  }
  function openLightbox(i) {
    lbI = i;
    lbReturn = document.activeElement;
    showLightbox();
    lb.inert = false;
    lb.classList.add('open');
    $('#lbClose').focus();
  }
  function closeLightbox() {
    lb.classList.remove('open');
    lb.inert = true;
    setTimeout(() => lbMedia.replaceChildren(), 300);
    lbReturn?.focus?.();
  }
  const lbStep = (d) => {
    lbI = (lbI + d + galleryOrder.length) % galleryOrder.length;
    showLightbox();
  };
  $('#lbClose').addEventListener('click', closeLightbox);
  $('#lbPrev').addEventListener('click', () => lbStep(-1));
  $('#lbNext').addEventListener('click', () => lbStep(1));
  lb.addEventListener('click', (e) => e.target === lb && closeLightbox());

  let touchX = null;
  lb.addEventListener('touchstart', (e) => (touchX = e.touches[0].clientX), { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (touchX == null) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) lbStep(dx < 0 ? 1 : -1);
    touchX = null;
  });

  /* ------------------------------------------------------------------------
     Wasted-ify
     ------------------------------------------------------------------------ */

  const stage = $('#stage');
  const canvas = $('#wcanvas');
  const ctx = canvas.getContext('2d');
  const fileInput = $('#sFile');
  const logo = new Image();
  logo.src = window.WASTED_LOGO || 'assets/wasted@2x.png';
  logo.onload = () => render();

  const ctl = {
    gray: $('#sGray'),
    dark: $('#sDark'),
    size: $('#sSize'),
    pos: $('#sPos'),
    band: $('#sBand'),
  };
  const outs = { gray: $('#oGray'), dark: $('#oDark'), size: $('#oSize'), pos: $('#oPos') };
  let source = null;

  function syncRange(input) {
    const pct = ((input.value - input.min) / (input.max - input.min)) * 100;
    input.style.setProperty('--fill', `${pct}%`);
  }

  function render() {
    if (!source || !logo.complete) return;
    // Export around 1600px; small sources get upscaled (up to 4x) so the wordmark stays crisp
    const s = Math.min(4, 1600 / Math.max(source.naturalWidth, source.naturalHeight));
    const w = Math.round(source.naturalWidth * s);
    const h = Math.round(source.naturalHeight * s);
    canvas.width = w;
    canvas.height = h;

    const g = ctl.gray.value / 100;
    const dk = ctl.dark.value / 100;
    if (typeof ctx.filter === 'string') {
      ctx.filter = `grayscale(${g}) brightness(${1 - dk}) contrast(1.08)`;
      ctx.drawImage(source, 0, 0, w, h);
      ctx.filter = 'none';
    } else {
      ctx.drawImage(source, 0, 0, w, h);
      try {
        const img = ctx.getImageData(0, 0, w, h);
        const p = img.data;
        for (let i = 0; i < p.length; i += 4) {
          const l = 0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2];
          for (let c = 0; c < 3; c++) p[i + c] = (p[i + c] + (l - p[i + c]) * g) * (1 - dk);
        }
        ctx.putImageData(img, 0, 0);
      } catch {
        /* cross-origin image: skip pixel pass */
      }
    }

    const vg = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,0,.55)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);

    const lw = (w * ctl.size.value) / 100;
    const lh = lw * (logo.naturalHeight / logo.naturalWidth);
    const cy = (h * ctl.pos.value) / 100;

    if (ctl.band.checked) {
      const bh = lh * 1.9;
      const y0 = cy - bh / 2;
      const bg = ctx.createLinearGradient(0, y0, 0, y0 + bh);
      bg.addColorStop(0, 'rgba(0,0,0,0)');
      bg.addColorStop(0.22, 'rgba(0,0,0,.62)');
      bg.addColorStop(0.78, 'rgba(0,0,0,.62)');
      bg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = bg;
      ctx.fillRect(0, y0, w, bh);
    }

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,.55)';
    ctx.shadowBlur = lw * 0.03;
    ctx.shadowOffsetY = lw * 0.008;
    ctx.drawImage(logo, (w - lw) / 2, cy - lh / 2, lw, lh);
    ctx.restore();

    const fs = Math.max(12, Math.round(w * 0.022));
    ctx.font = `700 ${fs}px "Barlow Condensed", sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,.75)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillText('$WASTED', w - fs, h - fs * 0.8);

    stage.classList.add('has-img');
  }

  function loadImage(url) {
    const img = new Image();
    img.onload = () => {
      source = img;
      render();
    };
    img.onerror = () => toast('Could not read that image. Try a PNG or JPG.');
    img.src = url;
  }

  function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) return toast('That is not an image. Try a PNG or JPG.');
    const reader = new FileReader();
    reader.onload = () => loadImage(reader.result);
    reader.readAsDataURL(file);
  }

  // Clicking the stage opens the picker only while it is empty
  stage.addEventListener('click', (e) => {
    if (stage.classList.contains('has-img')) e.preventDefault();
  });
  fileInput.addEventListener('change', () => {
    loadFile(fileInput.files[0]);
    fileInput.value = '';
  });
  ['dragenter', 'dragover'].forEach((t) => stage.addEventListener(t, (e) => {
    e.preventDefault();
    stage.classList.add('drag');
  }));
  ['dragleave', 'drop'].forEach((t) => stage.addEventListener(t, () => stage.classList.remove('drag')));
  stage.addEventListener('drop', (e) => {
    e.preventDefault();
    loadFile(e.dataTransfer.files[0]);
  });
  addEventListener('paste', (e) => {
    if (page !== 'studio') return;
    const item = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/'));
    if (item) loadFile(item.getAsFile());
  });

  $('#sRandom').addEventListener('click', () => {
    const [id] = MEMES[(Math.random() * MEMES.length) | 0];
    loadImage(memeSrc(id, 'jpg'));
  });

  Object.entries(ctl).forEach(([k, input]) => {
    if (input.type === 'range') syncRange(input);
    input.addEventListener('input', () => {
      if (input.type === 'range') {
        syncRange(input);
        outs[k].textContent = `${input.value}%`;
      }
      render();
    });
  });

  function exportBlob() {
    return new Promise((resolve, reject) => {
      try {
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('empty'))), 'image/png');
      } catch (err) {
        reject(err);
      }
    });
  }

  $('#sDownload').addEventListener('click', async () => {
    if (!source) return toast('Upload an image first.');
    try {
      const blob = await exportBlob();
      const a = Object.assign(document.createElement('a'), {
        href: URL.createObjectURL(blob),
        download: 'wasted.png',
      });
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      toast('Saved. Now go post it.');
      bumpWanted(1);
    } catch {
      toast('Your browser blocked the export. Upload your own image, or open the site over http(s).');
    }
  });

  $('#sCopy').addEventListener('click', async () => {
    if (!source) return toast('Upload an image first.');
    try {
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': exportBlob() })]);
      toast('Image copied. Paste it anywhere.');
    } catch {
      toast('Copying images is not supported here. Use Download instead.');
    }
  });

  /* ------------------------------------------------------------------------
     Keyboard
     ------------------------------------------------------------------------ */

  addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;

    if (document.body.classList.contains('is-dying')) {
      respawn();
      return;
    }

    if (lb.classList.contains('open')) {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') lbStep(-1);
      else if (e.key === 'ArrowRight') lbStep(1);
      return;
    }

    const k = e.key.toLowerCase();
    if (k === 'escape') go('home');
    else if (k === 'q' || k === 'e') {
      const i = PAGES.indexOf(page);
      go(PAGES[(i + (k === 'e' ? 1 : -1) + PAGES.length) % PAGES.length]);
    } else if (k === 'w') die();
    else if (k === 'c') copyCA();
    else if (k === 'm') soundBtn.click();
    else if (/^[1-6]$/.test(k)) go(PAGES[+k - 1]);
  });

  /* ------------------------------------------------------------------------
     Boot
     ------------------------------------------------------------------------ */

  buildWall();
  go(location.hash.slice(1) || 'home', { updateHash: false });
})();
