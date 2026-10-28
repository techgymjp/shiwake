/*
 * 魚仕分け ゲーム本体
 */
(() => {
  const QUESTIONS = 10;
  const BEST_KEY = 'shiwake.best';

  const $ = (id) => document.getElementById(id);
  const state = { list: [], index: 0, score: 0, combo: 0, answered: false, misses: [] };

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

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

  // ---------- タイトル ----------
  function renderTitle() {
    const pair = FISH_PAIRS[Math.floor(Math.random() * FISH_PAIRS.length)];
    $('title-fish').innerHTML = `<div>${FishArt.render(pair.a.art)}</div><span class="vs">VS</span><div>${FishArt.render(pair.b.art)}</div>`;
    const best = loadBest();
    $('best-score').textContent = best ? `ベストスコア：${best} / ${QUESTIONS}` : '';
    show('title');
  }

  // ---------- クイズ ----------
  function start() {
    const pairs = shuffle(FISH_PAIRS).slice(0, Math.min(QUESTIONS, FISH_PAIRS.length));
    state.list = pairs.map((pair) => {
      const options = shuffle([pair.a, pair.b]);
      const answer = Math.random() < 0.5 ? 0 : 1;
      return { pair, options, answer };
    });
    state.index = 0;
    state.score = 0;
    state.combo = 0;
    state.misses = [];
    show('quiz');
    renderQuestion();
  }

  function renderQuestion() {
    const q = state.list[state.index];
    const target = q.options[q.answer];
    state.answered = false;

    $('q-count').textContent = `${state.index + 1} / ${state.list.length}`;
    $('q-score').textContent = `正解 ${state.score}`;
    $('q-combo').textContent = state.combo >= 2 ? `${state.combo}連続！` : '';
    $('progress-bar').style.width = `${(state.index / state.list.length) * 100}%`;
    $('question').innerHTML = `<span class="target">${target.name}</span>はどっち？`;

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
    const cards = $('choices').children;

    [...cards].forEach((c, idx) => {
      c.classList.add('revealed');
      c.disabled = true;
      if (idx === q.answer) c.classList.add('correct');
      else if (idx === i) c.classList.add('wrong');
    });

    if (ok) {
      state.score++;
      state.combo++;
    } else {
      state.combo = 0;
      state.misses.push(q.pair);
    }
    $('q-score').textContent = `正解 ${state.score}`;
    $('q-combo').textContent = state.combo >= 2 ? `${state.combo}連続！` : '';
    $('progress-bar').style.width = `${((state.index + 1) / state.list.length) * 100}%`;

    const verdict = $('verdict');
    verdict.textContent = ok ? '正解！' : `ざんねん… 正解は${q.options[q.answer].name}`;
    verdict.className = `verdict ${ok ? 'ok' : 'ng'}`;
    $('point').innerHTML = `<span class="label">見分けポイント</span>${q.pair.point}`;
    $('btn-next').textContent = state.index + 1 < state.list.length ? '次へ' : '結果を見る';
    $('feedback').hidden = false;
    $('btn-next').focus({ preventScroll: true });
    $('feedback').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function next() {
    state.index++;
    if (state.index < state.list.length) renderQuestion();
    else finish();
  }

  // ---------- 結果 ----------
  const RANKS = [
    { min: 10, title: '🐟👑 魚仕分けマスター', msg: '全問正解！市場の目利きも顔負けです。' },
    { min: 8, title: '🎣 目利き職人', msg: 'あと一歩で満点！かなりの魚通です。' },
    { min: 5, title: '🔪 魚屋の見習い', msg: '基本はバッチリ。図鑑で見分けポイントを確認しよう。' },
    { min: 0, title: '🐣 修行中', msg: 'まずは図鑑で特徴をチェック！' },
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
    $('zukan').innerHTML = FISH_PAIRS.map(pairCard).join('');
    show('zukan');
  }

  // ---------- イベント ----------
  $('btn-start').addEventListener('click', start);
  $('btn-retry').addEventListener('click', start);
  $('btn-next').addEventListener('click', next);
  $('btn-home').addEventListener('click', renderTitle);
  $('btn-zukan').addEventListener('click', renderZukan);
  $('btn-zukan-back').addEventListener('click', renderTitle);
  document.addEventListener('keydown', (e) => {
    if (!$('screen-quiz').classList.contains('active')) return;
    if (!state.answered && (e.key === 'ArrowLeft' || e.key === '1')) answer(0);
    else if (!state.answered && (e.key === 'ArrowRight' || e.key === '2')) answer(1);
  });

  renderTitle();
})();
