// Sample word data + helpers
const SAMPLE_WORDS = [
  {
    id: "w-resilient",
    text: "resilient",
    pos: "adj.",
    cefr: "B2",
    phonetic: "/rɪˈzɪl.i.ənt/",
    definition: "Able to withstand or recover quickly from difficult conditions.",
    exampleGood: "She remained resilient through the long dissertation defense.",
    exampleBad: "She resilient the problem easily.",
    synonyms: ["tough", "adaptive", "buoyant"],
    antonyms: ["fragile", "brittle"],
    context: "She stayed resilient after the failure.",
    confidence: 3,
    accuracy: 0.62,
    reviews: 8,
    lastReviewed: "3 days ago",
    addedFrom: "Atlantic — “The Quiet Strength of Routines”",
    addedAt: "Apr 28",
    mps: 78,
    mpsParts: { time: 26, accuracy: 18, confidence: 9, failure: 14, frequency: 8, freshness: 3 },
    reason: "Slipping — accuracy fell below 70% over your last 3 attempts.",
    tags: ["non-fiction", "psychology"],
  },
  {
    id: "w-elucidate",
    text: "elucidate",
    pos: "verb",
    cefr: "C1",
    phonetic: "/ɪˈluː.sɪ.deɪt/",
    definition: "To make something clear; to explain.",
    exampleGood: "Could you elucidate the second hypothesis?",
    exampleBad: "I elucidate to the supermarket on Sundays.",
    synonyms: ["clarify", "explain", "illuminate"],
    antonyms: ["obscure", "muddle"],
    context: "Could you elucidate the second hypothesis?",
    confidence: 2,
    accuracy: 0.42,
    reviews: 5,
    lastReviewed: "yesterday",
    addedFrom: "Lecture — Phil 204, week 6",
    addedAt: "May 02",
    mps: 88,
    mpsParts: { time: 22, accuracy: 27, confidence: 13, failure: 15, frequency: 5, freshness: 6 },
    reason: "You missed this twice in a row — let's fix that today.",
    tags: ["academic"],
  },
  {
    id: "w-ephemeral",
    text: "ephemeral",
    pos: "adj.",
    cefr: "C1",
    phonetic: "/ɪˈfem.ər.əl/",
    definition: "Lasting for a very short time.",
    exampleGood: "The cherry blossoms are beautiful but ephemeral.",
    exampleBad: "The mountain is ephemeral and stands forever.",
    synonyms: ["fleeting", "transient", "momentary"],
    antonyms: ["permanent", "enduring"],
    context: "The cherry blossoms are beautiful but ephemeral.",
    confidence: 4,
    accuracy: 0.81,
    reviews: 12,
    lastReviewed: "5 days ago",
    addedFrom: "Notebook — May 1",
    addedAt: "Apr 14",
    mps: 64,
    mpsParts: { time: 22, accuracy: 9, confidence: 4, failure: 6, frequency: 9, freshness: 14 },
    reason: "It's been a while — a quick check keeps it fresh.",
    tags: ["literary"],
  },
  {
    id: "w-pragmatic",
    text: "pragmatic",
    pos: "adj.",
    cefr: "B2",
    phonetic: "/præɡˈmæt.ɪk/",
    definition: "Dealing with things sensibly and realistically.",
    exampleGood: "Her pragmatic approach saved the project.",
    exampleBad: "He pragmatic the chair to the corner.",
    synonyms: ["practical", "realistic", "down-to-earth"],
    antonyms: ["idealistic", "dogmatic"],
    context: "Her pragmatic approach saved the project.",
    confidence: 4,
    accuracy: 0.74,
    reviews: 9,
    lastReviewed: "2 days ago",
    addedFrom: "FT — “The Realist Turn”",
    addedAt: "Apr 22",
    mps: 52,
    mpsParts: { time: 14, accuracy: 11, confidence: 4, failure: 6, frequency: 8, freshness: 9 },
    reason: "Light touch — you're solid here, just a refresher.",
    tags: ["business"],
  },
  {
    id: "w-ubiquitous",
    text: "ubiquitous",
    pos: "adj.",
    cefr: "C1",
    phonetic: "/juːˈbɪk.wɪ.təs/",
    definition: "Present, appearing, or found everywhere.",
    exampleGood: "Smartphones are ubiquitous in urban life.",
    exampleBad: "He felt ubiquitous after the long flight.",
    synonyms: ["omnipresent", "pervasive", "universal"],
    antonyms: ["rare", "scarce"],
    context: "Smartphones are ubiquitous in urban life.",
    confidence: 5,
    accuracy: 0.92,
    reviews: 14,
    lastReviewed: "yesterday",
    addedFrom: "Wired — long-read",
    addedAt: "Apr 09",
    mps: 31,
    mpsParts: { time: 6, accuracy: 4, confidence: 2, failure: 2, frequency: 9, freshness: 8 },
    reason: "Mastered — surfacing it just to keep recall sharp.",
    tags: ["tech"],
  },
  {
    id: "w-cogent",
    text: "cogent",
    pos: "adj.",
    cefr: "C2",
    phonetic: "/ˈkəʊ.dʒənt/",
    definition: "Clear, logical, and convincing.",
    exampleGood: "She made a cogent argument for the policy change.",
    exampleBad: "The soup was cogent and hot.",
    synonyms: ["compelling", "persuasive", "lucid"],
    antonyms: ["unconvincing", "vague"],
    context: "She made a cogent argument for the policy change.",
    confidence: 2,
    accuracy: 0.35,
    reviews: 4,
    lastReviewed: "today",
    addedFrom: "NYT op-ed",
    addedAt: "May 04",
    mps: 91,
    mpsParts: { time: 6, accuracy: 28, confidence: 13, failure: 15, frequency: 6, freshness: 23 },
    reason: "New and tricky — let's lock it in this week.",
    tags: ["academic", "rhetoric"],
  },
  {
    id: "w-serendipity",
    text: "serendipity",
    pos: "noun",
    cefr: "C1",
    phonetic: "/ˌser.ənˈdɪp.ə.ti/",
    definition: "The occurrence of events by chance in a happy or beneficial way.",
    exampleGood: "Their meeting was a stroke of serendipity.",
    exampleBad: "He measured the serendipity in centimeters.",
    synonyms: ["chance", "fortune", "fluke"],
    antonyms: ["misfortune", "design"],
    context: "Their meeting was a stroke of serendipity.",
    confidence: 3,
    accuracy: 0.66,
    reviews: 6,
    lastReviewed: "4 days ago",
    addedFrom: "Podcast — Hidden Brain",
    addedAt: "Apr 18",
    mps: 58,
    mpsParts: { time: 18, accuracy: 14, confidence: 8, failure: 6, frequency: 5, freshness: 7 },
    reason: "A reasonable time has passed — quick check.",
    tags: ["literary"],
  },
  {
    id: "w-mitigate",
    text: "mitigate",
    pos: "verb",
    cefr: "B2",
    phonetic: "/ˈmɪt.ɪ.ɡeɪt/",
    definition: "To make something less severe, painful, or serious.",
    exampleGood: "The new policy will mitigate the housing crisis.",
    exampleBad: "She mitigates a strong opinion.",
    synonyms: ["alleviate", "ease", "lessen"],
    antonyms: ["aggravate", "worsen"],
    context: "The new policy will mitigate the housing crisis.",
    confidence: 3,
    accuracy: 0.58,
    reviews: 7,
    lastReviewed: "3 days ago",
    addedFrom: "Economist",
    addedAt: "Apr 25",
    mps: 71,
    mpsParts: { time: 22, accuracy: 19, confidence: 9, failure: 9, frequency: 8, freshness: 4 },
    reason: "On the edge — a couple correct answers will lift mastery.",
    tags: ["policy"],
  },
];

// Streak data — last 14 days
const STREAK = (() => {
  const arr = [];
  const states = ["done","done","done","partial","done","done","done","done","done","partial","done","done","done","today"];
  const days = ["Apr 27","Apr 28","Apr 29","Apr 30","May 1","May 2","May 3","May 4","May 5","May 6","May 7","May 8","May 9","May 10"];
  for (let i = 0; i < 14; i++) arr.push({ day: days[i], state: states[i] });
  return arr;
})();

// Today's review queue — IDs ordered by MPS desc
const TODAY_QUEUE = ["w-cogent","w-elucidate","w-resilient","w-mitigate","w-serendipity","w-ephemeral","w-pragmatic","w-ubiquitous"];

// Distractor pool for MCQ
const DISTRACTORS = {
  "w-resilient": ["Easily broken or damaged", "Lacking energy or interest", "Stubborn and unyielding"],
  "w-elucidate": ["To deliberately confuse", "To remove from a list", "To delay a decision"],
  "w-ephemeral": ["Lasting forever", "Heavy and dense", "Distant and cold"],
  "w-pragmatic": ["Driven by emotion alone", "Fearful of change", "Obsessed with detail"],
  "w-ubiquitous": ["Rarely seen", "Strongly disliked", "Extremely complex"],
  "w-cogent": ["Slow and meandering", "Wildly emotional", "Loosely connected"],
  "w-serendipity": ["A planned outcome", "An unfortunate accident", "A type of measurement"],
  "w-mitigate": ["To increase intensity", "To copy precisely", "To watch closely"],
};

// ===== Calendar / journal data =====
// 90 days of synthetic captures, each with words attached.
// Today = May 10, 2026.

const TODAY = new Date(2026, 4, 10); // months are 0-indexed
const fmtISO = (d) => d.toISOString().slice(0,10);
const fmtShort = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const fmtLong = (d) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

// Word-bank pool used to spread captures across days
const POOL = [
  "halcyon","quixotic","pellucid","obfuscate","laconic","equanimity","sanguine","mercurial",
  "stoic","ardent","winsome","lambent","perfunctory","scintilla","nadir","zenith","cogent",
  "verbose","lucid","austere","candid","didactic","esoteric","fastidious","garrulous","insipid",
  "judicious","keen","languid","meticulous","novel","obstinate","placate","quell","reticent",
  "sagacious","tenacious","ubiquitous","vex","wry","yield","zealous","abate","brevity","caustic",
  "deride","ebullient","frugal","gregarious","harangue","impede","jovial","kindle","levity",
  "munificent","nascent","opaque","penchant","quaint","ratify","sublime","truculent","unfettered",
  "venerate","wane","xenial","yearn","zephyr","aplomb","beguile","cajole","dapper","ephemeral",
  "fervent","gambit","heuristic","ingenious","jocular","kismet","limpid","maverick","nuance"
];
const CEFRS = ["A2","B1","B1","B2","B2","B2","C1","C1","C1","C2"];

let __seed = 11;
const rng = () => { __seed = (__seed*9301 + 49297) % 233280; return __seed/233280; };

const DAYS = []; // [{iso, date, weekday, count, reviewedPct, accuracy, words:[{id,text,cefr,reviewed,correct}]}]
let wordIdx = 0;

for (let i = 89; i >= 0; i--) {
  const d = new Date(TODAY); d.setDate(TODAY.getDate() - i);
  // Vary capture volume — more on weekdays, weekends quiet, occasional zero days
  const dow = d.getDay();
  let count;
  if (i === 0) count = 0; // today, no captures yet
  else if (rng() < 0.18) count = 0;
  else if (dow === 0 || dow === 6) count = Math.floor(rng()*3) + 1;
  else count = Math.floor(rng()*5) + 1;

  const words = [];
  for (let k = 0; k < count; k++) {
    const text = POOL[wordIdx % POOL.length]; wordIdx++;
    const cefr = CEFRS[Math.floor(rng()*CEFRS.length)];
    // Older words more likely to be reviewed
    const ageDays = i;
    const reviewed = ageDays > 1 ? rng() < (0.55 + Math.min(0.4, ageDays*0.01)) : false;
    const correct = reviewed ? rng() < 0.62 + (ageDays > 30 ? 0.15 : 0) : false;
    words.push({ id: `d-${fmtISO(d)}-${k}`, text, cefr, reviewed, correct });
  }
  const reviewedCount = words.filter(w => w.reviewed).length;
  const reviewedPct = count ? Math.round((reviewedCount/count)*100) : null;
  const correctCount = words.filter(w => w.correct).length;
  const accuracy = reviewedCount ? Math.round((correctCount/reviewedCount)*100) : null;

  DAYS.push({
    iso: fmtISO(d), date: d, dow, count, reviewedPct, accuracy, words,
  });
}

// 4-level label system — scholar's-notebook tone
//   Fallow    — captures exist but none reviewed   (neutral gray)
//   Tending   — reviewed, accuracy < 50%           (rose)
//   Steady    — accuracy 50-80%                    (gold)
//   Mastered  — accuracy ≥ 80%, ≥ 60% reviewed     (leaf)
const LABELS = {
  fallow:   { name: "Fallow",    color: "var(--rose)",                 bg: "oklch(0.95 0.04 25)",   desc: "Words sown, not yet reviewed." },
  tending:  { name: "Tending",   color: "var(--gold-deep)",            bg: "oklch(0.94 0.06 80)",   desc: "Reviewed but mostly missed — needs care." },
  steady:   { name: "Steady",    color: "oklch(0.45 0.08 145)",        bg: "oklch(0.94 0.05 145)",  desc: "Coming along — accuracy in the 50–80% range." },
  mastered: { name: "Mastered",  color: "oklch(0.32 0.13 145)",        bg: "oklch(0.88 0.13 145)",  desc: "Confidently retained — keep light touches." },
};

const labelFor = (day) => {
  if (!day || !day.count) return null;
  if (day.reviewedPct == null || day.reviewedPct < 30) return "fallow";
  if (day.accuracy == null) return "fallow";
  if (day.accuracy < 50) return "tending";
  if (day.accuracy < 80) return "steady";
  return "mastered";
};

const labelForRange = (days) => {
  const filled = days.filter(d => d.count > 0);
  if (!filled.length) return null;
  const totalWords = filled.reduce((a,d) => a + d.count, 0);
  const reviewed = filled.reduce((a,d) => a + d.words.filter(w => w.reviewed).length, 0);
  const correct = filled.reduce((a,d) => a + d.words.filter(w => w.correct).length, 0);
  const reviewedPct = Math.round(reviewed/totalWords*100);
  const accuracy = reviewed ? Math.round(correct/reviewed*100) : 0;
  let key;
  if (reviewedPct < 30) key = "fallow";
  else if (accuracy < 50) key = "tending";
  else if (accuracy < 80) key = "steady";
  else key = "mastered";
  return { key, totalWords, reviewedPct, accuracy };
};

// Vietnamese meanings (mock — sample dictionary)
const VIETNAMESE = {
  "resilient":   { meaning: "kiên cường, bền bỉ", example: "Cô ấy vẫn kiên cường suốt buổi bảo vệ luận án." },
  "elucidate":   { meaning: "làm sáng tỏ, giải thích rõ", example: "Bạn có thể giải thích rõ giả thuyết thứ hai không?" },
  "ephemeral":   { meaning: "phù du, ngắn ngủi", example: "Hoa anh đào đẹp nhưng phù du." },
  "pragmatic":   { meaning: "thực dụng, thực tế", example: "Cách tiếp cận thực dụng của cô đã cứu cả dự án." },
  "ubiquitous":  { meaning: "hiện diện khắp nơi, phổ biến", example: "Điện thoại thông minh hiện diện khắp nơi trong đời sống đô thị." },
  "cogent":      { meaning: "thuyết phục, hợp lý", example: "Cô đưa ra một lập luận thuyết phục cho việc thay đổi chính sách." },
  "serendipity": { meaning: "may mắn tình cờ", example: "Cuộc gặp gỡ của họ là một sự may mắn tình cờ." },
  "mitigate":    { meaning: "làm giảm nhẹ, xoa dịu", example: "Chính sách mới sẽ làm giảm nhẹ khủng hoảng nhà ở." },
};
window.VIETNAMESE = VIETNAMESE;
window.getVietnamese = (text) => VIETNAMESE[text?.toLowerCase()] || null;

window.SAMPLE_WORDS = SAMPLE_WORDS;
window.STREAK = STREAK;
window.TODAY_QUEUE = TODAY_QUEUE;
window.DISTRACTORS = DISTRACTORS;
window.DAYS = DAYS;
window.LABELS = LABELS;
window.labelFor = labelFor;
window.labelForRange = labelForRange;
window.fmtShort = fmtShort;
window.fmtLong = fmtLong;
window.TODAY_DATE = TODAY;
window.getWord = (id) => {
  // Search SAMPLE_WORDS first
  const sample = SAMPLE_WORDS.find(w => w.id === id);
  if (sample) return sample;
  // Then search synthetic per-day words
  for (const d of DAYS) {
    const w = d.words.find(x => x.id === id);
    if (w) {
      // Try to find a SAMPLE_WORDS template by text match for richer fields
      const tmpl = SAMPLE_WORDS.find(s => s.text === w.text);
      const base = tmpl || SAMPLE_WORDS[0];
      return {
        ...base,
        ...w,
        id: w.id,
        text: w.text,
        cefr: w.cefr,
        definition: w.meaning || base.definition,
        confidence: w.confidence || 2,
        addedAt: d.iso,
        addedFrom: w.source || base.addedFrom,
        context: w.context || base.context,
        accuracy: w.correct ? 0.85 : (w.reviewed ? 0.35 : 0),
        reason: w.reason || base.reason,
      };
    }
  }
  return null;
};
