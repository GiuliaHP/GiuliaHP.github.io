/* The single allow-list for entry HTML.
   The published page and the desktop editor both run markup through this, so the
   editor can no longer display formatting the site would silently throw away. */
(function (global) {
  const ALLOWED = new Set(["P", "BR", "STRONG", "B", "EM", "I", "H2", "H3", "UL", "OL", "LI", "A", "IMG", "VIDEO", "SOURCE", "DIV", "HR"]);
  const WIDTHS = Array.from({ length: 19 }, (value, index) => String(10 + index * 5));   // matches carnet-entry.css
  const ALIGNS = ["inline", "left", "center", "right"];
  const TEXT_BLOCKS = ["P", "H2", "H3", "UL", "OL", "LI", "DIV"];
  const TEXT_ALIGNS = ["left", "center", "right", "justify"];
  const MEDIA_LAYOUT = new Map([["data-align", ALIGNS], ["data-width", WIDTHS]]);
  const MEDIA = ["IMG", "VIDEO"];
  const WITH_SRC = ["IMG", "VIDEO", "SOURCE"];
  const isToken = (value) => /^[a-f0-9]{8,64}$/.test(String(value || ""));
  // a heading tinted with one of the entry's tags stores the tag's name, so it follows the tag's colour
  const isTagName = (value) => /^[^<>"&]{1,60}$/.test(String(value || ""));

  function keeps(element, attribute) {
    const layout = MEDIA_LAYOUT.get(attribute.name);
    return (element.tagName === "A" && ["href", "target", "rel"].includes(attribute.name))
      || (WITH_SRC.includes(element.tagName) && ["src", "alt", "controls", "preload", "loading", "type"].includes(attribute.name))
      || (MEDIA.includes(element.tagName) && layout && layout.includes(attribute.value))
      || (TEXT_BLOCKS.includes(element.tagName) && attribute.name === "data-text-align" && TEXT_ALIGNS.includes(attribute.value))
      // the editor's unsaved-media placeholder; the backend swaps it for a real tag on save
      || (element.tagName === "DIV" && attribute.name === "data-media-token" && isToken(attribute.value))
      // a strip of media laid side by side at one shared height
      || (element.tagName === "DIV" && attribute.name === "data-media-row")
      // where the folded preview of an entry stops
      || (element.tagName === "HR" && attribute.name === "data-preview-cut")
      || (["H2", "H3"].includes(element.tagName) && attribute.name === "data-tag-color" && isTagName(attribute.value));
  }

  /* Returns the cleaned HTML plus what had to go, so the editor can say so. */
  function sanitize(source, options) {
    const resolveUrl = (options && options.resolveUrl) || ((value) => value);
    const template = document.createElement("template");
    template.innerHTML = String(source || "");
    const stripped = new Set();
    template.content.querySelectorAll("*").forEach((element) => {
      if (!ALLOWED.has(element.tagName)) {
        stripped.add(element.tagName.toLowerCase());
        element.replaceWith(...element.childNodes);
        return;
      }
      [...element.attributes].forEach((attribute) => {
        if (keeps(element, attribute)) return;
        if (attribute.name === "style" || attribute.name === "class") stripped.add(attribute.name);
        element.removeAttribute(attribute.name);
      });
      if (WITH_SRC.includes(element.tagName)) {
        const src = element.getAttribute("src") || "";
        // a <video> carries its url on a nested <source>, which is checked on its own turn
        const nested = element.tagName === "VIDEO" && element.querySelector("source[src]");
        if ((!src && !nested) || src.startsWith("javascript:") || src.startsWith("file:")) element.remove();
        else if (src) element.setAttribute("src", resolveUrl(src));
      }
    });
    return { html: template.innerHTML, stripped: [...stripped] };
  }

  global.CarnetSanitize = { sanitize, ALLOWED, WIDTHS, ALIGNS, TEXT_ALIGNS };

  /* Media rows share one height: each item grows by its aspect ratio, which is
     only known once the file's size has loaded. Shared for the same reason as
     the allow-list: the editor's canvas and the page must lay a row out alike. */
  function fitMedia(element) {
    const apply = () => {
      const width = element.naturalWidth || element.videoWidth, height = element.naturalHeight || element.videoHeight;
      if (width && height) element.style.flexGrow = (width / height).toFixed(4);
    };
    if ((element.tagName === "IMG" && element.complete) || (element.tagName === "VIDEO" && element.readyState >= 1)) apply();
    else element.addEventListener(element.tagName === "VIDEO" ? "loadedmetadata" : "load", apply, { once: true });
  }
  function fitRows(root) {
    root.querySelectorAll("[data-media-row] > img, [data-media-row] > video").forEach(fitMedia);
  }

  global.CarnetMedia = { fitMedia, fitRows };
}(window));
