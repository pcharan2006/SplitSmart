// One global listener: any element with the "spotlight" class gets a soft glow that follows the pointer.
export function initSpotlight() {
  document.addEventListener(
    'pointermove',
    (e) => {
      const el = e.target instanceof Element ? e.target.closest('.spotlight') : null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${e.clientX - r.left}px`);
      el.style.setProperty('--my', `${e.clientY - r.top}px`);
    },
    { passive: true },
  );
}
