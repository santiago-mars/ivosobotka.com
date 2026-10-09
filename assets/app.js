// Ivo Sobotka & tým — interakce homepage.
// Obsah tří "dveří" (zakázky / prodeje / lidi) mění průchod "Prvních 10 minut".
// Ukázky hovorů (call) jsou v assets/hovory.js — text replik musí sedět s nahrávkou.

const DOORS = {
  zakazky: {
    video: "/media/feed-zakazky.mp4",
    poster: "/media/feed-zakazky.jpg",
    d: ["00:00", "00:40", "09:40", "DEN 2", "DEN 14"],
    t: [
      "Pan Novák o polední pauze scrolluje Instagram. Uvidí video, ve kterém mluví majitel firmy.",
      "Klikne a odpoví na pár krátkých otázek. Kdo si jen hraje nebo na to nemá, odpadne.",
      "Zazvoní mu telefon.",
      "Sedí u vás na schůzce.",
      "Podpis.",
      "Tohle celé postavíme a rozjedeme: video, formulář, volání, skripty, školení, CRM. Vy děláte, co umíte nejlépe: uzavíráte obchody a doručujete svou službu."
    ],
    q: [
      ["Co plánujete?", "Dům na klíč"],
      ["Máte pozemek?", "Ano, u Prahy"],
      ["Kdy chcete začít?", "Do půl roku"],
      ["Jak budete financovat?", "Hypotéka, předschválená"]
    ],
    n5: "Takhle se za první 4 měsíce prodaly byty za víc než 41 milionů."
  },
  lidi: {
    video: "/media/feed-lidi.mp4",
    poster: "/media/feed-lidi.jpg",
    d: ["00:00", "00:40", "09:40", "DEN 2", "DEN 14"],
    t: [
      "Pan Novák o polední pauze scrolluje Instagram. Uvidí video, ve kterém mluví ředitel pobočky o práci v týmu.",
      "Klikne a odpoví na pár krátkých otázek. Kdo hledá jen jistý plat nebo si jen hraje, odpadne.",
      "Zazvoní mu telefon.",
      "Sedí u vás na pohovoru.",
      "Podpis smlouvy.",
      "Tohle celé postavíme a rozjedeme: video, formulář, volání, skripty, školení, CRM. Vy děláte, co umíte nejlépe: pohovory a zapracování."
    ],
    q: [
      ["Kde bydlíte?", "Mladá Boleslav"],
      ["Máte maturitu?", "Ano"],
      ["Kolik času tomu dáte?", "Plný úvazek"],
      ["Kdy můžete začít?", "Od příštího měsíce"]
    ],
    n5: "Takhle vzniklo 23 podepsaných smluv za 3 měsíce."
  },
  prodeje: {
    video: "/media/feed-prodeje.mp4",
    poster: "/media/feed-prodeje.jpg",
    d: ["00:00", "00:40", "09:40", "DEN 2", "DEN 30"],
    t: [
      "Pan Novák o polední pauze scrolluje Instagram. Uvidí video se silnou nabídkou, ve kterém mluví člověk z firmy.",
      "Klikne a odpoví na pár krátkých otázek. Kdo se jen kouká, odpadne.",
      "Zazvoní mu telefon.",
      "Stojí u vás v prodejně nebo má objednávku v košíku.",
      "Nakupuje podruhé.",
      "Tohle celé postavíme a rozjedeme: video, nabídku, formulář, volání, CRM. Vy děláte, co umíte nejlépe: prodáváte a obsluhujete."
    ],
    q: [
      ["Pro koho vybíráte?", "Pro manželku"],
      ["Jaká je příležitost?", "Výročí"],
      ["S jakou částkou počítáte?", "Kolem 20 000 Kč"],
      ["Kdy to potřebujete?", "Do Vánoc"]
    ],
    n5: "Takhle vzniklo 335 000 Kč obratu za 3 týdny. Z videa natočeného na telefon."
  }
};

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => Array.from(root.querySelectorAll(s));
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let door = "zakazky";

// Podstránka může dveře upravit (window.DOOR_PATCH) a předvolit (data-door na <body>).
function applyPagePatch() {
  Object.keys(window.HOVORY || {}).forEach((k) => { if (DOORS[k]) DOORS[k].call = window.HOVORY[k]; });
  const patch = window.DOOR_PATCH || {};
  Object.keys(patch).forEach((k) => { if (DOORS[k]) Object.assign(DOORS[k], patch[k]); });
  if (DOORS[document.body.dataset.door]) door = document.body.dataset.door;
}

function pickDoorFromUrl() {
  const p = new URLSearchParams(location.search).get("pro");
  const h = location.hash.replace("#", "");
  const key = DOORS[p] ? p : (DOORS[h] ? h : null);
  if (key) door = key;
}

function renderDoor() {
  const v = DOORS[door];
  $$(".door").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.door === door)));
  $$("[data-d]").forEach((el) => { el.textContent = v.d[Number(el.dataset.d)]; });
  $$("[data-t]").forEach((el) => { el.textContent = v.t[Number(el.dataset.t)]; });
  const n5 = $("[data-n5]");
  if (n5) n5.textContent = v.n5;
  $$(".q").forEach((el, i) => {
    $(".q__q", el).textContent = v.q[i][0];
    $(".q__a", el).textContent = v.q[i][1];
  });
  const feed = $("#feed-video");
  if (feed && feed.dataset.src !== v.video) {
    feed.dataset.src = v.video;
    feed.poster = v.poster;
    feed.src = v.video;
    feed.play().catch(() => {});
  }
  resetCall();
  tick();
}

// ---------- Hodiny průchodu ----------
// Čas plynule běží podle toho, jak daleko čtenář v průchodu je: dolů roste, nahoru klesá.
const SECS = [0, 40, 580]; // 00:00, 00:40, 09:40

function fmtClock(s) {
  s = Math.max(0, Math.round(s));
  return String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
}

function walkProgress() {
  // Pozice v průchodu: <1 před první zastávkou, 1…6 mezi zastávkami (podle středu obrazovky).
  const mid = window.innerHeight / 2;
  const stops = $$("[data-stop]").map((el) => {
    const r = el.getBoundingClientRect();
    return r.top + Math.min(r.height / 2, window.innerHeight / 3);
  });
  if (!stops.length) return 0;
  if (mid < stops[0]) return 1 - (stops[0] - mid) / window.innerHeight;
  for (let i = 0; i < stops.length - 1; i++) {
    if (mid < stops[i + 1]) return i + 1 + (mid - stops[i]) / (stops[i + 1] - stops[i]);
  }
  return stops.length;
}

function tick() {
  const clock = $("#clock");
  if (!clock) return;
  const p = walkProgress();
  const v = DOORS[door];
  let label;
  if (p < 3) {
    const q = Math.max(1, p);
    const i = Math.min(1, Math.floor(q) - 1);
    const f = Math.min(1, q - (i + 1));
    label = fmtClock(SECS[i] + (SECS[i + 1] - SECS[i]) * f);
  } else if (p < 4) label = v.d[2];
  else if (p < 5) label = v.d[3];
  else label = v.d[4];
  $("span", clock).textContent = label;
  clock.classList.toggle("is-visible", p >= 0.9 && p < 5.6);
  clock.classList.toggle("is-dark", p >= 4.7);
  // Otázky se odklikávají postupně, jak čtenář projíždí formulář.
  const qp = (p - 1.6) / 0.9;
  $$(".q").forEach((el, i) => el.classList.toggle("is-done", reduced ? p >= 1.6 : qp >= (i + 1) / 4));
}

// ---------- Ukázka hovoru ----------
const audio = new Audio();
audio.preload = "none";
let lineTimes = [];

function resetCall() {
  audio.pause();
  const call = $("#call");
  if (!call) return;
  call.classList.remove("is-playing", "is-done");
  $("#call-accept").hidden = false;
  $("#call-again").hidden = true;
  $("#call-hangup").hidden = true;
  $("#call-progress").hidden = true;
  $("#call-lines").innerHTML = "";
}

function buildLines() {
  const box = $("#call-lines");
  box.innerHTML = "";
  DOORS[door].call.lines.forEach(([who, text]) => {
    const p = document.createElement("p");
    p.className = "call__line";
    p.hidden = true;
    p.innerHTML = `<b></b><span></span>`;
    p.querySelector("b").textContent = who + ":";
    p.querySelector("span").textContent = text;
    box.appendChild(p);
  });
}

// Bez přesných časů repliky rozložíme podle délky textu.
function estimateLineTimes(duration) {
  const lines = DOORS[door].call.lines;
  const total = lines.reduce((s, l) => s + l[1].length, 0);
  let acc = 0;
  lineTimes = lines.map((l) => { const t = (acc / total) * duration; acc += l[1].length; return t; });
}

function fmt(sec) {
  const s = Math.max(0, Math.round(sec));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

function acceptCall() {
  const c = DOORS[door].call;
  muteOthers(null);
  buildLines();
  const call = $("#call");
  call.classList.add("is-playing");
  call.classList.remove("is-done");
  $("#call-accept").hidden = true;
  $("#call-again").hidden = true;
  $("#call-hangup").hidden = false;
  $("#call-progress").hidden = false;
  if (!audio.src.endsWith(c.src)) audio.src = c.src;
  audio.currentTime = 0;
  audio.play().catch(() => showAllLines());
}

function showAllLines() {
  $$(".call__line").forEach((p) => { p.hidden = false; });
  endCall();
}

function endCall() {
  audio.pause();
  const call = $("#call");
  call.classList.remove("is-playing");
  call.classList.add("is-done");
  $("#call-hangup").hidden = true;
  $("#call-again").hidden = false;
  $$(".call__line").forEach((p) => { p.hidden = false; p.classList.remove("is-now"); });
}

audio.addEventListener("loadedmetadata", () => {
  const t = DOORS[door].call.times;
  if (t && t.length === DOORS[door].call.lines.length) lineTimes = t;
  else estimateLineTimes(audio.duration);
});
audio.addEventListener("timeupdate", () => {
  const d = audio.duration || 1;
  $("#call-bar").style.width = (audio.currentTime / d * 100) + "%";
  $("#call-time").textContent = fmt(d - audio.currentTime);
  const lines = $$(".call__line");
  let now = -1;
  lineTimes.forEach((t, i) => { if (audio.currentTime >= t) now = i; });
  lines.forEach((p, i) => {
    if (i <= now) p.hidden = false;
    p.classList.toggle("is-now", i === now);
  });
  const cur = lines[now];
  if (cur && cur.dataset.seen !== "1") {
    cur.dataset.seen = "1";
    const box = $("#call-lines");
    box.scrollTop = box.scrollHeight;
  }
});
audio.addEventListener("ended", endCall);
audio.addEventListener("error", () => { if ($("#call").classList.contains("is-playing")) showAllLines(); });

// ---------- Videa: hrají sama bez zvuku, vpravo dole přepínač zvuku ----------
const ICON_OFF = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z"/><path d="M16 9.5l5 5m0-5l-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
const ICON_ON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.6 7.6 0 0 1 0 11" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

function renderMute(btn, video) {
  btn.innerHTML = video.muted ? ICON_OFF : ICON_ON;
  btn.setAttribute("aria-label", video.muted ? "Zapnout zvuk" : "Vypnout zvuk");
  btn.classList.toggle("is-on", !video.muted);
}

// Se zvukem smí hrát jen jedno video naráz.
function muteOthers(except) {
  $$("video").forEach((v) => { if (v !== except && !v.muted) { v.muted = true; const b = v.parentElement.querySelector(".vmute"); if (b) renderMute(b, v); } });
  if (except) audio.pause();
}

function wireMute(video) {
  const btn = video.parentElement.querySelector(".vmute");
  if (!btn) return;
  video.muted = true;
  renderMute(btn, video);
  btn.addEventListener("click", () => {
    video.muted = !video.muted;
    if (!video.muted) { muteOthers(video); video.play().catch(() => {}); }
    renderMute(btn, video);
  });
}

// ---------- Ukázky videí ----------
// Popisky podle oboru, ne jménem klienta. Byty (VAD-0032) jsou už v průchodu, proto tu nejsou.
const SHOWCASE = [
  { src: "/media/ukazka-1.mp4", poster: "/media/ukazka-1.jpg", label: "Investiční apartmány ve Španělsku" },
  { src: "/media/ukazka-6.mp4", poster: "/media/ukazka-6.jpg", label: "Investice pro mladé" },
  { src: "/media/ukazka-3.mp4", poster: "/media/ukazka-3.jpg", label: "Nábor finančních poradců" },
  { src: "/media/ukazka-2.mp4", poster: "/media/ukazka-2.jpg", label: "Apartmány u moře: příběh investorky" },
  { src: "/media/ukazka-4.mp4", poster: "/media/ukazka-4.jpg", label: "Nábor obchodníků do financí" },
  { src: "/media/ukazka-7.mp4", poster: "/media/ukazka-7.jpg", label: "E-shop: unboxing produktu" }
];

function initShowcase() {
  const tabs = $("#showcase-tabs");
  const video = $("#showcase-video");
  if (!tabs || !video) return;
  const items = (window.SHOWCASE_EXTRA || []).concat(SHOWCASE);
  let current = 0;
  const select = (i) => {
    current = i;
    const item = items[i];
    $$(".showcase__tab", tabs).forEach((t, j) => t.setAttribute("aria-selected", String(j === i)));
    video.poster = item.poster;
    video.src = item.src;
    video.play().catch(() => {});
  };
  items.forEach((item, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "showcase__tab";
    b.setAttribute("role", "tab");
    b.innerHTML = `<span>0${i + 1}</span><b></b>`;
    b.querySelector("b").textContent = item.label;
    b.style.fontWeight = "inherit";
    b.addEventListener("click", () => select(i));
    tabs.appendChild(b);
  });
  video.addEventListener("ended", () => select((current + 1) % items.length));
  video.poster = items[0].poster;
  video.src = items[0].src;
  $$(".showcase__tab", tabs)[0].setAttribute("aria-selected", "true");
}

// ---------- Start ----------
// Po obnovení stránky vždy začít nahoře (prohlížeč jinak skočí na poslední pozici).
if ("scrollRestoration" in history) history.scrollRestoration = "manual";

document.addEventListener("DOMContentLoaded", () => {
  if (!location.hash) window.scrollTo(0, 0);
  applyPagePatch();
  pickDoorFromUrl();

  $$(".door").forEach((b) => b.addEventListener("click", () => {
    door = b.dataset.door;
    const url = new URL(location.href);
    url.searchParams.set("pro", door);
    history.replaceState(null, "", url);
    renderDoor();
  }));

  $("#call-accept").addEventListener("click", acceptCall);
  $("#call-again").addEventListener("click", acceptCall);
  $("#call-hangup").addEventListener("click", endCall);

  // Přímo při posunu (6 měření je levné); requestAnimationFrame by na skryté kartě neběžel.
  let last = 0;
  const onScroll = () => {
    const now = Date.now();
    if (now - last > 30) { last = now; tick(); }
    clearTimeout(onScroll.t); onScroll.t = setTimeout(tick, 60);
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  // Videa na pozadí hrají jen, když jsou vidět (šetří data na mobilu).
  const vio = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      const v = e.target;
      if (e.isIntersecting) v.play().catch(() => {});
      else if (v.muted) v.pause();
    });
  }, { threshold: 0.1 });
  $$("video[data-autoplay]").forEach((v) => vio.observe(v));

  $$("video").forEach(wireMute);
  initShowcase();
  renderDoor();
});
