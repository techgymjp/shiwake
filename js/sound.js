/*
 * 効果音と BGM（Web Audio API で合成。音声ファイル不要）
 */
const Sound = (() => {
  const KEY = 'shiwake.sound';
  let ctx = null, master = null, bgmGain = null, seGain = null;
  let settings = { bgm: true, se: true, voice: true };
  try { Object.assign(settings, JSON.parse(localStorage.getItem(KEY)) || {}); } catch { /* 既定値で動く */ }

  const BGM_VOL = 0.16, SE_VOL = 0.5;

  function init() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return true;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.9;
    master.connect(ctx.destination);
    bgmGain = ctx.createGain();
    bgmGain.gain.value = settings.bgm ? BGM_VOL : 0;
    bgmGain.connect(master);
    seGain = ctx.createGain();
    seGain.gain.value = SE_VOL;
    seGain.connect(master);
    return true;
  }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* 保存できなくても動く */ }
  }

  const NOTES = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  function freq(note) {
    const m = /^([A-G]#?)(\d)$/.exec(note);
    const midi = 12 * (Number(m[2]) + 1) + NOTES[m[1]];
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // 1音鳴らす
  function tone(out, f, t, dur, { type = 'square', vol = 0.3, attack = 0.005, slide = 0 } = {}) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  let noiseBuf = null;
  function noise(out, t, dur, vol, hp = 6000) {
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(filter).connect(g).connect(out);
    s.start(t);
    s.stop(t + dur + 0.02);
  }

  // ---------- 効果音 ----------
  const SE = {
    tap(t) {
      tone(seGain, 880, t, 0.06, { type: 'triangle', vol: 0.35, slide: 1.6 });
    },
    start(t) {
      ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => tone(seGain, freq(n), t + i * 0.07, 0.16, { vol: 0.22 }));
    },
    correct(t, combo = 1) {
      const up = Math.pow(2, Math.min(combo - 1, 6) / 12); // 連続正解で少しずつ音程が上がる
      tone(seGain, freq('E6') * up, t, 0.12, { vol: 0.25 });
      tone(seGain, freq('C7') * up, t + 0.1, 0.35, { vol: 0.25 });
      tone(seGain, freq('G6') * up, t + 0.1, 0.35, { type: 'triangle', vol: 0.2 });
    },
    wrong(t) {
      tone(seGain, 220, t, 0.18, { type: 'sawtooth', vol: 0.18, slide: 0.85 });
      tone(seGain, 165, t + 0.18, 0.35, { type: 'sawtooth', vol: 0.18, slide: 0.7 });
    },
    next(t) {
      tone(seGain, 600, t, 0.08, { type: 'sine', vol: 0.3, slide: 2 });
    },
    fanfare(t, good = true) {
      const seq = good
        ? [['C5', 0], ['C5', 0.12], ['C5', 0.24], ['C5', 0.36], ['G#4', 0.6], ['A#4', 0.84], ['C5', 1.08], ['A#4', 1.32], ['C5', 1.44]]
        : [['G4', 0], ['F#4', 0.25], ['F4', 0.5], ['E4', 0.75]];
      seq.forEach(([n, d], i) => {
        const last = i === seq.length - 1;
        tone(seGain, freq(n), t + d, last ? 0.9 : 0.14, { vol: 0.22 });
        if (good) tone(seGain, freq(n) * 2, t + d, last ? 0.9 : 0.14, { type: 'triangle', vol: 0.1 });
      });
    },
  };

  function play(name, ...args) {
    if (!settings.se || !init()) return;
    SE[name](ctx.currentTime + 0.01, ...args);
  }

  // ---------- BGM ----------
  const TEMPO = 140;
  const STEP = 60 / TEMPO / 2; // 8分音符
  // 8小節 × 8分音符8つ（'-' は休符）
  const MELODY = (
    'E5 - G5 E5 C5 - D5 E5 ' +
    '- C5 A4 - C5 E5 D5 - ' +
    'F5 - A5 F5 C5 - F5 E5 ' +
    'D5 - B4 G4 - B4 D5 - ' +
    'G5 - E5 G5 C6 - B5 A5 ' +
    'G5 - E5 - C5 D5 E5 - ' +
    'F5 E5 D5 C5 A4 - C5 D5 ' +
    'G4 - B4 D5 G5 - - -'
  ).split(' ');
  const CHORDS = [['C3', 'G3'], ['A2', 'E3'], ['F2', 'C3'], ['G2', 'D3'], ['C3', 'G3'], ['A2', 'E3'], ['F2', 'C3'], ['G2', 'D3']];
  const ARP = [['C4', 'E4', 'G4'], ['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['G3', 'B3', 'D4'], ['C4', 'E4', 'G4'], ['A3', 'C4', 'E4'], ['F3', 'A3', 'C4'], ['G3', 'B3', 'D4']];

  let timer = null, step = 0, nextTime = 0;

  function scheduleStep(i, t) {
    const bar = Math.floor(i / 8) % 8, beat = i % 8;
    const m = MELODY[i % MELODY.length];
    if (m !== '-') tone(bgmGain, freq(m), t, STEP * 0.9, { vol: 0.22 });
    // ベース：オクターブで跳ねる
    const [root, fifth] = CHORDS[bar];
    const bass = beat % 2 === 0 ? root : (beat % 4 === 1 ? fifth : root.replace(/\d/, (d) => Number(d) + 1));
    tone(bgmGain, freq(bass), t, STEP * 0.8, { type: 'triangle', vol: 0.5 });
    // 裏拍のコード
    if (beat % 2 === 1) ARP[bar].forEach((n) => tone(bgmGain, freq(n), t, STEP * 0.5, { type: 'square', vol: 0.05 }));
    // リズム
    if (beat % 4 === 0) tone(bgmGain, 120, t, 0.12, { type: 'sine', vol: 0.7, slide: 0.4 });
    if (beat % 4 === 2) noise(bgmGain, t, 0.1, 0.25, 2000);
    noise(bgmGain, t, 0.03, 0.12);
  }

  function tick() {
    while (nextTime < ctx.currentTime + 0.15) {
      scheduleStep(step, nextTime);
      step = (step + 1) % 64;
      nextTime += STEP;
    }
  }

  function startBgm() {
    if (!settings.bgm || timer || !init()) return;
    step = 0;
    nextTime = ctx.currentTime + 0.1;
    timer = setInterval(tick, 30);
  }

  function stopBgm() {
    clearInterval(timer);
    timer = null;
  }

  // 結果発表のファンファーレ中は BGM を小さくする
  function duck(seconds) {
    if (!ctx || !settings.bgm) return;
    const t = ctx.currentTime;
    bgmGain.gain.cancelScheduledValues(t);
    bgmGain.gain.setValueAtTime(bgmGain.gain.value, t);
    bgmGain.gain.linearRampToValueAtTime(0.02, t + 0.1);
    bgmGain.gain.setValueAtTime(0.02, t + seconds);
    bgmGain.gain.linearRampToValueAtTime(BGM_VOL, t + seconds + 0.8);
  }

  function setBgm(on) {
    settings.bgm = on;
    save();
    if (on) {
      if (init()) bgmGain.gain.value = BGM_VOL;
      startBgm();
    } else {
      stopBgm();
    }
  }

  function setSe(on) {
    settings.se = on;
    save();
  }

  // ---------- 大将の声（ブラウザの音声合成） ----------
  const synth = window.speechSynthesis;
  const chosen = { ja: null, en: null };
  function pickVoice() {
    if (!synth) return;
    const all = synth.getVoices();
    // 男性っぽい声があれば優先
    const ja = all.filter((v) => /^ja/i.test(v.lang));
    chosen.ja = ja.find((v) => /otoya|ichiro|keita|male|男性/i.test(v.name)) || ja[0] || null;
    const en = all.filter((v) => /^en/i.test(v.lang));
    chosen.en = en.find((v) => /daniel|alex|fred|david|male/i.test(v.name)) || en.find((v) => /^en-US/i.test(v.lang)) || en[0] || null;
  }
  if (synth) {
    pickVoice();
    synth.addEventListener?.('voiceschanged', pickVoice);
  }

  function say(text, lang = 'ja') {
    if (!settings.voice || !synth) return;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[「」…]/g, ''));
    u.lang = lang === 'en' ? 'en-US' : 'ja-JP';
    if (chosen[lang]) u.voice = chosen[lang];
    u.rate = lang === 'en' ? 1.05 : 1.15;
    u.pitch = 0.75;
    u.volume = 1;
    synth.speak(u);
  }

  function setVoice(on) {
    settings.voice = on;
    save();
    if (!on && synth) synth.cancel();
  }

  return {
    play, startBgm, stopBgm, duck, setBgm, setSe, say, setVoice,
    get voice() { return settings.voice; },
    get bgm() { return settings.bgm; },
    get se() { return settings.se; },
  };
})();
