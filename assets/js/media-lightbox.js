/* Media lightbox, shared by the portfolio pages and the carnet.
   Lifted out of script.js so pages/carnet.html can reuse it instead of
   growing a second implementation. Add a selector here to make a new kind
   of media clickable. */
(() => {
  const VIDEO_TARGETS = '.project-trailer-video, .demoreel-video, .gallery-item-inner video, .entry-body video';
  const IMAGE_TARGETS = '.gallery-item-inner img, .entry-body img';
  const hasStaticMedia = document.querySelectorAll(VIDEO_TARGETS + ', ' + IMAGE_TARGETS).length > 0;
  // the carnet renders its entries after fetching the json, like the galleries do
  const hasDynamicGallery = document.querySelector('.showcase-gallery-mount, .competences-gallery-mount, .journal-stream') !== null;
  if (!hasStaticMedia && !hasDynamicGallery) return;

  const overlay = document.createElement('div');
  overlay.className = 'video-lightbox';
  overlay.innerHTML = `
    <button type="button" class="video-lightbox-close" aria-label="Fermer">x</button>
    <div class="video-lightbox-inner" role="dialog" aria-modal="true" aria-label="Video en plein ecran">
      <video controls playsinline preload="metadata"></video>
      <iframe title="Video en plein ecran" allow="autoplay; fullscreen" allowfullscreen></iframe>
      <img alt="" />
      <div class="video-lightbox-title" hidden></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const modalVideo = overlay.querySelector('video');
  const modalFrame = overlay.querySelector('iframe');
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
    modalFrame.style.display = 'none';
    modalImage.style.display = 'none';
  };

  const showImage = () => {
    modalImage.style.display = 'block';
    modalVideo.style.display = 'none';
    modalFrame.style.display = 'none';
  };

  const closeLightbox = () => {
    overlay.classList.remove('is-open');
    document.body.classList.remove('lightbox-open');
    modalVideo.pause();
    modalVideo.removeAttribute('src');
    modalVideo.load();
    modalFrame.removeAttribute('src');
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

  window.openYouTubeLightbox = videoUrl => {
    showVideo();
    modalVideo.style.display = 'none';
    modalFrame.style.display = 'block';
    modalFrame.src = videoUrl;
    modalFrame.title = 'Video en plein ecran';
    modalTitle.textContent = '';
    modalTitle.hidden = true;
    overlay.classList.add('is-open');
    document.body.classList.add('lightbox-open');
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
    const targetVideo = event.target.closest(VIDEO_TARGETS);
    if (targetVideo) {
      event.preventDefault();
      openVideoLightbox(targetVideo);
      return;
    }

    const targetImage = event.target.closest(IMAGE_TARGETS);
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
