// DOM overlays: tooltip, panels (blog reader, projects, about, journey, contact), now-playing.

const $ = (sel) => document.querySelector(sel);
const esc = (s = "") =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

const tooltip = $("#tooltip");
const panel = $("#panel");
const panelBody = $("#panel .panel-body");
let onPanelClose = null;
let lastFocus = null;

export function showTooltip(label, x, y) {
  tooltip.textContent = label;
  tooltip.style.transform = `translate(${x + 16}px, ${y + 18}px)`;
  tooltip.classList.add("show");
}

export function hideTooltip() {
  tooltip.classList.remove("show");
}

export function toast(text) {
  const el = $("#toast");
  el.textContent = text;
  el.classList.add("show");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => el.classList.remove("show"), 1800);
}

export function isPanelOpen() {
  return !panel.hidden;
}

export function openPanel(theme, html, onClose) {
  const prev = onPanelClose;
  onPanelClose = null;
  if (!panel.hidden) prev?.();
  lastFocus = lastFocus || document.activeElement;
  panel.dataset.theme = theme;
  panelBody.innerHTML = html;
  panel.hidden = false;
  panelBody.scrollTop = 0;
  requestAnimationFrame(() => panel.classList.add("open"));
  panel.querySelector(".panel-close").focus({ preventScroll: true });
  onPanelClose = onClose;
}

export function closePanel() {
  if (panel.hidden) return;
  panel.classList.remove("open");
  panel.hidden = true;
  const cb = onPanelClose;
  onPanelClose = null;
  cb?.();
  lastFocus?.focus?.({ preventScroll: true });
  lastFocus = null;
}

panel.addEventListener("click", (e) => {
  if (e.target === panel || e.target.closest(".panel-close")) closePanel();
});

export async function openBlogPost(post, onClose) {
  openPanel("paper", `<p class="loading">Unfolding the page…</p>`, onClose);
  try {
    const html = await fetch(post.url).then((r) => {
      if (!r.ok) throw new Error(r.status);
      return r.text();
    });
    const doc = new DOMParser().parseFromString(html, "text/html");
    const content =
      doc.querySelector("article .project-content") ||
      doc.querySelector("article") ||
      doc.body;
    const base = new URL(post.url, location.href);
    content
      .querySelectorAll("[style]")
      .forEach((el) => el.removeAttribute("style"));
    content.querySelectorAll("script").forEach((el) => el.remove());
    content
      .querySelectorAll("[src]")
      .forEach((el) =>
        el.setAttribute("src", new URL(el.getAttribute("src"), base).href),
      );
    content
      .querySelectorAll("img")
      .forEach((el) => el.setAttribute("loading", "lazy"));
    content.querySelectorAll("a[href]").forEach((a) => {
      const href = a.getAttribute("href");
      if (href.startsWith("#")) return;
      a.href = new URL(href, base).href;
      if (a.origin !== location.origin) a.target = "_blank";
    });
    if (panel.dataset.theme !== "paper" || panel.hidden) return;
    panelBody.innerHTML = `
      <div class="post">${content.innerHTML}</div>
      <p class="post-foot"><a href="${esc(post.url)}">Open as a full page ↗</a></p>`;
  } catch {
    panelBody.innerHTML = `<p>Couldn't load that post. <a href="${esc(post.url)}">Open it directly ↗</a></p>`;
  }
}

export function openProjects(projects, onClose) {
  const cards = projects
    .map(
      (p) => `
      <a class="project" href="${esc(p.page)}">
        <img src="${esc(p.image)}" alt="" loading="lazy">
        <span class="project-text">
          <strong>${esc(p.title)}</strong>
          <span>${esc(p.shortDescription)}</span>
          <span class="tags">${(p.technologies || [])
            .slice(0, 4)
            .map((t) => `<em>${esc(t)}</em>`)
            .join("")}</span>
        </span>
      </a>`,
    )
    .join("");
  openPanel(
    "folder",
    `<div class="folder-tab">Projects</div>
     <h2>What I've been building</h2>
     <div class="projects">${cards}</div>
     <p class="panel-foot"><a href="projects.html">Search & filter every project →</a></p>`,
    onClose,
  );
}

export function openAbout(onClose) {
  openPanel(
    "polaroid",
    `<div class="about">
      <figure class="about-photo"><img src="assets/about-pic.JPEG" alt="Mitchell Carter"><figcaption>Hello! caught you 📸</figcaption></figure>
      <div class="about-text">
        <h2>Hi, I'm Mitchell.</h2>
        <p><strong>Current work:</strong> Founder of Mortar Creek Labs, an automation consultancy serving small businesses and non-profits. I build custom solutions that eliminate repetitive work and solve real operational problems.</p>
        <p><strong>What I build:</strong> Python automation, React/Django full-stack applications, data pipelines, API integrations, and tools that actually save people time.</p>
        <p>I'm also a pretty good cook, <a href="https://photos.mitchellcarter.dev" target="_blank" rel="noopener">lifelong photographer</a>, used book collector, and an Eagle Scout. I love creation and experimentation, building things that work, eliminating tedious manual processes, and I'm always learning what's next.</p>
        <p class="panel-foot"><a href="https://github.com/WeezerGeezer" target="_blank" rel="noopener">GitHub</a> ⋅ <a href="https://linkedin.com/in/mitchell-carter-dev" target="_blank" rel="noopener">LinkedIn</a></p>
      </div>
    </div>`,
    onClose,
  );
}

export function openJourney(stops, onClose) {
  const items = stops
    .map(
      (s) => `
      <li class="${s.highlight ? "highlight" : ""}">
        <img src="${esc(s.logo)}" alt="" loading="lazy">
        <div>
          <span class="period">${esc(s.period)}</span>
          <h3>${esc(s.title)}</h3>
          <p class="role">${esc(s.role)}</p>
          <ul>${s.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
          <p class="tags">${s.tags.map((t) => `<em>${esc(t)}</em>`).join("")}</p>
        </div>
      </li>`,
    )
    .join("");
  openPanel(
    "journey",
    `<div class="journey-head"><span class="block-m" aria-hidden="true">M</span><div><h2>The road so far</h2><p>Go Blue! Every stop that got me here.</p></div></div>
     <ol class="journey">${items}</ol>`,
    onClose,
  );
}

export function openContact(onClose) {
  openPanel(
    "phone",
    `<div class="contact">
      <p class="eyebrow">Next stop</p>
      <h2>Say hello 👋</h2>
      <p>I'm always up for talking automation, side projects, or a good used bookstore.</p>
      <a class="contact-row" href="mailto:mitchellandersoncarter@gmail.com"><span>✉️</span><span><strong>Email</strong>mitchellandersoncarter@gmail.com</span></a>
      <a class="contact-row" href="https://linkedin.com/in/mitchell-carter-dev" target="_blank" rel="noopener"><span>💼</span><span><strong>LinkedIn</strong>mitchell-carter-dev</span></a>
      <a class="contact-row" href="https://github.com/WeezerGeezer" target="_blank" rel="noopener"><span>🐙</span><span><strong>GitHub</strong>WeezerGeezer</span></a>
      <a class="contact-row" href="https://photos.mitchellcarter.dev" target="_blank" rel="noopener"><span>📷</span><span><strong>Photos</strong>photos.mitchellcarter.dev</span></a>
    </div>`,
    onClose,
  );
}

export function setNowPlaying(info, playlistUrl) {
  const el = $("#now-playing");
  if (!info) {
    el.hidden = true;
    return;
  }
  el.hidden = false;
  el.innerHTML = `
    ${info.art ? `<img src="${esc(info.art)}" alt="">` : ""}
    <span class="np-text"><strong>${esc(info.title)}</strong><span>${esc(info.artist)}</span></span>
    <a href="${esc(info.link)}" target="_blank" rel="noopener" title="Listen on Apple Music">Apple Music ↗</a>
    ${playlistUrl ? `<a href="${esc(playlistUrl)}" target="_blank" rel="noopener">Playlist ↗</a>` : ""}`;
}
