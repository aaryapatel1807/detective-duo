'use client';

/**
 * Shared Dots and Boxes board (solo page + together view).
 * SVG: dots, tappable edges, claimed boxes tinted by owner. All colours
 * come from theme tokens, so the board looks right in every theme.
 */
import type { DotsBoxesBoard, DotsEdge } from '@/lib/generators/dotsBoxes';

const PITCH = 48;
const PAD = 12;

export default function DotsBoard({
  board,
  onEdge,
  interactive,
  hintEdge,
}: {
  board: DotsBoxesBoard;
  onEdge?: (e: DotsEdge) => void;
  interactive: boolean;
  hintEdge?: DotsEdge | null;
}) {
  const size = board.size;
  const vb = size * PITCH + PAD * 2;
  const dot = (i: number) => PAD + i * PITCH;

  const edge = (e: DotsEdge, key: string) => {
    const claimed = e.kind === 'h' ? board.h[e.r][e.c] : board.v[e.r][e.c];
    const [x1, y1, x2, y2] =
      e.kind === 'h'
        ? [dot(e.c), dot(e.r), dot(e.c + 1), dot(e.r)]
        : [dot(e.c), dot(e.r), dot(e.c), dot(e.r + 1)];
    const isHint = hintEdge?.kind === e.kind && hintEdge.r === e.r && hintEdge.c === e.c;
    return (
      <g key={key}>
        <line
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke="transparent"
          strokeWidth={20}
          strokeLinecap="round"
          style={{ cursor: claimed || !interactive ? 'default' : 'pointer' }}
          onClick={() => !claimed && interactive && onEdge?.(e)}
        />
        {claimed && (
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="var(--accent)"
            strokeWidth={5}
            strokeLinecap="round"
            opacity={0.9}
          />
        )}
        {isHint && (
          <line
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="var(--good)"
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray="6 5"
          />
        )}
      </g>
    );
  };

  const edges: React.ReactNode[] = [];
  for (let r = 0; r <= size; r++) {
    for (let c = 0; c < size; c++) edges.push(edge({ kind: 'h', r, c }, `h-${r}-${c}`));
  }
  for (let r = 0; r < size; r++) {
    for (let c = 0; c <= size; c++) edges.push(edge({ kind: 'v', r, c }, `v-${r}-${c}`));
  }

  return (
    <svg
      viewBox={`0 0 ${vb} ${vb}`}
      className="mt-3 w-full"
      role="img"
      aria-label={`Dots and Boxes board, ${size} by ${size}`}
    >
      {board.owner.map((row, r) =>
        row.map((o, c) =>
          o === null ? null : (
            <rect
              key={`box-${r}-${c}`}
              x={dot(c) + 4}
              y={dot(r) + 4}
              width={PITCH - 8}
              height={PITCH - 8}
              rx={8}
              fill={o === 0 ? 'var(--accent)' : 'var(--accent-2)'}
              opacity={0.22}
            />
          ),
        ),
      )}
      {edges}
      {Array.from({ length: size + 1 }, (_, r) =>
        Array.from({ length: size + 1 }, (_, c) => (
          <circle key={`d-${r}-${c}`} cx={dot(c)} cy={dot(r)} r={4.5} fill="var(--ink-dim)" />
        )),
      )}
    </svg>
  );
}
