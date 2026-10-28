/*
 * 魚仕分け ゲーム本体
 * 寿司屋の大将の注文にこたえて、正しい魚を選ぶ。
 */
(() => {
  const QUESTIONS = 10;
  const BEST_KEY = 'shiwake.best';

  const $ = (id) => document.getElementById(id);
  const state = { list: [], index: 0, score: 0, combo: 0, answered: false, misses: [] };
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // ---------- 大将のセリフ（{n} に魚の名前が入る） ----------
  const ORDERS = [
    'へいっ！{n}を一丁たのむ！',
    'おう、{n}を持ってきてくんな！',
    'お客さんから{n}の注文だ！どっちだ？',
    '次は{n}だ。目利きの見せどころだぞ！',
    '{n}、急ぎで頼むよ！',
    'いい{n}が入ってる。取ってきてくれ！',
  ];
  const PRAISES = ['いい目してるねぇ！', 'お見事！それが{n}だ！', 'よっ、目利き！', 'さすがだ、わかってるねぇ！', 'そうそう、それだよ！'];
  const COMBO_PRAISES = ['{c}連続！こいつぁ大したもんだ！', '{c}連続正解！板前の素質ありだな！'];
  const SCOLDS = ['おいおい、そいつは{w}だ！', 'ちがうちがう、それは{w}だよ！', 'あちゃー、それは{w}だ。よく見な！'];

  const fill = (tpl, vars) => tpl.replace(/\{(\w)\}/g, (_, k) => vars[k]);

  // ---------- 大将のイラスト ----------
  function chefSvg(mood = 'normal') {
    const mouth = {
      normal: '<path d="M 50 74 Q 60 84 70 74 Z" fill="#c4473a" stroke="#233050" stroke-width="2.5" stroke-linejoin="round"/>',
      happy: '<path d="M 46 71 Q 60 92 74 71 Z" fill="#c4473a" stroke="#233050" stroke-width="2.5" stroke-linejoin="round"/><path d="M 52 80 Q 60 86 68 80" fill="#ff8a8a"/>',
      sad: '<path d="M 50 80 Q 55 74 60 78 Q 65 82 70 76" fill="none" stroke="#233050" stroke-width="3" stroke-linecap="round"/>',
    }[mood];
    const eyes = mood === 'happy'
      ? '<path d="M 42 58 Q 47 52 52 58 M 68 58 Q 73 52 78 58" fill="none" stroke="#233050" stroke-width="3.5" stroke-linecap="round"/>'
      : '<circle cx="47" cy="58" r="4" fill="#233050"/><circle cx="73" cy="58" r="4" fill="#233050"/><circle cx="48" cy="57" r="1.3" fill="#fff"/><circle cx="74" cy="57" r="1.3" fill="#fff"/>';
    const brows = mood === 'sad'
      ? '<path d="M 39 47 L 53 51 M 81 47 L 67 51" stroke="#233050" stroke-width="5" stroke-linecap="round"/>'
      : '<path d="M 39 50 L 53 46 M 81 50 L 67 46" stroke="#233050" stroke-width="5" stroke-linecap="round"/>';
    const sweat = mood === 'sad' ? '<path d="M 88 52 Q 84 60 88 63 Q 92 60 88 52 Z" fill="#7fd3ff" stroke="#233050" stroke-width="1.5"/>' : '';
    return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="寿司屋の大将">
      <path d="M 10 124 Q 14 94 60 92 Q 106 94 110 124 Z" fill="#fff" stroke="#233050" stroke-width="3"/>
      <path d="M 46 93 L 60 112 L 74 93" fill="#2f6fd6" stroke="#233050" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="28" cy="62" r="7" fill="#ffd3a6" stroke="#233050" stroke-width="2.5"/>
      <circle cx="92" cy="62" r="7" fill="#ffd3a6" stroke="#233050" stroke-width="2.5"/>
      <ellipse cx="60" cy="62" rx="32" ry="31" fill="#ffd3a6" stroke="#233050" stroke-width="3"/>
      <circle cx="40" cy="70" r="5" fill="#ff9aa2" opacity=".8"/><circle cx="80" cy="70" r="5" fill="#ff9aa2" opacity=".8"/>
      <path d="M 27 44 Q 28 12 60 12 Q 92 12 93 44 Z" fill="#fff" stroke="#233050" stroke-width="3" stroke-linejoin="round"/>
      <rect x="26" y="34" width="68" height="11" rx="4" fill="#ff5c8a" stroke="#233050" stroke-width="3"/>
      <path d="M 34 38 L 40 42 M 46 38 L 52 42 M 58 38 L 64 42 M 70 38 L 76 42 M 82 38 L 88 42" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/>
      ${brows}${eyes}
      <path d="M 44 70 Q 52 66 60 70 Q 68 66 76 70 Q 68 74 60 71 Q 52 74 44 70 Z" fill="#233050"/>
      ${mouth}${sweat}
    </svg>`;
  }

  function setChef(id, mood) {
    const el = $(id);
    el.innerHTML = chefSvg(mood);
    el.classList.remove('talk');
    void el.offsetWidth; // アニメーションをやり直す
    el.classList.add('talk');
  }

  // ---------- 画面切り替え ----------
  function show(name) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === `screen-${name}`));
    window.scrollTo(0, 0);
  }

  function loadBest() {
    try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
  }
  function saveBest(v) {
    try { localStorage.setItem(BEST_KEY, String(v)); } catch { /* 保存できなくても遊べる */ }
  }

  // ---------- 紙吹雪 ----------
  const COLORS = ['#ff5c8a', '#ffd23f', '#3ec6e0', '#3ddc84', '#ff9f43', '#9b6dff'];
  function confetti(target, count = 24) {
    const rect = target ? target.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 3, width: 0, height: 0 };
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const box = $('confetti');
    for (let i = 0; i < count; i++) {
      const p = document.createElement('i');
      const a = Math.random() * Math.PI * 2, d = 80 + Math.random() * 180;
      p.style.left = `${cx}px`;
      p.style.top = `${cy}px`;
      p.style.background = pick(COLORS);
      p.style.setProperty('--dx', `${Math.cos(a) * d}px`);
      p.style.setProperty('--dy', `${Math.sin(a) * d + 120}px`);
      p.style.setProperty('--r', `${Math.random() * 720 - 360}deg`);
      box.appendChild(p);
      setTimeout(() => p.remove(), 1100);
    }
  }

  // ---------- タイトル ----------
  function renderTitle() {
    const pair = pick(FISH_PAIRS);
    $('title-fish').innerHTML = `<div>${FishArt.render(pair.a.art)}</div><span class="vs">VS</span><div>${FishArt.render(pair.b.art)}</div>`;
    $('title-chef').innerHTML = chefSvg('happy');
    const best = loadBest();
    $('best-score').textContent = best ? `🏆 ベストスコア：${best} / ${QUESTIONS}` : '';
    show('title');
  }

  // ---------- クイズ ----------
  function start() {
    Sound.play('start');
    Sound.startBgm();
    const pairs = shuffle(FISH_PAIRS).slice(0, Math.min(QUESTIONS, FISH_PAIRS.length));
    state.list = pairs.map((pair) => ({ pair, options: shuffle([pair.a, pair.b]), answer: Math.random() < 0.5 ? 0 : 1 }));
    state.index = 0;
    state.score = 0;
    state.combo = 0;
    state.misses = [];
    show('quiz');
    renderQuestion();
  }

  function updateStatus() {
    $('q-count').textContent = `${state.index + 1} / ${state.list.length}`;
    $('q-score').textContent = `正解 ${state.score}`;
    const combo = $('q-combo');
    combo.hidden = state.combo < 2;
    combo.textContent = `🔥 ${state.combo}連続`;
  }

  function renderQuestion() {
    const q = state.list[state.index];
    const target = q.options[q.answer];
    state.answered = false;
    updateStatus();
    $('progress-bar').style.width = `${(state.index / state.list.length) * 100}%`;

    const order = pick(ORDERS);
    $('question').innerHTML = fill(order, { n: `<span class="target">${target.name}</span>` });
    setChef('quiz-chef', 'normal');
    Sound.say(fill(order, { n: target.name }));

    const box = $('choices');
    box.innerHTML = '';
    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'card';
      btn.type = 'button';
      btn.setAttribute('aria-label', `${i === 0 ? '左' : '右'}の魚`);
      btn.innerHTML = `<div class="art">${FishArt.render(opt.art)}</div><div class="name">${opt.name}</div><div class="mark"></div>`;
      btn.addEventListener('click', () => answer(i));
      box.appendChild(btn);
    });
    $('feedback').hidden = true;
  }

  function answer(i) {
    if (state.answered) return;
    state.answered = true;
    const q = state.list[state.index];
    const ok = i === q.answer;
    const cards = [...$('choices').children];

    cards.forEach((c, idx) => {
      c.classList.add('revealed');
      c.disabled = true;
      if (idx === q.answer) c.classList.add('correct');
      else if (idx === i) c.classList.add('wrong');
    });

    let line;
    if (ok) {
      state.score++;
      state.combo++;
      Sound.play('correct', state.combo);
      confetti(cards[i], state.combo >= 3 ? 40 : 24);
      line = fill(state.combo >= 3 ? pick(COMBO_PRAISES) : pick(PRAISES), { n: q.options[q.answer].name, c: state.combo });
    } else {
      state.combo = 0;
      state.misses.push(q.pair);
      Sound.play('wrong');
      line = fill(pick(SCOLDS), { w: q.options[i].name });
    }
    updateStatus();
    $('progress-bar').style.width = `${((state.index + 1) / state.list.length) * 100}%`;
    setChef('quiz-chef', ok ? 'happy' : 'sad');
    $('question').textContent = line;
    Sound.say(line);

    const verdict = $('verdict');
    verdict.textContent = ok ? 'せいかい！' : 'ざんねん…';
    verdict.className = `verdict ${ok ? 'ok' : 'ng'}`;
    $('point').innerHTML = `<span class="label">見分けポイント</span>${q.pair.point}`;
    $('btn-next').textContent = state.index + 1 < state.list.length ? '次の注文へ ▶' : '結果を見る ▶';
    $('feedback').hidden = false;
    $('btn-next').focus({ preventScroll: true });
    $('feedback').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function next() {
    Sound.play('next');
    state.index++;
    if (state.index < state.list.length) renderQuestion();
    else finish();
  }

  // ---------- 結果 ----------
  const RANKS = [
    { min: 10, title: '👑 大将も認める目利き', msg: '全問正解！明日から板場に立ってくれ！', mood: 'happy' },
    { min: 8, title: '🍣 一人前の板前', msg: 'いい腕だ！あと少しで店を任せられるな。', mood: 'happy' },
    { min: 5, title: '🔪 見習い板前', msg: 'まずまずだ。見分け図鑑で修行しな！', mood: 'normal' },
    { min: 0, title: '🫧 皿洗いから修行', msg: 'まだまだだな…図鑑でみっちり修行だ！', mood: 'sad' },
  ];

  function finish() {
    const total = state.list.length;
    const score = state.score;
    const rank = RANKS.find((r) => score >= Math.round((r.min / 10) * total));
    $('r-score').textContent = score;
    $('r-total').textContent = total;
    $('r-rank').textContent = rank.title;
    $('r-msg').textContent = rank.msg;
    if (score > loadBest()) saveBest(score);

    $('review').innerHTML = state.misses.length
      ? `<h3>まちがえた魚をおさらい</h3>${state.misses.map(pairCard).join('')}`
      : '';
    show('result');
    setChef('result-chef', rank.mood);

    const good = score >= Math.round(total / 2);
    Sound.duck(2.2);
    Sound.play('fanfare', good);
    setTimeout(() => Sound.say(rank.msg), 1600);
    if (good) {
      confetti(null, score === total ? 80 : 40);
      if (score === total) setTimeout(() => confetti(null, 80), 500);
    }
  }

  function pairCard(pair) {
    return `<article class="pair">
      <div class="pair-fish">
        <figure>${FishArt.render(pair.a.art)}<figcaption>${pair.a.name}</figcaption></figure>
        <figure>${FishArt.render(pair.b.art)}<figcaption>${pair.b.name}</figcaption></figure>
      </div>
      <p class="point">${pair.point}</p>
    </article>`;
  }

  // ---------- 図鑑 ----------
  function renderZukan() {
    Sound.play('tap');
    $('zukan').innerHTML = FISH_PAIRS.map(pairCard).join('');
    $('zukan-count').textContent = `全${FISH_PAIRS.length}組`;
    show('zukan');
  }

  // ---------- 音の切り替え ----------
  function bindToggle(id, getter, setter) {
    const el = $(id);
    const sync = () => el.setAttribute('aria-pressed', String(getter()));
    sync();
    el.addEventListener('click', () => {
      setter(!getter());
      sync();
      Sound.play('tap');
    });
  }
  bindToggle('tg-bgm', () => Sound.bgm, (v) => Sound.setBgm(v));
  bindToggle('tg-se', () => Sound.se, (v) => Sound.setSe(v));
  bindToggle('tg-voice', () => Sound.voice, (v) => Sound.setVoice(v));

  // ---------- イベント ----------
  $('btn-start').addEventListener('click', start);
  $('btn-retry').addEventListener('click', start);
  $('btn-next').addEventListener('click', next);
  $('btn-home').addEventListener('click', () => { Sound.play('tap'); renderTitle(); });
  $('btn-zukan').addEventListener('click', renderZukan);
  $('btn-zukan-back').addEventListener('click', () => { Sound.play('tap'); renderTitle(); });
  document.addEventListener('keydown', (e) => {
    if (!$('screen-quiz').classList.contains('active')) return;
    if (!state.answered && (e.key === 'ArrowLeft' || e.key === '1')) answer(0);
    else if (!state.answered && (e.key === 'ArrowRight' || e.key === '2')) answer(1);
  });

  renderTitle();
})();
