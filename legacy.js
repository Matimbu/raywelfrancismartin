/* Old Safari: iOS 15 and older (an iPhone 7 or 6s stops there).
   It doesn't know two CSS features the site leans on, so without help the
   2K cards come apart and some glows go missing:
     - container units (11cqw: 11% of the card's width) and @container rules
     - color-mix() (a colour see-through by some %)
   index.html and 404.html load this file only on browsers that need it. It
   reads the page's styles and rewrites them into what old Safari knows:
     11cqw                          -> calc(var(--cq) * 11), with --cq set to
                                       1% of each container's width in px
     @container (max-width: 190px)  -> the same rules under .cq-max-190, a
                                       class put on narrow containers
     color-mix(in srgb, var(--x) 40%, transparent)
                                    -> rgb(var(--x-rgb) / 40%), with an
                                       --x-rgb twin ("r g b") next to every --x
     overflow-x: clip               -> overflow-x: hidden
   Everything else in the styles stays as it is. Written in plain, older
   JavaScript on purpose. */
(function () {
  "use strict";

  var NAMED = { white: "255 255 255", black: "0 0 0", transparent: "0 0 0" };
  var containerSelectors = [];
  var widths = [];

  // "#f7c948", "#fff", "rgb(6 7 10)", "rgba(6, 7, 10, 0.5)", "white"
  // -> "247 201 72"; var(--x, #fff) -> var(--x-rgb, 255 255 255)
  function toRgb(value) {
    var v = String(value).trim();
    var m = /^var\(\s*(--[\w-]+)\s*(?:,\s*(.+))?\)$/.exec(v);
    if (m) {
      var inner = m[2] ? toRgb(m[2]) : null;
      return "var(" + m[1] + "-rgb" + (inner ? ", " + inner : "") + ")";
    }
    if (/^#[0-9a-f]{3,4}$/i.test(v)) v = "#" + v[1] + v[1] + v[2] + v[2] + v[3] + v[3];
    if (/^#[0-9a-f]{6}([0-9a-f]{2})?$/i.test(v)) {
      return [1, 3, 5].map(function (i) { return parseInt(v.substr(i, 2), 16); }).join(" ");
    }
    m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(v);
    if (m) return m[1] + " " + m[2] + " " + m[3];
    return NAMED[v.toLowerCase()] || null;
  }

  // the text inside balanced brackets that start at s[open] ("(" or "{")
  function closing(s, open) {
    var pair = s[open] === "{" ? "}" : ")";
    var depth = 0;
    for (var i = open; i < s.length; i++) {
      if (s[i] === s[open]) depth++;
      else if (s[i] === pair && --depth === 0) return i;
    }
    return s.length - 1;
  }

  function splitTop(s) {
    var parts = [];
    var depth = 0;
    var start = 0;
    for (var i = 0; i < s.length; i++) {
      if (s[i] === "(") depth++;
      else if (s[i] === ")") depth--;
      else if (s[i] === "," && depth === 0) {
        parts.push(s.slice(start, i).trim());
        start = i + 1;
      }
    }
    parts.push(s.slice(start).trim());
    return parts;
  }

  // color-mix(in srgb, A p%, B) -> A see-through by p% (exact when B is
  // transparent; close enough for the few mixes toward black or white)
  function mix(args) {
    var parts = splitTop(args);
    var a = /^(.*?)\s*(\d+(?:\.\d+)?)%$/.exec(parts[1]) || [0, parts[1], "50"];
    var b = (parts[2] || "transparent").replace(/\s*\d+(?:\.\d+)?%$/, "").trim();
    var rgb = toRgb(a[1]);
    if (!rgb) return "transparent";
    var p = parseFloat(a[2]);
    if (/^(#fff|#ffffff|white)$/i.test(b) && p < 50) return "rgb(255 255 255)";
    return "rgb(" + rgb + " / " + p + "%)";
  }

  function rewriteMixes(css) {
    var out = "";
    var at;
    while ((at = css.indexOf("color-mix(")) >= 0) {
      var end = closing(css, at + 9);
      out += css.slice(0, at) + mix(css.slice(at + 10, end));
      css = css.slice(end + 1);
    }
    return out + css;
  }

  // @container (max-width: 190px) { a { } b, c { } } -> .cq-max-190 a { } ...
  function rewriteContainerRules(css) {
    var out = "";
    var at;
    while ((at = css.indexOf("@container")) >= 0) {
      var open = css.indexOf("{", at);
      var end = closing(css, open);
      var m = /max-width:\s*(\d+)px/.exec(css.slice(at, open));
      out += css.slice(0, at);
      if (m) {
        if (widths.indexOf(+m[1]) < 0) widths.push(+m[1]);
        out += css.slice(open + 1, end).replace(/([^{}]+)\{/g, function (all, selectors) {
          return selectors.split(",").map(function (sel) { return ".cq-max-" + m[1] + " " + sel.trim(); }).join(", ") + " {";
        });
      }
      css = css.slice(end + 1);
    }
    return out + css;
  }

  function rewrite(css) {
    css = css.replace(/\/\*[\s\S]*?\*\//g, "");
    // which elements are containers
    css.replace(/([^{}]+)\{[^{}]*container-type\s*:/g, function (all, selectors) {
      if (containerSelectors.indexOf(selectors.trim()) < 0) containerSelectors.push(selectors.trim());
      return all;
    });
    // a "r g b" twin for every colour variable (a mixed colour is often
    // defined through another one: --glow: var(--gold))
    css = css.replace(/(--[\w-]+)\s*:\s*([^;{}]+)(;|(?=\}))/g, function (all, name, value) {
      var rgb = /-rgb$/.test(name) ? null : toRgb(value);
      return rgb ? all + (all.slice(-1) === ";" ? "" : ";") + name + "-rgb: " + rgb + ";" : all;
    });
    css = rewriteMixes(css);
    css = rewriteContainerRules(css);
    css = css.replace(/(^|[^\w.-])(-?(?:\d*\.)?\d+)cq[wi]\b/g, "$1calc(var(--cq) * $2)");
    css = css.replace(/overflow-x:\s*clip/g, "overflow-x: hidden");
    return css;
  }

  // Colours main.js sets on elements (a wall's glow, a cover's tint) get
  // their twins too
  var setProperty = CSSStyleDeclaration.prototype.setProperty;
  CSSStyleDeclaration.prototype.setProperty = function (name, value, priority) {
    setProperty.call(this, name, value, priority);
    if (String(name).indexOf("--") === 0 && !/-rgb$/.test(name)) {
      var rgb = /[#(a-z]/i.test(String(value)) ? toRgb(value) : null;
      if (rgb) setProperty.call(this, name + "-rgb", rgb, priority);
    }
  };

  // --cq on every container: 1% of its width, kept up to date
  var watched = typeof WeakSet === "function" ? new WeakSet() : null;
  var measure = function (el, width) {
    el.style.setProperty("--cq", width / 100 + "px");
    widths.forEach(function (w) { el.classList.toggle("cq-max-" + w, width <= w); });
  };
  var sizes = typeof ResizeObserver === "function"
    ? new ResizeObserver(function (entries) {
        entries.forEach(function (e) { measure(e.target, e.contentRect.width); });
      })
    : null;
  var scanning = false;
  function scan() {
    scanning = false;
    containerSelectors.forEach(function (sel) {
      var found;
      try { found = document.querySelectorAll(sel); } catch (e) { return; }
      Array.prototype.forEach.call(found, function (el) {
        if (watched && watched.has(el)) return;
        if (watched) watched.add(el);
        if (sizes) sizes.observe(el);
        else measure(el, el.clientWidth);
      });
    });
  }
  function soon() {
    if (scanning) return;
    scanning = true;
    requestAnimationFrame(scan);
  }
  if (!sizes) {
    addEventListener("resize", function () {
      containerSelectors.forEach(function (sel) {
        Array.prototype.forEach.call(document.querySelectorAll(sel), function (el) { measure(el, el.clientWidth); });
      });
    });
  }

  function start() {
    // the page's own <style> blocks (404.html keeps all its styles there)
    Array.prototype.forEach.call(document.querySelectorAll("style"), function (style) {
      if (/color-mix|\dcq[wi]|@container|overflow-x:\s*clip/.test(style.textContent)) style.textContent = rewrite(style.textContent);
    });
    new MutationObserver(soon).observe(document.documentElement, { childList: true, subtree: true });
    soon();
  }

  // style.css, fetched again (it comes from the cache) and swapped for the
  // rewritten copy
  var links = Array.prototype.filter.call(document.querySelectorAll('link[rel="stylesheet"]'), function (link) {
    return /(^|\/)style\.css/.test(link.getAttribute("href") || "");
  });
  links.forEach(function (link) {
    fetch(link.href)
      .then(function (r) { return r.text(); })
      .then(function (css) {
        var style = document.createElement("style");
        style.textContent = rewrite(css);
        link.parentNode.insertBefore(style, link);
        link.parentNode.removeChild(link);
        soon();
      })
      .catch(function () {});
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
