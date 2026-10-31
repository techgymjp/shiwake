/*
 * 多言語対応（日本語・英語）
 * 言語は ?lang=en / ?lang=ja、保存した設定、ブラウザの言語の順に決める。
 */
const I18N = (() => {
  const KEY = 'shiwake.lang';

  const DICT = {
    ja: {
      htmlTitle: '魚仕分け',
      langToggle: 'English',
      logoSub: '',
      welcome: 'へい、らっしゃい！<br>おまえさんの<strong>目利き</strong>の腕前、<br>見せてもらおうか！',
      chefLabel: '寿司屋の大将',
      genreTitle: 'ジャンルをえらぶ',
      genreAria: 'ジャンル',
      genreNote: '問題は「やさしい」から「むずかしい」の順に出ます',
      nameLabel: '板前の名前',
      defaultName: '名無しの板前',
      start: '板場に立つ！（{n}問）',
      rankingBtn: '🏆 ランキング',
      zukanBtn: '📖 見分け図鑑',
      bestTop: '🏆 {g}の1位：{s} / {t}（{time}）',
      bestScore: '🏆 {g}のベスト：{s} / {t}',
      pairs: '{n}組',
      correct: '正解 {n}',
      combo: '🔥 {n}連続',
      leftFish: '左の魚',
      rightFish: '右の魚',
      verdictOk: 'せいかい！',
      verdictNg: 'ざんねん…',
      pointLabel: '見分けポイント',
      nextOrder: '次の注文へ ▶',
      seeResult: '結果を見る ▶',
      resultTitle: '本日の仕分け結果',
      time: '⏱ タイム {t}',
      rankInTop: '🎉 ランキング 1位 更新！',
      rankIn: 'ランキング {n}位 にランクイン！',
      reviewTitle: 'まちがえた魚をおさらい',
      shareTitle: '結果をシェアする',
      sharePost: '𝕏 ポスト',
      shareMore: '📤 その他',
      shareCopy: '🔗 コピー',
      copied: 'コピーしました！',
      shareText: '魚仕分け【{g}】で {s}/{t}問正解！（{time}）\n称号：{title}\n{marks}',
      hashtag: '魚仕分け',
      retry: 'もう一回！',
      home: 'のれんへ戻る',
      rankingTitle: '🏆 ランキング',
      rankingNote: 'この端末での記録です（ジャンルごとに上位10件）',
      clear: '記録を消す',
      clearConfirm: '「{g}」のランキングを消しますか？',
      empty: 'まだ記録がないよ。板場に立ってみよう！',
      zukanTitle: '📖 見分け図鑑',
      zukanCount: '全{n}組',
      bgm: '♪ BGM',
      se: '🔔 効果音',
      voice: '🗣 声',
      privacy: 'プライバシーポリシー',
      privacyUrl: 'https://techgym.jp/privacy-policy/',
      adSettings: '広告の設定',
      pauseTitle: 'ひと休み',
      resume: '再開する',
      shareApp: '📤 シェア',
      redoNote: '広告を見ると、この問題を別の問題でやり直せます（あと{n}回）',
      redoWatch: '▶ 広告を見てやり直す',
      redoSkip: 'やめる（{s}）',
      redoLoading: '広告を読み込み中…',
      redoFail: '広告を読み込めませんでした',
      redoUsed: 'やり直し {n}回',
      shareRedo: '・やり直し{n}回',
      redoLine: 'よし、仕切り直しだ！',
      orders: [
        'へいっ！{n}を一丁たのむ！',
        'おう、{n}を持ってきてくんな！',
        'お客さんから{n}の注文だ！どっちだ？',
        '次は{n}だ。目利きの見せどころだぞ！',
        '{n}、急ぎで頼むよ！',
        'いい{n}が入ってる。取ってきてくれ！',
      ],
      praises: ['いい目してるねぇ！', 'お見事！それが{n}だ！', 'よっ、目利き！', 'さすがだ、わかってるねぇ！', 'そうそう、それだよ！'],
      comboPraises: ['{c}連続！こいつぁ大したもんだ！', '{c}連続正解！板前の素質ありだな！'],
      scolds: ['おいおい、そいつは{w}だ！', 'ちがうちがう、それは{w}だよ！', 'あちゃー、それは{w}だ。よく見な！'],
      levelUp: { 2: 'ここから少し難しくなるぞ。', 3: 'さあ、ここからは上級編だ！' },
      ranks: [
        { title: '👑 大将も認める目利き', msg: '全問正解！明日から板場に立ってくれ！' },
        { title: '🍣 一人前の板前', msg: 'いい腕だ！あと少しで店を任せられるな。' },
        { title: '🔪 見習い板前', msg: 'まずまずだ。見分け図鑑で修行しな！' },
        { title: '🫧 皿洗いから修行', msg: 'まだまだだな…図鑑でみっちり修行だ！' },
      ],
    },
    en: {
      htmlTitle: 'Fish Shiwake – Spot the Right Fish',
      langToggle: '日本語',
      logoSub: 'Spot the right fish!',
      welcome: 'Irasshai! Welcome!<br>Let\'s see how sharp your<br><strong>fish-spotting eye</strong> really is!',
      chefLabel: 'Sushi chef',
      genreTitle: 'Choose a category',
      genreAria: 'Category',
      genreNote: 'Questions go from Easy to Hard',
      nameLabel: 'Your chef name',
      defaultName: 'Nameless Chef',
      start: 'Start! ({n} questions)',
      rankingBtn: '🏆 Ranking',
      zukanBtn: '📖 Fish Guide',
      bestTop: '🏆 Best in {g}: {s} / {t} ({time})',
      bestScore: '🏆 Best in {g}: {s} / {t}',
      pairs: '{n} pairs',
      correct: 'Correct {n}',
      combo: '🔥 {n} in a row',
      leftFish: 'Left fish',
      rightFish: 'Right fish',
      verdictOk: 'Correct!',
      verdictNg: 'Oops…',
      pointLabel: 'How to tell',
      nextOrder: 'Next order ▶',
      seeResult: 'See results ▶',
      resultTitle: "Today's Results",
      time: '⏱ Time {t}',
      rankInTop: '🎉 New #1 record!',
      rankIn: 'You ranked #{n}!',
      reviewTitle: 'Review the ones you missed',
      shareTitle: 'Share your result',
      sharePost: '𝕏 Post',
      shareMore: '📤 More',
      shareCopy: '🔗 Copy',
      copied: 'Copied!',
      shareText: 'Fish Shiwake [{g}]: {s}/{t} correct! ({time})\nTitle: {title}\n{marks}',
      hashtag: 'FishShiwake',
      retry: 'Play again!',
      home: 'Back to the shop',
      rankingTitle: '🏆 Ranking',
      rankingNote: 'Records on this device (top 10 per category)',
      clear: 'Clear records',
      clearConfirm: 'Clear the ranking for "{g}"?',
      empty: 'No records yet. Step behind the counter and play!',
      zukanTitle: '📖 Fish Guide',
      zukanCount: '{n} pairs',
      bgm: '♪ BGM',
      se: '🔔 SFX',
      voice: '🗣 Voice',
      privacy: 'Privacy Policy',
      privacyUrl: 'https://techgym.jp/privacy-policy-en/',
      adSettings: 'Ad settings',
      pauseTitle: 'Paused',
      resume: 'Resume',
      shareApp: '📤 Share',
      redoNote: 'Watch an ad to retry with a different question ({n} left)',
      redoWatch: '▶ Watch ad & retry',
      redoSkip: 'No thanks ({s})',
      redoLoading: 'Loading ad…',
      redoFail: 'Could not load an ad',
      redoUsed: 'Retries: {n}',
      shareRedo: ', retries: {n}',
      redoLine: 'Alright, let\'s try that again! ',
      orders: [
        'Hey! One {n}, please!',
        'Bring me the {n}, quick!',
        'A customer wants {n}! Which one is it?',
        'Next up: {n}. Show me that sharp eye!',
        '{n}, on the double!',
        'We got some fine {n} in. Go grab it!',
      ],
      praises: ['You\'ve got a good eye!', 'Nicely done! That\'s the {n}!', 'Now that\'s a pro!', 'Sharp! You know your fish!', 'Yes, that\'s the one!'],
      comboPraises: ['{c} in a row! Impressive!', '{c} straight! You\'re a natural chef!'],
      scolds: ['Whoa, that\'s the {w}!', 'Nope, that one\'s the {w}!', 'Oops, that\'s the {w}. Look closer!'],
      levelUp: { 2: 'Now it gets a little harder. ', 3: 'Alright, time for the expert round! ' },
      ranks: [
        { title: '👑 Master Fish-Spotter', msg: 'Perfect score! You can start at my counter tomorrow!' },
        { title: '🍣 Full-fledged Sushi Chef', msg: 'Great skills! I could almost leave you the shop.' },
        { title: '🔪 Apprentice Chef', msg: 'Not bad. Study the Fish Guide and keep training!' },
        { title: '🫧 Dishwasher Trainee', msg: 'Still a long way to go… Hit the Fish Guide hard!' },
      ],
    },
  };

  function detect() {
    const q = new URLSearchParams(location.search).get('lang');
    if (q === 'ja' || q === 'en') return q;
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === 'ja' || saved === 'en') return saved;
    } catch { /* 保存できない環境 */ }
    return /^ja\b/i.test(navigator.language || '') ? 'ja' : 'en';
  }

  let lang = detect();
  const listeners = [];

  // {n} などの差し込みを埋める
  const fill = (tpl, vars = {}) => tpl.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));

  function t(key, vars) {
    const v = DICT[lang][key] ?? DICT.ja[key];
    return typeof v === 'string' ? fill(v, vars) : v;
  }

  // HTML の data-i18n 属性がついた要素を書き換える
  function apply(root = document) {
    document.documentElement.lang = lang;
    document.title = t('htmlTitle');
    root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
    root.querySelectorAll('[data-i18n-html]').forEach((el) => { el.innerHTML = t(el.dataset.i18nHtml); });
    root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => { el.placeholder = t(el.dataset.i18nPlaceholder); });
    root.querySelectorAll('[data-i18n-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
  }

  function setLang(next) {
    lang = next;
    try { localStorage.setItem(KEY, next); } catch { /* 保存できなくても動く */ }
    apply();
    listeners.forEach((fn) => fn(lang));
  }

  // ---------- 魚の名前・解説・ジャンル ----------
  const fishName = (fish) => (lang === 'en' && FISH_EN.names[fish.art]) || fish.name;
  const pointOf = (pair) => (lang === 'en' && FISH_EN.points[pair.id]) || pair.point;
  const genreLabel = (g) => (lang === 'en' && FISH_EN.genres[g.id]) || g.label;
  const levelLabel = (lv) => (lang === 'en' && FISH_EN.levels[lv]) || LEVELS[lv].label;

  return {
    t, fill, apply, setLang, fishName, pointOf, genreLabel, levelLabel,
    get lang() { return lang; },
    onChange: (fn) => listeners.push(fn),
  };
})();
