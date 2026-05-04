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

  const mp4Src = (row.dataset.videoMp4 || '').trim();
  if (!mp4Src) return null;

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
    // Show loading spinner
    let loader = mediaFrame.querySelector('.video-loader');
    if (!loader) {
      loader = document.createElement('div');
      loader.className = 'video-loader';
      mediaFrame.appendChild(loader);
    }

    if (mp4Src) {
      const sourceMp4 = document.createElement('source');
      sourceMp4.src = new URL(mp4Src, location.href).href;
      sourceMp4.type = 'video/mp4';
      video.appendChild(sourceMp4);
    }

    video.load();
    video.dataset.loaded = 'true';

    // Remove loader when video is ready to play
    video.addEventListener('canplay', () => {
      if (loader && loader.parentNode) {
        loader.remove();
      }
    }, { once: true });
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

  document.querySelectorAll('a, button, .demoreel-container, .demoreel-video').forEach(el => {
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

/* DEMOREEL SOUND & LIGHTBOX */
function initDemoReel() {
  const demoReelVideo = document.querySelector('.demoreel-video');
  const soundBtn = document.querySelector('.demoreel-sound-btn');
  
  if (!demoReelVideo || !soundBtn) {
    console.warn('Demoreel elements not found');
    return;
  }

  console.log('Demoreel initialized:', { demoReelVideo, soundBtn });

  // Sound button - toggle muted state
  soundBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    e.preventDefault();
    console.log('Sound button clicked, current muted:', demoReelVideo.muted);
    demoReelVideo.muted = !demoReelVideo.muted;
    soundBtn.innerHTML = demoReelVideo.muted ? '<span class="sound-icon">🔇</span>' : '<span class="sound-icon">🔊</span>';
    console.log('Muted now:', demoReelVideo.muted);
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initDemoReel);
} else {
  initDemoReel();
}

/* MEDIA LIGHTBOX */
(() => {
  const clickableMedia = () => document.querySelectorAll('.project-trailer-video, .demoreel-video, .gallery-item-inner video, .gallery-item-inner img');
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
    const targetVideo = event.target.closest('.project-trailer-video, .demoreel-video, .gallery-item-inner video');
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

  function extractKeyPoints(body) {
    // Split by sentence and extract 2-3 first key points
    const sentences = body.split(/(?<=[.!?])\s+/).filter(s => s.trim());
    const keyPoints = [];
    
    // Take first 1-2 sentences and break them into key points
    for (let i = 0; i < Math.min(2, sentences.length); i++) {
      const sent = sentences[i].trim();
      // Extract tech terms or main concepts from the sentence
      // Remove extra text and keep it concise
      const cleaned = sent
        .replace(/^[A-Z]es\s+/, '') // "Les " -> ""
        .replace(/\s*,.*/, '') // Remove clauses after comma
        .substring(0, 85); // Limit length
      
      if (cleaned.length > 15) {
        keyPoints.push(cleaned);
      }
    }
    
    // If we have less than 2, try to add a third
    if (keyPoints.length < 2 && sentences.length > 2) {
      const sent = sentences[2].trim();
      const cleaned = sent.replace(/^[A-Z]es\s+/, '').substring(0, 85);
      if (cleaned.length > 15) keyPoints.push(cleaned);
    }
    
    return keyPoints.length > 0 ? keyPoints : ['Voir la description complète'];
  }

  function createTextBlock(item, extraClass = '', attachedNotes = []) {
    const isNote = item.title && item.title.startsWith('NOTE');
    const block = document.createElement('div');
    block.className = `gallery-text-block ${extraClass}`.trim();

    if (item.title) {
      const h3 = document.createElement('h3');
      h3.textContent = item.title;
      block.appendChild(h3);
    }

    if (item.body && !isNote) {
      // Use manual listing if provided, otherwise generate
      const keyPoints = item.listing || extractKeyPoints(item.body);
      
      // Create listing
      const listing = document.createElement('ul');
      listing.className = 'gallery-text-listing';
      keyPoints.forEach(point => {
        const li = document.createElement('li');
        li.textContent = point;
        listing.appendChild(li);
      });
      block.appendChild(listing);

      // Create hidden full content container
      const fullContent = document.createElement('div');
      fullContent.className = 'gallery-full-content';
      fullContent.hidden = true;

      // Add full description
      const fullText = document.createElement('p');
      fullText.className = 'gallery-full-text';
      fullText.textContent = item.body;
      fullContent.appendChild(fullText);

      // Add attached notes if any
      if (attachedNotes.length > 0) {
        attachedNotes.forEach(noteItem => {
          const noteBlock = document.createElement('div');
          noteBlock.className = 'gallery-note-block';
          
          if (noteItem.title) {
            const noteTitle = document.createElement('h4');
            noteTitle.textContent = noteItem.title;
            noteBlock.appendChild(noteTitle);
          }
          
          if (noteItem.body) {
            const noteText = document.createElement('p');
            noteText.textContent = noteItem.body;
            noteBlock.appendChild(noteText);
          }
          
          fullContent.appendChild(noteBlock);
        });
      }

      block.appendChild(fullContent);

      // Create button with icon
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'gallery-voir-plus';
      btn.setAttribute('aria-expanded', 'false');
      btn.setAttribute('aria-label', 'Voir la description complète');
      
      const icon = document.createElement('img');
      icon.src = 'assets/img/logos/LO_ShowMore.png';
      icon.alt = '';
      icon.className = 'voir-plus-icon';
      btn.appendChild(icon);
      
      btn.addEventListener('click', () => {
        const expanded = btn.getAttribute('aria-expanded') === 'true';
        if (expanded) {
          fullContent.hidden = true;
          btn.setAttribute('aria-expanded', 'false');
          icon.src = 'assets/img/logos/LO_ShowMore.png';
        } else {
          fullContent.hidden = false;
          btn.setAttribute('aria-expanded', 'true');
          icon.src = 'assets/img/logos/LO_ShowLess.png';
          try { fullContent.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch(e) {}
        }
      });
      block.appendChild(btn);
    } else if (item.body && isNote) {
      // NOTE blocks shown directly without listing
      const p = document.createElement('p');
      p.textContent = item.body;
      block.appendChild(p);
    }

    return block;
  }

  for (const container of mounts) {
    const manifest = container.dataset.manifest;
    const parsedTallThreshold = Number.parseFloat(container.dataset.tallImageThreshold || '');
    const tallImageThreshold = Number.isFinite(parsedTallThreshold) ? parsedTallThreshold : 0.86;
    const shouldMoveImageBelowVideo = ratio => {
      if (ratio === null || !Number.isFinite(ratio)) return false;
      if (!(tallImageThreshold > 0)) return false;

      // Only very wide images move below the video.
      const normalizedThreshold = Math.min(tallImageThreshold, 0.999);
      const wideThreshold = 1 / normalizedThreshold;
      return ratio > wideThreshold;
    };
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

    // Filter by category if specified
    const category = container.dataset.category;
    if (category) {
      items = items.filter(item => item.category === category);
      if (items.length === 0) {
        container.closest('.competences-section')?.remove();
        continue;
      }
    }

    // Build rows with support for: one video + multiple side images.
    const rows = [];
    let index = 0;

    while (index < items.length) {
      const current = items[index];

      if (current.type === 'text') {
        // Collect following NOTE items
        const attachedNotes = [];
        let lookahead = index + 1;
        while (lookahead < items.length && 
               items[lookahead].type === 'text' && 
               items[lookahead].title && 
               items[lookahead].title.startsWith('NOTE')) {
          attachedNotes.push(items[lookahead]);
          lookahead += 1;
        }
        
        rows.push({ kind: 'text', item: current, attachedNotes });
        index = lookahead;
        continue;
      }

      if (current.type === 'video') {
        const nextItem = items[index + 1];
        if (nextItem && nextItem.type === 'video') {
          rows.push({ kind: 'media', items: [current, nextItem] });
          index += 2;
          continue;
        }

        const sideImages = [];
        let lookahead = index + 1;
        while (lookahead < items.length && items[lookahead].type === 'image') {
          sideImages.push(items[lookahead]);
          lookahead += 1;
        }

        if (sideImages.length >= 2) {
          rows.push({ kind: 'media-stack', video: current, images: sideImages });
          index = lookahead;
          continue;
        }

        if (sideImages.length === 1) {
          rows.push({ kind: 'media', items: [current, sideImages[0]] });
          index = lookahead;
          continue;
        }

        rows.push({ kind: 'media', items: [current] });
        index += 1;
        continue;
      }

      if (current.type === 'image') {
        const imageRow = [current];
        index += 1;

        while (index < items.length && items[index].type === 'image' && imageRow.length < 2) {
          imageRow.push(items[index]);
          index += 1;
        }

        rows.push({ kind: 'media', items: imageRow });
      }
    }

    const gallery = document.createElement('div');
    gallery.className = 'showcase-gallery';
    const imageAspectRatioCache = new Map();

    async function getImageAspectRatio(src) {
      if (!src) return null;
      if (imageAspectRatioCache.has(src)) return imageAspectRatioCache.get(src);

      const ratioPromise = new Promise(resolve => {
        const probe = new Image();
        probe.decoding = 'async';
        probe.addEventListener('load', () => {
          const w = probe.naturalWidth;
          const h = probe.naturalHeight;
          resolve(w && h ? (w / h) : null);
        }, { once: true });
        probe.addEventListener('error', () => resolve(null), { once: true });
        probe.src = src;
      });

      imageAspectRatioCache.set(src, ratioPromise);
      return ratioPromise;
    }

    function createMediaItem(media) {
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
        if (media.webm) {
          const sourceWebm = document.createElement('source');
          sourceWebm.src = media.webm;
          sourceWebm.type = 'video/webm';
          video.appendChild(sourceWebm);
        }
        const source = document.createElement('source');
        source.src = media.src;
        source.type = 'video/mp4';
        video.appendChild(source);
        inner.appendChild(video);

        // Apply video aspect ratio to frame
        const applyVideoRatio = () => {
          const w = video.videoWidth;
          const h = video.videoHeight;
          if (!w || !h) return;
          inner.style.setProperty('--media-ratio', `${w} / ${h}`);
        };

        video.addEventListener('loadedmetadata', applyVideoRatio, { once: true });

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

        const applyImageRatio = () => {
          const w = img.naturalWidth;
          const h = img.naturalHeight;
          if (!w || !h) return;
          inner.style.setProperty('--media-ratio', `${w} / ${h}`);
        };

        if (img.complete) {
          applyImageRatio();
        } else {
          img.addEventListener('load', applyImageRatio, { once: true });
        }

        inner.appendChild(img);
      }

      itemEl.appendChild(inner);

      if (media.caption) {
        const cap = document.createElement('p');
        cap.className = 'gallery-caption';
        cap.textContent = media.caption;
        itemEl.appendChild(cap);
      }

      return itemEl;
    }

    for (let i = 0; i < rows.length; i += 1) {
      const row = rows[i];
      if (row.kind === 'text') {
        const block = createTextBlock(row.item, 'reveal', row.attachedNotes || []);
        gallery.appendChild(block);
      } else if (row.kind === 'media') {
        const rowEl = document.createElement('div');
        rowEl.className = 'gallery-row reveal';
        rowEl.style.setProperty('--cols', row.items.length);

        const hasMixedMediaPair =
          row.items.length === 2 &&
          row.items.some(media => media.type === 'video') &&
          row.items.some(media => media.type === 'image');

        if (hasMixedMediaPair) {
          rowEl.classList.add('has-mixed-media-pair');

          const pairImage = row.items.find(media => media.type === 'image');
          const imageRatio = pairImage ? await getImageAspectRatio(pairImage.src) : null;
          const shouldPlaceBelowVideo = shouldMoveImageBelowVideo(imageRatio);
          if (shouldPlaceBelowVideo) {
            rowEl.classList.add('has-mixed-media-pair-below');
          }
        }

        for (const media of row.items) rowEl.appendChild(createMediaItem(media));

        gallery.appendChild(rowEl);
      } else if (row.kind === 'media-stack') {
        const ratioEntries = await Promise.all(
          row.images.map(async image => ({
            image,
            ratio: await getImageAspectRatio(image.src)
          }))
        );

        const sideImages = [];
        const sideImageRatios = [];
        const underVideoImages = [];
        for (const entry of ratioEntries) {
          // Very tall images are easier to read under the video than inside the side stack.
          if (shouldMoveImageBelowVideo(entry.ratio)) {
            underVideoImages.push(entry.image);
          } else {
            sideImages.push(entry.image);
            sideImageRatios.push(entry.ratio);
          }
        }

        const rowEl = document.createElement('div');
        rowEl.className = 'gallery-row gallery-row--media-stack reveal';

        const videoItem = createMediaItem(row.video);
        rowEl.appendChild(videoItem);

        if (sideImages.length) {
          const imageStack = document.createElement('div');
          imageStack.className = 'gallery-image-stack';
          imageStack.style.setProperty('--stack-count', String(sideImages.length));
          imageStack.style.setProperty('--stack-base-height', '210px');

          const useTwoLanes = sideImages.length >= 4;
          let maxOffsetY = 0;

          for (let imageIndex = 0; imageIndex < sideImages.length; imageIndex += 1) {
            const image = sideImages[imageIndex];
            const ratio = sideImageRatios[imageIndex];
            const imageItem = createMediaItem(image);
            imageItem.classList.add('gallery-item--stack-image');

            const rotate = (Math.random() * 9) - 4.5;
            const jitterX = (Math.random() * 24) - 12;
            const lift = Math.random() * 8;
            const lane = useTwoLanes ? imageIndex % 2 : 0;
            const tier = useTwoLanes ? Math.floor(imageIndex / 2) : imageIndex;
            const baseStepY = useTwoLanes ? 120 : 100;
            const laneOffsetY = useTwoLanes ? lane * 42 : 0;
            const laneOffsetX = useTwoLanes ? lane * 280 : 0;

            // Adjust offset for very tall images - move them up to prevent overlap with next video
            let heightAdjustment = 0;
            if (ratio && ratio < 0.5) {
              // Very tall image (aspect ratio < 0.5, meaning height > 2x width)
              heightAdjustment = -70;
            } else if (ratio && ratio < 0.65) {
              // Tall image (aspect ratio < 0.65)
              heightAdjustment = -40;
            }

            const offsetY = tier * baseStepY + laneOffsetY - lift + heightAdjustment;
            const offsetX = laneOffsetX + jitterX;

            if (offsetY > maxOffsetY) maxOffsetY = offsetY;

            imageItem.style.setProperty('--stack-rotate', `${rotate.toFixed(2)}deg`);
            imageItem.style.setProperty('--stack-offset-x', `${offsetX.toFixed(2)}px`);
            imageItem.style.setProperty('--stack-offset-y', `${offsetY.toFixed(2)}px`);
            imageItem.style.setProperty('--stack-z', String(imageIndex + 1));

            imageStack.appendChild(imageItem);
          }

          imageStack.style.setProperty('--stack-max-offset', `${maxOffsetY.toFixed(2)}px`);
          rowEl.appendChild(imageStack);
        } else {
          rowEl.classList.add('is-side-empty');
        }

        if (underVideoImages.length) {
          const underVideo = document.createElement('div');
          underVideo.className = 'gallery-under-video';

          for (const image of underVideoImages) {
            const imageItem = createMediaItem(image);
            imageItem.classList.add('gallery-item--under-video');
            underVideo.appendChild(imageItem);
          }

          rowEl.appendChild(underVideo);
        }

        gallery.appendChild(rowEl);
      }
    }

    container.appendChild(gallery);

    // Hook new .reveal elements into the existing scroll observer
    container.querySelectorAll('.reveal').forEach(el => obs.observe(el));
    
    // Hook gallery media for cursor ring on hover
    if (cursor) {
      const galleryMedia = container.querySelectorAll('.gallery-item-inner img, .gallery-item-inner video');
      galleryMedia.forEach(media => {
        media.addEventListener('mouseenter', () => {
          cursor.classList.add('hovering');
        });
        
        media.addEventListener('mouseleave', () => {
          cursor.classList.remove('hovering');
        });
      });
    }
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
    // setInterval(checkUpdates, 1200); // DISABLED: Auto-reload in dev
  });
})();

/* VOIR PLUS (toggle full description) */
(function() {
  const buttons = document.querySelectorAll('.voir-plus');
  if (!buttons.length) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const wrap = btn.closest('.hero-desc-wrap');
      if (!wrap) return;
      const full = wrap.querySelector('.hero-full-desc');
      if (!full) return;

      const expanded = btn.getAttribute('aria-expanded') === 'true';
      if (expanded) {
        full.hidden = true;
        btn.setAttribute('aria-expanded', 'false');
        btn.textContent = 'voir plus';
      } else {
        full.hidden = false;
        btn.setAttribute('aria-expanded', 'true');
        btn.textContent = 'voir moins';
        try { full.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch(e) {}
      }
    });
  });
})();