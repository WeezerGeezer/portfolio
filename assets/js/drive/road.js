import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { hash, noise, smoothstep, canvasTexture, clamp } from "./util.js";

// Road-space: s = distance along the road, u = lateral offset (positive = right).
// Absolute world: road heads toward -z, wandering in x and y.

export const LANE = 1.8;
const ROAD_HALF = 3.75;

export const roadX = (s) =>
  60 * Math.sin(s / 260) +
  30 * Math.sin(s / 140 + 1) +
  12 * Math.sin(s / 67 + 2);
export const roadDX = (s) =>
  (60 / 260) * Math.cos(s / 260) +
  (30 / 140) * Math.cos(s / 140 + 1) +
  (12 / 67) * Math.cos(s / 67 + 2);
const roadDDX = (s) =>
  -(60 / 260 / 260) * Math.sin(s / 260) -
  (30 / 140 / 140) * Math.sin(s / 140 + 1) -
  (12 / 67 / 67) * Math.sin(s / 67 + 2);
export const roadY = (s) => 5 * Math.sin(s / 380) + 2.5 * Math.sin(s / 170 + 2);
export const roadDY = (s) =>
  (5 / 380) * Math.cos(s / 380) + (2.5 / 170) * Math.cos(s / 170 + 2);

// Positive = curving right.
export function curvature(s) {
  const d = roadDX(s);
  return roadDDX(s) / Math.pow(1 + d * d, 1.5);
}

export function roadPoint(s, u, out = {}) {
  const dx = roadDX(s);
  const inv = 1 / Math.sqrt(1 + dx * dx);
  out.x = roadX(s) + u * inv;
  out.z = -s + u * dx * inv;
  return out;
}

export function groundHeight(s, u) {
  const a = Math.abs(u);
  const base = roadY(s);
  if (a <= 4.6) return base - 0.05 - Math.max(0, a - 3.7) * 0.08;
  const ditch = -0.55 * Math.exp(-((a - 6.6) ** 2) / 2.2);
  const t = smoothstep(6.5, 30, a);
  const hills =
    (noise(s * 0.011, u * 0.011 + (u < 0 ? 50 : 0)) * 2 - 1) * 9 +
    noise(s * 0.04, u * 0.04) * 2.5;
  return base - 0.12 + ditch + t * (hills + (a - 6.5) * 0.06);
}

const SEASONS = {
  spring: {
    grass: "#5f8f3a",
    floor: "#3f5a28",
    gravel: "#857a6a",
    litter: null,
    leaves: ["#6fae3c", "#8cc152", "#5a9a32", "#a0c85a", "#f2c6d8"],
    pine: ["#2f5a35", "#3a6a3c", "#2a4f30"],
    bush: ["#5d9a35", "#4f8a2f", "#76a845"],
    bare: false,
  },
  summer: {
    grass: "#557f2e",
    floor: "#36502a",
    gravel: "#857a6a",
    litter: null,
    leaves: ["#3f7a2a", "#4f8a2f", "#356b26", "#5f9535"],
    pine: ["#2a4f30", "#335c37", "#24452a"],
    bush: ["#3f7a2a", "#4a7f2c", "#5a8a33"],
    bare: false,
  },
  autumn: {
    grass: "#7b7c45",
    floor: "#5e4a2c",
    gravel: "#857a6a",
    litter: "#9a5a26",
    leaves: [
      "#d9822b",
      "#c8401e",
      "#e8b23a",
      "#a8361a",
      "#d96a1e",
      "#8f9a32",
      "#f0c24a",
    ],
    pine: ["#2b4a2f", "#33573a", "#24402a"],
    bush: ["#b8562a", "#9a6a2a", "#c99a3a", "#6f7a30"],
    bare: false,
  },
  winter: {
    grass: "#dfe6ec",
    floor: "#d3dbe3",
    gravel: "#9a958e",
    litter: null,
    leaves: ["#6b5a4a", "#5e4f42", "#75654f"],
    pine: ["#34503a", "#3d5a42", "#2d4632"],
    bush: ["#7a6a58", "#8a7a68", "#5f6a5a"],
    bare: true,
  },
};

function roadTexture() {
  const tex = canvasTexture(512, 1024, (g, w, h) => {
    g.fillStyle = "#3b3c3f";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26000; i++) {
      const v = 40 + Math.random() * 40;
      g.fillStyle = `rgba(${v},${v},${v + 2},${0.25 + Math.random() * 0.35})`;
      g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
    }
    // worn tyre tracks
    const px = (u) => ((u + ROAD_HALF) / (ROAD_HALF * 2)) * w;
    for (const c of [-2.6, -1.0, 1.0, 2.6]) {
      const grad = g.createLinearGradient(px(c - 0.35), 0, px(c + 0.35), 0);
      grad.addColorStop(0, "rgba(20,20,22,0)");
      grad.addColorStop(0.5, "rgba(20,20,22,0.28)");
      grad.addColorStop(1, "rgba(20,20,22,0)");
      g.fillStyle = grad;
      g.fillRect(px(c - 0.35), 0, px(c + 0.35) - px(c - 0.35), h);
    }
    // patched cracks
    g.strokeStyle = "rgba(18,18,18,0.6)";
    g.lineWidth = 2;
    for (let i = 0; i < 6; i++) {
      g.beginPath();
      let x = Math.random() * w,
        y = Math.random() * h;
      g.moveTo(x, y);
      for (let k = 0; k < 6; k++)
        g.lineTo((x += (Math.random() - 0.5) * 40), (y += Math.random() * 30));
      g.stroke();
    }
    // edge lines
    g.fillStyle = "#e9e6dc";
    g.fillRect(px(-3.5), 0, px(-3.38) - px(-3.5), h);
    g.fillRect(px(3.38), 0, px(3.5) - px(3.38), h);
    // dashed centre line (3m dash per 12m)
    g.fillStyle = "#e8b41f";
    g.fillRect(px(-0.06), 0, px(0.06) - px(-0.06), h * 0.25);
  });
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 16;
  return tex;
}

function nonIndexed(geos) {
  return mergeGeometries(geos.map((g) => (g.index ? g.toNonIndexed() : g)));
}

function treeGeometries() {
  const pine = nonIndexed([
    new THREE.ConeGeometry(0.42, 0.42, 7).translate(0, 0.38, 0),
    new THREE.ConeGeometry(0.34, 0.38, 7).translate(0, 0.6, 0),
    new THREE.ConeGeometry(0.25, 0.34, 7).translate(0, 0.8, 0),
    new THREE.ConeGeometry(0.15, 0.24, 6).translate(0, 0.95, 0),
  ]);
  const spruce = nonIndexed([
    new THREE.ConeGeometry(0.3, 0.32, 6).translate(0, 0.3, 0),
    new THREE.ConeGeometry(0.27, 0.3, 6).translate(0, 0.46, 0),
    new THREE.ConeGeometry(0.22, 0.28, 6).translate(0, 0.62, 0),
    new THREE.ConeGeometry(0.16, 0.26, 6).translate(0, 0.78, 0),
    new THREE.ConeGeometry(0.1, 0.22, 5).translate(0, 0.93, 0),
  ]);
  const leafy = nonIndexed([
    new THREE.IcosahedronGeometry(0.3, 0).translate(0, 0.68, 0),
    new THREE.IcosahedronGeometry(0.22, 0).translate(0.18, 0.55, 0.08),
    new THREE.IcosahedronGeometry(0.24, 0).translate(-0.17, 0.58, -0.1),
    new THREE.IcosahedronGeometry(0.2, 0).translate(0.02, 0.86, 0.05),
  ]);
  const trunk = new THREE.CylinderGeometry(0.03, 0.055, 0.5, 5).translate(
    0,
    0.25,
    0,
  );
  const bush = nonIndexed([
    new THREE.IcosahedronGeometry(0.5, 0).translate(0, 0.35, 0),
    new THREE.IcosahedronGeometry(0.38, 0).translate(0.4, 0.25, 0.1),
    new THREE.IcosahedronGeometry(0.34, 0).translate(-0.35, 0.22, -0.1),
  ]);
  const rock = new THREE.DodecahedronGeometry(0.5, 0);
  return { pine, spruce, leafy, trunk, bush, rock };
}

function signTexture(def) {
  return canvasTexture(512, def.shape === "diamond" ? 512 : 320, (g, w, h) => {
    g.textAlign = "center";
    g.textBaseline = "middle";
    if (def.shape === "diamond") {
      g.translate(w / 2, h / 2);
      g.rotate(Math.PI / 4);
      g.fillStyle = "#f2c230";
      g.beginPath();
      g.roundRect(-170, -170, 340, 340, 24);
      g.fill();
      g.lineWidth = 12;
      g.strokeStyle = "#111";
      g.beginPath();
      g.roundRect(-152, -152, 304, 304, 16);
      g.stroke();
      g.rotate(-Math.PI / 4);
      g.fillStyle = "#111";
      g.font = 'bold 64px "Overpass", "Arial Narrow", Arial, sans-serif';
      def.lines.forEach((l, i) =>
        g.fillText(l, 0, (i - (def.lines.length - 1) / 2) * 70),
      );
      return;
    }
    const bg = { guide: "#1f6b3a", brown: "#6b4026", white: "#f4f4f0" }[
      def.shape
    ];
    const fg = def.shape === "white" ? "#111" : "#f4f4f0";
    g.fillStyle = bg;
    g.beginPath();
    g.roundRect(4, 4, w - 8, h - 8, 28);
    g.fill();
    g.strokeStyle = fg;
    g.lineWidth = 8;
    g.beginPath();
    g.roundRect(18, 18, w - 36, h - 36, 18);
    g.stroke();
    g.fillStyle = fg;
    if (def.shape === "white") {
      g.font = 'bold 54px "Overpass", Arial, sans-serif';
      g.fillText(def.lines[0], w / 2, 82);
      g.font = 'bold 150px "Overpass", Arial, sans-serif';
      g.fillText(def.lines[1], w / 2, 205);
      return;
    }
    const n = def.lines.length;
    def.lines.forEach((l, i) => {
      g.font = `${i === 0 ? "bold " : ""}${i === 0 ? 70 : 54}px "Overpass", Arial, sans-serif`;
      g.fillText(l, w / 2, h / 2 + (i - (n - 1) / 2) * 86);
    });
  });
}

const SIGNS = [
  { shape: "guide", lines: ["Blog Posts", "Check the visor ↖"] },
  { shape: "white", lines: ["SPEED LIMIT", "45"] },
  { shape: "guide", lines: ["Projects", "Glovebox →"] },
  { shape: "diamond", lines: ["DEER", "XING"] },
  { shape: "brown", lines: ["Scenic Route", "Keep Driving"] },
  { shape: "guide", lines: ["Ann Arbor", "Go Blue  ↑"] },
  { shape: "guide", lines: ["Say Hi", "Tap the phone"] },
  { shape: "diamond", lines: ["WINDING", "ROAD"] },
];
const SIGN_SPACING = 420;

export class World {
  constructor(parent, seasonName) {
    this.group = new THREE.Group();
    parent.add(this.group);
    this.pal = SEASONS[seasonName];
    this.base = { x: 0, y: 0, z: 0 };
    this.keys = {};
    this.night = 0;
    this.buildTerrain();
    this.buildRoad();
    this.buildFlora();
    this.buildRoadside();
    this.buildSigns();
    this.buildTraffic();
  }

  // ---------- terrain ----------
  buildTerrain() {
    this.tCols = [
      -150, -110, -80, -58, -42, -31, -23, -17, -12.5, -9, -7.4, -6.2, -5.2,
      -4.4, -3.9, 3.9, 4.4, 5.2, 6.2, 7.4, 9, 12.5, 17, 23, 31, 42, 58, 80, 110,
      150,
    ];
    this.tRows = 112;
    this.tStep = 6;
    const nc = this.tCols.length;
    const n = this.tRows * nc;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(n * 3), 3),
    );
    geo.setAttribute(
      "color",
      new THREE.BufferAttribute(new Float32Array(n * 3), 3),
    );
    const idx = [];
    for (let r = 0; r < this.tRows - 1; r++) {
      for (let c = 0; c < nc - 1; c++) {
        const a = r * nc + c,
          b = a + 1,
          d = a + nc,
          e = d + 1;
        idx.push(a, b, d, b, e, d);
      }
    }
    geo.setIndex(idx);
    this.terrain = new THREE.Mesh(
      geo,
      new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
    );
    this.terrain.frustumCulled = false;
    this.group.add(this.terrain);
    this.cGrass = new THREE.Color(this.pal.grass);
    this.cFloor = new THREE.Color(this.pal.floor);
    this.cGravel = new THREE.Color(this.pal.gravel);
    this.cLitter = this.pal.litter && new THREE.Color(this.pal.litter);
  }

  updateTerrain(d) {
    const s0 = Math.floor((d - 60) / this.tStep) * this.tStep;
    if (this.keys.terrain === s0) return;
    this.keys.terrain = s0;
    const pos = this.terrain.geometry.attributes.position;
    const col = this.terrain.geometry.attributes.color;
    const p = {};
    const c = new THREE.Color();
    const B = this.base;
    let i = 0;
    for (let r = 0; r < this.tRows; r++) {
      const s = s0 + r * this.tStep;
      for (const u of this.tCols) {
        roadPoint(s, u, p);
        const h = groundHeight(s, u);
        pos.setXYZ(i, p.x - B.x, h - B.y, p.z - B.z);
        const a = Math.abs(u);
        if (a < 5) c.copy(this.cGravel);
        else {
          const n = noise(s * 0.05, u * 0.05);
          c.copy(this.cGrass).lerp(
            this.cFloor,
            clamp(smoothstep(9, 28, a) * 0.85 + (n - 0.5) * 0.5, 0, 1),
          );
          if (this.cLitter && n > 0.55) c.lerp(this.cLitter, (n - 0.55) * 1.6);
          c.multiplyScalar(0.88 + hash(s, u) * 0.2);
        }
        col.setXYZ(i, c.r, c.g, c.b);
        i++;
      }
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
    this.terrain.geometry.computeVertexNormals();
  }

  // ---------- road ----------
  buildRoad() {
    this.rRows = 330;
    this.rStep = 2;
    const n = this.rRows * 3;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(new Float32Array(n * 3), 3),
    );
    geo.setAttribute(
      "uv",
      new THREE.BufferAttribute(new Float32Array(n * 2), 2),
    );
    const idx = [];
    for (let r = 0; r < this.rRows - 1; r++) {
      for (let c = 0; c < 2; c++) {
        const a = r * 3 + c,
          b = a + 1,
          d = a + 3,
          e = d + 1;
        idx.push(a, b, d, b, e, d);
      }
    }
    geo.setIndex(idx);
    this.road = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        map: roadTexture(),
        roughness: 0.88,
        metalness: 0,
      }),
    );
    this.road.frustumCulled = false;
    this.group.add(this.road);
  }

  updateRoad(d) {
    const s0 = Math.floor((d - 30) / this.rStep) * this.rStep;
    if (this.keys.road === s0) return;
    this.keys.road = s0;
    const pos = this.road.geometry.attributes.position;
    const uv = this.road.geometry.attributes.uv;
    const vBase = Math.floor(s0 / 12) * 12;
    const p = {};
    const B = this.base;
    let i = 0;
    for (let r = 0; r < this.rRows; r++) {
      const s = s0 + r * this.rStep;
      const y = roadY(s);
      for (const u of [-ROAD_HALF, 0, ROAD_HALF]) {
        roadPoint(s, u, p);
        pos.setXYZ(i, p.x - B.x, y + (u === 0 ? 0.03 : 0) - B.y, p.z - B.z);
        uv.setXY(i, (u + ROAD_HALF) / (ROAD_HALF * 2), (s - vBase) / 12);
        i++;
      }
    }
    pos.needsUpdate = true;
    uv.needsUpdate = true;
    this.road.geometry.computeVertexNormals();
  }

  // ---------- trees, bushes, rocks ----------
  buildFlora() {
    const geos = treeGeometries();
    const N = 1700;
    const mk = (geo, mat, count = N) => {
      const m = new THREE.InstancedMesh(geo, mat, count);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      m.frustumCulled = false;
      m.count = 0;
      this.group.add(m);
      return m;
    };
    const foliage = () => new THREE.MeshLambertMaterial({ flatShading: true });
    this.flora = {
      pine: mk(geos.pine, foliage()),
      spruce: mk(geos.spruce, foliage()),
      leafy: mk(geos.leafy, foliage()),
      trunk: mk(
        geos.trunk,
        new THREE.MeshLambertMaterial({ flatShading: true }),
        N * 3,
      ),
      bush: mk(geos.bush, foliage(), 900),
      rock: mk(
        geos.rock,
        new THREE.MeshLambertMaterial({ flatShading: true }),
        300,
      ),
    };
  }

  updateFlora(d) {
    const SLOT = 3;
    const first = Math.floor((d - 40) / SLOT);
    if (this.keys.flora === first) return;
    this.keys.flora = first;
    const last = Math.floor((d + 560) / SLOT);
    const F = this.flora;
    const counts = { pine: 0, spruce: 0, leafy: 0, trunk: 0, bush: 0, rock: 0 };
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const v = new THREE.Vector3();
    const sc = new THREE.Vector3();
    const c = new THREE.Color();
    const p = {};
    const B = this.base;
    const pal = this.pal;
    const put = (kind, s, u, scale, yaw, color, lean = 0, sy = 1) => {
      const mesh = F[kind];
      const i = counts[kind];
      if (i >= mesh.instanceMatrix.count) return;
      roadPoint(s, u, p);
      v.set(p.x - B.x, groundHeight(s, u) - B.y - 0.05, p.z - B.z);
      q.setFromEuler(e.set(lean, yaw, lean * 0.5));
      sc.set(scale, scale * sy, scale);
      m.compose(v, q, sc);
      mesh.setMatrixAt(i, m);
      if (color) mesh.setColorAt(i, color);
      counts[kind]++;
    };
    const pick = (arr, r) => arr[Math.floor(r * arr.length) % arr.length];

    for (let slot = first; slot <= last; slot++) {
      for (let k = 0; k < 7; k++) {
        const r1 = hash(slot, k * 7.13),
          r2 = hash(slot * 1.71, k + 3.3),
          r3 = hash(slot * 0.37, k * 1.9 + 9.1);
        const r4 = hash(slot * 2.3 + 4.1, k * 0.7),
          r5 = hash(slot * 0.91 + 1.3, k * 5.3);
        const side = r1 < 0.5 ? -1 : 1;
        const u = side * (8.2 + Math.pow(r2, 1.7) * 140);
        const s = slot * SLOT + r3 * SLOT;
        const dens = noise(s * 0.008, u * 0.012);
        if (r4 > 0.25 + dens * 1.1) continue;
        const piney = noise(s * 0.004 + 9, u * 0.006);
        const yaw = r5 * Math.PI * 2;
        const lean = (r2 - 0.5) * 0.08;
        if (r5 < piney * 1.15) {
          const kind = (r1 * 10) % 1 < 0.45 ? "spruce" : "pine";
          const h = 9 + r4 * 13 + r3 * 4;
          c.set(pick(pal.pine, r3)).multiplyScalar(0.85 + r2 * 0.3);
          put(kind, s, u, h, yaw, c, lean);
          c.set("#4a3626");
          put("trunk", s, u, h * 0.9, yaw, c, lean, 0.9);
        } else {
          const h = 7 + r4 * 8 + r3 * 3;
          c.set(pick(pal.leaves, (r3 * 7.7) % 1)).multiplyScalar(
            0.85 + r2 * 0.3,
          );
          put(
            "leafy",
            s,
            u,
            pal.bare ? h * 0.8 : h,
            yaw,
            c,
            lean,
            pal.bare ? 0.85 : 1,
          );
          c.set(r4 > 0.82 ? "#d9d4c8" : "#4f3b2a");
          put("trunk", s, u, h, yaw, c, lean, 1.1);
        }
      }
      // undergrowth near the shoulder
      for (let k = 0; k < 3; k++) {
        const r1 = hash(slot + 0.5, k * 3.7 + 1),
          r2 = hash(slot * 1.3, k * 9.1 + 2),
          r3 = hash(slot * 0.7, k + 31);
        const side = r1 < 0.5 ? -1 : 1;
        const u = side * (5.6 + r2 * r2 * 18);
        const s = slot * SLOT + r3 * SLOT;
        if (r3 < 0.12) {
          c.set("#8a8a86").multiplyScalar(0.8 + r2 * 0.4);
          put("rock", s, u, 0.3 + r1 * 0.9, r2 * 6, c, r3, 0.6);
        } else if (r2 > 0.15) {
          c.set(pick(pal.bush, (r3 * 3) % 1)).multiplyScalar(0.8 + r1 * 0.35);
          put("bush", s, u, 0.5 + r3 * 1.1, r1 * 6, c, 0, 0.8 + r2 * 0.4);
        }
      }
    }
    for (const kind in F) {
      const mesh = F[kind];
      mesh.count = counts[kind];
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
  }

  // ---------- delineator posts ----------
  buildRoadside() {
    const N = 40;
    this.posts = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.09, 1.1, 0.06).translate(0, 0.55, 0),
      new THREE.MeshLambertMaterial({ color: "#e8e6e0" }),
      N,
    );
    this.reflectorMat = new THREE.MeshBasicMaterial({ color: "#ffb340" });
    this.reflectors = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.07, 0.16, 0.065).translate(0, 0.93, 0),
      this.reflectorMat,
      N,
    );
    for (const m of [this.posts, this.reflectors]) {
      m.frustumCulled = false;
      m.count = 0;
      this.group.add(m);
    }
  }

  updateRoadside(d) {
    const SP = 50;
    const first = Math.floor((d - 20) / SP);
    if (this.keys.posts === first) return;
    this.keys.posts = first;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const v = new THREE.Vector3();
    const one = new THREE.Vector3(1, 1, 1);
    const p = {};
    const B = this.base;
    let n = 0;
    for (let i = first; i < first + 20 && n < 40; i++) {
      for (const side of [1, -1]) {
        if (side < 0 && i % 2) continue;
        const s = i * SP + (side < 0 ? 25 : 0);
        const u = side * 4.7;
        roadPoint(s, u, p);
        v.set(p.x - B.x, roadY(s) - 0.1 - B.y, p.z - B.z);
        q.setFromAxisAngle(
          THREE.Object3D.DEFAULT_UP,
          Math.atan2(-roadDX(s), 1),
        );
        m.compose(v, q, one);
        this.posts.setMatrixAt(n, m);
        this.reflectors.setMatrixAt(n, m);
        n++;
      }
    }
    this.posts.count = this.reflectors.count = n;
    this.posts.instanceMatrix.needsUpdate = true;
    this.reflectors.instanceMatrix.needsUpdate = true;
  }

  // ---------- signs ----------
  buildSigns() {
    this.signTex = SIGNS.map(signTexture);
    const postMat = new THREE.MeshStandardMaterial({
      color: "#9ea3a8",
      metalness: 0.7,
      roughness: 0.4,
    });
    this.signPool = [0, 1, 2].map(() => {
      const g = new THREE.Group();
      const panelMat = new THREE.MeshStandardMaterial({
        roughness: 0.5,
        metalness: 0.1,
      });
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), panelMat);
      const back = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshStandardMaterial({
          color: "#8d9196",
          metalness: 0.6,
          roughness: 0.5,
        }),
      );
      back.rotation.y = Math.PI;
      back.position.z = -0.01;
      const postL = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 1, 6),
        postMat,
      );
      const postR = postL.clone();
      g.add(panel, back, postL, postR);
      g.userData = { panel, back, postL, postR, idx: -1 };
      g.visible = false;
      this.group.add(g);
      return g;
    });
  }

  updateSigns(d) {
    const first = Math.ceil((d - 170) / SIGN_SPACING);
    const key = first;
    if (this.keys.signs === key) return;
    this.keys.signs = key;
    const p = {};
    const B = this.base;
    this.signPool.forEach((g, k) => {
      const i = first + k;
      const s = i * SIGN_SPACING + 140;
      const def = SIGNS[((i % SIGNS.length) + SIGNS.length) % SIGNS.length];
      const tex = this.signTex[SIGNS.indexOf(def)];
      const { panel, back, postL, postR } = g.userData;
      const diamond = def.shape === "diamond";
      const w = diamond ? 1.3 : 2.2,
        h = diamond ? 1.3 : 1.375;
      const lift = diamond ? 1.6 : 1.9;
      panel.material.map = tex;
      panel.material.needsUpdate = true;
      panel.scale.set(w, h, 1);
      back.scale.set(diamond ? 0.95 : w, diamond ? 0.95 : h, 1);
      back.rotation.z = diamond ? Math.PI / 4 : 0;
      panel.position.y = back.position.y = lift + h / 2;
      const two = !diamond;
      postL.scale.y = postR.scale.y = lift + h * 0.8;
      postL.position.set(two ? -w * 0.3 : 0, (lift + h * 0.8) / 2, -0.03);
      postR.position.set(w * 0.3, (lift + h * 0.8) / 2, -0.03);
      postR.visible = two;
      const u = 6.2;
      roadPoint(s, u, p);
      g.position.set(p.x - B.x, groundHeight(s, u) - B.y, p.z - B.z);
      g.rotation.y = Math.atan2(-roadDX(s), 1) - 0.12;
      g.visible = true;
    });
  }

  // ---------- oncoming traffic ----------
  buildTraffic() {
    const car = new THREE.Group();
    const paint = new THREE.MeshStandardMaterial({
      color: "#8a1c1c",
      metalness: 0.5,
      roughness: 0.35,
    });
    const glass = new THREE.MeshStandardMaterial({
      color: "#111820",
      metalness: 0.8,
      roughness: 0.15,
    });
    const dark = new THREE.MeshStandardMaterial({
      color: "#141414",
      roughness: 0.9,
    });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.62, 4.4), paint);
    body.position.y = 0.62;
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.5, 2.2), glass);
    cabin.position.set(0, 1.15, -0.2);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 1.8), paint);
    roof.position.set(0, 1.42, -0.25);
    car.add(body, cabin, roof);
    const wheelGeo = new THREE.CylinderGeometry(0.33, 0.33, 0.24, 14).rotateZ(
      Math.PI / 2,
    );
    for (const [x, z] of [
      [-0.82, 1.35],
      [0.82, 1.35],
      [-0.82, -1.35],
      [0.82, -1.35],
    ]) {
      const w = new THREE.Mesh(wheelGeo, dark);
      w.position.set(x, 0.33, z);
      car.add(w);
    }
    this.trafficLights = new THREE.MeshBasicMaterial({ color: "#fff6e0" });
    const tail = new THREE.MeshBasicMaterial({ color: "#7a0b0b" });
    for (const x of [-0.62, 0.62]) {
      const hl = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.14, 0.04),
        this.trafficLights,
      );
      hl.position.set(x, 0.72, 2.21);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.12, 0.04), tail);
      tl.position.set(x, 0.75, -2.21);
      car.add(hl, tl);
    }
    const glowTex = canvasTexture(64, 64, (g) => {
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(255,250,230,1)");
      grad.addColorStop(0.25, "rgba(255,240,200,0.5)");
      grad.addColorStop(1, "rgba(255,240,200,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
    });
    this.trafficGlow = new THREE.SpriteMaterial({
      map: glowTex,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      opacity: 0,
    });
    for (const x of [-0.62, 0.62]) {
      const sp = new THREE.Sprite(this.trafficGlow);
      sp.position.set(x, 0.72, 2.4);
      sp.scale.setScalar(2.2);
      car.add(sp);
    }
    car.visible = false;
    this.group.add(car);
    this.traffic = { car, paint, s: 0, active: false, timer: 12 };
  }

  updateTraffic(d, dt) {
    const T = this.traffic;
    if (!T.active) {
      T.timer -= dt;
      if (T.timer > 0) return;
      T.active = true;
      T.s = d + 700;
      T.paint.color.set(
        ["#8a1c1c", "#1d3f6e", "#d8d8d4", "#2b2b2e", "#476b3a", "#c59a2a"][
          Math.floor(Math.random() * 6)
        ],
      );
      T.car.visible = true;
    }
    T.s -= 23 * dt;
    if (T.s < d - 40) {
      T.active = false;
      T.car.visible = false;
      T.timer = 25 + Math.random() * 45;
      return;
    }
    const p = roadPoint(T.s, -LANE);
    const B = this.base;
    T.car.position.set(p.x - B.x, roadY(T.s) - B.y, p.z - B.z);
    T.car.rotation.set(0, Math.atan2(-roadDX(T.s), 1), 0);
  }

  setNight(night) {
    this.night = night;
    this.reflectorMat.color.set("#ffb340").multiplyScalar(0.25 + night * 1.6);
    this.trafficLights.color.set("#fff6e0").multiplyScalar(0.6 + night * 1.8);
    this.trafficGlow.opacity = night;
  }

  update(d, dt) {
    const o = roadPoint(d, LANE);
    o.y = roadY(d);
    if (Math.hypot(o.x - this.base.x, o.z - this.base.z) > 600) {
      this.base = { x: o.x, y: o.y, z: o.z };
      this.keys = {};
    }
    this.group.position.set(
      this.base.x - o.x,
      this.base.y - o.y,
      this.base.z - o.z,
    );
    this.updateTerrain(d);
    this.updateRoad(d);
    this.updateFlora(d);
    this.updateRoadside(d);
    this.updateSigns(d);
    this.updateTraffic(d, dt);
  }
}
