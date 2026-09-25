// Malolos Rush, the teaser: a tiny three-lane runner in the spirit of my
// capstone (the real one is 3D, in Unity). A student runs through Malolos at
// sunset: swipe or use the arrows to change lanes, swipe up (or up / Space)
// to jump the barriers, and grab the coins. Run into a jeepney (one honks
// when it's coming down your lane) and the run is over; clip a barrier and a
// guard gives chase, and clipping another before he drops back gets you
// caught. An ensaymada pulls the coins in for a few seconds. On the way:
// Barasoain Church at 500 m, the Malolos Cathedral at 1000 m and Casa Real
// at 1500 m, each lighting up as you reach it, while the sunset turns into
// night. Loaded the first time someone presses Play on the Malolos Rush row
// in Crafts (see main.js), and drawn on a canvas in fake 3D: everything
// shrinks toward the landmark at the end of the road.
(function () {
  const LANES = [-0.7, 0, 0.7];
  const PZ = 3; // how far ahead of the camera the runner is
  const FAR = 58; // how far down the road things appear
  const GRAVITY = 16;
  const JUMP = 5.2; // up speed: about 0.85 high, 0.65 s in the air
  const MAGNET = 6; // seconds an ensaymada pulls the coins in
  const CHASE = 8; // seconds the guard stays on your tail after a clipped barrier
  // the landmarks on the way, like the zones in my capstone ("tall": how
  // many facade units high each one is drawn)
  const ZONES = [
    { at: 500, name: "Barasoain Church", line: "You made it", bonus: 25, sound: "bells", event: "barasoain", tall: 27, draw: barasoain },
    { at: 1000, name: "Malolos Cathedral", line: "On to the old town", bonus: 25, sound: "bells-low", event: "cathedral", tall: 29, draw: cathedral },
    { at: 1500, name: "Casa Real", line: "All three landmarks", bonus: 50, sound: "fanfare", event: "casa-real", tall: 23, draw: casaReal }
  ];
  // The runner: a student seen from behind, as in my capstone's character
  // (black hair, a white shirt under a grey vest, a black backpack, the ID's
  // blue lanyard round the neck, blue trousers, a watch), and the guard
  // chasing him (a navy cap and uniform, a black belt). Pixel art, a letter
  // a pixel.
  const STUDENT = {
    H: "#16161a", h: "#34343d", S: "#e2aa7c", s: "#c98f5f", W: "#eff0f3", w: "#c8ccd4", V: "#a4a8b0", v: "#868b94",
    B: "#25262c", b: "#3d3f48", L: "#2f6fd6", P: "#2143a3", p: "#18327c", K: "#111114", T: "#0a0a0c"
  };
  const STUDENT_TOP = [
    "...hHHh...",
    "..HHHHHHH.",
    ".HHHhHHHH.",
    ".sHHHHHHs.",
    "...sSSs...",
    "..WLWWLW..",
    ".WwBBBBwW.",
    "SWvBbbBvWS",
    "S.vBBBBv.S",
    "s.vBBBBv.s",
    "T.VVBBVV.s"
  ];
  const STUDENT_FRAMES = {
    run1: [...STUDENT_TOP, "..PPPPPP..", "..PPPPpP..", "..PP..pP..", "..PP..KK..", "..KK......"],
    run2: [...STUDENT_TOP, "..PPPPPP..", "..pPPPPP..", "..pP..PP..", "..KK..PP..", "......KK.."],
    jump: [...STUDENT_TOP, "..PPPPPP..", "..PPPPPP..", "..KK..KK..", "..........", ".........."],
    // arms flung up, clipping a barrier
    stumble: [
      "...hHHh...",
      "..HHHHHHH.",
      "S.HHhHHH.S",
      "S.sHHHHs.S",
      "s..sSSs..s",
      "s.WLWWLW.s",
      ".WwBBBBwW.",
      ".WvBbbBvW.",
      "..vBBBBv..",
      "..vBBBBv..",
      "..VVBBVV..",
      "..PPPPPP..",
      "..PPPPpP..",
      "..PP..pP..",
      "..PP..KK..",
      "..KK......"
    ]
  };
  const GUARD = {
    C: "#2d4270", c: "#1a2644", H: "#3b2a20", S: "#c98f5e", s: "#b07a4c", N: "#263b67", n: "#1c2d52",
    K: "#121215", k: "#2a2a30", P: "#1e3159", p: "#172747", F: "#0e0e11"
  };
  const GUARD_BODY = [
    "..CCCCCC..",
    ".CCCCCCCC.",
    ".cccccccc.",
    "..HHHHHH..",
    "...sSSs...",
    "..NNNNNN..",
    ".NNNNNNNN.",
    "NNNNnnNNNN",
    "SnNNNNNNnS",
    "S.NNNNNN.S",
    "S.NNnnNN.S",
    "s.NNNNNN.s",
    ".kKKKKKKk."
  ];
  const GUARD_FRAMES = {
    run1: [...GUARD_BODY, "..PPPPPP..", "..PPPPpP..", "..PP..pP..", "..PP..FF..", "..FF......"],
    run2: [...GUARD_BODY, "..PPPPPP..", "..pPPPPP..", "..pP..PP..", "..FF..PP..", "......FF.."],
    // both arms up, grabbing
    grab: [
      "..CCCCCC..",
      ".CCCCCCCC.",
      "S.cccccc.S",
      "S.HHHHHH.S",
      "s..sSSs..s",
      "n.NNNNNN.n",
      ".NNNNNNNN.",
      ".NNNnnNNN.",
      "..NNNNNN..",
      "..NNNNNN..",
      "..NNnnNN..",
      "..NNNNNN..",
      ".kKKKKKKk.",
      "..PPPPPP..",
      "..PPPPpP..",
      "..PP..pP..",
      "..PP..FF..",
      "..FF......"
    ]
  };
  // The sky: a dim sunset (navy, plum and amber, after the colours of my
  // capstone deck, with the church trimmed in its gold) that gives way to the
  // night the farther you run. Each is drawn once per screen size.
  const SUNSET = {
    sky: [[0, "#1f1b3a"], [0.35, "#3b2a52"], [0.66, "#7a3f55"], [0.87, "#c46a45"], [1, "#e8a15e"]],
    stars: 0.22,
    sun: true,
    roofs: "#2b1e35",
    ground: ["#3a2835", "#16121a"]
  };
  const NIGHT = {
    sky: [[0, "#060812"], [0.6, "#161129"], [1, "#4a2217"]],
    stars: 0.7,
    sun: false,
    roofs: "#0a0c1a",
    ground: ["#15121c", "#0d0d10"]
  };
  // The leaderboard: a Firebase project (Cloud Firestore, the free plan).
  // Anyone can read the board and add a run; nobody can change or delete one
  // (the project's Firestore rules say so). Until the project's details are
  // filled in here, the board stays hidden.
  const BOARD = { projectId: "", apiKey: "" };
  const BOARD_HTML = '<div class="rush-board" hidden><p class="rush-board-title mono">Top runners</p><ol class="rush-board-list"></ol></div>';
  const SHARE_URL = "https://matimbu.github.io/raywelfrancismartin/#malolos-rush";
  // ?fps in the address shows the frame rate, to see how an old phone copes
  const SHOW_FPS = /[?&]fps\b/.test(location.search);

  let dialog, canvas, g, distLabel, coinLabel, powerBar, fpsLabel, banner, startCard, overCard, overTitle, overScore, bestLabels, shareButton;
  let postForm, nameInput, postButton, postNote;
  let box = { left: 0, top: 0, width: 0, height: 0 };
  let trail = []; // where the finger (or the mouse, held down) has just been
  let lastRun = null; // the run that just ended, for its share card
  let cardBlob = null; // its share picture, made as soon as the run ends
  let carding = false; // drawing the share card (no streak on it)
  let cardLayers = null; // the share card's own sky
  let W = 0, H = 0, view = 0, DPR = 1, maxDPR = 2, f = 1, horizon = 0, camH = 1.8;
  let raf = 0, last = 0, state = "ready";
  let lane = 1, x = 0, y = 0, vy = 0, clock = 0, dist = 0, coins = 0, speed = 10, nextRow = 20, stride = 0;
  let magnet = 0; // seconds of ensaymada left
  let reached = 0, lit = 0, swapT = 0; // landmarks reached; the last one's lights (0 to 1); time since they came on
  let chase = 0, stumble = 0, caught = false; // seconds of guard left; of stumbling left; the guard got you
  let guardX = 0, guardGap = 3, guardSide = 1, guardStride = 0; // where he runs: across, how far behind you, which shoulder
  let honked = -9; // when a jeepney last honked
  let things = [];
  let sparks = []; // fireworks over the church
  let fireworks = []; // when the next ones go up
  let stars = [];
  let skyline = [];
  let layers = null; // the sunset and the night, drawn for the current size
  let glowSprite = null; // a street lamp's glow, drawn once
  let frameAvg = 16.7, dropped = 0, fpsFrames = 0, fpsSince = 0;
  let shown = "", powerShown = -1;
  let best = 0, posted = 0, myName = "", boardAsked = -1e9;
  let counted = false;
  const countedZones = {};
  const sprites = {}; // the pixel sprites, each drawn once
  try {
    best = Number(localStorage.getItem("malolosBest")) || 0;
    posted = Number(localStorage.getItem("malolosPosted")) || 0;
    myName = localStorage.getItem("malolosName") || "";
  } catch (e) {}

  const smooth = (t) => t * t * (3 - 2 * t);
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => {
    const p = hex(a);
    const q = hex(b);
    return `rgb(${p.map((v, i) => Math.round(v + (q[i] - v) * t)).join(",")})`;
  };
  const mixA = (p, q, t) => `rgba(${p.map((v, i) => (i < 3 ? Math.round(v + (q[i] - v) * t) : (v + (q[i] - v) * t).toFixed(3))).join(",")})`;
  // how far the sunset has gone: the sunset holds for 150 m, it's dusk by
  // Barasoain and night by 1200 m
  const duskAt = (d) => clamp01((d - 150) / 1050);

  // sounds, made here (no files) through the site's mixer, so the sound
  // switch on Sova's wall mutes them too
  function sound(kind) {
    if (window.rushTest) rushTest.sounds.push(kind);
    const ctx = typeof audio === "function" ? audio() : null;
    if (!ctx) return;
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.value = 0.35;
    out.connect(ctx.destination);
    const tone = (type, from, to, at, peak, len) => {
      const o = ctx.createOscillator();
      const gain = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(from, at);
      o.frequency.exponentialRampToValueAtTime(to, at + len);
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(peak, at + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + len);
      o.connect(gain).connect(out);
      o.start(at);
      o.stop(at + len + 0.05);
    };
    const hiss = (at, len, from, to, peak) => {
      const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * len), ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const band = ctx.createBiquadFilter();
      band.type = "bandpass";
      band.frequency.setValueAtTime(from, at);
      band.frequency.exponentialRampToValueAtTime(to, at + len);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, at);
      gain.gain.exponentialRampToValueAtTime(peak, at + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, at + len);
      src.connect(band).connect(gain).connect(out);
      src.start(at);
      src.stop(at + len + 0.05);
    };
    if (kind === "coin") {
      tone("sine", 1175, 1180, t, 0.18, 0.09);
      tone("sine", 1568, 1575, t + 0.06, 0.16, 0.16);
    } else if (kind === "jump") {
      hiss(t, 0.22, 700, 2400, 0.25);
    } else if (kind === "lane") {
      hiss(t, 0.12, 2200, 900, 0.12);
    } else if (kind === "crash") {
      tone("sine", 140, 45, t, 0.8, 0.45);
      hiss(t, 0.3, 900, 200, 0.5);
    } else if (kind === "horn") {
      // a jeepney's beep-beep: two short blasts, two notes each, a bit brassy
      [0, 0.19].forEach((d) => [415, 523].forEach((hz) => {
        const o = ctx.createOscillator();
        const warm = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        o.type = "sawtooth";
        o.frequency.value = hz;
        warm.type = "lowpass";
        warm.frequency.value = 1700;
        gain.gain.setValueAtTime(0.0001, t + d);
        gain.gain.exponentialRampToValueAtTime(0.11, t + d + 0.015);
        gain.gain.setValueAtTime(0.11, t + d + 0.1);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.14);
        o.connect(warm).connect(gain).connect(out);
        o.start(t + d);
        o.stop(t + d + 0.16);
      }));
    } else if (kind === "magnet") {
      [880, 1109, 1319, 1760].forEach((hz, i) => tone("triangle", hz, hz, t + i * 0.06, 0.14, 0.26));
    } else if (kind === "bells" || kind === "bells-low") {
      // church bells: three strikes, each with a bell's ringing overtones
      // (the cathedral's lower than Barasoain's)
      const notes = kind === "bells" ? [392, 330, 392] : [294, 247, 294];
      notes.forEach((hz, i) => {
        [[1, 0.3, 2.6], [2.76, 0.1, 1.5], [5.4, 0.05, 0.9], [0.5, 0.16, 3]].forEach(([ratio, peak, len]) => tone("sine", hz * ratio, hz * ratio * 0.998, t + i * 0.62, peak, len));
      });
    } else if (kind === "fanfare") {
      // Casa Real: a little brass fanfare, rising
      [[0, 392, 0.16], [0.16, 523, 0.16], [0.32, 659, 0.16], [0.5, 784, 0.7]].forEach(([d, hz, len]) => {
        const o = ctx.createOscillator();
        const warm = ctx.createBiquadFilter();
        const gain = ctx.createGain();
        o.type = "sawtooth";
        o.frequency.value = hz;
        warm.type = "lowpass";
        warm.frequency.value = 2200;
        gain.gain.setValueAtTime(0.0001, t + d);
        gain.gain.exponentialRampToValueAtTime(0.12, t + d + 0.03);
        gain.gain.setValueAtTime(0.12, t + d + len * 0.6);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + d + len);
        o.connect(warm).connect(gain).connect(out);
        o.start(t + d);
        o.stop(t + d + len + 0.05);
      });
    } else if (kind === "whistle" || kind === "caught") {
      // the guard's whistle: a trilled blast or two (one long one when he
      // gets you)
      const blasts = kind === "whistle" ? [[0, 0.22], [0.3, 0.42]] : [[0, 0.9]];
      blasts.forEach(([d, len]) => {
        const o = ctx.createOscillator();
        const trill = ctx.createOscillator();
        const depth = ctx.createGain();
        const gain = ctx.createGain();
        o.type = "sine";
        o.frequency.value = 2900;
        trill.type = "square";
        trill.frequency.value = 26;
        depth.gain.value = 140;
        trill.connect(depth).connect(o.frequency);
        gain.gain.setValueAtTime(0.0001, t + d);
        gain.gain.exponentialRampToValueAtTime(0.11, t + d + 0.02);
        gain.gain.setValueAtTime(0.11, t + d + len - 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + d + len);
        o.connect(gain).connect(out);
        o.start(t + d);
        trill.start(t + d);
        o.stop(t + d + len + 0.05);
        trill.stop(t + d + len + 0.05);
      });
      if (kind === "caught") tone("sine", 150, 50, t, 0.6, 0.4);
    } else if (kind === "stumble") {
      // a barrier knocked flat under your feet
      tone("sine", 190, 70, t, 0.45, 0.25);
      hiss(t, 0.28, 1600, 500, 0.3);
    } else if (kind === "pop") {
      tone("sine", 160, 60, t, 0.18, 0.22);
      hiss(t + 0.02, 0.5, 3200, 900, 0.06);
    }
  }

  function build() {
    dialog = document.createElement("dialog");
    dialog.className = "rush";
    dialog.setAttribute("aria-label", "Malolos Rush, a mini game");
    dialog.innerHTML = `
      <div class="rush-stage">
        <canvas class="rush-canvas" tabindex="-1" role="img" aria-label="A student running down a three-lane street in Malolos at sunset, toward its landmarks, with jeepneys, barriers and coins coming"></canvas>
        <button class="rush-close mono" type="button" aria-label="Close the game">✕</button>
        <div class="rush-hud mono" aria-hidden="true">${SHOW_FPS ? '<span class="rush-fps"></span>' : ""}<span class="rush-power" hidden><b></b></span><span class="rush-dist">0 m</span><span class="rush-coins">0</span></div>
        <div class="rush-banner" aria-live="polite"><p class="rush-banner-title"></p><p class="rush-banner-sub mono"></p></div>
        <div class="rush-card rush-start">
          <p class="rush-kicker mono">Crafts · a teaser</p>
          <h2 class="rush-title">Malolos <em>Rush</em></h2>
          <p class="rush-note">A tiny taste of my capstone game. The real one is 3D, in Unity.</p>
          <p class="rush-keys mono">Swipe left or right to change lanes · swipe up to jump (or ← → and ↑ / Space)<br>A jeepney ends the run · clip a barrier and a guard gives chase<br>Barasoain 500 m · the cathedral 1000 m · Casa Real 1500 m</p>
          <button class="rush-go mono" type="button">Run</button>
          <p class="rush-best mono"></p>
          ${BOARD_HTML}
        </div>
        <div class="rush-card rush-over" hidden>
          <p class="rush-kicker mono">Run over</p>
          <h2 class="rush-title rush-over-title"></h2>
          <p class="rush-score mono"></p>
          <div class="rush-actions">
            <button class="rush-go mono" type="button">Run again</button>
            <button class="rush-share mono" type="button">Share my run</button>
          </div>
          <form class="rush-post" hidden>
            <input class="rush-name" name="name" maxlength="16" autocomplete="nickname" enterkeyhint="send" spellcheck="false" placeholder="Your name" aria-label="Your name on the leaderboard" required>
            <button class="rush-post-go mono" type="submit">Post my run</button>
          </form>
          <p class="rush-post-note mono" hidden></p>
          <p class="rush-best mono"></p>
          ${BOARD_HTML}
        </div>
      </div>`;
    document.body.appendChild(dialog);
    canvas = dialog.querySelector(".rush-canvas");
    g = canvas.getContext("2d");
    distLabel = dialog.querySelector(".rush-dist");
    coinLabel = dialog.querySelector(".rush-coins");
    powerBar = dialog.querySelector(".rush-power b");
    fpsLabel = dialog.querySelector(".rush-fps");
    banner = dialog.querySelector(".rush-banner");
    startCard = dialog.querySelector(".rush-start");
    overCard = dialog.querySelector(".rush-over");
    overTitle = dialog.querySelector(".rush-over-title");
    overScore = dialog.querySelector(".rush-score");
    bestLabels = dialog.querySelectorAll(".rush-best");
    shareButton = dialog.querySelector(".rush-share");
    postForm = dialog.querySelector(".rush-post");
    nameInput = dialog.querySelector(".rush-name");
    postButton = dialog.querySelector(".rush-post-go");
    postNote = dialog.querySelector(".rush-post-note");
    postForm.addEventListener("submit", post);
    shareButton.addEventListener("click", (e) => {
      e.stopPropagation();
      shareRun();
    });
    dialog.querySelectorAll(".rush-go").forEach((b) => b.addEventListener("click", (e) => {
      e.stopPropagation();
      go();
    }));
    dialog.querySelector(".rush-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", stop);
    dialog.addEventListener("keydown", onKey);
    // Swipes, like Subway Surfers: left or right changes lanes, up jumps, down
    // drops out of a jump. Each swipe counts the moment it's long enough (no
    // waiting for the finger to lift), one move per swipe, and a mouse drag
    // works the same. A tap on the street only starts a run.
    let from = null;
    // (and a short streak follows the finger, so a swipe feels answered)
    const mark = (e) => {
      trail.push({ x: e.clientX - box.left, y: e.clientY - box.top, t: performance.now() });
      if (trail.length > 14) trail.shift();
    };
    canvas.addEventListener("pointerdown", (e) => {
      from = { x: e.clientX, y: e.clientY, done: false };
      trail = [];
      mark(e);
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (err) {}
    });
    canvas.addEventListener("pointermove", (e) => {
      if (from) mark(e);
      if (!from || from.done || state !== "running") return;
      const dx = e.clientX - from.x;
      const dy = e.clientY - from.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      from.done = true;
      if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
      else if (dy < 0) jump();
      else drop();
    });
    canvas.addEventListener("pointerup", () => {
      const tapped = from && !from.done;
      from = null;
      if (tapped && state !== "running") go();
    });
    canvas.addEventListener("pointercancel", () => (from = null));
    addEventListener("resize", () => dialog.open && size());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && state === "running") pause();
    });
  }

  function size() {
    const next = canvas.getBoundingClientRect();
    DPR = Math.min(maxDPR, devicePixelRatio || 1);
    canvas.width = Math.round(next.width * DPR);
    canvas.height = Math.round(next.height * DPR);
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    // (a new sharpness alone keeps the same stars and roofs)
    if (next.width !== box.width || next.height !== box.height || !W) geometry(next.width, next.height);
    box = next;
    layers = null;
    draw();
  }

  // The view for a screen of w x h: lanes 0.36 of the width apart at the
  // runner, the runner's feet near the bottom, stars and the town's roofs.
  // (The share card frames it as if only span wide, a wider shot of the
  // street, with the horizon a little lower to leave the sky for the title.)
  function geometry(w, h, span = w, sky = 0.36) {
    W = w;
    H = h;
    view = span;
    f = (0.36 * view * PZ) / 0.7;
    horizon = H * sky;
    camH = ((H * 0.86 - horizon) * PZ) / f;
    stars = Array.from({ length: Math.round((46 * W) / view) }, () => [Math.random() * W, Math.random() * horizon * 0.9, Math.random() * 1.2 + 0.3]);
    skyline = [];
    for (let sx = 0; sx < W; ) {
      const bw = view * (0.04 + Math.random() * 0.07);
      skyline.push([sx, bw, view * (0.02 + Math.random() * 0.06)]);
      sx += bw;
    }
  }

  function reset() {
    lane = 1;
    x = 0;
    y = 0;
    vy = 0;
    clock = 0;
    dist = 0;
    coins = 0;
    speed = 10;
    nextRow = 30; // (a gentle start: the first row is only coins)
    things = [];
    magnet = 0;
    reached = 0;
    lit = 0;
    swapT = 0;
    chase = 0;
    stumble = 0;
    caught = false;
    guardGap = 3;
    guardStride = 0;
    honked = -9;
    sparks = [];
    fireworks = [];
    cardBlob = null;
    frameAvg = 16.7;
    dropped = 0;
    shown = "";
    powerShown = -1;
    if (banner) banner.classList.remove("on");
    hud();
  }

  function start() {
    reset();
    state = "running";
    startCard.hidden = true;
    overCard.hidden = true;
    canvas.focus({ preventScroll: true });
    if (!counted && window.goatcounter && window.goatcounter.count) {
      counted = true;
      window.goatcounter.count({ path: "malolos-rush-play", title: "Played Malolos Rush", event: true });
    }
    last = fpsSince = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(loop);
  }

  function pause() {
    state = "paused";
    cancelAnimationFrame(raf);
    startCard.hidden = false;
    startCard.querySelector(".rush-go").textContent = "Keep running";
  }

  // the Run button, a tap, Space or Enter: start a run, or carry on after a pause
  function go() {
    if (state === "paused") resume();
    else start();
  }

  function resume() {
    startCard.hidden = true;
    startCard.querySelector(".rush-go").textContent = "Run";
    state = "running";
    canvas.focus({ preventScroll: true });
    last = fpsSince = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    cancelAnimationFrame(raf);
    state = "ready";
    if (typeof holdPage === "function") holdPage(false);
    // came in by the shared link: drop it, so a reload doesn't open the game again
    if (location.hash === "#malolos-rush") history.replaceState(null, "", location.pathname + location.search);
  }

  function over(why) {
    state = "over";
    cancelAnimationFrame(raf);
    sound(why === "guard" ? "caught" : "crash");
    const meters = Math.floor(dist);
    const record = meters > best;
    if (record) {
      best = meters;
      try {
        localStorage.setItem("malolosBest", String(best));
      } catch (e) {}
    }
    overTitle.textContent = why === "jeep" ? "Hit a jeepney!" : why === "guard" ? "Caught by the guard!" : "Tripped!";
    overScore.textContent = `${meters} m · ${coins} ${coins === 1 ? "coin" : "coins"}${record ? " · new best" : ""}`;
    const run = (lastRun = { meters, coins, record, why, reached });
    showBest();
    overCard.hidden = false;
    trail = [];
    banner.classList.remove("on");
    draw();
    // the share picture, made now so it's ready the moment Share is tapped (a
    // phone's share sheet only opens straight from the tap)
    setTimeout(() => shareCard().then((b) => {
      if (lastRun === run) cardBlob = b;
    }).catch(() => {}), 80);
    offerPost();
  }

  // made it to a landmark: its lights, bells (or a fanfare), fireworks and coins
  function arrive(k) {
    const zone = ZONES[k];
    reached = k + 1;
    lit = 0;
    swapT = 0;
    coins += zone.bonus;
    sound(zone.sound);
    say(zone.name, `${zone.line} · +${zone.bonus} coins`);
    fireworks = [0.25, 0.6, 1, 1.45].map((d) => clock + d);
    if (!countedZones[zone.event] && window.goatcounter && window.goatcounter.count) {
      countedZones[zone.event] = true;
      window.goatcounter.count({ path: `malolos-rush-${zone.event}`, title: `Reached ${zone.name} in Malolos Rush`, event: true });
    }
  }

  // Clipped a barrier: it goes flat, you stumble, and a guard comes after
  // you for a while. Clip another while he's there and he has you.
  function clip() {
    chase = CHASE;
    stumble = 0.6;
    guardSide = x > 0.1 ? -1 : 1;
    guardX = x + guardSide * 0.42;
    sound("stumble");
    sound("whistle");
    say("Guard!", "Clip one more barrier and he's got you");
  }

  // (he grabs from beside you, so you both stay in the picture)
  function catchUp() {
    caught = true;
    guardGap = 0.5;
    guardX = x + guardSide * 0.36;
    hud();
    over("guard");
  }

  function grab() {
    magnet = MAGNET;
    sound("magnet");
    say("Ensaymada!", "The coins come to you for a while");
  }

  // a word across the sky for a moment
  function say(title, sub) {
    banner.querySelector(".rush-banner-title").textContent = title;
    banner.querySelector(".rush-banner-sub").textContent = sub;
    banner.classList.remove("on");
    void banner.offsetWidth;
    banner.classList.add("on");
    clearTimeout(say.t);
    say.t = setTimeout(() => banner.classList.remove("on"), 2600);
  }

  function burst() {
    const colors = ["#f5b841", "#ff5a1f", "#fff4dc", "#ffd392"];
    const bx = W * (0.28 + Math.random() * 0.44);
    const by = horizon * (0.22 + Math.random() * 0.26);
    const color = colors[Math.floor(Math.random() * colors.length)];
    for (let k = 0; k < 28; k++) {
      const a = (k / 28) * Math.PI * 2;
      const v = view * (0.1 + Math.random() * 0.12);
      sparks.push({ x: bx, y: by, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, color });
    }
    sound("pop");
  }

  // Share the run: a picture of how it ended (the street, the crash) with
  // the numbers, and a line with the link that opens the game. The share
  // sheet on phones; on computers the picture and the line are copied.
  function shareText() {
    const run = lastRun || { meters: 0, coins: 0 };
    return `I ran ${run.meters} m${run.coins ? ` and grabbed ${run.coins} ${run.coins === 1 ? "coin" : "coins"}` : ""} in Malolos Rush on Raywel's site. Beat that:`;
  }

  async function shareCard() {
    await Promise.all(["700 90px Geist", "italic 400 90px 'Instrument Serif'", "400 20px 'Geist Mono'"]
      .map((font) => document.fonts.load(font).catch(() => {})));
    if (state === "running") return null;
    const CW = 1080;
    const CH = 1350;
    const scene = 1060; // the street's height on the card
    const card = document.createElement("canvas");
    card.width = CW;
    card.height = CH;
    const c = card.getContext("2d");
    c.fillStyle = "#0a0a0a";
    c.fillRect(0, 0, CW, CH);
    // the street as it was when the run ended, drawn again as a wider shot
    const keep = { g, W, H, view, f, horizon, camH, stars, skyline };
    g = c;
    carding = true;
    c.save();
    c.beginPath();
    c.rect(0, 0, CW, scene);
    c.clip();
    geometry(CW, scene, 640, 0.4);
    cardLayers = makeLayers(1);
    draw();
    c.restore();
    carding = false;
    cardLayers = null;
    ({ g, W, H, view, f, horizon, camH, stars, skyline } = keep);
    // fade the street into the panel below
    const fade = c.createLinearGradient(0, scene - 280, 0, scene);
    fade.addColorStop(0, "rgba(10,10,10,0)");
    fade.addColorStop(1, "rgba(10,10,10,1)");
    c.fillStyle = fade;
    c.fillRect(0, scene - 280, CW, 280);
    c.textAlign = "left";
    c.textBaseline = "alphabetic";
    // the title over the sky
    c.fillStyle = "rgba(242,240,235,0.6)";
    c.font = "400 22px 'Geist Mono', monospace";
    c.fillText("RAYWEL MARTIN  ·  A TEASER OF MY CAPSTONE", 76, 84);
    c.fillStyle = "#f2f0eb";
    c.font = "700 110px Geist, sans-serif";
    c.fillText("Malolos", 72, 196);
    const word = c.measureText("Malolos ").width;
    c.fillStyle = "#ff5a1f";
    c.font = "italic 400 124px 'Instrument Serif', serif";
    c.fillText("Rush", 72 + word, 196);
    // the numbers
    const run = lastRun || { meters: 0, coins: 0 };
    c.fillStyle = "#f2f0eb";
    c.font = "italic 400 190px 'Instrument Serif', serif";
    c.fillText(`${run.meters} m`, 64, 1170);
    c.fillStyle = "#f7c948";
    c.beginPath();
    c.arc(88, 1229, 14, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = "#b9b5ad";
    c.font = "400 28px 'Geist Mono', monospace";
    c.fillText(`${run.coins} ${run.coins === 1 ? "COIN" : "COINS"}   ·   BEST ${best} M`, 118, 1239);
    if (run.reached) {
      c.fillStyle = "#f5b841";
      c.textAlign = "right";
      c.fillText(`REACHED ${["BARASOAIN", "THE CATHEDRAL", "CASA REAL"][run.reached - 1]}`, CW - 72, 1239);
      c.textAlign = "left";
    }
    c.fillStyle = "#8f8c86";
    c.font = "400 23px 'Geist Mono', monospace";
    c.fillText("BEAT IT  →  MATIMBU.GITHUB.IO/RAYWELFRANCISMARTIN/#MALOLOS-RUSH", 72, 1296);
    return new Promise((done) => card.toBlob(done, "image/png"));
  }

  async function shareRun() {
    if (!lastRun) return;
    const label = shareButton;
    const tell = (text) => {
      label.textContent = text;
      clearTimeout(label.back);
      label.back = setTimeout(() => (label.textContent = "Share my run"), 1800);
    };
    if (window.goatcounter && window.goatcounter.count) {
      window.goatcounter.count({ path: "malolos-rush-share", title: "Shared a Malolos Rush run", event: true });
    }
    const text = `${shareText()} ${SHARE_URL}`;
    const blob = cardBlob || (await shareCard().catch(() => null));
    // phones: the share sheet, with the picture when it takes files
    if (navigator.share && matchMedia("(pointer: coarse)").matches) {
      const file = blob && new File([blob], "malolos-rush.png", { type: "image/png" });
      try {
        if (file && navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], text });
        else await navigator.share({ title: "Malolos Rush", text: shareText(), url: SHARE_URL });
      } catch (e) {}
      return;
    }
    // computers: the picture and the line on the clipboard together
    try {
      if (!blob || !window.ClipboardItem) throw new Error("no picture");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob, "text/plain": new Blob([text], { type: "text/plain" }) })]);
      return tell("Picture copied");
    } catch (e) {}
    try {
      await navigator.clipboard.writeText(text);
      tell("Link copied");
    } catch (e) {
      tell("Couldn't copy");
    }
  }

  // ---- the leaderboard (Cloud Firestore, through its plain web address) ----
  function boardUrl() {
    return `https://firestore.googleapis.com/v1/projects/${BOARD.projectId}/databases/(default)/documents`;
  }

  // the ten best runners, each once (their best run)
  async function loadBoard() {
    const res = await fetch(`${boardUrl()}:runQuery?key=${BOARD.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ structuredQuery: { from: [{ collectionId: "malolosRush" }], orderBy: [{ field: { fieldPath: "meters" }, direction: "DESCENDING" }], limit: 40 } })
    });
    if (!res.ok) throw new Error(String(res.status));
    const seen = {};
    const top = [];
    (await res.json()).forEach((row) => {
      const fields = row.document && row.document.fields;
      if (!fields || !fields.name || !fields.meters) return;
      const name = String(fields.name.stringValue || "").slice(0, 16);
      const key = name.toLowerCase();
      if (!name || seen[key] || top.length >= 10) return;
      seen[key] = true;
      top.push({ name, meters: Number(fields.meters.integerValue) || 0 });
    });
    return top;
  }

  function refreshBoard(force) {
    if (!BOARD.projectId || (!force && performance.now() - boardAsked < 20000)) return;
    boardAsked = performance.now();
    loadBoard().then(renderBoard).catch(() => {});
  }

  function renderBoard(top) {
    dialog.querySelectorAll(".rush-board").forEach((board) => {
      board.hidden = false;
      const list = board.querySelector(".rush-board-list");
      list.textContent = "";
      if (!top.length) {
        const li = document.createElement("li");
        li.className = "rush-board-empty";
        li.textContent = "No runs yet. Be the first.";
        list.appendChild(li);
        return;
      }
      top.slice(0, 5).forEach((r, i) => {
        const li = document.createElement("li");
        if (myName && r.name.toLowerCase() === myName.toLowerCase()) li.className = "me";
        [String(i + 1), r.name, `${r.meters} m`].forEach((text) => {
          const span = document.createElement("span");
          span.textContent = text;
          li.appendChild(span);
        });
        list.appendChild(li);
      });
    });
  }

  // after a run: a name box to post it, when it beats the best already posted
  function offerPost() {
    if (!BOARD.projectId) return;
    const can = lastRun.meters >= 10 && lastRun.meters > posted;
    postForm.hidden = !can;
    postNote.hidden = can || !posted;
    if (can) {
      nameInput.value = myName;
      postButton.disabled = false;
      postButton.textContent = posted ? "Post my new best" : "Post my run";
    } else if (posted) {
      postNote.textContent = `Your best on the board: ${posted} m`;
    }
    refreshBoard();
  }

  async function post(e) {
    e.preventDefault();
    const name = nameInput.value.replace(/[\u0000-\u001f<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 16);
    if (!name || !lastRun) return nameInput.focus();
    const run = lastRun;
    postButton.disabled = true;
    postButton.textContent = "Posting…";
    try {
      const res = await fetch(`${boardUrl()}/malolosRush?key=${BOARD.apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: { name: { stringValue: name }, meters: { integerValue: String(run.meters) }, coins: { integerValue: String(Math.min(run.coins, run.meters)) } } })
      });
      if (!res.ok) throw new Error(String(res.status));
      myName = name;
      posted = run.meters;
      try {
        localStorage.setItem("malolosName", name);
        localStorage.setItem("malolosPosted", String(posted));
      } catch (err) {}
      if (window.goatcounter && window.goatcounter.count) {
        window.goatcounter.count({ path: "malolos-rush-post", title: "Posted a Malolos Rush run", event: true });
      }
      postForm.hidden = true;
      postNote.textContent = "Posted!";
      postNote.hidden = false;
      boardAsked = performance.now();
      const top = await loadBoard();
      renderBoard(top);
      const rank = top.findIndex((r) => r.name.toLowerCase() === name.toLowerCase());
      if (rank >= 0) postNote.textContent = `Posted. You're #${rank + 1} on the board`;
    } catch (err) {
      if (!postForm.hidden) {
        postButton.disabled = false;
        postButton.textContent = "Couldn't post · try again";
      }
    }
  }

  function showBest() {
    bestLabels.forEach((b) => (b.textContent = best ? `Best: ${best} m` : ""));
  }

  function move(dir) {
    const next = Math.max(0, Math.min(2, lane + dir));
    if (next === lane) return;
    lane = next;
    sound("lane");
  }

  function jump() {
    if (y > 0.001) return;
    vy = JUMP;
    sound("jump");
  }

  // swipe down (or down / S) in the air: come straight back down
  function drop() {
    if (y > 0.05) vy = Math.min(vy, -9);
  }

  function onKey(e) {
    if (e.target.tagName === "INPUT") return; // typing a name
    const k = e.key;
    if (k === "ArrowLeft" || k === "a" || k === "A") move(-1);
    else if (k === "ArrowRight" || k === "d" || k === "D") move(1);
    else if (k === "ArrowDown" || k === "s" || k === "S") drop();
    else if (k === "ArrowUp" || k === "w" || k === "W" || k === " ") {
      if (state === "running") jump();
      else if (e.target.tagName !== "BUTTON") go();
    } else if (k === "Enter" && state !== "running" && e.target.tagName !== "BUTTON") go();
    else return;
    e.preventDefault();
  }

  // what comes down the road, a row at a time: jeepneys (go around them),
  // barriers (jump them) and coins, always with a way through; now and then
  // an ensaymada in the open lane instead of the coins
  function row(z) {
    if (z < 40) {
      for (let k = 0; k < 5; k++) things.push({ type: "coin", x: LANES[1], z: z - 2 + k * 1.3, y: 0.45 });
      return;
    }
    const r = Math.random();
    if (r < 0.16 && dist > 70) {
      LANES.forEach((lx) => things.push({ type: "barrier", x: lx, z, w: 0.6, h: 0.34, d: 0.25 }));
      const lx = LANES[Math.floor(Math.random() * 3)];
      for (let k = 0; k < 5; k++) things.push({ type: "coin", x: lx, z: z - 2.4 + k * 1.2, y: 0.45 + Math.sin((k / 4) * Math.PI) * 0.75 });
      return;
    }
    const order = [0, 1, 2].sort(() => Math.random() - 0.5);
    const blocked = r < 0.62 ? 1 : 2;
    for (let k = 0; k < blocked; k++) {
      const jeep = Math.random() < 0.58;
      things.push(jeep
        ? { type: "jeep", x: LANES[order[k]], z: z + 0.9, w: 0.62, h: 1, d: 1.8, paint: Math.floor(Math.random() * 3) }
        : { type: "barrier", x: LANES[order[k]], z, w: 0.6, h: 0.34, d: 0.25 });
    }
    if (Math.random() < 0.75) {
      const lx = LANES[order[blocked]];
      if (dist > 90 && magnet <= 0 && Math.random() < 0.09 && !things.some((t) => t.type === "ensaymada")) {
        things.push({ type: "ensaymada", x: lx, z, y: 0.5 });
      } else {
        for (let k = 0; k < 5; k++) things.push({ type: "coin", x: lx, z: z - 2 + k * 1.3, y: 0.45 });
      }
    }
  }

  function loop(now) {
    // (the frame's time can be a hair before the run started: never go backwards)
    const gap = now - last;
    const dt = Math.max(0, Math.min(0.05, gap / 1000));
    last = now;
    clock += dt;
    // (a stumble costs a moment of speed)
    speed = (10 + Math.min(10, clock * 0.12)) * (1 - 0.35 * (stumble / 0.6));
    dist += speed * dt;
    stride += dt * speed * 0.9;
    // the runner slides to its lane and falls back after a jump
    x += (LANES[lane] - x) * Math.min(1, dt * 16);
    if (y > 0 || vy > 0) {
      vy -= GRAVITY * dt;
      y = Math.max(0, y + vy * dt);
      if (y === 0) vy = 0;
    }
    while (dist + FAR > nextRow) {
      row(nextRow);
      nextRow += Math.max(7.5, 14 - clock * 0.08);
    }
    // the landmarks: the next one reached, the last one's lights coming on
    if (reached < ZONES.length && dist >= ZONES[reached].at) arrive(reached);
    if (reached) {
      if (lit < 1) lit = Math.min(1, lit + dt / 1.2);
      else swapT += dt;
    }
    // the guard: right behind you after a clipped barrier, dropping back
    // (off the bottom of the screen) as the chase runs out, keeping to the
    // shoulder nearer the middle of the road
    if (stumble > 0) stumble = Math.max(0, stumble - dt);
    if (chase > 0) {
      chase = Math.max(0, chase - dt);
      if (x > 0.1) guardSide = -1;
      else if (x < -0.1) guardSide = 1;
      guardX += (x + guardSide * 0.42 - guardX) * Math.min(1, dt * 4);
      guardGap = 0.75 + 1.9 * (1 - chase / CHASE);
      guardStride += dt * speed * 1.1;
    }
    if (fireworks.length && clock >= fireworks[0]) {
      fireworks.shift();
      burst();
    }
    if (sparks.length) {
      sparks.forEach((s) => {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vy += view * 0.12 * dt;
        s.vx *= 1 - dt * 0.8;
        s.life -= dt / 1.5;
      });
      sparks = sparks.filter((s) => s.life > 0);
    }
    const me = dist + PZ;
    // an ensaymada: the coins nearby fly to the runner
    if (magnet > 0) {
      magnet = Math.max(0, magnet - dt);
      const pull = Math.min(1, dt * 7);
      for (const t of things) {
        const dz = t.z - me;
        if (t.type !== "coin" || t.gone || dz > 16 || dz < -0.5) continue;
        t.x += (x - t.x) * pull;
        t.y += (y + 0.45 - t.y) * pull;
        t.z += (me - t.z) * Math.min(1, dt * 3.5);
      }
    }
    // what reaches the runner
    for (const t of things) {
      if (t.gone || t.hit) continue;
      const dz = t.z - me;
      if (t.type === "coin" || t.type === "ensaymada") {
        if (Math.abs(dz) < 0.6 && Math.abs(t.x - x) < 0.45 && Math.abs(t.y - (y + 0.45)) < 0.7) {
          t.gone = true;
          if (t.type === "ensaymada") grab();
          else {
            coins++;
            sound("coin");
          }
        }
        continue;
      }
      // a jeepney coming down your lane honks, once
      if (t.type === "jeep" && !t.honked && dz - t.d / 2 > 3 && dz - t.d / 2 < 13 && Math.abs(t.x - LANES[lane]) < 0.1) {
        t.honked = true;
        if (clock - honked > 0.8) {
          honked = clock;
          sound("horn");
        }
      }
      if (Math.abs(dz) < t.d / 2 + 0.3 && Math.abs(t.x - x) < 0.5 && y < t.h - 0.05 && !(window.rushTest && rushTest.ghosting)) {
        if (t.type === "barrier") {
          t.hit = true; // knocked flat: it won't trip anyone again
          if (chase > 0) return catchUp();
          clip();
          continue;
        }
        hud();
        return over(t.type);
      }
    }
    things = things.filter((t) => !t.gone && t.z - dist > 0.6);
    // A phone that can't keep up (under about 42 frames a second) draws fewer
    // pixels: the picture gets a little softer and the run stays smooth
    if (gap > 0 && gap < 250) frameAvg = frameAvg * 0.94 + gap * 0.06;
    if (clock > 2.5 && frameAvg > 24 && DPR > 1 && clock - dropped > 3) {
      dropped = clock;
      maxDPR = Math.max(1, DPR - 0.5);
      frameAvg = 16.7;
      size();
    }
    if (fpsLabel) {
      fpsFrames++;
      if (now - fpsSince > 500) {
        fpsLabel.textContent = `${Math.round((fpsFrames * 1000) / (now - fpsSince))} fps · ${DPR}x`;
        fpsFrames = 0;
        fpsSince = now;
      }
    }
    hud();
    draw();
    raf = requestAnimationFrame(loop);
  }

  // the numbers at the top, touched only when they change
  function hud() {
    const key = `${Math.floor(dist)}|${coins}`;
    if (key !== shown) {
      shown = key;
      distLabel.textContent = `${Math.floor(dist)} m`;
      coinLabel.textContent = String(coins);
    }
    const left = magnet > 0 ? Math.ceil((magnet / MAGNET) * 40) / 40 : 0;
    if (left !== powerShown) {
      powerShown = left;
      powerBar.parentNode.hidden = !left;
      powerBar.style.transform = `scaleX(${left})`;
    }
  }

  // A point down the road, on screen: x across (lanes at -0.7, 0, 0.7), y up
  // from the street, z ahead of the camera. Returns [left, top, scale].
  function at(wx, wy, wz) {
    const s = f / wz;
    return [W / 2 + wx * s, horizon + (camH - wy) * s, s];
  }

  // the sky, the sun, the stars, the town's roofs and the ground, drawn
  // once per size for the sunset and for the night
  function makeLayers(scale) {
    return [SUNSET, NIGHT].map((pal) => {
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.round(W * scale));
      c.height = Math.max(1, Math.round(H * scale));
      const k = c.getContext("2d");
      k.setTransform(scale, 0, 0, scale, 0, 0);
      const sky = k.createLinearGradient(0, 0, 0, horizon);
      pal.sky.forEach(([stop, color]) => sky.addColorStop(stop, color));
      k.fillStyle = sky;
      k.fillRect(0, 0, W, horizon + 1);
      k.fillStyle = `rgba(255,255,255,${pal.stars})`;
      stars.forEach(([sx, sy, r]) => {
        if (!pal.sun || sy < horizon * 0.45) k.fillRect(sx, sy, r, r);
      });
      if (pal.sun) {
        // low and soft, off to the right of the church, half behind the roofs
        const sx = W / 2 + view * 0.26;
        const sy = horizon - view * 0.03;
        const r = view * 0.055;
        const halo = k.createRadialGradient(sx, sy, r * 0.5, sx, sy, r * 5);
        halo.addColorStop(0, "rgba(255,196,120,0.45)");
        halo.addColorStop(1, "rgba(255,160,90,0)");
        k.fillStyle = halo;
        k.fillRect(sx - r * 5, sy - r * 5, r * 10, r * 10);
        k.fillStyle = "#ffd392";
        k.beginPath();
        k.arc(sx, sy, r, 0, Math.PI * 2);
        k.fill();
      }
      k.fillStyle = pal.roofs;
      skyline.forEach(([sx, w, h]) => k.fillRect(sx, horizon - h, w + 1, h));
      const ground = k.createLinearGradient(0, horizon, 0, H);
      ground.addColorStop(0, pal.ground[0]);
      ground.addColorStop(1, pal.ground[1]);
      k.fillStyle = ground;
      k.fillRect(0, horizon, W, H - horizon);
      return c;
    });
  }

  function draw() {
    if (!W) return;
    const dusk = duskAt(dist);
    const sky = cardLayers || layers || (layers = makeLayers(DPR));
    g.drawImage(sky[0], 0, 0, W, H);
    if (dusk > 0.01) {
      g.globalAlpha = dusk;
      g.drawImage(sky[1], 0, 0, W, H);
      g.globalAlpha = 1;
    }
    landmarks(dusk);
    if (!carding) {
      sparks.forEach((s) => {
        g.globalAlpha = Math.max(0, s.life);
        g.fillStyle = s.color;
        g.fillRect(s.x - 1.5, s.y - 1.5, 3, 3);
      });
      g.globalAlpha = 1;
    }
    // the street
    const near = 0.8;
    const [lnx, lny] = at(-1.05, 0, near);
    const [rnx] = at(1.05, 0, near);
    const [lfx, lfy] = at(-1.05, 0, FAR);
    const [rfx] = at(1.05, 0, FAR);
    g.fillStyle = mix("#33282f", "#1c1c22", dusk);
    g.beginPath();
    g.moveTo(lnx, lny);
    g.lineTo(rnx, lny);
    g.lineTo(rfx, lfy);
    g.lineTo(lfx, lfy);
    g.closePath();
    g.fill();
    // curbs
    g.strokeStyle = mixA([255, 205, 140, 0.45], [255, 190, 120, 0.35], dusk);
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(lnx, lny);
    g.lineTo(lfx, lfy);
    g.moveTo(rnx, lny);
    g.lineTo(rfx, lfy);
    g.stroke();
    // lane dashes, moving with the run
    g.fillStyle = mixA([250, 232, 205, 0.6], [242, 240, 235, 0.55], dusk);
    for (let k = 0; k < 22; k++) {
      const z0 = k * 3 - (dist % 3) + 0.2;
      if (z0 < near) continue;
      [-0.35, 0.35].forEach((lx) => {
        const [x0, y0, s0] = at(lx, 0, z0);
        const [x1, y1, s1] = at(lx, 0, z0 + 1.3);
        g.beginPath();
        g.moveTo(x0 - 0.03 * s0, y0);
        g.lineTo(x0 + 0.03 * s0, y0);
        g.lineTo(x1 + 0.03 * s1, y1);
        g.lineTo(x1 - 0.03 * s1, y1);
        g.fill();
      });
    }
    // street lamps along the sidewalks, warm (only just on at sunset)
    const lamps = [];
    for (let k = 0; k < 8; k++) {
      const z = k * 9 - (dist % 9) + 2;
      if (z > near) lamps.push(z);
    }
    const bright = 0.55 + 0.45 * dusk;
    lamps.sort((a, b) => b - a).forEach((z) => [-1.45, 1.45].forEach((lx) => lamp(lx, z, bright)));
    // things, far to near, with the runner (and the guard behind him) among them
    const list = things.map((t) => ({ t, z: t.z - dist })).filter((o) => o.z > near && o.z < FAR + 2);
    list.push({ who: "runner", z: PZ });
    if ((chase > 0 || caught) && PZ - guardGap > near) list.push({ who: "guard", z: PZ - guardGap });
    list.sort((a, b) => b.z - a.z);
    list.forEach((o) => {
      if (o.who === "runner") runner();
      else if (o.who === "guard") guard(o.z);
      else if (o.t.type === "coin") coin(o.t, o.z);
      else if (o.t.type === "ensaymada") ensaymada(o.t, o.z);
      else if (o.t.type === "barrier") barrier(o.t, o.z);
      else jeepney(o.t, o.z, dusk);
    });
    // a warm haze over the far end
    const fog = g.createLinearGradient(0, horizon, 0, horizon + H * 0.12);
    fog.addColorStop(0, mixA([214, 120, 80, 0.35], [74, 34, 23, 0.55], dusk));
    fog.addColorStop(1, mixA([214, 120, 80, 0], [74, 34, 23, 0], dusk));
    g.fillStyle = fog;
    g.fillRect(0, horizon, W, H * 0.12);
    if (!carding) streak();
  }

  // the swipe's streak along the finger's last quarter second: thick at the
  // finger, thin at the tail, white in an orange glow (flat layers rather
  // than a blur, which old phones draw slowly)
  function streak() {
    const now = performance.now();
    const live = trail.filter((p) => now - p.t < 260);
    if (live.length < 2) return;
    ribbon(live, now, 12, "rgba(255,110,40,0.13)");
    ribbon(live, now, 7, "rgba(255,110,40,0.24)");
    ribbon(live, now, 3.5, "rgba(255,255,255,0.92)");
    const head = live[live.length - 1];
    g.beginPath();
    g.arc(head.x, head.y, 3.5 * (1 - (now - head.t) / 260), 0, Math.PI * 2);
    g.fill();
  }

  function ribbon(live, now, width, color) {
    const left = [];
    const right = [];
    live.forEach((p, k) => {
      const q = live[Math.max(0, k - 1)];
      const r = live[Math.min(live.length - 1, k + 1)];
      const len = Math.hypot(r.x - q.x, r.y - q.y) || 1;
      const half = width * (1 - (now - p.t) / 260);
      const nx = (-(r.y - q.y) / len) * half;
      const ny = ((r.x - q.x) / len) * half;
      left.push([p.x + nx, p.y + ny]);
      right.push([p.x - nx, p.y - ny]);
    });
    g.fillStyle = color;
    g.beginPath();
    left.forEach(([px, py], k) => (k ? g.lineTo(px, py) : g.moveTo(px, py)));
    right.reverse().forEach(([px, py]) => g.lineTo(px, py));
    g.closePath();
    g.fill();
  }

  // The landmark at the end of the road, a navy silhouette trimmed in gold:
  // it grows as you close in and its lights come on when you reach it; a
  // moment later it passes out of sight as the next one comes into view.
  function landmarks(dusk) {
    const unit = (grow, zone) => {
      const u = view * 0.0105 * grow; // one unit of the facade
      return carding ? Math.min(u, (horizon - 220) / zone.tall) : u; // (kept under the card's title)
    };
    const swap = clamp01((swapT - 1.3) / 1.5);
    const done = reached - 1; // the one reached last
    const next = reached < ZONES.length ? reached : -1;
    if (done >= 0 && (next < 0 || swap < 1)) {
      const zone = ZONES[done];
      // (the last one stays put, lit, at the end of the road)
      zone.draw(W / 2, horizon, unit(next < 0 ? 1.4 : 1.4 + 0.5 * swap, zone), dusk, lit, next < 0 ? 1 : 1 - swap);
    }
    if (next >= 0 && (done < 0 || swap > 0)) {
      const zone = ZONES[next];
      const from = next ? ZONES[next - 1].at : 0;
      const grow = 1 + 0.4 * smooth(clamp01((dist - from) / (zone.at - from)));
      zone.draw(W / 2, horizon, unit(grow, zone), dusk, 0, done < 0 ? 1 : swap);
    }
    g.globalAlpha = 1;
  }

  // what the landmarks share: a warm glow once lit, the gold trim, lit
  // windows and an arched door
  function glowBehind(cx, cy, r, lit) {
    if (lit <= 0) return;
    const glow = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    glow.addColorStop(0, `rgba(255,190,110,${(0.4 * lit).toFixed(3)})`);
    glow.addColorStop(1, "rgba(255,160,90,0)");
    g.fillStyle = glow;
    g.fillRect(cx - r, cy - r, r * 2, r * 2);
  }

  // (caught by the low sun, then glowing once the lights are on)
  function trim(u, dusk, lit, path) {
    g.strokeStyle = `rgba(245,184,65,${Math.max(0.12, 0.34 - 0.2 * dusk + 0.6 * lit).toFixed(3)})`;
    g.lineWidth = Math.max(1, 0.3 * u);
    g.beginPath();
    path();
    g.stroke();
  }

  const windowLight = (lit) => `rgba(255,${Math.round(184 + 30 * lit)},${Math.round(107 + 50 * lit)},${(0.55 + 0.45 * lit).toFixed(3)})`;

  function door(cx, base, u, lit) {
    g.fillStyle = `rgba(255,184,107,${(0.35 + 0.45 * lit).toFixed(3)})`;
    g.beginPath();
    g.moveTo(cx - 2 * u, base);
    g.lineTo(cx - 2 * u, base - 4 * u);
    g.arc(cx, base - 4 * u, 2 * u, Math.PI, 0);
    g.lineTo(cx + 2 * u, base);
    g.fill();
  }

  // Malolos Cathedral: a broad front under a pointed gable, its dome behind,
  // and a square bell tower with a pyramid roof on the right
  function cathedral(cx, base, u, dusk, lit, alpha) {
    g.globalAlpha = alpha;
    glowBehind(cx + 3 * u, base - 12 * u, 34 * u, lit);
    g.fillStyle = mix("#241e3f", "#0e1022", dusk);
    g.beginPath();
    g.arc(cx + 3 * u, base - 15 * u, 6 * u, Math.PI, 0);
    g.fill();
    g.fillRect(cx + 2.4 * u, base - 23 * u, 1.2 * u, 2.4 * u);
    g.fillRect(cx - 12 * u, base - 15 * u, 24 * u, 15 * u);
    g.beginPath();
    g.moveTo(cx - 12.6 * u, base - 15 * u);
    g.lineTo(cx, base - 21.5 * u);
    g.lineTo(cx + 12.6 * u, base - 15 * u);
    g.closePath();
    g.fill();
    g.fillRect(cx - 0.3 * u, base - 24.7 * u, 0.6 * u, 3.4 * u);
    g.fillRect(cx - 1.1 * u, base - 23.8 * u, 2.2 * u, 0.6 * u);
    g.fillRect(cx + 12 * u, base - 25 * u, 6 * u, 25 * u);
    g.beginPath();
    g.moveTo(cx + 11.6 * u, base - 25 * u);
    g.lineTo(cx + 15 * u, base - 29 * u);
    g.lineTo(cx + 18.4 * u, base - 25 * u);
    g.closePath();
    g.fill();
    trim(u, dusk, lit, () => {
      g.moveTo(cx - 12 * u, base);
      g.lineTo(cx - 12 * u, base - 15 * u);
      g.lineTo(cx, base - 21.5 * u);
      g.lineTo(cx + 12 * u, base - 15 * u);
      g.moveTo(cx - 12 * u, base - 15 * u);
      g.lineTo(cx + 12 * u, base - 15 * u);
      g.moveTo(cx + 12 * u, base - 25 * u);
      g.lineTo(cx + 18 * u, base - 25 * u);
      g.lineTo(cx + 18 * u, base);
      g.moveTo(cx + 12 * u, base - 19 * u);
      g.lineTo(cx + 18 * u, base - 19 * u);
    });
    // the round window in the gable, four more, the belfry's openings
    g.fillStyle = windowLight(lit);
    g.beginPath();
    g.arc(cx, base - 17.4 * u, 1.5 * u, 0, Math.PI * 2);
    g.fill();
    [[-8, -11], [6, -11], [-8, -6], [6, -6]].forEach(([wx, wy]) => g.fillRect(cx + wx * u, base + wy * u, 2 * u, 3 * u));
    [13.3, 15.8].forEach((wx) => g.fillRect(cx + wx * u, base - 23.6 * u, 0.9 * u, 3 * u));
    door(cx, base, u, lit);
  }

  // Casa Real: a two-storey house of stone and wood, a hipped roof, a row of
  // capiz windows upstairs, and the flag on top
  function casaReal(cx, base, u, dusk, lit, alpha) {
    g.globalAlpha = alpha;
    glowBehind(cx, base - 8 * u, 32 * u, lit);
    g.fillStyle = mix("#241e3f", "#0e1022", dusk);
    g.fillRect(cx - 17 * u, base - 11 * u, 34 * u, 11 * u);
    g.beginPath();
    g.moveTo(cx - 18.5 * u, base - 11 * u);
    g.lineTo(cx - 13 * u, base - 15.5 * u);
    g.lineTo(cx + 13 * u, base - 15.5 * u);
    g.lineTo(cx + 18.5 * u, base - 11 * u);
    g.closePath();
    g.fill();
    g.fillRect(cx - 0.2 * u, base - 22.5 * u, 0.4 * u, 7 * u);
    // the flag: blue over red, the white triangle with its sun
    const fy = base - 22.5 * u;
    g.fillStyle = "#1d3f9c";
    g.fillRect(cx + 0.2 * u, fy, 4.6 * u, 1.3 * u);
    g.fillStyle = "#c8243a";
    g.fillRect(cx + 0.2 * u, fy + 1.3 * u, 4.6 * u, 1.3 * u);
    g.fillStyle = "#f2f0eb";
    g.beginPath();
    g.moveTo(cx + 0.2 * u, fy);
    g.lineTo(cx + 2.4 * u, fy + 1.3 * u);
    g.lineTo(cx + 0.2 * u, fy + 2.6 * u);
    g.closePath();
    g.fill();
    g.fillStyle = "#f5c542";
    g.beginPath();
    g.arc(cx + 0.95 * u, fy + 1.3 * u, 0.35 * u, 0, Math.PI * 2);
    g.fill();
    trim(u, dusk, lit, () => {
      g.moveTo(cx - 18.5 * u, base - 11 * u);
      g.lineTo(cx - 13 * u, base - 15.5 * u);
      g.lineTo(cx + 13 * u, base - 15.5 * u);
      g.lineTo(cx + 18.5 * u, base - 11 * u);
      g.closePath();
      g.moveTo(cx - 17 * u, base - 5 * u);
      g.lineTo(cx + 17 * u, base - 5 * u);
      g.moveTo(cx - 5 * u, base - 6.2 * u);
      g.lineTo(cx + 5 * u, base - 6.2 * u);
      g.moveTo(cx - 17 * u, base);
      g.lineTo(cx - 17 * u, base - 11 * u);
      g.moveTo(cx + 17 * u, base);
      g.lineTo(cx + 17 * u, base - 11 * u);
    });
    g.fillStyle = windowLight(lit);
    for (let k = 0; k < 7; k++) g.fillRect(cx + (-15 + k * 4.6) * u, base - 10 * u, 2.4 * u, 3.4 * u);
    [-11, 8.6].forEach((wx) => g.fillRect(cx + wx * u, base - 3.8 * u, 2.2 * u, 2.2 * u));
    door(cx, base, u, lit);
  }

  // Barasoain Church: the curved pediment, and the bell tower with its dome
  // on the left
  function barasoain(cx, base, u, dusk, lit, alpha) {
    g.globalAlpha = alpha;
    glowBehind(cx, base - 10 * u, 34 * u, lit);
    g.fillStyle = mix("#241e3f", "#0e1022", dusk);
    // the wings and the facade
    g.fillRect(cx - 17 * u, base - 7 * u, 34 * u, 7 * u);
    g.fillRect(cx - 11 * u, base - 13 * u, 22 * u, 13 * u);
    // the pediment, curved like Barasoain's
    g.beginPath();
    g.moveTo(cx - 11 * u, base - 13 * u);
    g.quadraticCurveTo(cx - 8 * u, base - 17 * u, cx - 3 * u, base - 18 * u);
    g.lineTo(cx, base - 21 * u);
    g.lineTo(cx + 3 * u, base - 18 * u);
    g.quadraticCurveTo(cx + 8 * u, base - 17 * u, cx + 11 * u, base - 13 * u);
    g.closePath();
    g.fill();
    // the bell tower on the left, with its dome
    g.fillRect(cx - 17 * u, base - 22 * u, 5 * u, 22 * u);
    g.beginPath();
    g.arc(cx - 14.5 * u, base - 22 * u, 2.5 * u, Math.PI, 0);
    g.fill();
    g.fillRect(cx - 14.8 * u, base - 27 * u, 0.6 * u, 3 * u);
    // the cross
    g.fillRect(cx - 0.3 * u, base - 24.5 * u, 0.6 * u, 3.5 * u);
    g.fillRect(cx - 1.1 * u, base - 23.6 * u, 2.2 * u, 0.6 * u);
    trim(u, dusk, lit, () => {
      g.moveTo(cx - 11 * u, base);
      g.lineTo(cx - 11 * u, base - 13 * u);
      g.quadraticCurveTo(cx - 8 * u, base - 17 * u, cx - 3 * u, base - 18 * u);
      g.lineTo(cx, base - 21 * u);
      g.lineTo(cx + 3 * u, base - 18 * u);
      g.quadraticCurveTo(cx + 8 * u, base - 17 * u, cx + 11 * u, base - 13 * u);
      g.lineTo(cx + 11 * u, base);
      g.moveTo(cx - 11 * u, base - 13 * u);
      g.lineTo(cx + 11 * u, base - 13 * u);
      g.moveTo(cx - 17 * u, base);
      g.lineTo(cx - 17 * u, base - 22 * u);
      g.moveTo(cx - 12 * u, base - 22 * u);
      g.lineTo(cx - 12 * u, base - 7 * u);
    });
    g.fillStyle = windowLight(lit);
    [[-6, -10], [-1, -10], [4, -10], [-15, -16], [-15, -10]].forEach(([wx, wy]) => g.fillRect(cx + wx * u, base + wy * u, 2 * u, 3 * u));
    door(cx, base, u, lit);
  }

  // a lamp's glow, drawn once and stamped on every lamp
  function lampGlow() {
    if (glowSprite) return glowSprite;
    glowSprite = document.createElement("canvas");
    glowSprite.width = glowSprite.height = 64;
    const k = glowSprite.getContext("2d");
    const glow = k.createRadialGradient(32, 32, 0, 32, 32, 32);
    glow.addColorStop(0, "rgba(255,196,120,0.9)");
    glow.addColorStop(0.2, "rgba(255,160,80,0.35)");
    glow.addColorStop(1, "rgba(255,140,60,0)");
    k.fillStyle = glow;
    k.fillRect(0, 0, 64, 64);
    return glowSprite;
  }

  function lamp(lx, z, bright) {
    const [x0, y0, s] = at(lx, 0, z);
    const [, y1] = at(lx, 1.7, z);
    g.strokeStyle = "#2a2a33";
    g.lineWidth = Math.max(1, 0.06 * s);
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x0, y1);
    g.stroke();
    const r = 0.4 * s;
    g.globalAlpha = bright;
    g.drawImage(lampGlow(), x0 - r, y1 - r, r * 2, r * 2);
    g.globalAlpha = 1;
  }

  function coin(t, z) {
    const [cx, cy, s] = at(t.x, t.y + Math.sin(clock * 4 + t.z) * 0.05, z);
    const r = 0.13 * s;
    const turn = Math.max(0.25, Math.abs(Math.cos(clock * 5 + t.z)));
    g.fillStyle = "#b8860b";
    g.beginPath();
    g.ellipse(cx, cy, r * turn, r, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#f7c948";
    g.beginPath();
    g.ellipse(cx, cy, r * turn * 0.72, r * 0.72, 0, 0, Math.PI * 2);
    g.fill();
  }

  // an ensaymada, Malolos style: a swirled golden bun, butter and sugar on
  // top and grated cheese, floating in a soft glow
  function ensaymada(t, z) {
    const [cx, cy, s] = at(t.x, t.y + Math.sin(clock * 3 + t.z) * 0.06, z);
    const r = 0.2 * s;
    g.fillStyle = `rgba(255,214,140,${(0.18 + 0.08 * Math.sin(clock * 6)).toFixed(3)})`;
    g.beginPath();
    g.arc(cx, cy, r * 1.7, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#b8742f";
    g.beginPath();
    g.ellipse(cx, cy + r * 0.16, r, r * 0.62, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#e3a653";
    g.beginPath();
    g.ellipse(cx, cy, r * 0.94, r * 0.52, 0, 0, Math.PI * 2);
    g.fill();
    g.strokeStyle = "#a8692a";
    g.lineWidth = Math.max(1, r * 0.08);
    g.beginPath();
    for (let k = 0; k <= 22; k++) {
      const a = k * 0.6;
      const rr = r * (0.12 + (k / 22) * 0.72);
      const px = cx + Math.cos(a) * rr;
      const py = cy + Math.sin(a) * rr * 0.5;
      if (k) g.lineTo(px, py);
      else g.moveTo(px, py);
    }
    g.stroke();
    g.fillStyle = "rgba(255,246,226,0.9)";
    g.beginPath();
    g.ellipse(cx, cy - r * 0.08, r * 0.58, r * 0.26, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#f7d774";
    [[-0.3, -0.12], [0.05, -0.2], [0.28, -0.06], [-0.08, 0.02], [0.14, 0.06]].forEach(([dx, dy]) => g.fillRect(cx + dx * r, cy + dy * r, Math.max(1, r * 0.14), Math.max(1, r * 0.07)));
  }

  function barrier(t, z) {
    // one that's been clipped lies flat on the road
    if (t.hit) {
      for (let k = 0; k < 6; k++) {
        const a = t.x - t.w / 2 + (t.w * k) / 6;
        const [n0x, n0y] = at(a, 0.02, z);
        const [n1x] = at(a + t.w / 6, 0.02, z);
        const [f0x, f0y] = at(a, 0.02, z + 0.4);
        const [f1x] = at(a + t.w / 6, 0.02, z + 0.4);
        g.fillStyle = k % 2 ? "#f2f0eb" : "#ff5a1f";
        g.beginPath();
        g.moveTo(n0x, n0y);
        g.lineTo(n1x, n0y);
        g.lineTo(f1x, f0y);
        g.lineTo(f0x, f0y);
        g.fill();
      }
      return;
    }
    const [x0, y0, s] = at(t.x - t.w / 2, 0, z);
    const [x1] = at(t.x + t.w / 2, 0, z);
    const [, top] = at(t.x, t.h, z);
    const [, mid] = at(t.x, t.h * 0.55, z);
    // legs
    g.fillStyle = "#3a3a44";
    g.fillRect(x0 + (x1 - x0) * 0.12, mid, Math.max(1, 0.06 * s), y0 - mid);
    g.fillRect(x1 - (x1 - x0) * 0.12 - Math.max(1, 0.06 * s), mid, Math.max(1, 0.06 * s), y0 - mid);
    // the plank, striped
    const h = mid - top;
    const stripes = 6;
    for (let k = 0; k < stripes; k++) {
      g.fillStyle = k % 2 ? "#f2f0eb" : "#ff5a1f";
      g.fillRect(x0 + ((x1 - x0) * k) / stripes, top, (x1 - x0) / stripes + 0.5, h);
    }
  }

  function jeepney(t, z, dusk) {
    const zn = z - t.d / 2; // its front
    if (zn < 0.8) return;
    const [lx, by, s] = at(t.x - t.w / 2, 0, zn);
    const [rx] = at(t.x + t.w / 2, 0, zn);
    const [, ty] = at(t.x, t.h, zn);
    const zf = z + t.d / 2;
    const [flx, fby] = at(t.x - t.w / 2, 0, zf);
    const [frx, fty] = [at(t.x + t.w / 2, 0, zf)[0], at(t.x, t.h, zf)[1]];
    const paints = [["#d62839", "#f6c343"], ["#2b59c3", "#f6c343"], ["#1f8a4c", "#ff5a1f"]][t.paint || 0];
    // the roof and the side toward the middle of the road, for depth
    g.fillStyle = mix("#a39386", "#8d939e", dusk);
    g.beginPath();
    g.moveTo(lx, ty);
    g.lineTo(rx, ty);
    g.lineTo(frx, fty);
    g.lineTo(flx, fty);
    g.fill();
    const side = t.x < -0.1 ? [rx, frx] : t.x > 0.1 ? [lx, flx] : null;
    if (side) {
      g.fillStyle = mix("#7d6f6b", "#6d737e", dusk);
      g.beginPath();
      g.moveTo(side[0], by);
      g.lineTo(side[0], ty);
      g.lineTo(side[1], fty);
      g.lineTo(side[1], fby);
      g.fill();
      g.fillStyle = paints[0];
      g.beginPath();
      const m0 = ty + (by - ty) * 0.55;
      const m1 = fty + (fby - fty) * 0.55;
      g.moveTo(side[0], m0);
      g.lineTo(side[1], m1);
      g.lineTo(side[1], m1 + (fby - fty) * 0.08);
      g.lineTo(side[0], m0 + (by - ty) * 0.08);
      g.fill();
    }
    // the front: chrome (warm in the sunset), a sign, the windshield,
    // stripes, the grille and lights
    const w = rx - lx;
    const h = by - ty;
    const edge = mix("#b9a18f", "#9aa1ab", dusk);
    const body = g.createLinearGradient(lx, 0, rx, 0);
    body.addColorStop(0, edge);
    body.addColorStop(0.5, mix("#f7e2cd", "#e3e7ec", dusk));
    body.addColorStop(1, edge);
    g.fillStyle = body;
    g.fillRect(lx, ty, w, h);
    g.fillStyle = paints[0];
    g.fillRect(lx, ty, w, h * 0.16);
    if (w > 46) {
      g.fillStyle = "#fff";
      g.font = `700 ${Math.round(h * 0.1)}px ui-monospace, monospace`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("MALOLOS", lx + w / 2, ty + h * 0.08);
    }
    g.fillStyle = "#1b2638";
    g.fillRect(lx + w * 0.08, ty + h * 0.2, w * 0.84, h * 0.3);
    g.fillStyle = paints[1];
    g.fillRect(lx, ty + h * 0.54, w, h * 0.05);
    g.fillStyle = paints[0];
    g.fillRect(lx, ty + h * 0.59, w, h * 0.04);
    g.fillStyle = "#4a4f59";
    for (let k = 0; k < 5; k++) g.fillRect(lx + w * (0.34 + k * 0.07), ty + h * 0.66, w * 0.03, h * 0.18);
    g.fillStyle = "#ffe29a";
    [0.16, 0.84].forEach((p) => {
      g.beginPath();
      g.arc(lx + w * p, ty + h * 0.74, w * 0.07, 0, Math.PI * 2);
      g.fill();
    });
    g.fillStyle = "#23252c";
    g.fillRect(lx - w * 0.02, ty + h * 0.88, w * 1.04, h * 0.12);
  }

  function runner() {
    const [fx, fy, s] = at(x, 0, PZ);
    const [, jy] = at(x, y, PZ);
    const px = 0.05 * s; // one pixel of the student (16 of them: about 0.8 tall)
    // shadow on the street, smaller up in the air
    g.fillStyle = "rgba(0,0,0,0.45)";
    g.beginPath();
    g.ellipse(fx, fy, 0.24 * s * (1 - Math.min(0.5, y * 0.5)), 0.06 * s, 0, 0, Math.PI * 2);
    g.fill();
    // a golden ring, breathing, while an ensaymada is pulling the coins in
    if (magnet > 0) {
      const pulse = Math.sin(clock * 10);
      g.beginPath();
      g.arc(fx, jy - px * 8, px * (9 + 0.6 * pulse), 0, Math.PI * 2);
      g.fillStyle = "rgba(245,184,65,0.07)";
      g.fill();
      g.strokeStyle = `rgba(245,184,65,${(0.42 + 0.18 * pulse).toFixed(3)})`;
      g.lineWidth = Math.max(1.5, px * 0.55);
      g.stroke();
    }
    // (a stumble shakes him, arms flung up)
    const shake = stumble > 0 ? Math.sin(clock * 55) * px * 0.9 * (stumble / 0.6) : 0;
    const frame = stumble > 0.2 ? "stumble" : y > 0 ? "jump" : Math.abs(Math.floor(stride)) % 2 ? "run2" : "run1";
    stamp(sprite(`student-${frame}`, STUDENT_FRAMES[frame], STUDENT), fx - px * 5 + shake, jy - px * 16, px);
  }

  // the guard, bigger and closer to the camera than the student
  function guard(z) {
    const [fx, fy, s] = at(guardX, 0, z);
    const px = 0.057 * s; // (18 of them: a head taller than the student)
    g.fillStyle = "rgba(0,0,0,0.4)";
    g.beginPath();
    g.ellipse(fx, fy, 0.3 * s, 0.07 * s, 0, 0, Math.PI * 2);
    g.fill();
    const frame = caught ? "grab" : Math.abs(Math.floor(guardStride)) % 2 ? "run2" : "run1";
    stamp(sprite(`guard-${frame}`, GUARD_FRAMES[frame], GUARD), fx - px * 5, fy - px * 18, px);
  }

  // a pixel sprite, drawn once at one canvas pixel per pixel...
  function sprite(name, rows, colors) {
    if (sprites[name]) return sprites[name];
    const c = document.createElement("canvas");
    c.width = rows[0].length;
    c.height = rows.length;
    const k = c.getContext("2d");
    rows.forEach((line, r) => {
      for (let col = 0; col < line.length; col++) {
        if (line[col] === ".") continue;
        k.fillStyle = colors[line[col]];
        k.fillRect(col, r, 1, 1);
      }
    });
    return (sprites[name] = c);
  }

  // ...then stamped big, with crisp square pixels
  function stamp(img, left, top, px) {
    g.imageSmoothingEnabled = false;
    g.drawImage(img, Math.round(left), Math.round(top), Math.round(img.width * px), Math.round(img.height * px));
    g.imageSmoothingEnabled = true;
  }

  function open() {
    if (!dialog) build();
    if (typeof holdPage === "function") holdPage(true);
    dialog.showModal();
    state = "ready";
    reset();
    overCard.hidden = true;
    startCard.hidden = false;
    startCard.querySelector(".rush-go").textContent = "Run";
    showBest();
    refreshBoard(true);
    requestAnimationFrame(size);
    startCard.querySelector(".rush-go").focus({ preventScroll: true });
  }

  window.openRush = open;

  // ?rushtest in the address: handles for trying things from the console
  // (jump ahead, put something in front of the runner, never crash)
  if (/[?&]rushtest\b/.test(location.search)) {
    window.rushTest = {
      sounds: [],
      info: () => ({ state, dist: Math.floor(dist), coins, lane, magnet: +magnet.toFixed(2), reached, lit: +lit.toFixed(2), chase: +chase.toFixed(1), caught, dpr: DPR, things: things.length }),
      skipTo: (m) => {
        dist = m;
        nextRow = m + 14;
        things = [];
      },
      ghost: (on) => (rushTest.ghosting = on),
      clip: () => clip(),
      put: (type, k, ahead) => {
        const z = dist + PZ + ahead;
        if (type === "jeep") things.push({ type, x: LANES[k], z, w: 0.62, h: 1, d: 1.8, paint: 0 });
        else if (type === "barrier") things.push({ type, x: LANES[k], z, w: 0.6, h: 0.34, d: 0.25 });
        else things.push({ type, x: LANES[k], z, y: type === "coin" ? 0.45 : 0.5 });
      },
      board: (projectId, apiKey) => Object.assign(BOARD, { projectId, apiKey })
    };
  }
})();
