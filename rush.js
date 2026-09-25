// Malolos Rush, the teaser: a tiny three-lane runner in the spirit of my
// capstone (the real one is 3D, in Unity). Run down a Malolos street at night
// toward Barasoain Church: swipe or use the arrows to change lanes, swipe up
// (or up / Space) to jump the barriers, don't run into the jeepneys, and grab
// the coins. Loaded the first time someone presses Play on the Malolos Rush
// row in Crafts (see main.js), and drawn on a canvas in fake 3D: everything
// shrinks toward the church at the end of the road.
(function () {
  const LANES = [-0.7, 0, 0.7];
  const PZ = 3; // how far ahead of the camera the runner is
  const FAR = 58; // how far down the road things appear
  const GRAVITY = 16;
  const JUMP = 5.2; // up speed: about 0.85 high, 0.65 s in the air
  const COLORS = { H: "#141414", S: "#c98a55", T: "#ff5a1f", P: "#26324f", K: "#f2f0eb" };
  // the runner from behind, two frames (the orange runner from my timeline)
  const RUNNER = [
    ["..HHHH..", "..HHHH..", "..HHHH..", "...SS...", ".TTTTTT.", "STTTTTTS", "S.TTTT.S", "..TTTT..", "..PPPP..", "..PPPP..", "..S..S..", "..S..K..", "..K....."],
    ["..HHHH..", "..HHHH..", "..HHHH..", "...SS...", ".TTTTTT.", "STTTTTTS", "S.TTTT.S", "..TTTT..", "..PPPP..", "..PPPP..", "..S..S..", "..K..S..", ".....K.."]
  ];

  let dialog, canvas, g, distLabel, coinLabel, startCard, overCard, overTitle, overScore, bestLabels;
  let W = 0, H = 0, DPR = 1, f = 1, horizon = 0, camH = 1.8;
  let raf = 0, last = 0, state = "ready";
  let lane = 1, x = 0, y = 0, vy = 0, clock = 0, dist = 0, coins = 0, speed = 10, nextRow = 20, stride = 0;
  let things = [];
  let stars = [];
  let skyline = [];
  let best = 0;
  let counted = false;
  try {
    best = Number(localStorage.getItem("malolosBest")) || 0;
  } catch (e) {}

  // sounds, made here (no files) through the site's mixer, so the sound
  // switch on Sova's wall mutes them too
  function sound(kind) {
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
    }
  }

  function build() {
    dialog = document.createElement("dialog");
    dialog.className = "rush";
    dialog.setAttribute("aria-label", "Malolos Rush, a mini game");
    dialog.innerHTML = `
      <div class="rush-stage">
        <canvas class="rush-canvas" tabindex="-1" role="img" aria-label="A runner on a three-lane street at night, running toward Barasoain Church, with jeepneys, barriers and coins coming"></canvas>
        <button class="rush-close mono" type="button" aria-label="Close the game">✕</button>
        <div class="rush-hud mono" aria-hidden="true"><span class="rush-dist">0 m</span><span class="rush-coins">0</span></div>
        <div class="rush-card rush-start">
          <p class="rush-kicker mono">Crafts · a teaser</p>
          <h2 class="rush-title">Malolos <em>Rush</em></h2>
          <p class="rush-note">A tiny taste of my capstone game. The real one is 3D, in Unity.</p>
          <p class="rush-keys mono">Swipe or ← → to change lanes · swipe up, ↑ or Space to jump · dodge the jeepneys</p>
          <button class="rush-go mono" type="button">Run</button>
          <p class="rush-best mono"></p>
        </div>
        <div class="rush-card rush-over" hidden>
          <p class="rush-kicker mono">Run over</p>
          <h2 class="rush-title rush-over-title"></h2>
          <p class="rush-score mono"></p>
          <button class="rush-go mono" type="button">Run again</button>
          <p class="rush-best mono"></p>
        </div>
      </div>`;
    document.body.appendChild(dialog);
    canvas = dialog.querySelector(".rush-canvas");
    g = canvas.getContext("2d");
    distLabel = dialog.querySelector(".rush-dist");
    coinLabel = dialog.querySelector(".rush-coins");
    startCard = dialog.querySelector(".rush-start");
    overCard = dialog.querySelector(".rush-over");
    overTitle = dialog.querySelector(".rush-over-title");
    overScore = dialog.querySelector(".rush-score");
    bestLabels = dialog.querySelectorAll(".rush-best");
    dialog.querySelectorAll(".rush-go").forEach((b) => b.addEventListener("click", (e) => {
      e.stopPropagation();
      go();
    }));
    dialog.querySelector(".rush-close").addEventListener("click", () => dialog.close());
    dialog.addEventListener("close", stop);
    dialog.addEventListener("keydown", onKey);
    // swipes (or taps: left, middle, right) on the street
    let from = null;
    canvas.addEventListener("pointerdown", (e) => {
      from = { x: e.clientX, y: e.clientY, at: performance.now() };
    });
    canvas.addEventListener("pointerup", (e) => {
      if (!from) return;
      const dx = e.clientX - from.x;
      const dy = e.clientY - from.y;
      from = null;
      if (state !== "running") return go();
      if (Math.abs(dx) > 28 && Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 1 : -1);
      else if (dy < -28) jump();
      else {
        const r = canvas.getBoundingClientRect();
        const at = (e.clientX - r.left) / r.width;
        if (at < 0.33) move(-1);
        else if (at > 0.67) move(1);
        else jump();
      }
    });
    addEventListener("resize", () => dialog.open && size());
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && state === "running") pause();
    });
  }

  function size() {
    const r = canvas.getBoundingClientRect();
    DPR = Math.min(2, devicePixelRatio || 1);
    W = r.width;
    H = r.height;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    // lanes 0.36 of the width apart at the runner, the runner's feet near the bottom
    f = (0.36 * W * PZ) / 0.7;
    horizon = H * 0.36;
    camH = ((H * 0.86 - horizon) * PZ) / f;
    stars = Array.from({ length: 46 }, () => [Math.random() * W, Math.random() * horizon * 0.9, Math.random() * 1.2 + 0.3]);
    // low buildings along the horizon, either side of the church
    skyline = [];
    for (let sx = 0; sx < W; ) {
      const w = W * (0.04 + Math.random() * 0.07);
      skyline.push([sx, w, W * (0.02 + Math.random() * 0.06)]);
      sx += w;
    }
    draw();
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
    last = performance.now();
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
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  function stop() {
    cancelAnimationFrame(raf);
    state = "ready";
    if (typeof lenis !== "undefined" && lenis) lenis.start();
  }

  function over(why) {
    state = "over";
    cancelAnimationFrame(raf);
    sound("crash");
    const meters = Math.floor(dist);
    const record = meters > best;
    if (record) {
      best = meters;
      try {
        localStorage.setItem("malolosBest", String(best));
      } catch (e) {}
    }
    overTitle.textContent = why === "jeep" ? "Hit a jeepney!" : "Tripped!";
    overScore.textContent = `${meters} m · ${coins} ${coins === 1 ? "coin" : "coins"}${record ? " · new best" : ""}`;
    showBest();
    overCard.hidden = false;
    draw();
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

  function onKey(e) {
    const k = e.key;
    if (k === "ArrowLeft" || k === "a" || k === "A") move(-1);
    else if (k === "ArrowRight" || k === "d" || k === "D") move(1);
    else if (k === "ArrowUp" || k === "w" || k === "W" || k === " ") {
      if (state === "running") jump();
      else if (e.target.tagName !== "BUTTON") go();
    } else if (k === "Enter" && state !== "running" && e.target.tagName !== "BUTTON") go();
    else return;
    e.preventDefault();
  }

  // what comes down the road, a row at a time: jeepneys (go around them),
  // barriers (jump them) and coins, always with a way through
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
      for (let k = 0; k < 5; k++) things.push({ type: "coin", x: lx, z: z - 2 + k * 1.3, y: 0.45 });
    }
  }

  function loop(now) {
    // (the frame's time can be a hair before the run started: never go backwards)
    const dt = Math.max(0, Math.min(0.05, (now - last) / 1000));
    last = now;
    clock += dt;
    speed = 10 + Math.min(10, clock * 0.12);
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
    // what reaches the runner
    const me = dist + PZ;
    for (const t of things) {
      if (t.gone) continue;
      const dz = t.z - me;
      if (t.type === "coin") {
        if (Math.abs(dz) < 0.6 && Math.abs(t.x - x) < 0.45 && Math.abs(t.y - (y + 0.45)) < 0.7) {
          t.gone = true;
          coins++;
          sound("coin");
        }
      } else if (Math.abs(dz) < t.d / 2 + 0.3 && Math.abs(t.x - x) < 0.5 && y < t.h - 0.05) {
        hud();
        return over(t.type);
      }
    }
    things = things.filter((t) => !t.gone && t.z - dist > 0.6);
    hud();
    draw();
    raf = requestAnimationFrame(loop);
  }

  function hud() {
    distLabel.textContent = `${Math.floor(dist)} m`;
    coinLabel.textContent = String(coins);
  }

  // A point down the road, on screen: x across (lanes at -0.7, 0, 0.7), y up
  // from the street, z ahead of the camera. Returns [left, top, scale].
  function at(wx, wy, wz) {
    const s = f / wz;
    return [W / 2 + wx * s, horizon + (camH - wy) * s, s];
  }

  function draw() {
    if (!W) return;
    // the sky: night, warm at the horizon, with stars
    const sky = g.createLinearGradient(0, 0, 0, horizon);
    sky.addColorStop(0, "#060812");
    sky.addColorStop(0.6, "#161129");
    sky.addColorStop(1, "#4a2217");
    g.fillStyle = sky;
    g.fillRect(0, 0, W, horizon + 1);
    g.fillStyle = "rgba(255,255,255,0.7)";
    stars.forEach(([sx, sy, r]) => g.fillRect(sx, sy, r, r));
    // Barasoain Church at the end of the road, the town around it
    g.fillStyle = "#0a0c1a";
    skyline.forEach(([sx, w, h]) => g.fillRect(sx, horizon - h, w + 1, h));
    church();
    // the street
    const ground = g.createLinearGradient(0, horizon, 0, H);
    ground.addColorStop(0, "#15121c");
    ground.addColorStop(1, "#0d0d10");
    g.fillStyle = ground;
    g.fillRect(0, horizon, W, H - horizon);
    const near = 0.8;
    const [lnx, lny] = at(-1.05, 0, near);
    const [rnx] = at(1.05, 0, near);
    const [lfx, lfy] = at(-1.05, 0, FAR);
    const [rfx] = at(1.05, 0, FAR);
    g.fillStyle = "#1c1c22";
    g.beginPath();
    g.moveTo(lnx, lny);
    g.lineTo(rnx, lny);
    g.lineTo(rfx, lfy);
    g.lineTo(lfx, lfy);
    g.closePath();
    g.fill();
    // curbs
    g.strokeStyle = "rgba(255,190,120,0.35)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(lnx, lny);
    g.lineTo(lfx, lfy);
    g.moveTo(rnx, lny);
    g.lineTo(rfx, lfy);
    g.stroke();
    // lane dashes, moving with the run
    g.fillStyle = "rgba(242,240,235,0.55)";
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
    // street lamps along the sidewalks, warm
    const lamps = [];
    for (let k = 0; k < 8; k++) {
      const z = k * 9 - (dist % 9) + 2;
      if (z > near) lamps.push(z);
    }
    lamps.sort((a, b) => b - a).forEach((z) => [-1.45, 1.45].forEach((lx) => lamp(lx, z)));
    // things, far to near, and the runner among them
    const list = things.map((t) => ({ t, z: t.z - dist })).filter((o) => o.z > near && o.z < FAR + 2);
    list.sort((a, b) => b.z - a.z);
    let drawn = false;
    list.forEach((o) => {
      if (!drawn && o.z < PZ) {
        runner();
        drawn = true;
      }
      if (o.t.type === "coin") coin(o.t, o.z);
      else if (o.t.type === "barrier") barrier(o.t, o.z);
      else jeepney(o.t, o.z);
    });
    if (!drawn) runner();
    // a little fog over the far end
    const fog = g.createLinearGradient(0, horizon, 0, horizon + H * 0.12);
    fog.addColorStop(0, "rgba(74,34,23,0.55)");
    fog.addColorStop(1, "rgba(74,34,23,0)");
    g.fillStyle = fog;
    g.fillRect(0, horizon, W, H * 0.12);
  }

  function church() {
    const cx = W / 2;
    const u = W * 0.0105; // one unit of the facade
    const base = horizon;
    g.fillStyle = "#0e1022";
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
    // lit windows and the door
    g.fillStyle = "rgba(255,184,107,0.55)";
    [[-6, -10], [-1, -10], [4, -10], [-15, -16], [-15, -10]].forEach(([wx, wy]) => g.fillRect(cx + wx * u, base + wy * u, 2 * u, 3 * u));
    g.fillStyle = "rgba(255,184,107,0.35)";
    g.beginPath();
    g.moveTo(cx - 2 * u, base);
    g.lineTo(cx - 2 * u, base - 4 * u);
    g.arc(cx, base - 4 * u, 2 * u, Math.PI, 0);
    g.lineTo(cx + 2 * u, base);
    g.fill();
  }

  function lamp(lx, z) {
    const [x0, y0, s] = at(lx, 0, z);
    const [, y1] = at(lx, 1.7, z);
    g.strokeStyle = "#2a2a33";
    g.lineWidth = Math.max(1, 0.06 * s);
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x0, y1);
    g.stroke();
    const r = 0.4 * s;
    const glow = g.createRadialGradient(x0, y1, 0, x0, y1, r);
    glow.addColorStop(0, "rgba(255,196,120,0.9)");
    glow.addColorStop(0.2, "rgba(255,160,80,0.35)");
    glow.addColorStop(1, "rgba(255,140,60,0)");
    g.fillStyle = glow;
    g.fillRect(x0 - r, y1 - r, r * 2, r * 2);
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

  function barrier(t, z) {
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

  function jeepney(t, z) {
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
    g.fillStyle = "#8d939e";
    g.beginPath();
    g.moveTo(lx, ty);
    g.lineTo(rx, ty);
    g.lineTo(frx, fty);
    g.lineTo(flx, fty);
    g.fill();
    const side = t.x < -0.1 ? [rx, frx] : t.x > 0.1 ? [lx, flx] : null;
    if (side) {
      g.fillStyle = "#6d737e";
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
    // the front: chrome, a sign, the windshield, stripes, the grille and lights
    const w = rx - lx;
    const h = by - ty;
    const body = g.createLinearGradient(lx, 0, rx, 0);
    body.addColorStop(0, "#9aa1ab");
    body.addColorStop(0.5, "#e3e7ec");
    body.addColorStop(1, "#9aa1ab");
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
    // shadow on the street, smaller up in the air
    g.fillStyle = "rgba(0,0,0,0.45)";
    g.beginPath();
    g.ellipse(fx, fy, 0.24 * s * (1 - Math.min(0.5, y * 0.5)), 0.06 * s, 0, 0, Math.PI * 2);
    g.fill();
    const px = 0.06 * s; // one pixel of the runner (13 of them: about 0.8 tall)
    const frame = RUNNER[y > 0 ? 0 : Math.abs(Math.floor(stride)) % 2];
    const left = fx - px * 4;
    const top = jy - px * frame.length;
    frame.forEach((line, r) => {
      for (let c = 0; c < line.length; c++) {
        const k = line[c];
        if (k === ".") continue;
        g.fillStyle = COLORS[k];
        g.fillRect(Math.floor(left + c * px), Math.floor(top + r * px), Math.ceil(px), Math.ceil(px));
      }
    });
  }

  function open() {
    if (!dialog) build();
    if (typeof lenis !== "undefined" && lenis) lenis.stop();
    dialog.showModal();
    state = "ready";
    reset();
    overCard.hidden = true;
    startCard.hidden = false;
    startCard.querySelector(".rush-go").textContent = "Run";
    showBest();
    requestAnimationFrame(size);
    startCard.querySelector(".rush-go").focus({ preventScroll: true });
  }

  window.openRush = open;
})();
