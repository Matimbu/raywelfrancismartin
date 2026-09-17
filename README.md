# Raywel Martin — off the clock

### 🔗 [matimbu.github.io/raywelfrancismartin](https://matimbu.github.io/raywelfrancismartin/)

Share it with friends (hit the copy button on the right):

```
https://matimbu.github.io/raywelfrancismartin/
```

My personal site: the things I make, what I do for fun, what I believe in, and where to find me. My developer portfolio lives at [matimbu.github.io/portfolio](https://matimbu.github.io/portfolio/).

Built with plain HTML, CSS and JavaScript, plus [Lenis](https://github.com/darkroomengineering/lenis) for smooth scrolling.

## Editing

Everything the site says is in `content.js`. Entries containing `TODO` show up (outlined in yellow) only when previewing locally; the live site skips them.

## Photos

- `images/` holds original, full-size photos. It's in `.gitignore`, so originals are never published.
- `assets/` holds the web-ready copies the site uses: rule-of-thirds crops, lightly colour-graded, resized and stripped of metadata (no GPS).
- Edited a photo in Lightroom? Export a full-size JPEG into `images/` and re-crop it, or export straight to the matching file in `assets/` at the same size (`me-shop.jpg` 480×640, `me-cafe.jpg` 480×600, `still-flowers.jpg` 480×480, `me-sofa.jpg` 640×480).

## Preview locally

```bash
python -m http.server 5500
```

Then open http://localhost:5500.
