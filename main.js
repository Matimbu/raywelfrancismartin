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
    if (r.bottom < -vh * 0.25 || r.top > vh * 1.25) return;
    const edge = vh * n.dataset.leave;
    const enter = smooth(clamp01((vh - r.top) / (vh * 0.4)));
    const leave = smooth(clamp01((edge - r.bottom) / (edge + r.height * 0.6)));
    const fill = smooth(clamp01((vh * 0.72 - r.top) / (vh * 0.3)));
    n.style.setProperty("--in", enter.toFixed(3));
    n.style.setProperty("--out", leave.toFixed(3));
    n.style.setProperty("--fill", fill.toFixed(3));
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
  setTimeout(() => {
    node.classList.add("on");
    const start = performance.now();
    const frame = (now) => {
      const p = Math.min(1, (now - start) / duration);
      node.textContent = chars
        .map((c, i) => (c === " " || p >= settleAt[i] ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
        .join("");
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
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
if (SITE.motto) $("footMotto").textContent = SITE.motto;
else $("footMotto").remove();
$("year").textContent = new Date().getFullYear();
document.title = `${SITE.firstName} ${SITE.lastName}`;

const portfolioLink = $("portfolioLink");
if (SITE.portfolio) portfolioLink.href = SITE.portfolio;
else portfolioLink.remove();

const town = SITE.place.name.split(",")[0];
function tick() {
  const now = new Date();
  const opts = { timeZone: SITE.timezone, hour: "2-digit", minute: "2-digit", hour12: false };
  $("clock").textContent = `${town} ${now.toLocaleTimeString("en-GB", opts)}`;
  const full = now.toLocaleTimeString("en-GB", { ...opts, second: "2-digit", timeZoneName: "shortOffset" });
  $("footClock").textContent = `Local time ${full}`;
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
  ["place-row", SITE.place.coords]
].forEach(([cls, text]) => text && place.appendChild(el("span", cls, text)));

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

SITE.now.forEach((text) => {
  const li = el("li", "", text);
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

// Show "Copied" (or a hint to copy by hand) on a label, then put it back
function flashCopied(label, ok) {
  label.textContent = ok ? "Copied" : "Copy failed";
  setTimeout(() => (label.textContent = "Copy"), 1600);
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
    if (w.pos) item.appendChild(el("span", "ww-pos mono", w.pos));
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
      item.appendChild(note);
    }
    if (w.drone) {
      item.classList.add("ww-drone");
      item.addEventListener("click", launchDrone);
    }
    // Reuse the crafts preview card: the photo follows the cursor
    if (w.image && canHover && !cards) {
      item.addEventListener("mouseenter", () => showPreview({ image: w.image, emoji: "" }));
      item.addEventListener("mouseleave", hidePreview);
    }
    words.appendChild(item);
  });
  block.append(head, words);

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

// "The story so far": a short timeline at the end of the About section
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
      const medals = el("span", "story-medals", "🥇".repeat(s.medals));
      medals.setAttribute("aria-label", `${s.medals} gold medal${s.medals > 1 ? "s" : ""}`);
      title.appendChild(medals);
    }
    body.append(title, el("p", "story-text", s.text));
    // A row can open one of the gallery photos in the viewer
    const shot = s.photo ? (SITE.gallery || []).findIndex((g) => g.file === s.photo) : -1;
    if (shot >= 0) {
      const open = el("button", "story-photo");
      open.type = "button";
      const thumb = el("img");
      thumb.src = `assets/gallery/${s.photo}-400.jpg`;
      thumb.alt = "";
      thumb.loading = "lazy";
      open.append(thumb, el("span", "mono", "See the photo"));
      open.addEventListener("click", () => openShot(shot));
      body.appendChild(open);
    }
    const year = el("span", "story-year", s.year);
    if (s.until) year.appendChild(el("span", "story-until mono", `to ${s.until}`));
    li.append(year, body);
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

SITE.crafts.forEach((craft, i) => {
  const li = el("li", "craft reveal");
  li.style.setProperty("--d", i);
  if (isTodo(craft.title, craft.year)) li.classList.add("todo");

  const row = el(craft.link ? "a" : "div", "craft-row");
  linkify(row, craft.link);
  row.append(
    el("span", "craft-num mono", pad2(i + 1)),
    el("span", "craft-title", craft.title),
    el("span", "craft-tags mono", craft.tags.join(" · ")),
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
    pickLabel.appendChild(el("p", "mono playlist-kicker", "Current pick"));
    const pickFrame = el("iframe", "playlist-track");
    pickFrame.src = `https://open.spotify.com/embed/track/${pick[1]}?theme=0`;
    pickFrame.title = "My current pick on Spotify";
    pickFrame.loading = "lazy";
    pickFrame.allow = frame.allow;
    block.append(pickLabel, pickFrame);
  }
  $("hobbies").appendChild(block);
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
  info.append(el("p", "channel-handle mono", ch.handle), el("h3", "channel-name", ch.name));
  if (ch.tagline) info.appendChild(el("p", "channel-tagline", `“${ch.tagline}”`));
  if (ch.about) info.appendChild(el("p", "channel-about", ch.about));

  if (videos.length) {
    const list = el("ul", "video-list");
    videos.forEach((v) => {
      const row = el("button", "video-row");
      row.type = "button";
      row.dataset.id = v.id;
      row.append(el("span", "video-title", v.title), el("span", "video-note mono", v.note || ""));
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
  tile.append(img, el("span", "shot-caption mono", p.caption));
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
  revealShot(dir);
  lbImg.alt = p.alt || p.caption;
  const large = new Image();
  const wanted = lbIndex;
  large.onload = () => { if (wanted === lbIndex) lbImg.src = large.src; };
  large.src = shotSrc(p, 1600);
  setCounter(lbIndex + 1);
  $("lbText").textContent = p.caption;
  // The serif italic draws "1" like "l", so numbers get the sans font
  const story = $("lbStory");
  story.textContent = "";
  (p.story || "").split(/(\d+(?:x\d+)?)/).filter(Boolean).forEach((part) => {
    story.appendChild(/^\d/.test(part) ? el("span", "digits", part) : document.createTextNode(part));
  });
  story.hidden = !p.story;
  // Warm up the neighbours so arrowing through feels instant
  [lbIndex - 1, lbIndex + 1].forEach((j) => {
    new Image().src = shotSrc(gallery[(j + gallery.length) % gallery.length], 1600);
  });
}

// The photo opens like a curtain from the side you're heading towards,
// the same reveal the gallery tiles use
function revealShot(dir) {
  if (reduceMotion || !lbImg.animate) return;
  const play = () => {
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
document.querySelectorAll(".title.split, .contact-title.split").forEach((title) => {
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
  '<circle class="shot-meter-fill" cx="22" cy="22" r="19"/></svg><span class="shot-meter-arrow" aria-hidden="true">↑</span>';
document.body.appendChild(meter);
document.body.classList.add("has-meter");
document.querySelector('.footer a[href="#top"]')?.remove();
const meterFill = meter.querySelector(".shot-meter-fill");
const METER_LEN = 2 * Math.PI * 19;
meterFill.style.strokeDasharray = METER_LEN.toFixed(2);

// On phones the ring would sit on the text, so it hides with the header
// while you scroll down and comes back when you scroll up
const narrowScreen = matchMedia("(max-width: 960px)");

function updateMeter(y) {
  const max = document.documentElement.scrollHeight - innerHeight;
  const p = max > 0 ? Math.min(1, y / max) : 0;
  meterFill.style.strokeDashoffset = (METER_LEN * (1 - p)).toFixed(2);
  const reading = narrowScreen.matches && header.classList.contains("tucked");
  meter.classList.toggle("on", y > heroH * 0.6 && !reading);
  meter.classList.toggle("swish", p > 0.995);
}
updateMeter(scrollY);

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

// A small orange dot trails the cursor (desktop only) and opens into a
// ring over anything clickable. It hides over videos and embeds, which
// swallow the mouse.
const cursorDot = canHover && !reduceMotion ? document.body.appendChild(el("div", "cursor-dot hidden")) : null;
let dotX = pointerX;
let dotY = pointerY;
if (cursorDot) {
  const CLICKABLE = "a, button, [role='button'], .craft-row, .shot, .video-row, .ww-drone, .floater";
  document.addEventListener("mouseover", (e) => {
    const t = e.target instanceof Element ? e.target : null;
    cursorDot.classList.toggle("hot", !!(t && t.closest(CLICKABLE)));
    cursorDot.classList.toggle("hidden", !t || t.tagName === "IFRAME");
  });
  document.documentElement.addEventListener("mouseleave", () => cursorDot.classList.add("hidden"));
}
function moveCursorDot() {
  if (!cursorDot) return;
  const dx = pointerX - dotX;
  const dy = pointerY - dotY;
  if (Math.abs(dx) < 0.1 && Math.abs(dy) < 0.1) return;
  dotX += dx * 0.28;
  dotY += dy * 0.28;
  cursorDot.style.transform = `translate3d(${dotX.toFixed(1)}px, ${dotY.toFixed(1)}px, 0)`;
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
  moveCursorDot();
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
