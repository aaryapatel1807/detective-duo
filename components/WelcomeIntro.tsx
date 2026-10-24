'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  GREETING_NAME,
  WELCOME_PORTRAIT,
  greetingProgressAt,
  markWelcomeSeen,
} from '@/lib/welcome';
import styles from './WelcomeIntro.module.css';

interface Petal {
  x: number;
  y: number;
  s: number;
  vy: number;
  sway: number;
  ph: number;
  rot: number;
  vr: number;
  a: number;
}

interface Sparkle {
  x: number;
  y: number;
  r: number;
  ph: number;
  sp: number;
}

/**
 * The "hey Sachi" welcome screen, shown once per session on the home
 * page. Handwriting writes itself with a glowing pen dot, then the
 * portrait breathes and sways (code motion — no video) under drifting
 * petals, and "Come in" opens the home screen. Skip jumps straight to
 * the final state; Escape and Enter do the same, and Enter on the
 * final state comes in. Reduced motion shows the final frame at once.
 */
export default function WelcomeIntro({ onDone }: { onDone: () => void }) {
  const [done, setDone] = useState(false);
  const [reduced, setReduced] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const greetingRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const startedRef = useRef(false);
  const doneRef = useRef(false);
  const rafRef = useRef<number>(0);
  const petalOnRef = useRef(false);
  const petalsCleanupRef = useRef<(() => void) | null>(null);

  const finish = useCallback(() => {
    const wrap = wrapRef.current;
    const dot = dotRef.current;
    if (wrap) wrap.style.setProperty('--reveal', '100%');
    if (dot) dot.classList.remove(styles.penDotOn);
    if (skipRef.current) skipRef.current.style.display = 'none';
    window.setTimeout(() => {
      doneRef.current = true;
      setDone(true);
      startPetals();
    }, 450);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function makePetal(w: number, h: number, anywhere: boolean): Petal {
    return {
      x: Math.random() * w,
      y: anywhere ? Math.random() * h : -20 - Math.random() * 40,
      s: 7 + Math.random() * 9,
      vy: 12 + Math.random() * 16,
      sway: 12 + Math.random() * 22,
      ph: Math.random() * Math.PI * 2,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() - 0.5) * 0.6,
      a: 0.45 + Math.random() * 0.35,
    };
  }

  function startPetals() {
    if (petalOnRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    petalOnRef.current = true;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const petals: Petal[] = [];
    const sparkles: Sparkle[] = [];
    for (let i = 0; i < 14; i++) petals.push(makePetal(window.innerWidth, window.innerHeight, true));
    for (let i = 0; i < 12; i++) {
      sparkles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: 1 + Math.random() * 1.8,
        ph: Math.random() * Math.PI * 2,
        sp: 0.6 + Math.random() * 1.2,
      });
    }
    let lastT = performance.now();
    const tick = (now: number) => {
      if (!petalOnRef.current) return;
      const dt = Math.min((now - lastT) / 1000 || 0.016, 0.05);
      lastT = now;
      const t = now / 1000;
      const w = window.innerWidth;
      const h = window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      for (const p of petals) {
        p.y += p.vy * dt;
        p.x += Math.sin(t * 0.7 + p.ph) * p.sway * dt;
        p.rot += p.vr * dt;
        if (p.y > h + 24) {
          const np = makePetal(w, h, false);
          p.x = np.x;
          p.y = np.y;
          p.s = np.s;
          p.vy = np.vy;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.a;
        ctx.fillStyle = '#ffb7c5';
        ctx.beginPath();
        ctx.ellipse(0, 0, p.s, p.s * 0.55, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      for (const s of sparkles) {
        ctx.globalAlpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * s.sp + s.ph));
        ctx.fillStyle = '#ffd98a';
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    const onResize = () => resize();
    window.addEventListener('resize', onResize);
    petalsCleanupRef.current = () => window.removeEventListener('resize', onResize);
  }

  const startWriting = useCallback(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const dot = dotRef.current;
    if (dot) dot.classList.add(styles.penDotOn);
    const frame = (now: number, start: number) => {
      const p = greetingProgressAt(now - start);
      const wrap = wrapRef.current;
      const greeting = greetingRef.current;
      if (wrap) wrap.style.setProperty('--reveal', `${(p * 100).toFixed(2)}%`);
      if (greeting && dot) {
        const r = greeting.getBoundingClientRect();
        const x = r.left + p * r.width;
        const y = r.top + r.height * 0.78 + Math.sin(p * Math.PI * 7) * 4 - p * r.height * 0.04;
        dot.style.left = `${x}px`;
        dot.style.top = `${y}px`;
      }
      if (p < 1) {
        rafRef.current = requestAnimationFrame((n) => frame(n, start));
      } else {
        finish();
      }
    };
    rafRef.current = requestAnimationFrame((n) => frame(n, n));
  }, [finish]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) {
      setReduced(true);
      setDone(true);
      doneRef.current = true;
      if (skipRef.current) skipRef.current.style.display = 'none';
      return;
    }
    if (document.fonts?.ready) {
      void document.fonts.ready.then(() => startWriting());
      window.setTimeout(startWriting, 1500);
    } else {
      startWriting();
    }
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
      petalOnRef.current = false;
      cancelAnimationFrame(rafRef.current);
      petalsCleanupRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (!doneRef.current) {
          startedRef.current = true;
          finish();
        }
      } else if (e.key === 'Enter') {
        if (doneRef.current) comeIn();
        else {
          startedRef.current = true;
          finish();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function comeIn() {
    try {
      markWelcomeSeen(sessionStorage);
    } catch {
      /* ignore */
    }
    onDone();
  }

  function skip() {
    startedRef.current = true;
    finish();
  }

  const stageClass = `${styles.stage}${done ? ` ${styles.stageDone}` : ''}`;

  return (
    <>
      <div className={stageClass}>
        <div className={styles.greetingWrap} ref={wrapRef} aria-label={`Hey ${GREETING_NAME}`}>
          <div className={styles.greeting} ref={greetingRef}>
            hey {GREETING_NAME}
          </div>
        </div>
        <div className={styles.stack}>
          <div className={styles.portrait}>
            <div className={styles.sway}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.portraitImg}
                src={WELCOME_PORTRAIT}
                alt={`Portrait of ${GREETING_NAME}`}
                width={433}
                height={577}
              />
            </div>
          </div>
          <div className={styles.line}>your desk is ready.</div>
          <button type="button" className={`btn btn-primary ${styles.comeIn}`} onClick={comeIn}>
            Come in
          </button>
        </div>
      </div>
      <canvas className={styles.petals} ref={canvasRef} aria-hidden />
      {!reduced && !done && (
        <button type="button" className={styles.skip} ref={skipRef} onClick={skip}>
          Skip
        </button>
      )}
      <div className={styles.penDot} ref={dotRef} aria-hidden />
    </>
  );
}
