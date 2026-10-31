import * as THREE from "three";
import { World, LANE, roadDX, roadDY, curvature } from "./road.js";
import { Sky, findSunTime } from "./sky.js";
import { Cabin } from "./cabin.js";
import { Radio } from "./radio.js";
import * as ui from "./ui.js";
import { clamp, lerp, damp, season, noise } from "./util.js";

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const coarse = matchMedia("(pointer: coarse)").matches;
const params = new URLSearchParams(location.search);

const fontsReady = Promise.race([
  Promise.all(
    ["700 40px Caveat", "600 20px Overpass", "700 20px Overpass"].map((f) =>
      document.fonts.load(f),
    ),
  ),
  new Promise((r) => setTimeout(r, 2500)),
]);
const getJSON = (url) => fetch(url).then((r) => r.json());
const [blog, projects, career] = await Promise.all([
  getJSON("data/blog-posts.json"),
  getJSON("data/projects.json"),
  getJSON("data/career.json"),
  fontsReady,
]);
const posts = [...blog.posts]
  .sort((a, b) => b.date.localeCompare(a.date))
  .slice(0, 5);

// ---------- renderer / scene ----------
const canvas = document.getElementById("scene");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  logarithmicDepthBuffer: true,
  powerPreference: "high-performance",
});
let pixelRatio = Math.min(devicePixelRatio, coarse ? 1.5 : 1.75);
renderer.setPixelRatio(pixelRatio);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.environmentIntensity = 0.55;
const worldRoot = new THREE.Group();
scene.add(worldRoot);
const car = new THREE.Group();
scene.add(car);

const camera = new THREE.PerspectiveCamera(64, 1, 0.02, 2500);
camera.rotation.order = "YXZ";

const mirrorRT = new THREE.WebGLRenderTarget(512, 128);
const mirrorCam = new THREE.PerspectiveCamera(24, 4, 0.5, 900);
mirrorCam.position.set(0, 1.25, 1.6);
mirrorCam.rotation.y = Math.PI;
car.add(mirrorCam);

const world = new World(worldRoot, season());
const sky = new Sky(scene, worldRoot, renderer);
const cabin = new Cabin({
  posts,
  mirrorTexture: mirrorRT.texture,
  photoUrl: "assets/about-pic.JPEG",
});
cabin.group.position.set(-0.37, 1.18, 0);
car.add(cabin.group);
cabin.group.add(camera);
const mirrors = [];
cabin.group.traverse((o) => o.userData.isMirror && mirrors.push(o));
cabin.group.traverse((o) => {
  if (o.isMesh && o.material.transparent && !o.userData.hotspot)
    o.raycast = () => {};
});

const dashLight = new THREE.PointLight("#9fc4ff", 0, 1.4, 1.5);
dashLight.position.set(0.1, -0.2, -0.45);
cabin.group.add(dashLight);

const headlights = [-0.65, 0.65].map((x) => {
  const l = new THREE.SpotLight("#fff3dc", 0, 110, 0.42, 0.6, 1.1);
  l.position.set(x, 0.7, -2.1);
  l.target.position.set(x * 0.5, 0, -28);
  car.add(l, l.target);
  return l;
});

const radio = new Radio(cabin.radioCanvas, cabin.radioTex, (info) =>
  ui.setNowPlaying(info, radio.playlistUrl),
);
radio.load("data/radio.json").catch(() => {});

// ---------- time of day ----------
const PRESETS = ["Live", "Sunrise", "Midday", "Sunset", "Night"];
let preset = Math.max(
  0,
  PRESETS.map((p) => p.toLowerCase()).indexOf(
    (params.get("time") || "").toLowerCase(),
  ),
);
let timeOffset = 0;
function applyPreset() {
  const now = new Date();
  const target = {
    Live: now,
    Sunrise: findSunTime(now, 3, true),
    Midday: findSunTime(now, 90, true),
    Sunset: findSunTime(now, 3, false),
    Night: new Date(new Date(now).setHours(23, 0, 0, 0)),
  }[PRESETS[preset]];
  if (PRESETS[preset] === "Midday")
    target.setTime(
      Math.max(target.getTime(), new Date(now).setHours(12, 30, 0, 0)),
    );
  timeOffset = target - now;
}
function cycleTime() {
  preset = (preset + 1) % PRESETS.length;
  applyPreset();
  skyState = sky.setTime(clockDate());
  ui.toast(
    PRESETS[preset] === "Live" ? "Back to your local time" : PRESETS[preset],
  );
}
applyPreset();
const clockDate = () => new Date(Date.now() + timeOffset);
const clockText = () =>
  clockDate()
    .toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    .replace(/\s?[AP]M/i, "");
let skyState = sky.setTime(clockDate());
let lastSky = performance.now();

// ---------- drive state ----------
const SIGN_SPACING = 420;
let d = 8 * (1 + Math.floor(Math.random() * 12)) * SIGN_SPACING + 140 - 300;
let mph = 45;
let prevV = mph * 0.447;

// ---------- look + focus ----------
const look = { yaw: 0, pitch: 0, tYaw: -0.05, tPitch: 0.02 };
const cam = { fov: 64, focusT: 0 };
let baseFov = 64;
let focus = null;
const FOCI = {
  visor: {
    target: new THREE.Vector3(-0.075, 0.14, -0.465),
    width: 0.5,
    pos: new THREE.Vector3(-0.06, 0.0, -0.05),
  },
  radio: {
    target: new THREE.Vector3(0.36, -0.36, -0.49),
    width: 0.42,
    pos: new THREE.Vector3(0.1, -0.06, -0.14),
  },
  glovebox: {
    target: new THREE.Vector3(0.86, -0.36, -0.53),
    width: 1.6,
    pos: new THREE.Vector3(0.12, -0.04, -0.08),
  },
  about: {
    target: new THREE.Vector3(0.66, -0.17, -0.88),
    width: 0.9,
    pos: new THREE.Vector3(0.1, -0.02, -0.1),
  },
  contact: {
    target: new THREE.Vector3(0.24, -0.14, -0.71),
    width: 0.8,
    pos: new THREE.Vector3(0.04, -0.02, -0.12),
  },
  tassel: {
    target: new THREE.Vector3(0.4, 0.09, -0.466),
    width: 0.5,
    pos: new THREE.Vector3(0.06, 0.02, -0.08),
  },
};
for (const f of Object.values(FOCI)) {
  const v = f.target.clone().sub(f.pos);
  f.yaw = Math.atan2(-v.x, -v.z);
  f.pitch = Math.atan2(v.y, Math.hypot(v.x, v.z));
  f.dist = v.length();
}
let focusFrom = null;

function setFocus(name) {
  focus = name ? FOCI[name] : null;
  focusFrom = name;
  if (name !== "visor") cabin.visorTarget = 0;
  document.getElementById("back-btn").hidden = !(
    name === "visor" || name === "radio"
  );
}

// ---------- interactions ----------
const blogById = new Map(posts.map((p) => [p.id, p]));
function closeVisor() {
  cabin.visorTarget = 0;
  if (focusFrom === "visor") setFocus(null);
}
function openVisor() {
  cabin.visorTarget = 1.8;
  setFocus("visor");
}

const actions = {
  visor: () => (cabin.visorTarget > 0 ? closeVisor() : openVisor()),
  blog: () => openVisor(),
  glovebox: () => {
    cabin.gloveTarget = 1.15;
    setFocus("glovebox");
    setTimeout(
      () =>
        ui.openProjects(projects.projects, () => {
          cabin.gloveTarget = 0;
          setFocus(null);
        }),
      380,
    );
  },
  tassel: () => {
    cabin.flickTassel(reducedMotion ? 1 : 4);
    setFocus("tassel");
    setTimeout(() => ui.openJourney(career.stops, () => setFocus(null)), 650);
  },
  about: () => {
    setFocus("about");
    setTimeout(() => ui.openAbout(() => setFocus(null)), 350);
  },
  contact: () => {
    setFocus("contact");
    setTimeout(() => ui.openContact(() => setFocus(null)), 350);
  },
  radio: () => setFocus(focusFrom === "radio" ? null : "radio"),
  "radio-power": () => radio.toggle(),
  "radio-next": () => radio.next(),
  "radio-prev": () => radio.prev(),
  clock: () => cycleTime(),
  time: () => cycleTime(),
};

function activate(id) {
  if (!id) return;
  if (id.startsWith("post:")) {
    if (cabin.visorAngle < 1.1) return openVisor();
    const post = blogById.get(id.slice(5));
    ui.openBlogPost(post, () => {});
    return;
  }
  if (id.startsWith("radio-preset:")) {
    cabin.pressButton(id);
    radio.preset(Number(id.split(":")[1]));
    return;
  }
  if (id.startsWith("radio-")) cabin.pressButton(id);
  actions[id]?.();
  hint.classList.add("gone");
}

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerDirty = false;
let pointerPx = { x: 0, y: 0 };
let hoverId = null;
let overCanvas = true;
const hint = document.getElementById("hint");

function pick() {
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObject(cabin.group, true)[0];
  return hit?.object.userData.hotspot ?? null;
}

let drag = null;
canvas.addEventListener("pointerdown", (e) => {
  drag = {
    x: e.clientX,
    y: e.clientY,
    yaw: look.tYaw,
    pitch: look.tPitch,
    moved: 0,
    type: e.pointerType,
  };
});
window.addEventListener("pointermove", (e) => {
  overCanvas = e.target === canvas;
  pointer.set(
    (e.clientX / innerWidth) * 2 - 1,
    -(e.clientY / innerHeight) * 2 + 1,
  );
  pointerPx = { x: e.clientX, y: e.clientY };
  pointerDirty = true;
  if (drag) drag.moved += Math.abs(e.movementX) + Math.abs(e.movementY);
  if (e.pointerType === "mouse" && !ui.isPanelOpen()) {
    const nx = pointer.x,
      ny = pointer.y;
    look.tYaw = -Math.sign(nx) * Math.pow(Math.abs(nx), 1.35) * 1.1;
    look.tPitch =
      0.02 +
      Math.sign(ny) * Math.pow(Math.abs(ny), 1.2) * (ny > 0 ? 0.5 : 0.42);
  } else if (drag && drag.type !== "mouse") {
    look.tYaw = clamp(
      drag.yaw + ((e.clientX - drag.x) / innerWidth) * 2.4,
      -1.15,
      1.15,
    );
    look.tPitch = clamp(
      drag.pitch + ((e.clientY - drag.y) / innerHeight) * 1.6,
      -0.45,
      0.55,
    );
  }
});
window.addEventListener("pointerup", (e) => {
  if (!drag) return;
  const tap = drag.moved < 10;
  drag = null;
  if (!tap || e.target !== canvas) return;
  pointer.set(
    (e.clientX / innerWidth) * 2 - 1,
    -(e.clientY / innerHeight) * 2 + 1,
  );
  const id = pick();
  if (id) activate(id);
  else if (focusFrom === "visor") closeVisor();
  else if (focusFrom === "radio") setFocus(null);
});
window.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (ui.isPanelOpen()) ui.closePanel();
  else if (focusFrom === "visor") closeVisor();
  else if (focus) setFocus(null);
});
document
  .getElementById("back-btn")
  .addEventListener("click", () =>
    focusFrom === "visor" ? closeVisor() : setFocus(null),
  );
document.querySelectorAll("[data-action]").forEach((b) =>
  b.addEventListener("click", () => {
    const a = b.dataset.action;
    if (a === "radio") radio.toggle();
    else activate(a);
  }),
);

// ---------- resize ----------
function resize() {
  const w = innerWidth,
    h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  baseFov = clamp(
    2 *
      Math.atan(Math.tan((96 * Math.PI) / 360) / camera.aspect) *
      (180 / Math.PI),
    58,
    92,
  );
}
addEventListener("resize", resize);
resize();

// ---------- intro glint on interactive things ----------
const glintOrder = ["visor", "tassel", "about", "contact", "radio", "glovebox"];
let glintT = -1.2;

// ---------- loop ----------
let last = performance.now();
let frame = 0;
let slowFrames = 0;
const tmpQ = new THREE.Quaternion();

function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;
  frame++;

  // drive
  const k = curvature(d);
  const targetMph =
    (reducedMotion ? 28 : 46) -
    Math.min(8, Math.abs(k) * 1400) +
    Math.sin(t * 0.07) * 2;
  mph = damp(mph, targetMph, 0.6, dt);
  const v = mph * 0.447;
  const dx = roadDX(d),
    dy = roadDY(d);
  d += (v / Math.sqrt(1 + dx * dx + dy * dy)) * dt;
  const latAcc = v * v * k;
  const lonAcc = (v - prevV) / Math.max(dt, 1e-3);
  prevV = v;

  world.update(d, dt);
  worldRoot.rotation.set(-Math.atan(dy), Math.atan(dx), 0, "XYZ");

  const bump = reducedMotion ? 0 : 1;
  const roll = clamp(latAcc * 0.012, -0.05, 0.05);
  const pitch = bump * (noise(t * 2.1, 3.3) - 0.5) * 0.004;
  car.rotation.set(pitch, 0, roll);
  car.position.y =
    bump * ((noise(t * 7.3, 1.1) - 0.5) * 0.006 + Math.sin(t * 17) * 0.0006);

  if (now - lastSky > 1000) {
    lastSky = now;
    skyState = sky.setTime(clockDate());
    world.setNight(skyState.night);
    for (const l of headlights) l.intensity = skyState.headlights * 90;
    dashLight.intensity = skyState.dashGlow * 0.35;
    renderer.toneMappingExposure = 1 + skyState.night * 0.35;
  }
  sky.orient(worldRoot.getWorldQuaternion(tmpQ));

  // camera
  look.yaw = damp(look.yaw, look.tYaw, reducedMotion ? 3 : 5, dt);
  look.pitch = damp(look.pitch, look.tPitch, reducedMotion ? 3 : 5, dt);
  cam.focusT = damp(cam.focusT, focus ? 1 : 0, 4.5, dt);
  const f = focus || cam.lastFocus;
  if (focus) cam.lastFocus = focus;
  let yaw = look.yaw,
    pitchC = look.pitch,
    fov = baseFov;
  const pos = new THREE.Vector3(
    -look.yaw * 0.05,
    look.pitch * 0.025,
    -Math.max(0, -look.pitch) * 0.05,
  );
  if (f && cam.focusT > 0.001) {
    const ft = cam.focusT;
    const fFov = clamp(
      (2 * Math.atan(f.width / 2 / f.dist / camera.aspect) * 180) / Math.PI,
      26,
      100,
    );
    yaw = lerp(yaw, f.yaw + look.yaw * 0.08, ft);
    pitchC = lerp(pitchC, f.pitch + look.pitch * 0.06, ft);
    fov = lerp(fov, fFov, ft);
    pos.lerp(f.pos, ft);
  }
  camera.position.copy(pos);
  camera.rotation.set(pitchC, yaw, 0);
  if (Math.abs(camera.fov - fov) > 0.01) {
    camera.fov = fov;
  }
  camera.updateProjectionMatrix();

  // hover
  if (pointerDirty && !ui.isPanelOpen()) {
    pointerDirty = false;
    const id = coarse || !overCanvas ? null : pick();
    if (id !== hoverId) {
      hoverId = id;
      cabin.setHover(id);
      canvas.style.cursor = id ? "pointer" : "";
    }
    if (id)
      ui.showTooltip(
        cabin.hotspots.get(id)?.label ?? "",
        pointerPx.x,
        pointerPx.y,
      );
    else ui.hideTooltip();
  } else if (ui.isPanelOpen() && hoverId) {
    hoverId = null;
    cabin.setHover(null);
    ui.hideTooltip();
  }

  // first-visit glint
  if (glintT < glintOrder.length && !hoverId) {
    glintT += dt * 1.6;
    const i = Math.floor(glintT);
    const h = cabin.hotspots.get(glintOrder[i]);
    const s = Math.sin((glintT - i) * Math.PI);
    for (const id of glintOrder)
      for (const m of cabin.hotspots.get(id).mats)
        m.emissive
          .set("#ffcb05")
          .multiplyScalar(id === glintOrder[i] && glintT > 0 ? s * 0.22 : 0);
    if (i >= glintOrder.length) cabin.setHover(null);
  }

  cabin.update(dt, {
    time: t,
    mph,
    steer: Math.atan(2.7 * k) * 14,
    latAcc,
    lonAcc: clamp(lonAcc, -3, 3),
    roll,
    pitch,
    dashGlow: skyState.dashGlow,
    clock: clockText(),
  });
  radio.draw(now, clockText());

  // rear-view mirror
  if (!coarse || frame % 2 === 0) {
    for (const m of mirrors) m.visible = false;
    renderer.setRenderTarget(mirrorRT);
    renderer.render(scene, mirrorCam);
    renderer.setRenderTarget(null);
    for (const m of mirrors) m.visible = true;
  }
  renderer.render(scene, camera);

  // adaptive resolution
  if (dt > 0.024) slowFrames++;
  else slowFrames = Math.max(0, slowFrames - 1);
  if (slowFrames > 90 && pixelRatio > 1) {
    pixelRatio = Math.max(1, pixelRatio - 0.25);
    renderer.setPixelRatio(pixelRatio);
    resize();
    slowFrames = 0;
  }

  requestAnimationFrame(tick);
}

if (params.has("debug"))
  window.drive = { radio, cabin, activate, setFocus, look };

requestAnimationFrame((now) => {
  last = now;
  tick(now);
  document.body.classList.add("ready");
});
