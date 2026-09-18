# Raywel Martin — off the clock

### 🔗 [matimbu.github.io/raywelfrancismartin](https://matimbu.github.io/raywelfrancismartin/)

Share it with friends (hit the copy button on the right):

```
https://matimbu.github.io/raywelfrancismartin/
```

My personal site: the things I make, what I do for fun, what I believe in, and where to find me. My developer portfolio lives at [matimbu.github.io/portfolio](https://matimbu.github.io/portfolio/).

Built with plain HTML, CSS and JavaScript, plus [Lenis](https://github.com/darkroomengineering/lenis) for smooth scrolling.

## Editing

Everything the site says is in `content.js`. After changing `content.js`, `main.js` or `style.css`, bump the `?v=` number on them in `index.html` so returning visitors don't get old cached copies (GitHub Pages caches files for 10 minutes). Entries containing `TODO` show up (outlined in yellow) only when previewing locally; the live site skips them.

## Photos

- `images/` holds original, full-size photos. It's in `.gitignore`, so originals are never published.
- `assets/` holds the web-ready copies the site uses: rule-of-thirds crops, lightly colour-graded, resized and stripped of metadata (no GPS). They're exported once, straight from the originals, as JPEG quality 97 with full colour detail (4:4:4); at top quality JPEG keeps more detail than lossy WebP, and PNG/BMP would be 3–25× heavier.
- `assets/gallery/` holds the Snapshots gallery: each photo at 400, 800 and 1600 px (the page loads the small ones in the grid and the 1600 px one only when a photo is opened). Captions and order live in `gallery` in `content.js`.
- Edited a photo in Lightroom? Export a full-size JPEG into `images/` and re-crop it, or export straight to the matching file in `assets/` at the same size (`me-shop.jpg` 480×640, `me-cafe.jpg` 480×600, `still-flowers.jpg` 480×480, `me-sofa.jpg` 640×480).
- `assets/og-image.jpg` (1200×630) is the picture people see when the link is shared in Messenger, Discord, Facebook or X. To change it, replace the file at the same size. Apps cache previews, so to refresh one after a change, paste the link into [Facebook's Sharing Debugger](https://developers.facebook.com/tools/debug/) and press "Scrape Again".
- `assets/icons/` holds the "RM." tab icon (16 and 32 px, drawn slightly bolder so it stays readable), a 192 px icon and `apple-touch-icon.png` for phone home screens.
- `assets/tiktok/` holds a cover image for each TikTok clip in the Watch Me section, named after the video ID (TikTok's own thumbnail links expire).
- `404.html` is the "Airball." page GitHub Pages shows for any address that doesn't exist.

## Preview locally

```bash
python -m http.server 5500
```

Then open http://localhost:5500.
