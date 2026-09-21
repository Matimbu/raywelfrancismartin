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

// Word walls (nicknames and the like): big words with small notes
(SITE.walls || []).forEach((wall) => {
  if (!wall.words || !wall.words.length) return;
  const block = el("div", "wordwall");
  const head = el("div", "wordwall-head reveal");
  head.append(el("p", "now-label mono", wall.label), el("p", "wordwall-intro", wall.intro || ""));
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
      if (w.face) {
        const face = el("img", "ww-face");
        face.src = w.face;
        face.alt = "";
        face.loading = "lazy";
        note.appendChild(face);
      }
      note.appendChild(document.createTextNode(`${w.note || ""}${w.link ? " ↗" : ""}`));
      // Hunter's Fury: its three charges, lit while the ult is up
      if (w.beam && !reduceMotion) {
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
    // Sova's abilities: `ping` sends a Recon Bolt ping, `shock` sets off a
    // Shock Bolt, `beam` fires Hunter's Fury, `hud` flies the Owl Drone.
    // Hover on computers, tap on phones.
    const ability = reduceMotion ? null
      : w.ping ? reconPing : w.shock ? shockBolt : w.beam ? huntersFury : w.hud ? droneHud : null;
    if (ability) item.addEventListener(canHover ? "mouseenter" : "click", () => ability(block, item));
    // Reuse the crafts preview card: the photo follows the cursor
    if (w.image && canHover && !cards) {
      item.addEventListener("mouseenter", () => showPreview({ image: w.image, emoji: "" }));
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
    if (wall.art.bow) art.dataset.bow = wall.art.bow.join(",");
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
    row.addEventListener("mouseenter", () => showPreview(craft));
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
  // Shorts loop the way they do on YouTube, so the end screen never covers them
  if (v.short) {
    params.set("loop", 1);
    params.set("playlist", v.id);
  }
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
  img.src = `assets/tiktok/${v.id}.jpg`;
  return img;
}

function tiktokFrame(v) {
  const frame = el("iframe");
  const params = new URLSearchParams({ autoplay: 1, loop: 1, rel: 0, description: 0, music_info: 0 });
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

    if (play) {
      const frame = tiktok ? tiktokFrame(v) : youtubeFrame(v);
      swapIn(frame, (reveal) => frame.addEventListener("load", reveal, { once: true }));
      return;
    }
    const btn = el("button", "thumb");
    btn.type = "button";
    btn.setAttribute("aria-label", `Play ${v.title}`);
    const img = tiktok ? tiktokThumb(v) : youtubeThumb(v);
    btn.append(img, el("span", "play", "▶"));
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
      // Once something is playing, picking another video plays it right away
      row.addEventListener("click", () => {
        if (current && current.id === v.id) return;
        unpeek();
        show(v, playing);
      });
      if (canHover) {
        row.addEventListener("mouseenter", () => peek(v));
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

  if (current) {
    show(current, false);
  } else {
    // No video to feature: the stage just links to the channel
    const link = el("a", "thumb");
    linkify(link, ch.url);
    link.appendChild(el("span", "play", "▶"));
    stage.appendChild(link);
    caption.remove();
    fit();
  }
});

addEventListener("resize", () => stageFits.forEach((fit) => fit()));

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
const shotSrc = (p, width) => `assets/gallery/${p.file}-${width}.jpg`;

gallery.forEach((p, i) => {
  const tile = el("button", ["shot", p.wide && "wide", p.fit === "contain" && "contain", "shot-reveal"].filter(Boolean).join(" "));
  tile.type = "button";
  tile.style.setProperty("--d", i % 3);
  tile.setAttribute("aria-label", `View photo: ${p.caption}`);
  const img = el("img");
  img.src = shotSrc(p, 800);
  img.srcset = `${shotSrc(p, 400)} 400w, ${shotSrc(p, 800)} 800w`;
  img.sizes = p.wide ? "(max-width: 760px) 100vw, 800px" : "(max-width: 760px) 50vw, 400px";
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
  // Captions type themselves out: on each hover on computers, and once the
  // tile has finished revealing on phones (where captions always show)
  if (!reduceMotion) {
    if (canHover) {
      tile.addEventListener("mouseenter", () => typeCaption(caption, p.caption));
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
    new Image().src = shotSrc(gallery[(j + gallery.length) % gallery.length], 1600);
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

lightbox.addEventListener("close", () => { if (lenis) lenis.start(); });
$("lbClose").addEventListener("click", () => lightbox.close());
$("lbPrev").addEventListener("click", () => showShot(lbIndex - 1, -1));
$("lbNext").addEventListener("click", () => showShot(lbIndex + 1, 1));
lightbox.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") showShot(lbIndex - 1, -1);
  if (e.key === "ArrowRight") showShot(lbIndex + 1, 1);
});

// Swipe on touch screens; a plain tap on the dark area closes the viewer
let swipeX = null;
let swiped = false;
lightbox.addEventListener("pointerdown", (e) => { swipeX = e.clientX; swiped = false; });
lightbox.addEventListener("pointerup", (e) => {
  if (swipeX === null) return;
  const dx = e.clientX - swipeX;
  swipeX = null;
  if (Math.abs(dx) > 50) {
    swiped = true;
    showShot(lbIndex + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  }
});
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

// A word lights up in Sova's blue with a bloom, like an enemy being revealed
function flashWord(node, delay, rise = 0.15, duration = 1100) {
  const c = sovaColors();
  const lit = { color: c.core, textShadow: sovaBloom(c) };
  node.animate([{ ...lit, offset: rise }, { ...lit, offset: rise + 0.3 }], { duration, delay, easing: "ease-out" });
}

// Where Sova's bow is on the wall: `art.bow` gives it as fractions across and
// down the picture. His abilities charge and fire from there.
function bowPoint(block) {
  const img = block.querySelector(".wordwall-art[data-bow] img");
  if (!img) return null;
  const [bx, by] = img.parentNode.dataset.bow.split(",").map(Number);
  const r = img.getBoundingClientRect();
  const box = block.getBoundingClientRect();
  const ratio = img.naturalWidth / img.naturalHeight || r.width / r.height;
  // the picture is contained in its box, so find where it's actually drawn
  let w = r.width;
  let h = r.height;
  if (w / h > ratio) w = h * ratio;
  else h = w / ratio;
  return { x: r.left + (r.width - w) / 2 + w * bx - box.left, y: r.top + (r.height - h) / 2 + h * by - box.top };
}

// The bow glows as it charges for `ms`, then flashes as it fires
function chargeBow(fx, at, ms) {
  const orb = el("span", "fury-charge");
  orb.style.left = `${at.x}px`;
  orb.style.top = `${at.y}px`;
  fx.appendChild(orb);
  orb.animate([{ opacity: 0, scale: "0.1" }, { opacity: 0.9, scale: "0.55" }], { duration: ms, easing: "ease-in", fill: "forwards" });
  return new Promise((fire) => setTimeout(() => {
    orb.animate([{ opacity: 0.9, scale: "0.55" }, { opacity: 0, scale: "0.9" }], { duration: 300, easing: "ease-out", fill: "forwards" })
      .finished.then(() => orb.remove());
    fire();
  }, ms));
}

// A bolt flies like an arrow: each leg is an arc from one point to the next,
// its top `lift` px above the higher end, and the bolt points along its path
function flyBolt(fx, legs) {
  const total = legs.reduce((sum, leg) => sum + leg.time, 0);
  const frames = [];
  let elapsed = 0;
  let last = null;
  legs.forEach(({ from, to, lift, time }) => {
    const top = Math.min(from.y, to.y) - lift;
    const g = (2 * (Math.sqrt(from.y - top) + Math.sqrt(to.y - top)) ** 2) / (time * time);
    const vy = -Math.sqrt(2 * g * (from.y - top));
    const vx = (to.x - from.x) / time;
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

// A ring of blue where a bolt lands, bounces or pings
function tink(fx, at, size = 60, duration = 380) {
  const ring = el("span", "sova-ring");
  ring.style.left = `${at.x}px`;
  ring.style.top = `${at.y}px`;
  fx.appendChild(ring);
  ring.animate([{ width: "0px", height: "0px", opacity: 1 }, { width: `${size}px`, height: `${size}px`, opacity: 0 }],
    { duration, easing: "ease-out", fill: "forwards" }).finished.then(() => ring.remove());
}

// Recon Bolt on the real ability's timing (VALORANT wiki): the bolt flies
// from the bow and sticks in the word, winds up for 0.667 s, then pulses
// twice, 1.6 s apart. Each ring lights up the other words as it reaches them.
let pinging = false;
function reconPing(block, item) {
  if (pinging) return;
  pinging = true;
  const box = block.getBoundingClientRect();
  const src = item.querySelector(".ww-text").getBoundingClientRect();
  const x = src.left + src.width / 2 - box.left;
  const y = src.top + src.height / 2 - box.top;
  const reach = Math.hypot(Math.max(x, box.width - x), Math.max(y, box.height - y));
  const fx = wallFx(block);
  const bow = bowPoint(block) || { x: box.width - 30, y: 40 };
  const pulse = () => {
    tink(fx, { x, y }, reach * 2, 1800);
    block.querySelectorAll(".ww-text").forEach((t) => {
      if (item.contains(t)) return;
      const r = t.getBoundingClientRect();
      const d = Math.hypot(r.left + r.width / 2 - box.left - x, r.top + r.height / 2 - box.top - y);
      flashWord(t, (d / reach) * 1800, 0.1, 900);
    });
  };
  chargeBow(fx, bow, 400)
    .then(() => flyBolt(fx, [{ from: bow, to: { x, y }, lift: 60, time: 0.5 }]))
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
// one every 2.125 s. The bow charges, and each blast is a beam that leaves
// the bow and goes straight through the word, on across the wall, pulsing and
// fading and lighting the word up for a second. Its three charge pips light
// up with the ult and go out one blast at a time.
let firing = false;
function huntersFury(block, item) {
  if (firing) return;
  firing = true;
  const EQUIP = 800;
  const WINDUP = 1000;
  const EVERY = 2125;
  const box = block.getBoundingClientRect();
  const text = item.querySelector(".ww-text");
  const r = text.getBoundingClientRect();
  const hit = { x: r.left + r.width / 2 - box.left, y: r.top + r.height * 0.55 - box.top };
  const bow = bowPoint(block) || { x: box.width - 28, y: hit.y };
  const angle = (Math.atan2(hit.y - bow.y, hit.x - bow.x) * 180) / Math.PI - 180;
  const reach = Math.hypot(box.width, box.height);
  const fx = wallFx(block);
  const pipBox = item.querySelector(".ult-pips");
  const pips = pipBox ? [...pipBox.children] : [];
  pips.forEach((p) => p.classList.remove("used"));
  pipBox?.classList.add("armed");
  const orb = el("span", "fury-charge");
  orb.style.left = `${bow.x}px`;
  orb.style.top = `${bow.y}px`;
  fx.appendChild(orb);
  const orbTo = (from, to, duration, easing) => orb.animate([from, to], { duration, easing, fill: "forwards" });
  const idle = { opacity: 0.45, scale: "0.4" };
  const full = { opacity: 1, scale: "1" };
  orbTo({ opacity: 0, scale: "0.2" }, idle, EQUIP, "ease-out");
  const blast = (n) => {
    const beam = el("span", "fury-beam");
    beam.style.left = `${bow.x - reach}px`;
    beam.style.top = `${bow.y}px`;
    beam.style.width = `${reach}px`;
    beam.style.rotate = `${angle}deg`;
    fx.appendChild(beam);
    pips[n]?.classList.add("used");
    beam.animate([
      { clipPath: "inset(0 0 0 100%)", opacity: 1, scale: "1 0.4" },
      { clipPath: "inset(0 0 0 0)", opacity: 1, scale: "1 1.35", offset: 0.12 },
      { clipPath: "inset(0 0 0 0)", opacity: 0.85, scale: "1 1", offset: 0.4 },
      { clipPath: "inset(0 0 0 0)", opacity: 0, scale: "1 0.25" }
    ], { duration: 950, easing: "ease-out" }).finished.then(() => beam.remove());
    flashWord(text, 60, 0.05);
  };
  for (let n = 0; n < 3; n++) {
    const fireAt = EQUIP + WINDUP + n * EVERY;
    setTimeout(() => orbTo(idle, full, WINDUP, "ease-in"), fireAt - WINDUP);
    setTimeout(() => {
      blast(n);
      orbTo({ opacity: 1, scale: "1.35" }, idle, 500, "ease-out");
    }, fireAt);
  }
  setTimeout(() => {
    orbTo(idle, { opacity: 0, scale: "0.2" }, 400, "ease-in").finished.then(() => orb.remove());
    pipBox?.classList.remove("armed");
    firing = false;
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
  if (hud) hud.style.translate = `${pointer.x}px ${pointer.y}px`;
}, { passive: true });

// While the drone's HUD is up, clicking empty space fires its marking dart
// there, once per flight. The dart sticks and pings twice, like the game's:
// 1.6 s after it lands, then 1.2 s after that 0.6 s ping ends (VALORANT
// wiki), lighting up the words near it.
document.addEventListener("click", (e) => {
  if (!hud || hud.dataset.fired || e.button !== 0) return;
  if (e.target.closest("a, button, input, textarea, select, label, iframe, summary, dialog")) return;
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
        if (d < 260) flashWord(t, (d / 260) * 450, 0.1, 800);
      });
    };
    setTimeout(ping, 1600);
    setTimeout(ping, 1600 + 600 + 1200);
    setTimeout(() => {
      mark.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: "forwards" }).finished.then(() => mark.remove());
    }, 1600 + 600 + 1200 + 900);
  });
}

function droneHud() {
  if (hud || !canHover) return;
  const node = (hud = el("div", "drone-hud"));
  node.setAttribute("aria-hidden", "true");
  node.innerHTML = DRONE_HUD;
  node.style.translate = `${pointer.x}px ${pointer.y}px`;
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
  }, 2600);
}

// Shock Bolt: the bolt charges on the bow (0.4 s windup, VALORANT wiki),
// flies in an arc, bounces once off the bottom of the word like a bank shot
// and bursts: the word jolts and flickers blue, with a flash, a quick shock
// ring and a spray of electric sparks
let shocking = false;
function shockBolt(block, item) {
  if (shocking) return;
  shocking = true;
  const box = block.getBoundingClientRect();
  const text = item.querySelector(".ww-text");
  const r = text.getBoundingClientRect();
  const x = r.left + r.width / 2 - box.left;
  const y = r.top + r.height / 2 - box.top;
  const floor = { x: r.left + r.width * 0.8 - box.left, y: r.bottom - box.top };
  const fx = wallFx(block);
  const bow = bowPoint(block) || { x: box.width - 30, y: 40 };
  chargeBow(fx, bow, 400)
    .then(() => {
      setTimeout(() => tink(fx, floor, 36), 520);
      return flyBolt(fx, [
        { from: bow, to: floor, lift: 70, time: 0.52 },
        { from: floor, to: { x, y }, lift: 24, time: 0.26 }
      ]);
    })
    .then(() => {
      setTimeout(() => (shocking = false), 900);
      shockBurst(fx, text, x, y);
    });
}

function shockBurst(fx, text, x, y) {
  const c = sovaColors();
  const lit = { color: c.core, textShadow: sovaBloom(c) };
  const off = { color: getComputedStyle(text).color, textShadow: "none" };
  text.animate([
    { ...lit, offset: 0 }, { ...off, offset: 0.1 }, { ...lit, offset: 0.18 },
    { ...off, offset: 0.3 }, { ...lit, offset: 0.38 }, { ...lit, offset: 0.55 }, { ...off, offset: 1 }
  ], { duration: 800 });
  text.animate([
    { translate: "0 0" }, { translate: "-3px 1px" }, { translate: "3px -1px" },
    { translate: "-2px 0" }, { translate: "2px 1px" }, { translate: "0 0" }
  ], { duration: 360 });
  const burst = (cls, keyframes, duration) => {
    const node = el("span", cls);
    node.style.left = `${x}px`;
    node.style.top = `${y}px`;
    fx.appendChild(node);
    node.animate(keyframes, { duration, easing: "cubic-bezier(0.2, 0.7, 0.3, 1)", fill: "forwards" })
      .finished.then(() => node.remove());
    return node;
  };
  burst("shock-flash", [{ opacity: 1, scale: "0.2" }, { opacity: 0, scale: "1.3" }], 420);
  burst("sova-ring", [
    { width: "0px", height: "0px", opacity: 1 },
    { width: "200px", height: "200px", opacity: 0 }
  ], 520);
  // electric sparks: little zigzags flying out in every direction
  for (let k = 0; k < 12; k++) {
    const deg = (k / 12) * 360 + Math.random() * 24;
    const dist = 50 + Math.random() * 55;
    const zig = [0, 1, 2, 3, 4].map((i) => `${i * 8},${i % 2 ? 1 + Math.random() * 4 : 7 + Math.random() * 4}`).join(" ");
    const spark = burst("shock-spark", [
      { transform: `rotate(${deg}deg) translateX(8px) scaleX(0.3)`, opacity: 1 },
      { transform: `rotate(${deg}deg) translateX(${dist}px) scaleX(1)`, opacity: 0 }
    ], 500 + Math.random() * 300);
    spark.innerHTML = `<svg viewBox="0 0 32 12"><polyline points="${zig}"/></svg>`;
  }
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
