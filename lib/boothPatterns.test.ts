import { describe, expect, it } from 'vitest';
import {
  BOOTH_STYLES,
  STORY_HEIGHT,
  STORY_WIDTH,
  layoutSlots,
  stripMarginFor,
  type BoothLayout,
  type BoothStyle,
} from './booth';
import {
  drawPatternBackground,
  drawPatternForeground,
} from '../components/booth/patternPainters';

/**
 * A canvas stand-in that records every call and property set instead
 * of drawing: the painters only need method calls and assignments,
 * so a Proxy stub proves they run without throwing — and that seeded
 * painters replay identically — with no real canvas in node.
 */
type Log = string[];

function recordingCtx(log: Log): CanvasRenderingContext2D {
  const str = (v: unknown): string =>
    typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean' ? String(v) : '[obj]';
  const gradient = () => ({
    addColorStop: (...a: unknown[]) => {
      log.push(`addColorStop(${a.map(str).join(',')})`);
    },
  });
  return new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
          return (...a: unknown[]) => {
            log.push(`${String(prop)}(${a.map(str).join(',')})`);
            return gradient();
          };
        }
        return (...a: unknown[]) => {
          log.push(`${String(prop)}(${a.map(str).join(',')})`);
        };
      },
      set(_t, prop, value) {
        log.push(`set ${String(prop)}=${str(value)}`);
        return true;
      },
    },
  ) as unknown as CanvasRenderingContext2D;
}

function paintAll(style: BoothStyle, w: number, h: number, layout: BoothLayout, count: number): Log {
  const log: Log = [];
  const ctx = recordingCtx(log);
  const { slots } = layoutSlots(layout, w, h, count, stripMarginFor(style));
  drawPatternBackground(ctx, style, w, h);
  drawPatternForeground(ctx, style, slots, w, h);
  return log;
}

const ROLLBOOTH = BOOTH_STYLES.filter((s) => s.group === 'rollbooth');

describe('booth pattern painters', () => {
  it('every style paints without throwing on a small canvas, in every layout', () => {
    const layouts: [BoothLayout, number][] = [
      ['strip', 3],
      ['grid', 4],
      ['polaroid', 1],
    ];
    for (const style of BOOTH_STYLES) {
      for (const [layout, count] of layouts) {
        expect(() => paintAll(style, 540, 960, layout, count)).not.toThrow();
      }
    }
  });

  it('every rollbooth pattern kind actually draws (a mistyped kind would paint nothing)', () => {
    const kinds = new Set(ROLLBOOTH.map((s) => s.pattern?.kind));
    expect(kinds).toEqual(
      new Set([
        'stripes', // velvet reuses the fine-rib stripe painter
        'gingham',
        'header',
        'airmail',
        'ticket',
        'wanted',
        'halloween',
        'thanksgiving',
        'stitch',
        'starframe',
        'scrapstars',
        'birthdayscrap',
        'blend',
        'colourroom',
        'squiggle',
      ]),
    );
    for (const style of ROLLBOOTH) {
      const log = paintAll(style, STORY_WIDTH, STORY_HEIGHT, 'strip', 3);
      expect(log.length).toBeGreaterThan(0);
    }
  });

  it('seeded painting is deterministic: the same style replays identically', () => {
    for (const style of ROLLBOOTH) {
      const a = paintAll(style, STORY_WIDTH, STORY_HEIGHT, 'strip', 3);
      const b = paintAll(style, STORY_WIDTH, STORY_HEIGHT, 'strip', 3);
      expect(b).toEqual(a);
      const gridA = paintAll(style, STORY_WIDTH, STORY_HEIGHT, 'grid', 4);
      const gridB = paintAll(style, STORY_WIDTH, STORY_HEIGHT, 'grid', 4);
      expect(gridB).toEqual(gridA);
    }
  });

  it('rollbooth pattern colours are valid hex', () => {
    const check = (v: unknown): void => {
      if (typeof v === 'string' && v.startsWith('#')) {
        expect(v).toMatch(/^#[0-9a-f]{6}$/);
      } else if (Array.isArray(v)) {
        v.forEach(check);
      } else if (v && typeof v === 'object') {
        Object.values(v).forEach(check);
      }
    };
    for (const style of ROLLBOOTH) check(style.pattern);
  });
});
