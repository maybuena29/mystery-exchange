/**
 * Lightweight, high-performance canvas confetti particle engine.
 * Self-contained without external libraries.
 */

interface Particle {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  vx: number;
  vy: number;
  rotation: number;
  rotSpeed: number;
  opacity: number;
  wobble: number;
  wobbleSpeed: number;
}

const FESTIVE_COLORS = [
  '#244B36', // Pine green
  '#A63838', // Crimson berry
  '#C5A869', // Champagne gold
  '#1E3F2E', // Holly evergreen
  '#782E3E', // Spiced plum
  '#E6CA85', // Warm light gold
  '#874B4B', // Holiday wine
  '#315B46', // British racing green
];

export function triggerConfetti(durationMs = 4000): () => void {
  if (typeof window === 'undefined') return () => {};

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '99999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return () => {};
  }

  let width = (canvas.width = window.innerWidth * window.devicePixelRatio);
  let height = (canvas.height = window.innerHeight * window.devicePixelRatio);

  const handleResize = () => {
    width = canvas.width = window.innerWidth * window.devicePixelRatio;
    height = canvas.height = window.innerHeight * window.devicePixelRatio;
  };
  window.addEventListener('resize', handleResize);

  const count = Math.min(180, Math.floor(window.innerWidth / 6));
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    // Launch from bottom corners or mid-screen upwards
    const fromLeft = i % 2 === 0;
    const startX = fromLeft
      ? (Math.random() * 0.3) * width
      : (0.7 + Math.random() * 0.3) * width;
    const startY = height * 0.6 + Math.random() * (height * 0.3);

    const angle = fromLeft
      ? -Math.PI / 2 + (Math.random() * 0.6 - 0.1)
      : -Math.PI / 2 - (Math.random() * 0.6 - 0.1);
    const speed = 14 + Math.random() * 22;

    particles.push({
      x: startX,
      y: startY,
      w: (8 + Math.random() * 8) * window.devicePixelRatio,
      h: (5 + Math.random() * 6) * window.devicePixelRatio,
      color: FESTIVE_COLORS[Math.floor(Math.random() * FESTIVE_COLORS.length)],
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12,
      opacity: 1,
      wobble: Math.random() * 10,
      wobbleSpeed: 0.1 + Math.random() * 0.1,
    });
  }

  let animId = 0;
  const startTime = Date.now();
  let cancelled = false;

  const render = () => {
    if (cancelled) return;
    const elapsed = Date.now() - startTime;
    ctx.clearRect(0, 0, width, height);

    let active = 0;
    const gravity = 0.45;
    const drag = 0.985;

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.vx *= drag;
      p.vy += gravity;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotSpeed;
      p.wobble += p.wobbleSpeed;

      if (elapsed > durationMs - 1200) {
        p.opacity = Math.max(0, (durationMs - elapsed) / 1200);
      }

      if (p.opacity > 0 && p.y < height + 50) {
        active++;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.scale(Math.sin(p.wobble), 1);
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
    }

    if (active > 0 && elapsed < durationMs) {
      animId = requestAnimationFrame(render);
    } else {
      cleanup();
    }
  };

  const cleanup = () => {
    cancelled = true;
    cancelAnimationFrame(animId);
    window.removeEventListener('resize', handleResize);
    if (canvas.parentNode) {
      canvas.remove();
    }
  };

  animId = requestAnimationFrame(render);
  return cleanup;
}
