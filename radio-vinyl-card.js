/* radio-vinyl-card — Radio Browser player with a spinning-vinyl logo and live song info.
   Logos are shown straight from the station's own URL: nothing is downloaded or stored.
   https://github.com/JusztinJ/radio-vinyl-card  ·  MIT licence */
const CARD_VERSION = "1.0.1";
const RADIO_SVG = `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20 6H8.3l8.26-3.34L15.88 1 3.24 6.15C2.51 6.43 2 7.17 2 8v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8c0-1.11-.89-2-2-2m0 2v3h-2V9h-2v2H4V8h16M7 20a3 3 0 1 1 0-6 3 3 0 0 1 0 6"/></svg>`;
console.info(`%c RADIO-VINYL-CARD %c v${CARD_VERSION} `, "color:#fff;background:#222;font-weight:700", "color:#222;background:#f4f1ea");
const LS_STATION = "radio_vinyl_station";
const RB_HOSTS = [
  "https://all.api.radio-browser.info",
  "https://de1.api.radio-browser.info",
  "https://de2.api.radio-browser.info",
  "https://fi1.api.radio-browser.info",
];
async function rb(path) {
  for (const h of RB_HOSTS) {
    try {
      const r = await fetch(h + path);
      if (r.ok) return await r.json();
    } catch (e) { /* try next mirror */ }
  }
  throw new Error("Radio Browser unreachable");
}
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };

class RadioVinylCard extends HTMLElement {
  setConfig(config) {
    this._config = { country: "GB", ...config };
    if (!this.shadowRoot) this._build();
    if (this._hass) this.hass = this._hass;
  }
  static getStubConfig() { return { country: "GB" }; }
  static getConfigElement() { return document.createElement("radio-vinyl-card-editor"); }
  getCardSize() { return 8; }
  getGridOptions() { return { columns: 12, min_columns: 6 }; }

  // Station is kept in an input_text helper when one is configured (shared by every
  // device), otherwise in this browser's local storage.
  _helper() { const e = this._config.entity; return e && this._hass && this._hass.states[e] ? e : null; }

  set hass(hass) {
    this._hass = hass;
    let uuid;
    const helper = this._helper();
    if (helper) {
      const st = hass.states[helper];
      uuid = !["unknown", "unavailable"].includes(st.state) ? st.state.trim() : "";
    } else {
      uuid = lsGet(LS_STATION, "");
    }
    if (uuid !== this._uuid) {
      this._uuid = uuid;
      this._loadStation(uuid);
    }
  }

  _build() {
    const root = this.attachShadow({ mode: "open" });
    root.innerHTML = `
<style>
  :host { display:block; }
  ha-card { overflow:hidden; position:relative; padding:20px 16px 16px; }
  .deck { position:relative; width:min(78%, 300px); margin:4px auto 14px; aspect-ratio:1; }
  .platter { position:absolute; inset:0; border-radius:50%; background:#0b0b0b;
    box-shadow:0 14px 34px rgba(0,0,0,.45), 0 0 0 6px rgba(127,127,127,.18); }
  .record { position:absolute; inset:2%; border-radius:50%;
    background:
      radial-gradient(circle, transparent 0 33%, rgba(255,255,255,.05) 33.5% 34.2%, transparent 34.6%),
      radial-gradient(circle, transparent 0 62%, rgba(255,255,255,.05) 62.4% 63%, transparent 63.4%),
      repeating-radial-gradient(circle, #141414 0 1.6px, #1d1d1d 1.6px 3px);
    animation: spin 4s linear infinite; animation-play-state: paused; }
  .playing .record { animation-play-state: running; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .label { position:absolute; inset:30%; border-radius:50%; overflow:hidden; background:#f4f1ea;
    display:grid; place-items:center; box-shadow: inset 0 0 0 3px rgba(0,0,0,.25); }
  .label img { width:100%; height:100%; object-fit:cover; display:none; }
  .label.has-img img { display:block; }
  .label.has-img .ini { display:none; }
  .ini { font: 800 clamp(18px, 6vw, 34px)/1 system-ui, sans-serif; color:#2a2a2a; letter-spacing:-.02em; }
  .label.empty { background: radial-gradient(circle at 50% 50%, #ff7a45 0 58%, #e8543a 59% 100%); }
  .label.empty .ini { color:#fff; display:grid; place-items:center; width:46%; }
  .ini svg { width:100%; height:auto; display:block; }
  .is-preview .record { animation-play-state: running; }
  .is-preview .arm { transform: rotate(4deg); }
  .hole { position:absolute; left:50%; top:50%; width:4%; height:4%; transform:translate(-50%,-50%);
    border-radius:50%; background:#d9d9d9; box-shadow:0 0 0 2px #555; }
  .shine { position:absolute; inset:2%; border-radius:50%; pointer-events:none;
    background: conic-gradient(from 20deg, transparent 0 6%, rgba(255,255,255,.10) 11%, transparent 17% 50%, rgba(255,255,255,.08) 61%, transparent 67%); }
  .arm { position:absolute; right:-7%; top:-4%; width:30%; height:84%; transform-origin:72% 9%;
    transform: rotate(-24deg); transition: transform .9s cubic-bezier(.4,.1,.2,1); pointer-events:none; }
  .playing .arm { transform: rotate(4deg); }
  .station { text-align:center; font-size:13px; letter-spacing:.08em; text-transform:uppercase;
    color: var(--secondary-text-color); margin-bottom:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .mq { overflow:hidden; white-space:nowrap; text-align:center; }
  .mq.scroll { text-align:left; -webkit-mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent);
    mask-image: linear-gradient(90deg, transparent, #000 6%, #000 94%, transparent); }
  .mq .track { display:inline-block; }
  .mq.scroll .track { display:inline-flex; animation: mq var(--dur, 12s) linear infinite; }
  .mq .seg { display:inline-block; }
  .mq.scroll .seg { padding-right:3em; }
  @keyframes mq { to { transform: translateX(-50%); } }
  .title { font-size:20px; font-weight:700; color: var(--primary-text-color); line-height:1.35; }
  .artist { font-size:16px; color: var(--secondary-text-color); line-height:1.35; min-height:1.35em; }
  .controls { display:flex; align-items:center; gap:12px; margin-top:14px; }
  button { font: inherit; cursor:pointer; border:none; background:none; color: var(--primary-text-color); }
  .icon-btn { width:42px; height:42px; border-radius:50%; display:grid; place-items:center;
    background: var(--secondary-background-color, rgba(127,127,127,.15)); }
  .play { width:56px; height:56px; border-radius:50%; display:grid; place-items:center;
    background: var(--primary-color); color: var(--text-primary-color, #fff); flex:none; }
  .vol { flex:1; display:flex; align-items:center; gap:8px; min-width:0; }
  .vol input { flex:1; min-width:0; accent-color: var(--primary-color); }
  ha-icon { --mdc-icon-size: 24px; }
  .play ha-icon { --mdc-icon-size: 30px; }
  .msg { text-align:center; font-size:12px; color: var(--error-color); min-height:0; margin-top:6px; }
  .picker { position:absolute; inset:0; background: var(--card-background-color, var(--ha-card-background, #fff));
    display:flex; flex-direction:column; padding:14px; gap:10px; z-index:2; }
  .picker[hidden] { display:none; }
  .ph { display:flex; gap:8px; align-items:center; }
  .ph input { flex:1; min-width:0; padding:10px 12px; border-radius:10px; font-size:15px;
    border:1px solid var(--divider-color, #ccc); background: var(--secondary-background-color, transparent); color: var(--primary-text-color); }
  .list { overflow:auto; flex:1; display:flex; flex-direction:column; gap:2px; }
  .row { display:flex; align-items:center; gap:10px; padding:8px; border-radius:10px; text-align:left; width:100%; }
  .row:hover { background: var(--secondary-background-color, rgba(127,127,127,.12)); }
  .row img, .row .ph-img { width:36px; height:36px; border-radius:8px; object-fit:cover; flex:none; background: rgba(127,127,127,.18); }
  .row .n { font-weight:600; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .row .s { font-size:12px; color: var(--secondary-text-color); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .row > div { min-width:0; }
  .hint { color: var(--secondary-text-color); font-size:13px; padding:8px; }
</style>
<ha-card>
  <div class="wrap">
    <div class="deck">
      <div class="platter"></div>
      <div class="record"><div class="label"><img alt="" referrerpolicy="no-referrer"><span class="ini">♪</span></div><div class="hole"></div></div>
      <div class="shine"></div>
      <svg class="arm" viewBox="0 0 60 170" aria-hidden="true">
        <circle cx="43" cy="15" r="12" fill="#9a9a9a"/><circle cx="43" cy="15" r="5" fill="#555"/>
        <path d="M43 15 L43 120 L26 150" stroke="#c9c9c9" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <rect x="16" y="144" width="20" height="22" rx="3" fill="#7a7a7a" transform="rotate(32 26 155)"/>
      </svg>
    </div>
    <div class="station">Radio</div>
    <div class="mq title"></div>
    <div class="mq artist"></div>
    <div class="msg"></div>
    <div class="controls">
      <button class="icon-btn choose" title="Choose station"><ha-icon icon="mdi:playlist-music"></ha-icon></button>
      <button class="play" title="Play"><ha-icon icon="mdi:play"></ha-icon></button>
      <div class="vol"><ha-icon icon="mdi:volume-high"></ha-icon><input type="range" min="0" max="100"></div>
    </div>
  </div>
  <div class="picker" hidden>
    <div class="ph">
      <input type="search" placeholder="Search Radio Browser stations…">
      <button class="icon-btn close" title="Close"><ha-icon icon="mdi:close"></ha-icon></button>
    </div>
    <div class="list"></div>
  </div>
  <audio preload="none"></audio>
</ha-card>`;
    const $ = (s) => root.querySelector(s);
    this.$ = { card: $("ha-card"), label: $(".label"), img: $(".label img"), ini: $(".ini"), station: $(".station"),
      title: $(".title"), artist: $(".artist"), msg: $(".msg"), play: $(".play"), playIcon: $(".play ha-icon"),
      vol: $(".vol input"), picker: $(".picker"), search: $(".ph input"), list: $(".list"), audio: $("audio") };

    this.$.img.addEventListener("error", () => this.$.label.classList.remove("has-img"));
    this.$.img.addEventListener("load", () => this.$.label.classList.add("has-img"));
    this.$.play.addEventListener("click", () => this._toggle());
    $(".choose").addEventListener("click", () => this._openPicker());
    $(".close").addEventListener("click", () => (this.$.picker.hidden = true));
    let t;
    this.$.search.addEventListener("input", () => { clearTimeout(t); t = setTimeout(() => this._search(this.$.search.value), 400); });

    const v = Number(lsGet("radio_vinyl_volume", "70"));
    this.$.vol.value = v; this.$.audio.volume = v / 100;
    this.$.vol.addEventListener("input", () => { this.$.audio.volume = this.$.vol.value / 100; lsSet("radio_vinyl_volume", this.$.vol.value); });

    const a = this.$.audio;
    a.addEventListener("playing", () => this._setPlaying(true));
    a.addEventListener("pause", () => this._setPlaying(false));
    a.addEventListener("error", () => { if (this._wantPlay) { this._msg("This station can't be played right now."); this._setPlaying(false); } });

    this._ro = new ResizeObserver(() => { this._marquee(this.$.title, this._songTitle); this._marquee(this.$.artist, this._songArtist); });
    this._ro.observe(this.$.card);
    this._setSong(null);
  }

  disconnectedCallback() { this._stopMeta(); }

  // In the "Add card" picker, spin the record so the card is easy to recognise.
  set preview(v) { this._previewFlag = !!v; this._applyPreview(); }
  connectedCallback() { this._applyPreview(); }
  _inPicker() {
    let node = this;
    for (let i = 0; i < 15 && node; i++) {
      const root = node.getRootNode && node.getRootNode();
      node = root && root.host;
      if (node && /CARD-PICKER/i.test(node.tagName)) return true;
    }
    return false;
  }
  _applyPreview() {
    if (!this.$) return;
    this.$.card.classList.toggle("is-preview", !this._station && (!!this._previewFlag || this._inPicker()));
  }

  async _loadStation(uuid) {
    this._stopMeta();
    if (!uuid) { this._station = null; this._render(); return; }
    try {
      const res = await rb("/json/stations/byuuid?uuids=" + encodeURIComponent(uuid));
      if (uuid !== this._uuid) return;
      this._station = res && res[0] ? res[0] : null;
    } catch (e) { this._station = null; this._msg("Couldn't reach Radio Browser."); }
    this._render();
    if (this._wantPlay && this._station) this._start();
  }

  _render() {
    const s = this._station;
    this.$.label.classList.remove("has-img");
    this.$.img.removeAttribute("src");
    this.$.label.classList.toggle("empty", !s);
    this._applyPreview();
    if (!s) {
      this.$.station.textContent = "Radio Vinyl";
      this.$.ini.innerHTML = RADIO_SVG;
      this._setSong(null, "Choose a station");
      return;
    }
    this.$.station.textContent = [s.name, s.country].filter(Boolean).join(" · ");
    this.$.ini.textContent = (s.name || "♪").replace(/[^\p{L}\p{N} ]/gu, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "♪";
    if (s.favicon) this.$.img.src = s.favicon; // shown directly from the station, never saved
    if (!this._playing) this._setSong(null, s.name);
  }

  _streamUrl() { const s = this._station; return s ? (s.url_resolved || s.url) : null; }

  async _toggle() {
    if (!this._station) { this._openPicker(); return; }
    if (this._playing || this._wantPlay) { this._stop(); } else { this._wantPlay = true; this._start(); }
  }

  async _start() {
    const url = this._streamUrl(); if (!url) return;
    this._msg("");
    this._destroyHls();
    const a = this.$.audio;
    const isHls = /\.m3u8(\?|$)/i.test(url) || this._station.hls === 1;
    try {
      if (isHls && !a.canPlayType("application/vnd.apple.mpegurl")) {
        const mod = await import("https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.mjs");
        const Hls = mod.default;
        this._hls = new Hls(); this._hls.loadSource(url); this._hls.attachMedia(a);
      } else { a.src = url; }
      await a.play();
      this._startMeta();
    } catch (e) {
      this._wantPlay = false; this._setPlaying(false);
      this._msg("This station can't be played right now.");
    }
  }

  _stop() {
    this._wantPlay = false;
    const a = this.$.audio;
    a.pause(); this._destroyHls(); a.removeAttribute("src"); a.load();
    this._stopMeta(); this._setPlaying(false);
    this._setSong(null, this._station && this._station.name);
  }
  _destroyHls() { if (this._hls) { try { this._hls.destroy(); } catch (e) {} this._hls = null; } }

  _setPlaying(on) {
    this._playing = on;
    this.$.card.classList.toggle("playing", on);
    this.$.playIcon.setAttribute("icon", on ? "mdi:pause" : "mdi:play");
  }
  _msg(t) { this.$.msg.textContent = t || ""; }

  /* ---------- now playing (artist / title) ---------- */
  _startMeta() {
    this._stopMeta();
    this._metaMode = null; this._metaFails = 0;
    const tick = async () => {
      if (!this._wantPlay) return;
      const text = await this._fetchMeta();
      if (text) { this._metaFails = 0; this._setSong(text); }
      else if (++this._metaFails === 2 && !this._songTitle) this._setSong(null, "Live");
      const next = this._metaMode === "none" ? 0 : 20000;
      if (next && this._wantPlay) this._metaTimer = setTimeout(tick, next);
    };
    tick();
  }
  _stopMeta() { clearTimeout(this._metaTimer); this._metaTimer = null; }

  async _fetchMeta() {
    const url = this._streamUrl(); if (!url) return null;
    if (this._metaMode !== "icy") {
      const t = await this._icecastStatus(url);
      if (t) { this._metaMode = "icecast"; return t; }
    }
    if (this._metaMode !== "icecast") {
      const t = await this._icyInline(url);
      if (t) { this._metaMode = "icy"; return t; }
    }
    if (!this._metaMode && this._metaFails >= 1) this._metaMode = "none"; // stream offers no song info
    return null;
  }

  async _icecastStatus(url) {
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 6000);
    try {
      const u = new URL(url);
      const r = await fetch(u.origin + "/status-json.xsl", { signal: ctl.signal, cache: "no-store" });
      if (!r.ok) return null;
      const j = JSON.parse((await r.text()).replace(/"title":\s*-\s*,/g, '"title":"",'));
      let src = j && j.icestats && j.icestats.source; if (!src) return null;
      src = [].concat(src);
      const m = src.find((x) => { try { return new URL(x.listenurl).pathname === u.pathname; } catch (e) { return false; } }) || (src.length === 1 ? src[0] : null);
      if (!m) return null;
      if (m.artist && m.title) return `${m.artist} - ${m.title}`;
      return (m.title || m.yp_currently_playing || "").trim() || null;
    } catch (e) { return null; } finally { clearTimeout(to); }
  }

  async _icyInline(url) {
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 8000);
    try {
      const r = await fetch(url, { headers: { "Icy-MetaData": "1" }, signal: ctl.signal, cache: "no-store" });
      const mi = parseInt(r.headers.get("icy-metaint") || "0", 10);
      if (!mi || !r.body || mi > 262144) return null;
      const reader = r.body.getReader();
      let buf = new Uint8Array(0);
      const need = async (n) => {
        while (buf.length < n) {
          const { value, done } = await reader.read(); if (done) throw new Error("eof");
          const nb = new Uint8Array(buf.length + value.length); nb.set(buf); nb.set(value, buf.length); buf = nb;
        }
      };
      await need(mi + 1);
      const len = buf[mi] * 16; if (!len) return null;
      await need(mi + 1 + len);
      const raw = new TextDecoder("utf-8").decode(buf.subarray(mi + 1, mi + 1 + len));
      const m = raw.match(/StreamTitle='(.*?)';/);
      return m && m[1].trim() ? m[1].trim() : null;
    } catch (e) { return null; } finally { clearTimeout(to); ctl.abort(); }
  }

  _setSong(text, fallback) {
    let title = "", artist = "";
    if (text) {
      const i = text.indexOf(" - ");
      if (i > 0) { artist = text.slice(0, i).trim(); title = text.slice(i + 3).trim(); } else { title = text.trim(); }
    } else { title = fallback || ""; }
    if (title === this._songTitle && artist === this._songArtist) return;
    this._songTitle = title; this._songArtist = artist;
    this._marquee(this.$.title, title);
    this._marquee(this.$.artist, artist);
  }

  _marquee(el, text) {
    text = text || "";
    el.classList.remove("scroll");
    el.innerHTML = `<div class="track"><span class="seg">${esc(text)}</span></div>`;
    requestAnimationFrame(() => {
      const seg = el.querySelector(".seg"); if (!seg) return;
      if (seg.scrollWidth > el.clientWidth + 2) {
        el.classList.add("scroll");
        const track = el.querySelector(".track");
        track.innerHTML = `<span class="seg">${esc(text)}</span><span class="seg" aria-hidden="true">${esc(text)}</span>`;
        const w = track.scrollWidth / 2;
        track.style.setProperty("--dur", Math.max(8, w / 45) + "s");
      }
    });
  }

  /* ---------- station picker ---------- */
  _openPicker() {
    this.$.picker.hidden = false;
    this.$.search.value = "";
    this._search("");
    setTimeout(() => this.$.search.focus(), 50);
  }

  async _search(q) {
    const seq = (this._seq = (this._seq || 0) + 1);
    this.$.list.innerHTML = `<div class="hint">Loading…</div>`;
    const base = "&hidebroken=true&order=clickcount&reverse=true&limit=40";
    const path = q.trim()
      ? `/json/stations/search?name=${encodeURIComponent(q.trim())}${base}`
      : `/json/stations/search?countrycode=${encodeURIComponent(this._config.country)}${base}`;
    let res = [];
    try { res = await rb(path); } catch (e) { if (seq === this._seq) this.$.list.innerHTML = `<div class="hint">Couldn't reach Radio Browser.</div>`; return; }
    if (seq !== this._seq) return;
    if (!res.length) { this.$.list.innerHTML = `<div class="hint">No stations found.</div>`; return; }
    this.$.list.innerHTML = "";
    for (const s of res) {
      const b = document.createElement("button");
      b.className = "row";
      const sub = [s.country, s.tags && s.tags.split(",").slice(0, 2).join(", "), s.codec && s.bitrate ? `${s.codec} ${s.bitrate}k` : s.codec].filter(Boolean).join(" · ");
      b.innerHTML = `${s.favicon ? `<img loading="lazy" referrerpolicy="no-referrer" alt="" src="${esc(s.favicon)}">` : `<span class="ph-img"></span>`}<div><div class="n">${esc(s.name)}</div><div class="s">${esc(sub)}</div></div>`;
      const im = b.querySelector("img"); if (im) im.addEventListener("error", () => (im.style.visibility = "hidden"));
      b.addEventListener("click", () => this._choose(s));
      this.$.list.appendChild(b);
    }
  }

  _choose(s) {
    this.$.picker.hidden = true;
    rb("/json/url/" + s.stationuuid).catch(() => {}); // counts the click for Radio Browser
    const wasSame = s.stationuuid === this._uuid;
    this._wantPlay = true;
    this._station = s; this._uuid = s.stationuuid;
    this._render();
    this._start();
    if (wasSame) return;
    const helper = this._helper();
    if (helper) {
      this._hass.callService("input_text", "set_value", { entity_id: helper, value: s.stationuuid });
    } else {
      lsSet(LS_STATION, s.stationuuid);
    }
  }
}

/* ---------- visual editor ---------- */
class RadioVinylCardEditor extends HTMLElement {
  setConfig(config) { this._config = { ...config }; this._render(); }
  set hass(hass) { this._hass = hass; this._render(); }
  _render() {
    if (!this._hass || !this._config) return;
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) => ({
        entity: "Station helper (optional input_text, shares the station across devices)",
        country: "Country code for the default station list (e.g. GB, HU, US)",
      }[s.name] || s.name);
      this._form.addEventListener("value-changed", (ev) => {
        const cfg = { ...this._config, ...ev.detail.value };
        Object.keys(cfg).forEach((k) => (cfg[k] === "" || cfg[k] === undefined) && delete cfg[k]);
        this._config = cfg;
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: cfg }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.data = this._config;
    this._form.schema = [
      { name: "entity", selector: { entity: { domain: "input_text" } } },
      { name: "country", selector: { text: {} } },
    ];
  }
}

if (!customElements.get("radio-vinyl-card")) customElements.define("radio-vinyl-card", RadioVinylCard);
if (!customElements.get("radio-vinyl-card-editor")) customElements.define("radio-vinyl-card-editor", RadioVinylCardEditor);
window.customCards = window.customCards || [];
if (!window.customCards.find((c) => c.type === "radio-vinyl-card")) {
  window.customCards.push({
    type: "radio-vinyl-card",
    name: "Radio Vinyl Card",
    description: "Radio Browser player with a spinning vinyl logo and the current song.",
    preview: true,
    documentationURL: "https://github.com/JusztinJ/radio-vinyl-card",
  });
}
