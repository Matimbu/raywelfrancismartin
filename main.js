// Builds the page from SITE (content.js) and runs the animations.

const $ = (id) => document.getElementById(id);
const root = document.documentElement;
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const canHover = matchMedia("(hover: hover) and (pointer: fine)").matches;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function isTodo(...texts) {
  return texts.some((t) => typeof t === "string" && t.includes("TODO"));
}

function linkify(node, url) {
  if (!url) return;
  node.href = url;
  if (!url.startsWith("mailto:") && !url.startsWith("#")) {
    node.target = "_blank";
    node.rel = "noopener";
  }
}

const pad2 = (n) => String(n).padStart(2, "0");

// A hover has to be one the visitor actually made. "mouseenter" alone isn't
// that: closing a panel or the photo viewer over something, or the page
// shifting under a still cursor, hands it a hover nobody asked for. A real
// hover always carries a mousemove inside in the same breath, so wait for it.
function onHover(node, run) {
  let entered = false;
  node.addEventListener("mouseenter", () => (entered = true));
  node.addEventListener("mouseleave", () => (entered = false));
  node.addEventListener("mousemove", () => {
    if (!entered) return;
    entered = false; // once per visit, like mouseenter
    run();
  });
}

// Placeholders (anything containing "TODO") only show while previewing on
// your own computer, so the live site never shows unfinished bits.
const isPreview = ["localhost", "127.0.0.1", ""].includes(location.hostname);
if (!isPreview) {
  const finished = (item) =>
    !isTodo(...(typeof item === "string" ? [item] : Object.values(item).filter((v) => typeof v === "string")));
  ["about", "now", "crafts", "hobbies", "beliefs", "youtube", "links"].forEach((key) => {
    SITE[key] = SITE[key].filter(finished);
  });
}

// ============================================================
//  Smooth scrolling (Lenis). Falls back to normal scrolling.
// ============================================================
let lenis = null;
if (window.Lenis && !reduceMotion) {
  lenis = new Lenis({ lerp: 0.09 });
  const raf = (time) => {
    lenis.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
}

document.addEventListener("click", (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;
  const hash = link.getAttribute("href");
  const target = hash === "#top" ? 0 : document.querySelector(hash);
  if (target === null) return;
  e.preventDefault();
  if (lenis) {
    lenis.scrollTo(target, { offset: target === 0 ? 0 : -60, duration: 1.6 });
  } else if (target === 0) {
    scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  } else {
    target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
  }
});

// ============================================================
//  Scroll scenes: parts come together as they scroll into view and
//  dissolve as they scroll away. Each scene gets --in and --out (0 to 1)
//  and its CSS decides what gathering and dissolving look like.
// ============================================================
const scenes = [];
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const smooth = (t) => t * t * (3 - 2 * t);

// `leave`: how high up the screen (share of its height) a scene's bottom
// edge has to climb before the scene starts to dissolve
function addScene(node, leave = 0.1) {
  if (reduceMotion) return;
  node.classList.add("gather");
  node.dataset.leave = leave;
  scenes.push(node);
}

function updateScenes() {
  const vh = innerHeight;
  scenes.forEach((n) => {
    const r = n.getBoundingClientRect();
    // "landed" once it's fully in; cleared once it's off screen (however far),
    // so whatever is keyed to it (medals, a photo thumb) plays again next time
    const onScreen = r.bottom > 0 && r.top < vh;
    if (!onScreen) n.classList.toggle("landed", false);
    if (r.bottom < -vh * 0.25 || r.top > vh * 1.25) return;
    const edge = vh * n.dataset.leave;
    const enter = smooth(clamp01((vh - r.top) / (vh * 0.4)));
    const leave = smooth(clamp01((edge - r.bottom) / (edge + r.height * 0.6)));
    const fill = smooth(clamp01((vh * 0.72 - r.top) / (vh * 0.3)));
    n.style.setProperty("--in", enter.toFixed(3));
    n.style.setProperty("--out", leave.toFixed(3));
    n.style.setProperty("--fill", fill.toFixed(3));
    if (onScreen && enter >= 1) n.classList.toggle("landed", true);
  });
}

// Adds `cls` once `ratio` of a node is on screen and removes it once the node
// has fully left, so whatever it starts plays again next time
function playOnView(node, cls, ratio) {
  new IntersectionObserver(([entry]) => {
    if (entry.intersectionRatio >= ratio) node.classList.add(cls);
    else if (!entry.isIntersecting) node.classList.remove(cls);
  }, { threshold: [0, ratio] }).observe(node);
}

// Walls with `lightUp`: their words light one after another as the wall
// moves through the middle of the screen
const lightWalls = [];
function updateLightWalls() {
  const vh = innerHeight;
  lightWalls.forEach((words) => {
    const r = words.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) return;
    const items = words.children;
    const lit = Math.round(clamp01((vh * 0.85 - r.top) / (vh * 0.45)) * items.length);
    [...items].forEach((item, i) => item.classList.toggle("lit", i < lit));
  });
}

// ============================================================
//  Text effects
// ============================================================

// Letters flicker through random characters before settling.
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>";
function scramble(node, text, duration = 1000, delay = 0) {
  node.setAttribute("aria-label", text);
  if (reduceMotion) {
    node.textContent = text;
    node.classList.add("on");
    return;
  }
  const chars = [...text];
  const settleAt = chars.map((_, i) => (i / chars.length) * 0.75 + Math.random() * 0.25);
  const run = (node.scrambleRun = (node.scrambleRun || 0) + 1); // a newer one takes over
  setTimeout(() => {
    if (node.scrambleRun !== run) return;
    node.classList.add("on");
    const start = performance.now();
    const frame = (now) => {
      if (node.scrambleRun !== run) return;
      const p = Math.min(1, (now - start) / duration);
      node.textContent = chars
        .map((c, i) => (c === " " || p >= settleAt[i] ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
        .join("");
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }, delay);
}

// Letters shuffle through the alphabet (keeping each letter's case) and
// settle left to right. The word keeps its width meanwhile so nothing
// around it jumps.
function shuffleWord(node, text, duration = 900, delay = 0) {
  const chars = [...text];
  const settleAt = chars.map((_, i) => (i / chars.length) * 0.7 + Math.random() * 0.3);
  const abc = "abcdefghijklmnopqrstuvwxyz";
  const any = (c) => {
    const r = abc[(Math.random() * 26) | 0];
    return c === c.toUpperCase() ? r.toUpperCase() : r;
  };
  node.style.display = "inline-block";
  node.style.minWidth = `${node.offsetWidth}px`;
  setTimeout(() => {
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / duration);
      node.textContent = chars.map((c, i) => (!/[a-z]/i.test(c) || p >= settleAt[i] ? c : any(c))).join("");
      if (p < 1) requestAnimationFrame(step);
      else node.style.minWidth = "";
    };
    requestAnimationFrame(step);
  }, delay);
}

// Wraps each letter in a span so a heading can rise into view.
// Keeps words together and keeps inline tags like <em>.
function splitLetters(node) {
  const label = node.textContent.replace(/\s+/g, " ").trim();
  const parts = [...node.childNodes];
  node.textContent = "";
  node.setAttribute("aria-label", label);
  let i = 0;
  parts.forEach((part) => {
    const wrapper = part.nodeType === Node.ELEMENT_NODE ? part.cloneNode(false) : null;
    const host = wrapper || node;
    part.textContent.split(/(\s+)/).forEach((word) => {
      if (!word) return;
      if (/^\s+$/.test(word)) {
        host.appendChild(document.createTextNode(" "));
        return;
      }
      const w = el("span", "w");
      w.setAttribute("aria-hidden", "true");
      [...word].forEach((ch) => {
        const c = el("span", "c", ch);
        c.style.setProperty("--i", i++);
        w.appendChild(c);
      });
      host.appendChild(w);
    });
    if (wrapper) node.appendChild(wrapper);
  });
}

// "text [label](url) text" -> text with real links in it.
function appendWithLinks(node, text) {
  text.split(/(\[[^\]]+\]\([^)]+\))/).filter(Boolean).forEach((part) => {
    const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (match) {
      const a = el("a", "inline-link", match[1]);
      linkify(a, match[2]);
      node.appendChild(a);
    } else {
      node.appendChild(document.createTextNode(part));
    }
  });
}

// "plain *strong* plain" -> word spans for the scroll-linked fill.
function splitWords(node, text) {
  node.setAttribute("aria-label", text.replace(/\*/g, ""));
  text.split(/(\*[^*]+\*)/).filter(Boolean).forEach((chunk) => {
    const strong = chunk.startsWith("*");
    const words = (strong ? chunk.slice(1, -1) : chunk).split(/(\s+)/);
    words.forEach((word) => {
      if (!word) return;
      if (/^\s+$/.test(word)) {
        node.appendChild(document.createTextNode(" "));
        return;
      }
      const w = el("span", strong ? "fw strong" : "fw", word);
      w.setAttribute("aria-hidden", "true");
      node.appendChild(w);
    });
  });
}

// ============================================================
//  Header + clock
// ============================================================
$("brand").textContent = SITE.initials;
$("footName").textContent = SITE.fullName;
if (SITE.motto) splitWords($("footMotto"), SITE.motto); // lights up at the very bottom
else $("footMotto").remove();
// The footer year rolls up from the story's first year as the footer arrives
const thisYear = String(new Date().getFullYear());
const sinceYear = String(SITE.story?.items?.[0]?.year || "");
const yearNode = $("year");
yearNode.textContent = thisYear;
if (!reduceMotion && /^\d{4}$/.test(sinceYear) && sinceYear < thisYear) {
  yearNode.textContent = "";
  const digits = rollingDigits(thisYear);
  digits.querySelectorAll(".odo-strip").forEach((strip, i) => strip.style.setProperty("--f", sinceYear[i]));
  yearNode.append(digits, el("span", "sr-only", thisYear));
  yearNode.classList.add("year-roll");
  playOnView(yearNode, "rolled", 0.9);
}
document.title = `${SITE.firstName} ${SITE.lastName}`;

const portfolioLink = $("portfolioLink");
if (SITE.portfolio) portfolioLink.href = SITE.portfolio;
else portfolioLink.remove();

const town = SITE.place.name.split(",")[0];
// The clocks' digits roll like the counters when they change. Each digit is
// a strip of 0-9 twice, so 9 -> 0 keeps rolling forward and then quietly
// snaps back to the first 0.
function rollText(node, text) {
  if (reduceMotion) {
    node.textContent = text;
    return;
  }
  const shape = text.replace(/\d/g, "0");
  if (node.dataset.shape !== shape) {
    node.dataset.shape = shape;
    node.textContent = "";
    const visible = el("span", "roll");
    visible.setAttribute("aria-hidden", "true");
    [...text].forEach((ch) => {
      if (!/\d/.test(ch)) {
        // non-breaking, because a plain space at the start of a run gets dropped
        visible.appendChild(document.createTextNode(ch === " " ? "\u00a0" : ch));
        return;
      }
      const strip = el("span", "odo-strip roll-strip");
      for (let k = 0; k < 20; k++) strip.appendChild(el("span", "", String(k % 10)));
      const odo = el("span", "odo");
      odo.appendChild(strip);
      visible.appendChild(odo);
    });
    node.append(visible, el("span", "sr-only"));
  }
  node.lastChild.textContent = text; // what screen readers hear
  const strips = node.querySelectorAll(".roll-strip");
  let k = 0;
  [...text].forEach((ch) => {
    if (!/\d/.test(ch)) return;
    const strip = strips[k++];
    const next = +ch;
    const prev = strip.dataset.d === undefined ? null : +strip.dataset.d;
    strip.dataset.d = next;
    if (prev === null) {
      strip.style.transition = "none";
      strip.style.transform = `translateY(${-next}em)`;
      requestAnimationFrame(() => (strip.style.transition = ""));
    } else if (next > prev) {
      strip.style.transform = `translateY(${-next}em)`;
    } else if (next < prev) {
      strip.style.transform = `translateY(${-(next + 10)}em)`;
      setTimeout(() => {
        if (+strip.dataset.d !== next) return;
        strip.style.transition = "none";
        strip.style.transform = `translateY(${-next}em)`;
        void strip.offsetHeight;
        strip.style.transition = "";
      }, 560);
    }
  });
}

// Digits that roll into place once (CSS moves the strips): each digit is a
// 0-9 strip with --n (where it stops) and --k (its place among the digits).
// `spin` adds a full turn first, like a dial searching before it settles.
function rollingDigits(text, spin = false) {
  const wrap = el("span", "roll");
  wrap.setAttribute("aria-hidden", "true");
  let k = 0;
  [...text].forEach((ch) => {
    // non-breaking, because a plain space at the start of a run gets dropped
    if (!/\d/.test(ch)) return wrap.append(ch === " " ? "\u00a0" : ch);
    const strip = el("span", "odo-strip");
    for (let d = 0; d < (spin ? 20 : 10); d++) strip.appendChild(el("span", "", String(d % 10)));
    strip.style.setProperty("--n", Number(ch) + (spin ? 10 : 0));
    strip.style.setProperty("--k", k++);
    const odo = el("span", "odo");
    odo.appendChild(strip);
    wrap.appendChild(odo);
  });
  return wrap;
}

function tick() {
  const now = new Date();
  const opts = { timeZone: SITE.timezone, hour: "2-digit", minute: "2-digit", hour12: false };
  rollText($("clock"), `${town} ${now.toLocaleTimeString("en-GB", opts)}`);
  const full = now.toLocaleTimeString("en-GB", { ...opts, second: "2-digit", timeZoneName: "shortOffset" });
  rollText($("footClock"), `Local time ${full}`);
}
tick();
setInterval(tick, 1000);

const toggle = $("themeToggle");
toggle.addEventListener("click", () => {
  const next = root.dataset.theme === "light" ? "dark" : "light";
  const apply = () => {
    root.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) {}
  };
  if (!document.startViewTransition || reduceMotion) {
    apply();
    return;
  }
  // The new theme spreads out from the toggle as a growing circle. The page's
  // own colour fades pause meanwhile so the two effects don't mix.
  const r = toggle.getBoundingClientRect();
  const x = r.left + r.width / 2;
  const y = r.top + r.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  root.classList.add("theme-switching");
  const switching = document.startViewTransition(apply);
  switching.ready.then(() => {
    root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
      { duration: 750, easing: "cubic-bezier(0.22, 1, 0.36, 1)", pseudoElement: "::view-transition-new(root)" }
    );
  });
  switching.finished.finally(() => root.classList.remove("theme-switching"));
});

// ============================================================
//  Hero
// ============================================================

// Each letter's delay follows a U-shaped curve: the outer letters land
// first and the middle ones follow. Scrolling lifts them along the same
// curve, so the name bends into a smile as you leave the hero.
function buildName(node, lines) {
  node.setAttribute("aria-label", lines.join(" "));
  lines.forEach((line, row) => {
    const lineEl = el("span", "name-line");
    lineEl.setAttribute("aria-hidden", "true");
    const letters = [...line];
    letters.forEach((ch, i) => {
      const t = letters.length > 1 ? i / (letters.length - 1) : 0.5;
      const curve = Math.abs(Math.cos(t * Math.PI));
      const outer = el("span", "nl");
      outer.style.setProperty("--delay", `${Math.round((1 - curve) * 550 + row * 180)}ms`);
      const inner = el("span", "nl-in", ch);
      inner.style.setProperty("--c", curve.toFixed(3));
      outer.appendChild(inner);
      lineEl.appendChild(outer);
    });
    node.appendChild(lineEl);
  });
}
buildName($("heroName"), [SITE.firstName, SITE.lastName]);

const roles = $("roles");
const statement = $("statement");
roles.textContent = SITE.roles.join(" · ");
statement.textContent = SITE.statement;

// Location card
const place = $("place");
[
  ["place-label", `📍 ${SITE.place.label}`],
  ["place-name", SITE.place.name],
  ["place-row", `Pronounced as  ${SITE.place.pronounced}`],
  ["place-row", SITE.place.note],
  ["place-row place-coords", SITE.place.coords]
].forEach(([cls, text]) => text && place.appendChild(el("span", cls, text)));
// The coordinates spin and lock onto the town as the card appears, like a GPS
// getting its fix (timed off body.ready in style.css)
const coords = place.querySelector(".place-coords");
if (coords && !reduceMotion) {
  coords.textContent = "";
  coords.classList.add("locating");
  coords.append(rollingDigits(SITE.place.coords, true), el("span", "sr-only", SITE.place.coords));
}

// Floating cards
const floaterEls = SITE.floaters.map((f, i) => {
  const card = el("div", "floater");
  card.style.setProperty("--i", i);
  const inner = el("div", "floater-in");
  if (f.photo) {
    const img = el("img");
    img.src = f.photo;
    img.alt = "";
    // If the photo is missing, fall back to the emoji
    img.onerror = () => img.replaceWith(el("span", "", f.emoji));
    inner.appendChild(img);
  } else {
    inner.appendChild(el("span", "", f.emoji));
  }
  card.appendChild(inner);
  if (f.badge) {
    const badge = el("span", "floater-badge", f.badge);
    card.appendChild(badge);
    // Hovering wiggles the badge (CSS); a tap does the same on phones
    card.addEventListener("click", () => {
      badge.classList.remove("wiggle");
      void badge.offsetWidth; // restart the animation
      badge.classList.add("wiggle");
    });
    badge.addEventListener("animationend", () => badge.classList.remove("wiggle"));
  }
  $("floaters").appendChild(card);
  return card;
});

// Marquee (content doubled so the loop is seamless)
const track = $("marquee");
for (let copy = 0; copy < 2; copy++) {
  SITE.marquee.forEach((word) => {
    track.appendChild(el("span", "mq-item", word));
    track.appendChild(el("span", "mq-star", "✦"));
  });
}

function startIntro() {
  document.body.classList.add("ready");
  // once the cards have landed, hovering them can react right away
  setTimeout(() => document.body.classList.add("settled"), 2600);
  scramble(roles, roles.textContent, 1100, 700);
  scramble(statement, statement.textContent, 1500, 1000);
}
const fontsReady = Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);
if (root.classList.contains("intro")) {
  // First visit this session: the monogram fades in, then the curtain lifts
  // and the hero plays underneath it
  if (lenis) lenis.stop(); // no scrolling under the curtain
  fontsReady.then(() => {
    root.classList.add("intro-show");
    setTimeout(() => {
      root.classList.add("intro-open");
      if (lenis) lenis.start();
      startIntro();
      try { sessionStorage.setItem("introSeen", "1"); } catch (e) {}
      setTimeout(() => root.classList.remove("intro", "intro-show", "intro-open"), 1200);
    }, 1150);
  });
} else {
  fontsReady.then(startIntro);
}

// ============================================================
//  About
// ============================================================
SITE.about.forEach((text, i) => {
  const p = el("p", "reveal");
  appendWithLinks(p, text);
  p.style.setProperty("--d", i);
  if (isTodo(text)) p.classList.add("todo");
  $("aboutText").appendChild(p);
});

SITE.now.forEach((text, i) => {
  // each item's arrow draws first, then its text slides in (see style.css)
  const li = el("li");
  li.style.setProperty("--i", i);
  li.appendChild(el("span", "now-text", text));
  if (isTodo(text)) li.classList.add("todo");
  $("nowList").appendChild(li);
});

// Copy text to the clipboard. In-app browsers (Messenger, Instagram) often
// block the Clipboard API, so fall back to selecting a hidden text box.
function copyText(text) {
  const fallback = () => {
    const area = el("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
    document.body.appendChild(area);
    area.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    area.remove();
    return ok;
  };
  if (!navigator.clipboard) return Promise.resolve(fallback());
  return navigator.clipboard.writeText(text).then(() => true, fallback);
}

// Show "Copied" (or a hint to copy by hand) on a label, then put it back.
// Both changes scramble into place like the section labels.
function flashCopied(label, ok) {
  clearTimeout(label.flash);
  scramble(label, ok ? "Copied" : "Copy failed", 450);
  label.flash = setTimeout(() => scramble(label, "Copy", 450), 1600);
}

// Hunter's Fury's ult points (see earnUlt), kept per browser
const ULT_MAX = 8;
let ultPoints = 0;
let ultButton = null; // phones: the ult's own button (see setupUltButton)
let furyOnScreen = false;
try {
  ultPoints = Math.min(ULT_MAX, Number(localStorage.getItem("sovaUlt")) || 0);
} catch (e) {}
// abilities that have a key, by key (see the keybinds after the walls)
const keyAbilities = {};

// speaker icons for the sound switch
const SOUND_ON = '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/></svg>';
const SOUND_OFF = '<svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="m17 9 5 6M22 9l-5 6"/></svg>';
// whether the wall's sounds are off (see playSound), remembered per browser
let muted = false;
try {
  muted = localStorage.getItem("sovaMuted") === "1";
} catch (e) {}

// Word walls (nicknames and the like): big words with small notes
(SITE.walls || []).forEach((wall) => {
  if (!wall.words || !wall.words.length) return;
  const block = el("div", "wordwall");
  if (wall.ign) block.dataset.ign = wall.ign;
  if (wall.role) block.dataset.role = wall.role;
  const head = el("div", "wordwall-head reveal");
  head.append(el("p", "now-label mono", wall.label), el("p", "wordwall-intro", wall.intro || ""));
  // `soundSwitch`: turns the wall's sounds on and off (remembered per browser)
  if (wall.soundSwitch) {
    const toggle = el("button", "sound-switch mono");
    toggle.type = "button";
    const show = () => {
      toggle.innerHTML = muted ? `${SOUND_OFF}<span>Sound off</span>` : `${SOUND_ON}<span>Sound on</span>`;
      toggle.setAttribute("aria-pressed", String(!muted));
    };
    toggle.addEventListener("click", () => {
      muted = !muted;
      try {
        localStorage.setItem("sovaMuted", muted ? "1" : "0");
      } catch (e) {}
      if (muted) stopSounds();
      show();
    });
    show();
    head.appendChild(toggle);
  }
  const words = el("div", "wordwall-words");
  const cards = wall.layout === "cards";
  if (cards) block.classList.add("cards");
  wall.words.forEach((w, i) => {
    const kind = cards ? "ww-card" : w.top ? "ww ww-top" : "ww";
    const item = el(w.link ? "a" : "span", `${kind} reveal`);
    linkify(item, w.link);
    item.style.setProperty("--d", i);
    if (cards && w.image) {
      const frame = el("span", "ww-card-img");
      const img = el("img");
      img.src = w.image;
      img.alt = w.alt || w.text;
      img.loading = "lazy";
      img.decoding = "async";
      frame.appendChild(img);
      item.appendChild(frame);
    }
    if (w.pos) {
      const pos = el("span", "ww-pos mono");
      if (cards) {
        // Positions are numbered 1-5 in basketball (PG is the 1, C the 5):
        // the label shows the number first and rolls over to the name
        const strip = el("span", "ww-pos-strip");
        strip.append(el("span", "ww-pos-num", String(w.num || i + 1)), el("span", "", w.pos));
        pos.appendChild(strip);
      } else {
        pos.textContent = w.pos;
      }
      item.appendChild(pos);
    }
    item.appendChild(el("span", "ww-text", w.text));
    if (w.note || w.face) {
      const note = el("span", "ww-note mono");
      // the ability's own icon and its key, like the game's HUD
      if (w.icon && !reduceMotion) {
        const mark = el("img", "ww-ability");
        mark.src = w.icon;
        mark.alt = "";
        note.appendChild(mark);
      }
      if (w.key && !reduceMotion) note.appendChild(el("kbd", "ww-key", w.key));
      if (w.face) {
        const face = el("img", "ww-face");
        face.src = w.face;
        face.alt = "";
        face.loading = "lazy";
        note.appendChild(face);
      }
      // a link to a clip gets a small play mark, any other link the arrow
      const clip = /tiktok\.com\/.+\/video\/|youtube\.com\/(watch|shorts)|youtu\.be\//.test(w.link || "");
      note.appendChild(document.createTextNode(`${w.note || ""}${w.link && !clip ? " ↗" : ""}`));
      if (clip) note.appendChild(el("span", "ww-clip"));
      // Hunter's Fury: its ult points (it needs all of them), and its three
      // charges, lit while the ult is up
      if (w.beam && !reduceMotion) {
        const points = el("span", "ult-points");
        points.setAttribute("aria-hidden", "true");
        for (let k = 0; k < ULT_MAX; k++) points.appendChild(el("i"));
        note.append(points, el("span", "ult-count"));
        const pips = el("span", "ult-pips");
        pips.setAttribute("aria-hidden", "true");
        for (let k = 0; k < 3; k++) pips.appendChild(el("i"));
        note.appendChild(pips);
      }
      item.appendChild(note);
    }
    if (w.drone) {
      item.classList.add("ww-drone");
      item.addEventListener("click", launchDrone);
    }
    if (w.pick) {
      item.classList.add("ww-pick");
      item.addEventListener("click", () => agentSelect(block, item));
    }
    // Sova's abilities: `ping` sends a Recon Bolt ping, `shock` sets off a
    // Shock Bolt, `beam` fires Hunter's Fury, `hud` flies the Owl Drone.
    // Hover on computers, tap on phones.
    const ability = reduceMotion ? null
      : w.ping ? reconPing : w.shock ? shockBolt : w.beam ? huntersFury : w.hud ? droneHud : null;
    if (ability && canHover) {
      onHover(item, () => ability(block, item));
    } else if (ability) {
      // phones: a tap plays the ability instead of opening the clip, so a
      // tap never whisks you off the page. Tapping the word again while its
      // ability plays opens the clip as usual.
      item.addEventListener("click", (e) => {
        if (w.link && item.classList.contains("casting")) return;
        e.preventDefault();
        ability(block, item);
      });
    }
    if (ability && w.key) keyAbilities[w.key.toLowerCase()] = { block, item, ability };
    if (w.desc) item.dataset.desc = w.desc;
    if (w.stat) item.dataset.stat = w.stat;
    if (w.icon) item.dataset.icon = w.icon;
    if (w.key) item.dataset.key = w.key;
    // Reuse the crafts preview card: the photo follows the cursor
    if (w.image && canHover && !cards) {
      onHover(item, () => showPreview({ image: w.image, emoji: "" }));
      item.addEventListener("mouseleave", hidePreview);
    }
    words.appendChild(item);
  });
  block.append(head, words);

  // `shuffle`: once the wall arrives, each word's letters shuffle through the
  // alphabet and settle into place, one word after another
  if (wall.shuffle && !reduceMotion) {
    const shuffleWatch = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      shuffleWatch.disconnect();
      words.querySelectorAll(".ww-text").forEach((node, i) => shuffleWord(node, node.textContent, 900, i * 120));
    }, { threshold: 0.4 });
    shuffleWatch.observe(words);
  }

  if (wall.lightUp && !reduceMotion) {
    block.classList.add("lighting");
    lightWalls.push(words);
  }

  // Card labels roll from their number to their name once the cards are on
  // screen, and back when they leave, so it plays again next time
  if (cards) {
    if (reduceMotion) {
      words.classList.add("named");
    } else {
      const nameWatch = new IntersectionObserver(([entry]) => {
        words.classList.toggle("named", entry.isIntersecting);
      }, { threshold: 0.6 });
      nameWatch.observe(words);
    }
  }

  // Wide screens: the cards slide in from both sides and meet in the middle
  if (cards && !reduceMotion && matchMedia("(min-width: 961px)").matches) {
    const list = [...words.children];
    const mid = (list.length - 1) / 2 || 1;
    list.forEach((card, k) => {
      card.classList.remove("reveal");
      card.style.setProperty("--o", ((k - mid) / mid).toFixed(3));
    });
    addScene(words, 0.35);
  }

  // Small settings under the words, e.g. a crosshair code to copy
  if (wall.specs && wall.specs.length) {
    const specs = el("div", "ww-specs reveal");
    let row = null; // plain settings share one line, e.g. sens and DPI
    wall.specs.forEach((s) => {
      const spec = el(s.copy ? "button" : "div", "ww-spec");
      spec.append(el("span", "ww-spec-label mono", s.label), el("span", "ww-spec-value mono", s.value));
      if (s.copy) {
        spec.type = "button";
        spec.title = `Copy my ${s.label.toLowerCase()} code`;
        const action = el("span", "ww-spec-action mono", "Copy");
        spec.appendChild(action);
        spec.dataset.goatcounterClick = `copy-${s.label.toLowerCase()}`;
        spec.dataset.goatcounterTitle = `Copied: ${s.label}`;
        spec.addEventListener("click", () => copyText(s.value).then((ok) => flashCopied(action, ok)));
      }
      if (s.copy) {
        specs.appendChild(spec);
      } else {
        if (!row) row = specs.appendChild(el("div", "ww-specs-row"));
        row.appendChild(spec);
      }
    });
    block.appendChild(specs);
  }

  if (wall.art) {
    block.classList.add("has-art");
    const art = el("div", "wordwall-art reveal");
    if (wall.art.glow) art.style.setProperty("--glow", wall.art.glow);
    const img = el("img");
    img.src = wall.art.src;
    img.alt = wall.art.alt || "";
    img.loading = "lazy";
    img.decoding = "async";
    art.appendChild(img);
    // lockIn: scanned in from the top behind an orange line, then a flash,
    // like locking in an agent (see style.css). Plays again on every return.
    // "Locked in" sits under the agent, like agent select: it hides when a
    // scan starts and scrambles in as the scan finishes.
    if (wall.art.lockIn) {
      const tag = el("span", "lock-tag mono scramble", "Locked in");
      tag.setAttribute("aria-hidden", "true");
      art.classList.add("has-tag");
      art.appendChild(tag);
      if (!reduceMotion) {
        art.classList.replace("reveal", "lockin");
        playOnView(art, "locked", 0.4);
        art.addEventListener("animationstart", (e) => {
          if (e.animationName === "lock-scan") tag.classList.remove("on");
        });
        art.addEventListener("animationend", (e) => {
          if (e.animationName === "lock-scan") scramble(tag, "Locked in", 700);
        });
      }
      // Easter egg: click "Locked in" and it shows who's behind the bow,
      // Sova's real name, while he says "I am the hunter". Only on a click,
      // never on hover.
      const unmask = (on) => {
        if (!reduceMotion && !tag.classList.contains("on")) return;
        scramble(tag, on ? "Sasha Novikov" : "Locked in", 600);
        if (on) playHunter();
      };
      tag.addEventListener("click", () => {
        unmask(true);
        setTimeout(() => unmask(false), 2600);
      });
    }
    block.appendChild(art);
  }

  // Photo credits (Creative Commons asks for them)
  const credits = wall.words.flatMap((w) => [].concat(w.credit || []));
  if (credits.length) {
    const line = el("p", "ww-credits");
    line.appendChild(document.createTextNode("Photos via Wikimedia Commons, cropped: "));
    credits.forEach((c, i) => {
      if (i) line.appendChild(document.createTextNode(" · "));
      const who = el("a", "", `${c.subject} by ${c.by}`);
      linkify(who, c.source);
      const license = c.licenseUrl ? el("a", "", c.license) : document.createTextNode(c.license);
      if (c.licenseUrl) linkify(license, c.licenseUrl);
      line.append(who, document.createTextNode(" ("), license, document.createTextNode(")"));
    });
    block.appendChild(line);
  }
  if (wall.notice) block.appendChild(el("p", "ww-credits", wall.notice));
  $(wall.section || "about").appendChild(block);
});

// Game keybinds on Sova's wall, while it's on screen: Q Shock Bolt, E Recon
// Bolt, C Owl Drone, X Hunter's Fury (their keycaps flash when pressed)
const wallsInView = new Set();
new Set(Object.values(keyAbilities).map((k) => k.block)).forEach((block) => {
  new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting) wallsInView.add(block);
    else wallsInView.delete(block);
  }, { threshold: 0.25 }).observe(block);
});
document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || e.key.length !== 1) return;
  if (e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable]")) return;
  const bind = keyAbilities[e.key.toLowerCase()];
  if (!bind || !wallsInView.has(bind.block)) return;
  bind.ability(bind.block, bind.item);
  const cap = bind.item.querySelector(".ww-key");
  if (!cap || abilityBusy) return; // it didn't fire, so don't flash the key
  cap.classList.add("pressed");
  setTimeout(() => cap.classList.remove("pressed"), 160);
});
renderUltPoints();

// "The story so far": a short timeline at the end of the About section.
// As you read a row, the line under it draws itself; once the row has slid
// fully in (.landed), its medals drop in and swing on their ribbons and its
// photo opens like a gallery tile (all in style.css).
if (SITE.story && SITE.story.items && SITE.story.items.length) {
  const block = el("div", "wordwall story");
  const head = el("div", "wordwall-head reveal");
  head.append(el("p", "now-label mono", SITE.story.label), el("p", "wordwall-intro", SITE.story.intro || ""));
  const list = el("ol", "story-list");
  SITE.story.items.forEach((s, i) => {
    const li = el("li", "story-item");
    if (reduceMotion) li.classList.add("reveal");
    else addScene(li, 0.2); // the year and the story slide together
    li.style.setProperty("--d", i);
    const body = el("div", "story-body");
    const title = el("p", "story-title", s.title);
    if (s.medals) {
      const medals = el("span", "story-medals");
      medals.setAttribute("role", "img");
      medals.setAttribute("aria-label", `${s.medals} gold medal${s.medals > 1 ? "s" : ""}`);
      for (let m = 0; m < s.medals; m++) {
        const medal = el("span", "medal", "🥇");
        medal.style.setProperty("--m", m);
        medals.appendChild(medal);
      }
      title.appendChild(medals);
    }
    body.append(title, el("p", "story-text", s.text));
    // A row can open one of the gallery photos in the viewer
    const shot = s.photo ? (SITE.gallery || []).findIndex((g) => g.file === s.photo) : -1;
    if (shot >= 0) {
      const open = el("button", "story-photo");
      open.type = "button";
      const frame = el("span", "story-photo-thumb");
      const thumb = el("img");
      thumb.src = `assets/gallery/${s.photo}-400.jpg`;
      thumb.alt = "";
      thumb.loading = "lazy";
      frame.appendChild(thumb);
      open.append(frame, el("span", "mono", "See the photo"));
      open.addEventListener("click", () => openShot(shot));
      body.appendChild(open);
    }
    const year = el("span", "story-year", s.year);
    if (s.until) year.appendChild(el("span", "story-until mono", `to ${s.until}`));
    li.append(year, body);
    // `runner`: a tiny runner dashes along the row's line as it draws,
    // Subway Surfers style: hopping now and then and grabbing the coins
    if (s.runner) {
      const runner = el("span", "story-runner");
      runner.setAttribute("aria-hidden", "true");
      li.appendChild(runner);
      for (let k = 1; k <= 6; k++) {
        const coin = el("span", "story-coin");
        coin.setAttribute("aria-hidden", "true");
        coin.style.setProperty("--at", (k / 7).toFixed(3));
        li.appendChild(coin);
      }
    }
    list.appendChild(li);
  });
  block.append(head, list);
  $("about").appendChild(block);
}

// ============================================================
//  Crafts (hover a row to see a floating preview)
// ============================================================
const preview = $("preview");
const previewIn = $("previewIn");

// The preview card takes the shape of the image (up to 380 x 300).
function sizePreview(w, h) {
  previewIn.style.width = `${w}px`;
  previewIn.style.height = `${h}px`;
  previewIn.style.left = `${-w / 2}px`;
  previewIn.style.top = `${-h / 2}px`;
}

// With several `images`, the preview flips through them like a flipbook
let flipTimer = null;
function showPreview(craft) {
  clearInterval(flipTimer);
  previewIn.textContent = "";
  sizePreview(240, 300);
  const pics = craft.images || (craft.image ? [craft.image] : []);
  if (pics.length) {
    const imgs = pics.map((src, k) => {
      const img = el("img", pics.length > 1 ? `flip${k ? "" : " on"}` : "");
      img.alt = "";
      img.src = src;
      previewIn.appendChild(img);
      return img;
    });
    imgs[0].onload = () => {
      const ratio = imgs[0].naturalWidth / imgs[0].naturalHeight;
      const w = Math.min(380, 300 * ratio);
      sizePreview(w, w / ratio);
    };
    if (imgs.length > 1) {
      let k = 0;
      flipTimer = setInterval(() => {
        imgs[k].classList.remove("on");
        k = (k + 1) % imgs.length;
        imgs[k].classList.add("on");
      }, 800);
    }
  } else {
    previewIn.appendChild(el("span", "", craft.emoji));
  }
  preview.classList.add("on");
}

function hidePreview() {
  clearInterval(flipTimer);
  preview.classList.remove("on");
}

// Craft tags scramble into place every time their row comes on screen,
// like the section labels
const tagWatch = reduceMotion ? null : new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const node = entry.target;
    if (entry.isIntersecting && !node.dataset.onScreen) {
      scramble(node, node.getAttribute("aria-label") || node.textContent, 700, 250 + Number(node.dataset.i) * 120);
    }
    node.dataset.onScreen = entry.isIntersecting ? "1" : "";
  });
}, { threshold: 0.6 });

SITE.crafts.forEach((craft, i) => {
  const li = el("li", "craft reveal");
  li.style.setProperty("--d", i);
  if (isTodo(craft.title, craft.year)) li.classList.add("todo");

  const row = el(craft.link ? "a" : "div", "craft-row");
  linkify(row, craft.link);
  const tags = el("span", "craft-tags mono", craft.tags.join(" · "));
  if (tagWatch) {
    tags.classList.add("scramble");
    tags.dataset.i = i;
    tagWatch.observe(tags);
  }
  // The number rolls up from 00, like the belief odometers, as the row arrives
  const num = el("span", "craft-num mono");
  const strip = el("span", "odo-strip");
  for (let d = 0; d <= 9; d++) strip.appendChild(el("span", "", String(d)));
  strip.style.setProperty("--n", (i + 1) % 10);
  const odo = el("span", "odo");
  odo.appendChild(strip);
  num.append(String(Math.floor((i + 1) / 10)), odo);
  row.append(
    num,
    el("span", "craft-title", craft.title),
    tags,
    el("span", "craft-year mono", craft.year),
    el("span", "craft-arrow", craft.link ? "↗" : "")
  );
  if (canHover) {
    onHover(row, () => showPreview(craft));
    row.addEventListener("mouseleave", hidePreview);
  }
  li.appendChild(row);
  $("craftList").appendChild(li);
});

// ============================================================
//  Hobbies
// ============================================================
SITE.hobbies.forEach((h, i) => {
  const card = el("article", "hobby reveal");
  card.style.setProperty("--d", i);
  if (isTodo(h.title, h.text)) card.classList.add("todo");
  card.append(el("span", "hobby-emoji", h.emoji), el("h3", "hobby-title", h.title), el("p", "hobby-text", h.text));
  $("hobbyGrid").appendChild(card);
});

// Spotify player under the hobby cards
const spotify = SITE.playlist && SITE.playlist.url.match(/open\.spotify\.com\/(playlist|album|track|artist)\/([A-Za-z0-9]+)/);
if (spotify) {
  const block = el("div", "playlist reveal");
  const label = el("div", "playlist-label");
  label.append(el("p", "mono playlist-kicker", "On repeat"), el("p", "playlist-title", SITE.playlist.title));
  if (SITE.playlist.note) label.appendChild(el("p", "playlist-note", SITE.playlist.note));
  const open = el("a", "playlist-open mono", "Open in Spotify ↗");
  linkify(open, SITE.playlist.url);
  label.appendChild(open);

  const frame = el("iframe");
  frame.src = `https://open.spotify.com/embed/${spotify[1]}/${spotify[2]}?theme=0`;
  frame.title = `${SITE.playlist.title} on Spotify`;
  frame.loading = "lazy";
  frame.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
  block.append(label, frame);

  // One song picked out under the playlist (a compact track player)
  const pick = SITE.playlist.pick && SITE.playlist.pick.match(/open\.spotify\.com\/track\/([A-Za-z0-9]+)/);
  if (pick) {
    const pickLabel = el("div", "playlist-label");
    const kicker = el("p", "mono playlist-kicker");
    const pickText = el("span", "", "Current pick");
    kicker.appendChild(pickText);
    // Little equalizer bars that bounce only while the song is playing
    const eq = el("span", "eq");
    eq.setAttribute("aria-hidden", "true");
    for (let b = 0; b < 3; b++) eq.appendChild(el("i"));
    kicker.appendChild(eq);
    if (!reduceMotion) {
      new IntersectionObserver(([entry]) => eq.classList.toggle("on", entry.isIntersecting)).observe(eq);
    }
    pickLabel.appendChild(kicker);
    const slot = el("div", "pick-slot");
    block.append(pickLabel, slot);
    // While it plays, the bars dance and the label turns into "Now playing"
    mountPick(slot, pick[1], (playing) => {
      eq.classList.toggle("playing", playing);
      scramble(pickText, playing ? "Now playing" : "Current pick", 500);
    });
  }
  $("hobbies").appendChild(block);
}

// The current pick plays through Spotify's iFrame API, so the page hears when
// it plays or pauses (onPlaying gets true/false on each change). Spotify's
// script loads once the music section is near; if it can't load, the plain
// player goes in instead (and nothing reacts to it).
function mountPick(slot, id, onPlaying) {
  const title = "My current pick on Spotify";
  let done = false;
  const plain = () => {
    if (done) return;
    done = true;
    const frame = el("iframe");
    frame.src = `https://open.spotify.com/embed/track/${id}?theme=0`;
    frame.title = title;
    frame.allow = "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
    slot.appendChild(frame);
  };
  const load = () => {
    window.onSpotifyIframeApiReady = (api) => {
      if (done) return;
      done = true;
      const spot = el("div");
      slot.appendChild(spot);
      // Spotify swaps `spot` for its player
      api.createController(spot, { uri: `spotify:track:${id}`, width: "100%", height: 80, theme: "dark" }, (player) => {
        let playing = false;
        player.addListener("playback_update", (e) => {
          if (!e.data.isPaused !== playing) onPlaying((playing = !e.data.isPaused));
        });
      });
      const frame = slot.querySelector("iframe");
      if (frame) frame.title = title;
    };
    const script = el("script");
    script.src = "https://open.spotify.com/embed/iframe-api/v1";
    script.async = true;
    script.onerror = plain;
    document.head.appendChild(script);
    setTimeout(plain, 8000); // Spotify never answered
  };
  new IntersectionObserver(([entry], watch) => {
    if (!entry.isIntersecting) return;
    watch.disconnect();
    load();
  }, { rootMargin: "800px 0px" }).observe(slot);
}

// ============================================================
//  Beliefs (words light up as you scroll)
// ============================================================
SITE.beliefs.forEach((text, i) => {
  const wrap = el("div", "belief-wrap");
  // The number rolls up from (00) like an odometer when the belief starts
  // to light up, and a thin line under it fills as you read
  const side = el("div", "belief-side");
  side.setAttribute("aria-hidden", "true");
  const num = el("span", "belief-num mono");
  const tens = String(Math.floor((i + 1) / 10));
  const strip = el("span", "odo-strip");
  for (let d = 0; d <= 9; d++) strip.appendChild(el("span", "", String(d)));
  const odo = el("span", "odo");
  odo.appendChild(strip);
  num.append("(", tens, odo, ")");
  num.dataset.n = (i + 1) % 10;
  const bar = el("span", "belief-bar");
  side.append(num, bar);
  if (reduceMotion) {
    strip.style.transform = `translateY(${-((i + 1) % 10)}em)`;
    num.classList.add("on");
  }
  const p = el("p", "belief");
  splitWords(p, text);
  if (isTodo(text)) wrap.classList.add("todo");
  wrap.append(side, p);
  $("beliefList").appendChild(wrap);
});
const beliefEls = [...document.querySelectorAll(".belief")];

function updateBeliefs() {
  const vh = innerHeight;
  beliefEls.forEach((p) => {
    const r = p.getBoundingClientRect();
    if (r.top > vh || r.bottom < 0) return;
    const progress = Math.min(1, Math.max(0, (vh * 0.9 - r.top) / (vh * 0.55)));
    const words = p.querySelectorAll(".fw");
    const lit = Math.round(progress * words.length);
    words.forEach((w, i) => w.classList.toggle("lit", i < lit));
    const side = p.previousElementSibling;
    const num = side.querySelector(".belief-num");
    const started = progress > 0.02;
    if (started !== num.classList.contains("on")) {
      num.classList.toggle("on", started);
      side.querySelector(".odo-strip").style.transform = `translateY(${started ? -num.dataset.n : 0}em)`;
    }
    side.querySelector(".belief-bar").style.setProperty("--p", progress.toFixed(3));
  });
}

// ============================================================
//  YouTube and TikTok
// ============================================================
// Pick a video from the list and it plays on the stage. Shorts and TikTok
// clips get a tall 9:16 frame, regular videos a wide 16:9 one.
const onTikTok = (ch) => ch.platform === "tiktok";
const watchUrl = (v, ch) =>
  onTikTok(ch) ? `${ch.url}/video/${v.id}`
  : v.short ? `https://www.youtube.com/shorts/${v.id}` : `https://www.youtube.com/watch?v=${v.id}`;

// Shorts have a tall thumbnail ("oar2"), videos a max-res one. When a size is
// missing YouTube serves a tiny placeholder, so fall back to the standard one.
function youtubeThumb(v) {
  const img = el("img");
  img.alt = "";
  img.loading = "lazy";
  // a picture made for the clip, if there is one
  if (v.cover) {
    img.src = v.cover;
    return img;
  }
  const fallback = `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`;
  const useFallback = () => { if (img.src !== fallback) img.src = fallback; };
  img.onerror = useFallback;
  img.onload = () => { if (img.naturalWidth <= 120) useFallback(); };
  img.src = `https://i.ytimg.com/vi/${v.id}/${v.short ? "oar2" : "maxresdefault"}.jpg`;
  return img;
}

function youtubeFrame(v) {
  const frame = el("iframe");
  const params = new URLSearchParams({ autoplay: 1, rel: 0, playsinline: 1, iv_load_policy: 3 });
  // lets the player say when the video ends, so its cover can come back
  // before YouTube's end screen does
  params.set("enablejsapi", 1);
  params.set("origin", location.origin);
  frame.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(v.id)}?${params}`;
  // YouTube only plays embeds when the page sends its address (the HTTP
  // Referer); without it viewers get "error 153"
  frame.referrerPolicy = "strict-origin-when-cross-origin";
  frame.title = v.title;
  frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
  frame.allowFullscreen = true;
  return frame;
}

// TikTok's thumbnail links expire, so each clip's cover lives in assets/tiktok/
function tiktokThumb(v) {
  const img = el("img");
  img.alt = "";
  img.loading = "lazy";
  img.src = v.cover || `assets/tiktok/${v.id}.jpg`;
  return img;
}

// Covers first and last: a video's cover shows until you press play, and
// comes back when the video ends. The players say when they're done:
// TikTok's by message, YouTube's through its iframe API (loaded once, the
// first time a YouTube video plays). Returns the function that stops
// listening.
let ytApi = null;
function youtubeApi() {
  if (!ytApi) {
    ytApi = new Promise((resolve, reject) => {
      if (window.YT && window.YT.Player) return resolve(window.YT);
      const before = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (before) before();
        resolve(window.YT);
      };
      const script = el("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }
  return ytApi;
}
// The play button on a cover: a drawn triangle (the ▶ character turns into
// a blue emoji on iPhones) and the word, so it's clear which button starts it
function playButton() {
  const b = el("span", "play");
  b.append(el("span", "play-mark"), el("span", "play-word", "Play"));
  return b;
}

// report(state) hears "ready", "playing", "paused" and "ended"
function watchPlayer(frame, tiktok, report) {
  let live = true;
  const STATES = { 0: "ended", 1: "playing", 2: "paused" };
  if (tiktok) {
    const onMessage = (e) => {
      if (!live || e.source !== frame.contentWindow) return;
      let d = e.data;
      if (typeof d === "string") {
        try {
          d = JSON.parse(d);
        } catch (err) {
          return;
        }
      }
      if (!d || !d["x-tiktok-player"]) return;
      if (d.type === "onPlayerReady") report("ready");
      if (d.type === "onStateChange" && STATES[d.value]) report(STATES[d.value]);
    };
    addEventListener("message", onMessage);
    return () => {
      live = false;
      removeEventListener("message", onMessage);
    };
  }
  youtubeApi()
    .then((YT) => {
      if (!live) return;
      frame.ytPlayer = new YT.Player(frame, {
        events: {
          onReady: () => live && report("ready"),
          onStateChange: (e) => live && STATES[e.data] && report(STATES[e.data])
        }
      });
    })
    .catch(() => {});
  return () => {
    live = false;
  };
}

function tiktokFrame(v) {
  const frame = el("iframe");
  const params = new URLSearchParams({ autoplay: 1, loop: 0, rel: 0, description: 0, music_info: 0 });
  frame.src = `https://www.tiktok.com/player/v1/${encodeURIComponent(v.id)}?${params}`;
  frame.title = v.title;
  frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
  frame.allowFullscreen = true;
  return frame;
}

const stageFits = [];

SITE.youtube.forEach((ch, i) => {
  const card = el("article", "channel reveal");
  card.style.setProperty("--d", i);
  if (isTodo(ch.name, ch.about)) card.classList.add("todo");

  const videos = ch.videos || [];
  const tiktok = onTikTok(ch);
  const tall = (v) => tiktok || v.short;
  let current = videos.find((v) => v.id === ch.featuredVideo)
    || (ch.featuredVideo ? { id: ch.featuredVideo, title: `${ch.name} video` } : null);
  let playing = false;
  let stopWatching = null; // listens for the playing video's end
  const rows = [];

  const media = el("div", "channel-media");
  const stage = el("div", "stage");
  const caption = el("div", "stage-caption");
  const captionState = el("span", "stage-state mono");
  const captionTitle = el("span", "stage-title");
  const openLink = el("a", "stage-open mono", tiktok ? "TikTok ↗" : "YouTube ↗");
  const captionLabel = el("span", "stage-label");
  captionLabel.append(captionState, captionTitle);
  caption.append(captionLabel, openLink);
  media.append(stage, caption);

  // Size the stage for the current video: full column width for 16:9,
  // tall but screen-friendly for Shorts
  function fit() {
    const col = media.clientWidth;
    let w = col;
    let h = col * 9 / 16;
    if (current && tall(current)) {
      h = Math.min(Math.max(col * 0.85, 420), innerHeight * 0.72, 600);
      w = Math.min(h * 9 / 16, col);
      h = w * 16 / 9;
    }
    stage.style.width = caption.style.width = `${w}px`;
    stage.style.height = `${h}px`;
  }
  stageFits.push(fit);

  // Fade the new layer in over the old one, then drop the old one
  function swapIn(layer, readyEvent) {
    const old = [...stage.children];
    layer.classList.add("entering");
    stage.appendChild(layer);
    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      layer.classList.remove("entering");
      setTimeout(() => old.forEach((n) => n.remove()), 500);
    };
    readyEvent(reveal);
    setTimeout(reveal, 1500); // don't wait forever on a slow network
  }

  function show(v, play) {
    current = v;
    playing = play;
    fit();
    rows.forEach((r) => {
      const on = r.dataset.id === v.id;
      r.classList.toggle("active", on);
      r.setAttribute("aria-pressed", String(on));
    });
    captionState.textContent = play ? "Now playing" : tiktok ? "Clip" : v.short ? "Short" : "Video";
    captionTitle.textContent = v.title;
    linkify(openLink, watchUrl(v, ch));

    if (stopWatching) stopWatching();
    stopWatching = null;
    if (play) {
      const frame = tiktok ? tiktokFrame(v) : youtubeFrame(v);
      swapIn(frame, (reveal) => frame.addEventListener("load", reveal, { once: true }));
      // The caption follows the player: if it's ready but hasn't started
      // after a moment (iPhones block videos with sound from starting on
      // their own), it asks for a tap on the video. When it's over, the
      // cover comes back.
      let started = false;
      let nudge = null;
      stopWatching = watchPlayer(frame, tiktok, (state) => {
        if (current !== v || !playing) return;
        if (state === "ready") {
          clearTimeout(nudge);
          nudge = setTimeout(() => {
            if (!started && current === v && playing) captionState.textContent = "Tap the video";
          }, 2500);
        } else if (state === "playing") {
          started = true;
          captionState.textContent = "Now playing";
        } else if (state === "paused") {
          captionState.textContent = "Paused";
        } else if (state === "ended") {
          show(v, false);
        }
      });
      return;
    }
    const btn = el("button", "thumb");
    btn.type = "button";
    btn.setAttribute("aria-label", `Play ${v.title}`);
    const img = tiktok ? tiktokThumb(v) : youtubeThumb(v);
    btn.append(img, playButton());
    btn.addEventListener("click", () => {
      // A page opened straight from disk has no address to send, so
      // YouTube would refuse to play it here; open YouTube instead.
      if (!location.protocol.startsWith("http")) {
        window.open(watchUrl(v, ch), "_blank", "noopener");
        return;
      }
      show(v, true);
    });
    swapIn(btn, (reveal) => {
      img.addEventListener("load", reveal, { once: true });
      img.addEventListener("error", reveal, { once: true });
    });
  }

  // Hovering a row previews that clip's thumbnail on the stage. Only while
  // nothing plays: YouTube doesn't allow covering its player.
  let peekLayer = null;
  function peek(v) {
    unpeek();
    if (playing || (current && current.id === v.id)) return;
    peekLayer = el("div", "stage-peek");
    peekLayer.append(tiktok ? tiktokThumb(v) : youtubeThumb(v), el("span", "stage-peek-label mono", "Preview"));
    stage.appendChild(peekLayer);
    const layer = peekLayer;
    requestAnimationFrame(() => requestAnimationFrame(() => layer.classList.add("on")));
  }
  function unpeek() {
    if (!peekLayer) return;
    const layer = peekLayer;
    peekLayer = null;
    layer.classList.remove("on");
    setTimeout(() => layer.remove(), 450);
  }

  const info = el("div", "channel-info");
  info.append(el("p", "channel-handle mono", ch.handle), el("h3", "channel-name split", ch.name));
  if (ch.tagline) info.appendChild(el("p", "channel-tagline", `“${ch.tagline}”`));
  if (ch.about) info.appendChild(el("p", "channel-about", ch.about));

  if (videos.length) {
    const list = el("ul", "video-list");
    videos.forEach((v, r) => {
      const row = el("button", "video-row");
      row.type = "button";
      row.dataset.id = v.id;
      const note = el("span", "video-note mono", v.note || "");
      // Lengths like 15:54 roll up from 0:00 once half the list is on screen
      if (!reduceMotion && /^\d+(:\d\d)+$/.test(v.note || "")) {
        note.textContent = "";
        note.style.setProperty("--r", r);
        note.append(rollingDigits(v.note), el("span", "sr-only", v.note));
        list.dataset.rolls = "1";
      }
      row.append(el("span", "video-title", v.title), note);
      // Covers first: picking a video shows its cover; press play to watch
      row.addEventListener("click", () => {
        if (current && current.id === v.id) return;
        unpeek();
        show(v, false);
      });
      if (canHover) {
        onHover(row, () => peek(v));
        row.addEventListener("mouseleave", unpeek);
      }
      rows.push(row);
      const li = el("li");
      li.appendChild(row);
      list.appendChild(li);
    });
    if (list.dataset.rolls) playOnView(list, "rolled", 0.5);
    info.appendChild(list);
  }

  const visit = el("a", "channel-visit mono", tiktok ? "Visit profile ↗" : "Visit channel ↗");
  linkify(visit, ch.url);
  info.appendChild(visit);

  card.append(media, info);
  $("channelList").appendChild(card);
  // for the sneak peek above: bring up one of this channel's videos (its
  // cover), or stop whatever is playing
  card.dataset.channel = ch.name;
  card.select = (id) => {
    const v = videos.find((x) => x.id === id);
    if (!v || (current === v && !playing)) return;
    show(v, false);
  };
  card.stop = () => {
    if (playing && current) show(current, false);
  };

  if (current) {
    show(current, false);
  } else {
    // No video to feature: the stage just links to the channel
    const link = el("a", "thumb");
    linkify(link, ch.url);
    link.appendChild(playButton());
    stage.appendChild(link);
    caption.remove();
    fit();
  }
});

addEventListener("resize", () => stageFits.forEach((fit) => fit()));

// Watch Me opens on a sneak peek, like the share card: the channel's line and
// a few Short covers fanned out. "Watch more" slides the full players down
// from under it; tapping a cover opens them straight onto that Short.
(function watchPeek() {
  const host = SITE.youtube.find((ch) => (ch.peek || []).length);
  const list = $("channelList");
  if (!host || !list) return;
  const cards = [...list.children];
  const cardOf = (name) => cards.find((c) => c.dataset.channel === name);
  const hostCard = cardOf(host.name);
  // the Shorts and clips to fan out, from any of the channels, each with its cover
  const picks = host.peek
    .map((id) => {
      for (const ch of SITE.youtube) {
        const v = (ch.videos || []).find((x) => x.id === id);
        if (v && v.cover) return { v, card: cardOf(ch.name) };
      }
      return null;
    })
    .filter((p) => p && p.card);
  const POS = { 3: ["left", "front", "right"], 5: ["far-left", "left", "front", "right", "far-right"] }[picks.length];
  if (!hostCard || !POS) return;

  // the players go in a drawer that starts closed
  const drawer = el("div", "watch-more");
  drawer.id = "watchMore";
  const inner = el("div", "watch-more-in");
  list.replaceWith(drawer);
  inner.appendChild(list);
  drawer.appendChild(inner);
  drawer.inert = true;

  // the peek carries the host channel's line now, so its card doesn't repeat it
  hostCard.classList.add("peeked");

  const peek = el("div", "watch-peek");
  const text = el("div", "peek-text");
  text.append(
    el("p", "peek-handle mono", host.handle),
    el("p", "peek-tagline", "“" + host.tagline + "”"),
    el("p", "peek-about mono", host.about)
  );
  const more = el("button", "peek-more mono");
  more.type = "button";
  more.setAttribute("aria-controls", "watchMore");
  more.setAttribute("aria-expanded", "false");
  const label = el("span", "", "Watch more");
  more.append(label, el("span", "peek-arrow", "↓"));
  text.appendChild(more);

  const fan = el("div", "peek-fan" + (POS.length === 5 ? " five" : ""));
  POS.forEach((pos, k) => {
    const { v, card } = picks[k];
    const c = el("button", "peek-card");
    c.type = "button";
    c.dataset.pos = pos;
    c.setAttribute("aria-label", "Watch " + v.title);
    const img = el("img");
    // the fan shows covers small, so it gets their light 480px copies
    img.src = v.cover.replace(/\.jpg$/, "-480.jpg");
    img.alt = "";
    img.loading = "lazy";
    img.decoding = "async";
    // a small play mark says the covers lead to the videos
    c.append(img, el("span", "peek-play"));
    // covers first: tapping one opens the players on that video's cover
    c.addEventListener("click", () => {
      card.select(v.id);
      setOpen(true, card);
    });
    fan.appendChild(c);
  });
  peek.append(text, fan);
  drawer.before(peek);

  // and a Show less at the end of the players, which glides back up to the covers
  const less = el("button", "peek-less mono");
  less.type = "button";
  less.setAttribute("aria-controls", "watchMore");
  less.append(el("span", "", "Show less"), el("span", "peek-arrow", "↑"));
  list.after(less);
  less.addEventListener("click", () => {
    const y = scrollY + peek.getBoundingClientRect().top - 90;
    if (lenis) lenis.scrollTo(y, { duration: 1.1, easing: easeInOut });
    else window.scrollTo({ top: y, behavior: reduceMotion ? "auto" : "smooth" });
    setOpen(false);
  });

  // the covers deal out of a pile each time the peek comes on screen, once
  // they've arrived (someone landing here from the share link would
  // otherwise see blank cards dealt), waiting 2.5 s at most
  const covers = [...fan.querySelectorAll("img")];
  const shown = () => covers.filter((img) => img.offsetParent !== null); // phones hide the outer pair
  const coversIn = () => Promise.race([
    Promise.all(shown().map((img) => img.complete ? null : new Promise((done) => {
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    }))),
    new Promise((done) => setTimeout(done, 2500))
  ]);
  if (!reduceMotion) {
    let dealing = null;
    let onScreen = false;
    new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio >= 0.35 && !onScreen) {
        onScreen = true;
        shown().forEach((img) => (img.loading = "eager"));
        coversIn().then(() => {
          if (!onScreen) return;
          peek.classList.add("dealt", "dealing");
          clearTimeout(dealing);
          dealing = setTimeout(() => peek.classList.remove("dealing"), 1200);
        });
      } else if (!entry.isIntersecting) {
        onScreen = false;
        peek.classList.remove("dealt", "dealing");
      }
    }, { threshold: [0, 0.35] }).observe(peek);
  } else {
    peek.classList.add("dealt");
  }

  let open = false;
  let settle = null;
  function setOpen(on, toCard) {
    if (on !== open) {
      open = on;
      clearTimeout(settle);
      drawer.classList.remove("settled");
      drawer.classList.toggle("open", on);
      drawer.inert = !on;
      more.setAttribute("aria-expanded", String(on));
      label.textContent = on ? "Show less" : "Watch more";
      if (on) settle = setTimeout(() => drawer.classList.add("settled"), 700); // nothing clipped once it's down
      else cards.forEach((c) => c.stop && c.stop());
    }
    if (!on) return;
    // bring the players up into view if they'd open below the fold
    requestAnimationFrame(() => {
      const target = toCard ? toCard.querySelector(".channel-media") : drawer;
      const top = target.getBoundingClientRect().top;
      if (!toCard && top < innerHeight * 0.6) return;
      const y = scrollY + top - (toCard ? 90 : innerHeight * 0.32);
      if (lenis) lenis.scrollTo(y, { duration: 1, easing: easeInOut });
      else window.scrollTo({ top: y, behavior: reduceMotion ? "auto" : "smooth" });
    });
  }
  more.addEventListener("click", () => setOpen(!open));
})();

// ============================================================
//  Gallery (click a photo to see it large)
// ============================================================
const gallery = SITE.gallery || [];

// Types text into a caption a letter at a time
function typeCaption(node, text) {
  clearInterval(node.typing);
  let n = 0;
  node.textContent = "";
  node.typing = setInterval(() => {
    node.textContent = text.slice(0, ++n);
    if (n >= text.length) clearInterval(node.typing);
  }, 28);
}
// On phones: type each caption once its tile has revealed
const captionWatch = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    captionWatch.unobserve(entry.target);
    const tile = entry.target;
    const caption = tile.querySelector(".shot-caption");
    const text = gallery[[...tile.parentNode.children].indexOf(tile)]?.caption || "";
    const delay = Number(getComputedStyle(tile).getPropertyValue("--d") || 0) * 120 + 800;
    setTimeout(() => typeCaption(caption, text), delay);
  });
}, { threshold: 0.3 });
const shotSrc = (p, width) => p.cover || `assets/gallery/${p.file}-${width}.jpg`;

gallery.forEach((p, i) => {
  const tile = el("button", ["shot", p.wide && "wide", p.fit === "contain" && "contain", "shot-reveal"].filter(Boolean).join(" "));
  tile.type = "button";
  tile.style.setProperty("--d", i % 3);
  tile.setAttribute("aria-label", p.video ? `Play the clip: ${p.caption}` : `View photo: ${p.caption}`);
  const img = el("img");
  img.src = shotSrc(p, 800);
  if (!p.cover) {
    img.srcset = `${shotSrc(p, 400)} 400w, ${shotSrc(p, 800)} 800w`;
    img.sizes = p.wide ? "(max-width: 760px) 100vw, 800px" : "(max-width: 760px) 50vw, 400px";
  }
  img.alt = p.alt || p.caption;
  img.loading = "lazy";
  img.decoding = "async";
  // A soft shimmer sweeps across the tile until the photo arrives
  if (!img.complete) {
    tile.classList.add("loading");
    const loaded = () => tile.classList.remove("loading");
    img.addEventListener("load", loaded, { once: true });
    img.addEventListener("error", loaded, { once: true });
  }
  const caption = el("span", "shot-caption mono", p.caption);
  tile.append(img, caption);
  if (p.video) {
    tile.classList.add("shot-clip");
    tile.appendChild(el("span", "shot-play"));
  }
  // Captions type themselves out: on each hover on computers, and once the
  // tile has finished revealing on phones (where captions always show)
  if (!reduceMotion) {
    if (canHover) {
      onHover(tile, () => typeCaption(caption, p.caption));
    } else {
      caption.textContent = "";
      captionWatch.observe(tile);
    }
  }
  tile.addEventListener("click", () => openShot(i));
  $("galleryGrid").appendChild(tile);
});

// The last tile points to Instagram for the rest
const instagram = SITE.links.find((l) => l.label === "Instagram" && l.url);
if (gallery.length && instagram) {
  const more = el("a", "shot shot-more shot-reveal");
  linkify(more, instagram.url);
  more.append(
    el("span", "mono shot-more-label", "More on Instagram"),
    el("span", "shot-more-handle", instagram.value),
    el("span", "shot-more-arrow", "↗")
  );
  // Size this tile so the grid always ends on a full row: 3 columns on
  // desktop, 2 on phones, where wide photos take a whole row
  const cells = gallery.reduce((n, p) => n + (p.wide ? 2 : 1), 0);
  const singles = gallery.filter((p) => !p.wide).length;
  more.style.setProperty("--span", (3 - (cells % 3)) % 3 || 3);
  more.style.setProperty("--span-m", singles % 2 ? 1 : 2);
  $("galleryGrid").appendChild(more);
}

// Tiles ease up one after another, left to right along each row. The
// delay comes from the column a tile really sits in (wide photos and the
// grid's packing move tiles around), so the order always reads left to right.
function staggerGallery() {
  const grid = $("galleryGrid");
  const cols = getComputedStyle(grid).gridTemplateColumns.split(" ").length || 1;
  const box = grid.getBoundingClientRect();
  const colW = box.width / cols;
  grid.querySelectorAll(".shot").forEach((tile) => {
    const col = Math.round((tile.getBoundingClientRect().left - box.left) / colW);
    tile.style.setProperty("--d", Math.min(cols - 1, Math.max(0, col)));
  });
}
if (gallery.length) {
  staggerGallery();
  addEventListener("resize", staggerGallery);
}

const lightbox = $("lightbox");
const lbImg = $("lbImg");
let lbIndex = 0;

// A gallery item with `video` is a clip: its cover opens with a play button
// over it and the Short plays right there in the viewer.
const lbFigure = document.querySelector(".lb-figure");
const lbStage = el("div", "lb-stage");
lbImg.replaceWith(lbStage);
lbStage.appendChild(lbImg);
const lbPlay = el("button", "lb-play");
lbPlay.type = "button";
lbPlay.hidden = true;
lbPlay.append(el("span", "lb-play-mark"), el("span", "mono", "Play the clip"));
lbStage.appendChild(lbPlay);
let lbFrame = null;
function stopShotVideo() {
  if (!lbFrame) return;
  lbFrame.remove();
  lbFrame = null;
  lbImg.hidden = false;
}
lbPlay.addEventListener("click", () => {
  const p = gallery[lbIndex];
  if (!p || !p.video) return;
  // opened straight off the disk, YouTube would refuse to play it here
  if (!location.protocol.startsWith("http")) {
    window.open(`https://www.youtube.com/shorts/${p.video}`, "_blank", "noopener");
    return;
  }
  stopShotVideo();
  lbFrame = youtubeFrame({ id: p.video, short: true, title: p.caption });
  lbFrame.classList.add("lb-frame");
  lbImg.hidden = true;
  lbPlay.hidden = true;
  lbStage.appendChild(lbFrame);
});

// "02 / 17": both digits roll like the belief odometers
const lbCount = $("lbCount");
const counterStrips = [];
if (gallery.length) {
  lbCount.textContent = "";
  for (let d = 0; d < 2; d++) {
    const strip = el("span", "odo-strip");
    for (let k = 0; k <= 9; k++) strip.appendChild(el("span", "", String(k)));
    const odo = el("span", "odo");
    odo.appendChild(strip);
    lbCount.appendChild(odo);
    counterStrips.push(strip);
  }
  lbCount.append(` / ${pad2(gallery.length)}`);
}
function setCounter(n) {
  const digits = pad2(n);
  counterStrips.forEach((strip, d) => { strip.style.transform = `translateY(${-digits[d]}em)`; });
  lbCount.setAttribute("aria-label", `Photo ${n} of ${gallery.length}`);
}

// dir: 1 = next, -1 = previous, 0 = just opened
function showShot(i, dir = 0) {
  lbIndex = (i + gallery.length) % gallery.length;
  const p = gallery[lbIndex];
  stopShotVideo();
  lbPlay.hidden = !p.video;
  // Show the grid-size copy right away, then swap in the large one
  lbImg.src = shotSrc(p, 800);
  lbImg.alt = p.alt || p.caption;
  const large = new Image();
  const wanted = lbIndex;
  large.onload = () => { if (wanted === lbIndex) lbImg.src = large.src; };
  large.src = shotSrc(p, 1600);
  setCounter(lbIndex + 1);
  $("lbText").textContent = p.caption;
  // The story is the punchline: it waits a beat after the photo, then comes
  // in word by word, pausing a little after commas and full stops
  const story = $("lbStory");
  story.textContent = "";
  const words = (p.story || "").split(" ").filter(Boolean);
  const step = Math.min(85, 1000 / words.length);
  let t = 0;
  words.forEach((word, w) => {
    const span = el("span", "lb-word");
    span.style.setProperty("--t", `${Math.round(t)}ms`);
    // The serif italic draws "1" like "l", so numbers get the sans font
    word.split(/(\d+(?:x\d+)?)/).filter(Boolean).forEach((part) => {
      span.appendChild(/^\d/.test(part) ? el("span", "digits", part) : document.createTextNode(part));
    });
    if (w) story.append(" ");
    story.appendChild(span);
    t += step + (/[.!?]["”]?$/.test(word) ? 260 : /,$/.test(word) ? 110 : 0);
  });
  story.hidden = !p.story;
  revealShot(dir);
  // Warm up the neighbours so arrowing through feels instant
  [lbIndex - 1, lbIndex + 1].forEach((j) => {
    const next = gallery[(j + gallery.length) % gallery.length];
    if (!next.video) new Image().src = shotSrc(next, 1600);
  });
}

// The photo opens like a curtain from the side you're heading towards,
// the same reveal the gallery tiles use. Its story line follows (see .tell).
function revealShot(dir) {
  const story = $("lbStory");
  story.classList.remove("tell");
  const play = () => {
    story.classList.add("tell");
    if (reduceMotion || !lbImg.animate) return;
    lbImg.getAnimations().forEach((a) => a.cancel());
    lbImg.animate([
      {
        opacity: 0,
        transform: `translate(${dir * 56}px, ${dir ? 0 : 34}px) scale(1.03)`,
        clipPath: dir > 0 ? "inset(0 0 0 24%)" : dir < 0 ? "inset(0 24% 0 0)" : "inset(24% 0 0 0)"
      },
      { opacity: 1, transform: "none", clipPath: "inset(0 0 0 0)" }
    ], { duration: 750, easing: "cubic-bezier(0.22, 1, 0.36, 1)" });
  };
  if (lbImg.complete) play();
  else lbImg.addEventListener("load", play, { once: true });
}

function openShot(i) {
  showShot(i);
  lightbox.showModal();
  if (lenis) lenis.stop();
}

lightbox.addEventListener("close", () => {
  stopShotVideo();
  if (lenis) lenis.start();
});
$("lbClose").addEventListener("click", () => lightbox.close());
$("lbPrev").addEventListener("click", () => showShot(lbIndex - 1, -1));
$("lbNext").addEventListener("click", () => showShot(lbIndex + 1, 1));
lightbox.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") showShot(lbIndex - 1, -1);
  if (e.key === "ArrowRight") showShot(lbIndex + 1, 1);
});

// Swipe: the photo follows your finger (or a dragged mouse), and letting go
// far enough, or flicking fast (past 0.11 px/ms, Emil Kowalski's number),
// moves to the next one; otherwise it settles back. A plain tap on the dark
// area still closes the viewer.
let drag = null;
let swiped = false;
lbImg.draggable = false;
const slide = (dx) => "translateX(" + dx + "px)";
lightbox.addEventListener("pointerdown", (e) => {
  if (!e.isPrimary || e.button > 0) return; // one finger only
  drag = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, dx: 0, axis: null };
  swiped = false;
});
lightbox.addEventListener("pointermove", (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x;
  const dy = e.clientY - drag.y;
  if (!drag.axis) {
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
    drag.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
    if (drag.axis === "x") lightbox.setPointerCapture(e.pointerId); // keeps following off the photo
  }
  if (drag.axis !== "x") return;
  drag.dx = dx;
  if (reduceMotion) return;
  lbStage.style.transform = slide(dx);
  lbStage.style.opacity = String(1 - Math.min(0.5, Math.abs(dx) / innerWidth));
});
const endDrag = (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const { dx, t, axis } = drag;
  drag = null;
  if (axis !== "x") return;
  swiped = true;
  const fast = Math.abs(dx) / Math.max(1, performance.now() - t) > 0.11;
  const faded = lbStage.style.opacity || "1";
  if (Math.abs(dx) > 60 || (fast && Math.abs(dx) > 20)) {
    const dir = dx < 0 ? 1 : -1;
    const next = () => {
      lbStage.style.transform = "";
      lbStage.style.opacity = "0";
      showShot(lbIndex + dir, dir); // the next photo comes in from the side, as with the arrows
      const back = () => (lbStage.style.opacity = "");
      if (lbImg.complete) requestAnimationFrame(back);
      else lbImg.addEventListener("load", back, { once: true });
    };
    if (reduceMotion) return next();
    lbStage.animate([{ transform: slide(dx), opacity: faded }, { transform: slide(-dir * innerWidth * 0.3), opacity: 0 }],
      { duration: 160, easing: EASE_OUT }).finished.then(next);
  } else {
    lbStage.style.transform = "";
    lbStage.style.opacity = "";
    if (!reduceMotion) lbStage.animate([{ transform: slide(dx), opacity: faded }, { transform: "none", opacity: 1 }], { duration: 220, easing: EASE_OUT });
  }
};
lightbox.addEventListener("pointerup", endDrag);
lightbox.addEventListener("pointercancel", endDrag);
lightbox.addEventListener("click", (e) => {
  if (!swiped && (e.target === lightbox || e.target.classList.contains("lb-figure"))) lightbox.close();
});

// ============================================================
//  Contact links (entries without a URL copy their value)
// ============================================================
SITE.links.forEach((l, i) => {
  const row = el(l.url ? "a" : "button", "link reveal");
  row.style.setProperty("--d", i);
  const arrow = el("span", l.url ? "link-arrow icon" : "link-arrow mono", l.url ? "↗" : "Copy");
  row.append(el("span", "link-label mono", l.label), el("span", "link-value", l.value), arrow);

  if (l.url) {
    linkify(row, l.url);
    // GoatCounter counts clicks on these, so the stats show which links people use
    row.dataset.goatcounterClick = `contact-${l.label.toLowerCase()}`;
    row.dataset.goatcounterTitle = `Contact: ${l.label}`;
  } else {
    row.type = "button";
    row.addEventListener("click", () => copyText(l.value).then((ok) => flashCopied(arrow, ok)));
  }
  $("linkList").appendChild(row);
});

// Hide sections that have nothing in them
[["crafts", SITE.crafts], ["hobbies", SITE.hobbies], ["beliefs", SITE.beliefs], ["channels", SITE.youtube], ["gallery", gallery]]
  .forEach(([id, list]) => {
    if (!list.length) {
      $(id).hidden = true;
      document.querySelector(`.nav a[href="#${id}"]`)?.remove();
    }
  });

// ============================================================
//  Scroll-in animations
// ============================================================
document.querySelectorAll(".split").forEach(splitLetters);

// Finale: once "Let's talk." is fully on screen, an orange line draws
// itself under "talk."
const talk = document.querySelector(".contact-title em");
if (talk) {
  talk.insertAdjacentHTML(
    "beforeend",
    '<svg class="talk-line" viewBox="0 0 100 12" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="M2 8 C 24 3, 62 2.5, 98 6.5" pathLength="1"/></svg>'
  );
  if (reduceMotion) {
    talk.classList.add("drawn");
  } else {
    const drawWatch = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      talk.classList.add("drawn");
      drawWatch.disconnect();
    }, { threshold: 1, rootMargin: "0px 0px -18% 0px" });
    drawWatch.observe(talk);
  }
}
// Section titles: the letters drift in from both sides, meet as the title
// reaches the middle of the screen, and dissolve upward as it leaves
document.querySelectorAll(".title.split, .contact-title.split, .channel-name.split").forEach((title) => {
  const letters = [...title.querySelectorAll(".c")];
  const mid = (letters.length - 1) / 2 || 1;
  letters.forEach((c, k) => c.style.setProperty("--o", ((k - mid) / mid).toFixed(3)));
  addScene(title, 0.25);
});
const eyebrows = [...document.querySelectorAll(".eyebrow")];
eyebrows.forEach((e) => e.classList.add("scramble"));

const revealer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    const node = entry.target;
    if (node.classList.contains("eyebrow")) {
      // Section numbers ("01 — About") scramble every time their section
      // comes back on screen, not just the first time
      if (entry.isIntersecting && !node.dataset.onScreen) {
        scramble(node, node.getAttribute("aria-label") || node.textContent, 700);
      }
      node.dataset.onScreen = entry.isIntersecting ? "1" : "";
      return;
    }
    if (!entry.isIntersecting) return;
    node.classList.add("in");
    revealer.unobserve(node);
  });
}, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
document.querySelectorAll(".reveal, .shot-reveal, .split, .eyebrow").forEach((n) => revealer.observe(n));

// Highlight the nav link for the section on screen. Each link covers its
// section and any unlisted ones after it (Crafts also covers the hobbies),
// and a thin line under it fills as you read through that stretch.
const navLinks = [...document.querySelectorAll(".nav a")];
const navSections = navLinks
  .map((a) => ({ a, section: document.querySelector(a.getAttribute("href")) }))
  .filter((n) => n.section);
function updateNav(y) {
  const mid = y + innerHeight / 2;
  const tops = navSections.map((n) => n.section.getBoundingClientRect().top + y);
  let k = 0;
  tops.forEach((t, i) => { if (t <= mid) k = i; });
  const pageEnd = document.documentElement.scrollHeight - innerHeight / 2;
  const end = Math.min(k + 1 < tops.length ? tops[k + 1] : pageEnd, pageEnd);
  const read = clamp01((mid - tops[k]) / Math.max(1, end - tops[k]));
  navSections.forEach((n, i) => {
    n.a.classList.toggle("active", i === k);
    n.a.style.setProperty("--read", i === k ? read.toFixed(3) : "0");
  });
}
if (reduceMotion) {
  // No per-frame loop with reduced motion: highlight on scroll instead
  addEventListener("scroll", () => updateNav(scrollY), { passive: true });
  updateNav(scrollY);
}

// ============================================================
//  Per-frame work: header, hero parallax, preview follow
// ============================================================
const header = $("header");
const hero = document.querySelector(".hero");
const depths = [0.6, 1, 1.4, 0.8, 1.2, 0.5];
let heroH = hero.offsetHeight;
let lastY = scrollY;
let frameY = -1;
let mouseX = 0, mouseY = 0, easeX = 0, easeY = 0;
let pointerX = innerWidth / 2, pointerY = innerHeight / 2, previewX = pointerX, previewY = pointerY;

addEventListener("resize", () => {
  heroH = hero.offsetHeight;
  frameY = -1;
});

if (canHover && !reduceMotion) {
  addEventListener("mousemove", (e) => {
    mouseX = e.clientX / innerWidth - 0.5;
    mouseY = e.clientY / innerHeight - 0.5;
    pointerX = e.clientX;
    pointerY = e.clientY;
  }, { passive: true });
}

// A ring in the corner fills like a shot meter as you scroll; at the
// bottom it turns orange (swish). Tapping it goes back to the top.
const meter = el("a", "shot-meter");
meter.href = "#top";
meter.setAttribute("aria-label", "Back to top");
meter.innerHTML =
  '<svg viewBox="0 0 44 44" aria-hidden="true"><circle class="shot-meter-track" cx="22" cy="22" r="19"/>' +
  '<circle class="shot-meter-fill" cx="22" cy="22" r="19"/></svg><span class="shot-meter-arrow" aria-hidden="true">↑</span>' +
  '<span class="shot-meter-pct mono" aria-hidden="true">0%</span>';
document.body.appendChild(meter);
document.body.classList.add("has-meter");
document.querySelector('.footer a[href="#top"]')?.remove();
const meterFill = meter.querySelector(".shot-meter-fill");
const meterPct = meter.querySelector(".shot-meter-pct");
const mottoWords = [...document.querySelectorAll("#footMotto .fw")];
const footer = document.querySelector(".footer");
let meterIdle = null;
const METER_LEN = 2 * Math.PI * 19;
meterFill.style.strokeDasharray = METER_LEN.toFixed(2);

// On phones the ring would sit on the text, so it hides with the header
// while you scroll down and comes back when you scroll up
const narrowScreen = matchMedia("(max-width: 960px)");

function updateMeter(y) {
  const max = document.documentElement.scrollHeight - innerHeight;
  const p = max > 0 ? Math.min(1, y / max) : 0;
  meterFill.style.strokeDashoffset = (METER_LEN * (1 - p)).toFixed(2);
  // as the footer slides into view, its motto lights up word by word
  if (!reduceMotion && mottoWords.length) {
    const f = footer.getBoundingClientRect();
    const lit = Math.round(clamp01((innerHeight - f.top) / f.height) * mottoWords.length);
    mottoWords.forEach((w, i) => w.classList.toggle("lit", i < lit));
  }
  // while you scroll, the ring shows how far down you are instead of the arrow
  meterPct.textContent = `${Math.round(p * 100)}%`;
  meter.classList.add("scrolling");
  clearTimeout(meterIdle);
  meterIdle = setTimeout(() => meter.classList.remove("scrolling"), 900);
  const reading = narrowScreen.matches && header.classList.contains("tucked");
  meter.classList.toggle("on", y > heroH * 0.6 && !reading);
  meter.classList.toggle("swish", p > 0.995);
}
updateMeter(scrollY);

// Sova's abilities on the agents wall. Their effects play on a layer over
// the wall that doesn't catch clicks.
function wallFx(block) {
  let fx = block.querySelector(".ww-fx");
  if (!fx) {
    fx = el("div", "ww-fx");
    fx.setAttribute("aria-hidden", "true");
    block.classList.add("has-fx");
    block.appendChild(fx);
  }
  return fx;
}

// Sova's effect colours (tokens in style.css): a white-hot core, and the cyan
// and electric blue sampled from the glowing parts of his official art
function sovaColors() {
  const css = getComputedStyle(document.documentElement);
  const get = (name) => css.getPropertyValue(name).trim();
  return { core: get("--sova-core"), cyan: get("--sova-cyan"), blue: get("--sova-blue") };
}
// the bloom: a tight cyan glow inside a wider blue one
const sovaBloom = ({ cyan, blue }) => `0 0 4px ${cyan}, 0 0 14px ${blue}, 0 0 30px ${blue}`;

// The Shock Bolt's own colours, sampled from its dome in the game (bluer and
// more violet than Sova's cyan). Same shape as sovaColors, so sovaBloom works.
function shockColors() {
  const css = getComputedStyle(document.documentElement);
  const get = (name) => css.getPropertyValue(name).trim();
  return { core: get("--shock-core"), cyan: get("--shock-glow"), blue: get("--shock-deep") };
}

// Electricity: numbers that look random but hold still for one flicker (the
// same seed gives the same shape), and a jagged line along any curve fn(0..1)
const noise = (i, seed) => {
  const s = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
  return s - Math.floor(s);
};
function jagged(fn, steps, amount, seed) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const [x, y] = fn(i / steps);
    const j = i === 0 || i === steps ? 0 : amount;
    points.push(`${x + (noise(i, seed) - 0.5) * 2 * j},${y + (noise(i + 50, seed) - 0.5) * 2 * j}`);
  }
  return points.join(" ");
}
const straight = (a, b) => (u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];

// A revealed word turns into a glowing outline for `ms`, like an enemy's
// silhouette when Sova reveals them
function revealWord(node, delay, ms) {
  setTimeout(() => {
    node.classList.add("revealed");
    setTimeout(() => node.classList.remove("revealed"), ms);
  }, delay);
}

// Ult points, like the game's: Hunter's Fury needs all 8. Each of Sova's
// other abilities earns 2; once they're all in, the word glows, ready.
// Kept per browser, so a visitor keeps their progress.
function renderUltPoints(fresh = 0) {
  const row = document.querySelector(".ult-points");
  if (!row) return;
  [...row.children].forEach((pip, i) => {
    pip.classList.toggle("lit", i < ultPoints);
    if (i >= ultPoints - fresh && i < ultPoints) pip.animate([{ scale: "2" }, { scale: "1" }], { duration: 450, easing: "ease-out" });
  });
  row.closest(".ww").classList.toggle("ult-ready", ultPoints >= ULT_MAX);
  updateUltButton();
}
function setUltPoints(n) {
  const before = ultPoints;
  ultPoints = Math.max(0, Math.min(ULT_MAX, n));
  try {
    localStorage.setItem("sovaUlt", String(ultPoints));
  } catch (e) {}
  renderUltPoints(Math.max(0, ultPoints - before));
  if (before < ULT_MAX && ultPoints >= ULT_MAX) {
    toast(canHover ? "Ultimate ready · press X" : "Ultimate ready · tap Hunter's Fury");
  }
}
const earnUlt = () => setUltPoints(ultPoints + 2);
// Casting spends them all: the points drain out one after another, last one
// first, the way the game's ult meter empties when you use it
function spendUlt(item, over) {
  const pips = [...(item.querySelector(".ult-points")?.children || [])];
  const had = ultPoints;
  ultPoints = 0;
  try {
    localStorage.setItem("sovaUlt", "0");
  } catch (e) {}
  item.classList.remove("ult-ready");
  updateUltButton();
  pips.slice(0, had).reverse().forEach((pip, k) => {
    setTimeout(() => {
      pip.classList.remove("lit");
      pip.animate([{ scale: "2.2", filter: "brightness(2)" }, { scale: "1", filter: "none" }], { duration: 320, easing: "ease-out" });
    }, (k * over) / Math.max(1, had));
  });
}
// Not ready yet: the points shake and show how many are in
function ultNotReady(item) {
  const row = item.querySelector(".ult-points");
  const count = item.querySelector(".ult-count");
  row?.animate([{ translate: "0 0" }, { translate: "-3px 0" }, { translate: "3px 0" }, { translate: "-2px 0" }, { translate: "0 0" }], { duration: 320 });
  if (!count) return;
  scramble(count, `${ultPoints}/${ULT_MAX}`, 300);
  count.classList.add("show");
  clearTimeout(count.hide);
  count.hide = setTimeout(() => count.classList.remove("show"), 1600);
}

// A word lights up in Sova's blue with a bloom, like an enemy being revealed
function flashWord(node, delay, rise = 0.15, duration = 1100) {
  const c = sovaColors();
  const lit = { color: c.core, textShadow: sovaBloom(c) };
  node.animate([{ ...lit, offset: rise }, { ...lit, offset: rise + 0.3 }], { duration, delay, easing: "ease-out" });
}

// Sounds, each loaded the first time it's needed; one won't start over while
// it's still playing. Browsers block them until the visitor has clicked or
// tapped something on the page.
// Everything goes through one Web Audio mixer, so quiet clips can be brought
// up to a normal level and the switch can cut them off mid-sound
let audioCtx = null;
const playingNow = new Set();
function audio() {
  if (muted) return null;
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  } catch (e) {
    return null;
  }
  if (audioCtx.state === "suspended") audioCtx.resume().catch(() => {});
  return audioCtx;
}
function stopSounds() {
  sounding.clear();
  playingNow.forEach((source) => {
    try {
      source.stop();
    } catch (e) {}
  });
  playingNow.clear();
}

// Valorant-like UI sounds, made right in the browser (no files): a whoosh when
// the agent select opens
function uiSound(kind) {
  const ctx = audio();
  if (!ctx) return;
  const t = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = 0.35;
  out.connect(ctx.destination);
  const tone = (freq, at, dur, type, peak, endFreq) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t + at);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, t + at + dur);
    gain.gain.setValueAtTime(0.0001, t + at);
    gain.gain.exponentialRampToValueAtTime(peak, t + at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
    osc.connect(gain).connect(out);
    osc.start(t + at);
    osc.stop(t + at + dur + 0.02);
  };
  const whoosh = (at, dur, from, to, peak) => {
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.Q.value = 1.2;
    band.frequency.setValueAtTime(from, t + at);
    band.frequency.exponentialRampToValueAtTime(to, t + at + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t + at);
    gain.gain.exponentialRampToValueAtTime(peak, t + at + dur * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
    src.connect(band).connect(gain).connect(out);
    src.start(t + at);
    src.stop(t + at + dur);
  };
  if (kind === "hover") tone(2400, 0, 0.05, "sine", 0.25);
  if (kind === "open") whoosh(0, 0.35, 400, 2800, 0.35);
  if (kind === "lock") {
    whoosh(0, 0.3, 300, 5000, 0.5);
    tone(110, 0.28, 0.5, "sine", 0.9, 45);
    tone(1320, 0.3, 0.6, "triangle", 0.18);
    tone(1980, 0.34, 0.5, "sine", 0.1);
  }
}

// A sound file, decoded and measured the first time it's asked for: quiet
// recordings get lifted to the same level as the rest
const clips = {};
const sounding = new Set(); // what's playing right now, so nothing doubles up
// Load and measure a clip (once), so it's ready the moment it's needed
function primeSound(src) {
  const ctx = audio();
  if (!ctx || clips[src]) return;
  clips[src] = fetch(src)
    .then((res) => res.arrayBuffer())
    .then((data) => ctx.decodeAudioData(data))
    .then((buffer) => {
      const wave = buffer.getChannelData(0);
      let peak = 0;
      for (let i = 0; i < wave.length; i += 4) peak = Math.max(peak, Math.abs(wave[i]));
      return { buffer, gain: Math.min(0.85 / Math.max(peak, 0.002), 220) };
    })
    .catch(() => null);
}
function playSound(src, level = 0.7) {
  const ctx = audio();
  if (!ctx) return;
  primeSound(src);
  if (sounding.has(src)) return; // let it finish before it can play again
  sounding.add(src);
  clips[src].then((clip) => {
    if (!clip || muted) return sounding.delete(src);
    const source = ctx.createBufferSource();
    source.buffer = clip.buffer;
    const gain = ctx.createGain();
    gain.gain.value = clip.gain * level;
    source.connect(gain).connect(ctx.destination);
    source.addEventListener("ended", () => {
      playingNow.delete(source);
      sounding.delete(src);
    });
    playingNow.add(source);
    source.start();
  });
}
// The agent select's own sounds
const SOUND_HOVER = "assets/audio/lock-in-hover.mp3"; // hovering LOCK IN
const SOUND_LOCK = "assets/audio/lock-in.wav"; // the lock-in, straight from the clip
const SOUND_LOCKED = "assets/audio/sova-locked-in.mp3"; // Sova, once he's locked in

// "I am the hunter": the Sasha easter egg
function playHunter() {
  playSound("assets/audio/i-am-the-hunter.mp3");
}

// A small message in the corner (like the Owl Drone's)
function toast(text, ms = 2800) {
  const node = el("div", "drone-toast mono", text);
  node.setAttribute("role", "status");
  document.body.appendChild(node);
  requestAnimationFrame(() => node.classList.add("on"));
  setTimeout(() => {
    node.classList.remove("on");
    setTimeout(() => node.remove(), 500);
  }, ms);
}

// A kill feed in the top corner of Sova's wall, styled like the game's: the
// killer's portrait and name on the ally teal, what they used, the victim on
// the enemy red, with a gold rim because they're the player's own kills.
// Four lines at most; each fades after a few seconds.
const FEED_ICONS = {
  shock: '<path d="M13 2 7 13h5l-2 9 7-12h-5l2-8z"/>',
  fury: '<path d="M2 9h13M2 15h13M14 5l7 7-7 7"/>',
  recon: '<path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6-10-6-10-6z"/><circle cx="12" cy="12" r="2.5"/>'
};
const ENEMY = '<svg viewBox="0 0 24 24"><path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9zm-8 10a8 8 0 0 1 16 0z"/></svg>';
function killFeed(block, kind, target) {
  let feed = block.querySelector(".kill-feed");
  if (!feed) {
    feed = el("div", "kill-feed");
    feed.setAttribute("aria-hidden", "true");
    block.classList.add("has-fx");
    block.appendChild(feed);
  }
  const row = el("div", "kf-row");
  row.innerHTML =
    '<span class="kf-side kf-ally"><img class="kf-agent" alt=""><span class="kf-name"></span></span>' +
    `<span class="kf-weapon"><svg viewBox="0 0 24 24">${FEED_ICONS[kind]}</svg></span>` +
    `<span class="kf-side kf-enemy"><span class="kf-name"></span><span class="kf-agent kf-unknown">${ENEMY}</span></span>`;
  row.querySelector(".kf-agent").src = block.querySelector(".ww-face")?.src || "";
  const [who, victim] = row.querySelectorAll(".kf-name");
  who.textContent = block.dataset.ign || SITE.firstName;
  victim.textContent = target;
  feed.appendChild(row);
  while (feed.children.length > 4) feed.firstChild.remove();
  requestAnimationFrame(() => row.classList.add("on"));
  setTimeout(() => {
    row.classList.remove("on");
    setTimeout(() => row.remove(), 450);
  }, 4200);
}

// Only one of Sova's abilities runs at a time: whatever is playing has to
// finish its animation before anything else can start
let abilityBusy = false;
function claimAbility(ms, block, item) {
  if (abilityBusy) return false;
  abilityBusy = true;
  block?.classList.add("abilities-busy"); // the others sit it out meanwhile
  item?.classList.add("casting");
  setTimeout(() => {
    abilityBusy = false;
    block?.classList.remove("abilities-busy");
    item?.classList.remove("casting");
  }, ms);
  return true;
}

// Sova's abilities come from his energy bow, not the Operator he's holding
// in the picture: it appears in the open space between the words and the
// picture (or near the wall's right edge when they're stacked), at height y
function bowSpot(block, y) {
  const box = block.getBoundingClientRect();
  const img = block.querySelector(".wordwall-art img");
  const wordsRight = Math.max(...[...block.querySelectorAll(".ww")].map((w) => w.getBoundingClientRect().right));
  const art = img && img.getBoundingClientRect();
  if (art && art.left > wordsRight + 80) return { x: (wordsRight + art.left) / 2 - box.left, y };
  return { x: box.width - 50, y };
}

// An arc from one point to another whose top is `lift` px above the higher
// end, taking `time` s: its gravity and starting speed
function arcOf(from, to, lift, time) {
  const top = Math.min(from.y, to.y) - lift;
  const g = (2 * (Math.sqrt(from.y - top) + Math.sqrt(to.y - top)) ** 2) / (time * time);
  return { g, vx: (to.x - from.x) / time, vy: -Math.sqrt(2 * g * (from.y - top)) };
}
// the direction a bolt leaves in, to aim the bow (degrees, 0 = right)
function launchAngle(from, to, lift, time) {
  const { vx, vy } = arcOf(from, to, lift, time);
  return (Math.atan2(vy, vx) * 180) / Math.PI;
}

// A bolt flies like an arrow: each leg is an arc from one point to the next,
// and the bolt points along its path
function flyBolt(fx, legs) {
  const total = legs.reduce((sum, leg) => sum + leg.time, 0);
  const frames = [];
  let elapsed = 0;
  let last = null;
  legs.forEach(({ from, to, lift, time }) => {
    // lift 0 is a straight shot; anything else, an arc
    const { g, vx, vy } = lift ? arcOf(from, to, lift, time) : { g: 0, vx: (to.x - from.x) / time, vy: (to.y - from.y) / time };
    for (let i = 0; i <= 16; i++) {
      const t = (i / 16) * time;
      let deg = (Math.atan2(vy + g * t, vx) * 180) / Math.PI;
      if (last !== null) deg += Math.round((last - deg) / 360) * 360; // no spinning round
      last = deg;
      frames.push({
        translate: `${from.x + vx * t}px ${from.y + vy * t + (g * t * t) / 2}px`,
        rotate: `${deg}deg`,
        offset: (elapsed + t) / total
      });
    }
    elapsed += time;
  });
  frames[frames.length - 1].offset = 1;
  const bolt = el("span", "sova-bolt");
  fx.appendChild(bolt);
  return bolt.animate(frames, { duration: total * 1000, fill: "forwards" }).finished.then(() => bolt.remove());
}

// Sova's energy bow, held at `grip` (in the layer's coordinates) and aimed
// at `angle` (degrees, 0 = right); H sets its size. draw(to, ms) pulls the
// string back (0-1) while it crackles and the arrowhead charges into an orb;
// release(fly) lets go and the string twangs, returning where the arrowhead
// was (with fly, the arrow flies off too); nock() puts a new arrow on.
function makeBow(layer, grip, angle, H) {
  const S = 3 * H;
  const o = S / 2; // the grip, in the bow's own box
  const top = [o - 0.3 * H, o - 0.95 * H];
  const bottom = [o - 0.3 * H, o + 0.95 * H];
  const rest = o - 0.3 * H;
  const drawn = o - 0.7 * H;
  const arrowLen = 1.25 * H;
  const box = el("div", "bow-shot");
  box.setAttribute("aria-hidden", "true");
  box.style.cssText = `left:${grip.x - o}px;top:${grip.y - o}px;width:${S}px;height:${S}px;rotate:${angle}deg`;
  box.innerHTML =
    `<svg viewBox="0 0 ${S} ${S}"><path class="bow-limb" d="M${top} Q${o + 0.3 * H},${o} ${bottom}"/>` +
    '<line class="bow-tracer"/><polyline class="bow-string"/><line class="bow-arrow"/>' +
    '<polyline class="bow-arc"/><polyline class="bow-arc"/><polyline class="bow-arc"/></svg>' +
    '<span class="bow-orb"></span>';
  layer.appendChild(box);
  const string = box.querySelector(".bow-string");
  const arrow = box.querySelector(".bow-arrow");
  const tracer = box.querySelector(".bow-tracer");
  const orb = box.querySelector(".bow-orb");
  const arcs = [...box.querySelectorAll(".bow-arc")];
  tracer.style.opacity = "0";
  const setLine = (node, x1, x2) => {
    node.setAttribute("x1", x1);
    node.setAttribute("x2", x2);
    node.setAttribute("y1", o);
    node.setAttribute("y2", o);
  };
  let p = 0; // how far the string is drawn back, 0-1
  let pull = null; // the draw in progress
  let loosed = null; // when it was let go (and how far it was drawn)
  let alive = true;
  requestAnimationFrame(() => box.classList.add("on"));
  const frame = (now) => {
    if (!alive) return;
    if (pull) {
      const k = clamp01((now - pull.t0) / pull.ms);
      p = pull.from + (pull.to - pull.from) * (1 - (1 - k) ** 3);
      if (k >= 1) {
        const { done } = pull;
        pull = null;
        done();
      }
    }
    const seed = Math.floor(now / 45); // the lightning changes ~20 times a second
    if (!loosed) {
      const nx = rest + (drawn - rest) * p + (p > 0.98 ? (noise(seed, 3) - 0.5) * 1.5 : 0); // trembling at full draw
      const tip = nx + arrowLen;
      const zap = 6 * p;
      string.setAttribute("points", `${jagged(straight(top, [nx, o]), 7, zap, seed)} ${jagged(straight([nx, o], bottom), 7, zap, seed + 9)}`);
      setLine(arrow, nx, tip);
      orb.style.translate = `${tip}px ${o}px`;
      orb.style.scale = String((0.25 + 0.75 * p) * (1 + 0.08 * Math.sin(now / 35)));
      // sparks swirling round the charging arrowhead
      arcs.forEach((arc, i) => {
        if (p < 0.35) return arc.setAttribute("points", "");
        const rr = 0.24 * H * (0.6 + 0.4 * p) * (0.85 + 0.3 * noise(i + 7, seed));
        const a0 = noise(i, seed) * 6.28;
        const sweep = 1.8 + noise(i + 3, seed);
        arc.setAttribute("points", jagged((u) => [tip + rr * Math.cos(a0 + sweep * u), o + rr * Math.sin(a0 + sweep * u)], 7, 3, seed + i * 5));
      });
    } else {
      // the string twangs back and settles; a flying arrow keeps going
      const s = (now - loosed.at) / 1000;
      const nx = rest + (drawn - rest) * loosed.p * Math.exp(-s / 0.09) * Math.cos(2 * Math.PI * 11 * s);
      string.setAttribute("points", `${top} ${nx},${o} ${bottom}`);
      if (loosed.fly) {
        const tip = loosed.tip + 2800 * s;
        setLine(arrow, tip - arrowLen, tip);
        setLine(tracer, loosed.tip, tip - arrowLen);
        tracer.style.opacity = String(Math.max(0, 1 - s / 0.35));
        orb.style.translate = `${tip}px ${o}px`;
        orb.style.scale = String(Math.max(0.5, 1 - s));
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return {
    draw: (to, ms) => new Promise((done) => (pull = { from: p, to, ms, t0: performance.now(), done })),
    release(fly = false) {
      const tip = rest + (drawn - rest) * p + arrowLen;
      loosed = { at: performance.now(), p, tip, fly };
      p = 0;
      arcs.forEach((arc) => arc.setAttribute("points", ""));
      if (!fly) arrow.style.opacity = orb.style.opacity = "0";
      const a = (angle * Math.PI) / 180;
      return { x: grip.x + (tip - o) * Math.cos(a), y: grip.y + (tip - o) * Math.sin(a) };
    },
    nock() {
      loosed = null;
      arrow.style.opacity = orb.style.opacity = "";
      tracer.style.opacity = "0";
    },
    fade() {
      box.classList.remove("on");
      setTimeout(() => {
        alive = false;
        box.remove();
      }, 350);
    }
  };
}

// The charge meter under the bow: two bars filling up over `ms`, like the
// game's for its bolts
function chargeBars(layer, at, ms) {
  const bars = el("span", "charge-bars");
  bars.setAttribute("aria-hidden", "true");
  bars.append(el("i"), el("i"));
  bars.style.left = `${at.x}px`;
  bars.style.top = `${at.y}px`;
  bars.style.setProperty("--half", `${ms / 2}ms`);
  layer.appendChild(bars);
  requestAnimationFrame(() => requestAnimationFrame(() => bars.classList.add("filling")));
  return () => bars.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" }).finished.then(() => bars.remove());
}

// A ring of blue where a bolt lands, bounces or pings
function tink(fx, at, size = 60, duration = 380) {
  const ring = el("span", "sova-ring");
  ring.style.left = `${at.x}px`;
  ring.style.top = `${at.y}px`;
  fx.appendChild(ring);
  ring.animate([{ width: "0px", height: "0px", opacity: 1 }, { width: `${size}px`, height: `${size}px`, opacity: 0 }],
    { duration, easing: "ease-out", fill: "forwards" }).finished.then(() => ring.remove());
}

// Recon Bolt on the real ability's timing (VALORANT wiki): Sova's bow comes
// up and charges fully in a blink (both bars of the charge meter), the bolt
// shoots straight into the word and sticks, and 0.667 s later it pulses,
// twice, 1.6 s apart. Each ring reveals the other words as it reaches them.
let pinging = false;
function reconPing(block, item) {
  if (pinging || !claimAbility(4800, block, item)) return;
  pinging = true;
  earnUlt();
  const box = block.getBoundingClientRect();
  const src = item.querySelector(".ww-text").getBoundingClientRect();
  const x = src.left + src.width / 2 - box.left;
  const y = src.top + src.height / 2 - box.top;
  const reach = Math.hypot(Math.max(x, box.width - x), Math.max(y, box.height - y));
  const fx = wallFx(block);
  // straight at the word, fast
  const grip = bowSpot(block, y + 16);
  const flight = { to: { x, y }, lift: 0, time: 0.16 };
  const bow = makeBow(fx, grip, (Math.atan2(y - grip.y, x - grip.x) * 180) / Math.PI, 56);
  const hideBars = chargeBars(fx, { x: grip.x, y: grip.y + 64 }, 420);
  let pulses = 0;
  const pulse = () => {
    // a few rings go out together, the way the bolt's sonar does
    tink(fx, { x, y }, reach * 2, 1800);
    setTimeout(() => tink(fx, { x, y }, reach * 1.4, 1300), 140);
    setTimeout(() => tink(fx, { x, y }, reach, 1000), 280);
    const others = [...block.querySelectorAll(".ww-text")].filter((t) => !item.contains(t));
    if (!pulses++) killFeed(block, "recon", `${others.length} revealed`);
    others.forEach((t) => {
      const r = t.getBoundingClientRect();
      const d = Math.hypot(r.left + r.width / 2 - box.left - x, r.top + r.height / 2 - box.top - y);
      revealWord(t, (d / reach) * 1800, 750); // revealed for 0.75 s (VALORANT wiki)
    });
  };
  bow.draw(1, 420)
    .then(() => {
      const from = bow.release();
      tink(fx, from, 50); // fully charged: it flashes as it fires
      setTimeout(() => {
        bow.fade();
        hideBars();
      }, 450);
      return flyBolt(fx, [{ ...flight, from }]);
    })
    .then(() => {
      // stuck in the word, blinking while it winds up and scans
      const stuck = el("span", "bolt-stuck");
      stuck.style.left = `${x}px`;
      stuck.style.top = `${y}px`;
      fx.appendChild(stuck);
      tink(fx, { x, y }, 40);
      setTimeout(pulse, 667);
      setTimeout(pulse, 667 + 1600);
      setTimeout(() => {
        stuck.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: "forwards" }).finished.then(() => stuck.remove());
        pinging = false;
      }, 667 + 1600 + 1800);
    });
}

// Hunter's Fury on the real ult's timing (VALORANT wiki): 0.8 s to equip,
// then three charges, each winding up for 1 s before a wall-piercing blast,
// one every 2.125 s. Sova's energy bow comes up level with the word, beside
// the picture (where he's holding an Operator), and draws for each charge;
// each blast leaves the arrowhead and goes straight through the word, on
// across the wall, pulsing and fading and lighting the word up for a second.
// The three charge pips go out one by one. It needs all 8 ult points first.
let firing = false;

// Phones: when Hunter's Fury has all its points and its word is on screen,
// a button like the game's ult icon comes up at the bottom of the screen,
// so a friend doesn't have to hunt for the word to fire it
function setupUltButton() {
  if (canHover || reduceMotion) return;
  const item = document.querySelector('.ww[data-key="X"]');
  if (!item) return;
  const block = item.closest(".wordwall");
  ultButton = el("button", "ult-button");
  ultButton.type = "button";
  ultButton.setAttribute("aria-label", "Fire Hunter's Fury");
  const ring = el("span", "ult-button-ring");
  ring.setAttribute("aria-hidden", "true");
  for (let k = 0; k < ULT_MAX; k++) {
    const pip = el("i");
    pip.style.setProperty("--k", k);
    ring.appendChild(pip);
  }
  const icon = el("img");
  icon.src = item.dataset.icon || "";
  icon.alt = "";
  ultButton.append(ring, icon);
  ultButton.addEventListener("click", () => huntersFury(block, item));
  document.body.appendChild(ultButton);
  new IntersectionObserver(([entry]) => {
    furyOnScreen = entry.isIntersecting;
    updateUltButton();
  }, { threshold: 0.6 }).observe(item);
}
function updateUltButton() {
  if (!ultButton) return;
  ultButton.classList.toggle("on", furyOnScreen && ultPoints >= ULT_MAX && !firing);
}
function huntersFury(block, item) {
  if (firing) return;
  if (ultPoints < ULT_MAX) return ultNotReady(item);
  if (!claimAbility(7200, block, item)) return;
  firing = true;
  spendUlt(item, 800); // gone by the time the bow is up
  item.classList.add("ulting");
  const EQUIP = 800;
  const WINDUP = 1000;
  const EVERY = 2125;
  const box = block.getBoundingClientRect();
  const text = item.querySelector(".ww-text");
  const r = text.getBoundingClientRect();
  const hit = { x: r.left + r.width / 2 - box.left, y: r.top + r.height * 0.55 - box.top };
  const grip = bowSpot(block, hit.y);
  const angle = (Math.atan2(hit.y - grip.y, hit.x - grip.x) * 180) / Math.PI;
  const reach = Math.hypot(box.width, box.height);
  const fx = wallFx(block);
  const pipBox = item.querySelector(".ult-pips");
  const pips = pipBox ? [...pipBox.children] : [];
  pips.forEach((p) => p.classList.remove("used"));
  pipBox?.classList.add("armed");
  const bow = makeBow(fx, grip, angle, 60);
  const label = el("div", "ult-label mono", text.textContent);
  label.setAttribute("aria-hidden", "true");
  fx.appendChild(label);
  const blast = (n, from) => {
    const beam = el("span", "fury-beam");
    beam.style.left = `${from.x - reach}px`;
    beam.style.top = `${from.y}px`;
    beam.style.width = `${reach}px`;
    beam.style.rotate = `${angle - 180}deg`;
    fx.appendChild(beam);
    pips[n]?.classList.add("used");
    beam.animate([
      { clipPath: "inset(0 0 0 100%)", opacity: 1, scale: "1 0.4" },
      { clipPath: "inset(0 0 0 0)", opacity: 1, scale: "1 1.35", offset: 0.12 },
      { clipPath: "inset(0 0 0 0)", opacity: 0.85, scale: "1 1", offset: 0.4 },
      { clipPath: "inset(0 0 0 0)", opacity: 0, scale: "1 0.25" }
    ], { duration: 950, easing: "ease-out" }).finished.then(() => beam.remove());
    flashWord(text, 60, 0.05);
    killFeed(block, "fury", text.textContent);
  };
  for (let n = 0; n < 3; n++) {
    const fireAt = EQUIP + WINDUP + n * EVERY;
    setTimeout(() => {
      if (n) bow.nock();
      bow.draw(1, WINDUP);
    }, fireAt - WINDUP);
    setTimeout(() => blast(n, bow.release()), fireAt);
  }
  setTimeout(() => {
    bow.fade();
    label.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: "forwards" }).finished.then(() => label.remove());
    pipBox?.classList.remove("armed");
    item.classList.remove("ulting");
    firing = false;
    updateUltButton();
  }, EQUIP + WINDUP + 2 * EVERY + 900);
}

// Owl Drone: hovering the word puts the drone's HUD (from the game) around
// your cursor for a few seconds, like flying it. Computers only.
const DRONE_HUD =
  '<svg viewBox="-160 -160 320 320">' +
  '<path class="hud-arc" d="M-68.8 98.3A120 120 0 0 1-68.8-98.3"/>' +
  '<path class="hud-arc" d="M68.8-98.3A120 120 0 0 1 68.8 98.3"/>' +
  '<path class="hud-bar" d="M-91.9 77.1A120 120 0 0 1-119.9 4.2"/>' +
  '<path class="hud-energy" d="M119.9 4.2A120 120 0 0 1 91.9 77.1"/>' +
  '<path class="hud-fuel-track" d="M-68 117.8A136 136 0 0 0 68 117.8"/>' +
  '<path class="hud-fuel" d="M-68 117.8A136 136 0 0 0 68 117.8"/>' +
  '<path class="hud-line" d="M-58-100H58M-58-74H58"/>' +
  '<text class="hud-label" x="0" y="-87"></text>' +
  '<path class="hud-line" d="M-156 0H-86M86 0H156M-150-44H-128M-150 44H-128M128-44H150M128 44H150' +
  'M-96 2L-62 36L-84 66M96 2L62 36L84 66M-110 28H-102M-106 24V32M108 22L104 29H109L105 36' +
  'M-4 142h8v13h-8ZM-2 140h4M-19 0H-15M15 0H19"/>' +
  '<path class="hud-dot" d="M-2 148h4v5h-4Z"/>' +
  '<circle class="hud-reticle" r="9"/><circle class="hud-dot" r="1.6"/></svg>';
const pointer = { x: innerWidth / 2, y: innerHeight / 2 };
let hud = null;
addEventListener("pointermove", (e) => {
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  if (hud && canHover) hud.style.translate = `${pointer.x}px ${pointer.y}px`;
}, { passive: true });

// While the drone's HUD is up, clicking empty space fires its marking dart
// there, once per flight. The dart sticks and pings twice, like the game's:
// 1.6 s after it lands, then 1.2 s after that 0.6 s ping ends (VALORANT
// wiki), lighting up the words near it.
document.addEventListener("click", (e) => {
  if (!hud || hud.dataset.fired || e.button !== 0) return;
  if (e.target.closest("a, button, input, textarea, select, label, iframe, summary, dialog, .ww-pick, .agent-select")) return;
  hud.dataset.fired = "1";
  scramble(hud.querySelector(".hud-label"), "BOLT FIRED", 400);
  fireDart(e.clientX + scrollX, e.clientY + scrollY);
});

// A layer over the whole page for effects that aren't tied to one section
function pageFx() {
  let fx = document.querySelector(".page-fx");
  if (!fx) {
    fx = el("div", "page-fx");
    fx.setAttribute("aria-hidden", "true");
    document.body.appendChild(fx);
  }
  fx.style.height = `${document.documentElement.scrollHeight}px`;
  return fx;
}

function fireDart(x, y) {
  earnUlt();
  const fx = pageFx();
  const dart = el("span", "sova-bolt");
  fx.appendChild(dart);
  // it streaks away from the drone into the page, shrinking with distance
  dart.animate([
    { translate: `${x}px ${y + 130}px`, rotate: "-90deg", scale: "2.4" },
    { translate: `${x}px ${y}px`, rotate: "-90deg", scale: "0.7" }
  ], { duration: 280, easing: "cubic-bezier(0.3, 0.6, 0.4, 1)", fill: "forwards" }).finished.then(() => {
    dart.remove();
    const mark = el("span", "dart-mark");
    mark.style.left = `${x}px`;
    mark.style.top = `${y}px`;
    fx.appendChild(mark);
    tink(fx, { x, y }, 44);
    const ping = () => {
      tink(fx, { x, y }, 520, 900);
      document.querySelectorAll(".ww-text").forEach((t) => {
        const r = t.getBoundingClientRect();
        const d = Math.hypot(r.left + r.width / 2 + scrollX - x, r.top + r.height / 2 + scrollY - y);
        if (d < 260) revealWord(t, (d / 260) * 450, 600); // 0.6 s a ping (VALORANT wiki)
      });
    };
    setTimeout(ping, 1600);
    setTimeout(ping, 1600 + 600 + 1200);
    setTimeout(() => {
      mark.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: "forwards" }).finished.then(() => mark.remove());
    }, 1600 + 600 + 1200 + 900);
  });
}

function droneHud(block, item) {
  if (hud) return;
  // phones have no cursor: the view opens over the word, and stays a little longer
  if (!canHover && item) {
    const w = item.querySelector(".ww-text").getBoundingClientRect();
    pointer.x = w.left + w.width / 2;
    pointer.y = w.top + w.height / 2;
  }
  const life = canHover ? 2600 : 3600;
  if (!claimAbility(life, block, item)) return;
  earnUlt();
  const node = (hud = el("div", "drone-hud"));
  node.setAttribute("aria-hidden", "true");
  node.innerHTML = DRONE_HUD;
  node.style.translate = `${pointer.x}px ${pointer.y}px`;
  node.style.setProperty("--hud-life", `${life}ms`);
  document.body.appendChild(node);
  document.documentElement.classList.add("drone-view"); // the reticle is the cursor
  requestAnimationFrame(() => requestAnimationFrame(() => node.classList.add("on")));
  scramble(node.querySelector(".hud-label"), "FIRE BOLT", 500, 150);
  setTimeout(() => {
    node.classList.remove("on");
    document.documentElement.classList.remove("drone-view");
    setTimeout(() => {
      node.remove();
      hud = null;
    }, 400);
  }, life);
}

// Shock Bolt: Sova's bow comes up and winds up for 0.4 s (VALORANT wiki),
// the bolt arcs out, banks off the ground twice (its most, like in the
// game), lands under the word and bursts into an electric dome like the
// game's shock dart, while the word jolts and flickers
let shocking = false;
function shockBolt(block, item) {
  if (shocking || !claimAbility(2500, block, item)) return;
  shocking = true;
  earnUlt();
  const box = block.getBoundingClientRect();
  const text = item.querySelector(".ww-text");
  const r = text.getBoundingClientRect();
  const x = r.left + r.width / 2 - box.left;
  const ground = r.bottom - box.top;
  const fx = wallFx(block);
  const grip = bowSpot(block, ground - 50);
  const land = { x, y: ground };
  const along = (f) => ({ x: grip.x + (land.x - grip.x) * f, y: ground });
  const hops = [
    { to: along(0.45), lift: 55, time: 0.42 },
    { to: along(0.78), lift: 30, time: 0.26 },
    { to: land, lift: 16, time: 0.18 }
  ];
  const bow = makeBow(fx, grip, launchAngle(grip, hops[0].to, hops[0].lift, hops[0].time), 56);
  bow.draw(1, 400)
    .then(() => {
      let from = bow.release();
      setTimeout(() => bow.fade(), 450);
      const legs = hops.map((hop) => {
        const leg = { from, ...hop };
        from = hop.to;
        return leg;
      });
      // a small flash where it banks off the ground
      let at = 0;
      legs.slice(0, 2).forEach((leg) => {
        at += leg.time * 1000;
        setTimeout(() => tink(fx, leg.to, 34), at);
      });
      return flyBolt(fx, legs);
    })
    .then(() => {
      setTimeout(() => (shocking = false), 1100);
      shockBurst(fx, text, x, ground, Math.max(r.width * 0.62, r.height * 1.15));
      killFeed(block, "shock", text.textContent);
    });
}

// The shock dart's dome: a half-sphere of lightning on the ground, its arcs
// crawling over it and curling inside, flaring up fast and fading out
function shockBurst(fx, text, x, ground, R) {
  const c = shockColors();
  const lit = { color: c.core, textShadow: sovaBloom(c) };
  const off = { color: getComputedStyle(text).color, textShadow: "none" };
  text.animate([
    { ...lit, offset: 0 }, { ...off, offset: 0.1 }, { ...lit, offset: 0.18 },
    { ...off, offset: 0.3 }, { ...lit, offset: 0.38 }, { ...lit, offset: 0.55 }, { ...off, offset: 1 }
  ], { duration: 900 });
  text.animate([
    { translate: "0 0" }, { translate: "-3px 1px" }, { translate: "3px -1px" },
    { translate: "-2px 0" }, { translate: "2px 1px" }, { translate: "0 0" }
  ], { duration: 360 });
  const dome = el("span", "shock-dome");
  dome.style.left = `${x}px`;
  dome.style.top = `${ground}px`;
  const size = `left:${-R}px;top:${-R}px;width:${2 * R}px;height:${R}px`;
  dome.innerHTML =
    `<span class="dome-glow" style="${size};border-radius:${R}px ${R}px 0 0"></span>` +
    `<svg style="${size}" viewBox="${-R} ${-R} ${2 * R} ${R}"><polyline class="dome-bolt edge"/>` +
    '<polyline class="dome-bolt"/>'.repeat(5) + "</svg>";
  fx.appendChild(dome);
  const bolts = [...dome.querySelectorAll(".dome-bolt")];
  const LIFE = 1050;
  dome.animate([
    { scale: "0.15", opacity: 1 },
    { scale: "1", opacity: 1, offset: 0.16 },
    { scale: "1", opacity: 0.95, offset: 0.62 },
    { scale: "1.06", opacity: 0 }
  ], { duration: LIFE, easing: "ease-out", fill: "forwards" });
  // half-ellipses over the top (a = half-width, h = height)
  const over = (a, h) => (u) => [a * Math.cos(Math.PI * (1 - u)), -h * Math.sin(Math.PI * (1 - u))];
  const start = performance.now();
  const crackle = (now) => {
    const t = now - start;
    const seed = Math.floor(t / 45); // new lightning ~20 times a second
    const band = R * (0.3 + 0.4 * noise(3, seed));
    const bandW = Math.sqrt(R * R - band * band);
    const curl = (k) => {
      const rr = R * (0.16 + 0.12 * noise(k + 6, seed));
      const sx = R * (noise(k, seed) - 0.5) * 0.9;
      const sy = -rr - R * 0.3 * noise(k + 3, seed);
      const a0 = noise(k + 9, seed) * 6.28;
      return (u) => [sx + rr * (1 - 0.6 * u) * Math.cos(a0 + 4 * u), sy + rr * (1 - 0.6 * u) * Math.sin(a0 + 4 * u)];
    };
    const shapes = [
      over(R, R), // the dome's edge
      over(R * (0.25 + 0.6 * noise(1, seed)), R * 0.98),
      over(-R * (0.2 + 0.5 * noise(2, seed)), R * 0.96),
      (u) => [bandW * Math.cos(Math.PI * (1 - u)), -band + 0.18 * bandW * Math.sin(Math.PI * (1 - u))],
      curl(11),
      curl(23)
    ];
    bolts.forEach((bolt, i) => {
      bolt.setAttribute("points", jagged(shapes[i], i ? 14 : 22, i ? 5 : 3.5, seed + i * 11));
      bolt.style.opacity = String(0.7 + 0.3 * noise(i + 20, seed));
    });
    if (t < LIFE) requestAnimationFrame(crackle);
    else dome.remove();
  };
  requestAnimationFrame(crackle);
}

// Clicking "Sova": his energy bow appears beside the name and draws back to
// it, the string crackling with lightning while the arrowhead charges into a
// glowing orb wrapped in sparks; then it lets go, the string twangs and the
// arrow flies off. After the charged shot in Sova's trailer.
let drawingBow = false;
function shootArrow(item) {
  if (drawingBow || reduceMotion) return;
  if (!claimAbility(2900, item.closest(".wordwall"), item)) return;
  drawingBow = true;
  earnUlt();
  const text = item.querySelector(".ww-text");
  const r = text.getBoundingClientRect();
  const H = r.height;
  // held just right of the name, so the string draws back to it
  const grip = { x: r.right + scrollX + 0.55 * H, y: r.top + r.height / 2 + scrollY };
  const fx = pageFx();
  const bow = makeBow(fx, grip, 0, H);
  // the name glows as the charge builds, brightest as the arrow leaves
  text.animate([{ textShadow: "none" }, { textShadow: sovaBloom(sovaColors()), offset: 0.62 }, { textShadow: "none" }], { duration: 2600 });
  setTimeout(() => bow.draw(1, 900), 250);
  setTimeout(() => {
    bow.release(true);
    tink(fx, grip, 100, 420);
  }, 1600);
  setTimeout(() => {
    bow.fade();
    setTimeout(() => (drawingBow = false), 350);
  }, 2500);
}

// Clicking "Sova": the agent select screen from the game comes up under his
// picture, the LOCK IN button over the player's card (his portrait, the role
// badge, the player's name, "Picking...", a voice button). Locking in plays
// his line, runs the lock-in scan again and has him fire his bow. Clicking
// "Sova" again, Escape or 12 s of waiting closes it.
const AGENT_BADGE =
  '<svg viewBox="0 0 64 24"><path class="badge-rim" d="M10 1h44l9 11-9 11H10L1 12z"/>' +
  '<path class="badge-body" d="M12 4h40l7 8-7 8H12l-7-8z"/>' +
  '<path class="badge-icon" d="M26.4 10A6 6 0 0 1 37.2 9M37.6 14A6 6 0 0 1 26.8 15M37.6 6.2 37.2 9l-2.8-.4M26.4 17.8l.4-2.8 2.8.4"/></svg>';
const SPEAKER = '<svg viewBox="0 0 16 16"><path d="M2 6h3l4-3v10L5 10H2z"/></svg>';
// The agent select hangs under Sova's picture. So it never sits on top of
// what follows, the wall makes room for it while it's open: it grows by as
// much as the panel hangs past it (with the wall stacked on a phone, the
// room opens right under the picture), then shrinks back, faster, on close.
// Returns the function that gives the room back.
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const EASE_DRAWER = "cubic-bezier(0.32, 0.72, 0, 1)";
function makeRoom(block, art, panel) {
  const stacked = getComputedStyle(block).gridTemplateColumns.trim().split(/\s+/).length < 2;
  const target = stacked ? art : block;
  const prop = stacked ? "marginBottom" : "paddingBottom";
  const css = stacked ? "margin-bottom" : "padding-bottom";
  const measure = () => {
    if (stacked) return panel.offsetHeight + 8 + 28;
    const panelBottom = art.getBoundingClientRect().bottom + 8 + panel.offsetHeight;
    // the wall's own bottom, without whatever room it has grown so far
    const wallBottom = block.getBoundingClientRect().bottom - parseFloat(getComputedStyle(block).paddingBottom);
    return Math.max(0, panelBottom - wallBottom + 28);
  };
  target.style.transition = css + " 0.45s " + EASE_DRAWER;
  const set = () => (target.style[prop] = measure() + "px");
  set();
  const watch = new ResizeObserver(set); // the panel can grow (an ability's description)
  watch.observe(panel);
  return () => {
    watch.disconnect();
    target.style.transition = css + " 0.3s " + EASE_OUT;
    target.style[prop] = "";
    setTimeout(() => (target.style.transition = ""), 320);
  };
}

// For moving across the page: eases in, eases out
function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Clicking "Sova" brings the whole wall into view with the agent select
// under it, centred, in one smooth move. If it can't all fit (a phone), the
// agent select itself comes into view.
function framePick(block, art, panel) {
  const header = 64;
  const top = block.getBoundingClientRect().top;
  const bottom = art.getBoundingClientRect().bottom + 8 + panel.offsetHeight;
  const room = innerHeight - header;
  const by = bottom - top + 48 <= room
    ? top - header - (room - (bottom - top)) / 2
    : bottom + 24 - innerHeight;
  if (Math.abs(by) < 4) return;
  if (lenis) lenis.scrollTo(scrollY + by, { duration: 1, easing: easeInOut });
  else window.scrollTo({ top: scrollY + by, behavior: reduceMotion ? "auto" : "smooth" });
}

let picking = null;
function agentSelect(block, item) {
  if (reduceMotion) return;
  if (picking) return picking.close();
  const art = block.querySelector(".wordwall-art");
  if (!art) return shootArrow(item);
  const panel = el("div", "agent-select");
  panel.innerHTML =
    '<div class="pick-timer"><span class="pick-time mono"></span><span class="pick-bar"></span></div>' +
    '<div class="agent-title"><span class="agent-role mono"></span><span class="agent-name">Sova</span></div>' +
    '<button class="lock-in-btn" type="button">Lock in</button>' +
    '<div class="agent-card"><span class="agent-portrait"><img alt=""></span>' +
    `<span class="agent-badge" aria-hidden="true">${AGENT_BADGE}</span>` +
    '<span class="agent-ign"></span><span class="agent-status">Picking<span class="dots">...</span></span>' +
    `<button class="agent-voice" type="button" aria-label="Play Sova's voice line">${SPEAKER}</button></div>`;
  panel.querySelector(".agent-portrait img").src = item.querySelector(".ww-face")?.src || "";
  panel.querySelector(".agent-ign").textContent = block.dataset.ign || SITE.firstName;
  art.appendChild(panel);
  art.classList.add("picking");
  panel.querySelector(".agent-role").textContent = block.dataset.role || "";
  uiSound("open");
  primeSound(SOUND_HOVER);
  primeSound(SOUND_LOCK);
  panel.querySelectorAll("button").forEach((button) => {
    onHover(button, () => button.disabled || playSound(SOUND_HOVER, 0.5));
  });
  let giveRoomBack = null;
  requestAnimationFrame(() => requestAnimationFrame(() => {
    panel.classList.add("on");
    giveRoomBack = makeRoom(block, art, panel);
    framePick(block, art, panel);
  }));
  const lockBtn = panel.querySelector(".lock-in-btn");
  const status = panel.querySelector(".agent-status");
  // the pick timer counts down the 12 s, like the agent select's
  const time = panel.querySelector(".pick-time");
  let left = 12;
  rollText(time, `0:${pad2(left)}`);
  const ticking = setInterval(() => {
    left = Math.max(0, left - 1);
    rollText(time, `0:${pad2(left)}`);
  }, 1000);
  lockBtn.focus({ preventScroll: true });
  const onKey = (e) => {
    if (e.key === "Escape") close();
  };
  const close = () => {
    clearTimeout(timer);
    clearInterval(ticking);
    document.removeEventListener("keydown", onKey);
    panel.classList.remove("on");
    art.classList.remove("picking");
    giveRoomBack?.();
    picking = null;
    setTimeout(() => panel.remove(), 450);
  };
  const timer = setTimeout(close, 12000);
  document.addEventListener("keydown", onKey);
  panel.querySelector(".agent-voice").addEventListener("click", () => playSound(SOUND_LOCKED));
  // the abilities, like the agent select's: hover a key to read what it does
  const kit = el("div", "agent-kit");
  const info = el("div", "kit-info");
  info.innerHTML = '<span class="kit-name"></span><span class="kit-text"></span><span class="kit-stat mono"></span>';
  const words = [...block.querySelectorAll(".ww")];
  ["C", "Q", "E", "X"].forEach((slotKey) => {
    const word = words.find((w) => w.dataset.key === slotKey);
    const cap = word && word.querySelector(".ww-key");
    if (!cap || !word.dataset.desc) return;
    // the ability's own icon, with its key under it, like the game's
    const slot = el("button", "kit-slot");
    slot.type = "button";
    const name = word.querySelector(".ww-text").textContent;
    slot.setAttribute("aria-label", `${name} (${cap.textContent})`);
    if (word.dataset.icon) {
      const icon = el("img");
      icon.src = word.dataset.icon;
      icon.alt = "";
      slot.appendChild(icon);
    } else {
      slot.append(el("span", "mono", cap.textContent));
    }
    slot.appendChild(el("span", "kit-key mono", cap.textContent));
    const show = () => {
      info.querySelector(".kit-name").textContent = `${name} · ${cap.textContent}`;
      info.querySelector(".kit-text").textContent = word.dataset.desc;
      info.querySelector(".kit-stat").textContent = word.dataset.stat || "";
      info.classList.add("on");
    };
    onHover(slot, show);
    slot.addEventListener("focus", show);
    slot.addEventListener("click", show);
    slot.addEventListener("mouseleave", () => info.classList.remove("on"));
    kit.appendChild(slot);
  });
  if (kit.children.length) panel.querySelector(".agent-title").after(kit, info);
  lockBtn.addEventListener("click", () => {
    clearTimeout(timer);
    clearInterval(ticking);
    lockBtn.disabled = true;
    panel.classList.add("locked");
    scramble(lockBtn, "Locked in", 400);
    scramble(status, "Sova", 400);
    playSound(SOUND_LOCK); // his line is in this one, so nothing follows it
    // the light sweeping across the card, like the game's when someone locks in
    const sweep = el("span", "lock-sweep");
    panel.appendChild(sweep);
    sweep.animate([{ translate: "-130% 0" }, { translate: "130% 0" }], {
      duration: 850,
      easing: "cubic-bezier(0.35, 0, 0.2, 1)"
    }).finished.then(() => sweep.remove());
    // the lock-in again: the scan, the flash, the glow, "Locked in"
    art.classList.remove("locked");
    void art.offsetWidth;
    art.classList.add("locked");
    shootArrow(item);
    setTimeout(close, 2200);
  });
  picking = { close };
}

// Easter egg: type "sova" anywhere (or tap "Sova" on the agents wall) and
// an Owl Drone flies across the page
const DRONE_SVG =
  '<svg viewBox="0 0 120 80" aria-hidden="true">' +
  '<path class="drone-wing drone-wing-back" d="M56 37 L34 18 L30 22 L42 38 Z"/>' +
  '<path class="drone-wing drone-wing-back" d="M56 43 L34 62 L30 58 L42 42 Z"/>' +
  '<path class="drone-wing" d="M74 37 L44 3 L36 6 L50 38 Z"/>' +
  '<path class="drone-wing" d="M74 43 L44 77 L36 74 L50 42 Z"/>' +
  '<path class="drone-body" d="M106 40 C98 33 84 32 72 34 L40 38 L34 40 L40 42 L72 46 C84 48 98 47 106 40 Z"/>' +
  '<circle class="drone-eye" cx="92" cy="40" r="3.8"/></svg>';
let typed = "";
let droneFlying = false;

document.addEventListener("keydown", (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
  if (e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable]")) return;
  typed = (typed + e.key.toLowerCase()).slice(-4);
  if (typed === "sova") launchDrone();
});

function launchDrone() {
  if (droneFlying) return;
  droneFlying = true;
  const toast = el("div", "drone-toast mono", "Owl Drone deployed");
  toast.setAttribute("role", "status");
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("on"));
  const land = () => {
    toast.classList.remove("on");
    setTimeout(() => {
      toast.remove();
      droneFlying = false;
    }, 500);
  };
  if (reduceMotion) {
    setTimeout(land, 2200);
    return;
  }
  const drone = el("div", "drone");
  drone.innerHTML = DRONE_SVG;
  document.body.appendChild(drone);
  const flight = drone.animate([
    { transform: "translate(-160px, 64vh) rotate(-10deg)" },
    { transform: `translate(${Math.round(innerWidth * 0.48)}px, 32vh) rotate(0deg)`, offset: 0.55 },
    { transform: `translate(${innerWidth + 160}px, 44vh) rotate(8deg)` }
  ], { duration: 3400, easing: "cubic-bezier(0.45, 0, 0.3, 1)" });
  flight.onfinish = () => {
    drone.remove();
    land();
  };
}

// The marquee speeds up while you scroll (up to 3x) and eases back to its
// normal pace once you stop
let marqueeAnim = null;
let marqueeRate = 1;
let marqueeY = scrollY;
function updateMarquee(y) {
  if (reduceMotion) return;
  if (!marqueeAnim) marqueeAnim = track.getAnimations ? track.getAnimations()[0] : null;
  if (!marqueeAnim) return;
  const speed = Math.abs(y - marqueeY);
  marqueeY = y;
  const target = 1 + Math.min(speed * 0.05, 2);
  marqueeRate += (target - marqueeRate) * (target > marqueeRate ? 0.12 : 0.04);
  if (Math.abs(marqueeRate - marqueeAnim.playbackRate) > 0.01) marqueeAnim.playbackRate = marqueeRate;
}

// Gallery photos drift slightly against the scroll inside their frames,
// which gives the grid a little depth
const driftTiles = reduceMotion ? [] : [...document.querySelectorAll("#galleryGrid .shot:not(.contain):not(.shot-more) img")];
function driftGallery() {
  const vh = innerHeight;
  driftTiles.forEach((img) => {
    const r = img.parentElement.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) return;
    const t = Math.max(-1, Math.min(1, (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2)));
    img.style.setProperty("--drift", (-t).toFixed(3));
  });
}

// Runs every frame but only touches the page when something moved.
function frame() {
  const y = scrollY;
  const scrolled = y !== frameY;
  frameY = y;

  updateMarquee(y);
  if (scrolled) driftGallery();

  const dx = mouseX - easeX;
  const dy = mouseY - easeY;
  const drifting = Math.abs(dx) > 0.0005 || Math.abs(dy) > 0.0005;
  if (drifting) {
    easeX += dx * 0.06;
    easeY += dy * 0.06;
  }

  if (scrolled) {
    // Header hides while scrolling down, comes back when scrolling up
    if (Math.abs(y - lastY) > 4) {
      header.classList.toggle("tucked", y > lastY && y > 240);
      lastY = y;
    }
    header.classList.toggle("solid", y > 10);
    hero.style.setProperty("--p", Math.min(1, y / (heroH * 0.75)).toFixed(3));
    updateBeliefs();
    updateMeter(y);
    updateScenes();
    updateNav(y);
    updateLightWalls();
  }

  if ((scrolled || drifting) && y < heroH * 1.2) {
    floaterEls.forEach((f, i) => {
      const d = depths[i % depths.length];
      f.style.transform = `translate3d(${(easeX * d * -46).toFixed(1)}px, ${(easeY * d * -46 - y * d * 0.3).toFixed(1)}px, 0)`;
    });
  }

  const px = pointerX - previewX;
  const py = pointerY - previewY;
  if (Math.abs(px) > 0.3 || Math.abs(py) > 0.3) {
    previewX += px * 0.14;
    previewY += py * 0.14;
    // lean into the direction the cursor is moving, settling when it stops
    const lean = Math.max(-9, Math.min(9, px * 0.06));
    preview.style.transform = `translate3d(${previewX.toFixed(1)}px, ${previewY.toFixed(1)}px, 0) rotate(${lean.toFixed(2)}deg)`;
  }

  requestAnimationFrame(frame);
}

if (reduceMotion) {
  document.querySelectorAll(".fw").forEach((w) => w.classList.add("lit"));
  addEventListener("scroll", () => {
    header.classList.toggle("solid", scrollY > 10);
    updateMeter(scrollY);
  }, { passive: true });
} else {
  requestAnimationFrame(frame);
}

// Pressing should feel like pressing: buttons, pills and tiles dip a little
// while held and come back when let go (Emil Kowalski's press rule: a quick
// ease-out, 0.97 for controls, less for big surfaces)
const PRESSABLE = ".lock-in-btn, .kit-slot, .agent-voice, .lb-btn, .lb-play, .header-link, .channel-visit, " +
  ".sound-switch, .story-photo, button.ww-spec, .theme-toggle, .ult-button, .video-row, .thumb, .shot, .shot-more, " +
  ".peek-more, .peek-less, .peek-card";
if (!reduceMotion) {
  document.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    const node = e.target.closest(PRESSABLE);
    if (!node || node.disabled) return;
    const to = node.matches(".thumb, .shot, .shot-more, .video-row, .peek-card") ? "0.985" : "0.97";
    const press = node.animate([{ scale: "1" }, { scale: to }], { duration: 160, easing: EASE_OUT, fill: "forwards" });
    const release = () => {
      removeEventListener("pointerup", release);
      removeEventListener("pointercancel", release);
      const now = getComputedStyle(node).scale; // wherever the press got to
      press.cancel();
      node.animate([{ scale: now === "none" ? "1" : now }, { scale: "1" }], { duration: 200, easing: EASE_OUT });
    };
    addEventListener("pointerup", release);
    addEventListener("pointercancel", release);
  });
}

setupUltButton();
