// Car radio: plays 30-second Apple Music previews (via the public iTunes Search API)
// for the tracks listed in data/radio.json, and draws the head-unit display.

const SILENT =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=";

export class Radio {
  constructor(canvas, texture, onChange) {
    this.canvas = canvas;
    this.texture = texture;
    this.onChange = onChange;
    this.tracks = [];
    this.cache = new Map();
    this.index = 0;
    this.on = false;
    this.status = "off";
    this.info = null;
    this.token = 0;
    this.failures = 0;
    this.lastDraw = 0;
    this.station = "MCFM 101.9";
    this.audio = new Audio();
    this.audio.crossOrigin = "anonymous";
    this.audio.preload = "auto";
    this.audio.addEventListener("ended", () => this.next());
    this.audio.addEventListener("error", () => {
      if (!this.on || this.audio.src === SILENT) return;
      this.status = "nosignal";
      if (++this.failures < 4) setTimeout(() => this.on && this.next(), 1200);
    });
  }

  async load(url) {
    const cfg = await fetch(url).then((r) => r.json());
    this.station = cfg.station || this.station;
    this.playlistUrl = cfg.appleMusicPlaylist || "";
    this.tracks = cfg.tracks || [];
    this.index = Math.floor(Math.random() * this.tracks.length);
    this.resolve(this.index).catch(() => {});
  }

  async resolve(i) {
    const t = this.tracks[i];
    if (!t) throw new Error("no track");
    if (this.cache.has(i)) return this.cache.get(i);
    const q = t.id
      ? `https://itunes.apple.com/lookup?id=${t.id}&country=us`
      : `https://itunes.apple.com/search?term=${encodeURIComponent(`${t.artist} ${t.title}`)}&media=music&entity=song&limit=10&country=us`;
    const { results = [] } = await fetch(q).then((r) => r.json());
    const playable = results.filter((r) => r.previewUrl);
    const want = (t.artist || "").toLowerCase();
    const r =
      playable.find((x) => x.artistName.toLowerCase().includes(want)) ||
      playable[0];
    if (!r) throw new Error("not found");
    const info = {
      title: r.trackName,
      artist: r.artistName,
      album: r.collectionName,
      preview: r.previewUrl,
      link: r.trackViewUrl,
      art: r.artworkUrl100?.replace("100x100", "300x300"),
    };
    this.cache.set(i, info);
    return info;
  }

  initAudioGraph() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const src = this.ctx.createMediaElementSource(this.audio);
    // a touch of "car speaker" EQ
    const low = this.ctx.createBiquadFilter();
    low.type = "lowshelf";
    low.frequency.value = 180;
    low.gain.value = 3;
    const high = this.ctx.createBiquadFilter();
    high.type = "highshelf";
    high.frequency.value = 6000;
    high.gain.value = -4;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 64;
    this.bins = new Uint8Array(this.analyser.frequencyBinCount);
    src
      .connect(low)
      .connect(high)
      .connect(this.analyser)
      .connect(this.ctx.destination);
  }

  staticBurst(duration = 0.35) {
    if (!this.ctx) return;
    const n = Math.floor(this.ctx.sampleRate * duration);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2200;
    bp.Q.value = 0.6;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.12;
    src.connect(bp).connect(gain).connect(this.ctx.destination);
    src.start();
  }

  // Must be called from a user gesture.
  toggle() {
    if (this.on) {
      this.on = false;
      this.status = "off";
      this.token++;
      this.audio.pause();
      this.onChange?.(null);
      return;
    }
    this.on = true;
    this.initAudioGraph();
    this.ctx?.resume();
    this.audio.src = SILENT;
    this.audio.play().catch(() => {});
    this.play(this.index);
  }

  next() {
    if (!this.on) return this.toggle();
    this.play((this.index + 1) % this.tracks.length);
  }

  prev() {
    if (!this.on) return this.toggle();
    this.play((this.index - 1 + this.tracks.length) % this.tracks.length);
  }

  preset(k) {
    if (!this.tracks.length) return;
    const i = k % this.tracks.length;
    if (!this.on) {
      this.index = i;
      return this.toggle();
    }
    this.play(i);
  }

  async play(i) {
    if (!this.tracks.length) {
      this.status = "nosignal";
      return;
    }
    const token = ++this.token;
    this.index = i;
    this.status = "tuning";
    this.staticBurst();
    try {
      const info = await this.resolve(i);
      if (token !== this.token) return;
      this.info = info;
      this.audio.src = info.preview;
      await this.audio.play();
      if (token !== this.token) return;
      this.failures = 0;
      this.status = "playing";
      this.onChange?.(info);
      this.resolve((i + 1) % this.tracks.length).catch(() => {});
    } catch {
      if (token !== this.token) return;
      this.status = "nosignal";
      if (++this.failures < 4)
        setTimeout(() => token === this.token && this.next(), 1500);
    }
  }

  draw(now, clock) {
    const fps = this.status === "playing" ? 30 : 4;
    if (now - this.lastDraw < 1000 / fps) return;
    this.lastDraw = now;
    const g = this.canvas.getContext("2d");
    const w = this.canvas.width,
      h = this.canvas.height;
    g.fillStyle = "#05070a";
    g.fillRect(0, 0, w, h);
    g.textBaseline = "middle";
    if (!this.on) {
      g.fillStyle = "#6f7882";
      g.textAlign = "center";
      g.font = '600 64px "Overpass", Arial, sans-serif';
      g.fillText(clock, w / 2, h / 2 - 6);
      g.font = '600 20px "Overpass", Arial, sans-serif';
      g.fillStyle = "#4c545d";
      g.fillText("PRESS ⏻ FOR RADIO", w / 2, h - 26);
      this.texture.needsUpdate = true;
      return;
    }
    g.textAlign = "left";
    g.fillStyle = "#ffcb05";
    g.font = '700 24px "Overpass", Arial, sans-serif';
    g.fillText(this.station, 18, 26);
    g.textAlign = "right";
    g.fillStyle = "#8b939c";
    g.font = '600 20px "Overpass", Arial, sans-serif';
    g.fillText(
      `${clock}   ${this.index + 1}/${this.tracks.length}`,
      w - 18,
      26,
    );

    let line;
    if (this.status === "tuning") line = "Tuning…";
    else if (this.status === "nosignal") line = "No signal — skipping";
    else line = `${this.info.title}  —  ${this.info.artist}`;
    g.font = '700 40px "Overpass", Arial, sans-serif';
    g.fillStyle = "#f2f4f7";
    g.textAlign = "left";
    const tw = g.measureText(line).width;
    const room = w - 36;
    let x = 18;
    if (tw > room) {
      const span = tw + 80;
      x = 18 - (((now / 1000) * 60) % span);
      g.save();
      g.beginPath();
      g.rect(18, 50, room, 60);
      g.clip();
      g.fillText(line, x, 82);
      g.fillText(line, x + span, 82);
      g.restore();
    } else {
      g.fillText(line, x, 82);
    }

    if (this.analyser && this.status === "playing") {
      this.analyser.getByteFrequencyData(this.bins);
      const n = 24;
      const bw = (w - 36) / n;
      for (let i = 0; i < n; i++) {
        const v = this.bins[i + 1] / 255;
        g.fillStyle = i % 2 ? "rgba(255,203,5,0.75)" : "rgba(255,203,5,0.55)";
        g.fillRect(18 + i * bw, 150 - v * 30, bw - 3, v * 30);
      }
    }
    const dur = this.audio.duration || 30;
    const p =
      this.status === "playing" ? Math.min(1, this.audio.currentTime / dur) : 0;
    g.fillStyle = "#20252b";
    g.fillRect(18, 162, w - 36, 6);
    g.fillStyle = "#ffcb05";
    g.fillRect(18, 162, (w - 36) * p, 6);
    this.texture.needsUpdate = true;
  }
}
