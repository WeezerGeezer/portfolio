import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { canvasTexture, makeCanvas, wrapText, clamp, damp } from "./util.js";

// Cabin space: the driver's eye is the origin, -z is forward, +x is right.
const CX = 0.37; // car centreline
const V = (x, y, z) => new THREE.Vector3(x, y, z);

const std = (color, roughness = 0.7, extra = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0, ...extra });
const rbox = (w, h, d, r = 0.01, seg = 3) =>
  new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2));

function mesh(geo, mat, x = 0, y = 0, z = 0, parent) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent?.add(m);
  return m;
}

function beam(a, b, w, h, mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, a.distanceTo(b)), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.lookAt(b);
  return m;
}

export function blockMShape(width = 1) {
  const pts = [
    [0, 72],
    [34, 72],
    [50, 47],
    [66, 72],
    [100, 72],
    [100, 56],
    [92, 56],
    [92, 16],
    [100, 16],
    [100, 0],
    [60, 0],
    [60, 16],
    [68, 16],
    [68, 41],
    [50, 14],
    [32, 41],
    [32, 16],
    [40, 16],
    [40, 0],
    [0, 0],
    [0, 16],
    [8, 16],
    [8, 56],
    [0, 56],
  ];
  const k = width / 100;
  const shape = new THREE.Shape();
  pts.forEach(([x, y], i) =>
    (i ? shape.lineTo : shape.moveTo).call(shape, (x - 50) * k, (y - 36) * k),
  );
  shape.closePath();
  return shape;
}

function windshieldTexture() {
  return canvasTexture(2048, 1024, (g, w, h) => {
    g.fillStyle = "rgba(120,150,160,0.04)";
    g.fillRect(0, 0, w, h);
    const band = g.createLinearGradient(0, 0, 0, h * 0.2);
    band.addColorStop(0, "rgba(30,80,100,0.5)");
    band.addColorStop(1, "rgba(30,80,100,0)");
    g.fillStyle = band;
    g.fillRect(0, 0, w, h * 0.2);
    // black ceramic frit border fading out in a fine dot pattern
    g.fillStyle = "#050505";
    const b = 16;
    g.fillRect(0, 0, w, b);
    g.fillRect(0, h - b * 2, w, b * 2);
    g.fillRect(0, 0, b, h);
    g.fillRect(w - b, 0, b, h);
    const dot = (x, y, r) => {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    };
    for (let row = 0; row < 5; row++) {
      const r = 2.4 - row * 0.45;
      const o = b + 4 + row * 6;
      for (let x = b; x < w - b; x += 6) {
        dot(x, o, r);
        dot(x, h - b * 2 - 4 - row * 6, r);
      }
      for (let y = b; y < h - b; y += 6) {
        dot(o, y, r);
        dot(w - o, y, r);
      }
    }
    g.fillRect(w * 0.475, 0, w * 0.05, h * 0.1);
  });
}

function gaugeTexture() {
  return canvasTexture(1024, 384, (g, w, h) => {
    g.fillStyle = "#08090b";
    g.fillRect(0, 0, w, h);
    const dial = (cx, max, step, label, red) => {
      const R = 168;
      const grad = g.createRadialGradient(cx, 192, 20, cx, 192, R);
      grad.addColorStop(0, "#15171b");
      grad.addColorStop(1, "#0b0c0e");
      g.fillStyle = grad;
      g.beginPath();
      g.arc(cx, 192, R, 0, Math.PI * 2);
      g.fill();
      g.strokeStyle = "#3a3e45";
      g.lineWidth = 4;
      g.stroke();
      const ang = (f) => ((135 - 270 * f) * Math.PI) / 180;
      const minor = step / 4;
      for (let v = 0; v <= max + 0.001; v += minor) {
        const f = v / max;
        const a = ang(f);
        const major = Math.abs(v / step - Math.round(v / step)) < 0.01;
        const r1 = R - 14,
          r2 = major ? R - 40 : R - 26;
        g.strokeStyle = red && v >= red ? "#ff3b30" : "#f2f2f2";
        g.lineWidth = major ? 5 : 2.5;
        g.beginPath();
        g.moveTo(cx - Math.sin(a) * r1, 192 - Math.cos(a) * r1);
        g.lineTo(cx - Math.sin(a) * r2, 192 - Math.cos(a) * r2);
        g.stroke();
        if (major) {
          g.fillStyle = red && v >= red ? "#ff3b30" : "#f2f2f2";
          g.font = '600 30px "Overpass", Arial, sans-serif';
          g.textAlign = "center";
          g.textBaseline = "middle";
          const rt = R - 66;
          g.fillText(
            String(Math.round(v)),
            cx - Math.sin(a) * rt,
            192 - Math.cos(a) * rt,
          );
        }
      }
      g.fillStyle = "#9aa0a8";
      g.font = '600 22px "Overpass", Arial, sans-serif';
      g.fillText(label, cx, 192 + 70);
    };
    dial(230, 140, 20, "MPH");
    dial(794, 8, 1, "RPM ×1000", 6.5);
    g.fillStyle = "#0d0f12";
    g.beginPath();
    g.roundRect(392, 70, 240, 244, 18);
    g.fill();
  });
}

function strandTexture() {
  const tex = canvasTexture(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let x = 0; x < w; x += 3) {
      const len = h * (0.86 + Math.random() * 0.14);
      g.fillStyle = (x / 3) % 4 < 2 ? "#ffcb05" : "#00274c";
      if (Math.random() < 0.15) g.fillStyle = "#e8b800";
      g.fillRect(x, 0, 2.4, len);
    }
  });
  return tex;
}

export class Cabin {
  constructor({ posts = [], mirrorTexture, photoUrl }) {
    this.group = new THREE.Group();
    this.hotspots = new Map();
    this.pickables = [];
    this.posts = posts;
    this.mirrorTexture = mirrorTexture;
    this.photoUrl = photoUrl;
    this.visorAngle = 0;
    this.visorTarget = 0;
    this.gloveAngle = 0;
    this.gloveTarget = 0;
    this.tassel = {
      tx: 0,
      vx: 0,
      tz: 0,
      vz: 0,
      sx: 0,
      svx: 0,
      sz: 0,
      svz: 0,
      tw: 0,
      vtw: 0,
      ax: 0,
      az: 0,
    };
    this.lastClock = "";

    const M = (this.M = {
      dash: std("#1f2124", 0.92),
      plastic: std("#18191c", 0.7),
      trim: std("#2a2d31", 0.5),
      pillar: std("#6d6861", 0.95),
      headliner: std("#8c867d", 1),
      leather: std("#141517", 0.55),
      alu: new THREE.MeshStandardMaterial({
        color: "#b6bac0",
        metalness: 1,
        roughness: 0.3,
      }),
      chrome: new THREE.MeshStandardMaterial({
        color: "#dcdee2",
        metalness: 1,
        roughness: 0.12,
      }),
      carpet: std("#121314", 1),
      seat: std("#24262a", 0.95),
      black: std("#0a0b0c", 0.6),
      paint: new THREE.MeshPhysicalMaterial({
        color: "#0c2c58",
        metalness: 0.55,
        roughness: 0.32,
        clearcoat: 1,
        clearcoatRoughness: 0.06,
      }),
      maize: new THREE.MeshStandardMaterial({
        color: "#ffcb05",
        metalness: 0.35,
        roughness: 0.35,
      }),
      blue: std("#00274c", 0.6),
    });

    this.buildShell();
    this.buildDash();
    this.buildCluster();
    this.buildWheel();
    this.buildCenterStack();
    this.buildConsoleAndSeats();
    this.buildHood();
    this.buildMirror();
    this.buildTassel();
    this.buildVisors();
    this.buildGlovebox();
    this.buildPolaroid();
    this.buildPhone();
  }

  addHotspot(id, object, label, extra = {}) {
    const mats = [];
    object.traverse((o) => {
      if (!o.isMesh) return;
      o.userData.hotspot = id;
      if (o.material.emissive && !extra.noGlow) {
        o.material = o.material.clone();
        mats.push(o.material);
      }
    });
    this.hotspots.set(id, { id, object, label, mats, ...extra });
    this.pickables.push(object);
  }

  setHover(id) {
    for (const h of this.hotspots.values()) {
      const on = h.id === id;
      for (const m of h.mats)
        m.emissive
          .set(on ? "#ffcb05" : "#000000")
          .multiplyScalar(on ? 0.16 : 0);
    }
    this.hoverId = id;
  }

  // ---------- body shell ----------
  buildShell() {
    const G = this.group,
      M = this.M;
    const BL = V(-0.43, -0.235, -0.99),
      BR = V(1.17, -0.235, -0.99),
      TL = V(-0.39, 0.275, -0.45),
      TR = V(1.13, 0.275, -0.45);

    const glassGeo = new THREE.BufferGeometry();
    glassGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(
        [...BL.toArray(), ...BR.toArray(), ...TL.toArray(), ...TR.toArray()],
        3,
      ),
    );
    glassGeo.setAttribute(
      "uv",
      new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 1, 1], 2),
    );
    glassGeo.setIndex([0, 1, 2, 2, 1, 3]);
    const glass = new THREE.Mesh(
      glassGeo,
      new THREE.MeshBasicMaterial({
        map: windshieldTexture(),
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    glass.renderOrder = 5;
    G.add(glass);

    G.add(
      beam(
        V(-0.46, -0.24, -0.99),
        V(-0.41, 0.28, -0.44),
        0.08,
        0.055,
        M.pillar,
      ),
    );
    G.add(
      beam(V(1.2, -0.24, -0.99), V(1.15, 0.28, -0.44), 0.08, 0.055, M.pillar),
    );
    G.add(
      beam(
        V(-0.42, 0.28, -0.45),
        V(1.16, 0.28, -0.45),
        0.07,
        0.04,
        M.headliner,
      ),
    );

    const roofGeo = new THREE.PlaneGeometry(1.62, 1.5, 8, 4);
    roofGeo.rotateX(Math.PI / 2);
    const rp = roofGeo.attributes.position;
    for (let i = 0; i < rp.count; i++)
      rp.setY(i, -0.02 * Math.pow(rp.getX(i) / 0.81, 2));
    roofGeo.computeVertexNormals();
    mesh(roofGeo, M.headliner, CX, 0.292, 0.3, G);

    for (const side of [-1, 1]) {
      const x = side < 0 ? -0.47 : 1.21;
      G.add(
        beam(
          V(x + side * -0.01, 0.275, -0.45),
          V(x, 0.275, 0.9),
          0.06,
          0.05,
          M.headliner,
        ),
      );
      mesh(rbox(0.07, 0.62, 1.7, 0.03), M.trim, x - side * 0.01, -0.5, -0.1, G);
      mesh(
        rbox(0.11, 0.04, 1.6, 0.015),
        M.plastic,
        x - side * 0.02,
        -0.18,
        -0.12,
        G,
      );
      mesh(
        rbox(0.1, 0.05, 0.42, 0.02),
        M.leather,
        x - side * 0.05,
        -0.4,
        0.08,
        G,
      );
      mesh(
        new THREE.BoxGeometry(0.02, 0.025, 0.09),
        M.chrome,
        x - side * 0.045,
        -0.28,
        -0.32,
        G,
      );
      const spk = mesh(
        new THREE.CircleGeometry(0.075, 24),
        M.black,
        x - side * 0.036,
        -0.62,
        -0.62,
        G,
      );
      spk.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
      mesh(
        new THREE.BoxGeometry(0.04, 0.14, 0.16),
        M.black,
        x + side * 0.0,
        -0.11,
        -0.88,
        G,
      );
      G.add(
        beam(
          V(x, -0.18, 0.5),
          V(x - side * 0.02, 0.28, 0.45),
          0.09,
          0.08,
          M.pillar,
        ),
      );
    }
    mesh(
      new THREE.PlaneGeometry(1.7, 1.8).rotateX(-Math.PI / 2),
      M.carpet,
      CX,
      -0.95,
      0,
      G,
    );
  }

  // ---------- dashboard ----------
  buildDash() {
    const G = this.group,
      M = this.M;
    const s = new THREE.Shape();
    s.moveTo(1.02, -0.235);
    s.lineTo(0.7, -0.205);
    s.quadraticCurveTo(0.575, -0.2, 0.56, -0.255);
    s.lineTo(0.55, -0.43);
    s.quadraticCurveTo(0.545, -0.56, 0.42, -0.62);
    s.lineTo(0.42, -0.95);
    s.lineTo(1.02, -0.95);
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, {
      depth: 1.7,
      bevelEnabled: true,
      bevelThickness: 0.01,
      bevelSize: 0.01,
      bevelSegments: 3,
      curveSegments: 16,
    });
    const dash = mesh(geo, M.dash, -0.48, 0, 0, G);
    dash.rotation.y = Math.PI / 2;

    // trim strip across the dash face
    mesh(rbox(1.66, 0.025, 0.02, 0.008), M.alu, CX, -0.3, -0.548, G);

    // air vents
    const vent = (x, y, z, w = 0.12, rotY = 0) => {
      const v = new THREE.Group();
      mesh(rbox(w, 0.05, 0.03, 0.012), M.black, 0, 0, 0, v);
      for (let i = 0; i < 4; i++)
        mesh(
          new THREE.BoxGeometry(w - 0.014, 0.003, 0.02),
          M.trim,
          0,
          -0.016 + i * 0.011,
          0.008,
          v,
        );
      mesh(new THREE.BoxGeometry(0.008, 0.012, 0.012), M.alu, 0, 0, 0.022, v);
      v.position.set(x, y, z);
      v.rotation.y = rotY;
      G.add(v);
      return v;
    };
    vent(-0.32, -0.33, -0.548, 0.1);
    vent(1.07, -0.33, -0.548, 0.1);
    vent(0.62, -0.33, -0.548, 0.12);

    // defrost slot near the glass
    mesh(new THREE.BoxGeometry(1.3, 0.004, 0.03), M.black, CX, -0.2, -0.86, G);
  }

  // ---------- instrument cluster ----------
  buildCluster() {
    const G = this.group,
      M = this.M;
    mesh(rbox(0.46, 0.16, 0.16, 0.035), M.dash, 0, -0.26, -0.605, G);
    const hood = mesh(
      rbox(0.47, 0.025, 0.08, 0.012),
      M.dash,
      0,
      -0.178,
      -0.535,
      G,
    );
    hood.rotation.x = 0.12;

    const cluster = new THREE.Group();
    cluster.position.set(0, -0.265, -0.524);
    cluster.rotation.x = -0.2;
    G.add(cluster);
    this.gaugeMat = new THREE.MeshBasicMaterial({
      map: gaugeTexture(),
      toneMapped: false,
    });
    mesh(new THREE.PlaneGeometry(0.36, 0.135), this.gaugeMat, 0, 0, 0, cluster);
    mesh(rbox(0.38, 0.15, 0.01, 0.01), M.black, 0, 0, -0.006, cluster);

    const needleMat = new THREE.MeshBasicMaterial({
      color: "#ff4a1c",
      toneMapped: false,
    });
    const needle = (x) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0, 0.002);
      mesh(
        new THREE.PlaneGeometry(0.0035, 0.05).translate(0, 0.022, 0),
        needleMat,
        0,
        0,
        0,
        pivot,
      );
      mesh(new THREE.CircleGeometry(0.007, 16), M.black, 0, 0, 0.001, pivot);
      cluster.add(pivot);
      return pivot;
    };
    this.speedNeedle = needle(-0.0991);
    this.rpmNeedle = needle(0.0991);

    this.lcd = makeCanvas(256, 256);
    this.lcdTex = new THREE.CanvasTexture(this.lcd);
    this.lcdTex.colorSpace = THREE.SRGBColorSpace;
    this.lcdMat = new THREE.MeshBasicMaterial({
      map: this.lcdTex,
      toneMapped: false,
    });
    mesh(
      new THREE.PlaneGeometry(0.08, 0.08),
      this.lcdMat,
      0,
      0,
      0.001,
      cluster,
    );
    this.addHotspot("clock", cluster, "Clock — change the time of day", {
      noGlow: true,
    });
  }

  drawLcd(time, mph) {
    const g = this.lcd.getContext("2d");
    g.fillStyle = "#0d0f12";
    g.fillRect(0, 0, 256, 256);
    g.textAlign = "center";
    g.fillStyle = "#f3f3f3";
    g.font = '600 50px "Overpass", Arial, sans-serif';
    g.fillText(time, 128, 70);
    g.fillStyle = "#ffcb05";
    g.font = '700 74px "Overpass", Arial, sans-serif';
    g.fillText(String(Math.round(mph)), 128, 160);
    g.fillStyle = "#8b929c";
    g.font = '600 22px "Overpass", Arial, sans-serif';
    g.fillText("MPH   ⋅   D", 128, 192);
    g.fillText("ODO 024,601 mi", 128, 232);
    this.lcdTex.needsUpdate = true;
  }

  // ---------- steering wheel ----------
  buildWheel() {
    const M = this.M;
    const mount = new THREE.Group();
    mount.position.set(0, -0.33, -0.42);
    mount.rotation.x = -0.44;
    this.group.add(mount);
    mesh(
      new THREE.CylinderGeometry(0.035, 0.045, 0.3, 16).rotateX(Math.PI / 2),
      M.plastic,
      0,
      0,
      -0.17,
      mount,
    );
    const stalkL = mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.12, 8).rotateZ(
        Math.PI / 2 - 0.25,
      ),
      M.black,
      -0.08,
      0.01,
      -0.06,
      mount,
    );
    const stalkR = stalkL.clone();
    stalkR.position.x = 0.08;
    stalkR.rotation.z = 0.5;
    mount.add(stalkR);

    const wheel = (this.wheel = new THREE.Group());
    mount.add(wheel);
    mesh(
      new THREE.TorusGeometry(0.185, 0.017, 14, 64),
      M.leather,
      0,
      0,
      0,
      wheel,
    );
    const stripe = mesh(
      new THREE.TorusGeometry(0.185, 0.0175, 10, 6, 0.09),
      M.maize,
      0,
      0,
      0,
      wheel,
    );
    stripe.rotation.z = Math.PI / 2 - 0.045;
    mesh(
      new THREE.CylinderGeometry(0.062, 0.068, 0.05, 32).rotateX(Math.PI / 2),
      M.plastic,
      0,
      0,
      0.0,
      wheel,
    );
    const logo = canvasTexture(256, 256, (g) => {
      g.fillStyle = "#16171a";
      g.fillRect(0, 0, 256, 256);
      g.strokeStyle = "#b6bac0";
      g.lineWidth = 8;
      g.beginPath();
      g.ellipse(128, 128, 70, 46, 0, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = "#d8dadf";
      g.font = "italic 700 58px Georgia, serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("MC", 128, 132);
    });
    mesh(
      new THREE.CircleGeometry(0.058, 32),
      std("#ffffff", 0.4, { map: logo }),
      0,
      0,
      0.026,
      wheel,
    );
    for (const a of [0, Math.PI, -Math.PI / 2]) {
      const spoke = mesh(
        new THREE.BoxGeometry(0.13, 0.03, 0.018),
        M.plastic,
        Math.cos(a) * 0.12,
        Math.sin(a) * 0.12,
        -0.004,
        wheel,
      );
      spoke.rotation.z = a;
      if (a !== -Math.PI / 2)
        mesh(
          new THREE.BoxGeometry(0.03, 0.02, 0.004),
          M.alu,
          Math.cos(a) * 0.1,
          Math.sin(a) * 0.1,
          0.007,
          wheel,
        );
    }
  }

  // ---------- centre stack + radio ----------
  buildCenterStack() {
    const M = this.M;
    const stack = (this.stack = new THREE.Group());
    stack.position.set(CX, -0.41, -0.535);
    stack.rotation.set(-0.18, -0.12, 0);
    this.group.add(stack);
    const body = mesh(rbox(0.27, 0.32, 0.1, 0.02), M.trim, 0, 0, 0, stack);
    const face = 0.051;

    for (const x of [-0.065, 0.065]) {
      const v = new THREE.Group();
      mesh(rbox(0.11, 0.045, 0.012, 0.01), M.black, 0, 0, 0, v);
      for (let i = 0; i < 4; i++)
        mesh(
          new THREE.BoxGeometry(0.1, 0.003, 0.01),
          M.trim,
          0,
          -0.015 + i * 0.01,
          0.004,
          v,
        );
      v.position.set(x, 0.12, face);
      stack.add(v);
    }

    const bezel = mesh(
      rbox(0.26, 0.085, 0.012, 0.01),
      M.black,
      0,
      0.045,
      face,
      stack,
    );
    this.radioCanvas = makeCanvas(512, 188);
    this.radioTex = new THREE.CanvasTexture(this.radioCanvas);
    this.radioTex.colorSpace = THREE.SRGBColorSpace;
    this.radioMat = new THREE.MeshBasicMaterial({
      map: this.radioTex,
      toneMapped: false,
    });
    const display = mesh(
      new THREE.PlaneGeometry(0.15, 0.055),
      this.radioMat,
      0,
      0.045,
      face + 0.0065,
      stack,
    );

    const knob = (x, id, label) => {
      const k = mesh(
        new THREE.CylinderGeometry(0.017, 0.018, 0.022, 28).rotateX(
          Math.PI / 2,
        ),
        M.alu,
        x,
        0.045,
        face + 0.016,
        stack,
      );
      mesh(
        new THREE.BoxGeometry(0.003, 0.012, 0.002),
        M.black,
        0,
        0.008,
        0.012,
        k,
      );
      this.addHotspot(id, k, label);
      return k;
    };
    this.powerKnob = knob(-0.106, "radio-power", "Power");
    this.tuneKnob = knob(0.106, "radio-next", "Next song");

    this.radioButtons = [];
    const labels = ["⏮", "1", "2", "3", "4", "⏭"];
    labels.forEach((l, i) => {
      const tex = canvasTexture(96, 48, (g, w, h) => {
        g.fillStyle = "#1b1d20";
        g.fillRect(0, 0, w, h);
        g.fillStyle = "#d7d9dc";
        g.font = '600 28px "Overpass", Arial, sans-serif';
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(l, w / 2, h / 2 + 2);
      });
      const mats = [
        M.plastic,
        M.plastic,
        M.plastic,
        M.plastic,
        std("#ffffff", 0.6, { map: tex }),
        M.plastic,
      ];
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.016, 0.01), mats);
      b.position.set(-0.095 + i * 0.038, -0.012, face + 0.004);
      stack.add(b);
      const id =
        i === 0
          ? "radio-prev"
          : i === 5
            ? "radio-next"
            : `radio-preset:${i - 1}`;
      this.addHotspot(
        id,
        b,
        i === 0 ? "Previous song" : i === 5 ? "Next song" : `Preset ${l}`,
        { noGlow: true },
      );
      this.radioButtons.push(b);
    });

    const ring = canvasTexture(128, 128, (g) => {
      const grad = g.createLinearGradient(0, 0, 128, 0);
      grad.addColorStop(0, "#3a7bd5");
      grad.addColorStop(1, "#e0453a");
      g.fillStyle = "#16171a";
      g.fillRect(0, 0, 128, 128);
      g.strokeStyle = grad;
      g.lineWidth = 10;
      g.beginPath();
      g.arc(64, 64, 52, Math.PI * 0.75, Math.PI * 2.25);
      g.stroke();
    });
    for (const x of [-0.08, 0, 0.08]) {
      mesh(
        new THREE.CircleGeometry(0.026, 28),
        std("#ffffff", 0.6, { map: ring }),
        x,
        -0.075,
        face + 0.001,
        stack,
      );
      mesh(
        new THREE.CylinderGeometry(0.018, 0.019, 0.018, 24).rotateX(
          Math.PI / 2,
        ),
        M.plastic,
        x,
        -0.075,
        face + 0.01,
        stack,
      );
    }
    mesh(
      rbox(0.03, 0.018, 0.008, 0.004),
      std("#b3261e", 0.5),
      0,
      -0.125,
      face + 0.003,
      stack,
    );

    this.addHotspot("radio", body, "Radio", { focus: true });
    this.radioDisplay = display;
    bezel.userData.hotspot = "radio";
    display.userData.hotspot = "radio";
  }

  // ---------- console, seats ----------
  buildConsoleAndSeats() {
    const G = this.group,
      M = this.M;
    mesh(rbox(0.24, 0.3, 0.9, 0.04), M.trim, CX, -0.8, -0.05, G);
    mesh(rbox(0.22, 0.03, 0.4, 0.015), M.leather, CX, -0.64, 0.2, G);
    mesh(
      new THREE.CylinderGeometry(0.01, 0.014, 0.12, 12),
      M.alu,
      CX,
      -0.6,
      -0.25,
      G,
    );
    mesh(
      new THREE.SphereGeometry(0.03, 20, 14),
      M.leather,
      CX,
      -0.53,
      -0.25,
      G,
    );
    mesh(rbox(0.12, 0.01, 0.16, 0.004), M.black, CX, -0.648, -0.25, G);
    for (const x of [CX - 0.055, CX + 0.055])
      mesh(
        new THREE.CylinderGeometry(0.038, 0.038, 0.01, 24),
        M.black,
        x,
        -0.645,
        -0.02,
        G,
      );
    // coffee
    const cup = new THREE.Group();
    mesh(
      new THREE.CylinderGeometry(0.036, 0.03, 0.13, 24),
      std("#f4f1ea", 0.6),
      0,
      0,
      0,
      cup,
    );
    mesh(
      new THREE.CylinderGeometry(0.0372, 0.0335, 0.05, 24),
      std("#a0703f", 0.9),
      0,
      -0.005,
      0,
      cup,
    );
    mesh(
      new THREE.CylinderGeometry(0.038, 0.037, 0.012, 24),
      std("#20201f", 0.5),
      0,
      0.068,
      0,
      cup,
    );
    cup.position.set(CX + 0.055, -0.59, -0.02);
    G.add(cup);

    const seat = new THREE.Group();
    mesh(rbox(0.52, 0.13, 0.52, 0.05), M.seat, 0, 0, 0, seat);
    const back = mesh(rbox(0.52, 0.7, 0.14, 0.06), M.seat, 0, 0.38, 0.3, seat);
    back.rotation.x = 0.18;
    mesh(rbox(0.26, 0.18, 0.1, 0.04), M.seat, 0, 0.82, 0.39, seat);
    for (const x of [-0.17, 0.17])
      mesh(
        rbox(0.12, 0.66, 0.15, 0.05),
        M.leather,
        x,
        0.38,
        0.3,
        seat,
      ).rotation.x = 0.18;
    seat.position.set(0.8, -0.74, 0.2);
    G.add(seat);
  }

  // ---------- hood, wipers, side mirrors ----------
  buildHood() {
    const G = this.group,
      M = this.M;
    const geo = new THREE.PlaneGeometry(1.62, 1.55, 24, 12);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i),
        y = p.getY(i);
      const t = (y + 0.775) / 1.55;
      const side = Math.max(0, Math.abs(x) - 0.62) / 0.19;
      p.setZ(
        i,
        -0.3 -
          0.11 * t -
          0.07 * Math.pow(t, 6) +
          0.035 * (1 - (x / 0.81) ** 2) -
          0.07 * side * side +
          0.006 * Math.exp(-((x / 0.05) ** 2)),
      );
    }
    geo.rotateX(-Math.PI / 2);
    geo.computeVertexNormals();
    mesh(geo, M.paint, CX, 0, -1.79, G);
    mesh(
      new THREE.BoxGeometry(1.6, 0.012, 0.07),
      M.black,
      CX,
      -0.258,
      -1.02,
      G,
    );
    for (const x of [0.02, 0.62]) {
      const w = mesh(
        new THREE.BoxGeometry(0.55, 0.012, 0.012),
        M.black,
        x,
        -0.245,
        -1.0,
        G,
      );
      w.rotation.y = 0.06;
    }
    for (const side of [-1, 1]) {
      const g = new THREE.Group();
      const housing = mesh(rbox(0.22, 0.13, 0.09, 0.03), M.paint, 0, 0, 0, g);
      const face = mesh(
        new THREE.PlaneGeometry(0.19, 0.105),
        new THREE.MeshBasicMaterial({ map: this.mirrorTexture }),
        0,
        0,
        0.046,
        g,
      );
      face.geometry.attributes.uv.array.forEach(
        (v, i, a) => i % 2 === 0 && (a[i] = 1 - v),
      );
      face.userData.isMirror = true;
      mesh(
        new THREE.BoxGeometry(0.1, 0.03, 0.05),
        M.black,
        -side * 0.1,
        -0.03,
        0,
        g,
      );
      g.position.set(side < 0 ? -0.68 : 1.42, -0.17, -0.8);
      g.rotation.y = side < 0 ? 0.35 : -0.55;
      G.add(g);
    }
  }

  // ---------- rear-view mirror ----------
  buildMirror() {
    const G = this.group,
      M = this.M;
    G.add(
      beam(V(CX, 0.205, -0.445), V(CX, 0.262, -0.47), 0.016, 0.016, M.black),
    );
    mesh(
      rbox(0.05, 0.012, 0.04, 0.005),
      M.black,
      CX,
      0.268,
      -0.468,
      G,
    ).rotation.x = -0.75;
    const housing = new THREE.Group();
    housing.position.set(CX, 0.19, -0.43);
    housing.rotation.set(-0.06, -0.33, 0);
    G.add(housing);
    mesh(rbox(0.27, 0.075, 0.035, 0.022), M.black, 0, 0, 0, housing);
    const surf = mesh(
      new THREE.PlaneGeometry(0.252, 0.06),
      new THREE.MeshBasicMaterial({ map: this.mirrorTexture }),
      0,
      0,
      0.0181,
      housing,
    );
    const uv = surf.geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setX(i, 1 - uv.getX(i));
    surf.userData.isMirror = true;
    this.mirrorHousing = housing;
  }

  // ---------- graduation tassel with Block M ----------
  buildTassel() {
    const M = this.M;
    const root = new THREE.Group();
    root.position.set(CX + 0.03, 0.232, -0.466);
    this.group.add(root);
    const swing = (this.tasselSwing = new THREE.Group());
    root.add(swing);

    const cordGeo = new THREE.CylinderGeometry(
      0.0016,
      0.0016,
      0.125,
      6,
    ).translate(0, -0.0625, 0);
    mesh(cordGeo, M.maize, -0.0018, 0, 0, swing);
    mesh(cordGeo, M.blue, 0.0018, 0, 0, swing);

    const charm = (this.tasselCharm = new THREE.Group());
    charm.position.set(0, -0.068, 0.004);
    swing.add(charm);
    const mGeo = new THREE.ExtrudeGeometry(blockMShape(0.042), {
      depth: 0.004,
      bevelEnabled: true,
      bevelThickness: 0.0008,
      bevelSize: 0.0008,
      bevelSegments: 2,
    });
    mGeo.center();
    mesh(mGeo, M.maize, 0, -0.016, 0.001, charm);
    const backGeo = new THREE.ExtrudeGeometry(blockMShape(0.05), {
      depth: 0.002,
      bevelEnabled: false,
    });
    backGeo.center();
    mesh(backGeo, M.blue, 0, -0.016, -0.0015, charm);
    mesh(
      new THREE.TorusGeometry(0.0035, 0.0009, 6, 16),
      M.chrome,
      0,
      0.0,
      0,
      charm,
    );

    const knot = new THREE.Group();
    knot.position.y = -0.125;
    swing.add(knot);
    mesh(new THREE.SphereGeometry(0.0075, 14, 10), M.maize, 0, 0, 0, knot);
    const skirt = (this.tasselSkirt = new THREE.Group());
    knot.add(skirt);
    mesh(
      new THREE.CylinderGeometry(0.0058, 0.0062, 0.016, 16),
      M.blue,
      0,
      -0.01,
      0,
      skirt,
    );
    const strands = new THREE.MeshStandardMaterial({
      map: strandTexture(),
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      roughness: 0.85,
    });
    mesh(
      new THREE.CylinderGeometry(0.0062, 0.017, 0.11, 32, 1, true).translate(
        0,
        -0.073,
        0,
      ),
      strands,
      0,
      0,
      0,
      skirt,
    );
    mesh(
      new THREE.CylinderGeometry(0.0045, 0.012, 0.1, 24, 1, true).translate(
        0,
        -0.07,
        0,
      ),
      strands,
      0,
      0,
      0,
      skirt,
    );

    const year = canvasTexture(128, 128, (g) => {
      g.fillStyle = "#d4a514";
      g.beginPath();
      g.arc(64, 64, 62, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = "#00274c";
      g.font = '700 50px "Overpass", Arial, sans-serif';
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("23", 64, 68);
    });
    const yr = mesh(
      new THREE.CircleGeometry(0.0085, 20),
      new THREE.MeshStandardMaterial({
        map: year,
        metalness: 0.5,
        roughness: 0.35,
        side: THREE.DoubleSide,
      }),
      0.011,
      -0.006,
      0.006,
      knot,
    );
    yr.rotation.y = -0.3;

    this.addHotspot("tassel", root, "Go Blue! — my journey");
  }

  // ---------- visors + blog papers ----------
  buildVisors() {
    const M = this.M;
    const fabric = std("#8a847b", 1);
    const make = (x) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, 0.262, -0.445);
      this.group.add(pivot);
      mesh(
        new THREE.CylinderGeometry(0.0055, 0.0055, 0.4, 10).rotateZ(
          Math.PI / 2,
        ),
        M.trim,
        0,
        0,
        0.006,
        pivot,
      );
      mesh(rbox(0.4, 0.022, 0.17, 0.009), fabric, 0, -0.008, 0.088, pivot);
      return pivot;
    };
    make(0.81);
    const visor = (this.visor = make(-0.075));
    mesh(
      rbox(0.03, 0.015, 0.02, 0.005),
      M.trim,
      0.215,
      0,
      0.16,
      this.group,
    ).position.set(0.15, 0.274, -0.285);

    const strap = mesh(
      new THREE.BoxGeometry(0.4, 0.002, 0.008),
      std("#2a2a2c", 0.9),
      0,
      0.0075,
      0.08,
      visor,
    );
    strap.userData.nonPick = true;

    this.cards = [];
    this.paperMats = [];
    const n = this.posts.length;
    const spacing = n > 1 ? Math.min(0.13, 0.27 / (n - 1)) : 0;
    this.posts.forEach((post, i) => {
      const card = new THREE.Group();
      const x = (i - (n - 1) / 2) * spacing;
      card.position.set(
        x,
        0.0042 + i * 0.0007,
        0.125 + ((i * 37) % 3) * 0.0008,
      );
      card.rotation.set(-Math.PI / 2, 0, (((i * 53) % 9) - 4) * 0.01);
      const map = this.cardTexture(post, i);
      const paper = new THREE.MeshStandardMaterial({
        map,
        emissive: "#ffffff",
        emissiveMap: map,
        emissiveIntensity: 0,
        roughness: 0.9,
        side: THREE.DoubleSide,
      });
      this.paperMats.push(paper);
      mesh(new THREE.PlaneGeometry(0.135, 0.1), paper, 0, 0, 0, card);
      card.userData.base = card.position.clone();
      card.userData.postId = post.id;
      visor.add(card);
      this.addHotspot(`post:${post.id}`, card, post.title, {
        post,
        card,
        noGlow: true,
      });
      this.cards.push(card);
    });
    this.addHotspot("visor", visor.children[1], "Sun visor — my blog");
  }

  cardTexture(post, i) {
    return canvasTexture(675, 500, (g, w, h) => {
      g.fillStyle = ["#fbf8ef", "#fdfbf4", "#f7f3e6"][i % 3];
      g.fillRect(0, 0, w, h);
      g.strokeStyle = "rgba(80,130,200,0.35)";
      g.lineWidth = 2;
      for (let y = 118; y < h; y += 38) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(w, y);
        g.stroke();
      }
      g.strokeStyle = "rgba(220,70,70,0.5)";
      g.beginPath();
      g.moveTo(64, 0);
      g.lineTo(64, h);
      g.stroke();
      g.fillStyle = "#6b6b6b";
      g.font = '600 22px "Overpass", Arial, sans-serif';
      g.fillText(
        `${post.dateFormatted}  ⋅  ${post.category}`.toUpperCase(),
        84,
        64,
      );
      g.fillStyle = "#1d2a44";
      g.font = '700 50px "Caveat", "Segoe Print", cursive';
      const lines = wrapText(g, post.title, 84, 108, w - 120, 46, 2);
      g.fillStyle = "#333";
      g.font = "400 25px Georgia, serif";
      wrapText(
        g,
        post.excerpt,
        84,
        108 + lines * 46 + 16,
        w - 120,
        38,
        lines > 1 ? 5 : 6,
      );
      g.fillStyle = "#b8860b";
      g.font = '700 26px "Overpass", Arial, sans-serif';
      g.textAlign = "right";
      g.fillText("READ →", w - 30, h - 24);
      g.fillStyle = "rgba(0,0,0,0.06)";
      g.fillRect(0, h - 6, w, 6);
    });
  }

  // ---------- glovebox ----------
  buildGlovebox() {
    const M = this.M;
    const x = 0.86;
    const inside = canvasTexture(256, 128, (g, w, h) => {
      const grad = g.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#020203");
      grad.addColorStop(1, "#16171a");
      g.fillStyle = grad;
      g.fillRect(0, 0, w, h);
    });
    mesh(
      new THREE.PlaneGeometry(0.372, 0.152),
      new THREE.MeshBasicMaterial({ map: inside }),
      x,
      -0.345,
      -0.5465,
      this.group,
    );

    const folder = new THREE.Group();
    const label = canvasTexture(512, 200, (g, w, h) => {
      g.fillStyle = "#d9b77a";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#c9a466";
      g.fillRect(0, 0, w, 26);
      g.fillStyle = "#f7f2e6";
      g.fillRect(150, 70, 212, 70);
      g.fillStyle = "#2a2a2a";
      g.font = '700 38px "Caveat", cursive';
      g.textAlign = "center";
      g.fillText("PROJECTS", 256, 118);
    });
    mesh(
      new THREE.BoxGeometry(0.26, 0.1, 0.006),
      [
        M.black,
        M.black,
        M.black,
        M.black,
        std("#ffffff", 0.9, { map: label }),
        M.black,
      ],
      0,
      0,
      0,
      folder,
    );
    folder.position.set(x - 0.01, -0.36, -0.535);
    folder.rotation.set(-0.35, 0, 0.04);
    this.group.add(folder);
    this.folder = folder;
    folder.visible = false;

    const lid = (this.gloveLid = new THREE.Group());
    lid.position.set(x, -0.415, -0.543);
    this.group.add(lid);
    mesh(rbox(0.36, 0.14, 0.018, 0.008), M.trim, 0, 0.07, 0.006, lid);
    mesh(rbox(0.09, 0.016, 0.01, 0.005), M.alu, 0, 0.12, 0.017, lid);
    this.addHotspot("glovebox", lid, "Glovebox — my projects");
  }

  // ---------- polaroid on the dash ----------
  buildPolaroid() {
    const canvas = makeCanvas(440, 525);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const draw = (img) => {
      const g = canvas.getContext("2d");
      g.fillStyle = "#f6f4ee";
      g.fillRect(0, 0, 440, 525);
      if (img) {
        const s = Math.min(img.width, img.height);
        g.drawImage(
          img,
          (img.width - s) / 2,
          ((img.height - s) / 2) * 0.6,
          s,
          s,
          26,
          26,
          388,
          388,
        );
      } else {
        g.fillStyle = "#333";
        g.fillRect(26, 26, 388, 388);
      }
      g.fillStyle = "#26324a";
      g.font = '700 50px "Caveat", cursive';
      g.textAlign = "center";
      g.fillText("Hello! caught you 📸", 220, 482);
      tex.needsUpdate = true;
    };
    draw();
    const img = new Image();
    img.onload = () => draw(img);
    img.src = this.photoUrl;
    this.redrawPolaroid = () =>
      draw(img.complete && img.naturalWidth ? img : null);

    const g = new THREE.Group();
    g.position.set(0.66, -0.17, -0.88);
    g.rotation.set(-0.72, -0.28, 0.07, "YXZ");
    mesh(
      new THREE.PlaneGeometry(0.088, 0.105),
      std("#ffffff", 0.8, { map: tex }),
      0,
      0,
      0,
      g,
    );
    this.group.add(g);
    this.addHotspot("about", g, "About me");
  }

  // ---------- phone on a dash mount ----------
  buildPhone() {
    const M = this.M;
    mesh(
      new THREE.CylinderGeometry(0.022, 0.026, 0.012, 20),
      M.black,
      0.24,
      -0.205,
      -0.73,
      this.group,
    );
    this.group.add(
      beam(V(0.24, -0.2, -0.73), V(0.24, -0.16, -0.712), 0.01, 0.01, M.black),
    );

    const phone = new THREE.Group();
    phone.position.set(0.24, -0.14, -0.71);
    phone.rotation.set(-0.25, -0.18, 0, "YXZ");
    this.group.add(phone);
    mesh(rbox(0.155, 0.076, 0.009, 0.009), M.black, 0, 0, 0, phone);
    mesh(
      new THREE.BoxGeometry(0.02, 0.08, 0.012),
      M.black,
      -0.07,
      0,
      -0.006,
      phone,
    );
    mesh(
      new THREE.BoxGeometry(0.02, 0.08, 0.012),
      M.black,
      0.07,
      0,
      -0.006,
      phone,
    );

    const screen = canvasTexture(768, 360, (g, w, h) => {
      g.fillStyle = "#1e2a24";
      g.fillRect(0, 0, w, h);
      g.strokeStyle = "#2f3f37";
      g.lineWidth = 10;
      for (let i = 0; i < 9; i++) {
        g.beginPath();
        g.moveTo(Math.random() * w, 0);
        g.bezierCurveTo(
          Math.random() * w,
          h * 0.3,
          Math.random() * w,
          h * 0.7,
          Math.random() * w,
          h,
        );
        g.stroke();
      }
      g.strokeStyle = "#4c8dff";
      g.lineWidth = 16;
      g.lineCap = "round";
      g.beginPath();
      g.moveTo(210, h);
      g.bezierCurveTo(230, 250, 140, 190, 200, 120);
      g.bezierCurveTo(250, 60, 330, 80, 360, 20);
      g.stroke();
      g.fillStyle = "#fff";
      g.beginPath();
      g.moveTo(210, 300);
      g.lineTo(194, 336);
      g.lineTo(210, 326);
      g.lineTo(226, 336);
      g.fill();
      g.fillStyle = "rgba(14,16,20,0.92)";
      g.beginPath();
      g.roundRect(420, 24, 326, 312, 26);
      g.fill();
      g.fillStyle = "#9aa3ad";
      g.font = '600 24px "Overpass", Arial, sans-serif';
      g.fillText("NEXT STOP", 448, 70);
      g.fillStyle = "#fff";
      g.font = '700 42px "Overpass", Arial, sans-serif';
      g.fillText("Say hello 👋", 448, 120);
      g.fillStyle = "#c9ced4";
      g.font = '400 24px "Overpass", Arial, sans-serif';
      g.fillText("Email ⋅ GitHub ⋅ LinkedIn", 448, 160);
      g.fillStyle = "#ffcb05";
      g.beginPath();
      g.roundRect(448, 210, 270, 70, 35);
      g.fill();
      g.fillStyle = "#00274c";
      g.font = '700 30px "Overpass", Arial, sans-serif';
      g.textAlign = "center";
      g.fillText("Contact Mitchell", 583, 255);
    });
    this.phoneMat = new THREE.MeshBasicMaterial({
      map: screen,
      toneMapped: false,
    });
    mesh(
      new THREE.PlaneGeometry(0.145, 0.067),
      this.phoneMat,
      0,
      0,
      0.0047,
      phone,
    );
    this.addHotspot("contact", phone, "Phone — contact me");
  }

  // ---------- per-frame ----------
  update(dt, ctx) {
    const speedF = clamp(ctx.mph / 140, 0, 1);
    this.speedNeedle.rotation.z = ((135 - 270 * speedF) * Math.PI) / 180;
    const rpm = 1.6 + ctx.mph * 0.026 + Math.sin(ctx.time * 3.1) * 0.03;
    this.rpmNeedle.rotation.z = ((135 - 270 * (rpm / 8)) * Math.PI) / 180;
    this.wheel.rotation.z = -ctx.steer;

    const glow = 0.82 + ctx.dashGlow * 0.18;
    this.gaugeMat.color.setScalar(glow);
    this.lcdMat.color.setScalar(glow);
    this.radioMat.color.setScalar(glow);
    this.phoneMat.color.setScalar(0.85 + ctx.dashGlow * 0.1);

    if (ctx.clock !== this.lastClock) {
      this.lastClock = ctx.clock;
      this.drawLcd(ctx.clock, ctx.mph);
    }

    this.visorAngle = damp(this.visorAngle, this.visorTarget, 7, dt);
    this.visor.rotation.x = this.visorAngle;
    // vanity light: papers stay readable when the visor is down, even at night
    const vanity =
      clamp(this.visorAngle / 1.8, 0, 1) * (0.18 + ctx.dashGlow * 0.5);
    for (const m of this.paperMats) m.emissiveIntensity = vanity;
    this.gloveAngle = damp(this.gloveAngle, this.gloveTarget, 6, dt);
    this.gloveLid.rotation.x = this.gloveAngle;
    this.folder.visible = this.gloveAngle > 0.05;

    for (const card of this.cards) {
      const lift = this.hoverId === `post:${card.userData.postId}` ? 1 : 0;
      card.userData.lift = damp(card.userData.lift ?? 0, lift, 12, dt);
      card.position.y = card.userData.base.y + card.userData.lift * 0.006;
      card.scale.setScalar(1 + card.userData.lift * 0.05);
    }

    for (const b of this.radioButtons)
      b.position.z = damp(b.position.z, 0.055, 18, dt);

    this.updateTassel(dt, ctx);
  }

  pressButton(id) {
    for (const b of this.radioButtons)
      if (b.userData.hotspot === id) b.position.z = 0.0545 - 0.004;
  }

  updateTassel(dt, ctx) {
    const T = this.tassel;
    const steps = Math.ceil(dt / (1 / 120));
    const h = dt / steps;
    const g = 9.8,
      L = 0.17,
      L2 = 0.08;
    for (let i = 0; i < steps; i++) {
      const azPrev = T.vz,
        axPrev = T.vx;
      T.vz +=
        (-(g / L) * Math.sin(T.tz + ctx.roll) - 0.9 * T.vz - ctx.latAcc / L) *
        h;
      T.vx +=
        (-(g / L) * Math.sin(T.tx - ctx.pitch) - 0.9 * T.vx + ctx.lonAcc / L) *
        h;
      T.tz += T.vz * h;
      T.tx += T.vx * h;
      const accZ = (T.vz - azPrev) / h,
        accX = (T.vx - axPrev) / h;
      T.svz += (-(g / L2) * T.sz - 1.6 * T.svz - accZ * (L / L2) * 0.35) * h;
      T.svx += (-(g / L2) * T.sx - 1.6 * T.svx - accX * (L / L2) * 0.35) * h;
      T.sz += T.svz * h;
      T.sx += T.svx * h;
      T.vtw += (-14 * T.tw - 0.7 * T.vtw + T.vz * 0.6) * h;
      T.tw += T.vtw * h;
    }
    T.tz = clamp(T.tz, -1, 1);
    T.tx = clamp(T.tx, -1, 1);
    T.sz = clamp(T.sz, -0.8, 0.8);
    T.sx = clamp(T.sx, -0.8, 0.8);
    this.tasselSwing.rotation.set(T.tx, 0, T.tz);
    this.tasselSkirt.rotation.set(T.sx, 0, T.sz);
    this.tasselCharm.rotation.y = -0.35 + T.tw;
  }

  flickTassel(strength = 3) {
    this.tassel.vz += strength * (Math.random() < 0.5 ? -1 : 1);
    this.tassel.vx += strength * 0.4 * (Math.random() - 0.5);
    this.tassel.vtw += strength * 2;
  }
}
