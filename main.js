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

// The motion curves, the same as the CSS tokens (--ease-out, --ease-in-out,
// --ease-drawer): coming and going, moving across the screen, panels
const EASE_OUT = "cubic-bezier(0.23, 1, 0.32, 1)";
const EASE_IN_OUT = "cubic-bezier(0.77, 0, 0.175, 1)";
const EASE_DRAWER = "cubic-bezier(0.32, 0.72, 0, 1)";

// A hover has to be one the visitor actually made. "mouseenter" alone isn't
// that: closing a panel or the photo viewer over something, or the page
// shifting under a still cursor, hands it a hover nobody asked for. A real
// hover always carries a mousemove inside in the same breath, so wait for it.
function onHover(node, run) {
  let entered = false;
  node.addEventListener("mouseenter", () => (entered = true));
  node.addEventListener("mouseleave", () => (entered = false));
  node.addEventListener("mousemove", (e) => {
    if (!entered) return;
    entered = false; // once per visit, like mouseenter
    run(e);
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
//  Smooth scrolling (Lenis). Falls back to normal scrolling. Not on touch
//  screens: a finger scrolls natively there anyway, and Lenis checking the
//  scroll every frame only slowed old phones down.
// ============================================================
let lenis = null;
if (window.Lenis && !reduceMotion && !matchMedia("(pointer: coarse)").matches) {
  lenis = new Lenis({ lerp: 0.09 });
  const raf = (time) => {
    lenis.raf(time);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
}

// Hold the page still (under the opening curtain, behind the photo viewer and
// the game) and let it go again: Lenis does it where it runs, the page's own
// scrolling stops elsewhere
function holdPage(on) {
  if (lenis) return on ? lenis.stop() : lenis.start();
  document.documentElement.classList.toggle("held", on);
}

document.addEventListener("click", (e) => {
  // (a handler that already took the click wins, like a card turning over
  // on its first tap)
  if (e.defaultPrevented) return;
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;
  const hash = link.getAttribute("href");
  const target = hash === "#top" ? 0 : document.querySelector(hash);
  if (target === null) return;
  e.preventDefault();
  if (lenis) {
    // Lenis already keeps the header's 60 px clear (it reads the page's
    // scroll-padding-top, like the browser does), so no extra offset here
    lenis.scrollTo(target, { duration: 1.6 });
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

// Measure first, change after: inside the per-frame loop (see frame()), the
// changes wait until everything has been measured, so the page is laid out
// once a frame instead of once per measurement (which old phones felt).
// Outside the loop a change happens right away.
const pageWrites = [];
let batching = false;
const later = (fn) => (batching ? pageWrites.push(fn) : fn());

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
    if (!onScreen) later(() => n.classList.toggle("landed", false));
    if (r.bottom < -vh * 0.25 || r.top > vh * 1.25) return;
    const edge = vh * n.dataset.leave;
    const enter = smooth(clamp01((vh - r.top) / (vh * 0.4)));
    const leave = smooth(clamp01((edge - r.bottom) / (edge + r.height * 0.6)));
    const fill = smooth(clamp01((vh * 0.72 - r.top) / (vh * 0.3)));
    later(() => {
      n.style.setProperty("--in", enter.toFixed(3));
      n.style.setProperty("--out", leave.toFixed(3));
      n.style.setProperty("--fill", fill.toFixed(3));
      if (onScreen && enter >= 1) n.classList.toggle("landed", true);
    });
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
// moves through the middle of the screen, and a wall's play board (see
// playBoard) draws one step of the play for each word that's lit
const lightWalls = [];
function updateLightWalls() {
  const vh = innerHeight;
  lightWalls.forEach((words) => {
    const r = words.getBoundingClientRect();
    if (r.bottom < 0 || r.top > vh) return;
    const items = words.children;
    const lit = Math.round(clamp01((vh * 0.85 - r.top) / (vh * 0.45)) * items.length);
    later(() => {
      [...items].forEach((item, i) => item.classList.toggle("lit", i < lit));
      if (words.board && !words.board.dataset.replaying) {
        words.board.querySelectorAll(".play-set.active .play-step").forEach((step, i) => step.classList.toggle("on", i < lit));
        if (words.board.narrate) words.board.narrate(lit - 1);
      }
    });
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
  // The word keeps its exact size while it shuffles: a wider stand-in letter
  // spills over for a moment instead of pushing a word onto a new row, which
  // made the wall (and the whole page under it) jump up and down
  node.style.display = "inline-block";
  node.style.width = `${node.offsetWidth}px`;
  node.style.whiteSpace = "nowrap";
  setTimeout(() => {
    const start = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - start) / duration);
      node.textContent = chars.map((c, i) => (!/[a-z]/i.test(c) || p >= settleAt[i] ? c : any(c))).join("");
      if (p < 1) requestAnimationFrame(step);
      else node.style.width = node.style.whiteSpace = "";
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
      { duration: 750, easing: EASE_OUT, pseudoElement: "::view-transition-new(root)" }
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

// Recently added: what's new on the site, in a small pill over the name that
// rolls through the items and takes you to the one showing. Someone who's
// been here before sees only what's new since their last visit (their last
// browser session); anything older than 30 days never shows.
(function recentPill() {
  const items = SITE.recent || [];
  if (!items.length) return;
  const day = (d) => new Date(`${d}T00:00:00`).getTime();
  let last = 0;
  try {
    const kept = sessionStorage.getItem("lastVisit");
    last = Number(kept ?? localStorage.getItem("lastVisit") ?? 0);
    if (kept === null) sessionStorage.setItem("lastVisit", String(last));
    localStorage.setItem("lastVisit", String(Date.now()));
  } catch (e) {}
  const lastDay = last ? new Date(last).setHours(0, 0, 0, 0) : 0;
  const since = Math.max(Date.now() - 30 * 864e5, lastDay);
  const fresh = items.filter((r) => day(r.date) >= since);
  if (!fresh.length) return;
  const pill = el("a", "recent mono");
  const roll = el("span", "recent-roll");
  const rows = fresh.map((r) => roll.appendChild(el("span", "", r.text)));
  pill.append(el("span", "recent-tag", "New"), roll, el("span", "recent-arrow", "→"));
  let at = 0;
  const show = (k) => {
    // the one leaving slides up and out, then drops back below, out of sight
    const prev = rows[at];
    if (k !== at) {
      prev.classList.replace("on", "off");
      setTimeout(() => prev.classList.remove("off"), 700);
    }
    at = k;
    rows[at].classList.add("on");
    pill.href = fresh[at].href; // same site, same tab (a spot on the page or Airball)
    pill.setAttribute("aria-label", `New on the site: ${fresh[at].text}`);
  };
  show(0);
  if (fresh.length > 1 && !reduceMotion) {
    // (holds still while the pointer is on it, and once the hero is scrolled away)
    setInterval(() => {
      if (pill.matches(":hover") || scrollY > innerHeight) return;
      show((at + 1) % fresh.length);
    }, 4200);
  }
  $("heroName").before(pill);
})();

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
  holdPage(true); // no scrolling under the curtain
  fontsReady.then(() => {
    root.classList.add("intro-show");
    setTimeout(() => {
      root.classList.add("intro-open");
      holdPage(false);
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

// The 2K cards on the back of the starting five, in the style of 2K26's
// G.O.A.T. card: "Dark Matter" -> "dark-matter", "G.O.A.T." -> "goat"
const tierKey = (tier) => String(tier).toLowerCase().replace(/\./g, "").trim().replace(/\s+/g, "-");

// Random numbers from a seed, so each card's glitter and lightning are its
// own and come out the same on every visit
function seeded(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return () => {
    h = (h + 0x6d2b79f5) | 0;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Glitter and lightning over a card's photo, like the G.O.A.T. card's, kept
// mostly to the edges, off the player. Each bolt is drawn twice: a wide soft
// stroke in the tier's colour for the glow and a thin white core.
function cardSparks(seed) {
  const rnd = seeded(seed);
  let dots = "";
  for (let k = 0; k < 40; k++) {
    const edge = rnd() < 0.72;
    const x = edge ? (rnd() < 0.5 ? rnd() * 24 : 76 + rnd() * 24) : rnd() * 100;
    const y = rnd() * 133;
    dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(0.25 + rnd() * 1.1).toFixed(2)}" style="--i:${k};--o:${(0.35 + rnd() * 0.65).toFixed(2)}"/>`;
  }
  // a jagged bolt with a fork or two off it
  const bolt = (x, y, dir, steps) => {
    let d = `M${x.toFixed(1)} ${y.toFixed(1)}`;
    let forks = "";
    for (let k = 0; k < steps; k++) {
      x += dir * (0.5 + rnd() * 2.5) + (rnd() - 0.5) * 6;
      y += 4 + rnd() * 7;
      d += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
      if (k > 0 && k < steps - 1 && rnd() < 0.35) {
        let fx = x;
        let fy = y;
        let fork = `M${fx.toFixed(1)} ${fy.toFixed(1)}`;
        for (let j = 0; j < 3; j++) {
          fx += dir * (1 + rnd() * 3) + (rnd() - 0.5) * 4;
          fy += 2 + rnd() * 5;
          fork += ` L${fx.toFixed(1)} ${fy.toFixed(1)}`;
        }
        forks += `<path d="${fork}" class="fork"/>`;
      }
    }
    return `<path d="${d}"/>${forks}`;
  };
  const bolts = bolt(3 + rnd() * 8, 16 + rnd() * 20, 1, 8) + bolt(89 + rnd() * 8, 24 + rnd() * 24, -1, 8) +
    bolt(8 + rnd() * 18, 70 + rnd() * 10, 1, 5) + bolt(74 + rnd() * 18, 62 + rnd() * 12, -1, 5);
  return `<svg class="tk-sparks" viewBox="0 0 100 133" preserveAspectRatio="none" aria-hidden="true">` +
    `<g class="tk-glitter">${dots}</g><g class="tk-bolt-glow">${bolts}</g><g class="tk-bolt">${bolts}</g></svg>`;
}

// The groups on 2K26's attribute upgrades screen, in its order and colours;
// a card's `build` lists its 21 ratings in this order (or one number for all)
const BUILD_GROUPS = [
  ["Fin", "#3b8cff", ["Close Shot", "Driving Layup", "Driving Dunk", "Standing Dunk", "Post Control"]],
  ["Sht", "#35c46f", ["Mid-Range Shot", "Three-Point Shot", "Free Throw"]],
  ["Ply", "#ff8a2c", ["Pass Accuracy", "Ball Handle", "Speed with Ball"]],
  ["Def", "#ff3d52", ["Interior Defense", "Perimeter Defense", "Steal", "Block"]],
  ["Reb", "#8a63ff", ["Offensive Rebound", "Defensive Rebound"]],
  ["Phy", "#e2aa84", ["Speed", "Agility", "Strength", "Vertical"]]
];

// One card: a glowing frame (notched at the top right) with glitter and
// lightning, the player cut out of his photo and standing in front of it,
// breaking over its top, the overall in a big hexagon breaking out of the top
// left, the tier painted top right, badges (or on the second layer,
// attributes) on slanted tags, and a black banner across the bottom that runs
// past the frame: the jersey number, the last name big in metal with the
// first name sitting on top of the banner, and the position.
const POSITIONS = { PG: "Point Guard", SG: "Shooting Guard", SF: "Small Forward", PF: "Power Forward", C: "Center" };

// My own icons for the badge groups (drawn here, not 2K's art), set in the
// level's shield: a ball over the rim, a target, a dribble, a shield, a
// ball going up for the board, a star
const BADGE_ICONS = {
  Finishing: '<circle cx="12" cy="7.5" r="4"/><path d="M4 14h16M7 14l2 6M17 14l-2 6M12 14v6"/>',
  Shooting: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.6"/><path d="M12 12h.01"/>',
  Playmaking: '<path d="M3 18l4.5-9 4.5 9 4.5-9"/><path d="M14.5 6H19v4.5"/>',
  Defense: '<path d="M12 3l7 3v5c0 4.6-3 8-7 10-4-2-7-5.4-7-10V6z"/>',
  Rebounding: '<circle cx="12" cy="15.5" r="5"/><path d="M12 10.5V3M8.5 6.5 12 3l3.5 3.5"/>',
  Personality: '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4l-5.3 3 1.2-6-4.5-4.1 6-.7z"/>'
};
const badgeIcon = (group) => (BADGE_ICONS[group] ? `<svg viewBox="0 0 24 24" aria-hidden="true">${BADGE_ICONS[group]}</svg>` : "");

// badges on slanted tags (three at most); with `groups` (a badge's name to
// its group), each gets its group's icon
function cardBadges(c, groups = {}) {
  const badges = el("span", "tk-badges");
  (c.badges || []).slice(0, 3).forEach(([name, level], i) => {
    const badge = el("span", "tk-badge");
    badge.dataset.level = String(level).toLowerCase();
    badge.style.setProperty("--b", i); // (Legend badges shine one after another)
    const label = el("span", "tk-badge-label");
    const icon = el("i");
    icon.innerHTML = badgeIcon(groups[name]);
    label.append(icon, el("span", "tk-badge-name", name), el("span", "tk-level", level));
    badge.appendChild(label);
    badges.appendChild(badge);
  });
  return badges;
}

// `build`: the whole build, a bar for every rating in the groups and colours
// of 2K26's attribute upgrades screen (rising as the tab turns to Attributes)
function buildChart(c) {
  const chart = el("span", "tk-build");
  let k = 0;
  BUILD_GROUPS.forEach(([group, color, names]) => {
    const column = el("span", "tk-build-group");
    column.style.setProperty("--c", color);
    column.style.setProperty("--n", names.length);
    const bars = el("span", "tk-build-bars");
    names.forEach((name) => {
      const value = Array.isArray(c.build) ? c.build[k] : c.build;
      const bar = el("i");
      bar.style.setProperty("--v", (Math.max(0, Math.min(99, value)) / 99).toFixed(3));
      bar.style.setProperty("--k", k++);
      bar.title = `${name} ${value}`;
      bars.appendChild(bar);
    });
    column.append(bars, el("b", "", group));
    chart.appendChild(column);
  });
  return chart;
}

// A MyCAREER build (`style: "career"`, my own card) on a card like the game's
// builds screen instead of a MyTEAM card: the player's face in a ring, the
// overall, the build's name, size and position, the badges under it; the
// Attributes tab has the whole build and the jumper. In the tier's metal and
// glitter (G.O.A.T. gold).
function careerCard(c, w, extra) {
  const card = el("span", `tk tk-career${extra ? ` ${extra}` : ""}`);
  card.dataset.tier = tierKey(c.tier);
  const glow = el("span", "tk-glow");
  const frame = el("span", "tk-frame");
  const body = el("span", "tk-body");
  body.insertAdjacentHTML("beforeend", cardSparks(c.name || w.text));
  body.append(el("span", "tk-shine"), el("span", "tk-holo"));
  frame.appendChild(body);
  glow.appendChild(frame);
  card.appendChild(glow);
  const top = el("span", "tk-career-top");
  top.append(el("b", "tk-mc", "MC"), el("span", "tk-career-label", c.label || c.tier));
  const ovr = el("span", "tk-career-ovr");
  ovr.append(el("small", "", "OVR"), el("b", "", String(c.ovr)));
  const face = el("span", "tk-career-face");
  const img = el("img");
  img.src = c.face;
  img.alt = "";
  img.loading = "lazy";
  img.decoding = "async";
  face.appendChild(img);
  const pos = c.pos || w.pos || "";
  const stats = el("span", "tk-stats");
  if (c.build != null) stats.appendChild(buildChart(c));
  // the jump shot: its name, what it's made of, and its grades
  if (c.jumper) {
    const shot = typeof c.jumper === "string" ? { line: c.jumper } : c.jumper;
    const jumper = el("span", "tk-career-jumper");
    jumper.append(el("b", "", shot.name ? `Jumper · ${shot.name}` : "Jumper"), el("span", "", shot.line || ""));
    if (shot.grades) {
      const grades = el("span", "tk-career-grades");
      shot.grades.forEach(([name, grade]) => {
        const row = el("span");
        row.append(el("span", "", name), el("b", "", grade));
        grades.appendChild(row);
      });
      jumper.appendChild(grades);
    }
    stats.appendChild(jumper);
  }
  // the third layer: every badge, by group, each in its level's colour, and
  // how many of each level up top
  // (tap one, or point at it, and what it does shows at the bottom)
  const all = el("span", "tk-allbadges");
  if (c.allBadges) {
    const LEVELS = ["Legend", "HOF", "Gold", "Silver", "Bronze"];
    const count = {};
    c.allBadges.forEach(([, list]) => list.forEach(([, level]) => (count[level] = (count[level] || 0) + 1)));
    const total = LEVELS.reduce((sum, level) => sum + (count[level] || 0), 0);
    const tiers = el("span", "tk-allbadges-tiers");
    tiers.appendChild(el("b", "", `${total} badges`));
    LEVELS.forEach((level) => {
      if (!count[level]) return;
      const chip = el("span", "tk-chip");
      chip.dataset.level = level.toLowerCase();
      chip.append(el("i"), document.createTextNode(`${count[level]} ${level}`));
      tiers.appendChild(chip);
    });
    // the top: the count by level and a hint, until a badge is picked; then
    // that badge and what it does
    const info = el("span", "tk-badge-info");
    info.append(tiers, el("span", "tk-badge-info-hint", canHover ? "Point at a badge for what it does" : "Tap a badge for what it does"));
    all.appendChild(info);
    const show = (chip, name, level, what, group) => {
      all.querySelectorAll(".tk-chip.picked").forEach((c) => c.classList.remove("picked"));
      chip.classList.add("picked");
      info.textContent = "";
      info.classList.add("on");
      const emblem = el("span", "tk-badge-emblem");
      emblem.innerHTML = badgeIcon(group);
      const title = el("b", "", name);
      title.appendChild(el("span", "", level));
      info.dataset.level = level.toLowerCase();
      info.append(emblem, title, el("span", "", what || ""));
    };
    c.allBadges.forEach(([group, list]) => {
      const row = el("span", "tk-allbadges-group");
      const chips = el("span", "tk-allbadges-list");
      list.forEach(([name, level, what]) => {
        const chip = el("span", "tk-chip");
        chip.dataset.level = level.toLowerCase();
        chip.append(el("i"), document.createTextNode(name));
        if (what) {
          chip.classList.add("has-info");
          if (canHover) onHover(chip, () => show(chip, name, level, what, group));
          chip.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            show(chip, name, level, what, group);
          });
        }
        chips.appendChild(chip);
      });
      row.append(el("b", "", group), chips);
      all.appendChild(row);
    });
  }
  // the fourth: my moves, the animations picked in MyCAREER, by group
  const moves = el("span", "tk-moves");
  (c.moves || []).forEach(([group, list]) => {
    const block = el("span", "tk-moves-group");
    const grid = el("span", "tk-moves-list");
    list.forEach(([what, who]) => {
      const move = el("span", "tk-move");
      move.append(el("span", "", what), el("b", "", who));
      grid.appendChild(move);
    });
    block.append(el("b", "", group), grid);
    moves.appendChild(block);
  });
  // (each of the three badges up front gets its group's icon)
  const groups = {};
  (c.allBadges || []).forEach(([group, list]) => list.forEach(([name]) => (groups[name] = group)));
  const ui = el("span", "tk-ui");
  ui.append(top, ovr, face, el("span", "tk-career-name", c.player || ""), el("span", "tk-career-arch", c.archetype || ""), el("span", "tk-career-size", c.size || ""),
    el("span", "tk-career-pos", POSITIONS[pos] || pos), cardBadges(c, groups), stats);
  if (c.allBadges) ui.appendChild(all);
  if (c.moves) ui.appendChild(moves);
  card.appendChild(ui);
  return card;
}

function twoKCard(c, w, extra = "") {
  if (c.style === "career") return careerCard(c, w, extra);
  const card = el("span", extra ? `tk ${extra}` : "tk");
  card.dataset.tier = tierKey(c.tier);
  const glow = el("span", "tk-glow");
  const frame = el("span", "tk-frame");
  const body = el("span", "tk-body");
  // the cutout (--cutout masks the shine and the holo to his shape), or
  // without one, the photo inside the frame
  let player = null;
  const img = el("img", c.cut ? "" : "tk-photo");
  img.src = c.cut || c.image || w.image;
  img.alt = "";
  img.loading = "lazy";
  img.decoding = "async";
  if (c.cut) {
    card.classList.add("has-cut");
    player = el("span", "tk-cut");
    player.style.setProperty("--cutout", `url("${c.cut}")`);
    player.appendChild(img);
  } else {
    body.appendChild(img);
  }
  body.insertAdjacentHTML("beforeend", cardSparks(c.name || w.text));
  const badges = cardBadges(c);
  const stats = el("span", "tk-stats");
  // (the whole build over the key numbers)
  if (c.build != null) stats.appendChild(buildChart(c));
  (c.stats || []).slice(0, 4).forEach(([name, value]) => {
    const row = el("span", "tk-stat");
    row.style.setProperty("--v", (value / 100).toFixed(2));
    row.append(el("span", "tk-stat-name", name), el("b", "tk-stat-value", String(value)), el("i", "tk-stat-bar"));
    stats.appendChild(row);
  });
  body.append(el("span", "tk-shine"), el("span", "tk-holo"));
  frame.appendChild(body);
  glow.appendChild(frame);
  card.appendChild(glow);
  if (player) card.appendChild(player);
  const emblem = el("span", "tk-emblem");
  emblem.append(el("i", "tk-hex"), el("b", "", String(c.ovr)));
  if (String(c.ovr).length > 2) emblem.classList.add("wide"); // a 100 needs a smaller number
  const full = (c.name || w.text).trim();
  const cut = full.lastIndexOf(" ");
  const last = cut > 0 ? full.slice(cut + 1) : full;
  const lastName = el("span", "tk-last", last);
  if (last.length > 6) lastName.classList.add("long");
  const banner = el("span", "tk-banner");
  banner.append(el("span", "tk-medal", c.num != null ? String(c.num) : ""), lastName, el("span", "tk-pos", c.pos || w.pos || ""));
  // the lettering and tags, one layer over the player (the 3D pop lifts it)
  const ui = el("span", "tk-ui");
  ui.append(badges, stats, emblem, el("span", "tk-label", c.label || c.tier), el("span", "tk-first", cut > 0 ? full.slice(0, cut) : ""), banner);
  card.appendChild(ui);
  return card;
}

// The face-down side before the pack is opened: the MT card, and the
// walkout's clues that come up on it before it turns (the position, a badge,
// then the best attribute in a ring, like 2K26's walkout)
function packFace(w, c) {
  const pack = el("span", "tk-pack");
  const clues = el("span", "tk-clues");
  const pos = c.pos || w.pos || "";
  clues.append(el("span", "tk-clue", POSITIONS[pos.split("/")[0]] || pos));
  if (c.badges && c.badges[0]) clues.append(el("span", "tk-clue", c.badges[0][0]));
  pack.append(el("span", "tk-mt", "MT"), clues);
  const best = (c.stats || []).reduce((top, s) => (!top || s[1] > top[1] ? s : top), null);
  if (best) {
    const ring = el("span", "tk-ring");
    ring.append(el("b", "", String(best[1])), el("span", "", best[0]));
    pack.appendChild(ring);
  }
  // and last, the name slams in, like the walkout's reveal
  const full = (c.name || w.text).trim();
  const cut = full.lastIndexOf(" ");
  const callout = el("span", "tk-callout");
  callout.append(el("span", "tk-callout-first", cut > 0 ? full.slice(0, cut) : ""), el("span", "tk-callout-last", cut > 0 ? full.slice(cut + 1) : full));
  pack.appendChild(callout);
  return pack;
}

// A card's sides, one after another on its tab: the card, attributes, and on
// my own card every badge and my moves (the tab names the next one). The
// side shows as a class on `host`. Returns a way back to the first side.
function cardSides(host, tab) {
  const SIDES = [["", "Badges"], ["layer-stats", "Attributes"]];
  if (host.querySelector(".tk-allbadges")) SIDES.push(["layer-all", "All badges"]);
  if (host.querySelector(".tk-moves")) SIDES.push(["layer-moves", "Moves"]);
  if (SIDES.length > 2) SIDES[0][1] = "Card";
  const setLayer = (k) => {
    SIDES.forEach(([cls]) => cls && host.classList.remove(cls));
    if (SIDES[k][0]) host.classList.add(SIDES[k][0]);
    if (tab) tab.textContent = SIDES[(k + 1) % SIDES.length][1];
  };
  if (tab) {
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const now = Math.max(0, SIDES.findIndex(([cls]) => cls && host.classList.contains(cls)));
      setLayer((now + 1) % SIDES.length);
      packSound("tab");
    });
  }
  return () => setLayer(0);
}

// A card up close: a dialog with the card big (but not huge) in the middle
// of the screen, so the small print reads without zooming, every side, badge
// and switch working as on the page. My own card also gets a button that
// saves it as a picture (the share sheet on phones, a download on
// computers). A wall's cards share one view: the arrows under the card (or
// the arrow keys, or a swipe) go on to the next one. Each card's is made the
// first time it shows.
const cardViews = new Map();
const MAX_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M9.5 2.5h4v4M6.5 13.5h-4v-4M13.5 2.5 9 7M2.5 13.5 7 9"/></svg>';
const STEP_ICON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3l5 5-5 5"/></svg>';
// the Full view button under a card (`ring`: the cards it can go on to)
function fullViewButton(w, ring = [w]) {
  const max = el("button", "card-max mono");
  max.type = "button";
  max.innerHTML = `${MAX_ICON}<span>Full view</span>`;
  max.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    openCardView(w, ring);
  });
  return max;
}
function openCardView(w, ring = [w]) {
  let view = cardViews.get(w);
  if (!view) {
    view = cardView(ring);
    ring.forEach((x) => cardViews.set(x, view));
  }
  view.go(ring.indexOf(w), 0);
  if (!view.open) {
    holdPage(true);
    view.showModal();
  }
}
// one card in the view: its 2K side, its sides on the tab and its switch
function cardViewPiece(w) {
  const list = w.cards || [w.card];
  const host = el("div", "card-view-card");
  const side = twoKSide(w);
  side.removeAttribute("aria-hidden");
  host.appendChild(side);
  const first = cardSides(host, side.querySelector(".tk-layer"));
  // co-starters: the switch brings the other card in front, as on the page
  const toggle = side.querySelector(".tk-switch");
  if (toggle) {
    toggle.addEventListener("click", (e) => {
      e.stopPropagation();
      const swap = side.classList.toggle("swap");
      side.dataset.tier = tierKey(list[swap ? 1 : 0].tier);
      toggle.lastChild.textContent = list[swap ? 0 : 1].short || "";
      packSound("tab");
    });
  }
  return { host, first, list, name: list[0].name || w.text, career: list[0].style === "career" };
}
function cardView(ring) {
  const dialog = el("dialog", "card-view");
  const bar = el("div", "card-view-bar");
  const save = el("button", "card-view-btn card-view-save mono", "Save as picture");
  const close = el("button", "card-view-btn mono", "Close");
  save.type = close.type = "button";
  const pieces = new Map();
  let at = 0;
  let shown = null;
  let picture = null;
  let count = null;
  if (ring.length > 1) {
    const step = (dir, label) => {
      const button = el("button", `card-view-btn card-view-step${dir < 0 ? " back" : ""}`);
      button.type = "button";
      button.innerHTML = STEP_ICON;
      button.setAttribute("aria-label", label);
      button.addEventListener("click", () => dialog.go(at + dir, dir));
      return button;
    };
    count = el("span", "card-view-count mono");
    bar.append(step(-1, "Previous card"), count, step(1, "Next card"));
  }
  bar.append(save, close);
  dialog.appendChild(bar);
  document.body.appendChild(dialog);
  // show the k-th card (dir: which way it slides in from, 0 for none)
  dialog.go = (k, dir) => {
    at = (k + ring.length) % ring.length;
    const w = ring[at];
    if (!pieces.has(w)) pieces.set(w, cardViewPiece(w));
    const piece = pieces.get(w);
    piece.first();
    if (shown !== piece) {
      if (shown) shown.host.remove();
      dialog.insertBefore(piece.host, bar);
      piece.host.classList.remove("from-next", "from-back");
      if (dir) {
        void piece.host.offsetWidth; // (so it slides in again on a second visit)
        piece.host.classList.add(dir > 0 ? "from-next" : "from-back");
        packSound("tab");
      }
      shown = piece;
    }
    dialog.setAttribute("aria-label", `${piece.name}'s card, up close`);
    if (count) count.textContent = `${at + 1} / ${ring.length}`;
    save.hidden = !piece.career;
    picture = piece.career ? careerPicture(piece.list[0]).catch(() => null) : null; // (ready before the tap, for the share sheet)
  };
  if (ring.length > 1) {
    dialog.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      e.preventDefault();
      const dir = e.key === "ArrowRight" ? 1 : -1;
      dialog.go(at + dir, dir);
    });
    // a swipe across the card goes on to the next one (or back)
    let touch = null;
    dialog.addEventListener("touchstart", (e) => {
      touch = e.touches.length === 1 ? [e.touches[0].clientX, e.touches[0].clientY] : null;
    }, { passive: true });
    dialog.addEventListener("touchend", (e) => {
      if (!touch) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touch[0];
      const dy = t.clientY - touch[1];
      touch = null;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      const dir = dx < 0 ? 1 : -1;
      dialog.go(at + dir, dir);
    });
  }
  close.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => e.target === dialog && dialog.close()); // (the dark around it)
  dialog.addEventListener("close", () => holdPage(false));
  save.addEventListener("click", async () => {
    const blob = await picture;
    const say = (text) => {
      save.textContent = text;
      clearTimeout(save.back);
      save.back = setTimeout(() => (save.textContent = "Save as picture"), 1800);
    };
    if (!blob) return say("Couldn't make it");
    if (window.goatcounter && window.goatcounter.count) {
      window.goatcounter.count({ path: "mycareer-card-save", title: "Saved my MyCAREER card", event: true });
    }
    const how = await givePicture(blob, "raywel-mycareer-card.png", "My NBA 2K26 MyCAREER build, on raywel's site: https://matimbu.github.io/raywelfrancismartin/#court");
    if (how === "saved") say("Saved");
  });
  return dialog;
}

// A picture made on the page: the share sheet on a phone (to post or send
// it), a download on a computer. Resolves "shared" or "saved".
async function givePicture(blob, name, text) {
  const file = new File([blob], name, { type: "image/png" });
  if (navigator.share && !canHover && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text });
    } catch (e) {}
    return "shared";
  }
  const url = URL.createObjectURL(blob);
  const link = el("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return "saved";
}

// The card as a picture, 1080 x 1350 (a portrait post): the card drawn big in
// the middle, in its gold, with my name over it and the jumper and the
// site's address under it
async function careerPicture(c) {
  await Promise.all(["italic 800 60px 'Barlow Condensed'", "800 60px 'Barlow Condensed'", "700 40px 'Barlow Condensed'", "600 30px 'Barlow Condensed'", "400 24px 'Geist Mono'"]
    .map((font) => document.fonts.load(font).catch(() => {})));
  const face = await new Promise((done) => {
    const img = new Image();
    img.onload = () => done(img);
    img.onerror = () => done(null);
    img.src = c.face;
  });
  const canvas = el("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const g = canvas.getContext("2d");
  const cond = (weight, size, italic = "") => `${italic}${weight} ${size}px 'Barlow Condensed', sans-serif`;
  const METAL = ["#fff8d8", "#f5d470", "#b8841f", "#fde8a2", "#6e4a0c"];
  const metal = (x0, y0, x1, y1) => {
    const grad = g.createLinearGradient(x0, y0, x1, y1);
    [0, 0.3, 0.54, 0.72, 1].forEach((at, i) => grad.addColorStop(at, METAL[i]));
    return grad;
  };
  // 2K26's badge shield: flat on top, a point below
  const shield = (cx, cy, size) => {
    g.beginPath();
    [[-0.88, -1], [0.88, -1], [1, -0.88], [1, 0.28], [0, 1], [-1, 0.28], [-1, -0.88]].forEach(([dx, dy], k) => (k ? g.lineTo : g.moveTo).call(g, cx + dx * size, cy + dy * size * 1.18));
    g.closePath();
  };
  const LEVEL = { legend: ["#ffaba6", "#d21f2e"], hof: ["#d6b6ff", "#7a3de0"], gold: ["#ffe7a3", "#c8921a"], silver: ["#f1f4f6", "#8d98a1"], bronze: ["#f0b889", "#93502a"] };
  // the page: dark, a gold light behind the card
  g.fillStyle = "#0b0906";
  g.fillRect(0, 0, 1080, 1350);
  const halo = g.createRadialGradient(540, 600, 80, 540, 600, 720);
  halo.addColorStop(0, "rgba(245,184,65,0.2)");
  halo.addColorStop(1, "rgba(245,184,65,0)");
  g.fillStyle = halo;
  g.fillRect(0, 0, 1080, 1350);
  // the card: a gold frame notched at the top right, dark inside with rays
  const x = 150, y = 120, w = 780, h = 1040, notch = 64;
  const shape = (inset) => {
    g.beginPath();
    g.moveTo(x + inset, y + inset);
    g.lineTo(x + w - notch - inset * 0.4, y + inset);
    g.lineTo(x + w - inset, y + notch + inset * 0.4);
    g.lineTo(x + w - inset, y + h - inset);
    g.lineTo(x + inset, y + h - inset);
    g.closePath();
  };
  g.save();
  g.shadowColor = "rgba(245,200,90,0.55)";
  g.shadowBlur = 60;
  shape(0);
  g.fillStyle = metal(0, y, 0, y + h);
  g.fill();
  g.restore();
  const cx = x + w / 2;
  const cy = y + 400;
  g.save();
  shape(11);
  g.clip();
  g.fillStyle = "#120c02";
  g.fillRect(x, y, w, h);
  const glow = g.createRadialGradient(cx, cy, 20, cx, cy, 460);
  glow.addColorStop(0, "rgba(184,132,31,0.55)");
  glow.addColorStop(1, "rgba(184,132,31,0)");
  g.fillStyle = glow;
  g.fillRect(x, y, w, h);
  g.fillStyle = "rgba(255,255,255,0.045)";
  for (let k = 0; k < 36; k++) {
    const a = (k / 36) * Math.PI * 2;
    g.beginPath();
    g.moveTo(cx, cy);
    g.lineTo(cx + Math.cos(a) * 1400, cy + Math.sin(a) * 1400);
    g.lineTo(cx + Math.cos(a + 0.06) * 1400, cy + Math.sin(a + 0.06) * 1400);
    g.fill();
  }
  g.restore();
  // MC and the build's tag, the overall
  g.textAlign = "left";
  g.fillStyle = "#fff";
  g.font = cond(800, 84, "italic ");
  g.fillText("MC", x + 58, y + 124);
  g.fillStyle = "#f5d470";
  g.font = cond(700, 28);
  g.fillText((c.label || c.tier || "").toUpperCase(), x + 62, y + 166);
  g.textAlign = "right";
  g.fillStyle = "#fde8a2";
  g.font = cond(700, 28);
  g.fillText("OVR", x + w - 70, y + 118);
  g.fillStyle = metal(0, y + 110, 0, y + 250);
  g.font = cond(800, 140);
  g.fillText(String(c.ovr), x + w - 62, y + 250);
  // the face in a gold ring
  const r = 170;
  g.beginPath();
  g.arc(cx, cy, r + 15, 0, Math.PI * 2);
  g.fillStyle = "#6e4a0c";
  g.fill();
  g.beginPath();
  g.arc(cx, cy, r + 10, 0, Math.PI * 2);
  g.fillStyle = "#f5d470";
  g.fill();
  g.save();
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.clip();
  g.fillStyle = "#b8841f";
  g.fillRect(cx - r, cy - r, r * 2, r * 2);
  if (face) g.drawImage(face, cx - r, cy - r, r * 2, r * 2);
  g.restore();
  // the names, the size, the position on its bar
  g.textAlign = "center";
  if (c.player) {
    g.fillStyle = "#f5d470";
    g.font = cond(700, 36);
    g.fillText(c.player.toUpperCase().split("").join(" "), cx, y + 648);
  }
  g.fillStyle = "#fff";
  g.font = cond(700, 64);
  const words = (c.archetype || "").split(" ");
  const lines = [""];
  words.forEach((word) => {
    const next = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${word}` : word;
    if (g.measureText(next).width > w - 120 && lines[lines.length - 1]) lines.push(word);
    else lines[lines.length - 1] = next;
  });
  lines.forEach((line, k) => g.fillText(line, cx, y + 718 + k * 62));
  const below = y + 718 + (lines.length - 1) * 62;
  g.fillStyle = "rgba(255,255,255,0.9)";
  g.font = cond(600, 34);
  g.fillText(c.size || "", cx, below + 58);
  const barY = below + 84;
  g.fillStyle = metal(x, 0, x + w, 0);
  g.fillRect(x + 11, barY, w - 22, 62);
  g.fillStyle = "#120d06";
  g.font = cond(800, 38);
  const pos = POSITIONS[c.pos] || c.pos || "";
  g.fillText(pos.toUpperCase().split("").join(" "), cx, barY + 45);
  // the three badges, in a row under the bar
  const chips = (c.badges || []).slice(0, 3);
  let size = 30;
  const chipWidth = () => chips.reduce((sum, [name, level]) => {
    g.font = cond(700, size);
    const nameW = g.measureText(name).width;
    g.font = cond(700, size * 0.72);
    return sum + size * 1.3 + nameW + 10 + g.measureText(String(level).toUpperCase()).width + 34;
  }, 0);
  while (chipWidth() > w - 80 && size > 20) size -= 2;
  let at = cx - chipWidth() / 2;
  const chipY = barY + 122;
  chips.forEach(([name, level]) => {
    const [hi, lo] = LEVEL[String(level).toLowerCase()] || LEVEL.silver;
    const grad = g.createLinearGradient(at, chipY - size, at + size, chipY);
    grad.addColorStop(0, hi);
    grad.addColorStop(1, lo);
    shield(at + size * 0.5, chipY - size * 0.35, size * 0.5);
    g.fillStyle = grad;
    g.fill();
    at += size * 1.3;
    g.textAlign = "left";
    g.fillStyle = "#fff";
    g.font = cond(700, size);
    g.fillText(name, at, chipY);
    at += g.measureText(name).width + 10;
    g.fillStyle = hi;
    g.font = cond(700, size * 0.72);
    const tag = String(level).toUpperCase();
    g.fillText(tag, at, chipY);
    at += g.measureText(tag).width + 34;
  });
  // over and under the card
  g.textAlign = "center";
  g.fillStyle = "rgba(242,240,235,0.62)";
  g.font = "400 24px 'Geist Mono', monospace";
  g.fillText(`${(c.name || "").toUpperCase()}  ·  MY NBA 2K26 MYCAREER BUILD`, 540, 76);
  const shot = c.jumper && typeof c.jumper === "object" ? c.jumper : null;
  if (shot) {
    g.fillStyle = "#f5d470";
    const text = `JUMPER · ${String(shot.name || "").toUpperCase()}  ·  ${String(shot.line || "").toUpperCase()}`;
    let px = 22;
    do g.font = `400 ${px--}px 'Geist Mono', monospace`;
    while (g.measureText(text).width > 980 && px > 14);
    g.fillText(text, 540, 1208);
    g.fillStyle = "rgba(245,212,112,0.7)";
    g.font = "400 19px 'Geist Mono', monospace";
    g.fillText((shot.grades || []).map(([n, v]) => `${n.toUpperCase()} ${v}`).join("  ·  "), 540, 1244);
  }
  g.fillStyle = "#8f8c86";
  g.font = "400 22px 'Geist Mono', monospace";
  g.fillText("MATIMBU.GITHUB.IO/RAYWELFRANCISMARTIN/#COURT", 540, 1290);
  return new Promise((done) => canvas.toBlob(done, "image/png"));
}

// The back of a starting-five photo: its card (or two, one behind the other,
// for co-starters, with a switch between them), the tab that switches the
// badges and the attributes, and the pack's face-down side
const SWITCH_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5"/></svg>';
function twoKSide(w) {
  const list = (w.cards || [w.card]).slice(0, 2);
  const side = el("span", "flip-face tk-side");
  side.setAttribute("aria-hidden", "true");
  side.dataset.tier = tierKey(list[0].tier);
  if (list.length > 1) side.classList.add("tk-stack");
  if (list[0].style === "career") side.classList.add("tk-side-career");
  list.forEach((c, i) => side.appendChild(twoKCard(c, w, i ? "tk-alt" : "")));
  if (list.some((c) => c.stats && c.stats.length)) side.appendChild(el("span", "tk-layer", "Attributes"));
  if (list.length > 1) {
    // the switch names the card behind: tap it to bring that one in front
    const toggle = el("span", "tk-switch");
    toggle.innerHTML = SWITCH_ICON;
    toggle.appendChild(el("span", "", list[1].short || ""));
    side.appendChild(toggle);
  }
  side.appendChild(packFace(w, list[0]));
  return side;
}

// The cover's main colour: the average of its livelier pixels (saturated, not
// too dark or bright) in a 24 x 24 copy, lifted so it reads on the page. Null
// for a grey cover, or one the page isn't allowed to read.
function coverTint(img) {
  try {
    const size = 24;
    const canvas = el("canvas");
    canvas.width = canvas.height = size;
    const g = canvas.getContext("2d", { willReadFrequently: true });
    g.drawImage(img, 0, 0, size, size);
    const d = g.getImageData(0, 0, size, size).data;
    let r = 0, gr = 0, b = 0, sum = 0;
    for (let i = 0; i < d.length; i += 4) {
      const hi = Math.max(d[i], d[i + 1], d[i + 2]);
      const lo = Math.min(d[i], d[i + 1], d[i + 2]);
      if (hi < 40) continue;
      const sat = (hi - lo) / hi;
      const weight = sat * sat * (1 - Math.abs(hi / 255 - 0.6));
      r += d[i] * weight;
      gr += d[i + 1] * weight;
      b += d[i + 2] * weight;
      sum += weight;
    }
    if (sum < 1) return null;
    const [R, G, B] = [r / sum / 255, gr / sum / 255, b / sum / 255];
    const hi = Math.max(R, G, B);
    const lo = Math.min(R, G, B);
    if (hi - lo < 0.06) return null;
    const span = hi - lo;
    let hue = hi === R ? ((G - B) / span) % 6 : hi === G ? (B - R) / span + 2 : (R - G) / span + 4;
    hue = (hue * 60 + 360) % 360;
    const sat = span / (1 - Math.abs(hi + lo - 1));
    return `hsl(${hue.toFixed(0)} ${Math.round(Math.max(55, Math.min(85, sat * 100)))}% 62%)`;
  } catch (e) {
    return null;
  }
}

// Phones: a turned 2K card leans as the phone tilts and its shine moves
// with it, like the holo on computers. The lean is measured from how the
// phone was held when the card turned. iPhones ask for motion access once
// (it has to be asked from the tap that turns the card).
let tiltBase = null;
let tiltOn = false;
function phoneTilt() {
  tiltBase = null;
  if (tiltOn || reduceMotion || !("DeviceOrientationEvent" in window)) return;
  const listen = () => {
    tiltOn = true;
    addEventListener("deviceorientation", (e) => {
      const card = document.querySelector(".ww-card.flipped");
      if (!card || e.beta == null || e.gamma == null) return;
      if (!tiltBase) tiltBase = { beta: e.beta, gamma: e.gamma };
      const x = Math.max(-1, Math.min(1, (e.gamma - tiltBase.gamma) / 22));
      const y = Math.max(-1, Math.min(1, (e.beta - tiltBase.beta) / 22));
      card.style.setProperty("--tilt-x", `${(-y * 10).toFixed(2)}deg`);
      card.style.setProperty("--tilt-y", `${(x * 12).toFixed(2)}deg`);
      card.style.setProperty("--mx", `${(50 + x * 42).toFixed(1)}%`);
      card.style.setProperty("--my", `${(50 + y * 42).toFixed(1)}%`);
      card.classList.add("tilting");
    });
  };
  if (typeof DeviceOrientationEvent.requestPermission === "function") {
    DeviceOrientationEvent.requestPermission().then((answer) => answer === "granted" && listen()).catch(() => {});
  } else {
    listen();
  }
}

// On the court's play board: a coach's board with the half court around the
// arc (the basket at the top) where the words are drawn as a play in marker,
// one step for each word as it lights up, and two power forward plays to
// switch between (tabs under the board). Back door: the 4 on the wing with
// the 1 up top holding the ball (Power forward), his defender overplaying the
// pass (6 ft), a fake out toward the ball, then the cut behind him along the
// baseline to the block, the 1's bounce pass meeting him there (Back door),
// then straight up for an easy layup.
// Draw a play (Coach mode) draws my own, on the big board.
// Horns: the 4 and 5 at the elbows, the 1 up top, shooters in both corners;
// the 4's man sags off; the 4 steps up to screen for the 1, who comes off it
// dribbling; the 4 pops out beyond the arc, catches and knocks it down.
// 5-out post: all five on the arc, the 4 on the wing; his man plays him
// tight; the motion: the 4 dives to the block and seals, the 5 lifts from
// the corner, the ball goes 1 to 5 to the 4; the drop step spin, and one.
function playBoard() {
  const board = el("div", "play-board reveal");
  const f = (n) => n.toFixed(1);
  const head = (x, y, angle, size = 7) => {
    const side = (turn) => `${f(x + Math.cos(angle + Math.PI + turn) * size)} ${f(y + Math.sin(angle + Math.PI + turn) * size)}`;
    return `M${side(-0.5)} L${f(x)} ${f(y)} L${side(0.5)}`;
  };
  // each mark draws (or fades in) `at` seconds into its step, taking `t`
  const ink = (cls, d, at = 0, t = 0.4) => `<path class="ink ${cls}" pathLength="1" d="${d}" style="--at:${at}s;--t:${t}s"/>`;
  const later = (cls, d, at) => `<path class="fade ${cls}" d="${d}" style="--at:${at}s"/>`;
  // the fake out toward the ball, the cut round behind the defender to the
  // block, the bounce pass from the top meeting it, and the spin to the rim
  const fake = { x: 247, y: 135 };
  const cut = "M247 135 C259 108 247 76 208 62";
  const pass = { x0: 157, y0: 167, x1: 203, y1: 73 };
  const layup = "M208 62 C197 52 180 42 159 36"; // (the back door ends in an easy layup)
  // Horns: the screen, the 1's dribble off it, the pop and the shot
  const dribble = "M157 175 L163 169 L169 175 L175 169 L181 175 L187 169 L193 173 L199 171";
  const pop = "M178 152 C198 164 232 162 258 148";
  const mates = [[150, 178, 1], [94, 116, 5], [12, 18, 2], [288, 18, 3]].map(([x, y, n], k) =>
    `<circle class="fade mate" cx="${x}" cy="${y}" r="9" style="--at:${(0.35 + k * 0.08).toFixed(2)}s"/>` +
    `<text class="fade num mate-num" x="${x}" y="${y + 4.5}" style="--at:${(0.4 + k * 0.08).toFixed(2)}s">${n}</text>`).join("");
  const horns = `
    <g class="play-set" data-play="horns">
      <g class="play-step">
        <circle class="ink me" pathLength="1" cx="206" cy="116" r="10" style="--at:0s;--t:0.5s"/>
        <text class="fade num" x="206" y="120.5" style="--at:0.3s">4</text>
        ${mates}
      </g>
      <g class="play-step">
        ${ink("me", "M190 94 L202 106", 0, 0.18)}
        ${ink("me", "M202 94 L190 106", 0.2, 0.18)}
      </g>
      <g class="play-step">
        ${ink("move", "M200 124 L178 152", 0, 0.3)}
        ${ink("move", "M171 146 L185 158", 0.3, 0.15)}
        <text class="fade note" x="118" y="146" style="--at:0.35s">screen</text>
        ${ink("move", dribble, 0.5, 0.6)}
        ${later("move", head(199, 171, Math.atan2(171 - 173, 199 - 193), 6), 1.1)}
      </g>
      <g class="play-step">
        ${ink("move", pop, 0, 0.5)}
        ${later("move", head(258, 148, Math.atan2(148 - 162, 258 - 232), 6), 0.5)}
        <text class="fade note" x="262" y="170" style="--at:0.5s">pop</text>
        ${later("pass", "M201 168 L250 151", 0.55)}
        ${later("pass pass-head", head(250, 151, Math.atan2(151 - 168, 250 - 201), 6), 0.65)}
        ${later("pass", "M258 140 Q222 30 157 30", 0.9)}
        <circle class="fade made" cx="150" cy="31.5" r="4.5" style="--at:1.25s"/>
        <text class="fade and-one" x="96" y="66" style="--at:1.3s">splash!</text>
      </g>
    </g>`;
  // 5-out into the post: everyone on the arc, the 4 dives from the wing to
  // the block and seals, the 5 lifts out of the corner, the ball goes 1 to
  // 5 to the 4, and the drop step spin finishes it
  const five = [[150, 180, 1], [44, 140, 2], [6, 24, 3], [294, 24, 5]].map(([x, y, n], k) =>
    `<circle class="fade mate" cx="${x}" cy="${y}" r="9" style="--at:${(0.35 + k * 0.08).toFixed(2)}s"/>` +
    `<text class="fade num mate-num" x="${x}" y="${y + 4.5}" style="--at:${(0.4 + k * 0.08).toFixed(2)}s">${n}</text>`).join("");
  const post = `
    <g class="play-set" data-play="post">
      <g class="play-step">
        <circle class="ink me" pathLength="1" cx="256" cy="140" r="10" style="--at:0s;--t:0.5s"/>
        <text class="fade num" x="256" y="144.5" style="--at:0.3s">4</text>
        ${five}
        <text class="fade note" x="168" y="199" style="--at:0.75s">5 out</text>
      </g>
      <g class="play-step">
        ${ink("me", "M234 112 L246 124", 0, 0.18)}
        ${ink("me", "M246 112 L234 124", 0.2, 0.18)}
      </g>
      <g class="play-step">
        ${ink("move", "M249 132 C236 112 226 84 206 66", 0, 0.5)}
        ${later("move drive-head", head(206, 66, Math.atan2(66 - 84, 206 - 226), 6), 0.5)}
        ${ink("move", "M200 73 L211 61", 0.55, 0.15)}
        <text class="fade note" x="216" y="58" style="--at:0.6s">seal</text>
        ${ink("mate-move", "M294 34 C300 64 294 90 280 102", 0.3, 0.45)}
        ${later("pass", "M158 175 L272 108", 0.85)}
        ${later("pass pass-head", head(272, 108, Math.atan2(108 - 175, 272 - 158), 6), 0.95)}
        ${later("pass", "M274 104 L216 72", 1.15)}
        ${later("pass pass-head", head(216, 72, Math.atan2(72 - 104, 216 - 274), 6), 1.25)}
      </g>
      <g class="play-step">
        ${ink("move", "M206 66 C214 57 215 46 206 42 C197 38 189 47 195 54 C200 60 187 52 158 37", 0, 0.7)}
        <circle class="fade made" cx="150" cy="31.5" r="4.5" style="--at:0.7s"/>
        <text class="fade and-one" x="96" y="66" style="--at:0.8s">and 1!</text>
      </g>
    </g>`;
  board.innerHTML = `<svg viewBox="-12 -12 324 214">
    <g class="court">
      <path d="M0 202 V0 H300 V202"/>
      <path d="M102 0 V114 H198 V0"/>
      <path d="M114 114 A36 36 0 0 0 186 114"/>
      <path class="dash" d="M114 114 A36 36 0 0 1 186 114"/>
      <path d="M126 31.5 A24 24 0 0 0 174 31.5"/>
      <path d="M18 0 V84 A142.5 142.5 0 0 0 282 84 V0"/>
      <path d="M96 42 h6 M198 42 h6 M98 66 h4 M198 66 h4 M98 78 h4 M198 78 h4 M98 90 h4 M198 90 h4"/>
      <path class="board-glass" d="M132 24 H168"/>
      <circle class="rim" cx="150" cy="31.5" r="4.5"/>
    </g>
    <g class="play-set active" data-play="back-door">
    <g class="play-step">
      <circle class="ink me" pathLength="1" cx="240" cy="108" r="10" style="--at:0s;--t:0.5s"/>
      <text class="fade num" x="240" y="112.5" style="--at:0.3s">4</text>
      <circle class="fade mate" cx="150" cy="176" r="9" style="--at:0.4s"/>
      <text class="fade num mate-num" x="150" y="180.5" style="--at:0.5s">1</text>
    </g>
    <g class="play-step">
      ${ink("me", "M218 118 L230 130", 0, 0.18)}
      ${ink("me", "M230 118 L218 130", 0.2, 0.18)}
    </g>
    <g class="play-step">
      ${ink("move", `M242 117 L${fake.x} ${fake.y}`, 0, 0.2)}
      <text class="fade note" x="252" y="152" style="--at:0.2s">fake</text>
      ${ink("move", cut, 0.35, 0.7)}
      ${later("move drive-head", head(208, 62, Math.atan2(62 - 76, 208 - 247)), 1.05)}
      <text class="fade note" x="250" y="72" style="--at:0.9s">back door</text>
      ${later("pass", `M${pass.x0} ${pass.y0} L${pass.x1} ${pass.y1}`, 0.95)}
      ${later("pass pass-head", head(pass.x1, pass.y1, Math.atan2(pass.y1 - pass.y0, pass.x1 - pass.x0), 6), 1.1)}
    </g>
    <g class="play-step">
      ${ink("move", layup, 0, 0.4)}
      <circle class="fade made" cx="150" cy="31.5" r="4.5" style="--at:0.4s"/>
      <text class="fade and-one" x="96" y="66" style="--at:0.5s">easy 2</text>
    </g>
    </g>
    ${horns}
    ${post}
  </svg>`;
  board.querySelector("svg").setAttribute("aria-hidden", "true");
  // Replay: the board wipes and draws the whole move again, a step at a time
  // (tap the board, or its Replay button)
  const replay = el("button", "play-replay mono");
  replay.type = "button";
  replay.setAttribute("aria-label", "Replay the play");
  replay.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.2 8.6A5.3 5.3 0 1 1 11.6 4.4"/><path d="M12.4 1.6v3.3H9.1"/></svg><span>Replay</span>';
  board.appendChild(replay);
  // a line under the court saying what the step just drawn is
  const CAPTIONS = {
    "back-door": ["The 4 on the wing, the 1 up top with the ball", "His man overplays the pass", "A fake out, then the cut behind him; the 1 bounces it in", "Catch at the block, straight up: easy layup"],
    horns: ["Horns: the 4 and 5 at the elbows, shooters in the corners", "The 4's man sags off into the paint", "The 4 steps up and screens; the 1 comes off it", "The 4 pops behind the arc, catches and lets it fly"],
    post: ["Five out: everyone on the arc, the 4 on the wing", "His man plays him tight", "The 4 dives and seals, the 5 lifts; 1 to 5 to the post", "Drop step spin: and one"]
  };
  const caption = el("p", "play-caption");
  caption.setAttribute("aria-live", "polite");
  // Guess the play: one drawn slowly, no caption, no tab lit; pick it with
  // the tabs. `quiz` is the play to guess, `streak` the ones in a row.
  let quiz = null;
  let streak = 0;
  board.narrate = (k) => {
    if (quiz) {
      caption.textContent = "Which play is this? Pick it below.";
      return;
    }
    const play = board.querySelector(".play-set.active");
    const lines = CAPTIONS[play && play.dataset.play] || [];
    caption.textContent = k >= 0 && lines[k] ? `${k + 1}/${lines.length}  ${lines[k]}` : "";
  };
  let replaying = 0;
  // `slow`: the same, at well under half speed, so each step can be read
  const again = (slow = false) => {
    const run = ++replaying;
    const pace = slow === true ? 2.4 : 1;
    const steps = [...board.querySelectorAll(".play-set.active .play-step")];
    board.dataset.replaying = "1";
    board.classList.add("resetting");
    board.classList.toggle("slow", pace > 1);
    steps.forEach((step) => step.classList.remove("on"));
    board.narrate(-1);
    void board.offsetWidth; // the wipe is instant, then it draws again
    board.classList.remove("resetting");
    const at = [250, 950, 1650, 3300];
    steps.forEach((step, i) => setTimeout(() => {
      if (run !== replaying) return;
      step.classList.add("on");
      board.narrate(i);
    }, (at[i] ?? 250 + i * 900) * pace));
    setTimeout(() => {
      if (run !== replaying) return;
      delete board.dataset.replaying;
      board.classList.remove("slow");
    }, 4600 * pace);
  };
  // (in Coach mode only its Replay button replays: the board is for drawing)
  board.addEventListener("click", (e) => {
    if (!coach) return again();
    if (e.target.closest(".play-replay")) coachReplay();
  });
  // the plays, under the board: pick one and it draws from the start
  const tabs = el("div", "play-tabs");
  const select = (key) => {
    board.querySelectorAll(".play-set").forEach((p) => p.classList.toggle("active", p.dataset.play === key));
    tabs.querySelectorAll(".play-tab").forEach((t) => {
      t.classList.toggle("on", t.dataset.play === key);
      t.setAttribute("aria-pressed", String(t.dataset.play === key));
    });
    again();
  };
  const PLAYS = [["back-door", "Back door"], ["horns", "Horns"], ["post", "5-out post"]];
  // an answer: right or wrong, the play is named and finishes drawing
  const answer = (key) => {
    const right = key === quiz;
    const name = PLAYS.find(([k]) => k === quiz)[1];
    streak = right ? streak + 1 : 0;
    quiz = null;
    board.classList.remove("quiz");
    replaying++; // (the slow draw stops; the whole play shows)
    board.classList.remove("slow");
    delete board.dataset.replaying;
    board.querySelectorAll(".play-set.active .play-step").forEach((step) => step.classList.add("on"));
    tabs.querySelectorAll(".play-tab[data-play]").forEach((t) => t.classList.toggle("on", t.dataset.play === board.querySelector(".play-set.active").dataset.play));
    caption.textContent = right ? `Right, it's ${name}.${streak > 1 ? ` ${streak} in a row!` : ""}` : `Not quite: that was ${name}.`;
    packSound(right ? "reveal" : "tab", right ? { tier: "goat" } : undefined);
  };
  PLAYS.forEach(([key, name], k) => {
    const tab = el("button", `play-tab mono${k ? "" : " on"}`, name);
    tab.type = "button";
    tab.dataset.play = key;
    tab.setAttribute("aria-pressed", String(!k));
    tab.addEventListener("click", (e) => {
      e.stopPropagation();
      if (quiz) answer(key);
      else select(key);
    });
    tabs.appendChild(tab);
  });
  const guess = el("button", "play-tab play-guess mono", "Guess the play");
  guess.type = "button";
  guess.addEventListener("click", (e) => {
    e.stopPropagation();
    quiz = PLAYS[Math.floor(Math.random() * PLAYS.length)][0];
    board.classList.add("quiz");
    board.querySelectorAll(".play-set").forEach((p) => p.classList.toggle("active", p.dataset.play === quiz));
    tabs.querySelectorAll(".play-tab").forEach((t) => t.classList.remove("on"));
    again(true);
  });
  // slow motion: the play again at a walk, a caption for each step
  const slow = el("button", "play-tab play-slow mono", "Slow-mo");
  slow.type = "button";
  slow.addEventListener("click", (e) => {
    e.stopPropagation();
    again(true);
  });
  // Full view: the board big in the middle of the screen. The board itself
  // moves into a dialog (a stand-in keeps its place) and back on closing,
  // so a play or a quiz carries on.
  const max = el("button", "play-tab play-max mono");
  max.type = "button";
  max.setAttribute("aria-label", "Full view of the board");
  max.innerHTML = MAX_ICON;
  let view = null;
  let spot = null;
  max.addEventListener("click", (e) => {
    e.stopPropagation();
    if (view && view.open) return view.close();
    if (!view) {
      view = el("dialog", "board-view");
      view.setAttribute("aria-label", "The play board, up close");
      view.addEventListener("click", (ev) => ev.target === view && view.close());
      view.addEventListener("close", () => {
        leaveCoach(); // (Coach mode ends with the big board)
        spot.replaceWith(board);
        board.classList.remove("big");
        max.setAttribute("aria-label", "Full view of the board");
        holdPage(false);
      });
      document.body.appendChild(view);
    }
    spot = el("div", "play-board play-spot");
    spot.style.height = `${board.offsetHeight}px`;
    board.replaceWith(spot);
    board.classList.add("big");
    max.setAttribute("aria-label", "Close the full view");
    view.appendChild(board);
    holdPage(true);
    view.showModal();
    if (!quiz) again();
  });
  // Coach mode (Draw a play): my own play, drawn on the big board. Five
  // players start 5 out, the 1 up top with the ball. Drag a player and they
  // cut there, or onto a teammate to set a screen; drag whoever has the ball
  // to dribble, to the rim to drive, or onto a teammate to pass; tap them to
  // shoot. Undo, Clear, and Replay draws it again a step at a time. Defense
  // puts an X on each of them (drag an X to move it). Share makes a link
  // that opens the board with the play drawing itself; Save picture makes a
  // picture of it. (The play is kept in this browser for next time.)
  const NS = "http://www.w3.org/2000/svg";
  const RIM = [150, 31.5];
  const START = { 1: [150, 178], 2: [44, 140], 3: [6, 24], 4: [256, 140], 5: [294, 24] };
  const CREW = [1, 2, 3, 4, 5];
  const HINT = "Drag a player to cut, or onto a teammate to screen. With the ball: drag to dribble, drive or pass; tap to shoot.";
  const svg = board.querySelector("svg");
  const mine = document.createElementNS(NS, "g");
  mine.setAttribute("class", "play-set coach-set");
  mine.setAttribute("data-play", "mine");
  const lines = document.createElementNS(NS, "g");
  const crew = document.createElementNS(NS, "g");
  const dot = {};
  CREW.forEach((n) => {
    const player = document.createElementNS(NS, "g");
    player.setAttribute("class", `coach-player${n === 4 ? " coach-me" : ""}`);
    player.innerHTML = `<circle r="10"/><text class="num" y="4.5">${n}</text>`;
    crew.appendChild(player);
    dot[n] = player;
  });
  const ball = document.createElementNS(NS, "circle");
  ball.setAttribute("class", "coach-ball");
  ball.setAttribute("r", "3.4");
  crew.appendChild(ball);
  const live = document.createElementNS(NS, "path"); // (the line while it's dragged)
  live.setAttribute("class", "coach-live");
  // the defense: an X for each player, numbered for the one it guards
  const guards = document.createElementNS(NS, "g");
  const xs = {};
  CREW.forEach((n) => {
    const x = document.createElementNS(NS, "g");
    x.setAttribute("class", "coach-def");
    x.innerHTML = `<path d="M-6 -6 L6 6 M6 -6 L-6 6"/><text class="def-num" x="7" y="13">${n}</text>`;
    guards.appendChild(x);
    xs[n] = x;
  });
  mine.append(lines, guards, crew);
  svg.appendChild(mine);
  let plan = [];
  let defense = null; // (null: no defense; else each X's spot, by the one it guards)
  try {
    plan = JSON.parse(localStorage.getItem("myPlay") || "[]");
    if (!Array.isArray(plan)) plan = [];
    const d = JSON.parse(localStorage.getItem("myPlayD") || "null");
    if (d && CREW.every((n) => Array.isArray(d[n]))) defense = d;
  } catch (e) {
    plan = [];
  }
  const keep = () => {
    try {
      localStorage.setItem("myPlay", JSON.stringify(plan));
      localStorage.setItem("myPlayD", JSON.stringify(defense));
    } catch (e) {}
  };
  // where everyone stands (and who has the ball) after the first k steps
  const stateAt = (k) => {
    const s = { at: { ...START }, ball: 1 };
    plan.slice(0, k).forEach((m) => {
      if (m.kind === "pass") s.ball = m.to;
      else if (m.kind === "shot") s.ball = 0;
      else {
        s.at[m.n] = m.end;
        if (m.kind === "drive") s.ball = 0;
      }
    });
    return s;
  };
  const place = (s) => {
    CREW.forEach((n) => (dot[n].style.transform = `translate(${s.at[n][0]}px, ${s.at[n][1]}px)`));
    const holder = s.ball && s.at[s.ball];
    ball.style.opacity = holder ? "1" : "0";
    if (holder) ball.style.transform = `translate(${holder[0] + 8}px, ${holder[1] - 8}px)`;
    guards.style.display = defense ? "" : "none";
    if (defense) CREW.forEach((n) => (xs[n].style.transform = `translate(${defense[n][0]}px, ${defense[n][1]}px)`));
  };
  // the marks: a marker line through the dragged points (a zigzag while
  // dribbling), an arrowhead or a screen's bar at the end, dashed passes
  const pathOf = (pts) => pts.map(([x, y], i) => `${i ? "L" : "M"}${f(x)} ${f(y)}`).join(" ");
  const smooth = (pts) => {
    if (pts.length < 3) return pathOf(pts);
    let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
    for (let i = 1; i < pts.length - 1; i++) {
      d += ` Q${f(pts[i][0])} ${f(pts[i][1])} ${f((pts[i][0] + pts[i + 1][0]) / 2)} ${f((pts[i][1] + pts[i + 1][1]) / 2)}`;
    }
    const [x, y] = pts[pts.length - 1];
    return `${d} L${f(x)} ${f(y)}`;
  };
  const zigzag = (pts) => {
    const out = [pts[0]];
    let side = 1;
    let carry = 0;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const len = Math.hypot(x1 - x0, y1 - y0);
      if (!len) continue;
      const ux = (x1 - x0) / len;
      const uy = (y1 - y0) / len;
      let t = 6 - carry;
      for (; t <= len; t += 6, side = -side) out.push([x0 + ux * t - uy * 3.5 * side, y0 + uy * t + ux * 3.5 * side]);
      carry = len - (t - 6);
    }
    out.push(pts[pts.length - 1]);
    return pathOf(out);
  };
  // where a line meets the circle of the player standing at its end (the
  // arrow goes there, in front of them), and which way it's heading
  const tip = (pts, gap = 12) => {
    let [x, y] = pts[pts.length - 1];
    let left = gap;
    for (let i = pts.length - 2; i >= 0; i--) {
      const [px, py] = pts[i];
      const len = Math.hypot(x - px, y - py);
      if (len >= left) return [x + ((px - x) * left) / len, y + ((py - y) * left) / len, Math.atan2(y - py, x - px)];
      left -= len;
      [x, y] = [px, py];
    }
    const [x0, y0] = pts[0];
    const [x1, y1] = pts[pts.length - 1];
    return [x0, y0, Math.atan2(y1 - y0, x1 - x0)];
  };
  const three = ([x, y]) => Math.hypot(x - RIM[0], y - RIM[1]) > 142 || x < 18 || x > 282;
  const made = (at, word) => `<circle class="fade made" cx="${RIM[0]}" cy="${RIM[1]}" r="4.5" style="--at:${at}s"/>` +
    `<text class="fade and-one" x="96" y="66" style="--at:${at + 0.1}s">${word}</text>`;
  const marks = (m, s) => {
    if (m.kind === "pass" || m.kind === "shot") {
      const [x0, y0] = s.at[m.n];
      if (m.kind === "shot") {
        const dx = RIM[0] - x0;
        const dy = RIM[1] - y0;
        return later("pass", `M${f(x0)} ${f(y0)} Q${f(x0 + dx / 2 - dy * 0.3)} ${f(y0 + dy / 2 + dx * 0.3)} ${RIM[0]} ${RIM[1]}`, 0) + made(0.45, m.three ? "splash!" : "bucket!");
      }
      const [x1, y1] = s.at[m.to];
      const a = Math.atan2(y1 - y0, x1 - x0);
      const [ax, ay] = [x0 + Math.cos(a) * 12, y0 + Math.sin(a) * 12];
      const [bx, by] = [x1 - Math.cos(a) * 12, y1 - Math.sin(a) * 12];
      return later("pass", `M${f(ax)} ${f(ay)} L${f(bx)} ${f(by)}`, 0) + later("pass pass-head", head(bx, by, a, 6), 0.15);
    }
    const [ex, ey] = m.end;
    const [hx, hy, a] = tip(m.pts);
    if (m.kind === "screen") {
      // the bar, square to the teammate, just in front of the screener
      const [mx, my] = s.at[m.to];
      const b = Math.atan2(my - ey, mx - ex);
      const [bx, by] = [ex + Math.cos(b) * 12, ey + Math.sin(b) * 12];
      const [px, py] = [Math.cos(b + Math.PI / 2) * 7, Math.sin(b + Math.PI / 2) * 7];
      return ink("move", smooth(m.pts), 0, 0.5) + ink("move", `M${f(bx - px)} ${f(by - py)} L${f(bx + px)} ${f(by + py)}`, 0.5, 0.15) +
        `<text class="fade note" x="${f(ex + 13)}" y="${f(ey + 20)}" style="--at:0.6s">screen</text>`;
    }
    if (m.kind === "dribble") return ink("move", zigzag(m.pts), 0, 0.6) + later("move", head(hx, hy, a, 6), 0.6);
    if (m.kind === "drive") return ink("move", zigzag(m.pts), 0, 0.6) + made(0.6, "bucket!");
    return ink("move", smooth(m.pts), 0, 0.5) + later("move", head(hx, hy, a, 6), 0.5);
  };
  const say = (m) => ({
    cut: `The ${m.n} cuts`,
    screen: `The ${m.n} screens for the ${m.to}`,
    dribble: `The ${m.n} puts it on the floor`,
    drive: `The ${m.n} drives: bucket!`,
    pass: `The ${m.n} swings it to the ${m.to}`,
    shot: `The ${m.n} lets it fly: ${m.three ? "splash!" : "bucket!"}`
  })[m.kind];
  const stepOf = (m, s, on) => {
    const step = document.createElementNS(NS, "g");
    step.setAttribute("class", `play-step${on ? " on" : ""}`);
    step.innerHTML = marks(m, s);
    return step;
  };
  const draw = () => {
    lines.textContent = "";
    plan.forEach((m, i) => lines.appendChild(stepOf(m, stateAt(i), true)));
    place(stateAt(plan.length));
  };
  const add = (m) => {
    const step = stepOf(m, stateAt(plan.length), false);
    plan.push(m);
    keep();
    lines.appendChild(step);
    void step.getBoundingClientRect(); // (so it draws in)
    step.classList.add("on");
    place(stateAt(plan.length));
    caption.textContent = `${plan.length}. ${say(m)}`;
    packSound("tab");
  };
  const coachReplay = () => {
    const run = ++replaying;
    const steps = [...lines.children];
    board.classList.add("resetting");
    steps.forEach((step) => step.classList.remove("on"));
    place(stateAt(0));
    void board.offsetWidth;
    board.classList.remove("resetting");
    caption.textContent = steps.length ? "" : HINT;
    steps.forEach((step, i) => setTimeout(() => {
      if (run !== replaying || !coach) return;
      step.classList.add("on");
      place(stateAt(i + 1));
      caption.textContent = `${i + 1}/${steps.length}  ${say(plan[i])}`;
    }, 400 + i * 1000));
  };
  // dragging on the court (a finger or the mouse), in the court's units
  const toCourt = (e) => {
    const m = svg.getScreenCTM();
    if (!m) return null;
    const p = svg.createSVGPoint();
    p.x = e.clientX;
    p.y = e.clientY;
    const q = p.matrixTransform(m.inverse());
    return [Math.max(-6, Math.min(306, q.x)), Math.max(-6, Math.min(196, q.y))];
  };
  // the one of `spots` (players or Xs) nearest a point, within `reach`
  const closest = (spots, pt, reach, skip = 0) => {
    let best = 0;
    let gap = reach;
    CREW.forEach((n) => {
      const d = Math.hypot(pt[0] - spots[n][0], pt[1] - spots[n][1]);
      if (n !== skip && d < gap) [best, gap] = [n, d];
    });
    return [best, gap];
  };
  const nearest = (pt, s, skip) => closest(s.at, pt, 18, skip)[0];
  const thin = (pts) => {
    const out = [pts[0]];
    pts.forEach((p, i) => {
      const q = out[out.length - 1];
      if (i && (i === pts.length - 1 || Math.hypot(p[0] - q[0], p[1] - q[1]) >= 6)) out.push(p);
    });
    return out.map(([x, y]) => [Math.round(x * 10) / 10, Math.round(y * 10) / 10]);
  };
  let coach = false;
  let drag = null;
  svg.addEventListener("pointerdown", (e) => {
    if (!coach || drag) return;
    const pt = toCourt(e);
    if (!pt) return;
    const s = stateAt(plan.length);
    const [n, gap] = closest(s.at, pt, 18);
    const [guard, guardGap] = defense ? closest(defense, pt, 14) : [0, 99];
    if (!n && !guard) return;
    e.preventDefault();
    try {
      svg.setPointerCapture(e.pointerId);
    } catch (err) {}
    // an X just moves where it's dragged (no line)
    if (guard && (!n || guardGap < gap)) {
      drag = { guard, id: e.pointerId };
      xs[guard].classList.add("dragging");
      return;
    }
    drag = { n, s, id: e.pointerId, pts: [s.at[n]], far: 0 };
    live.setAttribute("d", "");
    mine.appendChild(live);
  });
  svg.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const pt = toCourt(e);
    if (pt && drag.guard) {
      defense[drag.guard] = [Math.round(pt[0] * 10) / 10, Math.round(pt[1] * 10) / 10];
      xs[drag.guard].style.transform = `translate(${pt[0]}px, ${pt[1]}px)`;
      return;
    }
    const last = drag.pts[drag.pts.length - 1];
    if (!pt || Math.hypot(pt[0] - last[0], pt[1] - last[1]) < 3) return;
    drag.pts.push(pt);
    drag.far = Math.max(drag.far, Math.hypot(pt[0] - drag.pts[0][0], pt[1] - drag.pts[0][1]));
    live.setAttribute("d", smooth(drag.pts));
  });
  const drop = (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const { n, s, pts, far, guard } = drag;
    drag = null;
    if (guard) {
      xs[guard].classList.remove("dragging");
      keep();
      caption.textContent = `The ${guard}'s defender moves`;
      return;
    }
    live.remove();
    if (e.type === "pointercancel") return;
    const hasBall = s.ball === n;
    if (far < 8) {
      if (hasBall) add({ kind: "shot", n, three: three(s.at[n]) });
      else caption.textContent = HINT;
      return;
    }
    const end = pts[pts.length - 1];
    const mate = nearest(end, s, n);
    if (hasBall && mate) return add({ kind: "pass", n, to: mate });
    if (hasBall) {
      const drive = Math.hypot(end[0] - RIM[0], end[1] - RIM[1]) < 24;
      const path = thin(pts);
      return add({ kind: drive ? "drive" : "dribble", n, pts: path, end: path[path.length - 1] });
    }
    if (mate) {
      // a screen: stop beside the teammate, on the side the screener came from
      const [mx, my] = s.at[mate];
      const from = pts.slice(0, -1).reverse().find(([x, y]) => Math.hypot(x - mx, y - my) > 24) || pts[0];
      const len = Math.hypot(from[0] - mx, from[1] - my) || 1;
      const spot = [mx + ((from[0] - mx) / len) * 24, my + ((from[1] - my) / len) * 24];
      const path = thin([...pts.filter(([x, y]) => Math.hypot(x - mx, y - my) > 24), spot]);
      return add({ kind: "screen", n, to: mate, pts: path, end: path[path.length - 1] });
    }
    const path = thin(pts);
    add({ kind: "cut", n, pts: path, end: path[path.length - 1] });
  };
  svg.addEventListener("pointerup", drop);
  svg.addEventListener("pointercancel", drop);
  let before = "back-door";
  const enterCoach = () => {
    if (!board.classList.contains("big")) max.click(); // (drawn on the big board)
    const current = board.querySelector(".play-set.active");
    if (current && current !== mine) before = current.dataset.play;
    coach = true;
    replaying++;
    quiz = null;
    board.classList.remove("quiz", "slow", "resetting");
    board.classList.add("coach");
    board.dataset.replaying = "coach"; // (the words lighting up leave it alone)
    board.querySelectorAll(".play-set").forEach((p) => p.classList.toggle("active", p === mine));
    draw();
    caption.textContent = plan.length ? `Your play: ${plan.length} step${plan.length > 1 ? "s" : ""}. Keep drawing, or Replay it.` : HINT;
  };
  const leaveCoach = () => {
    if (!coach) return;
    coach = false;
    board.classList.remove("coach");
    delete board.dataset.replaying;
    select(before);
  };
  const drawTab = el("button", "play-tab play-draw mono", "Draw a play");
  drawTab.type = "button";
  drawTab.addEventListener("click", (e) => {
    e.stopPropagation();
    enterCoach();
  });
  const tools = [
    ["Undo", () => {
      if (!plan.length) return;
      plan.pop();
      keep();
      draw();
      caption.textContent = plan.length ? `${plan.length}. ${say(plan[plan.length - 1])}` : HINT;
    }],
    ["Clear", () => {
      plan = [];
      defense = null;
      keep();
      draw();
      showDefense();
      caption.textContent = HINT;
    }],
    ["Replay", () => coachReplay()],
    ["Defense", () => {
      if (defense) defense = null;
      else {
        // each X between its player and the rim, where it would guard them
        const s = stateAt(plan.length);
        defense = {};
        CREW.forEach((n) => {
          const [x, y] = s.at[n];
          const d = Math.hypot(RIM[0] - x, RIM[1] - y) || 1;
          defense[n] = [Math.round((x + ((RIM[0] - x) / d) * 20) * 10) / 10, Math.round((y + ((RIM[1] - y) / d) * 20) * 10) / 10];
        });
      }
      keep();
      place(stateAt(plan.length));
      showDefense();
      caption.textContent = defense ? "Defense on: drag an X to guard someone tighter, or switch." : HINT;
    }],
    ["Share", async () => {
      if (!plan.length) return (caption.textContent = "Draw a play first, then share it.");
      const url = `${location.origin}${location.pathname}#play=${packPlay()}`;
      if (window.goatcounter && window.goatcounter.count) {
        window.goatcounter.count({ path: "coach-play-share", title: "Shared a play", event: true });
      }
      if (navigator.share && !canHover) {
        try {
          await navigator.share({ title: "My play", text: "A play I drew on raywel's board:", url });
          return;
        } catch (e) {
          if (e && e.name === "AbortError") return;
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        caption.textContent = "Link copied: send it, and it opens with your play drawing itself.";
      } catch (e) {
        caption.textContent = url;
      }
    }],
    ["Save picture", async () => {
      if (!plan.length) return (caption.textContent = "Draw a play first, then save it.");
      const blob = await playPicture().catch(() => null);
      if (!blob) return (caption.textContent = "Couldn't make the picture.");
      const how = await givePicture(blob, "my-play.png", "A play I drew on raywel's board: https://matimbu.github.io/raywelfrancismartin/#court");
      if (how === "saved") caption.textContent = "Saved: my-play.png";
    }],
    ["Done", () => leaveCoach()]
  ].map(([name, act]) => {
    const tool = el("button", `play-tab coach-tool mono${name === "Done" ? " coach-done" : ""}`, name);
    tool.type = "button";
    tool.addEventListener("click", (e) => {
      e.stopPropagation();
      act();
    });
    return tool;
  });
  // (the Defense tool is lit while the Xs are up)
  const defenseTool = tools.find((tool) => tool.textContent === "Defense");
  const showDefense = () => {
    defenseTool.classList.toggle("on", Boolean(defense));
    defenseTool.setAttribute("aria-pressed", String(Boolean(defense)));
  };
  showDefense();
  // A play in a link (…/#play=…): each step as numbers (its kind, the
  // player, who it's to, a three or not, then the points it runs through),
  // and the Xs, as base64. What comes in is checked number by number.
  const KINDS = ["cut", "screen", "dribble", "drive", "pass", "shot"];
  const packPlay = () => {
    const p = plan.map((s) => [KINDS.indexOf(s.kind), s.n, s.to || 0, s.three ? 1 : 0, ...(s.pts || []).flat().map(Math.round)]);
    const d = defense ? CREW.map((n) => defense[n].map(Math.round)) : 0;
    return btoa(JSON.stringify({ p, d })).replace(/[+]/g, "-").replace(/[/]/g, "_").replace(/=+$/, "");
  };
  const unpackPlay = (code) => {
    try {
      const { p, d } = JSON.parse(atob(code.replace(/-/g, "+").replace(/_/g, "/")));
      const ok = (v, lo, hi) => typeof v === "number" && isFinite(v) && v >= lo && v <= hi;
      const steps = (Array.isArray(p) ? p : []).slice(0, 40).map((row) => {
        if (!Array.isArray(row)) return null;
        const [k, n, to, three, ...xy] = row;
        const kind = KINDS[k];
        if (!kind || !ok(n, 1, 5)) return null;
        const step = { kind, n };
        if (kind === "pass" || kind === "screen") {
          if (!ok(to, 1, 5) || to === n) return null;
          step.to = to;
        }
        if (kind === "shot") step.three = three === 1;
        if (kind === "pass" || kind === "shot") return step;
        const pts = [];
        for (let i = 0; i + 1 < xy.length && pts.length < 200; i += 2) {
          if (ok(xy[i], -6, 306) && ok(xy[i + 1], -6, 196)) pts.push([xy[i], xy[i + 1]]);
        }
        if (pts.length < 2) return null;
        step.pts = pts;
        step.end = pts[pts.length - 1];
        return step;
      });
      if (!steps.length || steps.some((s) => !s)) return null;
      let def = null;
      if (Array.isArray(d) && d.length === 5 && d.every((xy) => Array.isArray(xy) && ok(xy[0], -6, 306) && ok(xy[1], -6, 196))) {
        def = {};
        d.forEach((xy, i) => (def[i + 1] = [xy[0], xy[1]]));
      }
      return { steps, def };
    } catch (e) {
      return null;
    }
  };
  // a shared play: the board opens big in Coach mode and draws it, step by
  // step (it only becomes the one kept here if it's drawn on)
  board.openShared = (code) => {
    const got = unpackPlay(code);
    if (!got) return false;
    plan = got.steps;
    defense = got.def;
    enterCoach();
    showDefense();
    coachReplay();
    return true;
  };
  // The play as a picture, 1080 x 1080: the court with every step drawn in
  // full, the players where they end up (and the Xs), the steps listed
  // under it, and the site's address. Always in the dark theme's colours.
  const playPicture = async () => {
    const css = getComputedStyle(document.documentElement);
    const serif = css.getPropertyValue("--serif").trim() || "Georgia, serif";
    const mono = css.getPropertyValue("--mono").trim() || "monospace";
    await Promise.all([`italic 40px ${serif}`, `500 24px ${mono}`].map((spec) => document.fonts.load(spec).catch(() => {})));
    const C = { bg: "#0a0a0a", card: "#161615", fg: "#f2f0eb", muted: "#8f8c86", accent: "#ff5a1f" };
    const canvas = el("canvas");
    canvas.width = canvas.height = 1080;
    const g = canvas.getContext("2d");
    g.fillStyle = C.bg;
    g.fillRect(0, 0, 1080, 1080);
    g.textAlign = "left";
    g.fillStyle = C.accent;
    g.font = `500 24px ${mono}`;
    g.fillText("MY PLAY", 90, 92);
    g.fillStyle = C.fg;
    g.font = `italic 54px ${serif}`;
    g.fillText("Drawn on raywel's board", 90, 150);
    // the court, 900 wide, in its own units
    const k = 900 / 324;
    g.save();
    g.setTransform(k, 0, 0, k, 90 + 12 * k, 190 + 12 * k);
    g.lineCap = "round";
    g.lineJoin = "round";
    g.strokeStyle = "rgba(143, 140, 134, 0.5)";
    svg.querySelectorAll(".court path").forEach((path) => {
      g.lineWidth = path.classList.contains("board-glass") ? 2.4 : 1;
      g.setLineDash(path.classList.contains("dash") ? [3, 4] : []);
      g.stroke(new Path2D(path.getAttribute("d")));
    });
    g.setLineDash([]);
    g.beginPath();
    g.arc(RIM[0], RIM[1], 4.5, 0, Math.PI * 2);
    g.stroke();
    // every step's marks, drawn in full
    [...lines.children].forEach((step) => step.querySelectorAll("path, circle, text").forEach((node) => {
      const cls = node.getAttribute("class") || "";
      if (node.tagName === "text") {
        g.fillStyle = cls.includes("and-one") ? C.accent : C.muted;
        g.font = `italic ${cls.includes("and-one") ? 19 : 14}px ${serif}`;
        g.fillText(node.textContent, Number(node.getAttribute("x")), Number(node.getAttribute("y")));
        return;
      }
      g.setLineDash([]);
      if (node.tagName === "circle") {
        g.strokeStyle = C.accent;
        g.lineWidth = 2.2;
        g.beginPath();
        g.arc(Number(node.getAttribute("cx")), Number(node.getAttribute("cy")), Number(node.getAttribute("r")), 0, Math.PI * 2);
        g.stroke();
        return;
      }
      const pass = cls.includes("pass");
      g.strokeStyle = pass ? C.fg : C.accent;
      g.lineWidth = pass ? 1.5 : 2;
      g.setLineDash(pass && !cls.includes("pass-head") ? [4, 4] : []);
      g.stroke(new Path2D(node.getAttribute("d")));
    }));
    g.setLineDash([]);
    const s = stateAt(plan.length);
    if (defense) {
      CREW.forEach((n) => {
        const [x, y] = defense[n];
        g.strokeStyle = C.muted;
        g.lineWidth = 1.8;
        g.stroke(new Path2D(`M${x - 6} ${y - 6} L${x + 6} ${y + 6} M${x + 6} ${y - 6} L${x - 6} ${y + 6}`));
        g.fillStyle = C.muted;
        g.font = `9px ${mono}`;
        g.textAlign = "left";
        g.fillText(String(n), x + 7, y + 13);
      });
    }
    CREW.forEach((n) => {
      const [x, y] = s.at[n];
      g.beginPath();
      g.arc(x, y, 10, 0, Math.PI * 2);
      g.fillStyle = C.card;
      g.fill();
      g.strokeStyle = n === 4 ? C.fg : C.muted;
      g.lineWidth = n === 4 ? 1.8 : 1.4;
      g.stroke();
      g.fillStyle = n === 4 ? C.fg : C.muted;
      g.font = `12px ${mono}`;
      g.textAlign = "center";
      g.fillText(String(n), x, y + 4.5);
    });
    if (s.ball) {
      const [x, y] = s.at[s.ball];
      g.beginPath();
      g.arc(x + 8, y - 8, 3.4, 0, Math.PI * 2);
      g.fillStyle = C.accent;
      g.fill();
    }
    g.restore();
    // the steps, two columns under the court, then the address
    const rows = plan.map((step, i) => `${i + 1}. ${say(step)}`);
    const shown = rows.length > 8 ? [...rows.slice(0, 7), `…and ${rows.length - 7} more`] : rows;
    g.textAlign = "left";
    g.fillStyle = C.fg;
    g.font = `italic 28px ${serif}`;
    const sans = css.getPropertyValue("--sans").trim() || "sans-serif";
    shown.forEach((row, i) => {
      let text = row;
      while (g.measureText(text).width > 440 && text.length > 4) text = `${text.slice(0, -2)}…`;
      // (the serif italic draws "1" like "l", so the numbers are in the sans)
      let x = 90 + (i < 4 ? 0 : 460);
      text.split(/(\d+)/).filter(Boolean).forEach((part) => {
        g.font = /^\d/.test(part) ? `500 25px ${sans}` : `italic 28px ${serif}`;
        g.fillText(part, x, 850 + (i % 4) * 42);
        x += g.measureText(part).width;
      });
      g.font = `italic 28px ${serif}`;
    });
    g.fillStyle = C.muted;
    g.font = `20px ${mono}`;
    g.fillText("matimbu.github.io/raywelfrancismartin", 90, 1040);
    return new Promise((done) => canvas.toBlob(done, "image/png"));
  };
  tabs.append(slow, guess, drawTab, ...tools, max);
  board.append(caption, tabs);
  // (a word on the wall calls up its play; the one already up stays put)
  board.pick = (key) => {
    if (quiz || coach) return; // (no giving the answer away, or wiping my play)
    const current = board.querySelector(".play-set.active");
    if (!current || current.dataset.play !== key) select(key);
  };
  return board;
}

// Word walls (nicknames and the like): big words with small notes
(SITE.walls || []).forEach((wall) => {
  if (!wall.words || !wall.words.length) return;
  const block = el("div", "wordwall");
  if (wall.id) block.id = wall.id;
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
  // one word (or photo card) into `words`; also used for a wall's `player`
  const addWord = (w, i, words, cards) => {
    if (w.hidden) return; // (kept in content.js, off the page for now)
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
      if (w.card || w.cards) {
        // `card` (or a stack of `cards`): the photo turns over into the
        // player's 2K card
        const flip = el("span", "flip");
        const front = el("span", "flip-face");
        front.appendChild(img);
        flip.append(front, twoKSide(w));
        frame.appendChild(flip);
        item.classList.add("flips");
      } else {
        frame.appendChild(img);
      }
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
    if (w.cards && w.cards.length > 1) {
      // co-starters: each name under the card picks which card is in front
      const text = el("span", "ww-text");
      w.cards.forEach((c, k) => {
        if (k) text.appendChild(document.createTextNode(" / "));
        const name = el("span", `ww-choose${k ? "" : " chosen"}`, c.short || c.name);
        name.dataset.k = k;
        text.appendChild(name);
      });
      item.appendChild(text);
    } else {
      item.appendChild(el("span", "ww-text", w.text));
    }
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
      onHover(item, (e) => ability(block, item, e));
    } else if (ability) {
      // phones: a tap plays the ability instead of opening the clip, so a
      // tap never whisks you off the page. Tapping the word again while its
      // ability plays opens the clip as usual.
      item.addEventListener("click", (e) => {
        if (w.link && item.classList.contains("casting")) return;
        e.preventDefault();
        ability(block, item, e);
      });
    }
    if (ability && w.key) keyAbilities[w.key.toLowerCase()] = { block, item, ability };
    // 2K cards: computers turn the card over when the mouse comes onto it
    // (a real move, not the card sliding under a still cursor as you scroll)
    // and back when it leaves. Phones turn it on the first tap (one at a
    // time), and a tap on the turned card opens its link.
    // Not while the pack is still being opened. The tab in the 2K side's
    // corner switches it between the badges and the attributes (and never
    // follows the link).
    const has2K = Boolean(w.card || w.cards);
    const layers = has2K && item.querySelector(".tk-layer");
    const firstLayer = cardSides(item, layers);
    if (has2K && canHover) {
      onHover(item, () => {
        if (!words.classList.contains("packed")) item.classList.add("flipped");
      });
      item.addEventListener("mouseleave", () => {
        item.classList.remove("flipped", "tilting");
        firstLayer();
      });
      // Holo: once it has turned, the card leans toward the cursor and the
      // shine on it follows, like tilting a card in 2K26's card view
      if (!reduceMotion) {
        item.addEventListener("transitionend", (e) => {
          if (e.propertyName === "transform" && e.target.classList.contains("flip") && item.classList.contains("flipped")) {
            item.classList.add("tilting");
          }
        });
        item.addEventListener("mousemove", (e) => {
          if (!item.classList.contains("flipped")) return;
          // hold still over the tab, so it doesn't move away from the cursor
          if (e.target.closest(".tk-layer, .tk-switch, .tk-allbadges")) return;
          const r = item.querySelector(".ww-card-img").getBoundingClientRect();
          const x = clamp01((e.clientX - r.left) / r.width) - 0.5;
          const y = clamp01((e.clientY - r.top) / r.height) - 0.5;
          item.style.setProperty("--tilt-x", `${(y * 16).toFixed(2)}deg`);
          item.style.setProperty("--tilt-y", `${(x * 18).toFixed(2)}deg`);
          item.style.setProperty("--mx", `${((x + 0.5) * 100).toFixed(1)}%`);
          item.style.setProperty("--my", `${((y + 0.5) * 100).toFixed(1)}%`);
        });
      }
    } else if (has2K) {
      item.addEventListener("click", (e) => {
        const turned = item.classList.contains("flipped");
        if (words.classList.contains("packed")) return e.preventDefault();
        if (turned && w.link) return;
        e.preventDefault();
        words.querySelectorAll(".flipped").forEach((c) => c.classList.remove("flipped", "layer-stats", "layer-all", "layer-moves", "tilting"));
        item.classList.toggle("flipped", !turned);
        firstLayer();
        if (!turned) phoneTilt(); // the turned card leans as the phone tilts
      });
    }
    // A stack: the switch on the card (or hovering or tapping a name under
    // it) shuffles the other card to the front: the one in front slides out
    // and tucks in behind as the other comes forward
    if (w.cards && w.cards.length > 1) {
      const side = item.querySelector(".tk-side");
      const toggle = side.querySelector(".tk-switch");
      let shuffling = 0;
      const choose = (k) => {
        const swap = k === 1;
        item.querySelectorAll(".ww-choose").forEach((n) => n.classList.toggle("chosen", Number(n.dataset.k) === k));
        if (side.classList.contains("swap") === swap) return;
        side.classList.toggle("swap", swap);
        side.dataset.tier = tierKey(w.cards[k].tier);
        toggle.lastChild.textContent = w.cards[1 - k].short || "";
        if (!reduceMotion) {
          side.classList.remove("shuffle");
          void side.offsetWidth; // (so a quick second switch replays it)
          side.classList.add("shuffle");
          clearTimeout(shuffling);
          shuffling = setTimeout(() => side.classList.remove("shuffle"), 600);
        }
        packSound("tab");
      };
      toggle.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (words.classList.contains("packed")) return;
        choose(side.classList.contains("swap") ? 0 : 1);
      });
      item.querySelectorAll(".ww-choose").forEach((name) => {
        const k = Number(name.dataset.k);
        if (canHover) onHover(name, () => !words.classList.contains("packed") && choose(k));
        name.addEventListener("click", (e) => {
          if (words.classList.contains("packed")) return;
          e.preventDefault();
          e.stopPropagation();
          choose(k);
          if (!canHover && !item.classList.contains("flipped")) {
            words.querySelectorAll(".flipped").forEach((c) => c.classList.remove("flipped", "layer-stats"));
            item.classList.add("flipped");
          }
        });
      });
    }
    if (w.play) item.dataset.play = w.play; // (its play on the wall's board)
    if (w.desc) item.dataset.desc = w.desc;
    if (w.stat) item.dataset.stat = w.stat;
    if (w.icon) item.dataset.icon = w.icon;
    if (w.key) item.dataset.key = w.key;
    // Reuse the crafts preview card: the photo follows the cursor
    if (w.image && canHover && !cards) {
      onHover(item, () => showPreview({ image: w.image, emoji: "" }));
      item.addEventListener("mouseleave", hidePreview);
    }
    // every 2K card: a Full view button under it, to read it big
    // (the Full view goes on through the wall's other cards)
    if (has2K && cards) item.appendChild(fullViewButton(w, wall.words.includes(w) ? wall.words.filter((x) => x.card || x.cards) : [w]));
    words.appendChild(item);
  };
  wall.words.forEach((w, i) => addWord(w, i, words, cards));
  // `player`: my own card under the wall's intro (On the court: my player),
  // a card of its own that turns over like the starting five's
  if (wall.player) {
    const mine = el("div", "wordwall-words ww-player named");
    addWord(wall.player, 0, mine, true);
    head.appendChild(mine);
  }
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

  // `board`: the words drawn as a play on a coach's board, a step for each
  // word as it lights up (all of it at once without lightUp)
  if (wall.board) {
    const board = playBoard();
    block.classList.add("has-art", "has-board");
    block.appendChild(board);
    words.board = board;
    if (!block.classList.contains("lighting")) board.querySelectorAll(".play-step").forEach((step) => step.classList.add("on"));
    // a word with a `play` calls it up on the board: hover on computers, tap
    // on phones
    words.querySelectorAll("[data-play]").forEach((item) => {
      if (canHover) onHover(item, () => board.pick(item.dataset.play));
      item.addEventListener("click", () => board.pick(item.dataset.play));
    });
  }

  // 2K cards come in face down, like opening a MyTEAM pack in 2K26: each MT
  // card glows in its tier's colour, and the first time the five are on
  // screen they turn over one by one. Tapping one turns it straight away
  // (the game's Flip Card). Once they're all over, the 2K side shows on hover.
  const packCards = [...words.querySelectorAll(".ww-card.flips")];
  if (packCards.length && !reduceMotion) {
    // into the pack: every card face down (they turn back over if they were up)
    const pack = () => {
      words.classList.remove("opened");
      words.classList.add("packed");
      packCards.forEach((c) => {
        c.classList.remove("flipped", "tilting", "layer-stats", "clued", "called");
        c.classList.add("face-down");
        c.querySelectorAll(".tk-layer").forEach((tab) => (tab.textContent = "Attributes"));
      });
    };
    pack();
    const turn = (c) => {
      if (!c.classList.contains("face-down")) return;
      c.classList.remove("face-down", "clued", "called");
      packSound("flip");
      packSound("reveal", { tier: c.querySelector(".tk-side").dataset.tier, delay: 0.34 });
      if (!words.querySelector(".face-down")) setTimeout(() => words.classList.replace("packed", "opened"), 800);
    };
    // Each card's walkout: its clues come up on the MT side, a beat apart,
    // then it turns over
    const walkout = (c) => {
      if (!c.classList.contains("face-down")) return;
      c.classList.add("clued");
      c.querySelectorAll(".tk-clue, .tk-ring").forEach((clue, i) => packSound("clue", { i, delay: i * 0.14 }));
      // the name slams in on the last clue, then the card turns
      setTimeout(() => {
        if (!c.classList.contains("face-down")) return;
        c.classList.add("called");
        packSound("name");
      }, 640);
      setTimeout(() => turn(c), 1300);
    };
    packCards.forEach((c) => c.addEventListener("click", (e) => {
      if (!c.classList.contains("face-down")) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      turn(c);
    }, true));
    let dealing = [];
    const open = () => {
      dealing.forEach(clearTimeout);
      packSound("deal");
      dealing = packCards.map((c, k) => setTimeout(() => walkout(c), 800 + k * 1150));
    };
    const deal = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      deal.disconnect();
      open();
    }, { threshold: 0.5 });
    deal.observe(words);
    // Open it again: the five turn back face down and the pack plays again
    const again = el("button", "pack-again mono");
    again.type = "button";
    again.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.2 8.6A5.3 5.3 0 1 1 11.6 4.4"/><path d="M12.4 1.6v3.3H9.1"/></svg><span>Open the pack again</span>';
    again.addEventListener("click", () => {
      if (words.classList.contains("packed")) return;
      pack();
      dealing = [setTimeout(open, 750)];
    });
    words.after(again);
  }

  // A wall of cards warms up before it's on screen: its pictures (the photos
  // and the cut-out players on the backs) load and decode ahead, and the
  // pack's sounds get their room ready if sound is already on, so nothing
  // stalls the scroll the moment it arrives
  if (cards || wall.player) {
    const warm = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      warm.disconnect();
      block.querySelectorAll("img").forEach((img) => {
        img.loading = "eager";
        if (img.decode) img.decode().catch(() => {});
      });
      if (audioCtx) {
        noiseBuffer(audioCtx);
        packSound("warm");
      }
    }, { rootMargin: "1400px 0px" });
    warm.observe(block);
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
    line.appendChild(document.createTextNode(wall.creditLead || "Photos via Wikimedia Commons, cropped: "));
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
      thumb.src = `assets/gallery/${s.photo}-400.webp`;
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

// A craft with `game: true` (Malolos Rush) opens a tiny playable teaser:
// rush.js, loaded the first time someone presses Play (bump its ?v= here
// when it changes)
const RUSH_JS = "rush.js?v=20260926-1";
function playRush() {
  if (window.openRush) return window.openRush();
  const script = el("script");
  script.src = RUSH_JS;
  script.onload = () => window.openRush && window.openRush();
  document.head.appendChild(script);
}
// A shared run's link (…/#malolos-rush) opens the game once the page is in,
// over the Crafts section, so a friend can go straight for the score
function openShared() {
  if (!document.body.classList.contains("ready")) return setTimeout(openShared, 250);
  const crafts = $("crafts");
  if (lenis) lenis.scrollTo(crafts, { immediate: true });
  else {
    // (straight there, not the page's smooth scroll)
    document.documentElement.style.scrollBehavior = "auto";
    crafts.scrollIntoView();
    document.documentElement.style.scrollBehavior = "";
  }
  playRush();
}
if (location.hash === "#malolos-rush") openShared();
// A shared play's link (…/#play=…) opens On the court's board, big, with
// the play drawing itself
function openPlay() {
  const board = document.querySelector(".play-board:not(.play-spot)");
  if (!board || !board.openShared) return;
  if (!document.body.classList.contains("ready")) return setTimeout(openPlay, 250);
  const wall = board.closest(".wordwall") || board;
  if (lenis) lenis.scrollTo(wall, { immediate: true });
  else {
    document.documentElement.style.scrollBehavior = "auto";
    wall.scrollIntoView();
    document.documentElement.style.scrollBehavior = "";
  }
  board.openShared(location.hash.slice(6));
}
if (location.hash.startsWith("#play=")) openPlay();
// (and a link to it on the page, like the New pill's)
addEventListener("hashchange", () => {
  if (location.hash === "#malolos-rush") openShared();
  else if (location.hash.startsWith("#play=")) openPlay();
});

SITE.crafts.forEach((craft, i) => {
  const li = el("li", "craft reveal");
  li.style.setProperty("--d", i);
  if (isTodo(craft.title, craft.year)) li.classList.add("todo");

  const row = el(craft.link ? "a" : craft.game ? "button" : "div", "craft-row");
  linkify(row, craft.link);
  if (craft.game) {
    row.type = "button";
    row.classList.add("craft-game");
    row.setAttribute("aria-label", `Play ${craft.title}, a mini game`);
    row.addEventListener("click", playRush);
  }
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
    craft.game ? el("span", "craft-arrow craft-play mono", "Play") : el("span", "craft-arrow", craft.link ? "↗" : "")
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
  if (h.link) {
    const go = el("a", "hobby-link mono", `${h.linkText || "More"} ↗`);
    go.href = h.link; // same site, same tab (Airball has its own way back)
    card.appendChild(go);
  }
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
    // a record that turns while the song plays (see vinylDeck)
    const deck = vinylDeck(pick[1]);
    pickLabel.classList.add("pick-label");
    pickLabel.append(deck.node, kicker);
    const slot = el("div", "pick-slot");
    block.append(pickLabel, slot);
    // While it plays, the bars dance and the label turns into "Now playing"
    mountPick(slot, pick[1], (playing) => {
      eq.classList.toggle("playing", playing);
      deck.play(playing);
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
        // Spotify never says "paused" when the song (or its preview) runs out:
        // the last update just has the position at the end, and then nothing
        // more. So the pick counts as playing only while it isn't paused or
        // buffering, isn't at the end, and its updates (about one a second)
        // keep coming.
        let playing = false;
        let quiet = 0;
        const set = (on) => {
          if (on !== playing) onPlaying((playing = on));
        };
        player.addListener("playback_update", (e) => {
          const { isPaused, isBuffering, position, duration } = e.data;
          const ended = duration > 0 && position >= duration - 250;
          set(!isPaused && !isBuffering && !ended);
          clearTimeout(quiet);
          if (playing) quiet = setTimeout(() => set(false), 2600);
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

// The current pick's record: the song's cover is its label (Spotify's
// oEmbed, which any page can read, gives the cover), and it turns at 33 1/3
// like a real one only while the song plays: it comes up to speed in 0.7 s
// when the song starts and coasts to a stop over 1.4 s when it's paused,
// staying where it stopped. The tone arm swings on and off, and the light on
// the record stays put while it turns.
function vinylDeck(id) {
  const deck = el("span", "deck");
  deck.setAttribute("aria-hidden", "true");
  const record = el("span", "record");
  const label = el("span", "record-label");
  record.appendChild(label);
  deck.append(record, el("span", "record-shine"), el("span", "tonearm"));
  // the cover loads once the music section is near, like the player
  new IntersectionObserver(([entry], watch) => {
    if (!entry.isIntersecting) return;
    watch.disconnect();
    fetch(`https://open.spotify.com/oembed?url=https://open.spotify.com/track/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d || !d.thumbnail_url) return;
        const cover = el("img");
        cover.alt = "";
        cover.decoding = "async";
        // Spotify's image server lets pages read its covers, so the record
        // can take on the cover's main colour (its glow, the shine, the bars)
        cover.crossOrigin = "anonymous";
        cover.onload = () => {
          label.classList.add("has-cover");
          const tint = coverTint(cover);
          if (tint) (deck.closest(".pick-label") || deck).style.setProperty("--tint", tint);
        };
        cover.src = d.thumbnail_url;
        label.appendChild(cover);
      })
      .catch(() => {});
  }, { rootMargin: "800px 0px" }).observe(deck);
  if (reduceMotion) return { node: deck, play: (on) => deck.classList.toggle("playing", on) };
  const spin = record.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], {
    duration: 1800, // 33 1/3 turns a minute
    iterations: Infinity
  });
  spin.pause();
  let rate = 0;
  let run = 0;
  const play = (on) => {
    deck.classList.toggle("playing", on);
    const from = rate;
    const time = on ? 700 : 1400;
    const start = performance.now();
    const mine = ++run;
    if (on) {
      spin.playbackRate = Math.max(from, 0.001);
      spin.play();
    }
    const frame = (now) => {
      if (mine !== run) return;
      const p = Math.min(1, (now - start) / time);
      rate = from + ((on ? 1 : 0) - from) * (1 - (1 - p) ** 3);
      if (p < 1 || on) spin.playbackRate = Math.max(rate, 0.001);
      if (p < 1) requestAnimationFrame(frame);
      else if (!on) spin.pause();
    };
    requestAnimationFrame(frame);
  };
  return { node: deck, play };
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
    later(() => {
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
  img.src = v.cover || `assets/tiktok/${v.id}.webp`;
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
    img.src = v.cover.replace(/\.(jpg|webp)$/, "-480.$1");
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
const shotSrc = (p, width) => p.cover || `assets/gallery/${p.file}-${width}.webp`;

gallery.forEach((p, i) => {
  const tile = el("button", ["shot", p.wide && "wide", p.fit === "contain" && "contain", "shot-reveal"].filter(Boolean).join(" "));
  tile.type = "button";
  tile.style.setProperty("--d", i % 3);
  tile.setAttribute("aria-label", p.video ? `Play the clip: ${p.caption}` : `View photo: ${p.caption}`);
  const img = el("img");
  img.loading = "lazy";
  img.decoding = "async";
  // phones also get a lighter 600 px copy (plenty for the two-column grid,
  // a third of the weight); computers keep choosing between 400 and 800
  const picture = el("picture");
  if (!p.cover) {
    const phone = el("source");
    phone.media = "(max-width: 760px)";
    phone.srcset = `${shotSrc(p, 400)} 400w, ${shotSrc(p, 600)} 600w, ${shotSrc(p, 800)} 800w`;
    phone.sizes = p.wide ? "100vw" : "50vw";
    picture.appendChild(phone);
  }
  picture.appendChild(img);
  if (!p.cover) {
    img.srcset = `${shotSrc(p, 400)} 400w, ${shotSrc(p, 800)} 800w`;
    img.sizes = p.wide ? "(max-width: 760px) 100vw, 800px" : "(max-width: 760px) 50vw, 400px";
  }
  img.src = shotSrc(p, 800);
  img.alt = p.alt || p.caption;
  // A soft shimmer sweeps across the tile until the photo arrives
  if (!img.complete) {
    tile.classList.add("loading");
    const loaded = () => tile.classList.remove("loading");
    img.addEventListener("load", loaded, { once: true });
    img.addEventListener("error", loaded, { once: true });
  }
  const caption = el("span", "shot-caption mono", p.caption);
  tile.append(picture, caption);
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
function setCounter(n, instant = false) {
  lbCount.classList.toggle("instant", instant); // keyboard: the digits just change
  const digits = pad2(n);
  counterStrips.forEach((strip, d) => { strip.style.transform = `translateY(${-digits[d]}em)`; });
  lbCount.setAttribute("aria-label", `Photo ${n} of ${gallery.length}`);
}

// Phones open a photo at 800 px (sharp at a phone's width, a quarter of the
// 1600 px copy's weight); computers swap in the 1600 px one
const bigShot = () => (matchMedia("(max-width: 760px)").matches ? 800 : 1600);

// dir: 1 = next, -1 = previous, 0 = just opened
function showShot(i, dir = 0, instant = false) {
  lbIndex = (i + gallery.length) % gallery.length;
  const p = gallery[lbIndex];
  stopShotVideo();
  lbPlay.hidden = !p.video;
  // Show the grid-size copy right away, then swap in the large one
  lbImg.src = shotSrc(p, 800);
  lbImg.alt = p.alt || p.caption;
  if (bigShot() > 800) {
    const large = new Image();
    const wanted = lbIndex;
    large.onload = () => { if (wanted === lbIndex) lbImg.src = large.src; };
    large.src = shotSrc(p, 1600);
  }
  setCounter(lbIndex + 1, instant);
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
  revealShot(dir, instant);
  // Warm up the neighbours so arrowing through feels instant
  [lbIndex - 1, lbIndex + 1].forEach((j) => {
    const next = gallery[(j + gallery.length) % gallery.length];
    if (!next.video) new Image().src = shotSrc(next, bigShot());
  });
}

// The photo opens like a curtain from the side you're heading towards,
// the same reveal the gallery tiles use. Its story line follows (see .tell).
function revealShot(dir, instant = false) {
  const story = $("lbStory");
  story.classList.remove("tell");
  story.classList.toggle("instant", instant); // keyboard: the story line is simply there
  const play = () => {
    story.classList.add("tell");
    lbImg.getAnimations().forEach((a) => a.cancel());
    // arrow keys flip photos instantly: keyboard actions don't animate
    if (reduceMotion || instant || !lbImg.animate) return;
    lbImg.animate([
      {
        opacity: 0,
        transform: `translate(${dir * 56}px, ${dir ? 0 : 34}px) scale(1.03)`,
        clipPath: dir > 0 ? "inset(0 0 0 24%)" : dir < 0 ? "inset(0 24% 0 0)" : "inset(24% 0 0 0)"
      },
      { opacity: 1, transform: "none", clipPath: "inset(0 0 0 0)" }
    ], { duration: 400, easing: EASE_OUT });
  };
  if (lbImg.complete) play();
  else lbImg.addEventListener("load", play, { once: true });
}

function openShot(i) {
  showShot(i);
  lightbox.showModal();
  holdPage(true);
}

// Closing fades the viewer out in 0.18 s, quicker than the 0.45 s it takes
// to come in: exits are faster than entrances
function closeViewer() {
  if (!lightbox.open || lightbox.classList.contains("closing")) return;
  if (reduceMotion) return lightbox.close();
  lightbox.classList.add("closing");
  setTimeout(() => {
    lightbox.classList.remove("closing");
    lightbox.close();
  }, 180);
}
lightbox.addEventListener("cancel", (e) => {
  // Escape: the same fade
  e.preventDefault();
  closeViewer();
});

lightbox.addEventListener("close", () => {
  stopShotVideo();
  holdPage(false);
});
$("lbClose").addEventListener("click", closeViewer);
$("lbPrev").addEventListener("click", () => showShot(lbIndex - 1, -1));
$("lbNext").addEventListener("click", () => showShot(lbIndex + 1, 1));
lightbox.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") showShot(lbIndex - 1, -1, true);
  if (e.key === "ArrowRight") showShot(lbIndex + 1, 1, true);
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
  if (!swiped && (e.target === lightbox || e.target.classList.contains("lb-figure"))) closeViewer();
});

// ============================================================
//  Contact links (entries without a URL copy their value; `copy: true`
//  copies it too, and keeps a small link to open it)
// ============================================================
SITE.links.forEach((l, i) => {
  if (l.copy && l.url) {
    // the whole row copies (a Discord name, to add me); ↗ opens the profile
    const row = el("div", "link link-copy reveal");
    row.style.setProperty("--d", i);
    const hit = el("button", "link-hit");
    hit.type = "button";
    hit.setAttribute("aria-label", `Copy my ${l.label} name, ${l.value}`);
    hit.dataset.goatcounterClick = `copy-${l.label.toLowerCase()}`;
    hit.dataset.goatcounterTitle = `Copied: ${l.label}`;
    const hint = el("span", "link-arrow mono", "Copy");
    const open = el("a", "link-open icon", "↗");
    linkify(open, l.url);
    open.setAttribute("aria-label", `Open my ${l.label} profile`);
    open.dataset.goatcounterClick = `contact-${l.label.toLowerCase()}`;
    open.dataset.goatcounterTitle = `Contact: ${l.label}`;
    const tail = el("span", "link-tail");
    tail.append(hint, open);
    row.append(hit, el("span", "link-label mono", l.label), el("span", "link-value", l.value), tail);
    hit.addEventListener("click", () => copyText(l.value).then((ok) => flashCopied(hint, ok)));
    $("linkList").appendChild(row);
    return;
  }
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
    row.setAttribute("aria-label", `Copy my ${l.label} ID, ${l.value}`);
    row.dataset.goatcounterClick = `copy-${l.label.toLowerCase()}`;
    row.dataset.goatcounterTitle = `Copied: ${l.label}`;
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
  later(() => navSections.forEach((n, i) => {
    n.a.classList.toggle("active", i === k);
    n.a.style.setProperty("--read", i === k ? read.toFixed(3) : "0");
  }));
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
  // as the footer slides into view, its motto lights up word by word
  const f = !reduceMotion && mottoWords.length ? footer.getBoundingClientRect() : null;
  later(() => {
    meterFill.style.strokeDashoffset = (METER_LEN * (1 - p)).toFixed(2);
    if (f) {
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
  });
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
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
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

// The pack's sounds, made in the browser (no files) and aimed at the feel of
// a MyTEAM pack in 2K26: big and cinematic, no beeps. Everything plays in one
// shared room (a reverb made from decaying noise) and through a gentle
// compressor. A swell while the face-down cards glow; each walkout clue is a
// trailer hit (a sub drop, a knock, a rush of air), each a little bigger; a
// card turning is a whoosh, a snap and a thud; and what's revealed lands with
// a boom and a brass "braam" chord that grows with the tier (bright for the
// G.O.A.T., dark and low for Dark Matter, airy for Galaxy Opal and Pink
// Diamond, and for Invincible an electric crackle on top; the G.O.A.T. and
// Invincible pulls bring the crowd up). Off with the sound switch.
// One buffer of white noise per audio context, made once and shared by every
// hiss and whoosh (making fresh noise for each sound stalled the page when
// the pack opened mid-scroll). Three seconds covers the longest.
function noiseBuffer(ctx) {
  if (!ctx.noiseBuf) {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    ctx.noiseBuf = buf;
  }
  return ctx.noiseBuf;
}

function packSound(kind, opts = {}) {
  const ctx = audio();
  if (!ctx) return;
  const t = ctx.currentTime + (opts.delay || 0);
  if (!ctx.packRoom) {
    const len = Math.floor(ctx.sampleRate * 2.4);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    const room = ctx.createConvolver();
    room.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.3;
    const glue = ctx.createDynamicsCompressor();
    glue.threshold.value = -18;
    glue.ratio.value = 4;
    glue.attack.value = 0.004;
    glue.release.value = 0.3;
    room.connect(wet).connect(glue);
    glue.connect(ctx.destination);
    ctx.packRoom = { room, glue };
  }
  const { room, glue } = ctx.packRoom;
  const out = ctx.createGain();
  out.gain.value = 0.42;
  out.connect(glue);
  out.connect(room);
  const env = (at, peak, attack, release) => {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + attack + release);
    g.connect(out);
    return g;
  };
  const tone = (type, from, to, at, peak, attack, release) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(from, at);
    if (to !== from) o.frequency.exponentialRampToValueAtTime(to, at + attack + release);
    o.connect(env(at, peak, attack, release));
    o.start(at);
    o.stop(at + attack + release + 0.05);
  };
  const hiss = () => {
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(ctx);
    return src;
  };
  // noise through a filter that sweeps from one frequency to another
  const noise = (at, dur, from, to, peak, type = "bandpass", q = 1, attack = 0.02) => {
    const src = hiss(dur);
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(from, at);
    f.frequency.exponentialRampToValueAtTime(to, at + dur);
    src.connect(f).connect(env(at, peak, attack, Math.max(0.02, dur - attack)));
    src.start(at);
    src.stop(at + dur + 0.05);
  };
  // the "braam": a detuned brass-like chord whose filter opens, then closes
  const braam = (notes, at, peak, open, release) => {
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 2;
    lp.frequency.setValueAtTime(160, at);
    lp.frequency.exponentialRampToValueAtTime(open, at + 0.2);
    lp.frequency.exponentialRampToValueAtTime(220, at + release);
    lp.connect(env(at, peak, 0.05, release));
    notes.forEach((hz) => [-12, 0, 12].forEach((cents) => {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = hz;
      o.detune.value = cents;
      o.connect(lp);
      o.start(at);
      o.stop(at + release + 0.1);
    }));
  };
  if (kind === "deal") {
    // a swell rising into the first walkout
    noise(t, 1.3, 250, 3200, 0.2, "highpass", 0.7, 1.2);
    tone("sine", 42, 60, t, 0.35, 1.0, 0.5);
  } else if (kind === "clue") {
    const more = 0.75 + 0.15 * Math.min(opts.i || 0, 2);
    tone("sine", 96, 36, t, 0.8 * more, 0.004, 0.5);
    noise(t, 0.08, 1100, 500, 0.5 * more, "lowpass", 0.8, 0.003);
    noise(t, 0.16, 1500, 450, 0.18 * more, "bandpass", 1, 0.02);
  } else if (kind === "name") {
    // the name slams in: the biggest hit of the walkout, with a short brass stab
    tone("sine", 110, 30, t, 0.95, 0.004, 0.9);
    noise(t, 0.14, 1800, 300, 0.55, "lowpass", 0.8, 0.002);
    braam([55, 82.4, 110], t, 0.08, 1300, 0.8);
  } else if (kind === "tab") {
    noise(t, 0.035, 3200, 2600, 0.35, "bandpass", 1.2, 0.002);
    tone("sine", 170, 90, t, 0.35, 0.003, 0.07);
  } else if (kind === "flip") {
    noise(t, 0.3, 2400, 650, 0.55, "bandpass", 0.9, 0.18);
    noise(t + 0.28, 0.035, 3800, 5200, 0.45, "bandpass", 0.6, 0.003);
    tone("sine", 120, 55, t + 0.28, 0.45, 0.004, 0.2);
  } else if (kind === "reveal") {
    const tier = opts.tier;
    const big = tier === "goat" || tier === "invincible" || tier === "dark-matter";
    // the impact
    tone("sine", 74, 32, t, big ? 0.95 : 0.7, 0.006, big ? 1.4 : 1);
    noise(t, 0.35, 700, 90, big ? 0.35 : 0.25, "lowpass", 0.7, 0.004);
    // the braam, by tier
    if (tier === "goat") braam([55, 82.4, 110, 138.6], t + 0.02, 0.14, 1900, 2);
    else if (tier === "invincible") braam([55, 82.4, 110, 164.8], t + 0.02, 0.14, 1700, 2);
    else if (tier === "dark-matter") braam([55, 82.4, 110, 130.8], t + 0.02, 0.15, 950, 2.1);
    else if (tier === "galaxy-opal") braam([73.4, 110, 146.8, 185], t + 0.02, 0.1, 1600, 1.7);
    else braam([82.4, 123.5, 164.8, 207.7], t + 0.02, 0.09, 1800, 1.6);
    // air on top: a shimmer of noise, no notes
    if (tier !== "dark-matter") noise(t + 0.05, 1.4, 6000, 9000, big ? 0.07 : 0.1, "highpass", 0.7, 0.35);
    // Invincible crackles with electricity
    if (tier === "invincible") {
      for (let k = 0; k < 8; k++) noise(t + 0.05 + k * 0.07 + Math.random() * 0.03, 0.04, 2600, 4200, 0.16, "bandpass", 2, 0.003);
    }
    // the biggest pulls bring the crowd up, like a green from deep in Airball
    if (tier === "goat" || tier === "invincible") crowd(t + 0.12, 0.8);
    else if (tier === "sixth-man") crowd(t + 0.12, 1); // (my own card: the home crowd)
  }

  // A crowd: two broad rushes of noise, left and right, shaped by three
  // vowel-like bands that drift, a few whistles and scattered claps; it
  // swells, holds and fades (the same crowd as the Airball page's)
  function crowd(at, level) {
    const whole = 2.4;
    const bus = ctx.createGain();
    bus.gain.setValueAtTime(0.0001, at);
    bus.gain.exponentialRampToValueAtTime(0.6 * level, at + 0.35);
    bus.gain.setValueAtTime(0.6 * level, at + 1);
    bus.gain.exponentialRampToValueAtTime(0.0001, at + whole);
    bus.connect(out);
    [-0.6, 0.6].forEach((pan) => {
      const n = hiss(whole);
      const place = ctx.createStereoPanner ? ctx.createStereoPanner() : ctx.createGain();
      if (place.pan) place.pan.value = pan;
      [[480, 1.2, 0.5], [1150, 1.4, 0.34], [2600, 2, 0.16]].forEach(([hz, q, gain]) => {
        const band = ctx.createBiquadFilter();
        band.type = "bandpass";
        band.Q.value = q;
        band.frequency.setValueAtTime(hz, at);
        band.frequency.linearRampToValueAtTime(hz * (1.1 + Math.random() * 0.15), at + 0.9);
        band.frequency.linearRampToValueAtTime(hz * (0.92 + Math.random() * 0.1), at + whole);
        const g = ctx.createGain();
        g.gain.value = gain;
        n.connect(band).connect(g).connect(place);
      });
      place.connect(bus);
      n.start(at);
      n.stop(at + whole);
    });
    for (let k = 0; k < 3; k++) {
      const whistle = ctx.createOscillator();
      const g = ctx.createGain();
      const start = at + 0.15 + Math.random() * 0.8;
      const hz = 2100 + Math.random() * 900;
      whistle.frequency.setValueAtTime(hz, start);
      whistle.frequency.linearRampToValueAtTime(hz * 1.18, start + 0.18);
      whistle.frequency.linearRampToValueAtTime(hz * 0.95, start + 0.42);
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(0.035, start + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);
      whistle.connect(g).connect(bus);
      whistle.start(start);
      whistle.stop(start + 0.5);
    }
    // (one clap, made once, played sixteen times through different filters)
    if (!ctx.clapBuf) {
      ctx.clapBuf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.03), ctx.sampleRate);
      const d = ctx.clapBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    }
    for (let k = 0; k < 16; k++) {
      const clap = ctx.createBufferSource();
      clap.buffer = ctx.clapBuf;
      const band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.value = 1300 + Math.random() * 900;
      const g = ctx.createGain();
      g.gain.value = 0.1 + Math.random() * 0.12;
      clap.connect(band).connect(g).connect(bus);
      clap.start(at + 0.2 + Math.random() * 1.6);
    }
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
    // turn the bow: while it's drawn it follows the aim
    aim(to) {
      angle = to;
      box.style.rotate = `${to}deg`;
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
  // laid out once at full size and grown with scale, so the compositor does
  // the work instead of a layout and repaint every frame
  ring.style.width = ring.style.height = `${size}px`;
  fx.appendChild(ring);
  ring.animate([{ scale: "0.04", opacity: 1 }, { scale: "1", opacity: 0 }],
    { duration, easing: "ease-out", fill: "forwards" }).finished.then(() => ring.remove());
}

// Recon Bolt's scan, as it looks in the game: the pulse itself is invisible;
// as it sweeps out from the bolt, short violet ticks flicker along the edges
// of everything it passes (here: the words, their notes, the spec pills, the
// picture and the wall's top line), then fade. `sweep` is how long the pulse
// takes to reach the far corner, the same as the words' reveal.
function scanTicks(block, fx, x, y, reach, sweep) {
  const box = block.getBoundingClientRect();
  const ticks = [];
  const along = (r, where, vertical) => {
    // a few dashes along one edge of a box, at random spots
    const len = vertical ? r.height : r.width;
    const n = Math.max(1, Math.min(6, Math.round(len / 70)));
    for (let k = 0; k < n; k++) {
      const size = 7 + Math.random() * 15;
      const at = (vertical ? r.top : r.left) + Math.random() * Math.max(1, len - size);
      ticks.push(vertical
        ? { x: where - box.left - 1, y: at - box.top, w: 2, h: size }
        : { x: at - box.left, y: where - box.top - 1, w: size, h: 2 });
    }
  };
  block.querySelectorAll(".ww-text, .ww-note, .ww-spec, .wordwall-art img").forEach((node) => {
    const r = node.getBoundingClientRect();
    if (!r.width) return;
    along(r, r.bottom, false);
    if (Math.random() < 0.6) along(r, r.top, false);
    if (node.matches(".ww-spec, img")) {
      along(r, r.left, true);
      along(r, r.right, true);
    }
  });
  const top = block.getBoundingClientRect();
  along({ left: top.left, right: top.right, width: top.width, top: top.top, height: 0 }, top.top, false);
  const bits = document.createDocumentFragment();
  ticks.forEach((t) => {
    const tick = el("span", "scan-tick");
    tick.style.left = `${t.x}px`;
    tick.style.top = `${t.y}px`;
    tick.style.width = `${t.w}px`;
    tick.style.height = `${t.h}px`;
    bits.appendChild(tick);
    const d = Math.hypot(t.x + t.w / 2 - x, t.y + t.h / 2 - y);
    tick.animate([
      { opacity: 0 },
      { opacity: 1, offset: 0.08 },
      { opacity: 0.35, offset: 0.22 },
      { opacity: 1, offset: 0.34 },
      { opacity: 0.8, offset: 0.6 },
      { opacity: 0 }
    ], { duration: 650, delay: (d / reach) * sweep, fill: "both" }).finished.then(() => tick.remove());
  });
  fx.appendChild(bits);
}

// A ring of short ticks around the bolt, like the dial on its reticle, that
// flashes when it lands and on each pulse
function tickCrown(fx, x, y, r = 16) {
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    const tick = el("span", "scan-tick");
    tick.style.left = `${x + Math.cos(a) * r - 1}px`;
    tick.style.top = `${y + Math.sin(a) * r - 3}px`;
    tick.style.width = "2px";
    tick.style.height = "6px";
    tick.style.rotate = `${(a * 180) / Math.PI + 90}deg`;
    fx.appendChild(tick);
    tick.animate([{ opacity: 0, scale: "0.6" }, { opacity: 1, scale: "1", offset: 0.25 }, { opacity: 0, scale: "1.25" }],
      { duration: 520, easing: "ease-out", fill: "both" }).finished.then(() => tick.remove());
  }
}

// Recon Bolt on the real ability's timing (VALORANT wiki): Sova's bow comes
// up and charges fully in a blink (both bars of the charge meter), the bolt
// shoots straight into the word and sticks, and 0.667 s later it pulses,
// twice, 1.6 s apart. Each ring reveals the other words as it reaches them.
let pinging = false;
function reconPing(block, item, at) {
  if (pinging || !claimAbility(4800, block, item)) return;
  pinging = true;
  earnUlt();
  const box = block.getBoundingClientRect();
  const src = item.querySelector(".ww-text").getBoundingClientRect();
  // It flies where you point: the mouse (or your finger) on the wall, and it
  // keeps following the mouse while the bow charges, like aiming. The E key
  // aims at the middle of the word.
  let aim = at && at.clientX != null
    ? { cx: at.clientX, cy: at.clientY }
    : { cx: src.left + src.width / 2, cy: src.top + src.height / 2 };
  const follow = (e) => {
    aim = { cx: e.clientX, cy: e.clientY };
    const t = target(); // the bow turns with it, so the bolt leaves the way it points
    bow.aim((Math.atan2(t.y - grip.y, t.x - grip.x) * 180) / Math.PI);
  };
  if (at && at.clientX != null) block.addEventListener("mousemove", follow);
  const target = () => {
    const b = block.getBoundingClientRect();
    return {
      x: Math.min(Math.max(aim.cx - b.left, 12), b.width - 12),
      y: Math.min(Math.max(aim.cy - b.top, 12), b.height - 12)
    };
  };
  let { x, y } = target();
  let reach = 0;
  const fx = wallFx(block);
  // straight at the target, fast
  const grip = bowSpot(block, y + 16);
  const bow = makeBow(fx, grip, (Math.atan2(y - grip.y, x - grip.x) * 180) / Math.PI, 56);
  const hideBars = chargeBars(fx, { x: grip.x, y: grip.y + 64 }, 420);
  let pulses = 0;
  const pulse = () => {
    // like the game's scan: no ring, just ticks flickering along the edges
    // of whatever the pulse sweeps over, and a crown of ticks at the bolt
    scanTicks(block, fx, x, y, reach, 1800);
    tickCrown(fx, x, y);
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
      // fires at wherever the mouse is now
      block.removeEventListener("mousemove", follow);
      ({ x, y } = target());
      reach = Math.hypot(Math.max(x, box.width - x), Math.max(y, box.height - y));
      const from = bow.release();
      tink(fx, from, 50); // fully charged: it flashes as it fires
      setTimeout(() => {
        bow.fade();
        hideBars();
      }, 450);
      return flyBolt(fx, [{ to: { x, y }, lift: 0, time: 0.16, from }]);
    })
    .then(() => {
      // stuck in the word, blinking while it winds up and scans
      const stuck = el("span", "bolt-stuck");
      stuck.style.left = `${x}px`;
      stuck.style.top = `${y}px`;
      fx.appendChild(stuck);
      tickCrown(fx, x, y);
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
  ], { duration: 280, easing: EASE_OUT, fill: "forwards" }).finished.then(() => {
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
// game), lands where you're pointing and bursts into an electric dome like
// the game's shock dart; the words it reaches jolt and flicker, and landing
// on nothing is a miss
let shocking = false;
function shockBolt(block, item, at) {
  if (shocking || !claimAbility(2500, block, item)) return;
  shocking = true;
  earnUlt();
  const text = item.querySelector(".ww-text");
  const r = text.getBoundingClientRect();
  // Aim, like Recon Bolt: it follows the mouse while the bow winds up (or
  // goes where you tap); the Q key aims under the word
  let aim = at && at.clientX != null
    ? { cx: at.clientX, cy: at.clientY }
    : { cx: r.left + r.width / 2, cy: r.bottom };
  const follow = (e) => {
    aim = { cx: e.clientX, cy: e.clientY };
    const first = path(target())[0]; // the bow turns to the new launch angle
    bow.aim(launchAngle(grip, first.to, first.lift, first.time));
  };
  if (at && at.clientX != null) block.addEventListener("mousemove", follow);
  const target = () => {
    const b = block.getBoundingClientRect();
    return {
      x: Math.min(Math.max(aim.cx - b.left, 12), b.width - 12),
      y: Math.min(Math.max(aim.cy - b.top, 12), b.height - 12)
    };
  };
  let land = target();
  const R = Math.max(r.width * 0.62, r.height * 1.15);
  const fx = wallFx(block);
  const grip = bowSpot(block, land.y - 50);
  // two banks along the ground on the way, then the landing
  const path = (to) => {
    const along = (f) => ({ x: grip.x + (to.x - grip.x) * f, y: to.y });
    return [
      { to: along(0.45), lift: 55, time: 0.42 },
      { to: along(0.78), lift: 30, time: 0.26 },
      { to, lift: 16, time: 0.18 }
    ];
  };
  let hops = path(land);
  const bow = makeBow(fx, grip, launchAngle(grip, hops[0].to, hops[0].lift, hops[0].time), 56);
  bow.draw(1, 400)
    .then(() => {
      // fires at wherever the mouse is now
      block.removeEventListener("mousemove", follow);
      land = target();
      hops = path(land);
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
      // the dome shocks the words it reaches, nearest first
      const b = block.getBoundingClientRect();
      const hits = [...block.querySelectorAll(".ww-text")]
        .map((t) => {
          const q = t.getBoundingClientRect();
          const dx = Math.max(q.left - b.left - land.x, 0, land.x - (q.right - b.left));
          const dy = Math.max(q.top - b.top - land.y, 0, land.y - (q.bottom - b.top));
          return { t, d: Math.hypot(dx, dy) };
        })
        .filter((h) => h.d < R * 0.9)
        .sort((m, n) => m.d - n.d)
        .map((h) => h.t);
      shockBurst(fx, hits, land.x, land.y, R);
      if (hits.length) killFeed(block, "shock", hits[0].textContent);
    });
}

// The shock dart's dome: a half-sphere of lightning on the ground, its arcs
// crawling over it and curling inside, flaring up fast and fading out
function shockBurst(fx, hits, x, ground, R) {
  const c = shockColors();
  const lit = { color: c.core, textShadow: sovaBloom(c) };
  // every word the dome reached flickers and jolts
  hits.forEach((text) => {
    const off = { color: getComputedStyle(text).color, textShadow: "none" };
    text.animate([
      { ...lit, offset: 0 }, { ...off, offset: 0.1 }, { ...lit, offset: 0.18 },
      { ...off, offset: 0.3 }, { ...lit, offset: 0.38 }, { ...lit, offset: 0.55 }, { ...off, offset: 1 }
    ], { duration: 900 });
    text.animate([
      { translate: "0 0" }, { translate: "-3px 1px" }, { translate: "3px -1px" },
      { translate: "-2px 0" }, { translate: "2px 1px" }, { translate: "0 0" }
    ], { duration: 360 });
  });
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
  let closed = false;
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
    closed = true;
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
  // It comes up once its pictures are decoded (or after 0.4 s at most):
  // Safari on older iPhones left the ability icons blank while the panel
  // scaled in, until something else redrew it (like locking in). Once it's
  // up, the icons get one more redraw, to be sure.
  const decoded = [...panel.querySelectorAll("img")].map((img) => (img.decode ? img.decode().catch(() => {}) : null));
  Promise.race([Promise.all(decoded), new Promise((done) => setTimeout(done, 400))]).then(() => {
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (closed) return;
      panel.classList.add("on");
      giveRoomBack = makeRoom(block, art, panel);
      framePick(block, art, panel);
      setTimeout(() => {
        kit.style.transform = "translateZ(0)";
        requestAnimationFrame(() => (kit.style.transform = ""));
      }, 480);
    }));
  });
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
      easing: EASE_IN_OUT
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
    later(() => img.style.setProperty("--drift", (-t).toFixed(3)));
  });
}

// Runs every frame but only touches the page when something moved.
// (the scroll position is read only once the page has scrolled: reading it
// makes the browser finish laying the page out first, and every still frame
// was paying for that)
let scrollMoved = true;
addEventListener("scroll", () => (scrollMoved = true), { passive: true });
function frame() {
  const moved = scrollMoved || frameY < 0;
  scrollMoved = false;
  const y = moved ? scrollY : frameY;
  const scrolled = y !== frameY;
  frameY = y;
  batching = true;

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
      const tuck = y > lastY && y > 240;
      later(() => header.classList.toggle("tucked", tuck));
      lastY = y;
    }
    later(() => {
      header.classList.toggle("solid", y > 10);
      hero.style.setProperty("--p", Math.min(1, y / (heroH * 0.75)).toFixed(3));
    });
    updateBeliefs();
    updateMeter(y);
    updateScenes();
    updateNav(y);
    updateLightWalls();
  }
  // everything measured: now the changes, all at once
  batching = false;
  pageWrites.splice(0).forEach((fn) => fn());

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
  ".peek-more, .peek-less, .peek-card, .craft-row, .link, .shot-meter, .play-replay, .pack-again, .tk-switch, .recent";
if (!reduceMotion) {
  document.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    const node = e.target.closest(PRESSABLE);
    if (!node || node.disabled) return;
    const to = node.matches(".thumb, .shot, .shot-more, .video-row, .peek-card, .craft-row, .link") ? "0.985" : "0.97";
    const press = node.animate([{ scale: "1" }, { scale: to }], { duration: 160, easing: EASE_OUT, fill: "forwards" });
    const release = () => {
      removeEventListener("pointerup", release);
      removeEventListener("pointercancel", release);
      const now = getComputedStyle(node).scale; // wherever the press got to
      press.cancel();
      node.animate([{ scale: now === "none" ? "1" : now }, { scale: "1" }], { duration: 120, easing: EASE_OUT }); // snaps back faster than it went in
    };
    addEventListener("pointerup", release);
    addEventListener("pointercancel", release);
  });
}

setupUltButton();
