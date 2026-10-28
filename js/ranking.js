/*
 * ランキング（この端末に保存する自分たちの記録）
 * ジャンルごとに上位10件を保存。正解数が多い順、同点ならタイムが速い順。
 */
const Ranking = (() => {
  const KEY = 'shiwake.records';
  const NAME_KEY = 'shiwake.name';
  const MAX = 10;
  const DEFAULT_NAME = '名無しの板前';

  function loadAll() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  }
  function saveAll(all) {
    try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* 保存できなくても遊べる */ }
  }

  const compare = (a, b) => b.score - a.score || a.time - b.time || a.date.localeCompare(b.date);

  function list(genre) {
    return (loadAll()[genre] || []).slice().sort(compare);
  }

  // 記録を追加し、何位に入ったか（圏外なら 0）を返す
  function add(genre, entry) {
    const all = loadAll();
    const rec = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, date: new Date().toISOString(), ...entry };
    const sorted = [...(all[genre] || []), rec].sort(compare).slice(0, MAX);
    all[genre] = sorted;
    saveAll(all);
    return { id: rec.id, rank: sorted.findIndex((r) => r.id === rec.id) + 1 };
  }

  function clear(genre) {
    const all = loadAll();
    delete all[genre];
    saveAll(all);
  }

  function getName() {
    try { return localStorage.getItem(NAME_KEY) || ''; } catch { return ''; }
  }
  function setName(name) {
    try { localStorage.setItem(NAME_KEY, name.trim().slice(0, 10)); } catch { /* 保存できなくても遊べる */ }
  }

  // 83456ms → "1分23.5秒"
  function formatTime(ms) {
    const total = Math.round(ms / 100) / 10;
    const m = Math.floor(total / 60);
    const s = (total - m * 60).toFixed(1);
    return m ? `${m}分${s.padStart(4, '0')}秒` : `${s}秒`;
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  return { list, add, clear, getName, setName, formatTime, formatDate, MAX, DEFAULT_NAME };
})();
