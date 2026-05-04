(function () {
  const NAV_HTML = `
<nav>
  <div class="nav-inner">
    <div class="nav-logo-section">
      <a class="nav-logo" href="index.html">Giulia HP.</a>
      <div class="nav-logo-submenu">
        <a href="index.html#contact">Contact</a>
      </div>
    </div>
    <ul class="nav-links">
      <li class="nav-projects-dropdown">
        <button type="button" class="nav-projects-trigger" aria-haspopup="true">Projets</button>
        <ul class="nav-projects-menu" aria-label="Liste des projets">
          <li><a href="index.html#projects">Tous les projets</a></li>
          <li><a href="project-soultide.html">SoulTide</a></li>
          <li><a href="project-herbarium.html">The Herbarium</a></li>
          <li><a href="project-blueprint.html">The Unfinished Blueprint</a></li>
          <li><a href="project-prophecy.html">Prophecy</a></li>
          <li><a href="project-portrait.html">Character Maker</a></li>
        </ul>
      </li>
      <li><a href="games.html">Jeux</a></li>
      <li><a href="travaux.html">Travaux</a></li>
      <li><a href="cv.html">CV</a></li>
    </ul>
  </div>
</nav>`;

  const FOOTER_HTML = `
<footer>
  <span>© 2026 Giulia HP.</span>
  <span>Hébergé sur GitHub Pages</span>
  <span>Last Update: 04/05/2026 12:33</span>
</footer>`;

  function inject(id, html) {
    const el = document.getElementById(id);
    if (!el) return;
    el.outerHTML = html;
  }

  inject('nav-placeholder', NAV_HTML);
  inject('footer-placeholder', FOOTER_HTML);
})();
