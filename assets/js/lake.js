// LaPlaisance Bay, Monroe MI
const LAT = 41.87;
const LON = -83.37;
const WEATHER_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
  "&current=temperature_2m,weather_code,wind_speed_10m,wind_direction_10m,cloud_cover,precipitation,is_day" +
  "&daily=sunrise,sunset&forecast_days=1&timeformat=unixtime" +
  "&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=America%2FNew_York";
// open-lake grid point (the bay itself is too small for the wave model)
const WAVES_URL =
  "https://marine-api.open-meteo.com/v1/marine?latitude=41.85&longitude=-83.30" +
  "&current=wave_height&length_unit=imperial";
// NOAA Toledo station, the closest one reporting water temperature
const WATER_URL =
  "https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?station=9063085" +
  "&product=water_temperature&date=latest&units=english&time_zone=lst_ldt&format=json" +
  "&application=mitchellcarter.dev";

const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const canvas = document.getElementById("lake");
const ctx = canvas.getContext("2d");
const placard = document.getElementById("weather");

const weather = {
  temp: null,
  wind: 8,
  dir: 270,
  cloud: 30,
  precip: 0,
  code: 1,
  day: 1,
};
const live = { wind: 8, cloud: 30 }; // eased toward `weather` so changes aren't jarring
let dirSign = 1; // +1 wind blowing east (left → right), -1 west

let W, H, waterTop, sandTop;
let k = 1; // scales the sky scenery and boat down on narrow (phone) screens

const waterHeight = () => Math.max(140, Math.min(H * 0.26, 260));

function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = innerWidth;
  H = innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  waterTop = H - waterHeight();
  sandTop = H - 28;
  k = Math.max(0.6, Math.min(1, W / 900));
}
resize();
addEventListener("resize", resize);

// ---------- weather ----------

const CODES = [
  [[0], "Clear"],
  [[1], "Mostly clear"],
  [[2], "Partly cloudy"],
  [[3], "Overcast"],
  [[45, 48], "Fog"],
  [[51, 53, 55, 56, 57], "Drizzle"],
  [[61, 63, 65, 66, 67], "Rain"],
  [[71, 73, 75, 77], "Snow"],
  [[80, 81, 82], "Showers"],
  [[85, 86], "Snow showers"],
  [[95, 96, 99], "Thunderstorms"],
];
const describe = (code) => CODES.find(([c]) => c.includes(code))?.[1] ?? "—";
const compass = (deg) =>
  ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(deg / 45) % 8];
const isRain = () =>
  [51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99].includes(
    weather.code,
  );
const isSnow = () => [71, 73, 75, 77, 85, 86].includes(weather.code);
const isFog = () => [45, 48].includes(weather.code);

let sun = null; // today's sunrise/sunset (unix seconds)
let waterTemp = null;
let waveHeight = null;

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(res.status);
  return res.json();
}

async function updateWeather() {
  const [forecast, waves, water] = await Promise.allSettled([
    getJSON(WEATHER_URL),
    getJSON(WAVES_URL),
    getJSON(WATER_URL),
  ]);
  if (waves.status === "fulfilled")
    waveHeight = waves.value.current?.wave_height ?? null;
  if (water.status === "fulfilled")
    waterTemp = Number(water.value.data?.[0]?.v) || null;

  if (forecast.status === "rejected") {
    placard.textContent = "LaPlaisance Bay · weather unavailable";
    return;
  }
  const { current: c, daily } = forecast.value;
  Object.assign(weather, {
    temp: c.temperature_2m,
    wind: c.wind_speed_10m,
    dir: c.wind_direction_10m,
    cloud: c.cloud_cover,
    precip: c.precipitation,
    code: c.weather_code,
    day: c.is_day,
  });
  sun = { rise: daily.sunrise[0], set: daily.sunset[0] };
  // wind direction is where it comes FROM; sail with it
  dirSign = Math.sin(((weather.dir + 180) * Math.PI) / 180) >= 0 ? 1 : -1;
  placard.textContent = [
    "LaPlaisance Bay, live",
    `${Math.round(weather.temp)}°F`,
    describe(weather.code),
    `Wind ${Math.round(weather.wind)} mph ${compass(weather.dir)}`,
    waterTemp && `Water ${Math.round(waterTemp)}°F`,
    waveHeight != null && `Waves ${waveHeight.toFixed(1)} ft`,
  ]
    .filter(Boolean)
    .join(" · ");
}
updateWeather();
setInterval(updateWeather, 10 * 60 * 1000);

// ---------- scene ----------

const rand = (a, b) => a + Math.random() * (b - a);
const clamp01 = (v) => Math.max(0, Math.min(1, v));
const mix = (a, b, u) => a.map((v, i) => v + (b[i] - v) * u);
const rgba = (c, a) => `rgba(${c.map(Math.round).join(", ")}, ${a})`;

// 0 = night, 1 = day, with a gentle fade around sunrise/sunset; warm peaks at golden hour
function lightAt(now) {
  if (!sun) return { day: 1, warm: 0 };
  const fade = 45 * 60;
  const day =
    clamp01((now - sun.rise) / fade + 0.5) *
    clamp01((sun.set - now) / fade + 0.5);
  const bell = (d) => Math.max(0, 1 - Math.abs(d) / 3600);
  return { day, warm: Math.max(bell(now - sun.rise), bell(now - sun.set)) };
}

const WATER = {
  day: [
    [130, 200, 238],
    [70, 150, 205],
    [28, 90, 150],
  ],
  night: [
    [62, 98, 148],
    [34, 66, 112],
    [14, 36, 72],
  ],
  warm: [
    [238, 180, 152],
    [120, 130, 190],
  ],
};
let palette = null;

function updatePalette() {
  const { day, warm } = lightAt(Date.now() / 1000);
  const stops = WATER.day.map((c, i) => mix(WATER.night[i], c, day));
  stops[0] = mix(stops[0], WATER.warm[0], warm * 0.55);
  stops[1] = mix(stops[1], WATER.warm[1], warm * 0.3);
  palette = {
    stops,
    back: mix(
      mix([95, 125, 165], [165, 212, 240], day),
      [240, 200, 175],
      warm * 0.5,
    ),
    line: mix([50, 90, 140], [63, 147, 207], day),
  };
}

function surface(x, t) {
  const a = Math.min(12, 2 + live.wind * 0.35);
  const s = dirSign;
  return (
    waterTop +
    a *
      (Math.sin(x * 0.012 - s * t * 1.1) +
        0.5 * Math.sin(x * 0.027 - s * t * 1.9 + 1.3) +
        0.25 * Math.sin(x * 0.06 - s * t * 2.7 + 4))
  );
}

let boatX = innerWidth * 0.3;
let boatV = 0;
let boatFacing = 1;

const clouds = Array.from({ length: 5 }, () => ({
  x: rand(0, innerWidth),
  y: rand(40, 120),
  r: rand(14, 24),
}));

const FISH_COLORS = [
  ["#f4a261", "#fbd3a8"],
  ["#e76f51", "#f6b8a6"],
  ["#e9c46a", "#f6e6b4"],
  ["#f28482", "#fbc9c8"],
  ["#90be6d", "#cfe5bd"],
];
const fish = FISH_COLORS.map(([color, belly], i) => ({
  x: rand(0, innerWidth),
  depth: rand(0.3, 0.75),
  speed: rand(14, 30),
  size: rand(8, 13),
  dir: Math.random() < 0.5 ? 1 : -1,
  color,
  belly,
  stripe: i % 2 === 0,
  phase: rand(0, 10),
}));

const school = {
  x: rand(0, innerWidth),
  depth: 0.45,
  speed: 34,
  dir: Math.random() < 0.5 ? 1 : -1,
  members: Array.from({ length: 7 }, (_, i) => ({
    dx: -i * 11 + rand(-3, 3),
    dy: ((i % 3) - 1) * 7 + rand(-2, 2),
    phase: rand(0, 6),
  })),
};

const WEED_GREENS = ["#2f7d4a", "#3f9157", "#5aa767"];
const weeds = [0.06, 0.09, 0.27, 0.58, 0.61, 0.88, 0.93].map((f) => ({
  f,
  blades: Array.from({ length: 2 + Math.floor(Math.random() * 2) }, (_, i) => ({
    dx: (i - 1) * 6 + rand(-2, 2),
    h: rand(35, 90),
    w: rand(4, 6.5),
    color: WEED_GREENS[i % 3],
    phase: rand(0, 6),
  })),
}));

const pebbles = Array.from({ length: 40 }, () => ({
  f: Math.random(),
  dy: rand(6, 22),
  r: rand(1, 2.6),
  color: ["#cdb57a", "#d8c391", "#bfa774", "#a9a49a"][Math.floor(rand(0, 4))],
}));

let bubbles = [];
let precip = [];
let smoke = [];
let streaks = [];
let splashes = [];

// click above the water to blow the boat; click below it to startle the fish
addEventListener("pointerdown", (e) => {
  if (e.target.closest("a, button")) return;
  const px = e.clientX;
  const py = e.clientY;
  const surfaceY = surface(px, simTime);

  if (py >= surfaceY) {
    [...fish, school].forEach((f) => {
      if (f.y != null && Math.hypot(f.x - px, f.y - py) < 170) {
        f.dir = f.x >= px ? 1 : -1;
        f.boost = 140;
      }
    });
    for (let i = 0; i < 7; i++)
      bubbles.push({
        x: px + rand(-8, 8),
        y: py + rand(-8, 8),
        r: rand(1.5, 4),
        phase: rand(0, 6),
      });
    return;
  }

  const dx = boatX - px;
  const dir = dx >= 0 ? 1 : -1;
  boatV += dir * 260 * Math.exp(-Math.abs(dx) / 500);
  for (let i = 0; i < 5; i++) {
    streaks.push({
      x: px,
      y: py + (i - 2) * 9,
      dir,
      len: rand(18, 34),
      age: 0,
      phase: rand(0, 6),
    });
  }

  // splash where the gust hits the water
  for (let i = 0; i < 9; i++)
    splashes.push({
      x: px,
      y: surfaceY,
      vx: rand(-50, 50) + dir * 40,
      vy: rand(-170, -80),
      ring: false,
    });
  splashes.push({ x: px, y: surfaceY, age: 0, ring: true });
});

function drawSunOrMoon() {
  if (live.cloud > 75) return;
  const x = W * 0.2;
  const y = waterTop - 120 * k;
  ctx.fillStyle = weather.day ? "#ffd166" : "#d9dde3";
  ctx.beginPath();
  ctx.arc(x, y, 18 * k, 0, Math.PI * 2);
  ctx.fill();
  if (!weather.day) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(x + 8 * k, y - 5 * k, 16 * k, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawClouds(dt) {
  const count = Math.round(live.cloud / 20);
  ctx.fillStyle = isRain() || weather.code === 3 ? "#d3d8de" : "#eef1f4";
  clouds.slice(0, count).forEach((c) => {
    c.x += dirSign * (4 + live.wind * 0.6) * dt;
    if (c.x > W + 80) c.x = -80;
    if (c.x < -80) c.x = W + 80;
    const y = waterTop - (60 + c.y) * k;
    const r = c.r * k;
    ctx.beginPath();
    ctx.arc(c.x, y, r, 0, Math.PI * 2);
    ctx.arc(c.x + r * 1.1, y - r * 0.4, r * 1.2, 0, Math.PI * 2);
    ctx.arc(c.x + r * 2.3, y, r * 0.9, 0, Math.PI * 2);
    ctx.rect(c.x, y, r * 2.3, r);
    ctx.fill();
  });
}

// far shore with the two DTE Monroe stacks
function drawShore(t, dt) {
  const shoreTop = waterTop - 6;
  // headland tapers into the water instead of ending in a hard edge
  const shoreStart = W * 0.5;
  const taper = Math.min(220, W * 0.15);
  ctx.fillStyle = "#dde3df";
  ctx.beginPath();
  ctx.moveTo(shoreStart, waterTop + 4);
  for (let x = shoreStart; x <= W + 10; x += 6) {
    const p = Math.min(1, (x - shoreStart) / taper);
    const rise = p * p * (3 - 2 * p);
    ctx.lineTo(
      x,
      waterTop + 4 - rise * (12 + Math.abs(Math.sin(x * 0.09)) * 3),
    );
  }
  ctx.lineTo(W, waterTop + 4);
  ctx.closePath();
  ctx.fill();

  const h = Math.min(200, waterTop * 0.44) * k;
  [W * 0.74, W * 0.775].forEach((x) => {
    const top = shoreTop - h;
    ctx.fillStyle = "#e1e4e8";
    ctx.beginPath();
    ctx.moveTo(x - 9, shoreTop);
    ctx.lineTo(x + 9, shoreTop);
    ctx.lineTo(x + 6.5, top);
    ctx.lineTo(x - 6.5, top);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#9aa1ab";
    ctx.fillRect(x - 6.8, top, 13.6, h * 0.06);

    if (Math.random() < dt * 4) smoke.push({ x, y: top - 2, r: 4, a: 0.5 });
  });

  smoke = smoke.filter((p) => {
    p.x += dirSign * (6 + live.wind * 1.5) * dt;
    p.y -= (8 - Math.min(live.wind, 20) * 0.3) * dt;
    p.r += 6 * dt;
    p.a -= 0.07 * dt;
    ctx.fillStyle = `rgba(200, 205, 212, ${Math.max(p.a, 0)})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
    return p.a > 0;
  });
}

function drawStreaks(t, dt) {
  ctx.strokeStyle = "#9aa1ab";
  ctx.lineWidth = 1.5;
  ctx.lineCap = "round";
  streaks = streaks.filter((s) => {
    s.age += dt;
    s.x += s.dir * 260 * dt;
    ctx.globalAlpha = Math.max(0, 1 - s.age / 0.8);
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.quadraticCurveTo(
      s.x + s.dir * s.len * 0.5,
      s.y + Math.sin(t * 6 + s.phase) * 4,
      s.x + s.dir * s.len,
      s.y,
    );
    ctx.stroke();
    return s.age < 0.8;
  });
  ctx.globalAlpha = 1;
}

function drawBoat(t, dt) {
  const cruise = dirSign * Math.min(90, 12 + live.wind * 2.2);
  boatV += (cruise - boatV) * Math.min(1, dt * 0.6);
  boatX += boatV * dt;
  const facing = boatV >= 0 ? 1 : -1;
  boatFacing += (facing - boatFacing) * Math.min(1, dt * 4);
  const gust = Math.min(Math.abs(boatV - cruise), 200);
  if (boatX > W + 100) boatX = -100;
  if (boatX < -100) boatX = W + 100;

  const y = surface(boatX, t);
  const slope = (surface(boatX + 20, t) - surface(boatX - 20, t)) / 40;
  const heel = facing * (Math.min(live.wind, 30) * 0.006 + gust * 0.0015);
  const billow = 4 + Math.min(live.wind, 30) * 0.5 + gust * 0.04;
  const ink = "#2b2d42";

  ctx.save();
  ctx.translate(boatX, y);
  ctx.rotate(Math.atan(slope) + heel);
  ctx.scale(boatFacing * k, k); // bow points the way it's moving
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // keel and rudder (below the waterline, seen through the glass)
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(-4, 8);
  ctx.lineTo(10, 8);
  ctx.lineTo(7, 22);
  ctx.lineTo(-1, 22);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-30, 6);
  ctx.lineTo(-25, 6);
  ctx.lineTo(-26, 17);
  ctx.lineTo(-30, 15);
  ctx.closePath();
  ctx.fill();

  // hull with a curved sheer and raised bow
  const hull = new Path2D();
  hull.moveTo(-36, -6);
  hull.quadraticCurveTo(2, -3, 43, -11);
  hull.quadraticCurveTo(35, 4, 22, 10);
  hull.lineTo(-27, 10);
  hull.quadraticCurveTo(-34, 4, -36, -6);
  ctx.fillStyle = ink;
  ctx.fill(hull);
  ctx.save();
  ctx.clip(hull);
  ctx.fillStyle = "#e07a5f"; // boot stripe at the waterline
  ctx.beginPath();
  ctx.moveTo(-40, 1);
  ctx.lineTo(48, -1);
  ctx.lineTo(48, 2);
  ctx.lineTo(-40, 4);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-36, -3.5);
  ctx.quadraticCurveTo(2, -0.5, 44, -8.5);
  ctx.stroke();
  ctx.restore();

  // cabin
  ctx.fillStyle = "#f4f3ef";
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-20, -11, 17, 7, 2.5);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.arc(-12, -7.5, 1.2, 0, Math.PI * 2);
  ctx.fill();

  // rigging: forestay, mast, boom
  ctx.strokeStyle = "rgba(43, 45, 66, 0.5)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(1, -88);
  ctx.lineTo(42, -10);
  ctx.stroke();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -5);
  ctx.lineTo(0, -90);
  ctx.stroke();
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(0, -17);
  ctx.lineTo(-31, -15);
  ctx.stroke();

  // mainsail with battens
  const lc = [-18 - billow, -52];
  const main = new Path2D();
  main.moveTo(-1.5, -87);
  main.lineTo(-1.5, -18);
  main.lineTo(-30, -16.5);
  main.quadraticCurveTo(lc[0], lc[1], -1.5, -87);
  ctx.fillStyle = "#fbfaf6";
  ctx.fill(main);
  ctx.strokeStyle = "rgba(43, 45, 66, 0.18)";
  ctx.lineWidth = 1;
  [0.3, 0.52, 0.74].forEach((u) => {
    const bx = (1 - u) ** 2 * -30 + 2 * (1 - u) * u * lc[0] + u * u * -1.5;
    const by = (1 - u) ** 2 * -16.5 + 2 * (1 - u) * u * lc[1] + u * u * -87;
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx + 9, by + 0.5);
    ctx.stroke();
  });
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.2;
  ctx.stroke(main);

  // jib with an orange band around its edge
  const jib = new Path2D();
  jib.moveTo(3, -80);
  jib.quadraticCurveTo(20 + billow, -43, 38, -10);
  jib.lineTo(6, -15);
  jib.closePath();
  ctx.fillStyle = "#fbfaf6";
  ctx.fill(jib);
  ctx.save();
  ctx.clip(jib);
  ctx.strokeStyle = "#f28c28";
  ctx.lineWidth = 5;
  ctx.stroke(jib);
  ctx.restore();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.2;
  ctx.stroke(jib);

  // pennant
  ctx.fillStyle = "#e63946";
  ctx.beginPath();
  ctx.moveTo(0, -90);
  ctx.quadraticCurveTo(
    7,
    -88 + Math.sin(t * 10) * 2,
    14,
    -87 + Math.sin(t * 10 + 1) * 2,
  );
  ctx.lineTo(0, -84);
  ctx.fill();

  ctx.restore();
}

// lighter, slower swell behind the boat for depth
function drawBackWater(t) {
  ctx.beginPath();
  ctx.moveTo(0, waterTop + 30);
  for (let x = 0; x <= W + 8; x += 8)
    ctx.lineTo(x, surface(x + 60, t * 0.8) - 5);
  ctx.lineTo(W, waterTop + 30);
  ctx.closePath();
  ctx.fillStyle = rgba(palette.back, 0.55);
  ctx.fill();
}

function surfacePath(t, offset = 0) {
  ctx.beginPath();
  for (let x = 0; x <= W + 8; x += 8) ctx.lineTo(x, surface(x, t) + offset);
}

function drawWater(t) {
  surfacePath(t);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, waterTop - 15, 0, H);
  g.addColorStop(0, rgba(palette.stops[0], 0.8));
  g.addColorStop(0.5, rgba(palette.stops[1], 0.88));
  g.addColorStop(1, rgba(palette.stops[2], 0.95));
  ctx.fillStyle = g;
  ctx.fill();

  // light band just under the surface
  surfacePath(t, 5);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
  ctx.lineWidth = 5;
  ctx.stroke();

  // drifting caustic ripples
  ctx.lineWidth = 2;
  ctx.setLineDash([28, 42]);
  for (let k = 0; k < 4; k++) {
    const y0 = waterTop + 22 + k * 16;
    ctx.lineDashOffset = -t * 12 * dirSign + k * 17;
    ctx.beginPath();
    for (let x = 0; x <= W + 12; x += 12)
      ctx.lineTo(
        x,
        y0 +
          Math.sin(x * 0.05 + t * 1.3 + k * 2) * 3 +
          Math.sin(x * 0.013 - t * 0.7) * 4,
      );
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 - k * 0.02})`;
    ctx.stroke();
  }
  ctx.setLineDash([]);

  surfacePath(t);
  ctx.strokeStyle = rgba(palette.line, 1);
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawSand() {
  const sandY = (x) =>
    sandTop + Math.sin(x * 0.02) * 3 + Math.sin(x * 0.07) * 1.5;
  ctx.beginPath();
  for (let x = 0; x <= W + 20; x += 20) ctx.lineTo(x, sandY(x));
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, sandTop - 4, 0, H);
  g.addColorStop(0, "#efdfb2");
  g.addColorStop(1, "#dfc88e");
  ctx.fillStyle = g;
  ctx.fill();

  ctx.beginPath();
  for (let x = 0; x <= W + 20; x += 20) ctx.lineTo(x, sandY(x));
  ctx.strokeStyle = "rgba(150, 120, 60, 0.25)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  pebbles.forEach((p) => {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.ellipse(p.f * W, sandTop + p.dy, p.r * 1.4, p.r, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawWeeds(t) {
  const n = 7;
  weeds.forEach((w) => {
    const x0 = w.f * W;
    w.blades.forEach((b) => {
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const sway =
          Math.sin(t * 1.2 + b.phase + i * 0.5) * i * (0.9 + live.wind * 0.05);
        pts.push([x0 + b.dx + sway, sandTop + 5 - (b.h / n) * i]);
      }
      // tapered ribbon: up one side, back down the other
      ctx.fillStyle = b.color;
      ctx.beginPath();
      pts.forEach(([x, y], i) =>
        ctx.lineTo(x - (b.w / 2) * (1 - i / n) - 0.5, y),
      );
      pts
        .slice()
        .reverse()
        .forEach(([x, y], j) => ctx.lineTo(x + (b.w / 2) * (j / n) + 0.5, y));
      ctx.closePath();
      ctx.fill();
    });

    ctx.fillStyle = "#9b9a92";
    ctx.beginPath();
    ctx.ellipse(x0 + 9, sandTop + 6, 7, 4.5, 0, Math.PI, Math.PI * 2);
    ctx.fill();
  });
}

function drawFishShape(x, y, s, dir, t, phase, color, belly, stripe, tilt) {
  const wag = Math.sin(t * 8 + phase) * s * 0.22;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.rotate(tilt);

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-s * 0.7, 0);
  ctx.quadraticCurveTo(-s * 1.35, -s * 0.2 + wag, -s * 1.55, -s * 0.6 + wag);
  ctx.quadraticCurveTo(-s * 1.3, wag, -s * 1.55, s * 0.6 + wag);
  ctx.quadraticCurveTo(-s * 1.35, s * 0.2 + wag, -s * 0.7, 0);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -s * 0.5);
  ctx.quadraticCurveTo(-s * 0.3, -s * 0.85, -s * 0.6, -s * 0.72);
  ctx.lineTo(-s * 0.5, -s * 0.35);
  ctx.fill();

  const body = new Path2D();
  body.moveTo(s, 0);
  body.bezierCurveTo(s * 0.6, -s * 0.72, -s * 0.4, -s * 0.62, -s * 0.8, 0);
  body.bezierCurveTo(-s * 0.4, s * 0.62, s * 0.6, s * 0.72, s, 0);
  const g = ctx.createLinearGradient(0, -s * 0.6, 0, s * 0.6);
  g.addColorStop(0.45, color);
  g.addColorStop(1, belly);
  ctx.fillStyle = g;
  ctx.fill(body);

  if (stripe) {
    ctx.save();
    ctx.clip(body);
    ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
    ctx.fillRect(s * 0.05, -s, s * 0.22, s * 2);
    ctx.restore();
  }

  if (s > 6) {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(s * 0.52, -s * 0.12, s * 0.17, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#1f2328";
  ctx.beginPath();
  ctx.arc(s * 0.55, -s * 0.12, Math.max(0.9, s * 0.09), 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFish(t, dt) {
  const depth = sandTop - waterTop;
  const wrap = (o) => {
    if (o.x > W + 120) o.x = -120;
    if (o.x < -120) o.x = W + 120;
  };

  const swim = (f) => {
    f.boost = (f.boost || 0) * Math.exp(-dt * 2);
    f.x += f.dir * (f.speed + f.boost) * dt;
    wrap(f);
  };

  swim(school);
  const sy = waterTop + depth * school.depth + Math.sin(t * 0.6) * 10;
  school.y = sy;
  school.members.forEach((m) =>
    drawFishShape(
      school.x + school.dir * m.dx,
      sy + m.dy + Math.sin(t * 2 + m.phase) * 2,
      4.5,
      school.dir,
      t * 1.4,
      m.phase,
      "#6b7c8f",
      "#b8c4d0",
      false,
      0,
    ),
  );

  fish.forEach((f) => {
    swim(f);
    const y = waterTop + depth * f.depth + Math.sin(t + f.phase) * 6;
    f.y = y;
    const tilt = -Math.cos(t + f.phase) * 0.12;
    drawFishShape(
      f.x,
      y,
      f.size,
      f.dir,
      t,
      f.phase,
      f.color,
      f.belly,
      f.stripe,
      tilt,
    );
  });
}

function drawBubbles(t, dt) {
  if (Math.random() < dt * 1.5) {
    const w = weeds[Math.floor(Math.random() * weeds.length)];
    bubbles.push({
      x: w.f * W,
      y: sandTop,
      r: rand(1.5, 3.5),
      phase: rand(0, 6),
    });
  }
  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
  ctx.lineWidth = 1;
  bubbles = bubbles.filter((b) => {
    b.y -= 30 * dt;
    const x = b.x + Math.sin(t * 3 + b.phase) * 3;
    ctx.beginPath();
    ctx.arc(x, b.y, b.r, 0, Math.PI * 2);
    ctx.stroke();
    return b.y > surface(x, t) + 3;
  });
}

// faint reflections and edge shading so the viewport reads as the front pane of a tank
function drawGlass() {
  const top = waterTop - 15;
  ctx.fillStyle = "rgba(255, 255, 255, 0.09)";
  [
    [0.12, 60],
    [0.18, 18],
    [0.7, 90],
  ].forEach(([f, w]) => {
    const x = f * W;
    ctx.beginPath();
    ctx.moveTo(x, H);
    ctx.lineTo(x + w, H);
    ctx.lineTo(x + w + 80, top + 20);
    ctx.lineTo(x + 80, top + 20);
    ctx.closePath();
    ctx.fill();
  });

  [
    [0, 1],
    [W, -1],
  ].forEach(([x, d]) => {
    const g = ctx.createLinearGradient(x, 0, x + d * 18, 0);
    g.addColorStop(0, "rgba(20, 70, 110, 0.25)");
    g.addColorStop(1, "rgba(20, 70, 110, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(d > 0 ? 0 : W - 18, top, 18, H - top);
  });
}

function drawPrecip(t, dt) {
  if (reduceMotion.matches) return;
  const rain = isRain();
  const snow = isSnow();
  const target = rain || snow ? Math.min(400, 120 + weather.precip * 200) : 0;
  while (precip.length < target) precip.push({ x: rand(0, W), y: rand(-H, 0) });
  precip.length = Math.min(precip.length, target);

  const drift = dirSign * live.wind * (snow ? 2 : 8);
  ctx.strokeStyle = "rgba(90, 130, 170, 0.45)";
  ctx.fillStyle = "rgba(160, 175, 190, 0.8)";
  ctx.lineWidth = 1;
  precip.forEach((p) => {
    const vy = snow ? 50 : 600;
    p.x += (drift + (snow ? Math.sin(t + p.y * 0.05) * 15 : 0)) * dt;
    p.y += vy * dt;
    if (p.y > surface(p.x, t) || p.x < -20 || p.x > W + 20) {
      p.x = rand(0, W);
      p.y = rand(-40, 0);
    }
    ctx.beginPath();
    if (snow) {
      ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - (drift / vy) * 10, p.y - 10);
      ctx.stroke();
    }
  });
}

function drawFog() {
  if (!isFog()) return;
  const g = ctx.createLinearGradient(0, waterTop - 120, 0, waterTop + 60);
  g.addColorStop(0, "rgba(255, 255, 255, 0)");
  g.addColorStop(0.6, "rgba(255, 255, 255, 0.7)");
  g.addColorStop(1, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, waterTop - 120, W, 180);
}

function drawSplashes(t, dt) {
  ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  ctx.lineWidth = 1.5;
  splashes = splashes.filter((p) => {
    if (p.ring) {
      p.age += dt;
      const r = 6 + p.age * 50;
      ctx.globalAlpha = Math.max(0, 1 - p.age / 0.7);
      ctx.beginPath();
      ctx.ellipse(p.x, surface(p.x, t), r, r * 0.25, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
      return p.age < 0.7;
    }
    p.vy += 420 * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
    ctx.fill();
    return p.vy < 0 || p.y < surface(p.x, t);
  });
}

let last = performance.now();
let simTime = 0;
function frame(now) {
  // reduced-motion visitors get the same scene at about a third of the speed
  const dt =
    Math.min(0.05, (now - last) / 1000) * (reduceMotion.matches ? 0.35 : 1);
  last = now;
  simTime += dt;
  const t = simTime;
  const ease = Math.min(1, dt * 0.5);
  live.wind += (weather.wind - live.wind) * ease;
  live.cloud += (weather.cloud - live.cloud) * ease;
  updatePalette();

  ctx.clearRect(0, 0, W, H);
  drawSunOrMoon();
  drawClouds(dt);
  drawShore(t, dt);
  drawPrecip(t, dt);
  drawBackWater(t);
  drawBoat(t, dt);
  drawWater(t);
  drawSand();
  drawWeeds(t);
  drawFish(t, dt);
  drawBubbles(t, dt);
  drawGlass();
  drawFog();
  drawStreaks(t, dt);
  drawSplashes(t, dt);

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
