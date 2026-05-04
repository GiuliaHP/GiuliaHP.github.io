(function () {
  const NAV_HTML = `
<nav>
  <div class="nav-inner">
    <div class="nav-logo-section">
      <a class="nav-logo" href="index.html">
        <img class="nav-logo-icon" src="assets/img/icons/IC_Main.png" alt="" aria-hidden="true" />
        <span>Giulia HP.</span>
      </a>
      <div class="nav-logo-submenu">
          <a href="index.html#contact" data-i18n="header.contact">Contact</a>
      </div>
    </div>
    <div class="nav-links-column">
      <div class="nav-language-switch" role="group" aria-label="Language selector">
        <button type="button" class="nav-language-button" data-lang-option="fr">FR</button>
        <button type="button" class="nav-language-button" data-lang-option="en">ENG</button>
      </div>
      <ul class="nav-links">
        <li class="nav-projects-dropdown">
            <button type="button" class="nav-projects-trigger" aria-haspopup="true" data-i18n="header.projects">Projets</button>
            <ul class="nav-projects-menu" aria-label="Liste des projets" data-i18n-aria="header.projectsMenuLabel">
              <li><a href="index.html#projects" data-i18n="header.projectsAll">Tous les projets</a></li>
            <li><a href="project-soultide.html">SoulTide</a></li>
            <li><a href="project-herbarium.html">The Herbarium</a></li>
            <li><a href="project-blueprint.html">The Unfinished Blueprint</a></li>
            <li><a href="project-prophecy.html">Prophecy</a></li>
            <li><a href="project-portrait.html">Character Maker</a></li>
          </ul>
        </li>
          <li><a href="games.html" data-i18n="header.games">Jeux</a></li>
          <li><a href="travaux.html" data-i18n="header.work">Travaux</a></li>
          <li><a href="cv.html" data-i18n="header.cv">CV</a></li>
      </ul>
    </div>
  </div>
</nav>`;

  const FOOTER_HTML = `
<footer>
    <span data-i18n="footer.copy">© 2026 Giulia HP.</span>
    <span data-i18n="footer.host">Hébergé sur GitHub Pages</span>
    <span data-i18n="footer.update">Last Update: 04/05/2026 12:33</span>
</footer>`;

  function inject(id, html) {
    const el = document.getElementById(id);
    if (!el) return;
    el.outerHTML = html;
  }

  inject('nav-placeholder', NAV_HTML);
  inject('footer-placeholder', FOOTER_HTML);
})();
