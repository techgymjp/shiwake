/*
 * 魚のイラスト（SVG）を生成するモジュール。
 * すべての魚は viewBox 0 0 320 200、頭を左に向けて描く。
 * 見分けポイントになる特徴（模様・ひげ・あご・ひれ等）を強調している。
 */
const FishArt = (() => {
  const OUT = '#26323d'; // 輪郭線の色
  let uid = 0;

  // ---------- 基本ユーティリティ ----------
  const f = (n) => Math.round(n * 10) / 10;

  // 再現性のある疑似乱数（模様を毎回同じにするため）
  function rng(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function bez(p, t) {
    const u = 1 - t;
    const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    return [
      a * p[0][0] + b * p[1][0] + c * p[2][0] + d * p[3][0],
      a * p[0][1] + b * p[1][1] + c * p[2][1] + d * p[3][1],
    ];
  }

  function yOn(segs, x) {
    let best = segs[0][0], bd = Infinity;
    for (const s of segs) {
      for (let i = 0; i <= 80; i++) {
        const pt = bez(s, i / 80);
        const d = Math.abs(pt[0] - x);
        if (d < bd) { bd = d; best = pt; }
      }
    }
    return best[1];
  }

  function gradient(id, stops) {
    return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops
      .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`)
      .join('')}</linearGradient>`;
  }

  function wrap(inner, defs, label) {
    return `<svg viewBox="0 0 320 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${label || '魚のイラスト'}"><defs>${defs}</defs>${inner}</svg>`;
  }

  function eye(x, y, r, iris = '#c9a43a') {
    return `<g class="eye">
      <circle cx="${x}" cy="${y}" r="${r}" fill="#fff" stroke="${OUT}" stroke-width="1.6"/>
      <circle cx="${x - r * 0.08}" cy="${y}" r="${f(r * 0.72)}" fill="${iris}"/>
      <circle cx="${x - r * 0.12}" cy="${y}" r="${f(r * 0.45)}" fill="#111"/>
      <circle cx="${f(x - r * 0.3)}" cy="${f(y - r * 0.3)}" r="${f(r * 0.18)}" fill="#fff"/>
    </g>`;
  }

  // ---------- 紡錘形の胴体 ----------
  // nx: 鼻先x, mx: 最大高さのx, px: 尾柄のx, h/hb: 背側/腹側の高さ, ph: 尾柄の半分の高さ
  function body(o) {
    const cy = o.cy ?? 100;
    const nx = o.nx ?? 22, mx = o.mx ?? 115, px = o.px ?? 250;
    const h = o.h ?? 40, hb = o.hb ?? h, ph = o.ph ?? 7;
    const ny = cy + (o.ny ?? 0);
    const k1 = o.k1 ?? 0.2, k2 = o.k2 ?? 0.7; // 頭の丸み
    const k3 = o.k3 ?? k2;
    const up = [
      [[nx, ny], [nx + (mx - nx) * k1, cy - h * k2], [mx - (mx - nx) * 0.45, cy - h], [mx, cy - h]],
      [[mx, cy - h], [mx + (px - mx) * 0.45, cy - h], [px - (px - mx) * 0.3, cy - ph], [px, cy - ph]],
    ];
    const lo = [
      [[nx, ny], [nx + (mx - nx) * k1, cy + hb * k3], [mx - (mx - nx) * 0.45, cy + hb], [mx, cy + hb]],
      [[mx, cy + hb], [mx + (px - mx) * 0.45, cy + hb], [px - (px - mx) * 0.3, cy + ph], [px, cy + ph]],
    ];
    const c = (s) => `C ${s[1].map(f).join(' ')} ${s[2].map(f).join(' ')} ${s[3].map(f).join(' ')}`;
    const rc = (s) => `C ${s[2].map(f).join(' ')} ${s[1].map(f).join(' ')} ${s[0].map(f).join(' ')}`;
    const d = `M ${nx} ${f(ny)} ${c(up[0])} ${c(up[1])} L ${px} ${cy + ph} ${rc(lo[1])} ${rc(lo[0])} Z`;
    return {
      d, cy, nx, mx, px, h, hb, ph,
      top: (x) => yOn(up, x),
      bot: (x) => yOn(lo, x),
    };
  }

  // ---------- ひれ ----------
  // 背びれ（上向き）。peak: 最も高い位置（0=前端,1=後端）
  function finUp(b, x1, x2, hgt, color, peak = 0.25, rays = true) {
    const b1 = b.top(x1) + 4, b2 = b.top(x2) + 4;
    const pkx = x1 + (x2 - x1) * peak;
    const pky = b.top(pkx) - hgt;
    let s = `<path d="M ${f(x1)} ${f(b1)} Q ${f(x1 + (pkx - x1) * 0.15)} ${f(pky)} ${f(pkx)} ${f(pky)} Q ${f(pkx + (x2 - pkx) * 0.55)} ${f(pky + (b2 - pky) * 0.35)} ${f(x2)} ${f(b2)} Z" fill="${color}" stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round"/>`;
    if (rays) s += raysBetween(x1, x2, b, pkx, pky, -1);
    return s;
  }

  // 腹側のひれ（しりびれ）
  function finDown(b, x1, x2, hgt, color, peak = 0.25, rays = true) {
    const b1 = b.bot(x1) - 4, b2 = b.bot(x2) - 4;
    const pkx = x1 + (x2 - x1) * peak;
    const pky = b.bot(pkx) + hgt;
    let s = `<path d="M ${f(x1)} ${f(b1)} Q ${f(x1 + (pkx - x1) * 0.15)} ${f(pky)} ${f(pkx)} ${f(pky)} Q ${f(pkx + (x2 - pkx) * 0.55)} ${f(pky - (pky - b2) * 0.35)} ${f(x2)} ${f(b2)} Z" fill="${color}" stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round"/>`;
    if (rays) s += raysBetween(x1, x2, b, pkx, pky, 1);
    return s;
  }

  function raysBetween(x1, x2, b, pkx, pky, dir) {
    const n = Math.max(2, Math.round((x2 - x1) / 9));
    let s = '';
    for (let i = 1; i < n; i++) {
      const x = x1 + ((x2 - x1) * i) / n;
      const base = dir < 0 ? b.top(x) : b.bot(x);
      const t = x < pkx ? 1 : 1 - ((x - pkx) / (x2 - pkx)) * 0.8;
      const len = Math.abs(pky - (dir < 0 ? b.top(pkx) : b.bot(pkx))) * t * 0.8;
      s += `<line x1="${f(x)}" y1="${f(base)}" x2="${f(x + 2)}" y2="${f(base + dir * len)}" stroke="${OUT}" stroke-width="0.8" opacity="0.45"/>`;
    }
    return s;
  }

  // 小離鰭（マグロ・サバなどの小さなひれの列）
  function finlets(b, x1, x2, n, color, size = 7) {
    let s = '';
    for (let i = 0; i < n; i++) {
      const x = x1 + ((x2 - x1) * i) / Math.max(1, n - 1);
      const t = b.top(x) + 1, bt = b.bot(x) - 1;
      s += `<path d="M ${f(x - 3)} ${f(t + 2)} L ${f(x + 4)} ${f(t - size)} L ${f(x + 4)} ${f(t + 2)} Z" fill="${color}" stroke="${OUT}" stroke-width="1"/>`;
      s += `<path d="M ${f(x - 3)} ${f(bt - 2)} L ${f(x + 4)} ${f(bt + size)} L ${f(x + 4)} ${f(bt - 2)} Z" fill="${color}" stroke="${OUT}" stroke-width="1"/>`;
    }
    return s;
  }

  // 胸びれ・腹びれ（葉っぱ形）
  function leafFin(x, y, len, wid, angle, color) {
    return `<g transform="translate(${x} ${y}) rotate(${angle})">
      <path d="M 0 0 Q ${f(len * 0.45)} ${f(-wid)} ${len} ${f(-wid * 0.2)} Q ${f(len * 0.55)} ${f(wid * 0.6)} 0 0 Z" fill="${color}" stroke="${OUT}" stroke-width="1.4" stroke-linejoin="round"/>
      <line x1="2" y1="0" x2="${f(len * 0.85)}" y2="${f(-wid * 0.25)}" stroke="${OUT}" stroke-width="0.7" opacity="0.4"/>
    </g>`;
  }

  // 尾びれ
  function tail(b, type, tw, tH, color, extra = '') {
    const { px, cy, ph } = b;
    const x0 = px - 8;
    let d;
    if (type === 'round') {
      d = `M ${x0} ${cy - ph} C ${px + tw * 0.5} ${cy - tH} ${px + tw * 1.05} ${cy - tH * 0.7} ${px + tw} ${cy} C ${px + tw * 1.05} ${cy + tH * 0.7} ${px + tw * 0.5} ${cy + tH} ${x0} ${cy + ph} Z`;
    } else if (type === 'square') {
      d = `M ${x0} ${cy - ph} L ${px + tw} ${cy - tH} Q ${px + tw * 0.92} ${cy} ${px + tw} ${cy + tH} L ${x0} ${cy + ph} Z`;
    } else {
      // fork: 切れ込みの深さ notch（尾の幅に対する割合）
      const notch = { fork: 0.45, moon: 0.22, shallow: 0.75 }[type] ?? 0.45;
      const thin = type === 'moon' ? 0.5 : 0.3;
      d = `M ${x0} ${cy - ph} Q ${f(px + tw * 0.45)} ${f(cy - ph - tH * thin)} ${px + tw} ${cy - tH} Q ${f(px + tw * (notch + 0.15))} ${f(cy - tH * 0.3)} ${f(px + tw * notch)} ${cy} Q ${f(px + tw * (notch + 0.15))} ${f(cy + tH * 0.3)} ${px + tw} ${cy + tH} Q ${f(px + tw * 0.45)} ${f(cy + ph + tH * thin)} ${x0} ${cy + ph} Z`;
    }
    let s = `<path d="${d}" fill="${color}" stroke="${OUT}" stroke-width="1.8" stroke-linejoin="round"/>`;
    // 尾の筋
    for (let i = -2; i <= 2; i++) {
      s += `<line x1="${px}" y1="${cy + i * ph * 0.3}" x2="${f(px + tw * 0.8)}" y2="${f(cy + i * tH * 0.35)}" stroke="${OUT}" stroke-width="0.7" opacity="0.35"/>`;
    }
    return s + extra;
  }

  function gill(x, cy, h, color = OUT) {
    return `<path d="M ${x} ${f(cy - h * 0.62)} Q ${x + 13} ${cy} ${x} ${f(cy + h * 0.62)}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linecap="round" opacity="0.8"/>`;
  }

  // 紡錘形の魚を組み立てる
  function spindle(o) {
    const id = `f${++uid}`;
    const b = body(o.body);
    const defs = gradient(`${id}g`, o.grad) + `<clipPath id="${id}c"><path d="${b.d}"/></clipPath>` + (o.defs ? o.defs(id) : '');
    const back = typeof o.back === 'function' ? o.back(b, id) : '';
    const clip = typeof o.clip === 'function' ? o.clip(b, id) : '';
    const front = typeof o.front === 'function' ? o.front(b, id) : '';
    const inner = `
      ${back}
      <path d="${b.d}" fill="url(#${id}g)"/>
      <g clip-path="url(#${id}c)">${clip}</g>
      <path d="${b.d}" fill="none" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>
      ${front}`;
    return wrap(o.flip ? `<g transform="translate(320 0) scale(-1 1)">${inner}</g>` : inner, defs, o.label);
  }

  // 鱗の模様
  function scales(b, x1, x2, step, color, opacity = 0.35) {
    let s = '';
    let row = 0;
    for (let y = b.cy - b.h; y <= b.cy + b.hb; y += step * 0.8, row++) {
      for (let x = x1 + (row % 2) * step * 0.5; x <= x2; x += step) {
        s += `<path d="M ${f(x)} ${f(y - step * 0.45)} Q ${f(x + step * 0.55)} ${f(y)} ${f(x)} ${f(y + step * 0.45)}" fill="none" stroke="${color}" stroke-width="1" opacity="${opacity}"/>`;
      }
    }
    return s;
  }

  // ======================================================
  //  各魚のイラスト
  // ======================================================
  const art = {};

  // ---------- ウナギ・アナゴ（細長い体） ----------
  function eel(o) {
    const id = `f${++uid}`;
    const cy = 100, x0 = 14, x1 = 300, T = o.T;
    const yc = (x) => cy + 9 * Math.sin(((x - x0) / 290) * Math.PI * 2 * 0.9 + 0.4);
    const th = (x) => {
      const head = Math.min(1, Math.sqrt(Math.max(0, (x - x0) / 26)));
      const taper = x < 170 ? 1 : 1 - ((x - 170) / (x1 - 170)) * 0.85;
      return T * head * taper;
    };
    const pts = [];
    for (let x = x0; x <= x1; x += 3) pts.push(x);
    const upper = pts.map((x) => `${f(x)} ${f(yc(x) - th(x) - (o.jaw === 'upper' && x < x0 + 6 ? 0 : 0))}`);
    const lower = pts.slice().reverse().map((x) => `${f(x)} ${f(yc(x) + th(x))}`);
    const d = `M ${upper.join(' L ')} L ${f(x1 + 3)} ${f(yc(x1))} L ${lower.join(' L ')} Z`;

    // 背びれ・しりびれ（体のまわりを縁取る）
    const fw = (x) => 2 + Math.min(1, (x - o.dorsal) / 30) * o.finW;
    const fu = [], fl = [];
    for (let x = o.dorsal; x <= x1; x += 3) fu.push(`${f(x)} ${f(yc(x) - th(x) - fw(x))}`);
    for (let x = x1; x >= o.anal; x -= 3) fl.push(`${f(x)} ${f(yc(x) + th(x) + 2 + Math.min(1, (x - o.anal) / 30) * o.finW)}`);
    const fin = `M ${f(o.dorsal)} ${f(yc(o.dorsal))} L ${fu.join(' L ')} L ${f(x1 + 9)} ${f(yc(x1))} L ${fl.join(' L ')} L ${f(o.anal)} ${f(yc(o.anal))} Z`;

    const defs = gradient(`${id}g`, o.grad) + `<clipPath id="${id}c"><path d="${d}"/></clipPath>`;
    const ex = x0 + 17, ey = yc(ex) - T * 0.35;
    const inner = `
      <path d="${fin}" fill="${o.finColor}" stroke="${OUT}" stroke-width="1.5" stroke-linejoin="round"/>
      <path d="${d}" fill="url(#${id}g)"/>
      <g clip-path="url(#${id}c)">${o.clip ? o.clip(yc, th) : ''}</g>
      <path d="${d}" fill="none" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>
      ${leafFin(48, yc(48) + 2, 16, 7, 15, o.finColor)}
      ${o.mouth(x0, yc)}
      ${eye(ex, f(ey), o.eyeR, o.iris)}
      ${o.front ? o.front(yc, th) : ''}`;
    return wrap(inner, defs, o.label);
  }

  art.anago = () => eel({
    label: 'アナゴ', T: 17, dorsal: 62, anal: 100, finW: 5,
    grad: [[0, '#7d6446'], [0.5, '#a78c69'], [0.7, '#e9dcc4'], [1, '#f3ead8']],
    finColor: '#9c8263', eyeR: 6.5, iris: '#6fa0b5',
    clip: (yc, th) => {
      let s = '';
      // 側線に沿った白い点（側線孔）
      for (let x = 44; x < 285; x += 8.5) {
        const r = 2.2 * (1 - (x - 44) / 400);
        s += `<circle cx="${f(x)}" cy="${f(yc(x) - th(x) * 0.12)}" r="${f(r)}" fill="#fff" stroke="#6b5338" stroke-width="0.5"/>`;
      }
      // 背中側の白い点の列
      for (let x = 60; x < 250; x += 17) {
        s += `<circle cx="${f(x)}" cy="${f(yc(x) - th(x) * 0.62)}" r="1.8" fill="#fff" opacity="0.95"/>`;
      }
      return s;
    },
    // 上あごが前に出る
    mouth: (x0, yc) => `<path d="M ${x0 + 3} ${f(yc(x0) + 3)} L ${x0 + 22} ${f(yc(x0 + 22) + 4)}" stroke="${OUT}" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <path d="M ${x0 - 4} ${f(yc(x0) - 1)} Q ${x0 - 1} ${f(yc(x0) - 5)} ${x0 + 6} ${f(yc(x0) - 7)} L ${x0 + 4} ${f(yc(x0) + 2)} Z" fill="#7d6446" stroke="${OUT}" stroke-width="1.4"/>`,
  });

  art.unagi = () => eel({
    label: 'ウナギ', T: 18, dorsal: 120, anal: 105, finW: 5,
    grad: [[0, '#26301f'], [0.45, '#3f4b2f'], [0.66, '#b9b37a'], [1, '#efe7b0']],
    finColor: '#3a4630', eyeR: 4.2, iris: '#d2b44a',
    // 下あごが少し出る
    mouth: (x0, yc) => `<path d="M ${x0 + 1} ${f(yc(x0) + 2)} L ${x0 + 20} ${f(yc(x0 + 20) + 3)}" stroke="#d9cf9a" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <path d="M ${x0 - 3} ${f(yc(x0) + 4)} Q ${x0 + 2} ${f(yc(x0) + 9)} ${x0 + 10} ${f(yc(x0) + 9)} L ${x0 + 6} ${f(yc(x0) + 2)} Z" fill="#cfc690" stroke="${OUT}" stroke-width="1.4"/>`,
  });

  // ---------- ヒラメ・カレイ ----------
  function flatfish(o) {
    const id = `f${++uid}`;
    const d = o.d;
    const defs = `<radialGradient id="${id}g" cx="0.45" cy="0.45" r="0.65"><stop offset="0" stop-color="${o.c1}"/><stop offset="1" stop-color="${o.c2}"/></radialGradient>
      <clipPath id="${id}c"><path d="${d}"/></clipPath>
      <clipPath id="${id}f"><path d="${d}" transform="translate(150 100) scale(1.13 1.24) translate(-150 -100)"/></clipPath>
      <clipPath id="${id}r"><ellipse cx="${o.finStart + 95}" cy="100" rx="${250 - o.finStart - 85}" ry="95"/></clipPath>`;
    const r = rng(o.seed);
    let spots = '';
    for (let i = 0; i < o.spots; i++) {
      const x = 60 + r() * 190, y = 50 + r() * 100, rr = 2 + r() * o.spotSize;
      spots += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rr)}" ry="${f(rr * 0.8)}" fill="${r() > 0.5 ? o.spotDark : o.spotLight}" opacity="0.7"/>`;
    }
    const inner = `
      ${o.tail}
      <g clip-path="url(#${id}r)"><path d="${d}" transform="translate(150 100) scale(1.13 1.24) translate(-150 -100)" fill="${o.fin}" stroke="${OUT}" stroke-width="1.5"/>
        <g clip-path="url(#${id}f)">${Array.from({ length: 34 }, (_, i) => {
          const a = (i / 34) * Math.PI * 2;
          return `<line x1="150" y1="100" x2="${f(150 + Math.cos(a) * 125)}" y2="${f(100 + Math.sin(a) * 75)}" stroke="${OUT}" stroke-width="0.7" opacity="0.35"/>`;
        }).join('')}</g>
      </g>
      <path d="${d}" fill="url(#${id}g)"/>
      <g clip-path="url(#${id}c)">${spots}${o.lateral}</g>
      <path d="${d}" fill="none" stroke="${OUT}" stroke-width="2"/>
      ${o.front}`;
    return wrap(o.flip ? `<g transform="translate(320 0) scale(-1 1)">${inner}</g>` : inner, defs, o.label);
  }

  // ヒラメ：目が左側（頭を左、お腹を手前に置いたとき）、口が大きく歯が鋭い
  art.hirame = () => flatfish({
    label: 'ヒラメ', seed: 7, flip: false, finStart: 70,
    d: 'M 30 100 C 34 74 74 52 140 50 C 205 48 240 78 252 93 L 252 107 C 240 122 205 152 140 150 C 74 148 34 126 30 100 Z',
    c1: '#a07c50', c2: '#6e5232', fin: '#8a6a43',
    spots: 34, spotSize: 5, spotDark: '#4e3720', spotLight: '#d7bf93',
    lateral: '<path d="M 70 92 Q 105 62 140 86 Q 200 100 252 100" fill="none" stroke="#3d2b18" stroke-width="1.2" opacity="0.6"/>',
    tail: `<path d="M 244 92 C 275 66 302 72 304 100 C 302 128 275 134 244 108 Z" fill="#8a6a43" stroke="${OUT}" stroke-width="1.8"/>`,
    front: `
      <path d="M 30 101 Q 46 118 70 111" fill="#f3e6d0" stroke="${OUT}" stroke-width="1.8"/>
      <path d="M 36 104 l 3 5 l 3 -4 l 3 6 l 3 -5 l 3 6 l 3 -5 l 3 5 l 3 -4" fill="none" stroke="#fff" stroke-width="1.6" stroke-linejoin="bevel"/>
      ${eye(70, 74, 7.5, '#d6b84a')}${eye(86, 88, 7.5, '#d6b84a')}
      ${leafFin(100, 104, 26, 9, 10, '#7a5b37')}`,
  });

  // カレイ：目が右側、口が小さい、体が丸っこい
  art.karei = () => flatfish({
    label: 'カレイ', seed: 21, flip: true, finStart: 68,
    d: 'M 44 98 C 46 66 84 44 140 44 C 205 44 238 76 250 93 L 250 107 C 238 124 205 156 140 156 C 84 156 46 130 44 98 Z',
    c1: '#8c7a55', c2: '#5d4d31', fin: '#7b6a48',
    spots: 22, spotSize: 3, spotDark: '#3f3220', spotLight: '#c8b791',
    lateral: '<path d="M 72 88 Q 100 70 130 90 Q 190 100 250 100" fill="none" stroke="#2f2617" stroke-width="1.2" opacity="0.6"/>',
    tail: `<path d="M 242 92 C 272 68 300 72 302 100 C 300 128 272 132 242 108 Z" fill="#7b6a48" stroke="${OUT}" stroke-width="1.8"/>`,
    front: `
      <path d="M 44 101 Q 49 108 56 105" fill="#f0e3c9" stroke="${OUT}" stroke-width="1.7"/>
      ${eye(68, 74, 7.5, '#c9a43a')}${eye(80, 89, 7.5, '#c9a43a')}
      ${leafFin(98, 104, 24, 9, 10, '#6c5c3d')}`,
  });

  // ---------- マグロ・カツオ ----------
  art.maguro = () => spindle({
    label: 'マグロ',
    body: { nx: 16, mx: 118, px: 262, h: 54, hb: 50, ph: 6, k1: 0.12, k2: 0.82 },
    grad: [[0, '#14284d'], [0.35, '#2b4c80'], [0.55, '#8ba4c2'], [1, '#eef2f6']],
    back: (b) => `
      ${tail(b, 'moon', 48, 64, '#1d3762')}
      ${finUp(b, 92, 136, 28, '#1d3762', 0.15)}
      ${finUp(b, 160, 184, 26, '#5d6b80', 0.2, false)}
      ${finDown(b, 168, 190, 24, '#a9b4c0', 0.2, false)}
      ${finlets(b, 196, 252, 8, '#f2c230', 9)}`,
    clip: (b) => `<path d="M 60 80 Q 160 66 262 100" fill="none" stroke="#3c5f93" stroke-width="3" opacity="0.6"/>`,
    front: (b) => `
      <path d="M 250 98 L 266 100 L 250 102 Z" fill="#14284d"/>
      ${gill(66, 100, 46)}
      ${leafFin(80, 106, 32, 9, 5, '#1d3762')}
      ${leafFin(96, 140, 18, 6, 30, '#a9b4c0')}
      <path d="M 16 100 L 38 106" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
      ${eye(44, 92, 8.5, '#c0c8d0')}`,
  });

  art.katsuo = () => spindle({
    label: 'カツオ',
    body: { nx: 20, mx: 112, px: 256, h: 42, hb: 44, ph: 6, k1: 0.15, k2: 0.78 },
    grad: [[0, '#1c3768'], [0.4, '#3d64a0'], [0.55, '#b9c8d9'], [1, '#f1f4f8']],
    back: (b) => `
      ${tail(b, 'moon', 44, 52, '#25406f')}
      ${finUp(b, 86, 140, 26, '#25406f', 0.12)}
      ${finUp(b, 150, 170, 16, '#5c6f8c', 0.2, false)}
      ${finDown(b, 162, 182, 14, '#a9b4c0', 0.2, false)}
      ${finlets(b, 190, 248, 7, '#4f5f78', 6)}`,
    // お腹の黒い縦じま（横に走る数本のしま）
    clip: (b) => [12, 21, 30, 39]
      .map((dy) => `<path d="M 70 ${100 + dy} Q 165 ${100 + dy * 0.9} 258 ${100 + dy * 0.12}" fill="none" stroke="#28324a" stroke-width="4.5" stroke-linecap="round"/>`)
      .join(''),
    front: (b) => `
      <path d="M 244 98 L 260 100 L 244 102 Z" fill="#1c3768"/>
      ${gill(64, 100, 40)}
      ${leafFin(78, 104, 24, 8, 5, '#25406f')}
      <path d="M 20 100 L 40 105" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
      ${eye(44, 93, 7.5, '#c0c8d0')}`,
  });

  // ---------- アジ・サバ ----------
  art.aji = () => {
    const ly = (x) => (x <= 140 ? 84 + 16 * (0.5 - 0.5 * Math.cos(Math.PI * Math.max(0, (x - 58) / 82))) : 100);
    return spindle({
      label: 'アジ',
      body: { nx: 22, mx: 112, px: 250, h: 42, hb: 40, ph: 6, k1: 0.15, k2: 0.75 },
      grad: [[0, '#6f7f4e'], [0.38, '#a9ad72'], [0.55, '#e0dfb8'], [1, '#f6f4e7']],
      back: (b) => `
        ${tail(b, 'fork', 52, 42, '#c2b66c')}
        ${finUp(b, 80, 112, 24, '#a9a067', 0.25)}
        ${finUp(b, 120, 232, 13, '#bdb378', 0.05)}
        ${finDown(b, 140, 232, 11, '#cfc58c', 0.05)}`,
      clip: () => {
        // ぜいご（側線に沿った硬いうろこ）
        let s = `<path d="M 58 84 ${Array.from({ length: 50 }, (_, i) => { const x = 58 + i * 4; return `L ${x} ${f(ly(x))}`; }).join(' ')}" fill="none" stroke="#6b6a4a" stroke-width="1.2"/>`;
        for (let x = 64; x <= 250; x += 6) {
          const big = x > 140;
          const hh = big ? 5 : 3, ww = big ? 3.2 : 2.4;
          s += `<rect x="${f(x - ww)}" y="${f(ly(x) - hh)}" width="${f(ww * 2)}" height="${hh * 2}" rx="1.4" fill="#9a9a6e" stroke="#4f513a" stroke-width="0.9"/>`;
        }
        return s;
      },
      front: (b) => `
        ${gill(66, 100, 40)}
        <circle cx="64" cy="80" r="5" fill="#1d1d1d"/>
        ${leafFin(76, 108, 40, 8, 12, '#cfc58c')}
        <path d="M 22 100 L 38 106" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
        ${eye(44, 92, 9, '#e3cf7a')}`,
    });
  };

  art.saba = () => spindle({
    label: 'サバ',
    body: { nx: 20, mx: 115, px: 254, h: 38, hb: 38, ph: 6, k1: 0.15, k2: 0.75 },
    grad: [[0, '#2f7086'], [0.42, '#5aa0ac'], [0.55, '#dde9ea'], [1, '#f6f8f8']],
    back: (b) => `
      ${tail(b, 'fork', 50, 44, '#3d7182')}
      ${finUp(b, 78, 112, 22, '#4b7c89', 0.2)}
      ${finUp(b, 142, 168, 16, '#4b7c89', 0.15, false)}
      ${finDown(b, 148, 172, 14, '#b7cdd2', 0.15, false)}
      ${finlets(b, 180, 244, 5, '#4b7c89', 7)}`,
    // 背中の黒い波模様（虎斑）
    clip: () => {
      let s = '';
      for (let x0 = 62; x0 < 260; x0 += 12) {
        s += `<path d="M ${x0} 55 Q ${x0 + 8} 66 ${x0 + 2} 75 Q ${x0 - 6} 84 ${x0 + 4} 95" fill="none" stroke="#14262f" stroke-width="3.2" stroke-linecap="round"/>`;
      }
      return s;
    },
    front: (b) => `
      ${gill(64, 100, 36)}
      ${leafFin(78, 104, 22, 7, 8, '#4b7c89')}
      <path d="M 20 100 L 38 105" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
      ${eye(43, 93, 8.5, '#c9d6da')}`,
  });

  // ---------- サンマ・サヨリ ----------
  art.sanma = () => spindle({
    label: 'サンマ',
    body: { nx: 10, mx: 120, px: 270, h: 20, hb: 20, ph: 4, k1: 0.35, k2: 0.45 },
    grad: [[0, '#1d3264'], [0.42, '#3d5f9a'], [0.5, '#c5d0e0'], [1, '#f1f4f8']],
    back: (b) => `
      ${tail(b, 'fork', 32, 22, '#2a3f6d')}
      ${finUp(b, 196, 214, 9, '#2a3f6d', 0.25, false)}
      ${finDown(b, 192, 212, 9, '#9aa8bd', 0.25, false)}
      ${finlets(b, 222, 262, 6, '#2a3f6d', 4)}`,
    front: (b) => `
      <path d="M 7 101 L 22 101" stroke="${OUT}" stroke-width="1.6"/>
      <circle cx="8" cy="101.5" r="2.6" fill="#f2b632" stroke="${OUT}" stroke-width="0.8"/>
      ${gill(52, 100, 18)}
      ${leafFin(60, 104, 16, 5, 5, '#2a3f6d')}
      ${eye(36, 97, 6, '#c0c8d0')}`,
  });

  art.sayori = () => spindle({
    label: 'サヨリ',
    body: { nx: 36, mx: 135, px: 270, h: 17, hb: 17, ph: 4, k1: 0.3, k2: 0.5 },
    grad: [[0, '#5e8f80'], [0.42, '#93bcae'], [0.52, '#dbe9ec'], [1, '#f6fbfb']],
    back: (b) => `
      ${tail(b, 'fork', 32, 22, '#7aa596')}
      ${finUp(b, 212, 238, 10, '#86ad9f', 0.25, false)}
      ${finDown(b, 210, 236, 10, '#c9dcd6', 0.25, false)}`,
    clip: () => `<path d="M 40 100 L 270 100" stroke="#a9bcd0" stroke-width="5" opacity="0.8"/>`,
    front: (b) => `
      <path d="M 40 101 L 4 103 L 40 105 Z" fill="#cfdcd8" stroke="${OUT}" stroke-width="1.3" stroke-linejoin="round"/>
      <path d="M 4 103 L 16 101.8 L 16 104.2 Z" fill="#e2433b" stroke="#a52a24" stroke-width="0.8"/>
      ${gill(74, 100, 15)}
      ${leafFin(82, 103, 14, 5, 5, '#86ad9f')}
      ${eye(54, 97, 5.5, '#c0c8d0')}`,
  });

  // ---------- マダイ・クロダイ ----------
  const taiBody = { nx: 28, mx: 118, px: 240, h: 60, hb: 48, ph: 10, k1: 0.06, k2: 0.95, k3: 0.7, ny: 6 };

  art.madai = () => spindle({
    label: 'マダイ',
    body: taiBody,
    grad: [[0, '#d9475c'], [0.45, '#ee8a94'], [1, '#fbe2e0']],
    back: (b) => `
      ${tail(b, 'shallow', 56, 46, '#ea7482', `<path d="M ${b.px + 56} ${b.cy - 46} Q ${b.px + 56 * 0.9} ${b.cy - 14} ${b.px + 56 * 0.75} ${b.cy} Q ${b.px + 56 * 0.9} ${b.cy + 14} ${b.px + 56} ${b.cy + 46}" fill="none" stroke="#1d1d1d" stroke-width="4.5" stroke-linecap="round"/>`)}
      ${finUp(b, 84, 214, 22, '#ec7d8a', 0.25)}
      ${finDown(b, 172, 216, 18, '#f3a3aa', 0.2)}`,
    // 青い斑点
    clip: () => {
      const r = rng(3);
      let s = '';
      for (let i = 0; i < 42; i++) {
        const x = 70 + r() * 170, y = 46 + r() * 50;
        s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(1.6 + r() * 1.3)}" fill="#4fd3f0"/>`;
      }
      return s;
    },
    front: (b) => `
      ${gill(70, 100, 52)}
      ${leafFin(84, 116, 44, 9, 18, '#f08d97')}
      ${leafFin(104, 146, 22, 7, 55, '#f3a3aa')}
      <path d="M 28 106 Q 34 112 42 110" fill="none" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
      ${eye(52, 86, 8.5, '#e6b84a')}`,
  });

  art.kurodai = () => spindle({
    label: 'クロダイ',
    body: taiBody,
    grad: [[0, '#2d3238'], [0.5, '#5f676f'], [1, '#c9cdd1']],
    back: (b) => `
      ${tail(b, 'shallow', 56, 46, '#3b4148')}
      ${finUp(b, 84, 214, 22, '#3b4148', 0.25)}
      ${finDown(b, 172, 216, 18, '#4a5058', 0.2)}`,
    clip: () => [90, 115, 140, 165, 190, 215]
      .map((x) => `<rect x="${x}" y="30" width="10" height="140" fill="#1e2226" opacity="0.18"/>`)
      .join(''),
    front: (b) => `
      ${gill(70, 100, 52, '#14181b')}
      ${leafFin(84, 116, 44, 9, 18, '#4a5058')}
      ${leafFin(104, 146, 22, 7, 55, '#2d3238')}
      <path d="M 26 104 Q 30 114 44 111" fill="#d6c7b6" stroke="${OUT}" stroke-width="2.4" stroke-linecap="round"/>
      ${eye(52, 86, 8.5, '#a8b0b8')}`,
  });

  // ---------- ブリ・カンパチ ----------
  art.buri = () => spindle({
    label: 'ブリ',
    body: { nx: 18, mx: 120, px: 258, h: 40, hb: 40, ph: 6, k1: 0.15, k2: 0.75 },
    grad: [[0, '#2a5a79'], [0.4, '#4f86a3'], [0.55, '#d6e2e8'], [1, '#f3f6f7']],
    back: (b) => `
      ${tail(b, 'fork', 50, 46, '#d3b73f')}
      ${finUp(b, 96, 118, 10, '#3a6886', 0.3, false)}
      ${finUp(b, 124, 228, 15, '#3a6886', 0.1)}
      ${finDown(b, 168, 228, 11, '#d6c35a', 0.1)}`,
    // 目から尾まで走る黄色い帯
    clip: () => `<path d="M 30 96 Q 140 92 260 100" fill="none" stroke="#f2cc2e" stroke-width="7"/>`,
    front: (b) => `
      ${gill(64, 100, 38)}
      ${leafFin(76, 106, 26, 7, 6, '#d6c35a')}
      <path d="M 18 100 L 38 106" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
      ${eye(42, 94, 7.5, '#c9d0d6')}`,
  });

  art.kanpachi = () => spindle({
    label: 'カンパチ',
    body: { nx: 18, mx: 118, px: 256, h: 46, hb: 42, ph: 6, k1: 0.12, k2: 0.8 },
    grad: [[0, '#5d5c55'], [0.4, '#8f8a7c'], [0.55, '#e4dccb'], [1, '#f6f2ea']],
    back: (b) => `
      ${tail(b, 'fork', 50, 48, '#a8955c')}
      ${finUp(b, 96, 118, 10, '#6d6a5e', 0.3, false)}
      ${finUp(b, 124, 228, 20, '#6d6a5e', 0.05)}
      ${finDown(b, 162, 228, 16, '#c9b06a', 0.05)}`,
    clip: () => `
      <path d="M 30 98 Q 140 94 260 100" fill="none" stroke="#d9a63e" stroke-width="6" opacity="0.8"/>
      <path d="M 74 52 L 28 112" stroke="#2a2724" stroke-width="12" stroke-linecap="round" opacity="0.85"/>`,
    front: (b) => `
      ${gill(66, 100, 42)}
      ${leafFin(78, 108, 26, 7, 6, '#c9b06a')}
      <path d="M 18 100 L 36 106" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
      ${eye(46, 90, 7.5, '#c9a46a')}`,
  });

  // ---------- フグ・カワハギ ----------
  art.fugu = () => spindle({
    label: 'フグ',
    body: { nx: 38, mx: 128, px: 246, h: 62, hb: 62, ph: 12, k1: 0.0, k2: 1.0, ny: 6 },
    grad: [[0, '#2f343a'], [0.5, '#585e65'], [0.58, '#f7f7f5'], [1, '#ffffff']],
    back: (b) => `
      ${tail(b, 'round', 38, 28, '#3b4046')}
      ${finUp(b, 200, 226, 22, '#3b4046', 0.4, false)}
      ${finDown(b, 200, 226, 22, '#f2f2ee', 0.4, false)}`,
    clip: () => {
      const r = rng(11);
      let s = '';
      for (let i = 0; i < 26; i++) {
        s += `<circle cx="${f(60 + r() * 180)}" cy="${f(42 + r() * 50)}" r="${f(1.5 + r() * 2)}" fill="#e9e9e4" opacity="0.6"/>`;
      }
      return s;
    },
    front: (b) => `
      <circle cx="132" cy="106" r="15" fill="#111" stroke="#fff" stroke-width="4"/>
      <circle cx="132" cy="106" r="19" fill="none" stroke="${OUT}" stroke-width="1"/>
      ${leafFin(98, 106, 22, 10, -10, '#3b4046')}
      <path d="M 37 102 Q 44 98 46 106 Q 44 114 37 110 Z" fill="#f4f0e2" stroke="${OUT}" stroke-width="1.6"/>
      <line x1="38" y1="106" x2="45" y2="106" stroke="${OUT}" stroke-width="1.2"/>
      ${eye(74, 78, 8, '#d9c25a')}`,
  });

  art.kawahagi = () => {
    const id = `f${++uid}`;
    const d = 'M 22 110 Q 70 64 128 42 Q 180 62 250 92 L 250 108 Q 180 136 128 160 Q 70 150 22 110 Z';
    const r = rng(5);
    let blots = '';
    for (let i = 0; i < 14; i++) {
      blots += `<ellipse cx="${f(60 + r() * 180)}" cy="${f(60 + r() * 90)}" rx="${f(6 + r() * 10)}" ry="${f(4 + r() * 7)}" fill="#6a5636" opacity="0.35"/>`;
    }
    const defs = gradient(`${id}g`, [[0, '#a99067'], [0.5, '#cdb98f'], [1, '#e8dcc0']]) + `<clipPath id="${id}c"><path d="${d}"/></clipPath>`;
    const inner = `
      <path d="M 244 92 L 296 74 Q 290 100 296 126 L 244 108 Z" fill="#b9a57b" stroke="${OUT}" stroke-width="1.8"/>
      <path d="M 268 84 Q 263 100 268 116" stroke="#4c3d24" stroke-width="5" fill="none" opacity="0.7"/>
      <path d="M 150 58 Q 200 54 250 92 L 240 92 Q 200 72 156 64 Z" fill="#c4ae80" stroke="${OUT}" stroke-width="1.5"/>
      <path d="M 150 142 Q 200 146 250 108 L 240 108 Q 200 128 156 138 Z" fill="#c4ae80" stroke="${OUT}" stroke-width="1.5"/>
      <path d="${d}" fill="url(#${id}g)"/>
      <g clip-path="url(#${id}c)">${blots}</g>
      <path d="${d}" fill="none" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M 104 52 L 114 14 L 120 48 Z" fill="#8b7650" stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round"/>
      <path d="M 120 158 L 128 176 L 136 158" fill="#8b7650" stroke="${OUT}" stroke-width="1.5"/>
      <path d="M 14 108 Q 18 104 24 106 L 24 112 Q 18 114 14 110 Z" fill="#d9c9a4" stroke="${OUT}" stroke-width="1.6"/>
      ${gill(86, 108, 18)}
      ${leafFin(94, 110, 16, 6, 0, '#c4ae80')}
      ${eye(80, 84, 7.5, '#e0bf55')}`;
    return wrap(inner, defs, 'カワハギ');
  };

  // ---------- コイ・フナ ----------
  art.koi = () => spindle({
    label: 'コイ',
    body: { nx: 22, mx: 125, px: 248, h: 42, hb: 38, ph: 12, k1: 0.12, k2: 0.75, ny: 4 },
    grad: [[0, '#4b4a2f'], [0.4, '#8d7a47'], [0.7, '#cdb882'], [1, '#ece0b6']],
    back: (b) => `
      ${tail(b, 'fork', 46, 40, '#7e6d40')}
      ${finUp(b, 108, 196, 22, '#6c5e38', 0.1)}
      ${finDown(b, 192, 214, 18, '#a68f58', 0.2, false)}`,
    clip: (b) => scales(b, 66, 250, 13, '#2e2a17', 0.5),
    front: (b) => `
      ${gill(64, 102, 40)}
      ${leafFin(70, 120, 24, 8, 30, '#a68f58')}
      ${leafFin(130, 136, 20, 7, 30, '#a68f58')}
      <path d="M 22 104 Q 26 110 32 108" fill="none" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M 26 105 Q 24 114 30 120" fill="none" stroke="${OUT}" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M 32 108 Q 34 120 44 126" fill="none" stroke="${OUT}" stroke-width="2.6" stroke-linecap="round"/>
      ${eye(42, 92, 6.5, '#d8b44a')}`,
  });

  art.funa = () => spindle({
    label: 'フナ',
    body: { nx: 26, mx: 118, px: 245, h: 52, hb: 40, ph: 12, k1: 0.1, k2: 0.85, ny: 4 },
    grad: [[0, '#5f6648'], [0.45, '#a3a888'], [0.7, '#d6d8c3'], [1, '#eef0e3']],
    back: (b) => `
      ${tail(b, 'fork', 46, 40, '#7d8264')}
      ${finUp(b, 112, 196, 20, '#6a7052', 0.1)}
      ${finDown(b, 190, 212, 16, '#a0a588', 0.2, false)}`,
    clip: (b) => scales(b, 66, 250, 13, '#2e3220', 0.45),
    front: (b) => `
      ${gill(64, 102, 44)}
      ${leafFin(70, 120, 24, 8, 30, '#a0a588')}
      ${leafFin(128, 138, 20, 7, 30, '#a0a588')}
      <path d="M 26 104 Q 30 108 35 106" fill="none" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
      ${eye(44, 92, 6.5, '#d8c068')}`,
  });

  // ---------- サケ・ニジマス ----------
  const salmonBody = { nx: 20, mx: 125, px: 250, h: 40, hb: 38, ph: 10, k1: 0.2, k2: 0.65, ny: 2 };
  const adipose = (b, color) => `<path d="M 212 ${f(b.top(212) + 3)} Q 220 ${f(b.top(218) - 12)} 228 ${f(b.top(228) + 2)} Z" fill="${color}" stroke="${OUT}" stroke-width="1.4"/>`;

  art.sake = () => spindle({
    label: 'サケ',
    body: salmonBody,
    grad: [[0, '#304a64'], [0.4, '#6b86a0'], [0.55, '#dfe5ea'], [1, '#f5f7f8']],
    back: (b) => `
      ${tail(b, 'shallow', 46, 40, '#3f5872')}
      ${finUp(b, 122, 158, 24, '#3f5872', 0.25)}
      ${adipose(b, '#3f5872')}
      ${finDown(b, 184, 210, 16, '#c9d2da', 0.2, false)}`,
    front: (b) => `
      ${gill(62, 102, 38)}
      ${leafFin(72, 112, 24, 7, 22, '#9eb0c0')}
      ${leafFin(140, 134, 18, 6, 30, '#c9d2da')}
      <path d="M 20 102 L 42 106" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
      ${eye(42, 94, 6.5, '#c9d0d6')}`,
  });

  art.nijimasu = () => {
    const r = rng(9);
    const dots = (n, x1, x2, y1, y2, rr = 1.8) => {
      let s = '';
      for (let i = 0; i < n; i++) s += `<circle cx="${f(x1 + r() * (x2 - x1))}" cy="${f(y1 + r() * (y2 - y1))}" r="${f(rr * (0.7 + r() * 0.6))}" fill="#1b1b1b"/>`;
      return s;
    };
    return spindle({
      label: 'ニジマス',
      body: salmonBody,
      grad: [[0, '#56653f'], [0.4, '#93986a'], [0.6, '#e9d9cf'], [1, '#f7efe9']],
      back: (b) => `
        ${tail(b, 'shallow', 46, 40, '#7d8360', dots(22, b.px + 4, b.px + 40, b.cy - 30, b.cy + 30, 1.6))}
        ${finUp(b, 122, 158, 24, '#7d8360', 0.25)}
        <g>${dots(8, 128, 150, b.top(140) - 16, b.top(140) - 2, 1.4)}</g>
        ${adipose(b, '#7d8360')}
        ${finDown(b, 184, 210, 16, '#d9c6bb', 0.2, false)}`,
      // 体側の虹色（ピンク）の帯と黒い斑点
      clip: (b) => `<path d="M 40 101 Q 140 100 252 101" fill="none" stroke="#e46d86" stroke-width="15" opacity="0.75"/>${dots(70, 40, 250, 60, 115)}`,
      front: (b) => `
        ${gill(62, 102, 38)}
        ${leafFin(72, 112, 24, 7, 22, '#d9c6bb')}
        ${leafFin(140, 134, 18, 6, 30, '#d9c6bb')}
        <path d="M 20 102 L 42 106" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
        ${eye(42, 94, 6.5, '#d8c068')}`,
    });
  };

  // ---------- マイワシ・カタクチイワシ ----------
  art.maiwashi = () => spindle({
    label: 'マイワシ',
    body: { nx: 20, mx: 118, px: 250, h: 34, hb: 34, ph: 6, k1: 0.18, k2: 0.7 },
    grad: [[0, '#25507d'], [0.42, '#5d8bb8'], [0.52, '#dfe8f1'], [1, '#f6f8fb']],
    back: (b) => `
      ${tail(b, 'fork', 46, 36, '#3b6290')}
      ${finUp(b, 124, 150, 18, '#3b6290', 0.3, false)}
      ${finDown(b, 196, 214, 9, '#c7d3df', 0.2, false)}`,
    // 体の横に並ぶ黒い点（七つ星）
    clip: () => [72, 90, 108, 126, 144, 162, 180]
      .map((x, i) => `<circle cx="${x}" cy="${f(98 - i * 0.2)}" r="4" fill="#132238"/>`)
      .join(''),
    front: (b) => `
      ${gill(58, 100, 32)}
      ${leafFin(66, 112, 18, 5, 20, '#c7d3df')}
      <path d="M 20 101 L 34 104" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
      ${eye(40, 96, 7.5, '#c9d0d6')}`,
  });

  art.katakuchi = () => spindle({
    label: 'カタクチイワシ',
    body: { nx: 12, mx: 120, px: 252, h: 28, hb: 26, ph: 5, k1: 0.15, k2: 0.75, ny: -3 },
    grad: [[0, '#244460'], [0.4, '#4d7495'], [0.5, '#c4d2de'], [1, '#f2f5f8']],
    back: (b) => `
      ${tail(b, 'fork', 42, 32, '#3c5f7e')}
      ${finUp(b, 126, 148, 15, '#3c5f7e', 0.3, false)}
      ${finDown(b, 184, 206, 9, '#c7d3df', 0.2, false)}`,
    clip: () => `<path d="M 60 100 L 252 100" stroke="#b9c9d9" stroke-width="5"/>`,
    front: (b) => `
      <path d="M 18 103 L 62 108" stroke="${OUT}" stroke-width="2" stroke-linecap="round"/>
      <path d="M 26 106 Q 40 114 62 108" fill="#e4ebf1" stroke="${OUT}" stroke-width="1.4"/>
      ${gill(66, 100, 26)}
      ${leafFin(72, 110, 16, 5, 20, '#c7d3df')}
      ${eye(32, 94, 8, '#c9d0d6')}`,
  });

  // ---------- サメ・イルカ ----------
  art.same = () => spindle({
    label: 'サメ',
    body: { nx: 10, mx: 120, px: 250, h: 32, hb: 30, ph: 7, k1: 0.25, k2: 0.5, ny: -4 },
    grad: [[0, '#5d6d7a'], [0.45, '#8797a3'], [0.6, '#e6eaed'], [1, '#f4f6f7']],
    back: (b) => `
      <path d="M 244 ${b.cy - 7} L 306 ${b.cy - 66} Q 300 ${b.cy - 44} 280 ${b.cy - 2} L 290 ${b.cy + 28} Q 266 ${b.cy + 14} 244 ${b.cy + 7} Z" fill="#6c7b87" stroke="${OUT}" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M 122 ${f(b.top(122) + 4)} L 152 ${f(b.top(150) - 46)} Q 160 ${f(b.top(165) - 20)} 178 ${f(b.top(178) + 3)} Z" fill="#6c7b87" stroke="${OUT}" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M 214 ${f(b.top(214) + 3)} L 222 ${f(b.top(222) - 12)} L 230 ${f(b.top(230) + 2)} Z" fill="#6c7b87" stroke="${OUT}" stroke-width="1.4"/>
      <path d="M 208 ${f(b.bot(208) - 3)} L 216 ${f(b.bot(216) + 10)} L 224 ${f(b.bot(224) - 2)} Z" fill="#9aa8b2" stroke="${OUT}" stroke-width="1.4"/>`,
    front: (b) => `
      ${[76, 82, 88, 94, 100].map((x) => `<path d="M ${x} 86 Q ${x + 4} 98 ${x} 110" fill="none" stroke="#33404a" stroke-width="2" stroke-linecap="round"/>`).join('')}
      <path d="M 96 116 L 130 152 Q 128 136 126 118 Z" fill="#6c7b87" stroke="${OUT}" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M 26 106 Q 40 114 56 110" fill="none" stroke="${OUT}" stroke-width="2" stroke-linecap="round"/>
      <circle cx="40" cy="92" r="3.6" fill="#111"/>
      <circle cx="39" cy="91" r="1" fill="#fff"/>`,
  });

  art.iruka = () => {
    const id = `f${++uid}`;
    const d = 'M 8 108 Q 22 103 40 101 C 44 82 66 68 108 66 C 170 64 222 86 262 97 L 262 104 C 222 118 160 136 102 134 C 62 132 42 122 40 114 Q 22 114 8 111 Z';
    const defs = gradient(`${id}g`, [[0, '#4f6f8e'], [0.45, '#7898b4'], [0.62, '#e1e9f0'], [1, '#f2f6f9']]) + `<clipPath id="${id}c"><path d="${d}"/></clipPath>`;
    const inner = `
      <path d="M 256 96 Q 284 86 314 90 Q 300 100 314 110 Q 284 114 256 105 Z" fill="#56768f" stroke="${OUT}" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M 150 70 Q 160 40 186 30 Q 176 52 188 76 Z" fill="#56768f" stroke="${OUT}" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="${d}" fill="url(#${id}g)"/>
      <path d="${d}" fill="none" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M 86 120 Q 100 150 120 156 Q 112 136 108 120 Z" fill="#56768f" stroke="${OUT}" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M 88 68 Q 94 64 100 67" fill="none" stroke="#1d2a36" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M 10 110 Q 30 112 48 108 Q 54 106 58 102" fill="none" stroke="${OUT}" stroke-width="1.6" stroke-linecap="round"/>
      <circle cx="62" cy="96" r="3.4" fill="#111"/>
      <circle cx="61" cy="95" r="1" fill="#fff"/>`;
    return wrap(inner, defs, 'イルカ');
  };

  return {
    render(key) {
      if (!art[key]) throw new Error(`unknown fish: ${key}`);
      return art[key]();
    },
    keys: () => Object.keys(art),
  };
})();

if (typeof module !== 'undefined') module.exports = FishArt;
