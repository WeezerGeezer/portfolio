import * as THREE from "three";
import { clamp, smoothstep, canvasTexture, hash, noise } from "./util.js";

const DEG = Math.PI / 180;
const LAT = 42.28 * DEG; // Ann Arbor

// Approximate solar elevation/azimuth for the visitor's local clock.
// Azimuth is measured from south, positive toward west.
export function sunPosition(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const doy = (date - start) / 864e5;
  const decl = 23.44 * DEG * Math.sin((2 * Math.PI * (doy - 81)) / 365);
  const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
  const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  const dst = date.getTimezoneOffset() < Math.max(jan, jul) ? 1 : 0;
  const hours =
    date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600 - dst;
  const H = (hours - 12) * 15 * DEG;
  const el = Math.asin(
    Math.sin(LAT) * Math.sin(decl) +
      Math.cos(LAT) * Math.cos(decl) * Math.cos(H),
  );
  const az = Math.atan2(
    Math.sin(H),
    Math.cos(H) * Math.sin(LAT) - Math.tan(decl) * Math.cos(LAT),
  );
  return { el, az };
}

// The clock time today at which the sun reaches `targetDeg` in the morning or evening.
export function findSunTime(base, targetDeg, morning) {
  const day = new Date(base);
  day.setHours(0, 0, 0, 0);
  let best = null;
  let bestErr = Infinity;
  for (let m = morning ? 0 : 720; m < (morning ? 720 : 1440); m += 4) {
    const t = new Date(day.getTime() + m * 60000);
    const err = Math.abs(sunPosition(t).el / DEG - targetDeg);
    if (err < bestErr) {
      bestErr = err;
      best = t;
    }
  }
  return best;
}

// Palette keyed by sun elevation (degrees).
const KEYS = [
  {
    e: -90,
    top: "#02040b",
    hor: "#081226",
    fog: "#060c18",
    hs: "#24365c",
    hg: "#05070a",
    hemi: 0.5,
    sun: "#ffffff",
    sunI: 0,
    cloud: "#1a2033",
    mtn: "#060b14",
  },
  {
    e: -14,
    top: "#040a1e",
    hor: "#141c3c",
    fog: "#0f1630",
    hs: "#2a3a66",
    hg: "#07080c",
    hemi: 0.55,
    sun: "#ffffff",
    sunI: 0,
    cloud: "#232a44",
    mtn: "#0a1020",
  },
  {
    e: -6,
    top: "#13214c",
    hor: "#7a4f74",
    fog: "#3d3858",
    hs: "#4c5c8c",
    hg: "#16120f",
    hemi: 0.7,
    sun: "#ff7a50",
    sunI: 0,
    cloud: "#6a5070",
    mtn: "#1d2036",
  },
  {
    e: 0,
    top: "#2c4a86",
    hor: "#f08a52",
    fog: "#a27066",
    hs: "#8696c4",
    hg: "#30241a",
    hemi: 0.9,
    sun: "#ff9550",
    sunI: 0.9,
    cloud: "#f2a07a",
    mtn: "#3a3448",
  },
  {
    e: 6,
    top: "#3f6db4",
    hor: "#ffc894",
    fog: "#c0aa98",
    hs: "#a6bce0",
    hg: "#4a3c28",
    hemi: 1.1,
    sun: "#ffcf94",
    sunI: 2.0,
    cloud: "#ffe2c4",
    mtn: "#5a6070",
  },
  {
    e: 20,
    top: "#2d68cc",
    hor: "#b5d2ee",
    fog: "#afc3d2",
    hs: "#bad2f0",
    hg: "#4f4a36",
    hemi: 1.25,
    sun: "#fff2dc",
    sunI: 2.8,
    cloud: "#ffffff",
    mtn: "#7b8b9e",
  },
  {
    e: 90,
    top: "#215ec4",
    hor: "#a6c8ec",
    fog: "#a6bccf",
    hs: "#bad2f0",
    hg: "#4f4a36",
    hemi: 1.3,
    sun: "#fff6e8",
    sunI: 3.0,
    cloud: "#ffffff",
    mtn: "#7b8b9e",
  },
];
const COLOR_FIELDS = ["top", "hor", "fog", "hs", "hg", "sun", "cloud", "mtn"];
const KEY_COLORS = KEYS.map((k) =>
  Object.fromEntries(COLOR_FIELDS.map((f) => [f, new THREE.Color(k[f])])),
);

function samplePalette(e) {
  let i = 0;
  while (i < KEYS.length - 2 && e > KEYS[i + 1].e) i++;
  const a = KEYS[i],
    b = KEYS[i + 1];
  const t = clamp((e - a.e) / (b.e - a.e), 0, 1);
  const out = {
    hemi: a.hemi + (b.hemi - a.hemi) * t,
    sunI: a.sunI + (b.sunI - a.sunI) * t,
  };
  for (const f of COLOR_FIELDS)
    out[f] = KEY_COLORS[i][f].clone().lerp(KEY_COLORS[i + 1][f], t);
  return out;
}

const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_Position = p.xyww;
  }
`;
const skyFrag = /* glsl */ `
  uniform vec3 uTop, uHorizon, uGround, uSunColor, uSunDir, uMoonDir;
  uniform float uSunVis, uMoonVis;
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 col = mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.55));
    col = mix(col, uGround, smoothstep(0.0, -0.2, h));
    float sd = max(dot(d, uSunDir), 0.0);
    col += uSunColor * (pow(sd, 6.0) * 0.25 + pow(sd, 48.0) * 0.5) * uSunVis;
    col += uSunColor * 6.0 * smoothstep(0.99955, 0.99975, sd) * uSunVis;
    float md = max(dot(d, uMoonDir), 0.0);
    col += vec3(0.95, 0.96, 1.0) * 1.6 * smoothstep(0.99935, 0.9996, md) * uMoonVis;
    col += vec3(0.35, 0.45, 0.7) * pow(md, 60.0) * 0.25 * uMoonVis;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function mountainRing(radius, minH, maxH, seed, segments = 160) {
  const pos = [];
  const idx = [];
  for (let i = 0; i <= segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const n =
      noise(i * 0.09 + seed, seed) * 0.65 +
      noise(i * 0.31 + seed * 2, seed) * 0.35;
    const h = minH + (maxH - minH) * n;
    pos.push(
      Math.cos(a) * radius,
      -80,
      Math.sin(a) * radius,
      Math.cos(a) * radius,
      h,
      Math.sin(a) * radius,
    );
    if (i < segments) {
      const k = i * 2;
      idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  geo.setIndex(idx);
  return geo;
}

export class Sky {
  constructor(scene, worldRoot, renderer) {
    this.scene = scene;
    this.renderer = renderer;
    this.uniforms = {
      uTop: { value: new THREE.Color() },
      uHorizon: { value: new THREE.Color() },
      uGround: { value: new THREE.Color() },
      uSunColor: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) },
      uMoonDir: { value: new THREE.Vector3(0.32, 0.4, -0.86).normalize() },
      uSunVis: { value: 1 },
      uMoonVis: { value: 0 },
    };
    const skyMat = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: skyVert,
      fragmentShader: skyFrag,
      side: THREE.BackSide,
      depthWrite: false,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(900, 48, 24), skyMat);
    this.dome.renderOrder = -10;
    this.dome.frustumCulled = false;
    worldRoot.add(this.dome);

    // stars
    const starPos = [];
    for (let i = 0; i < 1800; i++) {
      const a = hash(i, 1) * Math.PI * 2;
      const y = Math.pow(hash(i, 2), 0.7);
      const r = Math.sqrt(1 - y * y);
      starPos.push(Math.cos(a) * r * 860, y * 860, Math.sin(a) * r * 860);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(starPos, 3),
    );
    this.starMat = new THREE.PointsMaterial({
      color: "#ffffff",
      size: 1.6,
      sizeAttenuation: false,
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    this.stars = new THREE.Points(starGeo, this.starMat);
    this.stars.renderOrder = -9;
    worldRoot.add(this.stars);

    // distant ridgelines
    this.farMtnMat = new THREE.MeshBasicMaterial({ fog: false });
    this.nearMtnMat = new THREE.MeshBasicMaterial({ fog: false });
    const far = new THREE.Mesh(mountainRing(840, 25, 110, 3.1), this.farMtnMat);
    const near = new THREE.Mesh(mountainRing(700, 8, 55, 7.7), this.nearMtnMat);
    far.renderOrder = -8;
    near.renderOrder = -7;
    worldRoot.add(far, near);

    // clouds
    const cloudTex = canvasTexture(256, 128, (g, w, h) => {
      for (let i = 0; i < 22; i++) {
        const x = 40 + Math.random() * (w - 80),
          y = h * 0.55 + (Math.random() - 0.5) * 30;
        const r = 18 + Math.random() * 30;
        const grad = g.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, "rgba(255,255,255,0.55)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = grad;
        g.fillRect(0, 0, w, h);
      }
    });
    this.cloudMat = new THREE.SpriteMaterial({
      map: cloudTex,
      transparent: true,
      depthWrite: false,
      fog: false,
    });
    this.clouds = new THREE.Group();
    for (let i = 0; i < 16; i++) {
      const sp = new THREE.Sprite(this.cloudMat);
      const a = hash(i, 9) * Math.PI * 2;
      const dist = 520 + hash(i, 10) * 200;
      sp.position.set(
        Math.cos(a) * dist,
        90 + hash(i, 11) * 170,
        Math.sin(a) * dist,
      );
      const s = 160 + hash(i, 12) * 220;
      sp.scale.set(s, s * 0.45, 1);
      sp.renderOrder = -6;
      this.clouds.add(sp);
    }
    worldRoot.add(this.clouds);

    this.hemi = new THREE.HemisphereLight();
    this.sun = new THREE.DirectionalLight();
    scene.add(this.hemi, this.sun, this.sun.target);
    scene.fog = new THREE.Fog(0xffffff, 60, 600);

    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envScene = new THREE.Scene();
    this.envScene.add(
      new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), skyMat),
    );
    this.envE = null;
    this.sunDir = new THREE.Vector3();
    this.lightDir = new THREE.Vector3();
    this.state = {};
  }

  setTime(date) {
    const { el, az } = sunPosition(date);
    const e = el / DEG;
    const k = samplePalette(e);
    const U = this.uniforms;
    this.sunDir
      .set(
        -Math.cos(az) * Math.cos(el),
        Math.sin(el),
        -Math.sin(az) * Math.cos(el),
      )
      .normalize();
    U.uTop.value.copy(k.top);
    U.uHorizon.value.copy(k.hor);
    U.uGround.value.copy(k.fog).multiplyScalar(0.8);
    U.uSunColor.value.copy(k.sun);
    U.uSunDir.value.copy(this.sunDir);
    U.uSunVis.value = smoothstep(-3, 1, e);
    const night = smoothstep(-2, -12, e);
    U.uMoonVis.value = night;
    this.starMat.opacity = smoothstep(-5, -14, e);

    this.scene.fog.color.copy(k.fog);
    this.scene.fog.near = 30 + 50 * (1 - night);
    this.scene.fog.far = 280 + 340 * (1 - night);
    this.scene.background = k.fog;

    this.hemi.color.copy(k.hs);
    this.hemi.groundColor.copy(k.hg);
    this.hemi.intensity = k.hemi;

    const moonMix = smoothstep(0, -6, e);
    this.sun.color.copy(k.sun).lerp(new THREE.Color("#9fb2ff"), moonMix);
    this.sun.intensity = k.sunI * smoothstep(-1, 3, e) + moonMix * 0.35;
    this.lightDir.copy(moonMix > 0.5 ? U.uMoonDir.value : this.sunDir);

    this.cloudMat.color.copy(k.cloud);
    this.cloudMat.opacity = 0.9 - night * 0.55;
    this.farMtnMat.color.copy(k.mtn).lerp(k.hor, 0.35);
    this.nearMtnMat.color.copy(k.mtn).multiplyScalar(0.7);

    this.state = {
      elevation: e,
      night,
      headlights: smoothstep(5, -2, e),
      dashGlow: smoothstep(8, -4, e),
    };

    if (this.envE === null || Math.abs(this.envE - e) > 1.5) {
      this.envE = e;
      const old = this.scene.environment;
      this.scene.environment = this.pmrem.fromScene(
        this.envScene,
        0.04,
      ).texture;
      old?.dispose();
    }
    return this.state;
  }

  // Keep the directional light aligned with the rotating world.
  orient(quat) {
    this.sun.position
      .copy(this.lightDir)
      .applyQuaternion(quat)
      .multiplyScalar(100);
    this.clouds.rotation.y += 0.00002;
  }
}
