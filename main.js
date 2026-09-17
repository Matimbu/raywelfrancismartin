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
  $("hobbies").appendChild(block);
}

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
// Pick a video from the list and it plays on the stage. Shorts get a tall
// 9:16 frame, regular videos a wide 16:9 one.
const watchUrl = (v) =>
  v.short ? `https://www.youtube.com/shorts/${v.id}` : `https://www.youtube.com/watch?v=${v.id}`;

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

const stageFits = [];

SITE.youtube.forEach((ch, i) => {
  const card = el("article", "channel reveal");
  card.style.setProperty("--d", i);
  if (isTodo(ch.name, ch.about)) card.classList.add("todo");

  const videos = ch.videos || [];
  let current = videos.find((v) => v.id === ch.featuredVideo)
    || (ch.featuredVideo ? { id: ch.featuredVideo, title: `${ch.name} video` } : null);
  let playing = false;
  const rows = [];

  const media = el("div", "channel-media");
  const stage = el("div", "stage");
  const caption = el("div", "stage-caption");
  const captionState = el("span", "stage-state mono");
  const captionTitle = el("span", "stage-title");
  const openLink = el("a", "stage-open mono", "YouTube ↗");
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
    if (current && current.short) {
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
    captionState.textContent = play ? "Now playing" : v.short ? "Short" : "Video";
    captionTitle.textContent = v.title;
    linkify(openLink, watchUrl(v));

    if (play) {
      const frame = youtubeFrame(v);
      swapIn(frame, (reveal) => frame.addEventListener("load", reveal, { once: true }));
      return;
    }
    const btn = el("button", "thumb");
    btn.type = "button";
    btn.setAttribute("aria-label", `Play ${v.title}`);
    const img = youtubeThumb(v);
    btn.append(img, el("span", "play", "▶"));
    btn.addEventListener("click", () => {
      // A page opened straight from disk has no address to send, so
      // YouTube would refuse to play it here; open YouTube instead.
      if (!location.protocol.startsWith("http")) {
        window.open(watchUrl(v), "_blank", "noopener");
        return;
      }
      show(v, true);
    });
    swapIn(btn, (reveal) => {
      img.addEventListener("load", reveal, { once: true });
      img.addEventListener("error", reveal, { once: true });
    });
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
        show(v, playing);
      });
      rows.push(row);
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
  const tile = el("button", p.wide ? "shot wide reveal" : "shot reveal");
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
  tile.append(img, el("span", "shot-caption mono", p.caption));
  tile.addEventListener("click", () => openShot(i));
  $("galleryGrid").appendChild(tile);
});

// The last tile points to Instagram for the rest
const instagram = SITE.links.find((l) => l.label === "Instagram" && l.url);
if (gallery.length && instagram) {
  const more = el("a", "shot shot-more reveal");
  linkify(more, instagram.url);
  more.append(
    el("span", "mono shot-more-label", "More on Instagram"),
    el("span", "shot-more-handle", instagram.value),
    el("span", "shot-more-arrow", "↗")
  );
  $("galleryGrid").appendChild(more);
}

const lightbox = $("lightbox");
const lbImg = $("lbImg");
let lbIndex = 0;

function showShot(i) {
  lbIndex = (i + gallery.length) % gallery.length;
  const p = gallery[lbIndex];
  // Show the grid-size copy right away, then swap in the large one
  lbImg.src = shotSrc(p, 800);
  lbImg.alt = p.alt || p.caption;
  const large = new Image();
  const wanted = lbIndex;
  large.onload = () => { if (wanted === lbIndex) lbImg.src = large.src; };
  large.src = shotSrc(p, 1600);
  $("lbCount").textContent = `${pad2(lbIndex + 1)} / ${pad2(gallery.length)}`;
  $("lbText").textContent = p.caption;
  // Warm up the neighbours so arrowing through feels instant
  [lbIndex - 1, lbIndex + 1].forEach((j) => {
    new Image().src = shotSrc(gallery[(j + gallery.length) % gallery.length], 1600);
  });
}

function openShot(i) {
  showShot(i);
  lightbox.showModal();
  if (lenis) lenis.stop();
}

lightbox.addEventListener("close", () => { if (lenis) lenis.start(); });
$("lbClose").addEventListener("click", () => lightbox.close());
$("lbPrev").addEventListener("click", () => showShot(lbIndex - 1));
$("lbNext").addEventListener("click", () => showShot(lbIndex + 1));
lightbox.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") showShot(lbIndex - 1);
  if (e.key === "ArrowRight") showShot(lbIndex + 1);
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
    showShot(lbIndex + (dx < 0 ? 1 : -1));
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
