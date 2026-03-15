/* CURSOR */
const cursor = document.getElementById('cursor');
document.addEventListener('mousemove', e => {
  cursor.style.left = e.clientX + 'px';
  cursor.style.top  = e.clientY + 'px';
});
document.querySelectorAll('a, button').forEach(el => {
  el.addEventListener('mouseenter', () => cursor.classList.add('hovering'));
  el.addEventListener('mouseleave', () => cursor.classList.remove('hovering'));
});

/* FLOATING PREVIEW */
const preview = document.getElementById('projectPreview');
let animFrame, px = 0, py = 0, tx = 0, ty = 0;

function lerp() {
  px += (tx - px) * 0.1;
  py += (ty - py) * 0.1;
  preview.style.left = px + 'px';
  preview.style.top  = py + 'px';
  animFrame = requestAnimationFrame(lerp);
}

document.querySelectorAll('.project-row').forEach(row => {
  const bg = row.dataset.bg;
  if (bg) row.style.setProperty('--project-bg', `url("${bg}")`);

  row.addEventListener('mouseenter', e => {
    tx = e.clientX; ty = e.clientY; px = tx; py = ty;
    preview.classList.add('visible');
    cancelAnimationFrame(animFrame); lerp();
    const src = row.dataset.preview;
    const inner = document.getElementById('previewInner');
    if (src) {
      inner.outerHTML = `<img id="previewInner" src="${src}" alt="aperçu" />`;
    } else {
      inner.textContent = row.querySelector('.project-name').textContent.trim();
    }
  });
  row.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; });
  row.addEventListener('mouseleave', () => {
    preview.classList.remove('visible');
    cancelAnimationFrame(animFrame);
  });
});

/* REVEAL */
const obs = new IntersectionObserver(entries => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) setTimeout(() => e.target.classList.add('visible'), i * 100);
  });
}, { threshold: 0.08 });
document.querySelectorAll('.reveal').forEach(el => obs.observe(el));