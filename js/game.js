/*
 * 魚仕分け ゲーム本体
 * 寿司屋の大将の注文にこたえて、正しい魚を選ぶ。
 */
(() => {
  const QUESTIONS = 10;
  const BEST_KEY = 'shiwake.best';
  const GENRE_KEY = 'shiwake.genre';
  // 10問のうち、やさしい・ふつう・むずかしいを出す割合
  const LEVEL_MIX = { 1: 0.3, 2: 0.4, 3: 0.3 };

  const $ = (id) => document.getElementById(id);
  // Android / iOS アプリ(Capacitor)で動いているか。Web 版では Capacitor がないので何もしない
  const NATIVE = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  const plugin = (name) => (NATIVE && window.Capacitor.Plugins ? window.Capacitor.Plugins[name] : null);
  const state = { list: [], index: 0, score: 0, combo: 0, answered: false, misses: [], marks: [], time: 0, paused: false, redoUsed: 0, qTime: 0, prevCombo: 0, shownAt: 0, lastRecord: null, rankingGenre: 'all', genre: loadGenre() };
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // 文言・大将のセリフは js/i18n.js にまとめている
  const { t, fill } = I18N;
  const nameOf = (fish) => I18N.fishName(fish);
  const fmtTime = (ms) => Ranking.formatTime(ms, I18N.lang);
  const say = (text) => Sound.say(text, I18N.lang);

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
    return `<svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${t('chefLabel')}">
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
    updateBanner();
  }

  // ベストスコアはジャンルごとに保存（「ぜんぶ」は以前のキーをそのまま使う）
  const bestKey = (genre) => (genre === 'all' ? BEST_KEY : `${BEST_KEY}.${genre}`);
  function loadBest(genre) {
    try { return Number(localStorage.getItem(bestKey(genre))) || 0; } catch { return 0; }
  }
  function saveBest(genre, v) {
    try { localStorage.setItem(bestKey(genre), String(v)); } catch { /* 保存できなくても遊べる */ }
  }
  function loadGenre() {
    try {
      const g = localStorage.getItem(GENRE_KEY);
      return GENRES.some((x) => x.id === g) ? g : 'all';
    } catch { return 'all'; }
  }

  const genreOf = (id) => GENRES.find((g) => g.id === id);
  const poolOf = (genre) => FISH_PAIRS.filter((p) => genre === 'all' || p.genre === genre);
  const countOf = (genre) => Math.min(QUESTIONS, poolOf(genre).length);

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
    renderGenres();
    show('title');
  }

  // ---------- ジャンル選び ----------
  function renderGenres() {
    const box = $('genres');
    box.innerHTML = '';
    GENRES.forEach((g) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'genre';
      btn.setAttribute('role', 'radio');
      btn.setAttribute('aria-checked', String(g.id === state.genre));
      btn.innerHTML = `<span class="icon">${g.icon}</span>${I18N.genreLabel(g)}<small>${t('pairs', { n: poolOf(g.id).length })}</small>`;
      btn.addEventListener('click', () => {
        state.genre = g.id;
        try { localStorage.setItem(GENRE_KEY, g.id); } catch { /* 保存できなくても遊べる */ }
        Sound.play('tap');
        renderGenres();
      });
      box.appendChild(btn);
    });
    const n = countOf(state.genre);
    $('btn-start').textContent = t('start', { n });
    const top = Ranking.list(state.genre)[0];
    const best = loadBest(state.genre);
    const g = I18N.genreLabel(genreOf(state.genre));
    $('best-score').textContent = top
      ? t('bestTop', { g, s: top.score, t: top.total, time: fmtTime(top.time) })
      : best ? t('bestScore', { g, s: best, t: n }) : '';
  }

  // 出題する組を選ぶ：難易度がまんべんなく混ざるように選び、やさしい順に並べる
  function choosePairs(genre) {
    const pool = shuffle(poolOf(genre));
    const n = countOf(genre);
    const chosen = [];
    for (const lv of [1, 2, 3]) {
      const quota = Math.round(n * LEVEL_MIX[lv]);
      chosen.push(...pool.filter((p) => p.level === lv).slice(0, quota));
    }
    // 足りない分は残りから補う（ジャンルによっては難易度が偏るため）
    for (const p of pool) {
      if (chosen.length >= n) break;
      if (!chosen.includes(p)) chosen.push(p);
    }
    return chosen.slice(0, n).sort((a, b) => a.level - b.level);
  }

  // ---------- クイズ ----------
  function start() {
    Sound.play('start');
    Sound.startBgm();
    const pairs = choosePairs(state.genre);
    state.list = pairs.map((pair) => ({ pair, options: shuffle([pair.a, pair.b]), answer: Math.random() < 0.5 ? 0 : 1 }));
    state.index = 0;
    state.score = 0;
    state.combo = 0;
    state.misses = [];
    state.marks = [];
    state.time = 0;
    state.redoUsed = 0;
    state.paused = false;
    show('quiz');
    renderQuestion();
  }

  function updateStatus() {
    $('q-count').textContent = `${state.index + 1} / ${state.list.length}`;
    $('q-score').textContent = t('correct', { n: state.score });
    const lv = state.list[state.index].pair.level;
    $('q-level').textContent = LEVELS[lv].stars;
    $('q-level').title = I18N.levelLabel(lv);
    $('q-level').dataset.level = state.list[state.index].pair.level;
    const combo = $('q-combo');
    combo.hidden = state.combo < 2;
    combo.textContent = t('combo', { n: state.combo });
  }

  function renderQuestion() {
    const q = state.list[state.index];
    const target = q.options[q.answer];
    state.answered = false;
    updateStatus();
    $('progress-bar').style.width = `${(state.index / state.list.length) * 100}%`;

    // 難易度が上がったところで大将がひとこと
    const prev = state.list[state.index - 1];
    const intro = prev && prev.pair.level < q.pair.level ? t('levelUp')[q.pair.level] : '';
    const order = intro + pick(t('orders'));
    $('question').innerHTML = fill(order, { n: `<span class="target">${nameOf(target)}</span>` });
    setChef('quiz-chef', 'normal');
    say(fill(order, { n: nameOf(target) }));

    const box = $('choices');
    box.innerHTML = '';
    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'card';
      btn.type = 'button';
      btn.setAttribute('aria-label', t(i === 0 ? 'leftFish' : 'rightFish'));
      btn.innerHTML = `<div class="art">${FishArt.render(opt.art)}</div><div class="name">${nameOf(opt)}</div><div class="mark"></div>`;
      btn.addEventListener('click', () => answer(i));
      box.appendChild(btn);
    });
    $('feedback').hidden = true;
    closeRedo();
    state.shownAt = performance.now();
  }

  function answer(i) {
    if (state.answered) return;
    state.answered = true;
    // タイムは「問題が出てから答えるまで」の合計（解説を読む時間は含めない）
    state.qTime = performance.now() - state.shownAt;
    state.time += state.qTime;
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
      state.marks.push(true);
      Sound.play('correct', state.combo);
      confetti(cards[i], state.combo >= 3 ? 40 : 24);
      line = fill(pick(t(state.combo >= 3 ? 'comboPraises' : 'praises')), { n: nameOf(q.options[q.answer]), c: state.combo });
    } else {
      state.prevCombo = state.combo;
      state.combo = 0;
      state.misses.push(q.pair);
      state.marks.push(false);
      Sound.play('wrong');
      line = fill(pick(t('scolds')), { w: nameOf(q.options[i]) });
      offerRedo();
    }
    updateStatus();
    $('progress-bar').style.width = `${((state.index + 1) / state.list.length) * 100}%`;
    setChef('quiz-chef', ok ? 'happy' : 'sad');
    $('question').textContent = line;
    say(line);

    const verdict = $('verdict');
    verdict.textContent = t(ok ? 'verdictOk' : 'verdictNg');
    verdict.className = `verdict ${ok ? 'ok' : 'ng'}`;
    $('point').innerHTML = `<span class="label">${t('pointLabel')}</span>${I18N.pointOf(q.pair)}`;
    $('btn-next').textContent = t(state.index + 1 < state.list.length ? 'nextOrder' : 'seeResult');
    $('feedback').hidden = false;
    $('btn-next').focus({ preventScroll: true });
    $('feedback').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function next() {
    if (state.paused) return;
    closeRedo();
    Sound.play('next');
    state.index++;
    if (state.index < state.list.length) renderQuestion();
    else finish();
  }

  // ---------- 結果 ----------
  // 称号と大将のひとことは i18n の ranks（同じ並び）から取る
  const RANKS = [
    { min: 10, mood: 'happy' },
    { min: 8, mood: 'happy' },
    { min: 5, mood: 'normal' },
    { min: 0, mood: 'sad' },
  ];
  const rankText = (idx) => t('ranks')[idx];

  function finish() {
    const total = state.list.length;
    const score = state.score;
    const rankIdx = RANKS.findIndex((r) => score >= Math.round((r.min / 10) * total));
    const rank = { ...RANKS[rankIdx], ...rankText(rankIdx) };
    state.lastResult = { rankIdx, total, score };
    if (score > loadBest(state.genre)) saveBest(state.genre, score);
    const name = Ranking.getName() || t('defaultName');
    const rec = Ranking.add(state.genre, { name, score, total, time: Math.round(state.time), title: rank.title, rankIdx, redo: state.redoUsed });
    state.lastRecord = rec.id;
    state.lastResult.rankPos = rec.rank;
    renderResultText();

    show('result');
    setChef('result-chef', rank.mood);

    const good = score >= Math.round(total / 2);
    Sound.duck(2.2);
    Sound.play('fanfare', good);
    setTimeout(() => say(rank.msg), 1600);
    if (good) {
      confetti(null, score === total ? 80 : 40);
      if (score === total) setTimeout(() => confetti(null, 80), 500);
    }
  }

  // 結果画面の文言（言語を切り替えたときも呼ぶ）
  function renderResultText() {
    const r = state.lastResult;
    if (!r) return;
    const rank = rankText(r.rankIdx);
    const genre = genreOf(state.genre);
    $('r-score').textContent = r.score;
    $('r-total').textContent = r.total;
    $('r-rank').textContent = rank.title;
    $('r-msg').textContent = rank.msg;
    $('r-genre').textContent = `${genre.icon} ${I18N.genreLabel(genre)}`;
    $('r-time').textContent = t('time', { t: fmtTime(state.time) });
    $('r-redo').hidden = !state.redoUsed;
    $('r-redo').textContent = t('redoUsed', { n: state.redoUsed });
    const rankIn = $('r-rankin');
    rankIn.hidden = !r.rankPos;
    rankIn.textContent = r.rankPos === 1 ? t('rankInTop') : t('rankIn', { n: r.rankPos });
    $('review').innerHTML = state.misses.length
      ? `<h3>${t('reviewTitle')}</h3>${state.misses.map(pairCard).join('')}`
      : '';
    setupShare(rank);
  }

  // ---------- SNS シェア ----------
  // シェアするリンク先（ゲームの紹介記事）
  const SHARE_URL = 'https://techgym.jp/column/claude-code-game-shiwake/';
  let shareText = '';

  function shareUrl() {
    return SHARE_URL;
  }

  function setupShare(rank) {
    const genre = genreOf(state.genre);
    const marks = state.marks.map((ok) => (ok ? '⭕' : '❌')).join('');
    $('share-marks').textContent = marks;
    const redoNote = state.redoUsed ? t('shareRedo', { n: state.redoUsed }) : '';
    shareText = t('shareText', { g: I18N.genreLabel(genre), s: state.score, t: state.list.length, time: fmtTime(state.time) + redoNote, title: rank.title, marks });
    const url = shareUrl();
    const enc = encodeURIComponent;
    $('share-x').href = `https://twitter.com/intent/tweet?text=${enc(shareText)}&url=${enc(url)}&hashtags=${enc(t('hashtag'))}`;
    $('share-line').href = `https://line.me/R/msg/text/?${enc(`${shareText}\n${url}`)}`;
    $('share-fb').href = `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`;
    // アプリでは Android の共有メニューを使う（X・LINE・Facebook のリンクは出さない）
    $('share-native').hidden = !(NATIVE || navigator.share);
    $('share-native').textContent = t(NATIVE ? 'shareApp' : 'shareMore');
    ['share-x', 'share-line', 'share-fb'].forEach((id) => { $(id).hidden = NATIVE; });
    $('share-toast').textContent = '';
  }

  function toast(msg) {
    const el = $('share-toast');
    el.textContent = msg;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => { el.textContent = ''; }, 2500);
  }

  async function copyShare() {
    const text = `${shareText}\n${shareUrl()} #${t('hashtag')}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // クリップボード API が使えない環境向け
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    toast(t('copied'));
  }

  async function nativeShare() {
    const share = plugin('Share');
    if (share) {
      try { await share.share({ title: t('htmlTitle'), text: `${shareText}\n#${t('hashtag')}`, url: shareUrl(), dialogTitle: t('shareTitle') }); } catch { /* キャンセル */ }
      return;
    }
    try {
      await navigator.share({ title: t('htmlTitle'), text: `${shareText}\n#${t('hashtag')}`, url: shareUrl() });
    } catch { /* キャンセルされたときは何もしない */ }
  }

  ['share-x', 'share-line', 'share-fb'].forEach((id) => $(id).addEventListener('click', () => Sound.play('tap')));
  $('share-copy').addEventListener('click', () => { Sound.play('tap'); copyShare(); });
  $('share-native').addEventListener('click', () => { Sound.play('tap'); nativeShare(); });

  // ---------- ランキング ----------
  const MEDALS = ['🥇', '🥈', '🥉'];
  const escapeHtml = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  function renderRanking(genre = state.rankingGenre) {
    state.rankingGenre = genre;
    const tabs = $('ranking-tabs');
    tabs.innerHTML = '';
    GENRES.forEach((g) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'genre';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-checked', String(g.id === genre));
      btn.setAttribute('aria-selected', String(g.id === genre));
      btn.innerHTML = `<span class="icon">${g.icon}</span>${I18N.genreLabel(g)}`;
      btn.addEventListener('click', () => { Sound.play('tap'); renderRanking(g.id); });
      tabs.appendChild(btn);
    });

    const rows = Ranking.list(genre);
    $('ranking-list').innerHTML = rows.length
      ? `<ol>${rows.map((r, i) => `
          <li class="${r.id === state.lastRecord ? 'latest' : ''}">
            <span class="pos">${MEDALS[i] || `${i + 1}`}</span>
            <span class="who">${escapeHtml(r.name)}<small>${escapeHtml(r.rankIdx != null ? rankText(r.rankIdx).title : r.title)}${r.redo ? ` · ${t('redoUsed', { n: r.redo })}` : ''}</small></span>
            <span class="pts">${r.score}<small>/${r.total}</small></span>
            <span class="time">${fmtTime(r.time)}<small>${Ranking.formatDate(r.date)}</small></span>
          </li>`).join('')}</ol>`
      : `<p class="empty">${t('empty')}</p>`;
    $('btn-ranking-clear').hidden = !rows.length;
  }

  function showRanking(genre) {
    Sound.play('tap');
    renderRanking(genre);
    show('ranking');
  }

  function pairCard(pair) {
    return `<article class="pair">
      <div class="pair-fish">
        <figure>${FishArt.render(pair.a.art)}<figcaption>${nameOf(pair.a)}</figcaption></figure>
        <figure>${FishArt.render(pair.b.art)}<figcaption>${nameOf(pair.b)}</figcaption></figure>
      </div>
      <p class="point"><span class="lv" data-level="${pair.level}" title="${I18N.levelLabel(pair.level)}">${LEVELS[pair.level].stars}</span>${I18N.pointOf(pair)}</p>
    </article>`;
  }

  // ---------- 図鑑 ----------
  function renderZukan(genre = state.zukanGenre || 'all') {
    state.zukanGenre = genre;
    const tabs = $('zukan-tabs');
    tabs.innerHTML = '';
    GENRES.forEach((g) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'genre';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-checked', String(g.id === genre));
      btn.setAttribute('aria-selected', String(g.id === genre));
      btn.innerHTML = `<span class="icon">${g.icon}</span>${I18N.genreLabel(g)}<small>${t('pairs', { n: poolOf(g.id).length })}</small>`;
      btn.addEventListener('click', () => { Sound.play('tap'); renderZukan(g.id); });
      tabs.appendChild(btn);
    });
    // やさしい順に並べる
    const pairs = poolOf(genre).slice().sort((a, b) => a.level - b.level);
    $('zukan').innerHTML = pairs.map(pairCard).join('');
    $('zukan-count').textContent = t('zukanCount', { n: FISH_PAIRS.length });
  }

  function showZukan() {
    Sound.play('tap');
    renderZukan('all');
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
  $('btn-start').addEventListener('click', () => withInterstitial(start));
  $('btn-retry').addEventListener('click', () => withInterstitial(start));
  $('btn-next').addEventListener('click', next);
  $('btn-home').addEventListener('click', () => { Sound.play('tap'); withInterstitial(renderTitle); });
  $('btn-zukan').addEventListener('click', showZukan);
  $('btn-ranking').addEventListener('click', () => showRanking(state.genre));
  $('btn-result-ranking').addEventListener('click', () => showRanking(state.genre));
  $('btn-ranking-back').addEventListener('click', () => { Sound.play('tap'); withInterstitial(renderTitle); });
  $('btn-ranking-clear').addEventListener('click', () => {
    const g = genreOf(state.rankingGenre);
    if (!confirm(t('clearConfirm', { g: I18N.genreLabel(g) }))) return;
    Ranking.clear(state.rankingGenre);
    renderRanking();
  });
  const nameInput = $('player-name');
  nameInput.value = Ranking.getName();
  nameInput.addEventListener('input', () => Ranking.setName(nameInput.value));
  $('btn-zukan-back').addEventListener('click', () => { Sound.play('tap'); withInterstitial(renderTitle); });
  document.addEventListener('keydown', (e) => {
    if (!$('screen-quiz').classList.contains('active') || state.paused) return;
    if (!state.answered && (e.key === 'ArrowLeft' || e.key === '1')) answer(0);
    else if (!state.answered && (e.key === 'ArrowRight' || e.key === '2')) answer(1);
  });

  // ---------- 言語の切り替え ----------
  $('tg-lang').addEventListener('click', () => {
    Sound.play('tap');
    I18N.setLang(I18N.lang === 'ja' ? 'en' : 'ja');
  });
  // 表示中の画面を、選んだ言語で描き直す
  I18N.onChange(() => {
    const active = document.querySelector('.screen.active').id.replace('screen-', '');
    if (active === 'title') renderGenres();
    if (active === 'ranking') renderRanking();
    if (active === 'zukan') renderZukan();
    if (active === 'result') renderResultText();
    if (active === 'quiz') {
      const q = state.list[state.index];
      updateStatus();
      if (!state.answered) {
        $('question').innerHTML = fill(t('orders')[0], { n: `<span class="target">${nameOf(q.options[q.answer])}</span>` });
      } else {
        $('verdict').textContent = t($('verdict').classList.contains('ok') ? 'verdictOk' : 'verdictNg');
        $('point').innerHTML = `<span class="label">${t('pointLabel')}</span>${I18N.pointOf(q.pair)}`;
        $('btn-next').textContent = t(state.index + 1 < state.list.length ? 'nextOrder' : 'seeResult');
      }
      [...$('choices').children].forEach((c, i) => {
        c.querySelector('.name').textContent = nameOf(q.options[i]);
        c.setAttribute('aria-label', t(i === 0 ? 'leftFish' : 'rightFish'));
      });
    }
    $('title-chef').innerHTML = chefSvg('happy');
    if (!$('redo').hidden && !redo.busy) $('redo-note').textContent = t('redoNote', { n: REDO_MAX - state.redoUsed });
    $('privacy-link').href = t('privacyUrl');
  });

  // ======================================================
  //  アプリ（Android）用：広告・一時停止・戻るボタン
  // ======================================================

  const activeScreen = () => document.querySelector('.screen.active').id.replace('screen-', '');

  // ---------- 全画面広告 ----------
  // 「プレイ開始」「もう一回」「タイトルへ戻る」「ポーズからの再開」のたびに出す（Web 版では何もしない）
  let adBusy = false;
  async function withInterstitial(next) {
    if (adBusy) return;
    if (Ads.available) {
      adBusy = true;
      $('pause').hidden = true;
      await Ads.showInterstitial(3000);
      adBusy = false;
    }
    next();
  }

  // ---------- バナー広告：プレイ中（問題に答えている間）以外の画面の下中央 ----------
  function updateBanner() {
    const want = activeScreen() !== 'quiz' || state.paused;
    Ads.setBanner(want);
    document.body.classList.toggle('has-banner', Ads.available && want);
  }

  // ---------- 一時停止 ----------
  function pause() {
    if (state.paused || activeScreen() !== 'quiz') return;
    state.paused = true;
    state.pausedAt = performance.now();
    Sound.suspend();
    $('pause').hidden = false;
    updateBanner();
  }
  function resumePlay() {
    if (!state.paused) return;
    // 止めていた間はタイムに数えない
    if (!state.answered) state.shownAt += performance.now() - state.pausedAt;
    state.paused = false;
    $('pause').hidden = true;
    Sound.resume();
    updateBanner();
  }
  $('btn-pause').addEventListener('click', () => { Sound.play('tap'); pause(); });
  $('btn-resume').addEventListener('click', () => withInterstitial(resumePlay));
  $('btn-pause-home').addEventListener('click', () => withInterstitial(() => {
    state.paused = false;
    $('pause').hidden = true;
    Sound.resume();
    closeRedo();
    renderTitle();
  }));

  // 裏に回ったら一時停止して音を止める（広告の表示中は広告側が音を止めている）
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      pause();
      Sound.suspend();
    } else if (!Ads.showing && !state.paused) {
      Sound.resume();
    }
  });

  // Android の戻るボタン：プレイ中はポーズ（ポーズ中なら再開）、タイトル・結果画面ではアプリを閉じる、図鑑・ランキングはタイトルへ
  if (plugin('App')) {
    plugin('App').addListener('backButton', () => {
      if (adBusy) return;
      const screen = activeScreen();
      if (screen === 'title' || screen === 'result') plugin('App').exitApp();
      else if (screen === 'quiz') { if (state.paused) withInterstitial(resumePlay); else pause(); }
      else withInterstitial(renderTitle);
    });
  }

  // ---------- リワード広告のチート：まちがえた問題をやり直す（アプリのみ・1 ゲーム 3 回まで） ----------
  // 2 択の同じ問題をやり直すと答えがわかってしまうので、同じ難易度の別の問題に差し替える。
  // 正解・不正解と解説を見届けられるよう少し待ってから案内を出し、数秒で自動的に消す
  const REDO_DELAY = 2500;
  const REDO_WAIT = 8;
  const REDO_MAX = 3;
  const redo = { timer: null, tick: null, busy: false, left: 0 };

  function offerRedo() {
    if (!Ads.canReward || state.redoUsed >= REDO_MAX) return;
    const index = state.index;
    redo.timer = setTimeout(() => {
      if (state.index === index && state.answered) showRedo();
    }, REDO_DELAY);
  }
  function showRedo() {
    Object.assign(redo, { busy: false, left: REDO_WAIT });
    $('redo-note').textContent = t('redoNote', { n: REDO_MAX - state.redoUsed });
    $('redo-watch').disabled = false;
    $('redo-watch').textContent = t('redoWatch');
    $('redo-skip').textContent = t('redoSkip', { s: redo.left });
    $('redo').hidden = false;
    redo.tick = setInterval(() => {
      if (state.paused || redo.busy) return;
      redo.left--;
      $('redo-skip').textContent = t('redoSkip', { s: Math.max(0, redo.left) });
      if (redo.left <= 0) closeRedo();
    }, 1000);
  }
  function closeRedo() {
    clearTimeout(redo.timer);
    clearInterval(redo.tick);
    redo.timer = redo.tick = null;
    $('redo').hidden = true;
  }
  $('redo-skip').addEventListener('click', () => { Sound.play('tap'); closeRedo(); });
  $('redo-watch').addEventListener('click', async () => {
    if (redo.busy || $('redo').hidden) return;
    redo.busy = true;
    $('redo-watch').disabled = true;
    $('redo-watch').textContent = t('redoLoading');
    const result = await Ads.showRewarded();
    if (result === 'unavailable') {
      $('redo-note').textContent = t('redoFail');
      setTimeout(closeRedo, 2000);
      return;
    }
    closeRedo();
    if (result !== 'rewarded') return;
    // まちがえた問題の成績（不正解・タイム・連続正解の途切れ）を取り消して、別の問題でやり直す
    const q = state.list[state.index];
    state.misses.pop();
    state.marks.pop();
    state.time -= state.qTime;
    state.combo = state.prevCombo;
    state.redoUsed++;
    state.list[state.index] = replacementFor(q.pair);
    renderQuestion();
    const line = t('redoLine');
    $('question').innerHTML = line + $('question').innerHTML;
    say($('question').textContent);
  });

  // 差し替える問題：まだ出ていない、同じジャンル・同じ難易度の組（なければ難易度を問わない）
  function replacementFor(pair) {
    const used = new Set(state.list.map((x) => x.pair.id));
    const pool = poolOf(state.genre).filter((p) => !used.has(p.id));
    const same = pool.filter((p) => p.level === pair.level);
    const next = pick(same.length ? same : pool.length ? pool : FISH_PAIRS.filter((p) => p.id !== pair.id));
    return { pair: next, options: shuffle([next.a, next.b]), answer: Math.random() < 0.5 ? 0 : 1 };
  }

  // ---------- タイトル画面の下：バージョン（アプリ版）・プライバシーポリシー・広告の設定（EU など） ----------
  if (window.APP_VERSION && window.APP_VERSION !== 'dev') $('build-info').textContent = `${window.APP_VERSION} |`;
  Ads.initDone.then(() => { if (Ads.privacyOptionsRequired) $('ad-privacy').hidden = false; });
  $('ad-privacy-link').addEventListener('click', (e) => { e.preventDefault(); Ads.showPrivacyOptions(); });
  // アプリの WebView では音声読み上げが使えないので「声」ボタンを隠す
  $('tg-voice').hidden = !Sound.hasVoice;

  I18N.apply();
  $('privacy-link').href = t('privacyUrl');
  renderTitle();
})();
