(function () {
  const state = { entries: [], tags: {}, tag: "", newestFirst: true, expanded: new Set() };   // newest first; every entry starts folded
  const ICON = {
    more: "../assets/img/logos/LO_ShowMore.png",
    less: "../assets/img/logos/LO_ShowLess.png",
    copy: "../assets/img/logos/LO_CopyLink.png",
    ascending: "../assets/img/logos/LO_Croissant.png",
    descending: "../assets/img/logos/LO_CroissantNot.png",
    showEverything: "../assets/img/logos/LO_ShowEverything.png",
    showNothing: "../assets/img/logos/LO_ShowNothing.png",
  };
  const OPEN_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const SORT_LABEL = { newest: "Chronologie Décroissante", oldest: "Chronologie Croissante" };
  const SORT_EASTER_EGG_URL = "https://www.youtube.com/embed/ykX6HHMYxdU?autoplay=1&controls=1&fs=1&playsinline=1";
  let sortClickCount = 0;
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
    if (/<(p|h2|h3|img|video|ul|ol|div|hr)\b/i.test(source || "")) return sanitizeRichHtml(source);
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
    const label = state.newestFirst ? SORT_LABEL.newest : SORT_LABEL.oldest;
    $("sort").querySelector(".sort-logo").src = state.newestFirst ? ICON.descending : ICON.ascending;
    const hoverLabel = state.newestFirst ? "Ordre Décroissant" : "Ordre Croissant";
    $("sort").setAttribute("aria-label", `${hoverLabel}. Cliquez pour inverser.`);
    $("sort").title = hoverLabel;
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
    const detailBack = detailEntry
      ? `<a class="entry-detail-back" href="carnet.html" aria-label="Retour au carnet" title="Retour au carnet"><img src="../assets/img/logos/LO_CarnetBack.png" alt=""></a>`
      : "";
    const listMode = !postId;
    $("journal-toolbar").hidden = !listMode || visible.length === 0;
    $("entries").innerHTML = detailBack + visible.map((entry) => {
      const tags = entryTags(entry);
      const accent = entryAccent(tags);
      const open = !listMode || state.expanded.has(entry.id);
      const classes = `entry${accent ? ` entry-tinted${accent.gradient ? " entry-gradient" : ""}` : ""}${open ? "" : " entry-collapsed"}`;
      const style = accent ? ` style="--entry-a:${accent.a};--entry-b:${accent.b}"` : "";
      const date = new Date(`${entry.date}T12:00:00`).toLocaleDateString("fr-FR", { year:"numeric", month:"long", day:"numeric" });
      const chips = tags.map((tag) => {
        const color = colorFor(tag);
        return color ? `<span class="tinted" style="--tag:${color}">${escapeHtml(tag)}</span>` : `<span>${escapeHtml(tag)}</span>`;
      }).join("");
      const url = escapeHtml(detailUrl(entry)), bodyId = `entry-body-${escapeHtml(entry.id)}`;
      const body = renderBody(entry.body);
      // a cut placed in the editor ends the folded preview; without one the body is clipped to a fixed height
      const bodyClass = /<hr\b[^>]*data-preview-cut/i.test(body) ? "entry-body has-cut" : "entry-body";
      const listActions = listMode
        ? `<button class="entry-icon entry-toggle" type="button" aria-controls="${bodyId}" aria-expanded="${open}" aria-label="${open ? "Replier" : "Déplier"} l'entrée" title="${open ? "Replier" : "Déplier"}"><img src="${open ? ICON.less : ICON.more}" alt=""></button>`
          + `<a class="entry-icon entry-open" href="${url}" aria-label="Ouvrir l'entrée seule" title="Ouvrir l'entrée seule">${OPEN_ICON}</a>`
        : "";
      const share = `<button class="entry-icon entry-share" type="button" data-share-url="${url}" aria-label="Copier le lien de l'entrée" title="Copier le lien"><img src="${ICON.copy}" alt=""></button>`;
      return `<article class="${classes}"${style} data-entry-id="${escapeHtml(entry.id)}"><header class="entry-head"><div class="entry-heading"><div class="entry-meta"><time datetime="${escapeHtml(entry.date)}">${date}</time></div><h2 class="entry-title">${escapeHtml(entry.title)}</h2></div><div class="entry-actions">${listActions}${share}</div></header><div class="${bodyClass}" id="${bodyId}">${body}</div><div class="entry-tags">${chips}</div></article>`;
    }).join("");
    $("empty").hidden = visible.length > 0 || Boolean(detailEntry);
    if (postId && !detailEntry) $("empty").textContent = "Cette entrée n'existe pas ou n'est plus disponible.";
    if (postId && detailEntry) document.title = `${detailEntry.title} — Giulia HP`;
    paintHeadings($("entries"));
    window.CarnetMedia.fitRows($("entries"));
    renderToggleAll();
  }
  // Headings coloured in the editor name a tag; the colour is looked up here so it follows the tag.
  function paintHeadings(root) {
    root.querySelectorAll("[data-tag-color]").forEach((heading) => {
      const color = colorFor(heading.dataset.tagColor);
      if (color) heading.style.color = color;
    });
  }
  const visibleIds = () => [...document.querySelectorAll(".entry[data-entry-id]")].map((entry) => entry.dataset.entryId);
  function renderToggleAll() {
    const ids = visibleIds(), allOpen = ids.length > 0 && ids.every((id) => state.expanded.has(id));
    const label = allOpen ? "Ranger Tout" : "Déplier Tout";
    $("toggle-all").querySelector(".toggle-all-logo").src = allOpen ? ICON.showNothing : ICON.showEverything;
    $("toggle-all").setAttribute("aria-label", label);
    $("toggle-all").title = label;
    $("toggle-all").setAttribute("aria-pressed", String(allOpen));
  }
  function setExpanded(article, open) {
    const id = article.dataset.entryId, button = article.querySelector(".entry-toggle");
    if (open) state.expanded.add(id); else state.expanded.delete(id);
    article.classList.toggle("entry-collapsed", !open);
    if (button) {
      const label = open ? "Replier" : "Déplier";
      button.setAttribute("aria-expanded", String(open));
      button.setAttribute("aria-label", `${label} l'entrée`);
      button.title = label;
      button.querySelector("img").src = open ? ICON.less : ICON.more;
    }
  }
  // Copy feedback is the icon dimming briefly; the hidden live region says it for screen readers.
  async function shareEntry(button) {
    const url = button.dataset.shareUrl;
    try {
      await navigator.clipboard.writeText(url);
    } catch (error) {
      if (!navigator.share) { $("share-status").textContent = "Impossible de copier le lien"; return; }
      try { await navigator.share({ title: button.closest(".entry").querySelector(".entry-title").textContent, url }); } catch (shareError) { /* closed by the reader */ }
      return;
    }
    $("share-status").textContent = "Lien copié";
    button.classList.add("copied");
    clearTimeout(button.copiedTimer);
    button.copiedTimer = setTimeout(() => { button.classList.remove("copied"); $("share-status").textContent = ""; }, 1200);
  }
  $("entries").addEventListener("click", (event) => {
    const share = event.target.closest(".entry-share");
    if (share) { shareEntry(share); return; }
    const toggle = event.target.closest(".entry-toggle");
    const article = event.target.closest(".entry");
    if (toggle) { setExpanded(article, article.classList.contains("entry-collapsed")); renderToggleAll(); return; }
    // clicking a folded preview opens it, unless the click was meant for a link or a media
    if (article && article.classList.contains("entry-collapsed") && event.target.closest(".entry-body") && !event.target.closest("a,button,img,video")) {
      setExpanded(article, true); renderToggleAll();
    }
  });
  $("toggle-all").addEventListener("click", () => {
    const ids = visibleIds(), open = !ids.every((id) => state.expanded.has(id));
    document.querySelectorAll(".entry[data-entry-id]").forEach((article) => setExpanded(article, open));
    renderToggleAll();
  });
  $("search").addEventListener("input", render);
  $("date-from").addEventListener("change", render);
  $("date-clear").addEventListener("click", () => { $("date-from").value = ""; render(); });
  const goToTop = $("go-to-top");
  const updateGoToTop = () => {
    const controls = $("journal-controls");
    const panelBottom = controls.getBoundingClientRect().bottom + window.scrollY;
    const passedResearchPanel = !controls.hidden && window.scrollY > panelBottom;
    goToTop.classList.toggle("is-visible", passedResearchPanel);
  };
  window.addEventListener("scroll", updateGoToTop, { passive: true });
  window.addEventListener("resize", updateGoToTop);
  goToTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: "smooth" }));
  updateGoToTop();
  $("tag-toggle").addEventListener("click", () => setTagPanel($("tags").hidden));
  document.addEventListener("mousedown", (event) => {
    if (!(event.target instanceof Element) || !event.target.closest(".tag-picker")) closeTagPanel();
  });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") closeTagPanel(); });
  $("sort").addEventListener("click", () => {
    sortClickCount += 1;
    if (sortClickCount === 5) {
      if (typeof window.openYouTubeLightbox === "function") window.openYouTubeLightbox(SORT_EASTER_EGG_URL);
      sortClickCount = 0;
    }
    state.newestFirst = !state.newestFirst;
    renderSort();
    render();
  });
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
