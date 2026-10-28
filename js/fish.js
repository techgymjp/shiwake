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
      ${o.pectoral === false ? '' : leafFin(48, yc(48) + 2, 16, 7, 15, o.finColor)}
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
      <path d="M 18 100 L 46 99 L 47 108 L 24 106 Z" fill="#c7d4dc" stroke="${OUT}" stroke-width="1.6" stroke-linejoin="miter"/>
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


  // ======================================================
  //  追加の魚（50組対応）
  // ======================================================

  // 共通：散らばった点
  function dots(seed, n, x1, x2, y1, y2, rmin, rmax, color, opacity = 1) {
    const r = rng(seed);
    let s = '';
    for (let i = 0; i < n; i++) {
      s += `<circle cx="${f(x1 + r() * (x2 - x1))}" cy="${f(y1 + r() * (y2 - y1))}" r="${f(rmin + r() * (rmax - rmin))}" fill="${color}" opacity="${opacity}"/>`;
    }
    return s;
  }
  // 共通：縦じま
  function vbands(xs, w, color, opacity = 1, skew = 0) {
    return xs.map((x) => `<path d="M ${x} 20 L ${x + w} 20 L ${x + w + skew} 180 L ${x + skew} 180 Z" fill="${color}" opacity="${opacity}"/>`).join('');
  }
  const mouthLine = (x1, y1, x2, y2, w = 1.8) => `<path d="M ${x1} ${y1} L ${x2} ${y2}" stroke="${OUT}" stroke-width="${w}" stroke-linecap="round"/>`;

  // ---------- ヒラマサ（ブリと比較） ----------
  art.hiramasa = () => spindle({
    label: 'ヒラマサ',
    body: { nx: 18, mx: 125, px: 260, h: 34, hb: 34, ph: 6, k1: 0.18, k2: 0.7 },
    grad: [[0, '#2f6a86'], [0.4, '#5d9ab3'], [0.55, '#dfe9ee'], [1, '#f5f8f9']],
    back: (b) => `
      ${tail(b, 'fork', 50, 44, '#e2c22e')}
      ${finUp(b, 98, 118, 8, '#3a7090', 0.3, false)}
      ${finUp(b, 124, 230, 13, '#3a7090', 0.1)}
      ${finDown(b, 170, 230, 10, '#e0c740', 0.1)}`,
    clip: () => `<path d="M 30 97 Q 140 94 262 100" fill="none" stroke="#ffd21c" stroke-width="10"/>`,
    front: (b) => `
      ${gill(62, 100, 32)}
      ${leafFin(74, 105, 20, 6, 6, '#e0c740')}
      <path d="M 18 100 L 40 99 Q 49 103 41 108 L 24 106 Z" fill="#c7d4dc" stroke="${OUT}" stroke-width="1.6"/>
      ${eye(40, 94, 7, '#c9d0d6')}`,
  });

  // ---------- シマアジ・ムロアジ（マアジと比較） ----------
  art.shimaaji = () => spindle({
    label: 'シマアジ',
    body: { nx: 22, mx: 110, px: 248, h: 50, hb: 44, ph: 6, k1: 0.12, k2: 0.8, ny: 2 },
    grad: [[0, '#5f8580'], [0.4, '#a8c4bb'], [0.55, '#e8eee6'], [1, '#f7f8f2']],
    back: (b) => `
      ${tail(b, 'fork', 52, 46, '#e4c43a')}
      ${finUp(b, 82, 110, 20, '#7d9e95', 0.3)}
      ${finUp(b, 118, 230, 16, '#c9c27a', 0.05)}
      ${finDown(b, 138, 230, 14, '#e2cc58', 0.05)}`,
    clip: () => {
      let s = '<path d="M 30 98 Q 140 94 250 100" fill="none" stroke="#f5cf2a" stroke-width="10"/>';
      for (let x = 170; x <= 246; x += 6) s += `<rect x="${x - 2.5}" y="96" width="5" height="8" rx="1.4" fill="#b5b48a" stroke="#5c5d44" stroke-width="0.8"/>`;
      return s;
    },
    front: (b) => `
      ${gill(64, 100, 44)}
      ${leafFin(76, 110, 40, 8, 12, '#e2cc58')}
      <path d="M 21 101 Q 30 108 40 106" fill="#efe2c0" stroke="${OUT}" stroke-width="2.4" stroke-linecap="round"/>
      ${eye(46, 88, 8, '#d9c56a')}`,
  });

  art.muroaji = () => spindle({
    label: 'ムロアジ',
    body: { nx: 18, mx: 118, px: 252, h: 30, hb: 30, ph: 5, k1: 0.18, k2: 0.7 },
    grad: [[0, '#3c6a7e'], [0.42, '#7ea6b4'], [0.55, '#e3ebee'], [1, '#f6f8f8']],
    back: (b) => `
      ${tail(b, 'fork', 48, 38, '#c9b25a')}
      ${finUp(b, 86, 112, 18, '#4f7a8a', 0.3)}
      ${finUp(b, 120, 216, 11, '#7d9aa5', 0.05)}
      ${finDown(b, 140, 216, 9, '#c2d0d6', 0.05)}
      <path d="M 222 ${f(b.top(222) + 2)} L 230 ${f(b.top(230) - 7)} L 232 ${f(b.top(232) + 2)} Z" fill="#7d9aa5" stroke="${OUT}" stroke-width="1"/>
      <path d="M 222 ${f(b.bot(222) - 2)} L 230 ${f(b.bot(230) + 7)} L 232 ${f(b.bot(232) - 2)} Z" fill="#c2d0d6" stroke="${OUT}" stroke-width="1"/>`,
    clip: () => {
      let s = '<path d="M 56 92 Q 120 92 252 100" fill="none" stroke="#e5c84a" stroke-width="3"/>';
      for (let x = 176; x <= 248; x += 6) s += `<rect x="${x - 2.6}" y="${f(97 + (x - 176) * 0.03)}" width="5.2" height="8" rx="1.4" fill="#9fb0ae" stroke="#4b5a5a" stroke-width="0.8"/>`;
      return s;
    },
    front: (b) => `
      ${gill(60, 100, 30)}
      <circle cx="58" cy="86" r="3.5" fill="#1d1d1d"/>
      ${leafFin(70, 106, 28, 6, 10, '#c2d0d6')}
      ${mouthLine(18, 100, 34, 104)}
      ${eye(40, 95, 7.5, '#d8cf8a')}`,
  });

  // ---------- ゴマサバ（マサバと比較） ----------
  art.gomasaba = () => spindle({
    label: 'ゴマサバ',
    body: { nx: 20, mx: 115, px: 254, h: 38, hb: 40, ph: 6, k1: 0.15, k2: 0.75 },
    grad: [[0, '#2f6f85'], [0.42, '#5d9fac'], [0.55, '#dde8ea'], [1, '#f6f8f8']],
    back: (b) => `
      ${tail(b, 'fork', 50, 44, '#3d7182')}
      ${finUp(b, 78, 112, 22, '#4b7c89', 0.2)}
      ${finUp(b, 142, 168, 16, '#4b7c89', 0.15, false)}
      ${finDown(b, 148, 172, 14, '#b7cdd2', 0.15, false)}
      ${finlets(b, 180, 244, 5, '#4b7c89', 7)}`,
    clip: () => {
      let s = '';
      for (let x0 = 64; x0 < 260; x0 += 10) s += `<path d="M ${x0} 58 Q ${x0 + 5} 66 ${x0 + 1} 74 Q ${x0 - 4} 82 ${x0 + 3} 90" fill="none" stroke="#1b3540" stroke-width="2" opacity="0.7" stroke-linecap="round"/>`;
      // お腹のゴマ模様
      return s + dots(17, 70, 60, 240, 104, 132, 1.2, 2.3, '#3a4a55', 0.9);
    },
    front: (b) => `
      ${gill(64, 100, 36)}
      ${leafFin(78, 104, 22, 7, 8, '#4b7c89')}
      ${mouthLine(20, 100, 38, 105)}
      ${eye(43, 93, 8.5, '#c9d6da')}`,
  });

  // ---------- ソウダガツオ（カツオと比較） ----------
  art.souda = () => spindle({
    label: 'ソウダガツオ',
    body: { nx: 20, mx: 112, px: 256, h: 38, hb: 40, ph: 6, k1: 0.15, k2: 0.78 },
    grad: [[0, '#1f4a7a'], [0.42, '#4d7fae'], [0.55, '#dfe7ef'], [1, '#f5f7fa']],
    back: (b) => `
      ${tail(b, 'moon', 44, 50, '#25406f')}
      ${finUp(b, 84, 112, 22, '#25406f', 0.15)}
      ${finUp(b, 160, 176, 12, '#5c6f8c', 0.2, false)}
      ${finDown(b, 164, 180, 12, '#a9b4c0', 0.2, false)}
      ${finlets(b, 188, 248, 7, '#4f5f78', 6)}`,
    // 第1背びれより後ろの背中だけにある波模様
    clip: () => {
      let s = '';
      for (let x0 = 130; x0 < 262; x0 += 9) s += `<path d="M ${x0} 66 Q ${x0 + 6} 74 ${x0} 82 Q ${x0 - 5} 88 ${x0 + 2} 94" fill="none" stroke="#0f2340" stroke-width="2.6" stroke-linecap="round"/>`;
      return s;
    },
    front: (b) => `
      <path d="M 244 98 L 260 100 L 244 102 Z" fill="#1c3768"/>
      ${gill(64, 100, 36)}
      ${leafFin(76, 104, 20, 7, 5, '#25406f')}
      ${mouthLine(20, 100, 38, 105)}
      ${eye(42, 93, 7.5, '#c0c8d0')}`,
  });

  // ---------- キハダ（マグロと比較） ----------
  art.kihada = () => spindle({
    label: 'キハダ',
    body: { nx: 18, mx: 118, px: 262, h: 44, hb: 42, ph: 6, k1: 0.14, k2: 0.78 },
    grad: [[0, '#1d3a66'], [0.38, '#3d5f91'], [0.5, '#c9d2dc'], [1, '#f0f3f6']],
    back: (b) => `
      ${tail(b, 'moon', 48, 60, '#c9a826')}
      ${finUp(b, 92, 132, 20, '#2a4774', 0.15)}
      <path d="M 154 ${f(b.top(154) + 4)} Q 166 ${f(b.top(160) - 30)} 196 ${f(b.top(170) - 62)} Q 186 ${f(b.top(176) - 20)} 180 ${f(b.top(180) + 4)} Z" fill="#f2c51c" stroke="${OUT}" stroke-width="1.6"/>
      <path d="M 156 ${f(b.bot(156) - 4)} Q 168 ${f(b.bot(160) + 30)} 198 ${f(b.bot(170) + 60)} Q 188 ${f(b.bot(176) + 20)} 182 ${f(b.bot(182) - 4)} Z" fill="#f2c51c" stroke="${OUT}" stroke-width="1.6"/>
      ${finlets(b, 194, 254, 8, '#f2c51c', 8)}`,
    clip: () => `<path d="M 50 92 Q 160 86 262 100" fill="none" stroke="#e8c83a" stroke-width="6" opacity="0.8"/>`,
    front: (b) => `
      <path d="M 250 98 L 266 100 L 250 102 Z" fill="#1d3a66"/>
      ${gill(64, 100, 40)}
      ${leafFin(78, 104, 44, 8, 8, '#2a4774')}
      ${mouthLine(18, 100, 38, 105)}
      ${eye(42, 93, 7.5, '#c0c8d0')}`,
  });

  // ---------- カジキ（マグロと比較） ----------
  art.kajiki = () => spindle({
    label: 'カジキ',
    body: { nx: 64, mx: 140, px: 262, h: 34, hb: 32, ph: 5, k1: 0.2, k2: 0.6, ny: -2 },
    grad: [[0, '#1e3f6e'], [0.42, '#4a74a8'], [0.55, '#dce5ef'], [1, '#f3f6f9']],
    back: (b) => `
      ${tail(b, 'moon', 44, 56, '#1e3f6e')}
      <path d="M 86 ${f(b.top(86) + 4)} Q 92 ${f(b.top(92) - 52)} 104 ${f(b.top(100) - 56)} Q 160 ${f(b.top(150) - 16)} 200 ${f(b.top(200) + 3)} Z" fill="#2a5596" stroke="${OUT}" stroke-width="1.6"/>
      ${finDown(b, 196, 222, 14, '#a9b8c8', 0.2, false)}`,
    clip: () => vbands([110, 128, 146, 164, 182, 200, 218], 5, '#9fd0ff', 0.55),
    front: (b) => `
      <path d="M 66 96 L 4 99 L 66 101 Z" fill="#2c4f80" stroke="${OUT}" stroke-width="1.5" stroke-linejoin="round"/>
      ${mouthLine(66, 102, 84, 106)}
      ${gill(104, 100, 30)}
      ${leafFin(112, 112, 34, 6, 30, '#2a5596')}
      ${eye(88, 95, 6.5, '#c0c8d0')}`,
  });

  // ---------- チダイ（マダイと比較） ----------
  art.chidai = () => spindle({
    label: 'チダイ',
    body: { nx: 28, mx: 118, px: 240, h: 60, hb: 48, ph: 10, k1: 0.06, k2: 0.95, k3: 0.7, ny: 6 },
    grad: [[0, '#e0566a'], [0.45, '#f29aa3'], [1, '#fde6e4']],
    back: (b) => `
      ${tail(b, 'shallow', 56, 46, '#ef8a95')}
      ${finUp(b, 84, 214, 22, '#ef8a95', 0.25)}
      ${finDown(b, 172, 216, 18, '#f5b0b6', 0.2)}`,
    clip: () => dots(23, 16, 80, 230, 46, 90, 1.4, 2.2, '#5fd0ea'),
    front: (b) => `
      <path d="M 72 ${f(100 - 52 * 0.62)} Q ${72 + 13} 100 72 ${f(100 + 52 * 0.62)}" fill="none" stroke="#c0002b" stroke-width="5" stroke-linecap="round"/>
      ${leafFin(84, 116, 44, 9, 18, '#f39aa3')}
      ${leafFin(104, 146, 22, 7, 55, '#f5b0b6')}
      <path d="M 28 106 Q 34 112 42 110" fill="none" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
      ${eye(52, 86, 8.5, '#e6b84a')}`,
  });

  // ---------- キンメダイ・キンキ ----------
  art.kinmedai = () => spindle({
    label: 'キンメダイ',
    body: { nx: 24, mx: 115, px: 238, h: 54, hb: 50, ph: 9, k1: 0.06, k2: 0.9, ny: 4 },
    grad: [[0, '#d8212f'], [0.5, '#ef5a52'], [1, '#fbb3a3']],
    back: (b) => `
      ${tail(b, 'fork', 60, 52, '#e2343c')}
      ${finUp(b, 92, 170, 22, '#e2343c', 0.2)}
      ${finDown(b, 150, 200, 20, '#ee6a62', 0.2)}`,
    front: (b) => `
      ${gill(80, 100, 48)}
      ${leafFin(92, 110, 30, 8, 16, '#ee6a62')}
      <path d="M 24 106 Q 34 116 48 112" fill="none" stroke="${OUT}" stroke-width="2" stroke-linecap="round"/>
      ${eye(54, 86, 18, '#f2c230')}`,
  });

  art.kinki = () => spindle({
    label: 'キンキ',
    body: { nx: 22, mx: 110, px: 236, h: 46, hb: 40, ph: 10, k1: 0.12, k2: 0.75, ny: 2 },
    grad: [[0, '#e0413a'], [0.5, '#f27a5c'], [1, '#ffd0b8']],
    back: (b) => `
      ${tail(b, 'round', 46, 40, '#e85a46')}
      ${finUp(b, 70, 150, 26, '#e85a46', 0.2)}
      <path d="M 104 ${f(b.top(104) - 4)} Q 112 ${f(b.top(112) - 22)} 128 ${f(b.top(128) - 18)} L 130 ${f(b.top(130) + 2)} L 104 ${f(b.top(104) + 2)} Z" fill="#1d1d1d"/>
      ${finUp(b, 150, 212, 20, '#e85a46', 0.3)}
      ${finDown(b, 160, 206, 18, '#f08a6a', 0.2)}`,
    front: (b) => `
      ${[44, 54, 64].map((x, i) => `<path d="M ${x} ${f(b.top(x) + 2)} L ${x + 4} ${f(b.top(x) - 8 + i)} L ${x + 8} ${f(b.top(x + 8) + 2)} Z" fill="#e85a46" stroke="${OUT}" stroke-width="1.2"/>`).join('')}
      ${gill(70, 100, 44)}
      <path d="M 72 104 Q 104 82 122 108 Q 104 134 72 112 Z" fill="#f28a5a" stroke="${OUT}" stroke-width="1.6"/>
      ${[0, 1, 2, 3].map((i) => `<line x1="74" y1="108" x2="${118 - i * 2}" y2="${94 + i * 9}" stroke="${OUT}" stroke-width="0.7" opacity="0.5"/>`).join('')}
      <path d="M 22 102 Q 30 112 44 108" fill="none" stroke="${OUT}" stroke-width="2" stroke-linecap="round"/>
      ${eye(46, 86, 11, '#f2c230')}`,
  });

  // ---------- ホッケ・シマホッケ ----------
  const hokkeBody = { nx: 20, mx: 110, px: 256, h: 34, hb: 32, ph: 7, k1: 0.15, k2: 0.75 };
  const hokke = (label, grad, finC, clip) => spindle({
    label,
    body: hokkeBody,
    grad,
    back: (b) => `
      ${tail(b, 'fork', 42, 36, finC)}
      ${finUp(b, 70, 240, 14, finC, 0.1)}
      ${finDown(b, 140, 240, 12, finC, 0.1)}`,
    clip,
    front: (b) => `
      ${gill(60, 100, 32)}
      ${leafFin(70, 108, 30, 9, 10, finC)}
      ${mouthLine(20, 100, 38, 105)}
      ${eye(40, 93, 7, '#d0c070')}`,
  });
  art.hokke = () => hokke('ホッケ', [[0, '#6f6a50'], [0.45, '#a59d7c'], [0.65, '#e6e0cc'], [1, '#f4f1e6']], '#a59a6c',
    () => `<path d="M 50 92 Q 150 88 256 98" fill="none" stroke="#5a5540" stroke-width="1.2" opacity="0.6"/>${dots(31, 14, 60, 240, 70, 100, 2, 4, '#5c573f', 0.3)}`);
  art.shimahokke = () => hokke('シマホッケ', [[0, '#8a8a72'], [0.45, '#c2c0a4'], [0.65, '#ece9d8'], [1, '#f7f5ec']], '#b9b38c',
    () => vbands([78, 108, 138, 168, 198], 14, '#2c2a20', 0.8, -4));

  // ---------- マダラ・スケトウダラ ----------
  const cod = (o) => spindle({
    label: o.label,
    body: o.body,
    grad: o.grad,
    back: (b) => `
      ${tail(b, 'square', 40, 34, o.fin)}
      ${finUp(b, 92, 124, 20, o.fin, 0.3)}
      ${finUp(b, 132, 176, 18, o.fin, 0.3)}
      ${finUp(b, 184, 228, 16, o.fin, 0.3)}
      ${finDown(b, 120, 172, 14, o.fin2, 0.3)}
      ${finDown(b, 180, 226, 14, o.fin2, 0.3)}`,
    clip: o.clip,
    front: o.front,
  });
  art.madara = () => cod({
    label: 'マダラ',
    body: { nx: 18, mx: 105, px: 246, h: 46, hb: 46, ph: 8, k1: 0.08, k2: 0.85 },
    grad: [[0, '#7a6a4c'], [0.5, '#a69477'], [0.7, '#e3dccd'], [1, '#f5f2ea']],
    fin: '#8f7f60', fin2: '#cbbfa6',
    clip: () => `${dots(41, 60, 40, 246, 56, 104, 2, 4.5, '#5a4a30', 0.55)}<path d="M 50 86 Q 150 80 246 98" fill="none" stroke="#f4efe2" stroke-width="2.4"/>`,
    front: (b) => `
      ${gill(64, 100, 44)}
      ${leafFin(74, 106, 28, 9, 10, '#a69477')}
      ${mouthLine(16, 102, 38, 108)}
      <path d="M 30 112 Q 32 126 26 136" fill="none" stroke="${OUT}" stroke-width="3" stroke-linecap="round"/>
      ${eye(42, 92, 7.5, '#c8c08a')}`,
  });
  art.suketou = () => cod({
    label: 'スケトウダラ',
    body: { nx: 16, mx: 112, px: 250, h: 34, hb: 34, ph: 6, k1: 0.15, k2: 0.75, ny: 2 },
    grad: [[0, '#5f5a4a'], [0.4, '#8f8a78'], [0.55, '#dcdad2'], [1, '#f4f3ef']],
    fin: '#77715e', fin2: '#bdb8a8',
    clip: () => `<path d="M 40 94 Q 150 92 250 100" fill="none" stroke="#3e3a30" stroke-width="5" opacity="0.5"/>`,
    front: (b) => `
      ${gill(60, 100, 32)}
      ${leafFin(70, 106, 24, 7, 10, '#a39d88')}
      <path d="M 12 104 Q 24 110 40 106" fill="#e8e4d8" stroke="${OUT}" stroke-width="1.8"/>
      <path d="M 22 110 l 1 4" stroke="${OUT}" stroke-width="1.5" stroke-linecap="round"/>
      ${eye(40, 94, 9, '#d0d0c0')}`,
  });

  // ---------- カマス・サワラ ----------
  art.kamasu = () => spindle({
    label: 'カマス',
    body: { nx: 10, mx: 130, px: 262, h: 24, hb: 24, ph: 5, k1: 0.35, k2: 0.5 },
    grad: [[0, '#7a6c4e'], [0.42, '#a8a07f'], [0.55, '#e6e8e2'], [1, '#f6f7f4']],
    back: (b) => `
      ${tail(b, 'fork', 38, 30, '#b1a46a')}
      ${finUp(b, 118, 140, 16, '#8f8358', 0.3, false)}
      ${finUp(b, 196, 216, 14, '#8f8358', 0.3, false)}
      ${finDown(b, 196, 216, 12, '#d6d2bc', 0.3, false)}`,
    front: (b) => `
      <path d="M 4 103 L 50 104 L 46 108 Z" fill="#d9d6c8" stroke="${OUT}" stroke-width="1.4" stroke-linejoin="round"/>
      ${mouthLine(14, 101, 48, 103, 1.4)}
      ${gill(70, 100, 22)}
      ${leafFin(78, 104, 18, 5, 8, '#c9c0a0')}
      ${eye(50, 96, 6.5, '#d8cf8a')}`,
  });

  art.sawara = () => spindle({
    label: 'サワラ',
    body: { nx: 14, mx: 125, px: 262, h: 30, hb: 30, ph: 5, k1: 0.25, k2: 0.6 },
    grad: [[0, '#2f4d6e'], [0.42, '#6e8eac'], [0.55, '#e3e9ef'], [1, '#f6f8fa']],
    back: (b) => `
      ${tail(b, 'moon', 40, 40, '#2f4d6e')}
      ${finUp(b, 84, 150, 12, '#3f5f80', 0.1)}
      ${finUp(b, 160, 180, 14, '#6e8eac', 0.2, false)}
      ${finDown(b, 162, 182, 12, '#c9d2dc', 0.2, false)}
      ${finlets(b, 188, 254, 8, '#3f5f80', 5)}`,
    clip: () => {
      let s = '';
      for (const [y, off] of [[80, 0], [88, 7], [96, 0], [104, 7]]) {
        for (let x = 58 + off; x < 250; x += 14) s += `<circle cx="${x}" cy="${f(y + (x - 58) * 0.02)}" r="2.6" fill="#33506e" opacity="0.65"/>`;
      }
      return s;
    },
    front: (b) => `
      <path d="M 14 100 L 40 104" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M 18 101 l 2 3 l 2 -3 l 2 3 l 2 -3 l 2 3 l 2 -3 l 2 3" stroke="#fff" stroke-width="1.2" fill="none"/>
      ${gill(62, 100, 28)}
      ${leafFin(70, 104, 18, 5, 8, '#3f5f80')}
      ${eye(44, 95, 6.5, '#c0c8d0')}`,
  });

  // ---------- アユ・ワカサギ ----------
  const adiposeFin = (b, x, color) => `<path d="M ${x} ${f(b.top(x) + 3)} Q ${x + 7} ${f(b.top(x + 6) - 10)} ${x + 14} ${f(b.top(x + 14) + 2)} Z" fill="${color}" stroke="${OUT}" stroke-width="1.3"/>`;

  art.ayu = () => spindle({
    label: 'アユ',
    body: { nx: 20, mx: 120, px: 252, h: 34, hb: 30, ph: 8, k1: 0.15, k2: 0.7, ny: 2 },
    grad: [[0, '#5f6a40'], [0.42, '#a3a46c'], [0.58, '#e8e6cf'], [1, '#f7f6ec']],
    back: (b) => `
      ${tail(b, 'fork', 42, 36, '#c8b45a')}
      ${finUp(b, 112, 150, 30, '#8d8a52', 0.2)}
      ${adiposeFin(b, 210, '#9a9658')}
      ${finDown(b, 186, 214, 14, '#e2d27a', 0.2, false)}`,
    clip: () => `<ellipse cx="80" cy="92" rx="10" ry="6" fill="#f5c722"/>`,
    front: (b) => `
      ${gill(60, 100, 30)}
      ${leafFin(68, 108, 22, 6, 18, '#e2d27a')}
      ${leafFin(130, 126, 18, 5, 30, '#e2d27a')}
      ${mouthLine(20, 101, 36, 104)}
      ${eye(40, 95, 6, '#c8c08a')}`,
  });

  art.wakasagi = () => spindle({
    label: 'ワカサギ',
    body: { nx: 30, mx: 120, px: 244, h: 24, hb: 22, ph: 6, k1: 0.18, k2: 0.7, ny: 1 },
    grad: [[0, '#a9b8a5'], [0.45, '#d3ddd0'], [1, '#f4f7f3']],
    back: (b) => `
      ${tail(b, 'fork', 36, 28, '#d6dccf')}
      ${finUp(b, 112, 132, 18, '#c7d0c2', 0.25, false)}
      ${adiposeFin(b, 196, '#c7d0c2')}
      ${finDown(b, 176, 200, 12, '#e0e6dc', 0.2, false)}`,
    clip: () => `<path d="M 60 98 L 244 100" stroke="#9db0c8" stroke-width="5"/>${dots(13, 40, 60, 240, 80, 96, 0.7, 1.3, '#4c5a48', 0.6)}`,
    front: (b) => `
      ${gill(62, 100, 22)}
      ${leafFin(68, 104, 16, 5, 15, '#e0e6dc')}
      ${mouthLine(30, 100, 42, 103, 1.5)}
      ${eye(46, 96, 7, '#c9d0d6')}`,
  });

  // ---------- タチウオ・ハモ・ウツボ ----------
  art.tachiuo = () => eel({
    label: 'タチウオ', T: 15, dorsal: 46, anal: 296, finW: 6,
    grad: [[0, '#9aa8b8'], [0.3, '#e3e9f0'], [0.55, '#c6d0dc'], [1, '#f2f5f8']],
    finColor: '#d7e0ea', eyeR: 7, iris: '#e8e0b0',
    mouth: (x0, yc) => `<path d="M ${x0 - 4} ${f(yc(x0) + 3)} L ${x0 + 22} ${f(yc(x0 + 22) + 1)}" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M ${x0} ${f(yc(x0) + 2)} l 2 -6 l 2 6 M ${x0 + 6} ${f(yc(x0) + 2)} l 2 5 l 2 -5 M ${x0 + 12} ${f(yc(x0) + 1)} l 1.5 -5 l 1.5 5" stroke="${OUT}" stroke-width="1" fill="#fff"/>`,
  });

  art.hamo = () => eel({
    label: 'ハモ', T: 16, dorsal: 64, anal: 96, finW: 5,
    grad: [[0, '#7f7a6a'], [0.45, '#a9a38e'], [0.68, '#ece6d6'], [1, '#f6f2e8']],
    finColor: '#8f8a76', eyeR: 6, iris: '#cfc78a',
    clip: (yc, th) => `<path d="M 40 ${f(yc(40))} ${Array.from({ length: 60 }, (_, i) => { const x = 40 + i * 4.3; return `L ${f(x)} ${f(yc(x) - th(x) * 0.1)}`; }).join(' ')}" fill="none" stroke="#f4f0e2" stroke-width="1.5" stroke-dasharray="2 3"/>`,
    mouth: (x0, yc) => `<path d="M ${x0 - 4} ${f(yc(x0) + 1)} Q ${x0 + 10} ${f(yc(x0) + 10)} ${x0 + 28} ${f(yc(x0 + 28) + 3)}" fill="#efe6d0" stroke="${OUT}" stroke-width="1.8"/>
      <path d="M ${x0} ${f(yc(x0) + 3)} l 2 4 l 2 -4 l 2 5 l 2 -5 l 2 5 l 2 -5 l 2 5 l 2 -4 l 2 4" stroke="${OUT}" stroke-width="0.9" fill="#fff"/>`,
  });

  art.utsubo = () => eel({
    label: 'ウツボ', T: 20, dorsal: 34, anal: 120, finW: 6, pectoral: false,
    grad: [[0, '#8a6d2c'], [0.6, '#b8953e'], [1, '#d9bd6a']],
    finColor: '#a07d34', eyeR: 5, iris: '#e3c040',
    clip: (yc, th) => {
      const r = rng(55);
      let s = '';
      for (let i = 0; i < 70; i++) {
        const x = 30 + r() * 270;
        s += `<path d="M ${f(x)} ${f(yc(x) - 22 + r() * 44)} q ${f(4 + r() * 6)} ${f(-4 + r() * 8)} ${f(8 + r() * 6)} ${f(-3 + r() * 6)}" stroke="#3a2a10" stroke-width="${f(2 + r() * 2)}" fill="none" stroke-linecap="round" opacity="0.75"/>`;
      }
      return s;
    },
    mouth: (x0, yc) => `<path d="M ${x0 - 4} ${f(yc(x0) + 1)} Q ${x0 + 10} ${f(yc(x0) + 14)} ${x0 + 30} ${f(yc(x0 + 30) + 4)}" fill="#f1dca0" stroke="${OUT}" stroke-width="1.8"/>
      <path d="M ${x0} ${f(yc(x0) + 4)} l 2 5 l 2 -5 l 2 6 l 2 -6 l 2 6 l 2 -6 l 2 5 l 2 -5" stroke="${OUT}" stroke-width="0.9" fill="#fff"/>`,
  });

  // ---------- イシダイ・イシガキダイ ----------
  const ishiBody = { nx: 26, mx: 116, px: 236, h: 58, hb: 52, ph: 10, k1: 0.06, k2: 0.95, k3: 0.75, ny: 6 };
  const ishi = (label, grad, finC, clip) => spindle({
    label,
    body: ishiBody,
    grad,
    back: (b) => `
      ${tail(b, 'square', 46, 40, finC)}
      ${finUp(b, 78, 210, 20, finC, 0.25)}
      ${finDown(b, 168, 212, 22, finC, 0.3)}`,
    clip,
    front: (b) => `
      ${gill(68, 100, 50)}
      ${leafFin(80, 112, 30, 9, 14, finC)}
      <path d="M 24 106 Q 30 114 40 110" fill="#e6dfcf" stroke="${OUT}" stroke-width="2.4" stroke-linecap="round"/>
      ${eye(50, 86, 8, '#d9c56a')}`,
  });
  art.ishidai = () => ishi('イシダイ', [[0, '#b9b8a6'], [0.6, '#dcdbcc'], [1, '#efeee4']], '#55574c',
    () => vbands([34, 70, 104, 138, 170, 204, 234], 13, '#1e1f1c', 0.92, -6));
  art.ishigaki = () => ishi('イシガキダイ', [[0, '#cfcbb8'], [0.6, '#e6e2d4'], [1, '#f4f1e8']], '#6b6a5c',
    () => dots(61, 150, 30, 240, 40, 160, 2.5, 5.5, '#2a2a24', 0.9));

  // ---------- メバル・カサゴ ----------
  art.mebaru = () => spindle({
    label: 'メバル',
    body: { nx: 24, mx: 110, px: 238, h: 46, hb: 40, ph: 9, k1: 0.12, k2: 0.8, ny: 2 },
    grad: [[0, '#3c3d40'], [0.45, '#6d6e70'], [0.7, '#b9b6ae'], [1, '#dedbd2']],
    back: (b) => `
      ${tail(b, 'shallow', 44, 38, '#4a4b4e')}
      ${finUp(b, 74, 210, 24, '#4a4b4e', 0.2)}
      ${finDown(b, 160, 202, 18, '#5c5d60', 0.2)}`,
    clip: () => vbands([96, 130, 164, 198], 14, '#1f2022', 0.25, -8),
    front: (b) => `
      ${gill(70, 100, 44)}
      ${leafFin(80, 110, 34, 10, 14, '#5c5d60')}
      <path d="M 22 104 Q 34 114 48 108" fill="none" stroke="${OUT}" stroke-width="2" stroke-linecap="round"/>
      ${eye(50, 86, 13, '#c9b778')}`,
  });

  art.kasago = () => spindle({
    label: 'カサゴ',
    body: { nx: 22, mx: 100, px: 234, h: 46, hb: 42, ph: 10, k1: 0.1, k2: 0.8, ny: 2 },
    grad: [[0, '#8a3a24'], [0.5, '#bb6a44'], [1, '#e8b48a']],
    back: (b) => `
      ${tail(b, 'round', 44, 38, '#a64e30')}
      ${finUp(b, 66, 206, 26, '#a64e30', 0.15)}
      ${finDown(b, 156, 198, 20, '#b45c38', 0.2)}`,
    clip: () => dots(71, 40, 40, 236, 54, 140, 3, 8, '#4a1a0c', 0.45) + dots(72, 30, 40, 236, 60, 140, 1.5, 3.5, '#f3d0a8', 0.7),
    front: (b) => `
      ${[36, 46, 56].map((x, i) => `<path d="M ${x} ${f(b.top(x) + 2)} L ${x + 4} ${f(b.top(x) - 9 + i * 2)} L ${x + 8} ${f(b.top(x + 8) + 2)} Z" fill="#a64e30" stroke="${OUT}" stroke-width="1.2"/>`).join('')}
      ${gill(66, 100, 44)}
      <path d="M 66 106 Q 100 76 124 104 Q 104 138 66 114 Z" fill="#c26a42" stroke="${OUT}" stroke-width="1.6"/>
      ${[0, 1, 2, 3, 4].map((i) => `<line x1="68" y1="110" x2="${120 - i * 3}" y2="${90 + i * 9}" stroke="${OUT}" stroke-width="0.7" opacity="0.5"/>`).join('')}
      <path d="M 20 102 Q 32 114 46 108" fill="#f0c8a0" stroke="${OUT}" stroke-width="2.2" stroke-linecap="round"/>
      ${eye(44, 84, 9, '#e3b040')}`,
  });

  // ---------- スズキ・ボラ ----------
  art.suzuki = () => spindle({
    label: 'スズキ',
    body: { nx: 16, mx: 118, px: 252, h: 38, hb: 36, ph: 8, k1: 0.15, k2: 0.72, ny: -2 },
    grad: [[0, '#4f5c66'], [0.42, '#8a98a3'], [0.55, '#e0e5e9'], [1, '#f5f7f8']],
    back: (b) => `
      ${tail(b, 'shallow', 46, 40, '#6c7881')}
      ${finUp(b, 92, 140, 26, '#5d6973', 0.2)}
      ${finUp(b, 142, 196, 18, '#6c7881', 0.15)}
      ${finDown(b, 174, 206, 16, '#b8c0c6', 0.2, false)}`,
    clip: () => dots(81, 25, 80, 220, 66, 86, 0.8, 1.4, '#2a3238', 0.6),
    front: (b) => `
      ${gill(72, 98, 36)}
      ${leafFin(80, 106, 24, 7, 10, '#b8c0c6')}
      <path d="M 12 100 Q 30 112 54 104" fill="#e6e9ec" stroke="${OUT}" stroke-width="2"/>
      ${eye(42, 90, 7.5, '#d8d0a0')}`,
  });

  art.bora = () => spindle({
    label: 'ボラ',
    body: { nx: 22, mx: 112, px: 248, h: 38, hb: 38, ph: 9, k1: 0.03, k2: 0.95, ny: 4 },
    grad: [[0, '#45505a'], [0.42, '#7d8892'], [0.6, '#d8dde1'], [1, '#f1f3f5']],
    back: (b) => `
      ${tail(b, 'fork', 44, 38, '#5d6872')}
      ${finUp(b, 116, 138, 22, '#5d6872', 0.3, false)}
      ${finUp(b, 176, 196, 18, '#5d6872', 0.3, false)}
      ${finDown(b, 174, 198, 16, '#b8c0c6', 0.3, false)}`,
    clip: () => [74, 82, 90, 98, 106].map((y) => `<path d="M 50 ${y} Q 150 ${y - 2} 250 ${100 + (y - 100) * 0.2}" fill="none" stroke="#2c343b" stroke-width="2" opacity="0.55"/>`).join(''),
    front: (b) => `
      ${gill(60, 102, 34)}
      ${leafFin(70, 94, 22, 7, -10, '#5d6872')}
      <path d="M 21 106 Q 26 110 32 108" fill="#e6d7c0" stroke="${OUT}" stroke-width="2.4" stroke-linecap="round"/>
      <ellipse cx="40" cy="94" rx="10" ry="8" fill="#e8eef2" opacity="0.7" stroke="${OUT}" stroke-width="0.8"/>
      ${eye(40, 94, 6, '#d8d0a0')}`,
  });

  // ---------- ニシン（マイワシと比較） ----------
  art.nishin = () => spindle({
    label: 'ニシン',
    body: { nx: 18, mx: 118, px: 252, h: 36, hb: 34, ph: 6, k1: 0.18, k2: 0.7 },
    grad: [[0, '#203f66'], [0.42, '#5476a0'], [0.52, '#dce4ee'], [1, '#f5f7fa']],
    back: (b) => `
      ${tail(b, 'fork', 48, 40, '#2f4f78')}
      ${finUp(b, 120, 148, 20, '#2f4f78', 0.3, false)}
      ${finDown(b, 190, 214, 10, '#c7d3df', 0.2, false)}`,
    front: (b) => `
      ${gill(58, 100, 34)}
      ${leafFin(66, 112, 20, 5, 20, '#c7d3df')}
      <path d="M 18 98 Q 22 104 32 104" fill="none" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
      ${eye(40, 95, 7.5, '#c9d0d6')}`,
  });

  // ---------- キス・ハゼ ----------
  art.kisu = () => spindle({
    label: 'キス',
    body: { nx: 14, mx: 118, px: 252, h: 26, hb: 26, ph: 6, k1: 0.3, k2: 0.55, ny: 2 },
    grad: [[0, '#cdbf92'], [0.45, '#e6dcbc'], [1, '#f8f4e6']],
    back: (b) => `
      ${tail(b, 'shallow', 40, 30, '#e3d6a8')}
      ${finUp(b, 92, 124, 20, '#e3d6a8', 0.2)}
      ${finUp(b, 132, 222, 13, '#e3d6a8', 0.1)}
      ${finDown(b, 136, 222, 11, '#efe6c8', 0.1)}`,
    clip: () => `<path d="M 50 96 Q 150 94 252 100" fill="none" stroke="#c9b880" stroke-width="1.3"/>`,
    front: (b) => `
      ${gill(58, 100, 24)}
      ${leafFin(64, 106, 20, 6, 15, '#efe6c8')}
      ${mouthLine(14, 102, 26, 104, 1.5)}
      ${eye(38, 96, 6.5, '#d8cf8a')}`,
  });

  art.haze = () => spindle({
    label: 'ハゼ',
    body: { nx: 24, mx: 80, px: 236, h: 34, hb: 30, ph: 10, k1: 0.05, k2: 0.95, ny: 8 },
    grad: [[0, '#8a7a56'], [0.5, '#b4a47c'], [1, '#ece2c6']],
    back: (b) => `
      ${tail(b, 'round', 46, 32, '#a99a70')}
      ${finUp(b, 88, 120, 24, '#a99a70', 0.3)}
      ${finUp(b, 130, 210, 18, '#a99a70', 0.15)}
      ${finDown(b, 136, 208, 14, '#cfc39e', 0.15)}`,
    clip: () => dots(91, 40, 40, 236, 70, 108, 2, 4.5, '#4f4430', 0.55),
    front: (b) => `
      <ellipse cx="96" cy="${f(b.bot(96) + 2)}" rx="16" ry="6" fill="#cfc39e" stroke="${OUT}" stroke-width="1.4"/>
      ${leafFin(74, 108, 26, 10, 10, '#cfc39e')}
      ${gill(62, 104, 30)}
      <path d="M 22 108 Q 34 118 52 112" fill="#e9dfc6" stroke="${OUT}" stroke-width="2"/>
      ${eye(42, 76, 7, '#d8c070')}${eye(52, 74, 6, '#d8c070')}`,
  });

  // ---------- ナマズ・ドジョウ ----------
  art.namazu = () => spindle({
    label: 'ナマズ',
    body: { nx: 18, mx: 90, px: 262, h: 30, hb: 32, ph: 10, k1: 0.0, k2: 0.65, k3: 0.85, ny: 4 },
    grad: [[0, '#3e4430'], [0.5, '#5d644a'], [0.75, '#a7a68a'], [1, '#d7d4bd']],
    back: (b) => `
      ${tail(b, 'round', 34, 28, '#4d543c')}
      ${finUp(b, 100, 118, 14, '#4d543c', 0.3, false)}
      ${finDown(b, 140, 260, 14, '#5d644a', 0.1)}`,
    clip: () => dots(101, 40, 40, 262, 70, 110, 3, 7, '#22261a', 0.4),
    front: (b) => `
      ${leafFin(66, 110, 22, 8, 20, '#4d543c')}
      <path d="M 16 106 Q 34 112 56 108" fill="#cfc9a8" stroke="${OUT}" stroke-width="2"/>
      <path d="M 22 102 Q 30 70 74 56" fill="none" stroke="${OUT}" stroke-width="2.6" stroke-linecap="round"/>
      <path d="M 26 112 Q 36 134 60 142" fill="none" stroke="${OUT}" stroke-width="2.2" stroke-linecap="round"/>
      ${eye(42, 92, 3.8, '#c8c08a')}`,
  });

  art.dojou = () => eel({
    label: 'ドジョウ', T: 15, dorsal: 170, anal: 190, finW: 4,
    grad: [[0, '#6a5a3a'], [0.5, '#9a8a62'], [1, '#d9cfa8']],
    finColor: '#8a7a52', eyeR: 3.5, iris: '#c8b878',
    clip: (yc, th) => {
      const r = rng(111);
      let s = '';
      for (let i = 0; i < 70; i++) {
        const x = 24 + r() * 280;
        s += `<circle cx="${f(x)}" cy="${f(yc(x) - th(x) + r() * th(x) * 1.6)}" r="${f(1 + r() * 2.2)}" fill="#3d321c" opacity="0.6"/>`;
      }
      return s;
    },
    mouth: (x0, yc) => {
      const y = yc(x0);
      return [[2, 6, 10], [4, 10, 14], [6, 14, 12], [8, 4, 16], [10, 12, 10]]
        .map(([dx, ex, ey]) => `<path d="M ${x0 + dx} ${f(y + 3)} q ${f(ex * 0.3)} ${f(ey * 0.6)} ${ex} ${ey}" fill="none" stroke="${OUT}" stroke-width="1.6" stroke-linecap="round"/>`)
        .join('');
    },
  });

  // ---------- メダカ・カダヤシ ----------
  art.medaka = () => spindle({
    label: 'メダカ',
    body: { nx: 26, mx: 110, px: 246, h: 30, hb: 30, ph: 10, k1: 0.15, k2: 0.6, ny: -6 },
    grad: [[0, '#a99868'], [0.5, '#d2c79e'], [1, '#f2ecd8']],
    back: (b) => `
      ${tail(b, 'square', 40, 30, '#d6cba2')}
      ${finUp(b, 196, 220, 16, '#c6b98c', 0.4, false)}
      ${finDown(b, 136, 230, 18, '#ddd2aa', 0.15)}`,
    clip: () => `<path d="M 50 96 L 246 100" stroke="#8c7c50" stroke-width="1.6"/>`,
    front: (b) => `
      ${leafFin(70, 102, 20, 6, 10, '#ddd2aa')}
      <path d="M 24 94 Q 30 92 34 96" fill="none" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
      ${eye(48, 92, 11, '#e8e0b8')}`,
  });

  art.kadayashi = () => spindle({
    label: 'カダヤシ',
    body: { nx: 26, mx: 110, px: 236, h: 30, hb: 36, ph: 10, k1: 0.15, k2: 0.6, ny: -2 },
    grad: [[0, '#8c8e7c'], [0.5, '#b8baa8'], [1, '#e8e9e0']],
    back: (b) => `
      ${tail(b, 'round', 44, 32, '#a9ab98')}
      ${finUp(b, 140, 162, 16, '#9c9e8a', 0.4, false)}
      ${finDown(b, 146, 166, 14, '#c4c6b4', 0.3, false)}`,
    clip: () => dots(121, 20, 60, 236, 70, 100, 1, 1.8, '#4a4c40', 0.6),
    front: (b) => `
      ${leafFin(70, 104, 18, 6, 10, '#c4c6b4')}
      <path d="M 24 96 Q 30 94 34 98" fill="none" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
      ${eye(48, 94, 9, '#d8d8c0')}`,
  });

  // ---------- キンギョ（フナと比較） ----------
  art.kingyo = () => spindle({
    label: 'キンギョ',
    body: { nx: 34, mx: 118, px: 220, h: 48, hb: 46, ph: 12, k1: 0.05, k2: 0.95, ny: 4 },
    grad: [[0, '#e8401c'], [0.55, '#f5772e'], [1, '#ffd2a0']],
    back: (b) => `
      <path d="M 212 92 C 250 40 300 40 312 70 C 290 74 276 90 268 100 C 276 110 290 126 312 130 C 300 160 250 160 212 108 Z" fill="#ff7a3a" fill-opacity="0.85" stroke="${OUT}" stroke-width="1.8"/>
      ${[60, 80, 120, 140].map((y) => `<path d="M 220 100 Q 260 ${y} 300 ${y}" stroke="${OUT}" stroke-width="0.7" opacity="0.4" fill="none"/>`).join('')}
      ${finUp(b, 100, 176, 30, '#ff7a3a', 0.25)}
      ${finDown(b, 170, 200, 22, '#ff9a5a', 0.3, false)}`,
    clip: (b) => scales(b, 70, 230, 13, '#a82a0a', 0.4),
    front: (b) => `
      ${gill(70, 102, 46)}
      ${leafFin(78, 118, 26, 9, 30, '#ff9a5a')}
      ${leafFin(130, 140, 24, 8, 40, '#ff9a5a')}
      <path d="M 33 104 Q 38 108 42 106" fill="none" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
      ${eye(54, 90, 8, '#e0c050')}`,
  });

  // ---------- ブラックバス・ブルーギル ----------
  art.bass = () => spindle({
    label: 'ブラックバス',
    body: { nx: 16, mx: 120, px: 248, h: 42, hb: 38, ph: 10, k1: 0.12, k2: 0.72, ny: 2 },
    grad: [[0, '#3f5a2a'], [0.45, '#7a9554'], [0.65, '#d6dcb4'], [1, '#f2f2e0']],
    back: (b) => `
      ${tail(b, 'shallow', 44, 38, '#5c7440')}
      ${finUp(b, 90, 146, 24, '#5c7440', 0.3)}
      ${finUp(b, 148, 206, 22, '#6a8448', 0.3)}
      ${finDown(b, 172, 208, 16, '#a8b484', 0.2, false)}`,
    clip: () => {
      const r = rng(131);
      let s = '';
      for (let x = 60; x < 250; x += 14) s += `<ellipse cx="${x}" cy="${f(98 + r() * 4)}" rx="${f(9 + r() * 4)}" ry="${f(5 + r() * 3)}" fill="#22301a" opacity="0.8"/>`;
      return s;
    },
    front: (b) => `
      ${gill(74, 100, 40)}
      ${leafFin(82, 110, 24, 7, 15, '#a8b484')}
      <path d="M 12 100 Q 34 118 64 108 L 60 104 Z" fill="#efe9cc" stroke="${OUT}" stroke-width="2"/>
      ${eye(42, 90, 7.5, '#d8a830')}`,
  });

  art.bluegill = () => spindle({
    label: 'ブルーギル',
    body: { nx: 28, mx: 118, px: 226, h: 58, hb: 56, ph: 11, k1: 0.06, k2: 0.95, k3: 0.85, ny: 4 },
    grad: [[0, '#4f5a6a'], [0.45, '#7f8a7a'], [0.75, '#d9a868'], [1, '#f0c890']],
    back: (b) => `
      ${tail(b, 'shallow', 40, 36, '#6a7368')}
      ${finUp(b, 90, 200, 24, '#5a6472', 0.25)}
      ${finDown(b, 150, 200, 22, '#7a8478', 0.3)}`,
    clip: () => vbands([70, 96, 122, 148, 174, 200], 10, '#2c3440', 0.3, -4),
    front: (b) => `
      ${gill(68, 100, 50)}
      <path d="M 64 76 Q 86 74 86 86 Q 80 94 64 92 Z" fill="#111" stroke="${OUT}" stroke-width="1.2"/>
      ${leafFin(84, 110, 36, 9, 18, '#7a8478')}
      <path d="M 27 102 Q 32 106 38 104" fill="none" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
      ${eye(48, 90, 7.5, '#c08a40')}`,
  });

  // ---------- ヤマメ・アマゴ・イワナ ----------
  const troutBody = { nx: 22, mx: 122, px: 250, h: 36, hb: 34, ph: 9, k1: 0.18, k2: 0.68, ny: 2 };
  const parr = () => [70, 92, 114, 136, 158, 180, 202, 224].map((x) => `<ellipse cx="${x}" cy="100" rx="7" ry="13" fill="#3d4a56" opacity="0.55"/>`).join('');
  const trout = (label, grad, finC, clip) => spindle({
    label,
    body: troutBody,
    grad,
    back: (b) => `
      ${tail(b, 'shallow', 42, 36, finC)}
      ${finUp(b, 118, 152, 24, finC, 0.25)}
      ${adiposeFin(b, 210, finC)}
      ${finDown(b, 184, 210, 16, finC, 0.2, false)}`,
    clip,
    front: (b) => `
      ${gill(62, 102, 34)}
      ${leafFin(72, 112, 22, 6, 22, finC)}
      ${mouthLine(22, 102, 42, 106)}
      ${eye(42, 95, 6.5, '#d8c068')}`,
  });
  art.yamame = () => trout('ヤマメ', [[0, '#5a6650'], [0.42, '#9aa28a'], [0.62, '#e2e2d6'], [1, '#f5f4ee']], '#a8a890',
    () => parr() + dots(141, 26, 50, 240, 70, 88, 1, 2, '#1d1d1d', 0.9));
  art.amago = () => trout('アマゴ', [[0, '#5a6650'], [0.42, '#9aa28a'], [0.62, '#e2e2d6'], [1, '#f5f4ee']], '#a8a890',
    () => parr() + dots(141, 26, 50, 240, 70, 88, 1, 2, '#1d1d1d', 0.9) + dots(151, 26, 50, 240, 84, 118, 2, 3.2, '#ff5a2a', 1));
  art.iwana = () => trout('イワナ', [[0, '#3a4234'], [0.45, '#5e6a50'], [0.7, '#c9b48a'], [1, '#efe2c4']], '#5a6248',
    () => dots(161, 70, 40, 250, 64, 116, 1.6, 3.2, '#f1ede0', 0.95) + dots(162, 12, 60, 240, 96, 116, 1.6, 2.6, '#f39a3a', 0.9));

  // ---------- ホウボウ・カナガシラ・トビウオ ----------
  const gurnard = (label, wing, wingExtra) => spindle({
    label,
    body: { nx: 22, mx: 90, px: 246, h: 34, hb: 30, ph: 8, k1: 0.02, k2: 0.9, ny: 2 },
    grad: [[0, '#d63a36'], [0.6, '#ef7a62'], [1, '#fbd2c2']],
    back: (b) => `
      ${tail(b, 'shallow', 40, 34, '#e0524a')}
      ${finUp(b, 72, 120, 22, '#e0524a', 0.3)}
      ${finUp(b, 124, 220, 14, '#e0524a', 0.1)}
      ${finDown(b, 130, 220, 12, '#f29a88', 0.1)}`,
    front: (b) => `
      <path d="M 70 104 Q 120 118 168 150 Q 120 160 72 118 Z" fill="${wing}" stroke="${OUT}" stroke-width="1.8"/>
      ${wingExtra}
      ${[0, 1, 2].map((i) => `<path d="M ${64 + i * 4} 124 Q ${70 + i * 5} 140 ${62 + i * 8} 152" fill="none" stroke="${OUT}" stroke-width="2" stroke-linecap="round"/>`).join('')}
      ${gill(58, 100, 30)}
      <path d="M 18 94 L 24 102 L 18 108" fill="#e0524a" stroke="${OUT}" stroke-width="1.4"/>
      ${mouthLine(22, 104, 34, 106)}
      ${eye(44, 86, 7, '#e0c050')}`,
  });
  art.houbou = () => gurnard('ホウボウ', '#2fa88a',
    `<g>${[[100, 124], [118, 134], [136, 142], [112, 122], [130, 132], [150, 146]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2" fill="#5fd7ff" stroke="#0b5a6a" stroke-width="0.8"/>`).join('')}
      <path d="M 72 108 Q 120 122 164 148" stroke="#0b5a6a" stroke-width="2" fill="none"/></g>`);
  art.kanagashira = () => gurnard('カナガシラ', '#f08c74', `<path d="M 130 128 Q 140 138 150 146" stroke="#b03a2a" stroke-width="3" fill="none" opacity="0.6"/>`);

  art.tobiuo = () => spindle({
    label: 'トビウオ',
    body: { nx: 24, mx: 112, px: 236, h: 28, hb: 26, ph: 7, k1: 0.06, k2: 0.85, ny: 2 },
    grad: [[0, '#1f3f78'], [0.45, '#4f74b0'], [0.55, '#dfe6f1'], [1, '#f5f7fa']],
    back: (b) => `
      <path d="M 228 ${b.cy - 7} Q 256 ${b.cy - 18} 280 ${b.cy - 34} Q 262 ${b.cy - 8} 262 ${b.cy} Q 280 ${b.cy + 14} 312 ${b.cy + 46} Q 262 ${b.cy + 30} 228 ${b.cy + 7} Z" fill="#2f4f88" stroke="${OUT}" stroke-width="1.8"/>
      ${finUp(b, 180, 206, 14, '#2f4f88', 0.3, false)}
      ${finDown(b, 184, 208, 12, '#c9d3e2', 0.3, false)}`,
    front: (b) => `
      <path d="M 70 96 Q 150 30 222 40 Q 200 66 222 82 Q 150 82 74 102 Z" fill="#b8d4f0" fill-opacity="0.85" stroke="${OUT}" stroke-width="1.8"/>
      ${[48, 58, 68, 76].map((y) => `<path d="M 74 98 Q 140 ${y + 10} 216 ${y}" stroke="${OUT}" stroke-width="0.8" opacity="0.4" fill="none"/>`).join('')}
      <path d="M 132 120 Q 170 132 196 128 Q 172 118 136 112 Z" fill="#b8d4f0" stroke="${OUT}" stroke-width="1.4"/>
      ${gill(58, 100, 26)}
      ${mouthLine(24, 100, 34, 103)}
      ${eye(42, 95, 7.5, '#c9d0d6')}`,
  });

  // ---------- 独自形状の生き物の共通ラッパー ----------
  function custom(label, build) {
    const id = `f${++uid}`;
    const { defs = '', inner } = build(id);
    return wrap(inner, defs, label);
  }

  // ---------- シタビラメ（カレイと比較） ----------
  art.shitabirame = () => custom('シタビラメ', (id) => {
    const d = 'M 30 100 C 30 74 62 60 110 60 C 180 60 250 82 290 100 C 250 118 180 140 110 140 C 62 140 30 126 30 100 Z';
    return {
      defs: `<radialGradient id="${id}g" cx="0.35" cy="0.45" r="0.7"><stop offset="0" stop-color="#a88a62"/><stop offset="1" stop-color="#6e5636"/></radialGradient>`,
      inner: `
        <path d="${d}" transform="translate(160 100) scale(1.08 1.26) translate(-160 -100)" fill="#8a6e48" stroke="${OUT}" stroke-width="1.6"/>
        <path d="${d}" fill="url(#${id}g)" stroke="${OUT}" stroke-width="2"/>
        <path d="M 60 100 L 286 100" stroke="#3d2b18" stroke-width="1.2" opacity="0.6"/>
        <path d="M 30 104 Q 38 116 52 112" fill="none" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
        ${eye(52, 86, 5, '#d6b84a')}${eye(60, 94, 5, '#d6b84a')}`,
    };
  });

  // ---------- エイ（ヒラメと比較） 上から見た姿 ----------
  art.ei = () => custom('エイ', (id) => ({
    defs: `<radialGradient id="${id}g" cx="0.4" cy="0.5" r="0.6"><stop offset="0" stop-color="#a0794e"/><stop offset="1" stop-color="#6a4a2a"/></radialGradient>`,
    inner: `
      <path d="M 170 100 Q 240 98 312 92" fill="none" stroke="#5a3e22" stroke-width="5" stroke-linecap="round"/>
      <path d="M 228 96 L 246 88 L 240 98 Z" fill="#e8d8b0" stroke="${OUT}" stroke-width="1.2"/>
      <path d="M 26 100 Q 40 70 90 40 Q 120 22 140 38 Q 160 70 180 100 Q 160 130 140 162 Q 120 178 90 160 Q 40 130 26 100 Z" fill="url(#${id}g)" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M 50 100 Q 100 96 170 100" fill="none" stroke="#4a321a" stroke-width="1" opacity="0.5"/>
      ${eye(70, 88, 5, '#d8c070')}${eye(70, 112, 5, '#d8c070')}
      <ellipse cx="84" cy="86" rx="4" ry="2.5" fill="#3a2410"/><ellipse cx="84" cy="114" rx="4" ry="2.5" fill="#3a2410"/>`,
  }));

  // ---------- アンコウ・オコゼ ----------
  art.ankou = () => custom('アンコウ', (id) => ({
    defs: gradient(`${id}g`, [[0, '#6a5038'], [0.6, '#8f7252'], [1, '#c8ac86']]),
    inner: `
      <path d="M 210 92 Q 250 80 280 76 Q 290 100 280 124 Q 250 120 210 108 Z" fill="#7a5e42" stroke="${OUT}" stroke-width="1.8"/>
      <path d="M 160 ${76} Q 180 60 206 80 L 200 92 Z" fill="#7a5e42" stroke="${OUT}" stroke-width="1.5"/>
      <path d="M 20 110 Q 26 56 100 52 Q 170 52 214 90 L 214 110 Q 170 140 100 144 Q 30 144 20 110 Z" fill="url(#${id}g)" stroke="${OUT}" stroke-width="2.2"/>
      <path d="M 22 108 Q 70 126 132 112" fill="#3a2010" stroke="${OUT}" stroke-width="2"/>
      <path d="M 28 110 l 4 -7 l 4 8 l 4 -8 l 4 9 l 4 -9 l 4 9 l 4 -9 l 4 9 l 4 -8 l 4 8 l 4 -7 l 4 7 l 4 -6 l 4 6" stroke="#fff" stroke-width="1.4" fill="none"/>
      <path d="M 30 114 l 4 6 l 4 -5 l 4 7 l 4 -6 l 4 7 l 4 -6 l 4 6 l 4 -5" stroke="#fff" stroke-width="1.4" fill="none"/>
      <path d="M 70 54 Q 60 20 30 26" fill="none" stroke="${OUT}" stroke-width="2.2" stroke-linecap="round"/>
      <ellipse cx="28" cy="28" rx="7" ry="5" fill="#f4e2b8" stroke="${OUT}" stroke-width="1.5"/>
      ${[30, 60, 90, 120, 150].map((x) => `<path d="M ${x} 140 q 4 8 8 2" stroke="${OUT}" stroke-width="1.5" fill="#8f7252"/>`).join('')}
      ${dots(171, 30, 40, 200, 60, 100, 2, 4, '#4a3420', 0.5)}
      ${eye(96, 66, 5, '#d8c070')}
      <path d="M 120 112 Q 150 90 176 122 Q 150 136 120 120 Z" fill="#8f7252" stroke="${OUT}" stroke-width="1.5"/>`,
  }));

  art.okoze = () => spindle({
    label: 'オコゼ',
    body: { nx: 30, mx: 100, px: 236, h: 44, hb: 40, ph: 10, k1: 0.0, k2: 0.95, ny: -6 },
    grad: [[0, '#7a3a2c'], [0.5, '#a8604a'], [1, '#d8a888']],
    back: (b) => `
      ${tail(b, 'round', 42, 34, '#94503c')}
      <g>${Array.from({ length: 12 }, (_, i) => { const x = 54 + i * 13; return `<path d="M ${x} ${f(b.top(x) + 4)} L ${x + 4} ${f(b.top(x + 4) - 30 + Math.abs(i - 3) * 1.4)} L ${x + 10} ${f(b.top(x + 10) + 4)} Z" fill="#a8604a" stroke="${OUT}" stroke-width="1.3"/>`; }).join('')}</g>
      ${finDown(b, 150, 210, 16, '#b07058', 0.2)}`,
    clip: () => dots(181, 50, 30, 236, 50, 150, 3, 9, '#4a1c10', 0.35) + dots(182, 40, 30, 236, 50, 150, 1.5, 4, '#f2d4b8', 0.5),
    front: (b) => `
      ${leafFin(76, 112, 40, 12, 20, '#b07058')}
      <path d="M 26 96 Q 30 86 44 88" fill="#d8b098" stroke="${OUT}" stroke-width="2.2" stroke-linecap="round"/>
      ${[40, 52, 64, 76].map((x) => `<circle cx="${x}" cy="${f(b.bot(x) - 8)}" r="3" fill="#94503c" stroke="${OUT}" stroke-width="0.8"/>`).join('')}
      ${eye(56, 72, 6, '#e3b040')}`,
  });

  // ---------- ウマヅラハギ（カワハギと比較） ----------
  art.umazura = () => custom('ウマヅラハギ', (id) => {
    const d = 'M 12 106 Q 60 74 140 56 Q 200 66 256 94 L 256 106 Q 200 132 140 144 Q 60 136 12 106 Z';
    return {
      defs: gradient(`${id}g`, [[0, '#6f7f8c'], [0.5, '#9aa6b0'], [1, '#c8d0d6']]) + `<clipPath id="${id}c"><path d="${d}"/></clipPath>`,
      inner: `
        <path d="M 250 94 L 300 78 Q 294 100 300 122 L 250 106 Z" fill="#3a8fb0" stroke="${OUT}" stroke-width="1.8"/>
        <path d="M 160 62 Q 210 56 256 94 L 246 94 Q 206 70 166 68 Z" fill="#3a8fb0" stroke="${OUT}" stroke-width="1.5"/>
        <path d="M 160 138 Q 210 144 256 106 L 246 106 Q 206 130 166 132 Z" fill="#3a8fb0" stroke="${OUT}" stroke-width="1.5"/>
        <path d="${d}" fill="url(#${id}g)"/>
        <g clip-path="url(#${id}c)">${dots(191, 18, 60, 250, 70, 130, 4, 9, '#4f5c66', 0.35)}</g>
        <path d="${d}" fill="none" stroke="${OUT}" stroke-width="2"/>
        <path d="M 116 62 L 126 24 L 132 58 Z" fill="#5a6672" stroke="${OUT}" stroke-width="1.6"/>
        <path d="M 4 104 Q 8 100 14 102 L 14 108 Q 8 110 4 106 Z" fill="#c8d0d6" stroke="${OUT}" stroke-width="1.6"/>
        ${gill(96, 104, 18)}
        ${leafFin(102, 106, 16, 6, 0, '#3a8fb0')}
        ${eye(88, 86, 7, '#e0bf55')}`,
    };
  });

  // ---------- ハリセンボン（フグと比較） ----------
  art.harisenbon = () => custom('ハリセンボン', (id) => {
    let spines = '';
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      const x1 = 150 + Math.cos(a) * 70, y1 = 100 + Math.sin(a) * 62;
      const x2 = 150 + Math.cos(a) * 92, y2 = 100 + Math.sin(a) * 84;
      if (Math.cos(a) < -0.9) continue;
      spines += `<path d="M ${f(x1 - Math.sin(a) * 4)} ${f(y1 + Math.cos(a) * 4)} L ${f(x2)} ${f(y2)} L ${f(x1 + Math.sin(a) * 4)} ${f(y1 - Math.cos(a) * 4)} Z" fill="#e6d8a8" stroke="${OUT}" stroke-width="1.2" stroke-linejoin="round"/>`;
    }
    return {
      defs: gradient(`${id}g`, [[0, '#a89058'], [0.5, '#d2c08a'], [0.62, '#f6f2e4'], [1, '#fffdf6']]) + `<clipPath id="${id}c"><ellipse cx="150" cy="100" rx="74" ry="66"/></clipPath>`,
      inner: `
        <path d="M 216 92 Q 250 70 262 100 Q 250 130 216 108 Z" fill="#c2ae74" stroke="${OUT}" stroke-width="1.6"/>
        ${spines}
        <ellipse cx="150" cy="100" rx="74" ry="66" fill="url(#${id}g)" stroke="${OUT}" stroke-width="2.2"/>
        <g clip-path="url(#${id}c)">${dots(201, 30, 90, 220, 40, 92, 2.5, 5, '#3a2e18', 0.75)}</g>
        ${leafFin(120, 106, 22, 10, -10, '#c2ae74')}
        <path d="M 76 102 Q 70 96 76 92 Q 84 96 80 104 Z" fill="#f4f0e2" stroke="${OUT}" stroke-width="1.6"/>
        ${eye(104, 84, 10, '#3fb0c8')}`,
    };
  });

  // ---------- イカ・タコ ----------
  art.ika = () => custom('イカ', (id) => ({
    defs: gradient(`${id}g`, [[0, '#f0c8b0'], [1, '#e89a80']]),
    inner: `
      ${[-14, -8, -3, 3, 8, 14].map((dy, i) => `<path d="M 116 ${100 + dy * 0.6} Q ${80 - i * 2} ${100 + dy * 1.8} ${38 + Math.abs(dy)} ${100 + dy * 2.6}" fill="none" stroke="#e48c70" stroke-width="${6 - Math.abs(dy) * 0.15}" stroke-linecap="round"/>`).join('')}
      <path d="M 116 96 Q 70 70 12 74" fill="none" stroke="#e48c70" stroke-width="3" stroke-linecap="round"/>
      <path d="M 116 104 Q 70 130 12 126" fill="none" stroke="#e48c70" stroke-width="3" stroke-linecap="round"/>
      <ellipse cx="12" cy="74" rx="8" ry="4" fill="#e48c70"/><ellipse cx="12" cy="126" rx="8" ry="4" fill="#e48c70"/>
      <path d="M 250 100 L 300 60 Q 296 100 300 140 Z" fill="#eeb49c" stroke="${OUT}" stroke-width="1.8" stroke-linejoin="round"/>
      <path d="M 150 82 Q 230 80 296 100 Q 230 120 150 118 Q 140 100 150 82 Z" fill="url(#${id}g)" stroke="${OUT}" stroke-width="2"/>
      ${dots(211, 40, 160, 280, 86, 114, 0.8, 1.8, '#b0502e', 0.6)}
      <path d="M 112 88 Q 130 80 152 84 L 152 116 Q 130 120 112 112 Z" fill="#f0c0a6" stroke="${OUT}" stroke-width="2"/>
      ${eye(132, 96, 8, '#3a3a3a')}`,
  }));

  art.tako = () => custom('タコ', (id) => {
    let arms = '';
    const r = rng(221);
    for (let i = 0; i < 8; i++) {
      const sx = 110 + i * 14, ex = 30 + i * 36 + r() * 10, ey = 170 + r() * 14;
      const cx = sx + (i < 4 ? -50 : 50), cy = 150 + r() * 20;
      arms += `<path d="M ${sx} 120 Q ${f(cx)} ${f(cy)} ${f(ex)} ${f(ey)} Q ${f(ex + (i < 4 ? -14 : 14))} ${f(ey - 10)} ${f(ex + (i < 4 ? -6 : 6))} ${f(ey - 22)}" fill="none" stroke="#c23a2e" stroke-width="${12 - i % 2 * 2}" stroke-linecap="round"/>`;
    }
    let suckers = '';
    for (let i = 0; i < 8; i++) {
      const ex = 30 + i * 36;
      suckers += `<circle cx="${ex + 6}" cy="${168 + (i % 3) * 3}" r="2.6" fill="#ffd0c0" stroke="#8a2018" stroke-width="0.8"/>`;
    }
    return {
      defs: `<radialGradient id="${id}g" cx="0.4" cy="0.35" r="0.7"><stop offset="0" stop-color="#ff7a5a"/><stop offset="1" stop-color="#c23a2e"/></radialGradient>`,
      inner: `
        ${arms}${suckers}
        <ellipse cx="160" cy="58" rx="56" ry="48" fill="url(#${id}g)" stroke="${OUT}" stroke-width="2.2"/>
        <path d="M 108 104 Q 160 130 214 104 L 206 120 Q 160 140 114 120 Z" fill="#d9483a" stroke="${OUT}" stroke-width="2"/>
        ${eye(140, 98, 7, '#f2d040')}${eye(180, 98, 7, '#f2d040')}
        <ellipse cx="160" cy="118" rx="6" ry="5" fill="#a82a20" stroke="${OUT}" stroke-width="1.5"/>
        <ellipse cx="140" cy="40" rx="14" ry="8" fill="#ffa088" opacity="0.6"/>`,
    };
  });

  // ---------- クルマエビ・シャコ ----------
  art.ebi = () => custom('クルマエビ', () => {
    let segs = '';
    const pts = [[110, 92], [134, 88], [158, 90], [180, 98], [198, 112], [210, 130]];
    pts.forEach(([x, y], i) => {
      segs += `<ellipse cx="${x}" cy="${y}" rx="${16 - i}" ry="${20 - i * 1.5}" transform="rotate(${-10 + i * 18} ${x} ${y})" fill="#f2c27a" stroke="${OUT}" stroke-width="1.8"/>
        <path d="M ${x - 4} ${y - 16 + i} q 4 12 0 ${30 - i * 3}" stroke="#2a2a3a" stroke-width="4" fill="none" opacity="0.75" transform="rotate(${-10 + i * 18} ${x} ${y})"/>`;
    });
    return {
      inner: `
        <path d="M 40 84 Q 160 20 300 40" fill="none" stroke="#c88a40" stroke-width="2" stroke-linecap="round"/>
        <path d="M 44 88 Q 150 40 290 70" fill="none" stroke="#c88a40" stroke-width="2" stroke-linecap="round"/>
        ${[70, 86, 102, 118, 134].map((x, i) => `<path d="M ${x + 10} 108 q -4 18 ${-8 + i} 30" stroke="#d8944a" stroke-width="2.4" fill="none" stroke-linecap="round"/>`).join('')}
        <path d="M 210 130 L 228 166 L 212 172 L 200 150 L 186 170 L 176 160 Z" fill="#e8a858" stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round"/>
        ${segs}
        <path d="M 40 92 Q 60 70 100 74 Q 116 90 104 110 Q 70 116 40 92 Z" fill="#f2c27a" stroke="${OUT}" stroke-width="2"/>
        <path d="M 52 84 L 20 78 L 52 90 Z" fill="#e8a858" stroke="${OUT}" stroke-width="1.4"/>
        <path d="M 60 86 q 20 4 40 0" stroke="#2a2a3a" stroke-width="3" fill="none" opacity="0.6"/>
        <circle cx="54" cy="80" r="5" fill="#111"/><line x1="58" y1="82" x2="64" y2="86" stroke="${OUT}" stroke-width="2"/>`,
    };
  });

  art.shako = () => custom('シャコ', () => {
    let segs = '';
    for (let i = 0; i < 7; i++) {
      const x = 106 + i * 24;
      segs += `<rect x="${x}" y="${82 - i * 0.5}" width="26" height="${36 + i}" rx="5" fill="#b8a888" stroke="${OUT}" stroke-width="1.8"/>
        <line x1="${x + 13}" y1="${84 - i * 0.5}" x2="${x + 13}" y2="${116 + i * 0.5}" stroke="#7a6a50" stroke-width="1" opacity="0.6"/>`;
    }
    return {
      inner: `
        <path d="M 270 82 L 312 70 L 312 132 L 270 122 Z" fill="#c8b48c" stroke="${OUT}" stroke-width="1.8"/>
        <circle cx="292" cy="90" r="4" fill="#5a3a8a"/><circle cx="292" cy="112" r="4" fill="#5a3a8a"/>
        ${segs}
        <path d="M 40 86 Q 70 74 108 80 L 108 122 Q 70 126 40 112 Z" fill="#c2b292" stroke="${OUT}" stroke-width="2"/>
        <path d="M 70 118 Q 40 150 20 120 Q 36 132 56 112" fill="#c8b890" stroke="${OUT}" stroke-width="2"/>
        <path d="M 22 120 l -4 -6 m 8 9 l -3 -7 m 9 8 l -2 -7" stroke="${OUT}" stroke-width="1.6"/>
        <path d="M 40 92 L 22 74" stroke="${OUT}" stroke-width="2.4"/><circle cx="20" cy="72" r="5" fill="#3a8a6a" stroke="${OUT}" stroke-width="1.4"/>
        <path d="M 44 90 Q 20 60 10 40" fill="none" stroke="#9a8a6a" stroke-width="2"/>
        ${[120, 150, 180].map((x) => `<path d="M ${x} 120 q 2 14 -4 22" stroke="#9a8a6a" stroke-width="2.4" fill="none" stroke-linecap="round"/>`).join('')}`,
    };
  });

  // ---------- 貝 ----------
  art.hotate = () => custom('ホタテ', (id) => {
    let ribs = '';
    for (let i = 0; i <= 18; i++) {
      const a = Math.PI * (0.12 + (0.76 * i) / 18);
      ribs += `<line x1="160" y1="170" x2="${f(160 - Math.cos(a) * 118)}" y2="${f(170 - Math.sin(a) * 140)}" stroke="#b04a2a" stroke-width="2.2" opacity="0.55"/>`;
    }
    return {
      defs: `<radialGradient id="${id}g" cx="0.5" cy="0.9" r="0.9"><stop offset="0" stop-color="#f8dcc0"/><stop offset="1" stop-color="#e2804e"/></radialGradient>
        <clipPath id="${id}c"><path d="M 160 170 L 60 70 Q 160 -20 260 70 Z"/></clipPath>`,
      inner: `
        <path d="M 128 172 L 104 150 L 118 140 L 140 160 Z" fill="#e89a6a" stroke="${OUT}" stroke-width="1.8"/>
        <path d="M 192 172 L 216 150 L 202 140 L 180 160 Z" fill="#e89a6a" stroke="${OUT}" stroke-width="1.8"/>
        <path d="M 160 170 L 60 70 Q 160 -20 260 70 Z" fill="url(#${id}g)" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>
        <g clip-path="url(#${id}c)">${ribs}
          ${[60, 90, 120].map((r) => `<path d="M ${160 - r} ${170 - r * 0.9} Q 160 ${170 - r * 1.6} ${160 + r} ${170 - r * 0.9}" fill="none" stroke="#fff" stroke-width="1" opacity="0.5"/>`).join('')}</g>
        <path d="M 60 70 Q 160 -20 260 70" fill="none" stroke="${OUT}" stroke-width="2.2"/>
        <path d="M 62 72 q 7 -12 14 -4 q 7 -14 14 -6 q 8 -12 16 -6 q 8 -12 16 -6 q 9 -10 18 -6 q 9 -8 18 -4 q 9 -4 18 -2 q 9 0 18 2 q 9 4 18 4 q 8 4 16 6 q 8 2 14 8" fill="none" stroke="${OUT}" stroke-width="1.6" opacity="0.5"/>`,
    };
  });

  art.kaki = () => custom('カキ', (id) => {
    const d = 'M 70 60 Q 120 30 200 40 Q 270 50 284 90 Q 290 140 220 160 Q 140 176 80 150 Q 30 120 46 86 Q 52 70 70 60 Z';
    let layers = '';
    for (let i = 1; i <= 5; i++) {
      const s = 1 - i * 0.14;
      layers += `<path d="${d}" transform="translate(${f(170 - 170 * s + i * 4)} ${f(100 - 100 * s)}) scale(${f(s)})" fill="none" stroke="#6a6a5a" stroke-width="2.2" opacity="0.6" stroke-dasharray="${8 + i * 2} 4 3 4"/>`;
    }
    return {
      defs: `<radialGradient id="${id}g" cx="0.5" cy="0.5" r="0.6"><stop offset="0" stop-color="#d8d4c4"/><stop offset="1" stop-color="#8f8a78"/></radialGradient>`,
      inner: `
        <path d="${d}" fill="url(#${id}g)" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/>
        ${layers}
        ${dots(231, 22, 70, 260, 60, 150, 2, 5, '#5a5a4a', 0.45)}
        <path d="M 84 70 q 10 -6 18 2 q 10 -8 20 0" fill="none" stroke="#a89878" stroke-width="2"/>`,
    };
  });

  art.hamaguri = () => custom('ハマグリ', (id) => {
    const d = 'M 160 34 Q 230 40 272 120 Q 270 160 160 164 Q 50 160 48 120 Q 90 40 160 34 Z';
    return {
      defs: `<linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4ead6"/><stop offset="0.5" stop-color="#cdb48e"/><stop offset="1" stop-color="#8a6a4a"/></linearGradient>
        <clipPath id="${id}c"><path d="${d}"/></clipPath>`,
      inner: `
        <path d="${d}" fill="url(#${id}g)" stroke="${OUT}" stroke-width="2.4"/>
        <g clip-path="url(#${id}c)">
          ${[30, 55, 80, 105].map((r) => `<path d="M ${160 - r * 1.1} ${f(40 + r * 1.05)} Q 160 ${f(30 + r * 0.4)} ${160 + r * 1.1} ${f(40 + r * 1.05)}" fill="none" stroke="#7a5a3a" stroke-width="1.6" opacity="0.4"/>`).join('')}
          <path d="M 120 50 Q 150 90 130 160 L 170 160 Q 180 100 150 46 Z" fill="#6a4a30" opacity="0.25"/>
          <ellipse cx="128" cy="70" rx="40" ry="14" fill="#fff" opacity="0.35" transform="rotate(-20 128 70)"/>
        </g>
        <path d="M 150 34 Q 160 26 170 34" fill="none" stroke="${OUT}" stroke-width="2"/>`,
    };
  });

  art.asari = () => custom('アサリ', (id) => {
    const d = 'M 130 46 Q 210 40 270 96 Q 280 150 170 160 Q 60 162 44 118 Q 50 60 130 46 Z';
    let mesh = '';
    for (let i = 0; i < 22; i++) {
      const x = 40 + i * 11;
      mesh += `<path d="M ${x} 40 l 8 10 l -8 10 l 8 10 l -8 10 l 8 10 l -8 10 l 8 10 l -8 10 l 8 10 l -8 10 l 8 10" fill="none" stroke="#3a3428" stroke-width="2" opacity="0.65"/>`;
    }
    return {
      defs: gradient(`${id}g`, [[0, '#d8ccb0'], [1, '#a89878']]) + `<clipPath id="${id}c"><path d="${d}"/></clipPath>`,
      inner: `
        <path d="${d}" fill="url(#${id}g)" stroke="${OUT}" stroke-width="2.4"/>
        <g clip-path="url(#${id}c)">${mesh}
          ${Array.from({ length: 16 }, (_, i) => `<line x1="128" y1="48" x2="${40 + i * 15}" y2="170" stroke="#5a5040" stroke-width="0.8" opacity="0.5"/>`).join('')}
          ${[40, 70, 100].map((r) => `<path d="M ${128 - r * 1.1} ${48 + r} Q 140 ${48 + r * 0.55} ${128 + r * 1.4} ${48 + r}" fill="none" stroke="#f4ecd8" stroke-width="2" opacity="0.6"/>`).join('')}
          <path d="M 60 120 Q 120 90 160 160" fill="none" stroke="#3a6a8a" stroke-width="10" opacity="0.25"/>
        </g>
        <path d="M 118 48 Q 128 40 138 46" fill="none" stroke="${OUT}" stroke-width="2"/>`,
    };
  });

  art.sazae = () => custom('サザエ', (id) => {
    let horns = '';
    for (let i = 0; i < 7; i++) {
      const x = 70 + i * 26, y = 112 - Math.sin((i / 6) * Math.PI) * 28;
      horns += `<path d="M ${x - 6} ${f(y)} Q ${x - 4} ${f(y - 30)} ${x + 4} ${f(y - 34)} Q ${x + 4} ${f(y - 14)} ${x + 8} ${f(y + 2)} Z" fill="#7a6a4a" stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round"/>`;
    }
    return {
      defs: gradient(`${id}g`, [[0, '#8a7a56'], [0.6, '#6a5a3c'], [1, '#4a3e28']]),
      inner: `
        ${horns}
        <path d="M 52 140 Q 40 100 90 84 Q 160 60 230 84 Q 270 100 262 140 Q 160 170 52 140 Z" fill="url(#${id}g)" stroke="${OUT}" stroke-width="2.4"/>
        <path d="M 120 76 Q 160 30 196 72" fill="#7a6a4a" stroke="${OUT}" stroke-width="2"/>
        <path d="M 140 68 Q 160 46 178 66" fill="none" stroke="${OUT}" stroke-width="1.6"/>
        ${[100, 118].map((y) => `<path d="M 60 ${y + 14} Q 160 ${y - 10} 256 ${y + 14}" fill="none" stroke="#2f2618" stroke-width="2" opacity="0.5"/>`).join('')}
        <ellipse cx="160" cy="150" rx="46" ry="14" fill="#3a5a3a" stroke="${OUT}" stroke-width="2"/>
        <ellipse cx="160" cy="148" rx="30" ry="8" fill="#5a7a5a" opacity="0.7"/>
        ${[70, 110, 210, 250].map((x) => `<path d="M ${x} 140 l 4 14 l 4 -12" fill="#6a5a3c" stroke="${OUT}" stroke-width="1.2"/>`).join('')}`,
    };
  });

  art.awabi = () => custom('アワビ', (id) => {
    const d = 'M 40 100 Q 40 50 150 44 Q 270 44 286 100 Q 286 150 160 158 Q 40 156 40 100 Z';
    return {
      defs: `<radialGradient id="${id}g" cx="0.3" cy="0.45" r="0.8"><stop offset="0" stop-color="#9aa878"/><stop offset="0.6" stop-color="#7a6a4c"/><stop offset="1" stop-color="#5a4a34"/></radialGradient>
        <clipPath id="${id}c"><path d="${d}"/></clipPath>`,
      inner: `
        <path d="${d}" fill="url(#${id}g)" stroke="${OUT}" stroke-width="2.4"/>
        <g clip-path="url(#${id}c)">
          ${[30, 60, 90, 120, 150, 180, 210].map((r) => `<ellipse cx="80" cy="100" rx="${r}" ry="${f(r * 0.5)}" fill="none" stroke="#3a2e1e" stroke-width="1.6" opacity="0.45"/>`).join('')}
          <ellipse cx="80" cy="96" rx="22" ry="12" fill="#c8d4b0" opacity="0.6"/>
        </g>
        ${[[110, 54], [140, 52], [170, 52], [200, 55], [228, 60], [252, 68], [270, 80]].map(([x, y], i) => `<ellipse cx="${x}" cy="${y + 6}" rx="${4.5 - i * 0.2}" ry="3.5" fill="#1e1a12" stroke="#c8b890" stroke-width="1.4"/>`).join('')}`,
    };
  });


  // ======================================================
  //  追加の魚（100組対応）：寿司ネタ・市場
  // ======================================================
  const tunaBack = (b, o) => `
      ${tail(b, 'moon', o.tw || 46, o.tH || 58, o.tailC)}
      ${finUp(b, 92, 134, o.d1 || 24, o.finC, 0.15)}
      ${finUp(b, 158, 182, o.d2 || 22, o.fin2C, 0.2, false)}
      ${finDown(b, 166, 188, o.d2 || 20, o.fin2C, 0.2, false)}
      ${finlets(b, 196, 252, 8, o.letC, 8)}`;

  art.isaki = () => spindle({
    label: 'イサキ',
    body: { nx: 20, mx: 115, px: 250, h: 38, hb: 36, ph: 8, k1: 0.12, k2: 0.75, ny: 2 },
    grad: [[0, '#4f5236'], [0.5, '#7d7f5c'], [0.75, '#c6c4a4'], [1, '#e6e3cf']],
    back: (b) => `
      ${tail(b, 'shallow', 44, 38, '#6b6c4c')}
      ${finUp(b, 80, 210, 24, '#6b6c4c', 0.2)}
      ${finDown(b, 168, 206, 16, '#8e8f6c', 0.2)}`,
    clip: () => [78, 92, 106].map((y) => `<path d="M 40 ${y} Q 150 ${y - 3} 252 ${100 + (y - 100) * 0.3}" fill="none" stroke="#d9c98a" stroke-width="5" opacity="0.85"/>`).join(''),
    front: (b) => `
      ${gill(66, 100, 38)}
      ${leafFin(76, 108, 28, 8, 12, '#8e8f6c')}
      ${mouthLine(20, 102, 36, 106)}
      ${eye(42, 92, 7.5, '#d8c070')}`,
  });

  art.ishimochi = () => spindle({
    label: 'イシモチ',
    body: { nx: 20, mx: 110, px: 248, h: 36, hb: 34, ph: 8, k1: 0.1, k2: 0.8, ny: 2 },
    grad: [[0, '#8c949a'], [0.45, '#bcc3c8'], [1, '#f2f4f5']],
    back: (b) => `
      <path d="M ${b.px - 8} ${b.cy - b.ph} L ${b.px + 46} ${b.cy - 6} Q ${b.px + 48} ${b.cy} ${b.px + 46} ${b.cy + 6} L ${b.px - 8} ${b.cy + b.ph} Z" fill="#a9b1b7" stroke="${OUT}" stroke-width="1.8" stroke-linejoin="round"/>
      ${finUp(b, 84, 120, 22, '#a0a8ae', 0.25)}
      ${finUp(b, 124, 226, 14, '#a0a8ae', 0.05)}
      ${finDown(b, 176, 204, 14, '#c9cfd3', 0.2, false)}`,
    clip: () => `<path d="M 50 92 Q 150 88 250 100" fill="none" stroke="#7a838a" stroke-width="1.4"/>`,
    front: (b) => `
      ${gill(68, 100, 36)}
      <ellipse cx="72" cy="80" rx="5" ry="6" fill="#1d1d1d"/>
      ${leafFin(78, 106, 26, 8, 12, '#c9cfd3')}
      <path d="M 20 102 Q 30 110 42 106" fill="none" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
      ${eye(42, 92, 8, '#c9d0d6')}`,
  });

  art.mebachi = () => spindle({
    label: 'メバチ',
    body: { nx: 16, mx: 116, px: 262, h: 56, hb: 52, ph: 6, k1: 0.1, k2: 0.86 },
    grad: [[0, '#16294f'], [0.35, '#2f4f84'], [0.55, '#9db0c6'], [1, '#eef2f6']],
    back: (b) => tunaBack(b, { tailC: '#1b3360', finC: '#1b3360', fin2C: '#c9a43a', letC: '#f2c230', d1: 26 }),
    front: (b) => `
      <path d="M 250 98 L 266 100 L 250 102 Z" fill="#16294f"/>
      ${gill(70, 100, 48)}
      ${leafFin(84, 104, 46, 9, 8, '#1b3360')}
      ${mouthLine(16, 100, 38, 106)}
      ${eye(46, 90, 12, '#c0c8d0')}`,
  });

  art.binnaga = () => spindle({
    label: 'ビンナガ',
    body: { nx: 18, mx: 118, px: 262, h: 46, hb: 44, ph: 6, k1: 0.14, k2: 0.8 },
    grad: [[0, '#1f3554'], [0.4, '#4a6584'], [0.55, '#c9d3dd'], [1, '#f0f3f6']],
    back: (b) => tunaBack(b, { tailC: '#2a4262', finC: '#2a4262', fin2C: '#d8c070', letC: '#eadfaa' })
      + `<path d="M ${b.px + 46} ${b.cy - 58} Q ${b.px + 22} ${b.cy - 12} ${b.px + 12} ${b.cy} Q ${b.px + 22} ${b.cy + 12} ${b.px + 46} ${b.cy + 58}" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`,
    front: (b) => `
      <path d="M 250 98 L 266 100 L 250 102 Z" fill="#1f3554"/>
      ${gill(66, 100, 42)}
      <path d="M 78 104 Q 140 86 214 96 Q 140 100 80 112 Z" fill="#2a4262" stroke="${OUT}" stroke-width="1.6" stroke-linejoin="round"/>
      ${mouthLine(18, 100, 38, 105)}
      ${eye(44, 93, 8.5, '#c0c8d0')}`,
  });

  art.hagatsuo = () => spindle({
    label: 'ハガツオ',
    body: { nx: 16, mx: 120, px: 258, h: 34, hb: 34, ph: 5, k1: 0.2, k2: 0.68 },
    grad: [[0, '#28456e'], [0.45, '#6a88ae'], [0.55, '#e0e7ef'], [1, '#f5f7fa']],
    back: (b) => `
      ${tail(b, 'moon', 42, 48, '#2f4a74')}
      ${finUp(b, 70, 150, 18, '#2f4a74', 0.1)}
      ${finUp(b, 160, 178, 12, '#5c6f8c', 0.2, false)}
      ${finDown(b, 166, 184, 12, '#a9b4c0', 0.2, false)}
      ${finlets(b, 190, 250, 7, '#4f5f78', 6)}`,
    // 背中の斜めの縞
    clip: () => [-20, 0, 20, 40, 60, 80, 100, 120, 140, 160, 180].map((dx) => `<path d="M ${60 + dx} 62 L ${110 + dx} 96" stroke="#14243e" stroke-width="3"/>`).join(''),
    front: (b) => `
      <path d="M 14 100 L 44 104" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M 18 101 l 2 4 l 2 -4 l 2 4 l 2 -4 l 2 4 l 2 -4 l 2 4 l 2 -4 l 2 4 l 2 -4" stroke="#fff" stroke-width="1.3" fill="none"/>
      ${gill(64, 100, 32)}
      ${leafFin(74, 104, 20, 6, 6, '#2f4a74')}
      ${eye(42, 94, 7, '#c0c8d0')}`,
  });

  art.konoshiro = () => spindle({
    label: 'コノシロ',
    body: { nx: 22, mx: 118, px: 250, h: 42, hb: 40, ph: 6, k1: 0.12, k2: 0.78 },
    grad: [[0, '#2c5a72'], [0.42, '#6e98ae'], [0.52, '#dfe8ee'], [1, '#f6f8fa']],
    back: (b) => `
      ${tail(b, 'fork', 46, 40, '#3e6a82')}
      ${finUp(b, 116, 146, 18, '#3e6a82', 0.3, false)}
      <path d="M 144 ${f(b.top(144) - 6)} Q 190 ${f(b.top(170) - 20)} 236 ${f(b.top(230) - 8)}" fill="none" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
      ${finDown(b, 180, 222, 9, '#c7d3df', 0.1, false)}`,
    clip: () => [70, 78, 86].map((y) => `<path d="M 60 ${y} L 252 ${100 - (100 - y) * 0.4}" stroke="#2a4a5c" stroke-width="1.6" stroke-dasharray="2 4" opacity="0.8"/>`).join('')
      + '<circle cx="74" cy="84" r="5.5" fill="#1a2a36"/>',
    front: (b) => `
      ${gill(62, 100, 38)}
      ${leafFin(70, 112, 20, 5, 20, '#c7d3df')}
      <path d="M 22 102 Q 26 106 32 104" fill="none" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
      ${eye(42, 95, 7.5, '#c9d0d6')}`,
  });

  const tallSilver = (o) => spindle({
    label: o.label,
    body: { nx: 30, mx: 130, px: 228, h: 62, hb: 58, ph: 9, k1: 0.06, k2: 0.95, k3: 0.9, ny: 4 },
    grad: o.grad,
    back: (b) => `
      ${tail(b, 'round', 40, 34, o.finC)}
      ${o.dorsal(b)}
      ${finDown(b, 150, 214, 16, o.finC, 0.2)}`,
    clip: o.clip,
    front: (b) => `
      ${gill(74, 102, 50)}
      ${leafFin(84, 112, 24, 8, 20, o.finC)}
      ${o.mouth}
      ${eye(o.eyeX || 56, o.eyeY || 84, o.eyeR || 8, '#d8c070')}`,
  });

  art.matoudai = () => tallSilver({
    label: 'マトウダイ',
    grad: [[0, '#8a8a7c'], [0.5, '#b8b7a6'], [1, '#e6e4d8']],
    finC: '#8c8a76',
    dorsal: (b) => `${Array.from({ length: 9 }, (_, i) => { const x = 96 + i * 6; return `<path d="M ${x} ${f(b.top(x) + 3)} Q ${x + 6} ${f(b.top(x) - 40 + i * 3)} ${x + 14} ${f(b.top(x) - 56 + i * 4)}" fill="none" stroke="#6a685a" stroke-width="2" stroke-linecap="round"/>`; }).join('')}${finUp(b, 96, 150, 18, '#8c8a76', 0.2, false)}${finUp(b, 156, 216, 18, '#8c8a76', 0.2)}`,
    clip: () => '<circle cx="140" cy="100" r="15" fill="#1d1d1d" stroke="#f4f2e6" stroke-width="5"/>',
    mouth: `<path d="M 28 104 Q 40 122 60 114" fill="#d8d2be" stroke="${OUT}" stroke-width="2"/>`,
  });

  art.kagamidai = () => tallSilver({
    label: 'カガミダイ',
    grad: [[0, '#9aa6b0'], [0.4, '#d6dde3'], [0.6, '#f4f7f9'], [1, '#dfe5ea']],
    finC: '#a8b2ba',
    dorsal: (b) => `${finUp(b, 96, 150, 28, '#a8b2ba', 0.2)}${finUp(b, 156, 216, 18, '#a8b2ba', 0.2)}`,
    clip: () => '<ellipse cx="120" cy="80" rx="60" ry="20" fill="#fff" opacity="0.5" transform="rotate(-15 120 80)"/>',
    mouth: `<path d="M 30 104 Q 40 116 56 112" fill="none" stroke="${OUT}" stroke-width="2"/>`,
    eyeR: 11, eyeX: 58,
  });

  art.managatsuo = () => custom('マナガツオ', (id) => {
    const d = 'M 30 104 Q 70 46 140 42 Q 200 52 250 96 L 250 104 Q 200 148 140 158 Q 70 156 30 104 Z';
    return {
      defs: gradient(`${id}g`, [[0, '#9aa6b2'], [0.45, '#d6dde4'], [1, '#f1f4f7']]),
      inner: `
        <path d="M 244 96 Q 270 70 300 46 Q 286 80 274 100 Q 286 120 300 154 Q 270 130 244 104 Z" fill="#a8b4c0" stroke="${OUT}" stroke-width="1.8"/>
        <path d="M 140 46 Q 190 20 214 22 Q 210 50 232 80 Z" fill="#a8b4c0" stroke="${OUT}" stroke-width="1.6"/>
        <path d="M 140 154 Q 190 180 214 178 Q 210 150 232 120 Z" fill="#a8b4c0" stroke="${OUT}" stroke-width="1.6"/>
        <path d="${d}" fill="url(#${id}g)" stroke="${OUT}" stroke-width="2"/>
        ${dots(301, 40, 60, 230, 60, 140, 0.8, 1.4, '#6a7682', 0.4)}
        ${leafFin(80, 102, 40, 8, 12, '#b8c4ce')}
        <path d="M 28 104 Q 32 108 36 106" fill="none" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
        ${eye(52, 92, 7, '#c9d0d6')}`,
    };
  });

  art.ibodai = () => spindle({
    label: 'イボダイ',
    body: { nx: 30, mx: 125, px: 236, h: 50, hb: 48, ph: 8, k1: 0.05, k2: 0.95, k3: 0.9, ny: 2 },
    grad: [[0, '#6f8798'], [0.45, '#b2c2cc'], [1, '#eef2f5']],
    back: (b) => `
      ${tail(b, 'fork', 46, 42, '#8fa2b0')}
      ${finUp(b, 92, 210, 18, '#8fa2b0', 0.2)}
      ${finDown(b, 136, 210, 16, '#b4c2cc', 0.2)}`,
    clip: () => '<ellipse cx="82" cy="74" rx="6" ry="7" fill="#1d1d1d"/>',
    front: (b) => `
      ${gill(70, 100, 42)}
      ${leafFin(80, 108, 30, 8, 14, '#b4c2cc')}
      <path d="M 29 104 Q 33 108 38 106" fill="none" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
      ${eye(52, 92, 8, '#c9d0d6')}`,
  });

  art.amadai = () => spindle({
    label: 'アマダイ',
    body: { nx: 30, mx: 100, px: 248, h: 44, hb: 34, ph: 8, k1: 0.0, k2: 1.0, k3: 0.6, ny: 8 },
    grad: [[0, '#e2697a'], [0.5, '#f2a0a0'], [1, '#fde4dc']],
    back: (b) => `
      ${tail(b, 'square', 44, 38, '#f0a0a0', [-24, -12, 0, 12, 24].map((y) => `<path d="M ${b.px + 6} ${b.cy + y * 0.4} L ${b.px + 42} ${b.cy + y}" stroke="#f2cc2e" stroke-width="3"/>`).join(''))}
      ${finUp(b, 80, 228, 14, '#ef8a95', 0.1)}
      ${finDown(b, 140, 228, 12, '#f5b0b6', 0.1)}`,
    front: (b) => `
      <path d="M 50 102 L 64 104 L 54 112 Z" fill="#fff" stroke="${OUT}" stroke-width="1.2"/>
      ${gill(72, 102, 36)}
      ${leafFin(80, 110, 30, 8, 14, '#f5b0b6')}
      <path d="M 30 108 Q 36 114 46 112" fill="none" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
      ${eye(48, 84, 8, '#e6b84a')}`,
  });

  art.akamutsu = () => spindle({
    label: 'アカムツ',
    body: { nx: 22, mx: 112, px: 246, h: 42, hb: 40, ph: 8, k1: 0.12, k2: 0.78, ny: 2 },
    grad: [[0, '#d8323e'], [0.5, '#ef6a62'], [1, '#fbd2c8']],
    back: (b) => `
      ${tail(b, 'fork', 50, 44, '#e2464a')}
      ${finUp(b, 96, 140, 22, '#e2464a', 0.2)}
      ${finUp(b, 146, 196, 18, '#e2464a', 0.2)}
      ${finDown(b, 160, 200, 16, '#ee7a70', 0.2)}`,
    front: (b) => `
      ${gill(74, 100, 40)}
      ${leafFin(82, 108, 32, 8, 12, '#ee7a70')}
      <path d="M 16 96 L 52 104 L 22 122 Q 14 110 16 96 Z" fill="#111" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M 16 96 L 52 104" stroke="#e2464a" stroke-width="3"/>
      ${eye(50, 86, 13, '#f2c230')}`,
  });

  art.kidai = () => spindle({
    label: 'キダイ',
    body: { nx: 28, mx: 118, px: 240, h: 60, hb: 48, ph: 10, k1: 0.06, k2: 0.95, k3: 0.7, ny: 6 },
    grad: [[0, '#e05a5e'], [0.45, '#f29a90'], [1, '#fde6dc']],
    back: (b) => `
      ${tail(b, 'shallow', 56, 46, '#ef8a80')}
      ${finUp(b, 84, 214, 22, '#f2c040', 0.25)}
      ${finDown(b, 172, 216, 18, '#f5b0a6', 0.2)}`,
    clip: () => [[110, 52], [150, 58], [190, 70]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="14" ry="7" fill="#f6d040" opacity="0.9"/>`).join('')
      + '<path d="M 28 96 Q 50 60 80 50" fill="none" stroke="#f6d040" stroke-width="8" opacity="0.8"/>',
    front: (b) => `
      ${gill(70, 100, 52)}
      ${leafFin(84, 116, 44, 9, 18, '#f39a90')}
      <path d="M 28 106 Q 34 112 42 110" fill="none" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
      ${eye(52, 86, 9, '#e6b84a')}`,
  });

  const salmonFront = (b, finC) => `
      ${gill(62, 102, 38)}
      ${leafFin(72, 112, 24, 7, 22, finC)}
      ${leafFin(140, 134, 18, 6, 30, finC)}
      ${mouthLine(20, 102, 42, 106)}
      ${eye(42, 94, 6.5, '#c9d0d6')}`;
  const salmonBack = (b, finC, tailExtra = '') => `
      ${tail(b, 'shallow', 46, 40, finC, tailExtra)}
      ${finUp(b, 122, 158, 24, finC, 0.25)}
      ${adiposeFin(b, 212, finC)}
      ${finDown(b, 184, 210, 16, finC, 0.2, false)}`;

  art.karafuto = () => spindle({
    label: 'カラフトマス',
    body: { nx: 20, mx: 115, px: 250, h: 48, hb: 38, ph: 10, k1: 0.15, k2: 0.75, ny: 2 },
    grad: [[0, '#3a4e5e'], [0.45, '#7e92a2'], [0.6, '#e4e8ec'], [1, '#f6f7f8']],
    back: (b) => salmonBack(b, '#5a6e7e', dots(311, 14, b.px + 4, b.px + 40, b.cy - 34, b.cy + 34, 2.4, 4, '#111')),
    clip: () => dots(312, 26, 60, 240, 54, 88, 2.2, 3.6, '#111'),
    front: (b) => salmonFront(b, '#8a9caa'),
  });

  art.ginzake = () => spindle({
    label: 'ギンザケ',
    body: { nx: 20, mx: 125, px: 250, h: 40, hb: 38, ph: 10, k1: 0.2, k2: 0.65, ny: 2 },
    grad: [[0, '#2a4e7a'], [0.4, '#7a98ba'], [0.55, '#e6ecf2'], [1, '#f7f8fa']],
    back: (b) => salmonBack(b, '#4a6a90', dots(321, 10, b.px + 6, b.px + 40, b.cy - 36, b.cy - 6, 1.4, 2.2, '#111')),
    clip: () => dots(322, 34, 50, 240, 62, 82, 1.2, 2, '#111'),
    front: (b) => salmonFront(b, '#a8b8c8'),
  });

  art.benizake = () => spindle({
    label: 'ベニザケ',
    body: { nx: 14, mx: 125, px: 250, h: 42, hb: 38, ph: 10, k1: 0.2, k2: 0.65, ny: 4 },
    grad: [[0, '#c82a2a'], [0.6, '#e04a3a'], [1, '#f08070']],
    back: (b) => salmonBack(b, '#3d6a3a'),
    clip: () => '<path d="M 0 0 L 74 0 Q 64 100 74 200 L 0 200 Z" fill="#3d7a42"/>',
    front: (b) => `
      ${gill(70, 102, 38)}
      ${leafFin(78, 112, 24, 7, 22, '#c84a3a')}
      <path d="M 12 100 Q 18 92 30 94 M 14 108 Q 22 116 40 110" fill="none" stroke="${OUT}" stroke-width="2.4" stroke-linecap="round"/>
      ${eye(46, 92, 6.5, '#e0c050')}`,
  });

  // アイナメ・クジメ
  const greenling = (label, grad, tailType, lines) => spindle({
    label,
    body: { nx: 20, mx: 115, px: 248, h: 36, hb: 32, ph: 9, k1: 0.15, k2: 0.75, ny: 2 },
    grad,
    back: (b) => `
      ${tail(b, tailType, 42, 34, '#8a6a3a')}
      ${finUp(b, 74, 146, 18, '#8a6a3a', 0.2)}
      ${finUp(b, 150, 230, 18, '#8a6a3a', 0.3)}
      ${finDown(b, 140, 228, 14, '#a8885a', 0.2)}`,
    clip: () => dots(331 + lines, 30, 40, 248, 66, 120, 4, 9, '#5a3e1c', 0.45) + (lines > 1
      ? [76, 88, 100, 112, 122].map((y) => `<path d="M 60 ${y} Q 150 ${y - 2} 248 ${100 + (y - 100) * 0.3}" fill="none" stroke="#f2e6c8" stroke-width="1.4"/>`).join('')
      : '<path d="M 60 82 Q 150 80 248 98" fill="none" stroke="#f2e6c8" stroke-width="1.4"/>'),
    front: (b) => `
      ${gill(62, 100, 34)}
      ${leafFin(72, 110, 30, 9, 12, '#a8885a')}
      ${mouthLine(20, 102, 34, 105)}
      ${eye(42, 92, 7, '#d8b040')}`,
  });
  art.ainame = () => greenling('アイナメ', [[0, '#7a5a2e'], [0.5, '#a8844e'], [1, '#e6d4b0']], 'square', 5);
  art.kujime = () => greenling('クジメ', [[0, '#6e4e2a'], [0.5, '#9a7646'], [1, '#e0cca8']], 'round', 1);

  // ======================================================
  //  磯・沿岸
  // ======================================================
  art.mejina = () => spindle({
    label: 'メジナ',
    body: { nx: 30, mx: 120, px: 236, h: 54, hb: 48, ph: 10, k1: 0.05, k2: 0.95, k3: 0.8, ny: 4 },
    grad: [[0, '#1f2a36'], [0.5, '#34465a'], [1, '#6c7c8c']],
    back: (b) => `
      ${tail(b, 'shallow', 46, 40, '#2a3644')}
      ${finUp(b, 88, 210, 18, '#2a3644', 0.2)}
      ${finDown(b, 160, 210, 18, '#2a3644', 0.2)}`,
    clip: (b) => scales(b, 70, 236, 12, '#0e1620', 0.6),
    front: (b) => `
      ${gill(70, 100, 46, '#0e1620')}
      ${leafFin(82, 110, 26, 8, 14, '#2a3644')}
      <path d="M 29 104 Q 32 108 36 106" fill="none" stroke="#c8d0d8" stroke-width="1.8" stroke-linecap="round"/>
      ${eye(50, 88, 8, '#5fb0e0')}`,
  });

  const grouper = (o) => spindle({
    label: o.label,
    body: { nx: 18, mx: 112, px: 240, h: 44, hb: 42, ph: 11, k1: 0.12, k2: 0.75, ny: 2 },
    grad: o.grad,
    back: (b) => `
      ${tail(b, 'round', 44, 38, o.finC, o.tailExtra ? o.tailExtra(b) : '')}
      ${finUp(b, 70, 210, 20, o.finC, 0.2)}
      ${finDown(b, 160, 206, 18, o.finC, 0.3)}`,
    clip: o.clip,
    front: (b) => `
      ${gill(68, 100, 40)}
      ${leafFin(76, 110, 30, 11, 14, o.finC)}
      <path d="M 14 100 Q 34 120 58 108 L 54 104 Z" fill="#e8dcc4" stroke="${OUT}" stroke-width="2"/>
      ${eye(42, 88, 6.5, '#d8b040')}`,
  });
  art.kue = () => grouper({
    label: 'クエ',
    grad: [[0, '#5a4a3a'], [0.5, '#7e6a54'], [1, '#b8a68c']],
    finC: '#6a5846',
    clip: () => [40, 80, 120, 160, 200, 236].map((x) => `<path d="M ${x} 40 L ${x + 30} 160" stroke="#2e241a" stroke-width="12" opacity="0.4" stroke-linecap="round"/>`).join('') + dots(341, 30, 30, 240, 50, 150, 2, 4, '#2e241a', 0.3),
  });
  art.mahata = () => grouper({
    label: 'マハタ',
    grad: [[0, '#6a6e72'], [0.5, '#8e9296'], [1, '#c8cbce']],
    finC: '#5e6266',
    tailExtra: (b) => `<path d="M ${b.px + 44} ${b.cy - 30} Q ${b.px + 50} ${b.cy} ${b.px + 44} ${b.cy + 30}" stroke="#fff" stroke-width="3" fill="none"/>`,
    clip: () => vbands([58, 86, 114, 142, 170, 198, 226], 12, '#2a2c30', 0.85, -2),
  });
  art.kijihata = () => grouper({
    label: 'キジハタ',
    grad: [[0, '#a8743a'], [0.5, '#c89458'], [1, '#ecd2a6']],
    finC: '#c88a3a',
    clip: () => dots(351, 80, 30, 240, 50, 150, 1.6, 2.8, '#f06a1a', 0.95) + '<ellipse cx="150" cy="62" rx="8" ry="6" fill="#2a1a0a"/>',
  });

  art.kurosoi = () => spindle({
    label: 'クロソイ',
    body: { nx: 22, mx: 110, px: 238, h: 46, hb: 40, ph: 9, k1: 0.12, k2: 0.8, ny: 2 },
    grad: [[0, '#2e3236'], [0.5, '#4e5458'], [0.75, '#8a9094'], [1, '#c8ccce']],
    back: (b) => `
      ${tail(b, 'square', 42, 36, '#3a3e42')}
      ${finUp(b, 70, 210, 24, '#3a3e42', 0.2)}
      ${finDown(b, 160, 202, 18, '#4a4e52', 0.2)}`,
    clip: () => '<path d="M 50 92 L 66 112 M 50 92 L 70 100 M 50 92 L 72 88" stroke="#121416" stroke-width="5" stroke-linecap="round"/>',
    front: (b) => `
      ${[34, 44, 54, 62].map((x) => `<path d="M ${x} ${f(b.top(x) + 2)} L ${x + 3} ${f(b.top(x) - 7)} L ${x + 7} ${f(b.top(x + 7) + 2)} Z" fill="#3a3e42" stroke="${OUT}" stroke-width="1.1"/>`).join('')}
      ${gill(72, 100, 44, '#121416')}
      ${leafFin(80, 110, 32, 10, 14, '#4a4e52')}
      <path d="M 22 104 Q 34 116 48 108" fill="none" stroke="#c8ccce" stroke-width="2" stroke-linecap="round"/>
      ${eye(50, 86, 9, '#c9b778')}`,
  });

  art.kusafugu = () => spindle({
    label: 'クサフグ',
    body: { nx: 38, mx: 128, px: 246, h: 56, hb: 56, ph: 11, k1: 0.0, k2: 1.0, ny: 6 },
    grad: [[0, '#4a5a3a'], [0.5, '#6e7e56'], [0.58, '#f7f7f0'], [1, '#ffffff']],
    back: (b) => `
      ${tail(b, 'round', 36, 26, '#5a6a46')}
      ${finUp(b, 200, 226, 20, '#5a6a46', 0.4, false)}
      ${finDown(b, 200, 226, 20, '#f2f2e8', 0.4, false)}`,
    clip: () => dots(361, 70, 50, 246, 44, 100, 1.4, 2.6, '#fbfbf0', 0.95),
    front: (b) => `
      ${leafFin(100, 104, 22, 10, -10, '#5a6a46')}
      <path d="M 37 102 Q 44 98 46 106 Q 44 114 37 110 Z" fill="#f4f0e2" stroke="${OUT}" stroke-width="1.6"/>
      <line x1="38" y1="106" x2="45" y2="106" stroke="${OUT}" stroke-width="1.2"/>
      ${eye(74, 80, 8, '#4fc0a0')}`,
  });

  art.manbou = () => custom('マンボウ', (id) => ({
    defs: gradient(`${id}g`, [[0, '#7a8a96'], [0.5, '#a8b4bc'], [1, '#dfe4e8']]),
    inner: `
      <path d="M 196 60 Q 210 10 236 4 Q 230 40 226 70 Z" fill="#7a8a96" stroke="${OUT}" stroke-width="1.8"/>
      <path d="M 196 140 Q 210 190 236 196 Q 230 160 226 130 Z" fill="#a8b4bc" stroke="${OUT}" stroke-width="1.8"/>
      <path d="M 40 100 Q 40 40 120 34 Q 200 34 236 70 Q 252 100 236 130 Q 200 166 120 166 Q 40 160 40 100 Z" fill="url(#${id}g)" stroke="${OUT}" stroke-width="2.2"/>
      <path d="M 236 70 Q 262 76 268 90 Q 258 100 268 110 Q 262 124 236 130" fill="#94a2ac" stroke="${OUT}" stroke-width="1.8"/>
      ${dots(371, 20, 80, 220, 50, 150, 2, 4, '#eef2f4', 0.6)}
      ${leafFin(96, 104, 22, 9, -20, '#94a2ac')}
      ${gill(90, 104, 14)}
      <circle cx="44" cy="104" r="4" fill="#f4f2ea" stroke="${OUT}" stroke-width="1.5"/>
      ${eye(70, 90, 7, '#c9d0d6')}`,
  }));

  art.akamanbou = () => spindle({
    label: 'アカマンボウ',
    body: { nx: 30, mx: 130, px: 236, h: 64, hb: 60, ph: 10, k1: 0.02, k2: 0.95, k3: 0.9, ny: 2 },
    grad: [[0, '#5a6a86'], [0.45, '#a8b4c8'], [1, '#e6d8e0']],
    back: (b) => `
      ${tail(b, 'fork', 56, 50, '#e23a3a')}
      <path d="M 90 ${f(b.top(90) + 4)} Q 100 ${f(b.top(96) - 50)} 116 ${f(b.top(110) - 40)} Q 180 ${f(b.top(170) - 10)} 228 ${f(b.top(226) + 3)} Z" fill="#e23a3a" stroke="${OUT}" stroke-width="1.8"/>
      ${finDown(b, 150, 224, 14, '#e23a3a', 0.1)}`,
    clip: () => dots(381, 60, 50, 236, 40, 160, 2, 4, '#ffffff', 0.85),
    front: (b) => `
      ${leafFin(90, 110, 36, 10, 6, '#e23a3a')}
      ${leafFin(116, 154, 30, 8, 60, '#e23a3a')}
      <path d="M 29 104 Q 34 110 40 106" fill="none" stroke="#e23a3a" stroke-width="3" stroke-linecap="round"/>
      ${eye(56, 92, 10, '#f2c230')}`,
  });

  art.tatsu = () => custom('タツノオトシゴ', (id) => ({
    defs: gradient(`${id}g`, [[0, '#e8b03a'], [1, '#c8781e']]),
    inner: `<g transform="translate(-70 6)">
      <path d="M 196 38 Q 214 30 236 40 L 268 38 L 270 50 L 236 54 Q 228 66 214 70 Q 220 100 206 130 Q 196 150 188 160 Q 176 176 186 184 Q 200 190 202 176 Q 202 168 194 170" fill="none" stroke="${OUT}" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M 196 38 Q 214 30 236 40 L 268 38 L 270 50 L 236 54 Q 228 66 214 70 Q 220 100 206 130 Q 196 150 188 160 Q 176 176 186 184 Q 200 190 202 176 Q 202 168 194 170" fill="none" stroke="url(#${id}g)" stroke-width="18" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M 186 64 Q 150 90 190 140 Q 210 110 212 72 Z" fill="url(#${id}g)" stroke="${OUT}" stroke-width="2"/>
      ${[80, 96, 112, 128].map((y) => `<path d="M ${170 + (y - 80) * 0.2} ${y} Q 190 ${y + 4} ${210 - (y - 80) * 0.12} ${y}" fill="none" stroke="#8a4a10" stroke-width="1.5"/>`).join('')}
      <path d="M 220 86 Q 240 80 246 96 Q 236 104 220 100 Z" fill="#f6d27a" stroke="${OUT}" stroke-width="1.4"/>
      <path d="M 200 30 L 206 18 L 212 30" fill="#e8b03a" stroke="${OUT}" stroke-width="1.4"/>
      ${eye(222, 44, 5, '#3a2a10')}</g>`,
  }));

  art.youji = () => custom('ヨウジウオ', (id) => ({
    defs: gradient(`${id}g`, [[0, '#7a6a3a'], [1, '#c8b47a']]),
    inner: `
      <path d="M 280 96 Q 304 84 310 100 Q 304 116 280 104 Z" fill="#a8925a" stroke="${OUT}" stroke-width="1.6"/>
      <path d="M 10 99 L 44 97 Q 60 92 80 94 L 282 98 L 282 102 L 80 106 Q 60 108 44 103 L 10 101 Z" fill="url(#${id}g)" stroke="${OUT}" stroke-width="1.8" stroke-linejoin="round"/>
      ${Array.from({ length: 30 }, (_, i) => `<line x1="${90 + i * 6.3}" y1="94.5" x2="${90 + i * 6.3}" y2="105.5" stroke="#5a4a20" stroke-width="1"/>`).join('')}
      <path d="M 150 94 Q 160 84 176 94 Z" fill="#c8b47a" stroke="${OUT}" stroke-width="1.2"/>
      ${eye(56, 98, 4, '#d8c070')}`,
  }));

  const clownBody = { nx: 30, mx: 118, px: 232, h: 40, hb: 38, ph: 11, k1: 0.06, k2: 0.9, ny: 2 };
  art.kakure = () => spindle({
    label: 'カクレクマノミ',
    body: clownBody,
    grad: [[0, '#ff7a1a'], [1, '#ffa040']],
    back: (b) => `
      ${tail(b, 'round', 40, 32, '#ff7a1a', `<path d="M ${b.px + 36} ${b.cy - 26} Q ${b.px + 44} ${b.cy} ${b.px + 36} ${b.cy + 26}" stroke="#111" stroke-width="5" fill="none"/>`)}
      ${finUp(b, 80, 210, 22, '#ff7a1a', 0.2)}
      <path d="M 82 ${f(b.top(82) - 6)} Q 120 ${f(b.top(110) - 26)} 208 ${f(b.top(208) - 8)}" fill="none" stroke="#111" stroke-width="4"/>
      ${finDown(b, 160, 206, 18, '#ff7a1a', 0.3)}`,
    clip: () => [[64, 14, -6], [128, 18, -2], [204, 12, 0]].map(([x, w, sk]) => `<path d="M ${x} 20 L ${x + w} 20 L ${x + w + sk} 180 L ${x + sk} 180 Z" fill="#fff" stroke="#111" stroke-width="3"/>`).join(''),
    front: (b) => `
      ${leafFin(80, 112, 24, 10, 20, '#ff8a2a')}
      <path d="M 29 104 Q 33 108 38 106" fill="none" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
      ${eye(48, 92, 7, '#ff9a2a')}`,
  });
  art.kumanomi = () => spindle({
    label: 'クマノミ',
    body: clownBody,
    grad: [[0, '#2a1a12'], [0.6, '#4a2a18'], [1, '#e08a2a']],
    back: (b) => `
      ${tail(b, 'shallow', 40, 32, '#fff3c0')}
      ${finUp(b, 80, 210, 22, '#2a1a12', 0.2)}
      ${finDown(b, 160, 206, 18, '#f2b020', 0.3)}`,
    clip: () => [[64, 12, -6], [128, 14, -2], [204, 10, 0]].map(([x, w, sk]) => `<path d="M ${x} 20 L ${x + w} 20 L ${x + w + sk} 180 L ${x + sk} 180 Z" fill="#fbfbf4"/>`).join('')
      + '<path d="M 20 90 Q 40 140 70 150 L 20 150 Z" fill="#f2a020"/>',
    front: (b) => `
      ${leafFin(80, 112, 24, 10, 20, '#f2b020')}
      ${leafFin(100, 136, 18, 7, 50, '#f2b020')}
      <path d="M 29 104 Q 33 108 38 106" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>
      ${eye(48, 92, 7, '#f2a020')}`,
  });

  const discBody = { nx: 22, mx: 130, px: 226, h: 66, hb: 62, ph: 10, k1: 0.15, k2: 0.75, k3: 0.85, ny: 2 };
  art.chouchou = () => spindle({
    label: 'チョウチョウウオ',
    body: discBody,
    grad: [[0, '#f8e05a'], [0.5, '#fff6c0'], [1, '#f6e8a0']],
    back: (b) => `
      ${tail(b, 'square', 34, 30, '#f6d840')}
      ${finUp(b, 90, 220, 16, '#f2cc2e', 0.5)}
      ${finDown(b, 150, 220, 16, '#f2cc2e', 0.5)}`,
    clip: () => '<path d="M 56 30 L 76 30 L 70 170 L 50 170 Z" fill="#1d1d1d"/>'
      + [90, 110, 130, 150, 170, 190].map((x) => `<path d="M ${x} 40 L ${x + 40} 160" stroke="#d8a020" stroke-width="2" opacity="0.6"/>`).join('')
      + '<circle cx="200" cy="74" r="9" fill="#1d1d1d" stroke="#fff" stroke-width="2"/>',
    front: (b) => `
      ${leafFin(90, 110, 24, 8, 10, '#fff2a0')}
      <path d="M 16 100 L 30 98 L 30 104 Z" fill="#f6d840" stroke="${OUT}" stroke-width="1.4"/>
      ${eye(62, 92, 6, '#fff')}`,
  });
  art.tsunodashi = () => custom('ツノダシ', (id) => {
    const d = 'M 30 112 Q 50 60 120 40 Q 200 46 226 96 L 226 110 Q 200 160 120 166 Q 60 160 30 112 Z';
    return {
      defs: `<clipPath id="${id}c"><path d="${d}"/></clipPath>`,
      inner: `
        <path d="M 220 96 L 262 82 Q 258 104 262 124 L 220 112 Z" fill="#1d1d1d" stroke="${OUT}" stroke-width="1.6"/>
        <path d="M 118 44 Q 150 0 300 10 Q 180 12 140 48 Z" fill="#fbfbf4" stroke="${OUT}" stroke-width="1.6"/>
        <path d="${d}" fill="#fbfbf4"/>
        <g clip-path="url(#${id}c)">
          <path d="M 70 0 L 110 0 L 130 200 L 90 200 Z" fill="#1d1d1d"/>
          <path d="M 110 0 L 130 0 L 150 200 L 130 200 Z" fill="#fbfbf4"/>
          <path d="M 150 0 L 230 0 L 230 200 L 170 200 Z" fill="#f6d030"/>
          <path d="M 176 0 L 206 0 L 226 200 L 196 200 Z" fill="#1d1d1d"/>
        </g>
        <path d="${d}" fill="none" stroke="${OUT}" stroke-width="2"/>
        <path d="M 14 108 L 32 104 L 34 114 Z" fill="#f08a2a" stroke="${OUT}" stroke-width="1.4"/>
        ${eye(80, 94, 6, '#f6d030')}`,
    };
  });

  art.mutsugoro = () => spindle({
    label: 'ムツゴロウ',
    body: { nx: 22, mx: 76, px: 238, h: 30, hb: 30, ph: 10, k1: 0.05, k2: 0.95, ny: 8 },
    grad: [[0, '#3e4a3a'], [0.5, '#5e6a54'], [1, '#a8ae96']],
    back: (b) => `
      ${tail(b, 'round', 44, 30, '#4e5a46')}
      ${finUp(b, 86, 120, 34, '#4e5a46', 0.5)}
      ${finUp(b, 130, 214, 22, '#4e5a46', 0.2)}
      ${finDown(b, 136, 212, 14, '#6e7a64', 0.2)}`,
    clip: () => dots(391, 60, 30, 238, 64, 116, 1.4, 2.6, '#7fd0ff', 0.95),
    front: (b) => `
      ${leafFin(70, 110, 24, 10, 30, '#5e6a54')}
      <path d="M 20 108 Q 30 116 48 112" fill="none" stroke="${OUT}" stroke-width="2"/>
      <path d="M 44 74 L 46 62 M 58 74 L 60 62" stroke="${OUT}" stroke-width="5" stroke-linecap="round"/>
      ${eye(44, 58, 7, '#d8c070')}${eye(60, 58, 7, '#d8c070')}`,
  });

  art.shumoku = () => custom('シュモクザメ', (id) => ({
    defs: gradient(`${id}g`, [[0, '#6f7f8c'], [1, '#8f9eaa']]),
    inner: `
      <path d="M 250 100 L 310 76 Q 296 100 310 124 Z" fill="#6c7b87" stroke="${OUT}" stroke-width="1.8"/>
      <path d="M 110 98 L 70 36 Q 96 40 140 92 Z" fill="#6c7b87" stroke="${OUT}" stroke-width="1.8"/>
      <path d="M 110 102 L 70 164 Q 96 160 140 108 Z" fill="#6c7b87" stroke="${OUT}" stroke-width="1.8"/>
      <path d="M 60 92 Q 140 84 250 96 L 250 104 Q 140 116 60 108 Z" fill="url(#${id}g)" stroke="${OUT}" stroke-width="2"/>
      <path d="M 26 48 Q 40 42 48 48 Q 54 80 62 92 L 62 108 Q 54 120 48 152 Q 40 158 26 152 Q 34 100 26 48 Z" fill="url(#${id}g)" stroke="${OUT}" stroke-width="2"/>
      <path d="M 140 96 Q 150 80 160 98" fill="#5a6874" stroke="${OUT}" stroke-width="1.4"/>
      <circle cx="32" cy="52" r="4" fill="#111"/><circle cx="32" cy="148" r="4" fill="#111"/>`,
  }));

  art.manta = () => custom('マンタ', (id) => ({
    defs: `<radialGradient id="${id}g" cx="0.4" cy="0.5" r="0.6"><stop offset="0" stop-color="#3a4a5a"/><stop offset="1" stop-color="#1a2430"/></radialGradient>`,
    inner: `
      <path d="M 196 100 Q 230 100 262 98" fill="none" stroke="#1a2430" stroke-width="4" stroke-linecap="round"/>
      <path d="M 50 90 Q 60 10 140 6 Q 170 40 200 100 Q 170 160 140 194 Q 60 190 50 110 Z" fill="url(#${id}g)" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M 52 84 Q 24 80 20 70 Q 34 70 56 78 Z" fill="#2a3644" stroke="${OUT}" stroke-width="1.6"/>
      <path d="M 52 116 Q 24 120 20 130 Q 34 130 56 122 Z" fill="#2a3644" stroke="${OUT}" stroke-width="1.6"/>
      <path d="M 86 60 Q 110 50 120 70 Q 100 74 86 60 Z M 86 140 Q 110 150 120 130 Q 100 126 86 140 Z" fill="#e8eef2" opacity="0.85"/>
      <circle cx="58" cy="84" r="3" fill="#fff"/><circle cx="58" cy="116" r="3" fill="#fff"/>`,
  }));

  art.shachi = () => custom('シャチ', (id) => {
    const d = 'M 14 104 C 18 80 60 64 110 64 C 170 64 222 86 262 97 L 262 104 C 222 118 160 138 100 138 C 50 138 16 124 14 104 Z';
    return {
      defs: `<clipPath id="${id}c"><path d="${d}"/></clipPath>`,
      inner: `
        <path d="M 256 96 Q 284 86 314 90 Q 300 100 314 110 Q 284 114 256 105 Z" fill="#1d1d1d" stroke="${OUT}" stroke-width="1.8"/>
        <path d="M 140 68 L 160 4 Q 168 40 184 72 Z" fill="#1d1d1d" stroke="${OUT}" stroke-width="1.8" stroke-linejoin="round"/>
        <path d="${d}" fill="#1d1d1d"/>
        <g clip-path="url(#${id}c)">
          <path d="M 10 112 Q 60 128 120 126 Q 170 120 200 128 Q 160 150 100 150 Q 30 150 10 112 Z" fill="#fbfbf8"/>
          <path d="M 160 112 Q 190 104 214 116 Q 190 124 160 112 Z" fill="#fbfbf8"/>
          <path d="M 180 70 Q 200 74 210 86 Q 190 86 176 80 Z" fill="#9aa0a6" opacity="0.8"/>
        </g>
        <path d="${d}" fill="none" stroke="${OUT}" stroke-width="2"/>
        <ellipse cx="62" cy="88" rx="14" ry="6" fill="#fbfbf8" transform="rotate(-8 62 88)"/>
        <path d="M 80 122 Q 92 156 116 160 Q 108 138 104 122 Z" fill="#1d1d1d" stroke="${OUT}" stroke-width="1.8"/>
        <path d="M 16 108 Q 34 110 48 104" fill="none" stroke="#fbfbf8" stroke-width="1.6"/>
        <circle cx="46" cy="96" r="3" fill="#fff"/>`,
    };
  });

  art.datsu = () => spindle({
    label: 'ダツ',
    body: { nx: 70, mx: 160, px: 272, h: 16, hb: 16, ph: 5, k1: 0.25, k2: 0.6 },
    grad: [[0, '#2f6a6a'], [0.45, '#6aa8a0'], [0.55, '#dbe9e6'], [1, '#f6fbfa']],
    back: (b) => `
      ${tail(b, 'fork', 28, 20, '#3f7a76')}
      ${finUp(b, 228, 252, 12, '#3f7a76', 0.2, false)}
      ${finDown(b, 222, 250, 12, '#c9dcd6', 0.2, false)}`,
    front: (b) => `
      <path d="M 72 98 L 4 99 L 72 101 Z" fill="#4a8a84" stroke="${OUT}" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="M 72 101 L 6 102 L 72 104 Z" fill="#cfe0dc" stroke="${OUT}" stroke-width="1.2" stroke-linejoin="round"/>
      ${gill(104, 100, 14)}
      ${leafFin(110, 103, 14, 5, 5, '#5a9a90')}
      ${eye(86, 97, 5.5, '#c0c8d0')}`,
  });

  // ======================================================
  //  川・池
  // ======================================================
  const minnow = (o) => spindle({
    label: o.label,
    body: { nx: 22, mx: 118, px: 248, h: o.h || 32, hb: o.hb || 30, ph: 8, k1: 0.15, k2: 0.72, ny: 2 },
    grad: o.grad,
    back: (b) => `
      ${tail(b, 'fork', 44, 34, o.finC)}
      ${finUp(b, 116, 146, 24, o.finC, 0.25)}
      ${o.anal ? o.anal(b) : finDown(b, 176, 206, 14, o.finC2 || o.finC, 0.2, false)}`,
    clip: o.clip,
    front: (b) => `
      ${gill(62, 100, (o.h || 32) * 0.9)}
      ${leafFin(70, 108, 22, 6, 18, o.finC2 || o.finC)}
      ${leafFin(124, 126, 16, 5, 30, o.finC2 || o.finC)}
      ${o.mouth || mouthLine(22, 101, 34, 104)}
      ${eye(42, 95, 6.5, o.iris || '#d8c070')}`,
  });

  art.ugui = () => minnow({
    label: 'ウグイ',
    grad: [[0, '#3e4a3c'], [0.45, '#7a8a76'], [0.6, '#dcdcd0'], [1, '#f2f0e8']],
    finC: '#e0503a', finC2: '#e8604a',
    clip: () => '<path d="M 40 106 Q 150 104 250 104" stroke="#e8503a" stroke-width="7"/><path d="M 40 94 Q 150 92 250 98" stroke="#1d1d1d" stroke-width="5"/><path d="M 40 116 Q 150 114 250 108" stroke="#1d1d1d" stroke-width="4"/>',
  });

  art.oikawa = () => minnow({
    label: 'オイカワ',
    grad: [[0, '#3a6a6a'], [0.5, '#7aaab0'], [1, '#e8eef0']],
    finC: '#7aa8a8', finC2: '#f08aa0',
    clip: () => vbands([70, 96, 122, 148, 174, 200, 226], 11, '#4fb0d8', 0.75, -6) + vbands([83, 109, 135, 161, 187, 213], 8, '#f08aa0', 0.7, -6),
    anal: (b) => `<path d="M 150 ${f(b.bot(150) - 4)} Q 170 ${f(b.bot(160) + 40)} 220 ${f(b.bot(210) + 30)} Q 214 ${f(b.bot(214) + 6)} 222 ${f(b.bot(222) - 3)} Z" fill="#f08aa0" stroke="${OUT}" stroke-width="1.6"/>`,
  });

  art.tanago = () => minnow({
    label: 'タナゴ',
    h: 42, hb: 38,
    grad: [[0, '#6a7a7a'], [0.5, '#aebcbc'], [1, '#eef2f0']],
    finC: '#9aa8a6', finC2: '#f0a0b0',
    clip: () => '<path d="M 130 100 L 252 100" stroke="#4a7ad8" stroke-width="7" stroke-linecap="round" opacity="0.9"/><ellipse cx="74" cy="82" rx="5" ry="6" fill="#2a3a4a" opacity="0.6"/>',
    anal: (b) => finDown(b, 150, 210, 18, '#f0a0b0', 0.2),
    mouth: `${mouthLine(22, 101, 32, 104)}<path d="M 26 104 q 2 4 -1 7" stroke="${OUT}" stroke-width="1.4" fill="none" stroke-linecap="round"/>`,
  });

  art.shimadojou = () => eel({
    label: 'シマドジョウ', T: 12, dorsal: 170, anal: 190, finW: 4,
    grad: [[0, '#b8a678'], [0.5, '#e0d4ae'], [1, '#f4eedc']],
    finColor: '#cbbc8e', eyeR: 3.2, iris: '#c8b878',
    clip: (yc, th) => {
      let s = '';
      for (let x = 30; x < 296; x += 9) s += `<ellipse cx="${x}" cy="${f(yc(x))}" rx="3.6" ry="2.6" fill="#3d321c"/>`;
      for (let x = 36; x < 290; x += 6) s += `<circle cx="${x}" cy="${f(yc(x) - th(x) * 0.6)}" r="1.2" fill="#3d321c" opacity="0.8"/>`;
      return s;
    },
    mouth: (x0, yc) => [[2, 5, 8], [4, 9, 10], [6, 12, 8]]
      .map(([dx, ex, ey]) => `<path d="M ${x0 + dx} ${f(yc(x0) + 3)} q ${f(ex * 0.3)} ${f(ey * 0.6)} ${ex} ${ey}" fill="none" stroke="${OUT}" stroke-width="1.4" stroke-linecap="round"/>`).join(''),
  });

  art.amenamazu = () => spindle({
    label: 'アメリカナマズ',
    body: { nx: 18, mx: 100, px: 250, h: 36, hb: 32, ph: 9, k1: 0.05, k2: 0.75, ny: 4 },
    grad: [[0, '#4a5a6e'], [0.5, '#7a8a9a'], [1, '#e2e6ea']],
    back: (b) => `
      ${tail(b, 'fork', 46, 40, '#5a6a7a')}
      ${finUp(b, 96, 116, 26, '#5a6a7a', 0.3)}
      ${adiposeFin(b, 210, '#5a6a7a')}
      ${finDown(b, 170, 230, 16, '#8a98a6', 0.2)}`,
    clip: () => dots(401, 26, 60, 246, 70, 110, 1.6, 3, '#111', 0.9),
    front: (b) => `
      ${leafFin(70, 112, 24, 8, 20, '#5a6a7a')}
      <path d="M 16 106 Q 34 112 50 108" fill="#cfd4d8" stroke="${OUT}" stroke-width="2"/>
      ${['M 20 100 Q 30 76 60 66', 'M 24 104 Q 28 128 46 140', 'M 30 110 Q 34 130 54 136', 'M 36 110 Q 44 126 62 128'].map((d) => `<path d="${d}" fill="none" stroke="${OUT}" stroke-width="2" stroke-linecap="round"/>`).join('')}
      ${eye(42, 92, 4.5, '#c8c08a')}`,
  });

  art.raigyo = () => spindle({
    label: 'ライギョ',
    body: { nx: 16, mx: 110, px: 256, h: 30, hb: 30, ph: 10, k1: 0.12, k2: 0.6, ny: 2 },
    grad: [[0, '#4a4e36'], [0.5, '#7a7e5a'], [1, '#d8d6c0']],
    back: (b) => `
      ${tail(b, 'round', 40, 30, '#5a5e42')}
      ${finUp(b, 64, 248, 16, '#5a5e42', 0.1)}
      ${finDown(b, 120, 248, 14, '#6a6e50', 0.1)}`,
    clip: () => {
      let s = '';
      for (let x = 50; x < 250; x += 26) s += `<ellipse cx="${x}" cy="86" rx="11" ry="8" fill="#1d1e14" opacity="0.85"/><ellipse cx="${x + 13}" cy="110" rx="10" ry="7" fill="#1d1e14" opacity="0.75"/>`;
      return s;
    },
    front: (b) => `
      ${leafFin(64, 108, 22, 8, 20, '#6a6e50')}
      <path d="M 14 102 Q 30 112 52 106" fill="#e0dcc4" stroke="${OUT}" stroke-width="2"/>
      ${eye(34, 94, 5, '#d8c070')}`,
  });

  art.smallmouth = () => spindle({
    label: 'スモールマウスバス',
    body: { nx: 18, mx: 120, px: 248, h: 40, hb: 36, ph: 10, k1: 0.12, k2: 0.72, ny: 2 },
    grad: [[0, '#5e4a26'], [0.45, '#9a7a44'], [0.7, '#d8c49a'], [1, '#f0e6cc']],
    back: (b) => `
      ${tail(b, 'shallow', 44, 38, '#7a6236')}
      ${finUp(b, 90, 146, 24, '#7a6236', 0.3)}
      ${finUp(b, 148, 206, 22, '#8a7040', 0.3)}
      ${finDown(b, 172, 208, 16, '#b49a6a', 0.2, false)}`,
    clip: () => vbands([66, 92, 118, 144, 170, 196, 222], 9, '#3a2a10', 0.5, -2),
    front: (b) => `
      ${gill(72, 100, 38)}
      ${leafFin(80, 110, 24, 7, 15, '#b49a6a')}
      <path d="M 16 100 Q 28 110 42 104" fill="#efe2c4" stroke="${OUT}" stroke-width="2"/>
      ${eye(44, 90, 7.5, '#d8302a')}`,
  });

  art.yatsume = () => eel({
    label: 'ヤツメウナギ', T: 14, dorsal: 170, anal: 250, finW: 6, pectoral: false,
    grad: [[0, '#6a6450'], [0.5, '#958e74'], [1, '#ddd6c0']],
    finColor: '#857e66', eyeR: 4.5, iris: '#d8c070',
    front: (yc) => Array.from({ length: 7 }, (_, i) => { const x = 44 + i * 7; return `<circle cx="${x}" cy="${f(yc(x) + 1)}" r="2.6" fill="#1d1d1d" stroke="#f0e8d0" stroke-width="1"/>`; }).join(''),
    mouth: (x0, yc) => `<ellipse cx="${x0 + 1}" cy="${f(yc(x0) + 1)}" rx="4" ry="9" fill="#c87a6a" stroke="${OUT}" stroke-width="1.6"/>
      <ellipse cx="${x0 + 1}" cy="${f(yc(x0) + 1)}" rx="1.8" ry="5" fill="#5a2a20"/>`,
  });

  art.brown = () => spindle({
    label: 'ブラウントラウト',
    body: { nx: 20, mx: 122, px: 250, h: 38, hb: 36, ph: 10, k1: 0.18, k2: 0.68, ny: 2 },
    grad: [[0, '#5a4a26'], [0.4, '#9a8448'], [0.65, '#e4d4a4'], [1, '#f6eed6']],
    back: (b) => `
      ${tail(b, 'square', 44, 38, '#8a7440')}
      ${finUp(b, 120, 156, 24, '#8a7440', 0.25)}
      ${adiposeFin(b, 210, '#d8602a')}
      ${finDown(b, 184, 210, 16, '#c8a868', 0.2, false)}`,
    clip: () => dots(411, 40, 40, 240, 62, 100, 2, 3.2, '#1d1d1d', 0.9)
      + Array.from({ length: 12 }, (_, i) => `<circle cx="${60 + i * 16 + (i % 2) * 6}" cy="${100 + (i % 3) * 5}" r="3" fill="#e0402a" stroke="#f6f0e0" stroke-width="2"/>`).join(''),
    front: (b) => salmonFront(b, '#c8a868'),
  });

  art.sakuramasu = () => spindle({
    label: 'サクラマス',
    body: { nx: 20, mx: 125, px: 250, h: 42, hb: 38, ph: 10, k1: 0.2, k2: 0.65, ny: 2 },
    grad: [[0, '#3a5a6a'], [0.4, '#88a2b0'], [0.55, '#eef0f2'], [1, '#f9f6f6']],
    back: (b) => salmonBack(b, '#6a8494'),
    clip: () => dots(421, 22, 50, 220, 62, 80, 1, 1.8, '#1d1d1d', 0.8) + '<path d="M 50 100 Q 150 98 250 102" stroke="#f0b8c4" stroke-width="10" opacity="0.4"/>',
    front: (b) => salmonFront(b, '#b4c4ce'),
  });

  art.guppy = () => spindle({
    label: 'グッピー',
    body: { nx: 30, mx: 100, px: 180, h: 26, hb: 26, ph: 8, k1: 0.15, k2: 0.7, ny: 2 },
    grad: [[0, '#8a9a9a'], [0.5, '#c8d0d0'], [1, '#eef0f0']],
    back: (b) => `
      <path d="M 172 92 Q 250 20 310 50 Q 300 100 310 150 Q 250 180 172 108 Z" fill="#ff6a3a" stroke="${OUT}" stroke-width="1.8"/>
      ${dots(431, 30, 200, 300, 60, 140, 2.5, 5, '#2a4ad8', 0.8)}
      <path d="M 120 ${f(b.top(120) + 3)} Q 150 ${f(b.top(130) - 40)} 200 ${f(b.top(170) - 30)} Q 180 ${f(b.top(176) - 4)} 176 ${f(b.top(176) + 2)} Z" fill="#3ab0e0" stroke="${OUT}" stroke-width="1.6"/>
      ${finDown(b, 120, 144, 10, '#c8d0d0', 0.3, false)}`,
    clip: () => '<ellipse cx="120" cy="96" rx="14" ry="9" fill="#ff8a3a" opacity="0.9"/><ellipse cx="150" cy="104" rx="8" ry="6" fill="#1d1d1d" opacity="0.7"/><ellipse cx="96" cy="104" rx="7" ry="5" fill="#3ab0e0" opacity="0.8"/>',
    front: (b) => `
      <path d="M 29 98 Q 34 96 38 99" fill="none" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
      ${eye(48, 96, 7, '#e8e0b8')}`,
  });

  art.nishikigoi = () => spindle({
    label: 'ニシキゴイ',
    body: { nx: 22, mx: 125, px: 248, h: 42, hb: 38, ph: 12, k1: 0.12, k2: 0.75, ny: 4 },
    grad: [[0, '#fbfaf4'], [1, '#f2efe4']],
    back: (b) => `
      ${tail(b, 'fork', 46, 40, '#f4f0e6')}
      ${finUp(b, 108, 196, 22, '#f4f0e6', 0.1)}
      ${finDown(b, 192, 214, 18, '#f4f0e6', 0.2, false)}`,
    clip: (b) => '<path d="M 40 60 Q 80 40 110 70 Q 100 96 70 90 Q 40 92 40 60 Z" fill="#e8301e"/><path d="M 140 56 Q 190 50 210 80 Q 190 100 150 90 Q 130 74 140 56 Z" fill="#e8301e"/>' + scales(b, 66, 250, 13, '#b8b0a0', 0.45),
    front: (b) => `
      ${gill(64, 102, 40)}
      ${leafFin(70, 120, 24, 8, 30, '#f4f0e6')}
      ${leafFin(130, 136, 20, 7, 30, '#f4f0e6')}
      <path d="M 22 104 Q 26 110 32 108" fill="none" stroke="${OUT}" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M 26 105 Q 24 114 30 120" fill="none" stroke="${OUT}" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M 32 108 Q 34 120 44 126" fill="none" stroke="${OUT}" stroke-width="2.6" stroke-linecap="round"/>
      ${eye(42, 92, 6.5, '#d8b44a')}`,
  });

  // ======================================================
  //  イカ・エビ・カニ・貝
  // ======================================================
  art.zarigani = () => custom('ザリガニ', () => {
    let segs = '';
    for (let i = 0; i < 6; i++) segs += `<rect x="${150 + i * 18}" y="${86 + i * 0.5}" width="20" height="${30 - i * 1.5}" rx="5" fill="#d8301e" stroke="${OUT}" stroke-width="1.8"/>`;
    return {
      inner: `
        <path d="M 252 86 L 300 72 L 304 100 L 300 126 L 252 114 Z" fill="#c8281a" stroke="${OUT}" stroke-width="1.8"/>
        ${[90, 110, 130].map((x) => `<path d="M ${x} 118 l -6 22 l -6 8" stroke="#a8201a" stroke-width="3" fill="none" stroke-linecap="round"/>`).join('')}
        ${segs}
        <path d="M 70 84 Q 110 72 154 84 L 154 118 Q 110 126 70 116 Z" fill="#e0402a" stroke="${OUT}" stroke-width="2"/>
        ${dots(441, 16, 80, 150, 84, 114, 1, 2, '#8a1a10', 0.6)}
        <path d="M 74 92 Q 50 70 40 60 M 74 94 Q 40 80 10 86" stroke="#a8201a" stroke-width="2" fill="none"/>
        <path d="M 80 112 Q 60 140 40 140" stroke="#c8281a" stroke-width="7" fill="none" stroke-linecap="round"/>
        <path d="M 46 128 Q 6 120 4 140 Q 8 160 46 152 L 30 142 Z" fill="#e0402a" stroke="${OUT}" stroke-width="2" stroke-linejoin="round"/>
        <path d="M 46 128 L 20 136" stroke="${OUT}" stroke-width="1.5"/>
        <circle cx="76" cy="86" r="4" fill="#111"/>`,
    };
  });

  // カニ（上から見た姿）
  function crab(label, o) {
    return custom(label, (id) => {
      let legs = '';
      o.legs.forEach(([ang, len]) => {
        for (const side of [-1, 1]) {
          const a = (ang * Math.PI) / 180;
          const x1 = 160 + side * 40, y1 = 100 + Math.sin(a) * 18;
          const kx = 160 + side * (40 + Math.cos(a) * len * 0.55), ky = y1 - Math.sin(a + 0.4) * len * 0.35 - 10;
          const x2 = 160 + side * (40 + Math.cos(a) * len), y2 = y1 + Math.sin(a) * len * 0.5 + 20;
          legs += `<path d="M ${f(x1)} ${f(y1)} L ${f(kx)} ${f(ky)} L ${f(x2)} ${f(y2)}" fill="none" stroke="${OUT}" stroke-width="${o.legW + 3}" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M ${f(x1)} ${f(y1)} L ${f(kx)} ${f(ky)} L ${f(x2)} ${f(y2)}" fill="none" stroke="${o.legC}" stroke-width="${o.legW}" stroke-linecap="round" stroke-linejoin="round"/>`;
          if (o.spiky) for (let t = 0.2; t < 1; t += 0.2) legs += `<circle cx="${f(x1 + (kx - x1) * t)}" cy="${f(y1 + (ky - y1) * t - o.legW / 2)}" r="1.8" fill="${OUT}"/>`;
        }
      });
      const claws = [-1, 1].map((side) => `<path d="M ${160 + side * 30} 74 Q ${160 + side * 56} 40 ${160 + side * 50} 26" fill="none" stroke="${o.legC}" stroke-width="${o.legW + 2}" stroke-linecap="round"/>
        <ellipse cx="${160 + side * 50}" cy="22" rx="10" ry="14" fill="${o.legC}" stroke="${OUT}" stroke-width="1.8" transform="rotate(${side * 20} ${160 + side * 50} 22)"/>`).join('');
      return {
        defs: `<radialGradient id="${id}g" cx="0.5" cy="0.4" r="0.6"><stop offset="0" stop-color="${o.c1}"/><stop offset="1" stop-color="${o.c2}"/></radialGradient>`,
        inner: `<g transform="translate(160 104) scale(0.8) translate(-160 -100)">${legs}${claws}
          <path d="${o.shell}" fill="url(#${id}g)" stroke="${OUT}" stroke-width="2.2" stroke-linejoin="round"/>
          ${o.extra || ''}
          <circle cx="150" cy="64" r="3.5" fill="#111"/><circle cx="170" cy="64" r="3.5" fill="#111"/></g>`,
      };
    });
  }
  art.zuwai = () => crab('ズワイガニ', {
    legs: [[-10, 120], [10, 130], [30, 124], [50, 108]], legW: 7, legC: '#e88a4a',
    c1: '#f2a060', c2: '#d0642a',
    shell: 'M 120 70 Q 160 54 200 70 Q 210 110 160 136 Q 110 110 120 70 Z',
  });
  art.taraba = () => crab('タラバガニ', {
    legs: [[0, 110], [25, 112], [50, 100]], legW: 11, legC: '#c8402a', spiky: true,
    c1: '#e0603a', c2: '#a82a1a',
    shell: 'M 122 66 L 160 52 L 198 66 L 204 104 L 160 140 L 116 104 Z',
    extra: dots(451, 26, 124, 196, 62, 128, 1.6, 2.8, '#5a1208', 0.9),
  });

  function bivalve(label, o) {
    return custom(label, (id) => ({
      defs: `<linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${o.c1}"/><stop offset="1" stop-color="${o.c2}"/></linearGradient><clipPath id="${id}c"><path d="${o.d}"/></clipPath>`,
      inner: `<path d="${o.d}" fill="url(#${id}g)" stroke="${OUT}" stroke-width="2.4"/>
        <g clip-path="url(#${id}c)">${o.inner}</g>
        <path d="M ${o.hx - 10} ${o.hy + 2} Q ${o.hx} ${o.hy - 6} ${o.hx + 10} ${o.hy + 2}" fill="none" stroke="${OUT}" stroke-width="2"/>`,
    }));
  }
  const radial = (cx, cy, n, len, a0, a1, color, w, op) => Array.from({ length: n }, (_, i) => {
    const a = (Math.PI * (a0 + ((a1 - a0) * i) / (n - 1))) / 180;
    return `<line x1="${cx}" y1="${cy}" x2="${f(cx + Math.cos(a) * len)}" y2="${f(cy + Math.sin(a) * len)}" stroke="${color}" stroke-width="${w}" opacity="${op}"/>`;
  }).join('');
  const rings = (cx, cy, rs, color, w, op, ry = 0.75) => rs.map((r) => `<ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${f(r * ry)}" fill="none" stroke="${color}" stroke-width="${w}" opacity="${op}"/>`).join('');

  art.akagai = () => bivalve('アカガイ', {
    d: 'M 150 30 Q 250 30 278 110 Q 270 168 160 172 Q 50 168 42 110 Q 60 36 150 30 Z',
    c1: '#a87a52', c2: '#5a3a22', hx: 150, hy: 30,
    inner: radial(150, 30, 34, 170, 15, 165, '#2e1c10', 3.4, 0.7) + rings(150, 30, [60, 100, 140], '#d8b88a', 1.4, 0.4),
  });
  art.torigai = () => bivalve('トリガイ', {
    d: 'M 160 34 Q 250 40 270 112 Q 262 166 160 168 Q 58 166 50 112 Q 70 40 160 34 Z',
    c1: '#f2e6c4', c2: '#c8b484', hx: 160, hy: 34,
    inner: radial(160, 34, 46, 160, 15, 165, '#a8945a', 1, 0.5) + rings(160, 34, [50, 80, 110], '#8a7440', 1.4, 0.35),
  });
  art.shijimi = () => bivalve('シジミ', {
    d: 'M 160 50 Q 220 54 242 112 Q 236 150 160 152 Q 84 150 78 112 Q 100 54 160 50 Z',
    c1: '#4a4a30', c2: '#14140c', hx: 160, hy: 50,
    inner: rings(160, 40, [30, 46, 62, 78, 94, 108], '#8a8a5a', 1.6, 0.6, 0.8) + '<ellipse cx="136" cy="86" rx="22" ry="8" fill="#fff" opacity="0.3" transform="rotate(-20 136 86)"/>',
  });
  art.muuru = () => bivalve('ムール貝', {
    d: 'M 40 120 Q 30 96 60 84 Q 160 44 270 70 Q 290 96 260 130 Q 160 160 60 136 Q 44 132 40 120 Z',
    c1: '#3a4a6a', c2: '#0e1220', hx: 44, hy: 114,
    inner: rings(40, 116, [40, 80, 120, 160, 200, 240], '#6a7aa0', 1.4, 0.5, 0.35) + '<path d="M 80 96 Q 160 70 250 80" stroke="#fff" stroke-width="6" opacity="0.25" fill="none"/>',
  });
  art.tsubu = () => custom('ツブ貝', (id) => ({
    defs: gradient(`${id}g`, [[0, '#d8c49a'], [1, '#8a6a42']]),
    inner: `
      <path d="M 160 12 Q 196 60 222 110 Q 236 160 190 176 Q 140 186 106 166 Q 84 130 130 70 Z" fill="url(#${id}g)" stroke="${OUT}" stroke-width="2.4" stroke-linejoin="round"/>
      ${[[150, 40, 170, 50], [136, 70, 196, 82], [118, 106, 220, 120]].map(([x1, y1, x2, y2]) => `<path d="M ${x1} ${y1} Q ${(x1 + x2) / 2} ${y2 + 14} ${x2} ${y2}" fill="none" stroke="${OUT}" stroke-width="2"/>`).join('')}
      <path d="M 126 140 Q 140 120 170 128 Q 190 150 170 170 Q 140 176 126 140 Z" fill="#f2e2c0" stroke="${OUT}" stroke-width="2"/>
      <ellipse cx="152" cy="150" rx="12" ry="14" fill="#6a4a2a"/>`,
  }));

  art.kouika = () => custom('コウイカ', (id) => ({
    defs: gradient(`${id}g`, [[0, '#a87a52'], [1, '#e2c4a0']]),
    inner: `
      ${[-12, -6, 0, 6, 12].map((dy) => `<path d="M 80 ${100 + dy} Q 50 ${100 + dy * 1.6} 26 ${100 + dy * 2.4}" stroke="#d8a882" stroke-width="7" stroke-linecap="round" fill="none"/>`).join('')}
      <path d="M 96 100 m -4 -52 Q 200 34 286 100 Q 200 166 92 152 Q 82 100 92 48 Z" fill="#e8d0b0" stroke="${OUT}" stroke-width="1.8"/>
      <path d="M 100 56 Q 200 46 274 100 Q 200 154 100 144 Q 92 100 100 56 Z" fill="url(#${id}g)" stroke="${OUT}" stroke-width="2"/>
      ${[120, 140, 160, 180, 200, 220, 240].map((x) => `<path d="M ${x} 62 q 6 38 0 76" stroke="#5a3a1e" stroke-width="3.4" fill="none" opacity="0.7"/>`).join('')}
      <path d="M 70 84 Q 96 76 104 100 Q 96 124 70 116 Z" fill="#e2c4a0" stroke="${OUT}" stroke-width="2"/>
      ${eye(84, 88, 5, '#3a3a3a')}${eye(84, 112, 5, '#3a3a3a')}`,
  }));

  art.iseebi = () => custom('イセエビ', (id) => ({
    defs: gradient(`${id}g`, [[0, '#a8301e'], [1, '#d8603a']]),
    inner: `
      <path d="M 70 86 Q 40 30 4 10" stroke="#a8301e" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M 70 92 Q 30 60 6 70" stroke="#a8301e" stroke-width="6" fill="none" stroke-linecap="round"/>
      ${Array.from({ length: 6 }, (_, i) => `<circle cx="${60 - i * 9}" cy="${78 - i * 11}" r="2" fill="#f2c040"/>`).join('')}
      ${[100, 120, 140, 160].map((x) => `<path d="M ${x} 118 l -4 24 l -8 6" stroke="#c8402a" stroke-width="3.4" fill="none" stroke-linecap="round"/>`).join('')}
      ${Array.from({ length: 5 }, (_, i) => `<rect x="${168 + i * 20}" y="${84 + i}" width="22" height="${32 - i * 2}" rx="5" fill="#c8402a" stroke="${OUT}" stroke-width="1.8"/><circle cx="${179 + i * 20}" cy="${100 + i}" r="2.4" fill="#f2d070"/>`).join('')}
      <path d="M 266 88 L 304 74 L 306 100 L 304 126 L 266 112 Z" fill="#c8402a" stroke="${OUT}" stroke-width="1.8"/>
      <path d="M 66 80 Q 110 66 170 80 L 170 120 Q 110 128 66 116 Z" fill="url(#${id}g)" stroke="${OUT}" stroke-width="2"/>
      ${Array.from({ length: 16 }, (_, i) => `<path d="M ${74 + (i % 8) * 12} ${(i < 8 ? 82 : 96)} l 3 -7 l 3 7" fill="#7a1a0e" stroke="${OUT}" stroke-width="0.8"/>`).join('')}
      <circle cx="74" cy="86" r="4" fill="#111"/>`,
  }));
  art.lobster = () => custom('ロブスター', (id) => ({
    defs: gradient(`${id}g`, [[0, '#1e3a5a'], [1, '#3a6a7a']]),
    inner: `
      <path d="M 74 88 Q 40 40 20 30 M 74 90 Q 40 70 14 74" stroke="#2a4a6a" stroke-width="2.4" fill="none"/>
      <path d="M 86 112 Q 66 140 60 150" stroke="#2a4a6a" stroke-width="9" fill="none" stroke-linecap="round"/>
      <path d="M 60 136 Q 10 130 6 160 Q 14 186 64 168 Q 40 158 36 152 Q 50 150 60 152 Z" fill="#2a5a72" stroke="${OUT}" stroke-width="2"/>
      <path d="M 86 80 Q 70 50 62 40" stroke="#2a4a6a" stroke-width="9" fill="none" stroke-linecap="round"/>
      <path d="M 64 52 Q 14 46 10 22 Q 26 6 70 28 Q 46 30 40 34 Q 50 40 64 38 Z" fill="#2a5a72" stroke="${OUT}" stroke-width="2"/>
      ${[110, 130, 150].map((x) => `<path d="M ${x} 118 l -4 22 l -8 6" stroke="#2a4a6a" stroke-width="3.4" fill="none" stroke-linecap="round"/>`).join('')}
      ${Array.from({ length: 5 }, (_, i) => `<rect x="${170 + i * 20}" y="${84 + i}" width="22" height="${32 - i * 2}" rx="5" fill="#2a5a72" stroke="${OUT}" stroke-width="1.8"/>`).join('')}
      <path d="M 268 88 L 306 74 L 308 100 L 306 126 L 268 112 Z" fill="#2a5a72" stroke="${OUT}" stroke-width="1.8"/>
      <path d="M 70 84 Q 110 70 172 82 L 172 118 Q 110 128 70 114 Z" fill="url(#${id}g)" stroke="${OUT}" stroke-width="2"/>
      ${dots(461, 20, 80, 290, 84, 116, 1, 2, '#f2c040', 0.5)}
      <circle cx="78" cy="88" r="4" fill="#111"/>`,
  }));

  function urchin(label, o) {
    return custom(label, (id) => {
      const r = rng(o.seed);
      let spines = '';
      for (let i = 0; i < o.n; i++) {
        const a = r() * Math.PI * 2, base = o.R * 0.9, len = o.len * (0.7 + r() * 0.5);
        spines += `<line x1="${f(160 + Math.cos(a) * base)}" y1="${f(110 + Math.sin(a) * base * 0.75)}" x2="${f(160 + Math.cos(a) * (base + len))}" y2="${f(110 + Math.sin(a) * (base + len) * 0.75)}" stroke="${o.spineC}" stroke-width="${o.spineW}" stroke-linecap="round"/>`;
      }
      return {
        defs: `<radialGradient id="${id}g" cx="0.45" cy="0.35" r="0.7"><stop offset="0" stop-color="${o.c1}"/><stop offset="1" stop-color="${o.c2}"/></radialGradient>`,
        inner: `${spines}<ellipse cx="160" cy="110" rx="${o.R}" ry="${f(o.R * 0.75)}" fill="url(#${id}g)" stroke="${OUT}" stroke-width="2.2"/>${o.extra || ''}`,
      };
    });
  }
  art.uni = () => urchin('ムラサキウニ', { seed: 471, n: 160, R: 60, len: 26, spineW: 3, spineC: '#3a1e4a', c1: '#6a3a7a', c2: '#2a1030' });
  art.gangaze = () => urchin('ガンガゼ', {
    seed: 481, n: 60, R: 36, len: 110, spineW: 2, spineC: '#14141a', c1: '#3a3a44', c2: '#0e0e14',
    extra: '<circle cx="160" cy="98" r="9" fill="#f08a2a" stroke="#111" stroke-width="2"/><circle cx="160" cy="98" r="3.5" fill="#111"/>',
  });

  return {
    render(key) {
      if (!art[key]) throw new Error(`unknown fish: ${key}`);
      return art[key]();
    },
    keys: () => Object.keys(art),
  };
})();

if (typeof module !== 'undefined') module.exports = FishArt;
