/*
 * 出題データ：まぎらわしい魚のペアと、見分けポイント。
 * art は js/fish.js のイラストのキー。
 */
const FISH_PAIRS = [
  {
    id: 'anago-unagi',
    a: { name: 'アナゴ', art: 'anago' },
    b: { name: 'ウナギ', art: 'unagi' },
    point: 'アナゴは体の横に<strong>白い点々（側線孔）</strong>が並び、上あごが前に出ています。ウナギは点がなく、背中が黒っぽく、下あごが少し前に出ています。',
  },
  {
    id: 'hirame-karei',
    a: { name: 'ヒラメ', art: 'hirame' },
    b: { name: 'カレイ', art: 'karei' },
    point: '「<strong>左ヒラメに右カレイ</strong>」。お腹を手前にして置くと、ヒラメは顔が左、カレイは右を向きます。ヒラメは口が大きく<strong>鋭い歯</strong>があり、カレイは口が小さいのも特徴です。',
  },
  {
    id: 'maguro-katsuo',
    a: { name: 'マグロ', art: 'maguro' },
    b: { name: 'カツオ', art: 'katsuo' },
    point: 'カツオはお腹に<strong>黒い縞（しま）</strong>が数本走ります。マグロは縞がなく、体が太く、尾の付け根に<strong>黄色い小さなひれ（小離鰭）</strong>が目立ちます。',
  },
  {
    id: 'aji-saba',
    a: { name: 'アジ', art: 'aji' },
    b: { name: 'サバ', art: 'saba' },
    point: 'アジは側線に沿って<strong>「ぜいご」</strong>という硬いうろこが並び、エラぶたに黒い点があります。サバは背中に<strong>黒い波模様</strong>があります。',
  },
  {
    id: 'sanma-sayori',
    a: { name: 'サンマ', art: 'sanma' },
    b: { name: 'サヨリ', art: 'sayori' },
    point: 'サヨリは<strong>下あごだけが針のように長く伸び</strong>、先が赤いのが目印。サンマは口先がとがり、くちばしの先がほんのり黄色です。',
  },
  {
    id: 'madai-kurodai',
    a: { name: 'マダイ', art: 'madai' },
    b: { name: 'クロダイ', art: 'kurodai' },
    point: 'マダイは桜色の体に<strong>青い斑点</strong>が散らばり、<strong>尾びれのふちが黒い</strong>のが特徴。クロダイ（チヌ）は灰黒色で、ぼんやりした縦縞があります。',
  },
  {
    id: 'buri-kanpachi',
    a: { name: 'ブリ', art: 'buri' },
    b: { name: 'カンパチ', art: 'kanpachi' },
    point: 'カンパチは<strong>目の上を斜めに横切る黒い帯</strong>があり、上から見ると「八」の字に見えるのが名前の由来。ブリは帯がなく、くっきりした<strong>黄色い線</strong>が目から尾まで走ります。',
  },
  {
    id: 'fugu-kawahagi',
    a: { name: 'フグ', art: 'fugu' },
    b: { name: 'カワハギ', art: 'kawahagi' },
    point: 'トラフグは丸い体で、胸びれの後ろに<strong>白く縁どられた大きな黒い紋</strong>があります。カワハギはひし形の平たい体で、<strong>頭の上に一本の角（トゲ）</strong>が立っています。',
  },
  {
    id: 'koi-funa',
    a: { name: 'コイ', art: 'koi' },
    b: { name: 'フナ', art: 'funa' },
    point: 'コイは口のまわりに<strong>2対（4本）のひげ</strong>があります。フナには<strong>ひげがありません</strong>。フナの方が体高が高く、ずんぐりしています。',
  },
  {
    id: 'sake-nijimasu',
    a: { name: 'サケ', art: 'sake' },
    b: { name: 'ニジマス', art: 'nijimasu' },
    point: 'ニジマスは体の横に<strong>ピンク色（虹色）の帯</strong>があり、体や尾びれに<strong>黒い点が多数</strong>あります。サケ（シロザケ）は銀色で目立つ斑点がありません。',
  },
  {
    id: 'maiwashi-katakuchi',
    a: { name: 'マイワシ', art: 'maiwashi' },
    b: { name: 'カタクチイワシ', art: 'katakuchi' },
    point: 'マイワシは体の横に<strong>黒い点が一列（七つ星）</strong>に並びます。カタクチイワシは点がなく、<strong>上あごが突き出て下あごが短い</strong>（＝片口）のが名前の由来です。',
  },
  {
    id: 'same-iruka',
    a: { name: 'サメ', art: 'same' },
    b: { name: 'イルカ', art: 'iruka' },
    point: 'サメは魚なので頭の横に<strong>エラ穴（5本のすじ）</strong>があり、尾びれは<strong>縦向き</strong>。イルカはほ乳類で、エラがなく頭の上に<strong>鼻の穴（噴気孔）</strong>があり、尾びれは<strong>横向き</strong>です。',
  },
];

if (typeof module !== 'undefined') module.exports = FISH_PAIRS;
