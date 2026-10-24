'use client';

/**
 * PhotoBooth: the camera strip booth, solo or in a room.
 *
 * Both phones count down together in a room: "Start together"
 * broadcasts a start time on `dd-booth-<CODE>` and every phone runs
 * the same schedule, but each phone shoots its own camera — so both
 * of you are sharp in every frame. Solo mode just counts down locally.
 *
 * Strips are composited on a canvas and handed back as an image:
 * download, or share where the device supports it. Nothing is ever
 * uploaded anywhere.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Download, Share2 } from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import {
  BOOTH_STYLES,
  COUNTDOWN_SECONDS,
  STORY_HEIGHT,
  STORY_WIDTH,
  STRIP_SHOTS,
  boothStyleById,
  canShareFiles,
  stripLayout,
} from '@/lib/booth';

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLVideoElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const iw = 'videoWidth' in img ? img.videoWidth || img.width : img.width;
  const ih = 'videoHeight' in img ? img.videoHeight || img.height : img.height;
  if (!iw || !ih) return;
  const scale = Math.max(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

export default function PhotoBooth({ roomCode }: { roomCode?: string }) {
  const [styleId, setStyleId] = useState(BOOTH_STYLES[0]!.id);
  const [caption, setCaption] = useState('');
  const [phase, setPhase] = useState<'idle' | 'countdown' | 'done'>('idle');
  const [count, setCount] = useState(COUNTDOWN_SECONDS);
  const [shot, setShot] = useState(0);
  const [stripUrl, setStripUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const shotsRef = useRef<HTMLCanvasElement[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const boothChannelRef = useRef<ReturnType<
    NonNullable<ReturnType<typeof getSupabase>>['channel']
  > | null>(null);
  const runScheduleRef = useRef<(at: number) => void>(() => {});

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  // Camera on mount.
  useEffect(() => {
    let alive = true;
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: false })
      .then((stream) => {
        if (!alive) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setCameraOn(true);
      })
      .catch(() => {
        if (alive) setError('No camera here — allow camera access to use the booth.');
      });
    return () => {
      alive = false;
      clearTimers();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [clearTimers]);

  // Room countdown sync: a shared start time, each phone shoots locally.
  useEffect(() => {
    if (!roomCode) return;
    const sb = getSupabase();
    if (!sb) return;
    const ch = sb.channel(`dd-booth-${roomCode.toUpperCase()}`, {
      config: { broadcast: { self: false } },
    });
    boothChannelRef.current = ch;
    ch.on('broadcast', { event: 'booth-start' }, ({ payload }) => {
      const at = (payload as { at?: number } | undefined)?.at;
      if (typeof at === 'number') runScheduleRef.current(at);
    });
    ch.subscribe();
    return () => {
      void sb.removeChannel(ch);
      boothChannelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  const captureShot = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = 720;
    canvas.height = 960;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawCover(ctx, video, 0, 0, 720, 960);
    shotsRef.current.push(canvas);
  }, []);

  const composite = useCallback(() => {
    const style = boothStyleById(styleId);
    const canvas = document.createElement('canvas');
    canvas.width = STORY_WIDTH;
    canvas.height = STORY_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = style.frame;
    ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
    const { slots, caption: cap } = stripLayout(STORY_WIDTH, STORY_HEIGHT, STRIP_SHOTS);
    shotsRef.current.forEach((shotCanvas, i) => {
      const slot = slots[i];
      if (!slot) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(slot.x, slot.y, slot.w, slot.h);
      ctx.clip();
      ctx.drawImage(shotCanvas, slot.x, slot.y, slot.w, slot.h);
      ctx.restore();
      ctx.strokeStyle = style.caption;
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 3;
      ctx.strokeRect(slot.x, slot.y, slot.w, slot.h);
      ctx.globalAlpha = 1;
    });
    if (style.id === '35mm') {
      // Little sprocket holes along both edges, like a film roll.
      ctx.fillStyle = style.caption;
      for (let y = 48; y < STORY_HEIGHT - 48; y += 96) {
        ctx.fillRect(12, y, 24, 48);
        ctx.fillRect(STORY_WIDTH - 36, y, 24, 48);
      }
    }
    const text = (caption.trim() || 'Detective Duo').slice(0, 40);
    ctx.fillStyle = style.caption;
    ctx.font = '600 64px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cap.x + cap.w / 2, cap.y + cap.h / 2, cap.w);
    setStripUrl(canvas.toDataURL('image/png'));
    setPhase('done');
  }, [caption, styleId]);

  const runSchedule = useCallback(
    (startAt: number) => {
      clearTimers();
      shotsRef.current = [];
      setStripUrl(null);
      setPhase('countdown');
      const shotGapMs = 1500;
      const firstShotAt = startAt + COUNTDOWN_SECONDS * 1000;
      // Countdown display ticks.
      for (let s = COUNTDOWN_SECONDS; s >= 1; s--) {
        const at = startAt + (COUNTDOWN_SECONDS - s) * 1000;
        timersRef.current.push(
          setTimeout(() => setCount(s), Math.max(0, at - Date.now())),
        );
      }
      for (let i = 0; i < STRIP_SHOTS; i++) {
        timersRef.current.push(
          setTimeout(
            () => {
              captureShot();
              setShot(i + 1);
              if (i === STRIP_SHOTS - 1) {
                timersRef.current.push(setTimeout(composite, 300));
              }
            },
            Math.max(0, firstShotAt + i * shotGapMs - Date.now()),
          ),
        );
      }
    },
    [captureShot, clearTimers, composite],
  );

  const startTogether = useCallback(() => {
    const at = Date.now() + 500;
    boothChannelRef.current?.send({
      type: 'broadcast',
      event: 'booth-start',
      payload: { at },
    });
    runSchedule(at);
  }, [runSchedule]);

  // The room sync handler always uses the latest schedule (style/caption).
  useEffect(() => {
    runScheduleRef.current = runSchedule;
  }, [runSchedule]);

  const startSolo = useCallback(() => {
    runSchedule(Date.now() + 500);
  }, [runSchedule]);

  const share = useCallback(async () => {
    if (!stripUrl) return;
    try {
      const res = await fetch(stripUrl);
      const blob = await res.blob();
      const file = new File([blob], 'detective-duo-strip.png', { type: 'image/png' });
      if (canShareFiles() && navigator.share) {
        await navigator.share({ files: [file], title: 'Detective Duo strip' });
        return;
      }
    } catch {
      // Sharing failed or was dismissed — download still works.
    }
    const a = document.createElement('a');
    a.href = stripUrl;
    a.download = 'detective-duo-strip.png';
    a.click();
  }, [stripUrl]);

  return (
    <section className="panel p-4">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold">
        <Camera size={18} aria-hidden /> Photo booth
      </h2>
      <p className="mt-1 text-sm text-[var(--ink-dim)]">
        Three shots, one strip, sized for stories. Nothing leaves this device —
        the strip is made right here.
      </p>
      {error && <p className="mt-2 text-sm">{error}</p>}
      <div className="mt-3">
        {stripUrl && phase === 'done' ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={stripUrl} alt="Your photo strip" className="mx-auto w-full max-w-xs rounded-xl" />
        ) : (
          <div className="relative overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="aspect-[3/4] w-full object-cover"
              aria-label="Booth camera preview"
            />
            {phase === 'countdown' && (
              <span className="absolute inset-0 flex items-center justify-center text-7xl font-bold text-white drop-shadow">
                {count}
              </span>
            )}
            {phase === 'countdown' && shot > 0 && (
              <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">
                Shot {shot} of {STRIP_SHOTS}
              </span>
            )}
          </div>
        )}
      </div>
      <label className="mt-3 flex flex-col gap-1 text-sm font-semibold">
        Strip style
        <select
          className="input"
          value={styleId}
          onChange={(e) => setStyleId(e.target.value)}
          aria-label="Strip style"
        >
          {BOOTH_STYLES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} — {s.note}
            </option>
          ))}
        </select>
      </label>
      <label className="mt-3 flex flex-col gap-1 text-sm font-semibold">
        Caption on the strip
        <input
          className="input"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Detective Duo"
          maxLength={40}
          aria-label="Caption on the strip"
        />
      </label>
      <div className="mt-3 flex flex-wrap gap-2">
        {phase !== 'countdown' && (
          <>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!cameraOn}
              onClick={roomCode ? startTogether : startSolo}
            >
              <Camera size={18} aria-hidden />
              {roomCode ? 'Start together' : 'Take 3 shots'}
            </button>
            {phase === 'done' && (
              <button type="button" className="btn" onClick={() => setPhase('idle')}>
                Take another
              </button>
            )}
          </>
        )}
        {phase === 'done' && stripUrl && (
          <>
            <a className="btn" href={stripUrl} download="detective-duo-strip.png">
              <Download size={18} aria-hidden /> Download
            </a>
            <button type="button" className="btn" onClick={() => void share()}>
              <Share2 size={18} aria-hidden /> Share
            </button>
          </>
        )}
      </div>
    </section>
  );
}
