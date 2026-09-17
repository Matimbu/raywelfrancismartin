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
  root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
  try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
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
  if (f.badge) card.appendChild(el("span", "floater-badge", f.badge));
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
  scramble(roles, roles.textContent, 1100, 700);
  scramble(statement, statement.textContent, 1500, 1000);
}
Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]).then(startIntro);

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

function showPreview(craft) {
  previewIn.textContent = "";
  sizePreview(240, 300);
  if (craft.image) {
    const img = el("img");
    img.alt = "";
    img.onload = () => {
      const ratio = img.naturalWidth / img.naturalHeight;
      const w = Math.min(380, 300 * ratio);
      sizePreview(w, w / ratio);
    };
    img.src = craft.image;
    previewIn.appendChild(img);
  } else {
    previewIn.appendChild(el("span", "", craft.emoji));
  }
  preview.classList.add("on");
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
    row.addEventListener("mouseleave", () => preview.classList.remove("on"));
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

// ============================================================
//  Beliefs (words light up as you scroll)
// ============================================================
SITE.beliefs.forEach((text, i) => {
  const wrap = el("div", "belief-wrap");
  const num = el("span", "belief-num mono", `(${pad2(i + 1)})`);
  num.setAttribute("aria-hidden", "true");
  const p = el("p", "belief");
  splitWords(p, text);
  if (isTodo(text)) wrap.classList.add("todo");
  wrap.append(num, p);
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
  });
}

// ============================================================
//  YouTube
// ============================================================
function youtubeThumb(id) {
  const img = el("img");
  img.alt = "";
  img.loading = "lazy";
  // Not every video has a max-res thumbnail; YouTube serves a tiny
  // placeholder instead, so fall back to the standard one.
  const fallback = () => {
    if (!img.src.includes("hqdefault")) img.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  };
  img.onerror = fallback;
  img.onload = () => { if (img.naturalWidth <= 120) fallback(); };
  img.src = `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
  return img;
}

SITE.youtube.forEach((ch, i) => {
  const card = el("article", "channel reveal");
  card.style.setProperty("--d", i);
  if (isTodo(ch.name, ch.about)) card.classList.add("todo");

  // Featured video: shows the thumbnail, plays in place when clicked
  const id = ch.featuredVideo ? encodeURIComponent(ch.featuredVideo) : "";
  const media = el("div", "channel-media");
  const thumb = el(id ? "button" : "a", "thumb");
  media.appendChild(thumb);
  if (id) {
    const featured = (ch.videos || []).find((v) => v.id === ch.featuredVideo);
    const watchUrl = `https://www.youtube.com/watch?v=${id}`;
    thumb.type = "button";
    thumb.setAttribute("aria-label", `Play ${featured ? featured.title : "featured video"}`);
    thumb.appendChild(youtubeThumb(id));
    thumb.addEventListener("click", () => {
      // YouTube only plays embeds when the page sends its address (the HTTP
      // Referer, "error 153" otherwise). A page opened straight from disk
      // has no address, so send those viewers to YouTube instead.
      if (!location.protocol.startsWith("http")) {
        window.open(watchUrl, "_blank", "noopener");
        return;
      }
      const frame = el("iframe");
      frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      frame.title = featured ? featured.title : `${ch.name} video`;
      frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      frame.allowFullscreen = true;
      const holder = el("div", "thumb playing");
      holder.appendChild(frame);
      thumb.replaceWith(holder);

      // Some browsers and privacy extensions still strip the Referer
      const fallback = el("a", "watch-fallback mono", "Video not playing? Watch on YouTube ↗");
      linkify(fallback, watchUrl);
      media.appendChild(fallback);
    });
  } else {
    linkify(thumb, ch.url);
  }
  thumb.appendChild(el("span", "play", "▶"));

  const info = el("div", "channel-info");
  info.append(el("p", "channel-handle mono", ch.handle), el("h3", "channel-name", ch.name));
  if (ch.tagline) info.appendChild(el("p", "channel-tagline", `“${ch.tagline}”`));
  if (ch.about) info.appendChild(el("p", "channel-about", ch.about));

  if (ch.videos && ch.videos.length) {
    const list = el("ul", "video-list");
    ch.videos.forEach((v) => {
      const row = el("a", "video-row");
      linkify(row, v.short ? `https://www.youtube.com/shorts/${v.id}` : `https://www.youtube.com/watch?v=${v.id}`);
      row.append(el("span", "video-title", v.title), el("span", "video-note mono", v.note || ""));
      const li = el("li");
      li.appendChild(row);
      list.appendChild(li);
    });
    info.appendChild(list);
  }

  const visit = el("a", "channel-visit mono", "Visit channel ↗");
  linkify(visit, ch.url);
  info.appendChild(visit);

  card.append(media, info);
  $("channelList").appendChild(card);
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
  } else {
    row.type = "button";
    row.addEventListener("click", () => {
      navigator.clipboard?.writeText(l.value).then(() => {
        arrow.textContent = "Copied";
        setTimeout(() => (arrow.textContent = "Copy"), 1600);
      });
    });
  }
  $("linkList").appendChild(row);
});

// Hide sections that have nothing in them
[["crafts", SITE.crafts], ["hobbies", SITE.hobbies], ["beliefs", SITE.beliefs], ["channels", SITE.youtube]]
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
const eyebrows = [...document.querySelectorAll(".eyebrow")];
eyebrows.forEach((e) => e.classList.add("scramble"));

const revealer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const node = entry.target;
    if (node.classList.contains("eyebrow")) scramble(node, node.textContent, 700);
    else node.classList.add("in");
    revealer.unobserve(node);
  });
}, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
document.querySelectorAll(".reveal, .split, .eyebrow").forEach((n) => revealer.observe(n));

// Highlight the nav link for the section on screen
const navLinks = [...document.querySelectorAll(".nav a")];
const navObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    navLinks.forEach((a) => a.classList.toggle("active", a.getAttribute("href") === `#${entry.target.id}`));
  });
}, { rootMargin: "-45% 0px -50% 0px" });
navLinks.forEach((a) => {
  const section = document.querySelector(a.getAttribute("href"));
  if (section) navObserver.observe(section);
});

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

// Runs every frame but only touches the page when something moved.
function frame() {
  const y = scrollY;
  const scrolled = y !== frameY;
  frameY = y;

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
    preview.style.transform = `translate3d(${previewX.toFixed(1)}px, ${previewY.toFixed(1)}px, 0)`;
  }

  requestAnimationFrame(frame);
}

if (reduceMotion) {
  document.querySelectorAll(".fw").forEach((w) => w.classList.add("lit"));
  addEventListener("scroll", () => {
    header.classList.toggle("solid", scrollY > 10);
  }, { passive: true });
} else {
  requestAnimationFrame(frame);
}
