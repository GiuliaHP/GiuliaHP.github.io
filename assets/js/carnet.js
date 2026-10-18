(function () {
  const state = { entries: [], tags: {}, tag: "", newestFirst: true };   // newest first is the default order
  const SORT_LABEL = { newest: "Chronologie Décroissante", oldest: "Chronologie Croissante" };
  const $ = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char]));
  const isColor = (value) => /^#[0-9a-f]{6}$/i.test(String(value || ""));
  const MEDIA_ROOT = "../";
  const isRemoteMedia = (value) => /^(?:[a-z][a-z0-9+.-]*:|\/\/|\/|\.\.\/)/i.test(String(value || ""));
  const mediaUrl = (value) => (!value || isRemoteMedia(value) ? value : MEDIA_ROOT + value);
  function sanitizeColors(source) {
    const result = {};
    if (source && typeof source === "object" && !Array.isArray(source)) {
      Object.entries(source).forEach(([tag, color]) => { if (isColor(color)) result[tag] = String(color).toLowerCase(); });
    }
    return result;
  }
  function readableInk(hex) {
    const linear = [1, 3, 5].map((index) => parseInt(hex.substr(index, 2), 16) / 255)
      .map((channel) => (channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4)));
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2] > 0.45 ? "#0b0e1a" : "#f4f5ff";
  }
  function colorFor(tag) {
    if (!tag) return "";
    if (state.tags[tag]) return state.tags[tag];
    const folded = tag.toLowerCase();
    const key = Object.keys(state.tags).find((name) => name.toLowerCase() === folded);
    return key ? state.tags[key] : "";
  }
  function entryAccent(tags) {
    const palette = tags.map(colorFor).filter(Boolean);
    if (!palette.length) return null;
    return { a: palette[0], b: palette[1] || palette[0], gradient: palette.length > 1 };
  }
  const entryTags = (entry) => Array.isArray(entry.tags) ? entry.tags : String(entry.tags || "").split(",").map((tag) => tag.trim()).filter(Boolean);
  // the allow-list lives in carnet-sanitize.js, shared with the desktop editor
  const sanitizeRichHtml = (source) => window.CarnetSanitize.sanitize(source, { resolveUrl: mediaUrl }).html;
  function renderBody(source) {
    if (/<(p|h2|h3|img|video|ul|ol)\b/i.test(source || "")) return sanitizeRichHtml(source);
    let html = escapeHtml(source || "").replace(/\r/g, "");
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (whole, alt, src) => `<img src="${mediaUrl(src)}" alt="${alt}" loading="lazy">`);
    html = html.replace(/<video([^>]*)>([\s\S]*?)<\/video>/gi, '<video$1>$2</video>');
    html = html.replace(/^(### .+)$/gm, "<h3>$1</h3>").replace(/^(## .+)$/gm, "<h2>$1</h2>");
    html = html.replace(/^\s*-\s+(.+)$/gm, "<li>$1</li>").replace(/(<li>.*<\/li>\n?)+/g, "<ul>$&</ul>");
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
    return html.split(/\n{2,}/).map((block) => /^(<h[23]>|<ul>|<img|<video)/.test(block.trim()) ? block : `<p>${block}</p>`).join("");
  }
  const entryDates = () => state.entries.map((entry) => String(entry.date || "")).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date));
  // The picker is the browser's own calendar; it is only bounded to the range the carnet covers.
  function setDateBounds() {
    const dates = entryDates().sort();
    const input = $("date-from");
    input.min = dates[0] || "";
    input.max = dates[dates.length - 1] || "";
    input.disabled = dates.length === 0;
  }
  const dateFloor = () => $("date-from").value;
  function renderSort() {
    $("sort").textContent = state.newestFirst ? SORT_LABEL.newest : SORT_LABEL.oldest;
    $("sort").setAttribute("aria-label", `Ordre : ${$("sort").textContent}. Cliquez pour inverser.`);
  }
  function setTagPanel(open) {
    $("tags").hidden = !open;
    $("tag-toggle").setAttribute("aria-expanded", String(open));
  }
  const closeTagPanel = () => setTagPanel(false);
  function renderTags() {
    const tags = [...new Set(state.entries.flatMap(entryTags))].sort((a, b) => a.localeCompare(b, "fr"));
    const chips = tags.map((tag) => {
      const color = colorFor(tag);
      const classes = `tag${state.tag === tag ? " active" : ""}${color ? " tag-tinted" : ""}`;
      const style = color ? ` style="--tag:${color};--tag-ink:${readableInk(color)}"` : "";
      return `<button class="${classes}"${style} data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`;
    });
    $("tags").innerHTML = tags.length
      ? `<button class="tag tag-any${state.tag ? "" : " active"}" data-tag="">Tous</button>${chips.join("")}`
      : '<p class="tag-panel-empty">Aucun tag pour le moment.</p>';
    $("tags").querySelectorAll("[data-tag]").forEach((button) => button.addEventListener("click", () => {
      state.tag = state.tag === button.dataset.tag ? "" : button.dataset.tag;
      closeTagPanel();
      render();
    }));
    $("tag-toggle-value").textContent = state.tag || "tous";
    $("tag-toggle").classList.toggle("filtered", Boolean(state.tag));
  }
  const postId = new URLSearchParams(window.location.search).get("post");
  const detailUrl = (entry) => {
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("post", entry.id);
    url.hash = "";
    return url.href;
  };
  function render() {
    renderTags();
    const query = $("search").value.trim().toLowerCase(), date = dateFloor();
    $("date-clear").hidden = !date;
    const filtered = state.entries.filter((entry) => {
      const tags = entryTags(entry);
      const haystack = `${entry.title} ${entry.body} ${tags.join(" ")}`.toLowerCase();
      return (!query || haystack.includes(query)) && (!state.tag || tags.includes(state.tag)) && (!date || entry.date >= date);
    }).sort((a, b) => (state.newestFirst ? -1 : 1) * `${a.date}-${a.id}`.localeCompare(`${b.date}-${b.id}`));
    const detailEntry = postId ? state.entries.find((entry) => entry.id === postId) : null;
    const visible = postId ? (detailEntry ? [detailEntry] : []) : filtered;
    $("journal-controls").hidden = Boolean(postId);
    $("entries").classList.toggle("journal-detail", Boolean(postId));
    const detailBack = detailEntry ? `<a class="entry-detail-back" href="carnet.html">← Retour au carnet</a>` : "";
    $("entries").innerHTML = detailBack + visible.map((entry) => {
      const tags = entryTags(entry);
      const accent = entryAccent(tags);
      const classes = accent ? `entry entry-tinted${accent.gradient ? " entry-gradient" : ""}` : "entry";
      const style = accent ? ` style="--entry-a:${accent.a};--entry-b:${accent.b}"` : "";
      const date = new Date(`${entry.date}T12:00:00`).toLocaleDateString("fr-FR", { year:"numeric", month:"long", day:"numeric" });
      const chips = tags.map((tag) => {
        const color = colorFor(tag);
        return color ? `<span class="tinted" style="--tag:${color}">${escapeHtml(tag)}</span>` : `<span>${escapeHtml(tag)}</span>`;
      }).join("");
      return `<article class="${classes}"${style} data-entry-url="${escapeHtml(detailUrl(entry))}" tabindex="0"><div class="entry-meta"><time datetime="${escapeHtml(entry.date)}">${date}</time></div><div class="entry-actions"><button class="entry-share" type="button" data-share-url="${escapeHtml(detailUrl(entry))}">Partager</button><span class="entry-share-status" aria-live="polite"></span></div><h2><a class="entry-title-link" href="${escapeHtml(detailUrl(entry))}">${escapeHtml(entry.title)}</a></h2><div class="entry-body">${renderBody(entry.body)}</div><div class="entry-tags">${chips}</div></article>`;
    }).join("");
    $("empty").hidden = visible.length > 0 || Boolean(detailEntry);
    if (postId && !detailEntry) $("empty").textContent = "Cette entrée n'existe pas ou n'est plus disponible.";
    if (postId && detailEntry) document.title = `${detailEntry.title} — Giulia HP`;
    document.querySelectorAll(".entry").forEach((entry) => {
      entry.addEventListener("click", (event) => {
        if (event.target.closest("a,button,img,video")) return;
        window.location.href = entry.dataset.entryUrl;
      });
      entry.addEventListener("keydown", (event) => {
        if ((event.key === "Enter" || event.key === " ") && event.target === entry) {
          event.preventDefault();
          window.location.href = entry.dataset.entryUrl;
        }
      });
    });
    document.querySelectorAll(".entry-share").forEach((button) => button.addEventListener("click", async () => {
      const status = button.parentElement.querySelector(".entry-share-status");
      try {
        if (navigator.share) {
          await navigator.share({ title: button.closest(".entry").querySelector("h2").textContent, url: button.dataset.shareUrl });
        } else {
          await navigator.clipboard.writeText(button.dataset.shareUrl);
          status.textContent = "Lien copié";
        }
      } catch (error) {
        if (error.name !== "AbortError") status.textContent = "Impossible de partager le lien";
      }
    }));
  }
  $("search").addEventListener("input", render);
  $("date-from").addEventListener("change", render);
  $("date-clear").addEventListener("click", () => { $("date-from").value = ""; render(); });
  $("tag-toggle").addEventListener("click", () => setTagPanel($("tags").hidden));
  document.addEventListener("mousedown", (event) => {
    if (!(event.target instanceof Element) || !event.target.closest(".tag-picker")) closeTagPanel();
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeTagPanel(); });
  $("sort").addEventListener("click", () => { state.newestFirst = !state.newestFirst; renderSort(); render(); });
  const loadJson = (url) => fetch(url).then((response) => { if (!response.ok) throw new Error(url); return response.json(); });
  Promise.all([
    loadJson("../assets/data/carnet_data.json"),
    loadJson("../assets/data/carnet_tags.json").catch(() => ({})),
  ]).then(([entries, colors]) => {
    state.entries = Array.isArray(entries) ? entries : [];
    state.tags = sanitizeColors(colors);
    renderSort();
    setDateBounds();
    render();
  }).catch(() => {
    $("empty").hidden = false;
    $("empty").textContent = "Le carnet ne peut pas être chargé pour le moment.";
  });
}());
