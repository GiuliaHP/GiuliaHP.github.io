/* CURSOR */
const cursor = document.getElementById('cursor');
const projectCursorIcon = document.getElementById('projectCursorIcon');
const projectCursorIconImg = document.getElementById('projectCursorIconImg');
const projectCursorIconLabel = document.getElementById('projectCursorIconLabel');
const canTrackProjectIcons = Boolean(projectCursorIcon && projectCursorIconImg && projectCursorIconLabel);
let activeProjectRow = null;

function setProjectCursorPosition(x, y) {
  if (!canTrackProjectIcons) return;
  projectCursorIcon.style.left = x + 'px';
  projectCursorIcon.style.top = y + 'px';
}

function showProjectCursorIcon(row, x, y) {
  if (!canTrackProjectIcons) return;

  const iconSrc = row.dataset.icon ? new URL(row.dataset.icon, location.href).href : '';
  const iconLabel = row.dataset.iconLabel || '';

  projectCursorIcon.classList.remove('has-image', 'has-label');
  if (iconSrc) {
    projectCursorIconImg.src = iconSrc;
    projectCursorIcon.classList.add('has-image');
  } else {
    projectCursorIconImg.removeAttribute('src');
  }

  if (!iconSrc && iconLabel) {
    projectCursorIconLabel.textContent = iconLabel;
    projectCursorIcon.classList.add('has-label');
  } else {
    projectCursorIconLabel.textContent = '';
  }

  setProjectCursorPosition(x, y);
  projectCursorIcon.classList.add('visible');
}

function getProjectPreviewVideo(row) {
  const mediaFrame = row.querySelector('.project-media-frame');
  if (!mediaFrame) return null;

  const webmSrc = (row.dataset.videoWebm || '').trim();
  const mp4Src = (row.dataset.videoMp4 || '').trim();
  if (!webmSrc && !mp4Src) return null;

  let video = mediaFrame.querySelector('.project-preview-video');
  if (!video) {
    video = document.createElement('video');
    video.className = 'project-preview-video';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = 'none';

    const posterImg = mediaFrame.querySelector('img');
    if (posterImg && posterImg.getAttribute('src')) {
      video.poster = new URL(posterImg.getAttribute('src'), location.href).href;
    }

    mediaFrame.appendChild(video);
  }

  if (!video.dataset.loaded) {
    if (webmSrc) {
      const sourceWebm = document.createElement('source');
      sourceWebm.src = new URL(webmSrc, location.href).href;
      sourceWebm.type = 'video/webm';
      video.appendChild(sourceWebm);
    }

    if (mp4Src) {
      const sourceMp4 = document.createElement('source');
      sourceMp4.src = new URL(mp4Src, location.href).href;
      sourceMp4.type = 'video/mp4';
      video.appendChild(sourceMp4);
    }

    video.load();
    video.dataset.loaded = 'true';
  }

  return video;
}

function startProjectPreviewVideo(row) {
  const video = getProjectPreviewVideo(row);
  if (!video) return;

  row.classList.add('video-active');
  const playAttempt = video.play();
  if (playAttempt && typeof playAttempt.catch === 'function') {
    playAttempt.catch(() => {
      row.classList.remove('video-active');
    });
  }
}

function stopProjectPreviewVideo(row) {
  if (!row) return;

  row.classList.remove('video-active');
  const video = row.querySelector('.project-preview-video');
  if (!video) return;

  video.pause();
  video.currentTime = 0;
}

function hideProjectCursorIcon() {
  stopProjectPreviewVideo(activeProjectRow);
  activeProjectRow = null;

  if (!canTrackProjectIcons) return;

  projectCursorIcon.classList.remove('visible', 'has-image', 'has-label');
  projectCursorIconImg.removeAttribute('src');
  projectCursorIconLabel.textContent = '';
}

if (cursor) {
  document.addEventListener('mousemove', e => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top  = e.clientY + 'px';

    if (activeProjectRow) {
      setProjectCursorPosition(e.clientX, e.clientY);
    }
  });

  document.querySelectorAll('a, button').forEach(el => {
    el.addEventListener('mouseenter', () => cursor.classList.add('hovering'));
    el.addEventListener('mouseleave', () => cursor.classList.remove('hovering'));
  });
}

/* PROJECT BACKGROUNDS */
document.querySelectorAll('.project-row').forEach(row => {
  const bg = row.dataset.bg;
  if (bg) {
    const bgUrl = new URL(bg, location.href).href;
    row.style.setProperty('--project-bg', `url("${bgUrl}")`);
  }

  row.addEventListener('mouseenter', e => {
    activeProjectRow = row;
    showProjectCursorIcon(row, e.clientX, e.clientY);
    startProjectPreviewVideo(row);
  });

  row.addEventListener('mousemove', e => {
    setProjectCursorPosition(e.clientX, e.clientY);
  });

  row.addEventListener('focus', () => {
    activeProjectRow = row;
    startProjectPreviewVideo(row);
  });

  row.addEventListener('mouseleave', hideProjectCursorIcon);
  row.addEventListener('blur', hideProjectCursorIcon);
});

/* REVEAL */
const obs = new IntersectionObserver(entries => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) setTimeout(() => {
      e.target.classList.add('visible');
      e.target.querySelectorAll('.skill-entry[data-level]').forEach(entry => {
        const parsedLevel = Number.parseInt(entry.dataset.level, 10);
        const level = Number.isFinite(parsedLevel)
          ? Math.max(0, Math.min(100, parsedLevel))
          : 0;
        entry.classList.remove('high', 'mid', 'low');
        entry.classList.add(level >= 70 ? 'high' : level >= 45 ? 'mid' : 'low');
        const bar = entry.querySelector('.skill-bar');
        if (bar) bar.style.width = `${level}%`;
      });
    }, i * 100);
  });
}, { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

/* TRAILER AUTOPLAY + REDUCED MOTION */
const trailerVideos = document.querySelectorAll('.project-trailer-video');
if (trailerVideos.length) {
  const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

  const updateTrailerPlayback = () => {
    trailerVideos.forEach(video => {
      if (reducedMotionQuery.matches) {
        video.pause();
        return;
      }

      const playAttempt = video.play();
      if (playAttempt && typeof playAttempt.catch === 'function') {
        playAttempt.catch(() => {});
      }
    });
  };

  updateTrailerPlayback();

  if (typeof reducedMotionQuery.addEventListener === 'function') {
    reducedMotionQuery.addEventListener('change', updateTrailerPlayback);
  } else if (typeof reducedMotionQuery.addListener === 'function') {
    reducedMotionQuery.addListener(updateTrailerPlayback);
  }
}

/* LOCAL DEV AUTO-RELOAD */
(() => {
  const isLocalHost = location.hostname === '127.0.0.1' || location.hostname === 'localhost';
  if (!isLocalHost) return;

  const tracked = new Map();
  const trackedUrls = new Set([location.pathname || '/']);

  document.querySelectorAll('link[rel="stylesheet"][href], script[src]').forEach(el => {
    const ref = el.getAttribute('href') || el.getAttribute('src');
    if (ref) trackedUrls.add(ref);
  });

  const toAbsolute = ref => new URL(ref, location.href);

  async function getStamp(url) {
    const bust = `_lr=${Date.now()}`;
    const sep = url.search ? '&' : '?';
    const probeUrl = `${url.href}${sep}${bust}`;
    try {
      const res = await fetch(probeUrl, { method: 'HEAD', cache: 'no-store' });
      if (!res.ok) return null;

      const etag = res.headers.get('etag') || '';
      const modified = res.headers.get('last-modified') || '';
      const length = res.headers.get('content-length') || '';
      return `${etag}|${modified}|${length}`;
    } catch {
      return null;
    }
  }

  async function warmUp() {
    for (const ref of trackedUrls) {
      const abs = toAbsolute(ref);
      const stamp = await getStamp(abs);
      tracked.set(abs.href, stamp);
    }
  }

  let polling = false;
  async function checkUpdates() {
    if (polling) return;
    polling = true;
    try {
      for (const [href, previousStamp] of tracked) {
        const stamp = await getStamp(new URL(href));
        if (stamp && previousStamp && stamp !== previousStamp) {
          location.reload();
          return;
        }
        if (stamp) tracked.set(href, stamp);
      }
    } finally {
      polling = false;
    }
  }

  warmUp().finally(() => {
    setInterval(checkUpdates, 1200);
  });
})();