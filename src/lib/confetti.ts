/** Small canvas confetti burst. Skipped entirely when the user prefers reduced motion. */
export function confetti() {
  if (typeof window === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:999';
  const w = (canvas.width = window.innerWidth);
  const h = (canvas.height = window.innerHeight);
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  if (!ctx) { canvas.remove(); return; }
  const colors = ['#2F6BFF', '#7C3AED', '#16A34A', '#F97316', '#FACC15', '#EC4899'];
  const parts = Array.from({ length: 120 }, () => ({
    x: w / 2 + (Math.random() - 0.5) * 120,
    y: h * 0.35,
    vx: (Math.random() - 0.5) * 14,
    vy: -Math.random() * 13 - 3,
    r: Math.random() * 6 + 4,
    c: colors[Math.floor(Math.random() * colors.length)],
    a: Math.random() * Math.PI,
    va: (Math.random() - 0.5) * 0.4,
  }));
  const t0 = performance.now();
  const frame = (t: number) => {
    const age = t - t0;
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.a += p.va;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.a);
      ctx.globalAlpha = Math.max(0, 1 - age / 2200);
      ctx.fillStyle = p.c;
      ctx.fillRect(-p.r / 2, -p.r / 3, p.r, p.r * 0.6);
      ctx.restore();
    }
    if (age < 2200) requestAnimationFrame(frame);
    else canvas.remove();
  };
  requestAnimationFrame(frame);
}
