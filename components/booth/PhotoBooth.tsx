'use client';

/**
 * PhotoBooth: the camera strip booth, solo or in a room — rebuilt in
 * six phases (see lib/booth.ts for the pure parts):
 *
 * 1. Real capture: a pose card, then a 3-2-1 countdown, before EVERY
 *    shot — never a rapid-fire burst. Flash + tick sounds, cancel
 *    mid-run, retake a single shot, review before the strip builds.
 * 2. Quality: mirrored selfie preview, front/back flip, full-res
 *    shots, upload into slots, 3 or 4 shots, retry on camera errors,
 *    and a strip never composites with a blank gap.
 * 3. Looks: 10 filters (live + changeable after capture), 9 frame
 *    styles, strip / 2×2 grid / polaroid layouts, date stamp.
 * 4. Meme Booth: pose packs — classic ideas or meme poses to copy.
 * 5. Studio: stickers, text, doodle, shuffle, scrapbook export.
 * 6. Together: room strips shared over broadcast, duo turns on one
 *    phone. Strips are composited on canvas and handed back as an
 *    image; nothing is uploaded anywhere except the room broadcast
 *    of compressed shots between the two phones in a room.
 *
 * UI notes (Oct 2026): filters live in a visible rail — left of the
 * camera on desktop, a scroll strip on phones — so one tap changes
 * the look before (or during) a run, no dropdown to open. Meme poses
 * with a real pose photo show it in a "copy this!" card, RollBooth
 * style; poses without a photo yet fall back to their emoji. The
 * camera is a real (unmirrored) image by default; Mirror preview is
 * an opt-in toggle, saved on the device.
 * Desktop fit: on lg screens the booth is a two-column grid — the
 * camera sized by viewport height (68vh, 3:4) on the left, controls
 * in a 320px column on the right — so the whole booth fits one
 * screen instead of a huge camera column with empty sides.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Camera, Download, FlipHorizontal2, RefreshCw, Share2, Shuffle, Volume2, VolumeX,
} from 'lucide-react';
import { getSupabase } from '@/lib/supabase/client';
import {
  BOOTH_FILTERS,
  BOOTH_LAYOUTS,
  BOOTH_STYLES,
  COUNTDOWN_SECONDS,
  SHOT_COUNT_OPTIONS,
  STICKER_PACKS,
  STORY_HEIGHT,
  STORY_WIDTH,
  TEXT_STYLES,
  boothFilterById,
  boothStyleById,
  canComposite,
  canShareFiles,
  duoTurnNames,
  layoutSlots,
  pickPoses,
  posePackById,
  scrapbookPageSize,
  shotTimeline,
  stripDateLine,
  textStyleById,
  type BoothLayout,
  type PoseIdea,
  type StripOverlay,
} from '@/lib/booth';

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
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

function drawHeart(ctx: CanvasRenderingContext2D, x: number, y: number, s: number) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.3);
  ctx.bezierCurveTo(x, y, x - s * 0.5, y - s * 0.1, x - s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x - s * 0.5, y + s * 0.7, x, y + s * 0.9, x, y + s * 1.1);
  ctx.bezierCurveTo(x, y + s * 0.9, x + s * 0.5, y + s * 0.7, x + s * 0.5, y + s * 0.3);
  ctx.bezierCurveTo(x + s * 0.5, y - s * 0.1, x, y, x, y + s * 0.3);
  ctx.fill();
}

function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const px = x + Math.cos(a) * rad;
    const py = y + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

type Phase = 'idle' | 'countdown' | 'review' | 'done';

/**
 * One-tap filter rail: every filter visible at once, no dropdown to
 * open. Each swatch wears its own filter, and the camera preview (and
 * the finished strip) updates the moment you tap. Side layout sits
 * left of the camera on desktop; row layout scrolls horizontally.
 */
function FilterRail({
  selected,
  onSelect,
  layout,
}: {
  selected: string;
  onSelect: (id: string) => void;
  layout: 'side' | 'row';
}) {
  return (
    <div
      role="group"
      aria-label="Photo filters"
      className={
        layout === 'side'
          ? 'no-scrollbar flex gap-2.5 overflow-x-auto sm:max-h-[min(68vh,820px)] sm:w-40 sm:shrink-0 sm:flex-col sm:overflow-y-auto sm:overflow-x-hidden sm:pr-2'
          : 'no-scrollbar flex gap-2.5 overflow-x-auto pb-1'
      }
    >
      {BOOTH_FILTERS.map((f) => {
        const active = f.id === selected;
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onSelect(f.id)}
            aria-pressed={active}
            title={f.name}
            className={`btn !justify-start whitespace-nowrap !px-2 !py-1.5 text-xs ${active ? 'btn-primary' : ''} ${
              layout === 'side' ? 'sm:w-full' : ''
            }`}
          >
            <span
              aria-hidden
              className="block h-9 w-9 shrink-0 rounded-lg"
              style={{
                background: 'linear-gradient(135deg,#ff4da6,#ffd98a 50%,#46a758)',
                filter: f.css || undefined,
              }}
            />
            <span className="truncate">{f.name}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Pose card: a real pose photo when the pose has one, else its emoji. */
function PoseCard({
  pose,
  shot,
  total,
  shooter,
  heading,
}: {
  pose: PoseIdea;
  shot: number;
  total: number;
  shooter: string | null;
  heading: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      {pose.image ? (
        <div className="w-44 overflow-hidden rounded-xl border-2 border-white/80 shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={pose.image} alt={`${pose.title} pose`} className="aspect-[4/3] w-full object-cover" />
          <p className="bg-black/70 px-2 py-1 text-center text-xs font-bold">
            Pose {shot + 1} of {total}: copy this!
          </p>
        </div>
      ) : (
        <span className="text-6xl" aria-hidden>
          {pose.emoji}
        </span>
      )}
      <p className="text-xl font-bold">{heading}</p>
      <p className="text-lg font-semibold">{pose.title}</p>
      <p className="text-sm opacity-90">{pose.hint}</p>
      {shooter && <p className="text-sm font-semibold">{shooter}&rsquo;s turn</p>}
      <p className="text-xs opacity-80">
        Shot {shot + 1} of {total}
      </p>
    </div>
  );
}

export default function PhotoBooth({ roomCode }: { roomCode?: string }) {
  const [styleId, setStyleId] = useState(BOOTH_STYLES[0]!.id);
  const [filterId, setFilterId] = useState('original');
  const [layoutId, setLayoutId] = useState<BoothLayout>('strip');
  const [shotCount, setShotCount] = useState(3);
  const [caption, setCaption] = useState('');
  const [dateStamp, setDateStamp] = useState(false);
  const [posePackId, setPosePackId] = useState('classic');
  const [showPoses, setShowPoses] = useState(true);
  const [manual, setManual] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [mirror, setMirror] = useState(false);
  const [duoTurns, setDuoTurns] = useState(false);
  const [playerA, setPlayerA] = useState('You');
  const [playerB, setPlayerB] = useState('Partner');
  const [phase, setPhase] = useState<Phase>('idle');
  const [count, setCount] = useState(0);
  const [shot, setShot] = useState(0);
  const [currentPose, setCurrentPose] = useState<PoseIdea | null>(null);
  const [shooter, setShooter] = useState<string | null>(null);
  const [awaitingReady, setAwaitingReady] = useState(false);
  const [retakeSlot, setRetakeSlot] = useState<number | null>(null);
  const [flash, setFlash] = useState(false);
  const [stripUrl, setStripUrl] = useState<string | null>(null);
  const [togetherUrl, setTogetherUrl] = useState<string | null>(null);
  const [shotUrls, setShotUrls] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [deviceIdx, setDeviceIdx] = useState(0);
  const [overlays, setOverlays] = useState<StripOverlay[]>([]);
  const [selectedOverlay, setSelectedOverlay] = useState<string | null>(null);
  const [pendingSticker, setPendingSticker] = useState<string | null>(null);
  const [pendingText, setPendingText] = useState<{ text: string; styleId: string; color: string } | null>(null);
  const [textInput, setTextInput] = useState('');
  const [textStyleId, setTextStyleId] = useState('marker');
  const [textColor, setTextColor] = useState('#ffffff');
  const [doodleMode, setDoodleMode] = useState(false);
  const [doodleColor, setDoodleColor] = useState('#ff4da6');
  const [partnerShots, setPartnerShots] = useState<string[]>([]);
  const [poses, setPoses] = useState<PoseIdea[]>([]);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const shotsRef = useRef<HTMLCanvasElement[]>([]);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const boothChannelRef = useRef<ReturnType<
    NonNullable<ReturnType<typeof getSupabase>>['channel']
  > | null>(null);
  const runScheduleRef = useRef<(at: number) => void>(() => {});
  const audioRef = useRef<AudioContext | null>(null);
  const studioCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const doodleCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{ id: string; dx: number; dy: number } | null>(null);
  const drawingRef = useRef(false);
  const manualShotRef = useRef(0);

  const filterCss = boothFilterById(filterId).css;

  useEffect(() => {
    try {
      if (localStorage.getItem('sachi-booth-mirror') === '1') setMirror(true);
    } catch {
      /* private mode: mirror just defaults off */
    }
  }, []);

  const toggleMirror = useCallback((v: boolean) => {
    setMirror(v);
    try {
      localStorage.setItem('sachi-booth-mirror', v ? '1' : '0');
    } catch {
      /* ignore */
    }
  }, []);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const beep = useCallback(
    (high: boolean) => {
      if (!soundOn) return;
      try {
        const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        audioRef.current ??= new AC();
        const ctx = audioRef.current;
        if (ctx.state === 'suspended') void ctx.resume();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = high ? 1320 : 880;
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (high ? 0.18 : 0.09));
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + (high ? 0.18 : 0.09));
      } catch {
        /* audio is a nice-to-have */
      }
    },
    [soundOn],
  );

  // ------------------------------------------------------------ camera ----
  const startCamera = useCallback(async (deviceId?: string) => {
    try {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: deviceId ? { deviceId: { exact: deviceId } } : true,
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraOn(true);
      setError(null);
      const all = await navigator.mediaDevices.enumerateDevices();
      setDevices(all.filter((d) => d.kind === 'videoinput'));
    } catch {
      setCameraOn(false);
      setError('No camera here — allow camera access to use the booth.');
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void startCamera().then(() => {
      if (!alive) {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    });
    return () => {
      alive = false;
      clearTimers();
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [clearTimers, startCamera]);

  const flipCamera = useCallback(() => {
    if (devices.length < 2) return;
    const next = (deviceIdx + 1) % devices.length;
    setDeviceIdx(next);
    void startCamera(devices[next]!.deviceId);
  }, [devices, deviceIdx, startCamera]);

  // Room countdown sync + shared shots.
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
    ch.on('broadcast', { event: 'booth-shots' }, ({ payload }) => {
      const shots = (payload as { shots?: unknown } | undefined)?.shots;
      if (Array.isArray(shots) && shots.every((s) => typeof s === 'string' && s.startsWith('data:image'))) {
        setPartnerShots(shots.slice(0, 8));
      }
    });
    ch.subscribe();
    return () => {
      void sb.removeChannel(ch);
      boothChannelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomCode]);

  // ------------------------------------------------------------ capture ----
  const refreshShotUrls = useCallback(() => {
    setShotUrls(shotsRef.current.map((c) => c.toDataURL('image/jpeg', 0.8)));
  }, []);

  const captureShot = useCallback(
    (slot?: number): boolean => {
      const video = videoRef.current;
      if (!video || !video.videoWidth) return false;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const scale = vw > 1920 ? 1920 / vw : 1;
      const w = Math.round(vw * scale);
      const h = Math.round(vh * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      // Mirror only when asked: by default the capture is the real
      // image, as others see you — and it always matches the preview.
      if (mirror) {
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
      }
      drawCover(ctx, video, 0, 0, w, h);
      if (slot !== undefined) shotsRef.current[slot] = canvas;
      else shotsRef.current.push(canvas);
      refreshShotUrls();
      return true;
    },
    [mirror, refreshShotUrls],
  );

  const abortRun = useCallback(
    (message: string) => {
      clearTimers();
      setPhase('idle');
      setCount(0);
      setCurrentPose(null);
      setAwaitingReady(false);
      setRetakeSlot(null);
      setError(message);
    },
    [clearTimers],
  );

  const runTicksForShot = useCallback(
    (shotIdx: number, after: () => void, replaceSlot?: number) => {
      // Straight 3-2-1 then capture (manual shots and retakes).
      for (let s = COUNTDOWN_SECONDS; s >= 1; s--) {
        timersRef.current.push(
          setTimeout(
            () => {
              setCount(s);
              beep(false);
            },
            (COUNTDOWN_SECONDS - s) * 1000,
          ),
        );
      }
      timersRef.current.push(
        setTimeout(
          () => {
            const ok = captureShot(replaceSlot);
            setFlash(true);
            beep(true);
            timersRef.current.push(setTimeout(() => setFlash(false), 150));
            if (!ok) {
              abortRun("That shot didn't capture — check the camera and try again.");
              return;
            }
            setShot(shotIdx + 1);
            after();
          },
          COUNTDOWN_SECONDS * 1000,
        ),
      );
    },
    [abortRun, beep, captureShot],
  );

  const runSchedule = useCallback(
    (startAt: number) => {
      clearTimers();
      shotsRef.current = [];
      setShotUrls([]);
      setStripUrl(null);
      setTogetherUrl(null);
      setOverlays([]);
      setError(null);
      setPhase('countdown');
      const pack = posePackById(posePackId);
      const runPoses = showPoses ? pickPoses(pack.poses, shotCount) : [];
      setPoses(runPoses);
      const shooters = duoTurns && !roomCode ? duoTurnNames(shotCount, playerA || 'You', playerB || 'Partner') : [];
      const events = shotTimeline(shotCount);
      for (const ev of events) {
        const delay = Math.max(0, startAt + ev.at - Date.now());
        if (ev.type === 'pose') {
          timersRef.current.push(
            setTimeout(() => {
              setCurrentPose(runPoses[ev.shot] ?? null);
              setShooter(shooters[ev.shot] ?? null);
              setCount(0);
              setShot(ev.shot);
            }, delay),
          );
        } else if (ev.type === 'tick') {
          timersRef.current.push(
            setTimeout(() => {
              setCount(ev.count);
              beep(false);
            }, delay),
          );
        } else if (ev.type === 'capture') {
          timersRef.current.push(
            setTimeout(() => {
              const ok = captureShot();
              setFlash(true);
              beep(true);
              timersRef.current.push(setTimeout(() => setFlash(false), 150));
              if (!ok) {
                abortRun("That shot didn't capture — check the camera and try again.");
                return;
              }
              setShot(ev.shot + 1);
            }, delay),
          );
        } else {
          timersRef.current.push(
            setTimeout(() => {
              setPhase('review');
              setCount(0);
              setCurrentPose(null);
            }, delay),
          );
        }
      }
    },
    [abortRun, beep, captureShot, clearTimers, duoTurns, playerA, playerB, posePackId, roomCode, shotCount, showPoses],
  );

  useEffect(() => {
    runScheduleRef.current = runSchedule;
  }, [runSchedule]);

  const startTogether = useCallback(() => {
    const at = Date.now() + 500;
    boothChannelRef.current?.send({
      type: 'broadcast',
      event: 'booth-start',
      payload: { at },
    });
    runSchedule(at);
  }, [runSchedule]);

  const startSolo = useCallback(() => {
    if (manual) {
      clearTimers();
      shotsRef.current = [];
      setShotUrls([]);
      setStripUrl(null);
      setTogetherUrl(null);
      setOverlays([]);
      setError(null);
      const pack = posePackById(posePackId);
      const runPoses = showPoses ? pickPoses(pack.poses, shotCount) : [];
      setPoses(runPoses);
      manualShotRef.current = 0;
      setShot(0);
      setPhase('countdown');
      setAwaitingReady(true);
      setCurrentPose(runPoses[0] ?? null);
      const shooters = duoTurns ? duoTurnNames(shotCount, playerA || 'You', playerB || 'Partner') : [];
      setShooter(shooters[0] ?? null);
    } else {
      runSchedule(Date.now() + 500);
    }
  }, [clearTimers, duoTurns, manual, playerA, playerB, posePackId, runSchedule, shotCount, showPoses]);

  const manualReady = useCallback(() => {
    const idx = manualShotRef.current;
    setAwaitingReady(false);
    runTicksForShot(idx, () => {
      if (idx + 1 >= shotCount) {
        setPhase('review');
        setCount(0);
        setCurrentPose(null);
      } else {
        manualShotRef.current = idx + 1;
        setShot(idx + 1);
        setCurrentPose(poses[idx + 1] ?? null);
        const shooters = duoTurns ? duoTurnNames(shotCount, playerA || 'You', playerB || 'Partner') : [];
        setShooter(shooters[idx + 1] ?? null);
        setAwaitingReady(true);
        setCount(0);
      }
    });
  }, [duoTurns, playerA, playerB, poses, runTicksForShot, shotCount]);

  const cancelRun = useCallback(() => {
    clearTimers();
    setPhase('idle');
    setCount(0);
    setCurrentPose(null);
    setAwaitingReady(false);
    setRetakeSlot(null);
  }, [clearTimers]);

  const retake = useCallback(
    (slot: number) => {
      setRetakeSlot(slot);
      setPhase('countdown');
      setCount(0);
      setCurrentPose(null);
      runTicksForShot(slot, () => {
        setRetakeSlot(null);
        setPhase('review');
        setCount(0);
      }, slot);
    },
    [runTicksForShot],
  );

  const uploadIntoSlot = useCallback(
    (slot: number, file: File) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const scale = Math.max(img.width, img.height) > 1600 ? 1600 / Math.max(img.width, img.height) : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        shotsRef.current[slot] = canvas;
        refreshShotUrls();
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        setError('Could not read that photo — try another file.');
        URL.revokeObjectURL(url);
      };
      img.src = url;
    },
    [refreshShotUrls],
  );

  // ------------------------------------------------------------ composite ----
  const drawOverlaysOnto = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      for (const o of overlays) {
        const x = o.x * STORY_WIDTH;
        const y = o.y * STORY_HEIGHT;
        if (o.kind === 'sticker') {
          ctx.font = `${o.size}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(o.text, x, y);
        } else {
          const style = textStyleById(o.font ?? 'marker');
          ctx.font = style.font(o.size);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          if (style.box) {
            const w = ctx.measureText(o.text).width + 48;
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.fillRect(x - w / 2, y - o.size * 0.7, w, o.size * 1.4);
            ctx.fillStyle = '#2b2118';
          } else {
            if (style.glow) {
              ctx.shadowColor = o.color ?? '#ffffff';
              ctx.shadowBlur = 28;
            }
            ctx.fillStyle = o.color ?? '#ffffff';
          }
          ctx.fillText(o.text, x, y);
          ctx.shadowBlur = 0;
        }
      }
    },
    [overlays],
  );

  const composite = useCallback(
    (broadcastShots: boolean) => {
      if (!canComposite(shotsRef.current.length, shotCount)) {
        setError('Not every shot is in yet — take or upload the missing ones first.');
        return;
      }
      const style = boothStyleById(styleId);
      const filter = boothFilterById(filterId);
      const canvas = document.createElement('canvas');
      canvas.width = STORY_WIDTH;
      canvas.height = STORY_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = style.frame;
      ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
      const { slots, caption: cap } = layoutSlots(layoutId, STORY_WIDTH, STORY_HEIGHT, shotCount);
      shotsRef.current.slice(0, slots.length).forEach((shotCanvas, i) => {
        const slot = slots[i];
        if (!slot) return;
        ctx.save();
        ctx.beginPath();
        ctx.rect(slot.x, slot.y, slot.w, slot.h);
        ctx.clip();
        ctx.filter = filter.css || 'none';
        drawCover(ctx, shotCanvas, slot.x, slot.y, slot.w, slot.h);
        ctx.filter = 'none';
        ctx.restore();
        ctx.strokeStyle = style.caption;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 3;
        ctx.strokeRect(slot.x, slot.y, slot.w, slot.h);
        ctx.globalAlpha = 1;
        if (style.dividerText && i < slots.length - 1) {
          const next = slots[i + 1]!;
          const gapY = (slot.y + slot.h + next.y) / 2;
          ctx.fillStyle = style.caption;
          ctx.globalAlpha = 0.8;
          ctx.font = '700 22px Arial, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(style.dividerText, STORY_WIDTH / 2, gapY, STORY_WIDTH - 96);
          ctx.globalAlpha = 1;
        }
      });
      if (style.motif) {
        ctx.fillStyle = style.caption;
        ctx.globalAlpha = 0.85;
        for (let x = 96; x < STORY_WIDTH - 48; x += 160) {
          if (style.motif === 'hearts') {
            drawHeart(ctx, x, 14, 28);
            drawHeart(ctx, x + 80, STORY_HEIGHT - 42, 28);
          } else {
            drawStar(ctx, x, 28, 18);
            drawStar(ctx, x + 80, STORY_HEIGHT - 28, 18);
          }
        }
        ctx.globalAlpha = 1;
      }
      if (style.id === '35mm') {
        ctx.fillStyle = style.caption;
        for (let y = 48; y < STORY_HEIGHT - 48; y += 96) {
          ctx.fillRect(12, y, 24, 48);
          ctx.fillRect(STORY_WIDTH - 36, y, 24, 48);
        }
      }
      const text = (caption.trim() || 'Sachi').slice(0, 40);
      ctx.fillStyle = style.caption;
      ctx.font = '600 64px Georgia, serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, cap.x + cap.w / 2, cap.y + cap.h / 2 - (dateStamp ? 30 : 0), cap.w);
      if (dateStamp) {
        ctx.globalAlpha = 0.8;
        ctx.font = '400 32px Georgia, serif';
        ctx.fillText(stripDateLine(), cap.x + cap.w / 2, cap.y + cap.h / 2 + 48, cap.w);
        ctx.globalAlpha = 1;
      }
      drawOverlaysOnto(ctx);
      const doodle = doodleCanvasRef.current;
      if (doodle) {
        // Bake the doodle in, then clear the layer so it can't double up
        // in the preview once the new strip loads.
        ctx.drawImage(doodle, 0, 0, STORY_WIDTH, STORY_HEIGHT);
        const dctx = doodle.getContext('2d');
        if (dctx) dctx.clearRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
      }
      setStripUrl(canvas.toDataURL('image/png'));
      setPhase('done');
      if (broadcastShots && roomCode && boothChannelRef.current) {
        const compressed = shotsRef.current.map((c) => {
          const tmp = document.createElement('canvas');
          const scale = c.width > 720 ? 720 / c.width : 1;
          tmp.width = Math.round(c.width * scale);
          tmp.height = Math.round(c.height * scale);
          const tctx = tmp.getContext('2d');
          if (tctx) tctx.drawImage(c, 0, 0, tmp.width, tmp.height);
          return tmp.toDataURL('image/jpeg', 0.75);
        });
        boothChannelRef.current.send({
          type: 'broadcast',
          event: 'booth-shots',
          payload: { shots: compressed },
        });
      }
    },
    [caption, dateStamp, drawOverlaysOnto, filterId, layoutId, roomCode, shotCount, styleId],
  );

  // Live re-composite when look settings change after the strip exists.
  // Overlays and doodles apply via "Update strip" instead, so dragging
  // doesn't rebuild the big canvas on every move.
  useEffect(() => {
    if (phase === 'done' && canComposite(shotsRef.current.length, shotCount)) {
      composite(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [styleId, filterId, layoutId, dateStamp, caption]);

  const makeTogetherStrip = useCallback(async () => {
    if (partnerShots.length === 0) return;
    const mine = shotsRef.current;
    const theirs: HTMLCanvasElement[] = [];
    for (const url of partnerShots) {
      const img = new Image();
      img.src = url;
      try {
        await img.decode();
      } catch {
        continue;
      }
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.drawImage(img, 0, 0);
      theirs.push(canvas);
    }
    const order: HTMLCanvasElement[] = [];
    const n = Math.max(mine.length, theirs.length);
    for (let i = 0; i < n; i++) {
      if (i < mine.length) order.push(mine[i]!);
      if (i < theirs.length) order.push(theirs[i]!);
    }
    if (order.length === 0) return;
    const style = boothStyleById(styleId);
    const filter = boothFilterById(filterId);
    const canvas = document.createElement('canvas');
    canvas.width = STORY_WIDTH;
    canvas.height = STORY_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = style.frame;
    ctx.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
    const { slots, caption: cap } = layoutSlots('strip', STORY_WIDTH, STORY_HEIGHT, order.length);
    order.slice(0, slots.length).forEach((shotCanvas, i) => {
      const slot = slots[i];
      if (!slot) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(slot.x, slot.y, slot.w, slot.h);
      ctx.clip();
      ctx.filter = filter.css || 'none';
      drawCover(ctx, shotCanvas, slot.x, slot.y, slot.w, slot.h);
      ctx.filter = 'none';
      ctx.restore();
    });
    const text = (caption.trim() || 'Sachi').slice(0, 40);
    ctx.fillStyle = style.caption;
    ctx.font = '600 64px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cap.x + cap.w / 2, cap.y + cap.h / 2, cap.w);
    setTogetherUrl(canvas.toDataURL('image/png'));
  }, [caption, filterId, partnerShots, styleId]);

  // ------------------------------------------------------------ studio ----
  // Redraw the studio preview (strip + overlays) whenever they change.
  useEffect(() => {
    if (phase !== 'done' || !stripUrl) return;
    const canvas = studioCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      for (const o of overlays) {
        const x = o.x * canvas.width;
        const y = o.y * canvas.height;
        const size = (o.size * canvas.width) / STORY_WIDTH;
        if (o.kind === 'sticker') {
          ctx.font = `${size}px "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(o.text, x, y);
        } else {
          const style = textStyleById(o.font ?? 'marker');
          ctx.font = style.font(size);
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          if (style.box) {
            const w = ctx.measureText(o.text).width + 24;
            ctx.fillStyle = 'rgba(255,255,255,0.9)';
            ctx.fillRect(x - w / 2, y - size * 0.7, w, size * 1.4);
            ctx.fillStyle = '#2b2118';
          } else {
            if (style.glow) {
              ctx.shadowColor = o.color ?? '#ffffff';
              ctx.shadowBlur = 12;
            }
            ctx.fillStyle = o.color ?? '#ffffff';
          }
          ctx.fillText(o.text, x, y);
          ctx.shadowBlur = 0;
        }
        if (o.id === selectedOverlay) {
          ctx.strokeStyle = '#ff4da6';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, size * 0.8, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    };
    img.src = stripUrl;
  }, [phase, stripUrl, overlays, selectedOverlay]);

  const studioPoint = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = studioCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width)),
      y: Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height)),
    };
  }, []);

  const onStudioPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (doodleMode) return; // doodle canvas sits on top and takes the event
      const p = studioPoint(e);
      if (!p) return;
      // Hit-test overlays (nearest within a thumb-sized radius wins).
      let best: StripOverlay | null = null;
      let bestD = 0.09;
      for (const o of overlays) {
        const d = Math.hypot(o.x - p.x, (o.y - p.y) * (640 / 360));
        if (d < bestD) {
          bestD = d;
          best = o;
        }
      }
      if (best) {
        setSelectedOverlay(best.id);
        dragRef.current = { id: best.id, dx: best.x - p.x, dy: best.y - p.y };
        (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
        return;
      }
      if (pendingSticker) {
        const id = `ov-${Date.now()}`;
        setOverlays((prev) => [...prev, { id, kind: 'sticker', text: pendingSticker, x: p.x, y: p.y, size: 140 }]);
        setSelectedOverlay(id);
        setPendingSticker(null);
        return;
      }
      if (pendingText) {
        const id = `ov-${Date.now()}`;
        setOverlays((prev) => [
          ...prev,
          { id, kind: 'text', text: pendingText.text, x: p.x, y: p.y, size: 90, color: pendingText.color, font: pendingText.styleId },
        ]);
        setSelectedOverlay(id);
        setPendingText(null);
        return;
      }
      setSelectedOverlay(null);
    },
    [doodleMode, overlays, pendingSticker, pendingText, studioPoint],
  );

  const onStudioPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current;
      const p = studioPoint(e);
      if (!drag || !p) return;
      const x = Math.min(1, Math.max(0, p.x + drag.dx));
      const y = Math.min(1, Math.max(0, p.y + drag.dy));
      setOverlays((prev) => prev.map((o) => (o.id === drag.id ? { ...o, x, y } : o)));
    },
    [studioPoint],
  );

  const onStudioPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  const doodlePoint = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = doodleCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * STORY_WIDTH,
      y: ((e.clientY - rect.top) / rect.height) * STORY_HEIGHT,
    };
  }, []);

  const onDoodleDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = doodleCanvasRef.current;
      const p = doodlePoint(e);
      if (!canvas || !p) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      drawingRef.current = true;
      ctx.strokeStyle = doodleColor;
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    },
    [doodleColor, doodlePoint],
  );

  const onDoodleMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawingRef.current) return;
      const canvas = doodleCanvasRef.current;
      const p = doodlePoint(e);
      if (!canvas || !p) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    },
    [doodlePoint],
  );

  const onDoodleUp = useCallback(() => {
    drawingRef.current = false;
  }, []);

  const clearDoodle = useCallback(() => {
    const canvas = doodleCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }, []);

  const share = useCallback(async () => {
    if (!stripUrl) return;
    try {
      const res = await fetch(stripUrl);
      const blob = await res.blob();
      const file = new File([blob], 'sachi-strip.png', { type: 'image/png' });
      if (canShareFiles() && navigator.share) {
        await navigator.share({ files: [file], title: 'Sachi strip' });
        return;
      }
    } catch {
      // Sharing failed or was dismissed — download still works.
    }
    const a = document.createElement('a');
    a.href = stripUrl;
    a.download = 'sachi-strip.png';
    a.click();
  }, [stripUrl]);

  const shuffleLook = useCallback(() => {
    const styles = BOOTH_STYLES;
    const filters = BOOTH_FILTERS;
    setStyleId(styles[Math.floor(Math.random() * styles.length)]!.id);
    setFilterId(filters[Math.floor(Math.random() * filters.length)]!.id);
  }, []);

  const scrapbook = useCallback(
    (shape: '4:5' | '9:16') => {
      if (!stripUrl) return;
      const { w, h } = scrapbookPageSize(shape);
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = boothStyleById(styleId).frame;
      ctx.fillRect(0, 0, w, h);
      const img = new Image();
      img.onload = () => {
        const margin = 72;
        const maxH = h - margin * 2;
        const maxW = w - margin * 2;
        const scale = Math.min(maxW / img.width, maxH / img.height);
        const dw = img.width * scale;
        const dh = img.height * scale;
        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
        const a = document.createElement('a');
        a.href = canvas.toDataURL('image/png');
        a.download = `sachi-scrapbook-${shape.replace(':', 'x')}.png`;
        a.click();
      };
      img.src = stripUrl;
    },
    [stripUrl, styleId],
  );

  const resetAll = useCallback(() => {
    cancelRun();
    shotsRef.current = [];
    setShotUrls([]);
    setStripUrl(null);
    setTogetherUrl(null);
    setOverlays([]);
    setPartnerShots([]);
    clearDoodle();
  }, [cancelRun, clearDoodle]);

  const showCamera = phase === 'idle' || phase === 'countdown';
  const poseCardPose = currentPose;
  const totalShots = shotCount;

  return (
    <section className="panel p-4 lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-x-5">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold lg:col-span-2">
        <Camera size={18} aria-hidden /> Photo booth
      </h2>
      <p className="mt-1 text-sm text-[var(--ink-dim)] lg:col-span-2">
        Pose, count down, shoot — a timer before every shot, so you always get
        time to change pose. Nothing leaves this device, except the shared strip
        between two phones in a room.
      </p>
      {error && <p className="mt-2 text-sm lg:col-span-2">{error}</p>}
      {!cameraOn && (
        <button type="button" className="btn mt-3 lg:col-span-2" onClick={() => void startCamera()}>
          <RefreshCw size={16} aria-hidden /> Try camera again
        </button>
      )}

      {showCamera && (
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-start lg:col-start-1 lg:mt-0 lg:justify-center">
          <FilterRail selected={filterId} onSelect={setFilterId} layout="side" />
          <div className="relative flex-1 overflow-hidden rounded-xl bg-black lg:h-[min(68vh,820px)] lg:aspect-[3/4] lg:w-auto lg:max-w-full lg:flex-none">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="aspect-[3/4] w-full object-cover lg:aspect-auto lg:h-full"
              style={{ transform: mirror ? 'scaleX(-1)' : undefined, filter: filterCss || undefined }}
              aria-label="Booth camera preview"
            />
            {flash && <div className="absolute inset-0 bg-white" aria-hidden />}
            {phase === 'countdown' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/30 p-4 text-center text-white">
                {awaitingReady && poseCardPose ? (
                  <>
                    <PoseCard pose={poseCardPose} shot={shot} total={totalShots} shooter={shooter} heading="Copy this!" />
                    <button type="button" className="btn btn-primary mt-2" onClick={manualReady}>
                      Ready — take it
                    </button>
                    <button type="button" className="btn mt-1" onClick={cancelRun}>
                      Cancel
                    </button>
                  </>
                ) : poseCardPose && count === 0 ? (
                  <>
                    <PoseCard pose={poseCardPose} shot={shot} total={totalShots} shooter={shooter} heading="Get ready…" />
                    <button type="button" className="btn mt-2" onClick={cancelRun}>
                      Cancel
                    </button>
                  </>
                ) : count > 0 ? (
                  <>
                    <span className="text-7xl font-bold drop-shadow">{count}</span>
                    <p className="text-sm font-semibold">
                      {retakeSlot !== null ? `Retaking shot ${retakeSlot + 1}` : `Shot ${shot + 1} of ${totalShots}`}
                    </p>
                    <button type="button" className="btn mt-2" onClick={cancelRun}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <p className="text-sm font-semibold">Shot {shot} of {totalShots} taken</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {phase === 'review' && (
        <div className="mt-3 lg:col-span-2">
          <h3 className="font-display text-lg font-bold">Review your shots</h3>
          <p className="mt-1 text-sm text-[var(--ink-dim)]">
            Retake or upload any shot, then make the strip. The strip only builds
            when every shot is in — no blank gaps.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            {Array.from({ length: shotCount }, (_, i) => (
              <div key={i} className="card overflow-hidden p-2">
                {shotUrls[i] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shotUrls[i]} alt={`Shot ${i + 1}`} className="aspect-[3/4] w-full rounded-lg object-cover" />
                ) : (
                  <div className="flex aspect-[3/4] w-full items-center justify-center rounded-lg bg-black/10 text-sm">
                    Shot {i + 1} missing
                  </div>
                )}
                <div className="mt-2 flex gap-2">
                  <button type="button" className="btn !px-2 !py-1 text-xs" onClick={() => retake(i)}>
                    Retake
                  </button>
                  <label className="btn !px-2 !py-1 text-xs">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadIntoSlot(i, f);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!canComposite(shotsRef.current.length, shotCount)}
              onClick={() => composite(true)}
            >
              Make the strip
            </button>
            <button type="button" className="btn" onClick={resetAll}>
              Start over
            </button>
          </div>
        </div>
      )}

      {phase === 'done' && stripUrl && (
        <div className="mt-3 lg:col-span-2">
          <p className="text-sm font-semibold">Filter</p>
          <div className="mt-2">
            <FilterRail selected={filterId} onSelect={setFilterId} layout="row" />
          </div>
          <div className="relative mx-auto mt-3 w-full max-w-xs">
            <canvas
              ref={studioCanvasRef}
              width={360}
              height={640}
              className="w-full rounded-xl"
              style={{ touchAction: 'none' }}
              onPointerDown={onStudioPointerDown}
              onPointerMove={onStudioPointerMove}
              onPointerUp={onStudioPointerUp}
              aria-label="Strip studio preview — tap to place, drag to move"
            />
            <canvas
              ref={doodleCanvasRef}
              width={STORY_WIDTH}
              height={STORY_HEIGHT}
              className="absolute inset-0 h-full w-full rounded-xl"
              style={{ touchAction: 'none', visibility: doodleMode ? 'visible' : 'hidden', pointerEvents: doodleMode ? 'auto' : 'none' }}
              onPointerDown={onDoodleDown}
              onPointerMove={onDoodleMove}
              onPointerUp={onDoodleUp}
              aria-label="Doodle layer — draw on the strip"
            />
          </div>
          {!doodleMode && (
            <p className="mt-2 text-center text-xs text-[var(--ink-dim)]">
              {pendingSticker || pendingText
                ? 'Tap the strip to place it, then drag to move.'
                : 'Tap a sticker or text style below, then tap the strip to place it. Drag placed items to move them.'}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn btn-primary" onClick={() => composite(false)}>
              Update strip
            </button>
            <button type="button" className="btn" onClick={shuffleLook}>
              <Shuffle size={16} aria-hidden /> Shuffle look
            </button>
            <a className="btn" href={stripUrl} download="sachi-strip.png">
              <Download size={18} aria-hidden /> Download
            </a>
            <button type="button" className="btn" onClick={() => void share()}>
              <Share2 size={18} aria-hidden /> Share
            </button>
            <button type="button" className="btn" onClick={resetAll}>
              Take another
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={() => scrapbook('4:5')}>
              Scrapbook 4:5
            </button>
            <button type="button" className="btn" onClick={() => scrapbook('9:16')}>
              Scrapbook 9:16
            </button>
            {selectedOverlay && (
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setOverlays((prev) => prev.filter((o) => o.id !== selectedOverlay));
                  setSelectedOverlay(null);
                }}
              >
                Remove selected
              </button>
            )}
          </div>
          <div className="mt-4">
            <p className="text-sm font-semibold">Stickers</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {STICKER_PACKS.map((pack) => (
                <span key={pack.id} className="flex gap-1">
                  {pack.items.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`btn !px-2 !py-1 text-lg${pendingSticker === emoji ? ' btn-primary' : ''}`}
                      aria-label={`Place ${pack.name} sticker ${emoji}`}
                      onClick={() => setPendingSticker(pendingSticker === emoji ? null : emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Words on the strip
              <input
                className="input"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Write something…"
                maxLength={40}
                aria-label="Words on the strip"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Style
              <select className="input" value={textStyleId} onChange={(e) => setTextStyleId(e.target.value)} aria-label="Text style">
                {TEXT_STYLES.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Colour
              <input
                className="input !w-20"
                type="color"
                value={textColor}
                onChange={(e) => setTextColor(e.target.value)}
                aria-label="Text colour"
              />
            </label>
            <button
              type="button"
              className="btn"
              disabled={!textInput.trim()}
              onClick={() => setPendingText({ text: textInput.trim(), styleId: textStyleId, color: textColor })}
            >
              Place text
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input type="checkbox" checked={doodleMode} onChange={(e) => setDoodleMode(e.target.checked)} />
              Doodle
            </label>
            {doodleMode && (
              <>
                <label className="flex items-center gap-2 text-sm font-semibold">
                  Colour
                  <input
                    className="input !w-20"
                    type="color"
                    value={doodleColor}
                    onChange={(e) => setDoodleColor(e.target.value)}
                    aria-label="Doodle colour"
                  />
                </label>
                <button type="button" className="btn" onClick={clearDoodle}>
                  Clear doodle
                </button>
              </>
            )}
          </div>
          {roomCode && partnerShots.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold">Your partner&rsquo;s shots are in!</p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className="btn btn-primary" onClick={() => void makeTogetherStrip()}>
                  Make our together strip
                </button>
              </div>
              {togetherUrl && (
                <div className="mt-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={togetherUrl} alt="Your together strip" className="mx-auto w-full max-w-xs rounded-xl" />
                  <div className="mt-2 flex justify-center gap-2">
                    <a className="btn" href={togetherUrl} download="sachi-together-strip.png">
                      <Download size={18} aria-hidden /> Download together strip
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {phase === 'idle' && (
        <div className="lg:col-start-2">
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:mt-0 lg:grid-cols-1">
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Strip style
              <select className="input" value={styleId} onChange={(e) => setStyleId(e.target.value)} aria-label="Strip style">
                {BOOTH_STYLES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.note}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Layout
              <select
                className="input"
                value={layoutId}
                onChange={(e) => {
                  const v = e.target.value as BoothLayout;
                  setLayoutId(v);
                  if (v === 'grid') setShotCount(4);
                  if (v === 'polaroid') setShotCount(1);
                }}
                aria-label="Strip layout"
              >
                {BOOTH_LAYOUTS.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} — {l.note}
                  </option>
                ))}
              </select>
            </label>
            {layoutId === 'strip' && (
              <label className="flex flex-col gap-1 text-sm font-semibold">
                Shots
                <select
                  className="input"
                  value={shotCount}
                  onChange={(e) => setShotCount(Number(e.target.value))}
                  aria-label="Number of shots"
                >
                  {SHOT_COUNT_OPTIONS.map((n) => (
                    <option key={n} value={n}>{n} shots</option>
                  ))}
                </select>
              </label>
            )}
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Pose pack
              <select
                className="input"
                value={posePackId}
                onChange={(e) => setPosePackId(e.target.value)}
                aria-label="Pose pack"
              >
                <option value="classic">Pose ideas</option>
                <option value="meme">Meme poses — copy this!</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-semibold">
              Caption on the strip
              <input
                className="input"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Sachi"
                maxLength={40}
                aria-label="Caption on the strip"
              />
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm font-semibold">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={showPoses} onChange={(e) => setShowPoses(e.target.checked)} />
              Pose ideas
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={dateStamp} onChange={(e) => setDateStamp(e.target.checked)} />
              Date on the strip
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={mirror} onChange={(e) => toggleMirror(e.target.checked)} />
              Mirror preview
            </label>
            {!roomCode && (
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={manual} onChange={(e) => setManual(e.target.checked)} />
                Manual shutter (press when ready)
              </label>
            )}
            {!roomCode && (
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={duoTurns} onChange={(e) => setDuoTurns(e.target.checked)} />
                Duo turns (take turns)
              </label>
            )}
            <button type="button" className="btn !px-2 !py-1 text-xs" onClick={() => setSoundOn(!soundOn)} aria-label="Toggle booth sounds">
              {soundOn ? <Volume2 size={16} aria-hidden /> : <VolumeX size={16} aria-hidden />}
              {soundOn ? 'Sound on' : 'Muted'}
            </button>
            {devices.length >= 2 && (
              <button type="button" className="btn !px-2 !py-1 text-xs" onClick={flipCamera}>
                <FlipHorizontal2 size={16} aria-hidden /> Flip camera
              </button>
            )}
          </div>
          {duoTurns && !roomCode && (
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm font-semibold">
                Player 1
                <input className="input" value={playerA} onChange={(e) => setPlayerA(e.target.value)} maxLength={20} aria-label="Player 1 name" />
              </label>
              <label className="flex flex-col gap-1 text-sm font-semibold">
                Player 2
                <input className="input" value={playerB} onChange={(e) => setPlayerB(e.target.value)} maxLength={20} aria-label="Player 2 name" />
              </label>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={!cameraOn}
              onClick={roomCode ? startTogether : startSolo}
            >
              <Camera size={18} aria-hidden />
              {roomCode ? 'Start together' : manual ? 'Start (manual)' : `Take ${shotCount} shots`}
            </button>
          </div>
          <p className="mt-2 text-xs text-[var(--ink-dim)]">
            How it runs: a pose card, then 3-2-1, then the shot — for every shot.
            Tap any filter on the left (or above, on phones) to change the look
            live, before you start. Mirror off shows the real image, as others
            see you; turn Mirror on for the selfie view.
            {manual && !roomCode ? ' In manual mode you press Ready for each shot.' : ''}
            {roomCode ? ' In a room, both phones count down together.' : ''}
          </p>
        </div>
      )}
    </section>
  );
}
