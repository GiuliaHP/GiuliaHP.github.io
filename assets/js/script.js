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

/* MEDIA LIGHTBOX */
(() => {
  const clickableMedia = () => document.querySelectorAll('.project-trailer-video, .gallery-item-inner video, .gallery-item-inner img');
  if (!clickableMedia().length) return;

  const overlay = document.createElement('div');
  overlay.className = 'video-lightbox';
  overlay.innerHTML = `
    <button type="button" class="video-lightbox-close" aria-label="Fermer">x</button>
    <div class="video-lightbox-inner" role="dialog" aria-modal="true" aria-label="Video en plein ecran">
      <video controls playsinline preload="metadata"></video>
      <img alt="" />
      <div class="video-lightbox-title" hidden></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const modalVideo = overlay.querySelector('video');
  const modalImage = overlay.querySelector('img');
  const modalTitle = overlay.querySelector('.video-lightbox-title');
  const closeBtn = overlay.querySelector('.video-lightbox-close');

  const getMediaTitle = sourceNode => {
    const galleryItem = sourceNode.closest('.gallery-item');
    const galleryCaption = galleryItem?.querySelector('.gallery-caption');
    if (galleryCaption && galleryCaption.textContent.trim()) return galleryCaption.textContent.trim();

    if (sourceNode.tagName === 'IMG') {
      const alt = sourceNode.getAttribute('alt') || '';
      if (alt.trim()) return alt.trim();
    }

    const trailer = sourceNode.closest('.project-trailer-banner');
    const trailerLabel = trailer?.getAttribute('aria-label') || '';
    if (trailerLabel.trim()) return trailerLabel.trim();

    return '';
  };

  const setTitle = sourceNode => {
    const title = getMediaTitle(sourceNode);
    if (title) {
      modalTitle.textContent = title;
      modalTitle.hidden = false;
      return;
    }

    modalTitle.textContent = '';
    modalTitle.hidden = true;
  };

  const showVideo = () => {
    modalVideo.style.display = 'block';
    modalImage.style.display = 'none';
  };

  const showImage = () => {
    modalImage.style.display = 'block';
    modalVideo.style.display = 'none';
  };

  const closeLightbox = () => {
    overlay.classList.remove('is-open');
    document.body.classList.remove('lightbox-open');
    modalVideo.pause();
    modalVideo.removeAttribute('src');
    modalVideo.load();
    modalImage.removeAttribute('src');
    modalImage.removeAttribute('alt');
    modalTitle.textContent = '';
    modalTitle.hidden = true;
  };

  const openVideoLightbox = sourceVideo => {
    const src = sourceVideo.currentSrc || sourceVideo.querySelector('source')?.src || sourceVideo.getAttribute('src');
    if (!src) return;

    showVideo();
    modalVideo.src = src;
    modalVideo.loop = Boolean(sourceVideo.loop);
    modalVideo.poster = sourceVideo.poster || '';
    modalVideo.muted = false;
    modalVideo.currentTime = 0;
    setTitle(sourceVideo);

    overlay.classList.add('is-open');
    document.body.classList.add('lightbox-open');

    const playAttempt = modalVideo.play();
    if (playAttempt && typeof playAttempt.catch === 'function') {
      playAttempt.catch(() => {});
    }
  };

  const openImageLightbox = sourceImage => {
    const src = sourceImage.currentSrc || sourceImage.getAttribute('src');
    if (!src) return;

    showImage();
    modalImage.src = src;
    modalImage.alt = sourceImage.getAttribute('alt') || '';
    setTitle(sourceImage);

    overlay.classList.add('is-open');
    document.body.classList.add('lightbox-open');
  };

  document.addEventListener('click', event => {
    const targetVideo = event.target.closest('.project-trailer-video, .gallery-item-inner video');
    if (targetVideo) {
      event.preventDefault();
      openVideoLightbox(targetVideo);
      return;
    }

    const targetImage = event.target.closest('.gallery-item-inner img');
    if (targetImage) {
      event.preventDefault();
      openImageLightbox(targetImage);
      return;
    }

    if (event.target === overlay || event.target === closeBtn) {
      closeLightbox();
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && overlay.classList.contains('is-open')) {
      closeLightbox();
    }
  });
})();

/* SHOWCASE GALLERY */
(async () => {
  const mounts = document.querySelectorAll('.showcase-gallery-mount[data-manifest]');
  if (!mounts.length) return;

  function createTextBlock(item, extraClass = '') {
    const block = document.createElement('div');
    block.className = `gallery-text-block ${extraClass}`.trim();

    if (item.title) {
      const h3 = document.createElement('h3');
      h3.textContent = item.title;
      block.appendChild(h3);
    }

    if (item.body) {
      const p = document.createElement('p');
      p.textContent = item.body;
      block.appendChild(p);
    }

    return block;
  }

  for (const container of mounts) {
    const manifest = container.dataset.manifest;
    let items;

    try {
      const res = await fetch(manifest);
      if (!res.ok) throw new Error('fetch failed');
      items = await res.json();
    } catch {
      container.closest('.showcase-section')?.remove();
      continue;
    }

    if (!Array.isArray(items) || items.length === 0) {
      container.closest('.showcase-section')?.remove();
      continue;
    }

    // Group consecutive media items (max 2 per row); text items break groups
    const rows = [];
    let mediaBuffer = [];

    const flushMedia = () => {
      if (!mediaBuffer.length) return;
      rows.push({ kind: 'media', items: [...mediaBuffer] });
      mediaBuffer = [];
    };

    for (const item of items) {
      if (item.type === 'text') {
        flushMedia();
        rows.push({ kind: 'text', item });
      } else {
        mediaBuffer.push(item);
        if (mediaBuffer.length === 2) flushMedia();
      }
    }
    flushMedia();

    const gallery = document.createElement('div');
    gallery.className = 'showcase-gallery';

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      if (row.kind === 'text') {
        const next = rows[i + 1];
        const hasNotesPair =
          next &&
          next.kind === 'text' &&
          /^notes?/i.test((next.item.title || '').trim());

        if (hasNotesPair) {
          const pair = document.createElement('div');
          pair.className = 'gallery-text-pair reveal';

          const mainBlock = createTextBlock(row.item, 'is-main');
          const noteBlock = createTextBlock(next.item, 'is-note');
          pair.appendChild(mainBlock);
          pair.appendChild(noteBlock);
          gallery.appendChild(pair);

          i += 1;
        } else {
          const block = createTextBlock(row.item, 'reveal');
          gallery.appendChild(block);
        }
      } else {
        const rowEl = document.createElement('div');
        rowEl.className = 'gallery-row reveal';
        rowEl.style.setProperty('--cols', row.items.length);

        const hasMixedMediaPair =
          row.items.length === 2 &&
          row.items.some(media => media.type === 'video') &&
          row.items.some(media => media.type === 'image');

        if (hasMixedMediaPair) {
          rowEl.classList.add('has-mixed-media-pair');
        }

        for (const media of row.items) {
          const itemEl = document.createElement('div');
          itemEl.className = 'gallery-item';
          itemEl.classList.add(media.type === 'image' ? 'gallery-item--image' : 'gallery-item--video');

          const inner = document.createElement('div');
          inner.className = 'gallery-item-inner';

          if (media.type === 'video') {
            const video = document.createElement('video');
            video.muted = true;
            video.loop = true;
            video.playsInline = true;
            video.preload = 'none';
            const source = document.createElement('source');
            source.src = media.src;
            source.type = 'video/mp4';
            video.appendChild(source);
            inner.appendChild(video);

            // Autoplay when scrolled into view
            const videoObs = new IntersectionObserver(entries => {
              entries.forEach(e => {
                if (e.isIntersecting) {
                  video.play().catch(() => {});
                } else {
                  video.pause();
                }
              });
            }, { threshold: 0.25 });
            videoObs.observe(inner);

          } else if (media.type === 'image') {
            const img = document.createElement('img');
            img.src = media.src;
            img.alt = media.caption || '';
            img.loading = 'lazy';
            inner.appendChild(img);
          }

          itemEl.appendChild(inner);

          if (media.caption) {
            const cap = document.createElement('p');
            cap.className = 'gallery-caption';
            cap.textContent = media.caption;
            itemEl.appendChild(cap);
          }

          rowEl.appendChild(itemEl);
        }

        gallery.appendChild(rowEl);
      }
    }

    container.appendChild(gallery);

    // Hook new .reveal elements into the existing scroll observer
    container.querySelectorAll('.reveal').forEach(el => obs.observe(el));
  }
})();

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