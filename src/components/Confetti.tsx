import { useEffect, useRef } from 'react';

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  color: string;
  size: number;
  rotation: number; rotationSpeed: number;
  shape: 'rect' | 'circle';
  alpha: number;
}

const COLORS = ['#ff6b9d', '#c44dff', '#4d79ff', '#00d4aa', '#ffd700', '#ff6b35'];

function createParticle(canvas: HTMLCanvasElement): Particle {
  return {
    x: Math.random() * canvas.width,
    y: -Math.random() * 60,
    vx: (Math.random() - 0.5) * 5,
    vy: Math.random() * 2.5 + 1,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: Math.random() * 8 + 4,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.15,
    shape: Math.random() > 0.5 ? 'rect' : 'circle',
    alpha: 1,
  };
}

export default function Confetti({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef({
    particles: [] as Particle[],
    animId: 0,
    active: false,
    spawnCount: 0,
  });

  useEffect(() => {
    const s = stateRef.current;
    s.active = active;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    // Mobile: cap at 40 particles max. Desktop: 80.
    const isMobile = window.innerWidth < 640;
    const MAX = isMobile ? 40 : 80;
    // Total to spawn over the burst duration
    const TOTAL_SPAWN = isMobile ? 50 : 100;

    if (active) {
      s.particles = [];
      s.spawnCount = 0;
      // Seed initial burst
      const seed = Math.min(20, MAX);
      for (let i = 0; i < seed; i++) s.particles.push(createParticle(canvas));
      s.spawnCount = seed;
    }

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize, { passive: true });

    const animate = () => {
      // Stop loop entirely if nothing to draw
      if (!s.active && s.particles.length === 0) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
      }

      // Spawn a few more each frame during active burst, up to total cap
      if (s.active && s.spawnCount < TOTAL_SPAWN && s.particles.length < MAX && Math.random() < 0.4) {
        s.particles.push(createParticle(canvas));
        s.spawnCount++;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      s.particles = s.particles.filter(p => p.alpha > 0.02);

      for (const p of s.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.07; // gravity
        p.vx *= 0.99;
        p.rotation += p.rotationSpeed;
        if (p.y > canvas.height * 0.75) p.alpha -= 0.025;

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      s.animId = requestAnimationFrame(animate);
    };

    cancelAnimationFrame(s.animId);
    s.animId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(s.animId);
    };
  }, [active]);

  // Don't mount the canvas at all when inactive and no particles
  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100vw', height: '100vh',
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    />
  );
}
