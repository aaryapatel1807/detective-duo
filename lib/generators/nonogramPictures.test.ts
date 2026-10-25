import { describe, expect, it } from 'vitest';
import {
  autoCrossBW,
  autoCrossColor,
  BW_PICTURES,
  bwPictureAt,
  bwPictureIsUnique,
  COLOR_PICTURES,
  colorCluesFromGrid,
  colorPictureAt,
  colorPictureIsUnique,
  countColorSolutions,
  optionsForColorClue,
  parseColorPicture,
  picturePuzzleFromBW,
} from './nonogramPictures';

describe('picture library shape', () => {
  it('every B&W picture is square and sensibly dense', () => {
    for (const pic of BW_PICTURES) {
      const n = pic.rows.length;
      expect(pic.rows.every((r) => r.length === n), `${pic.name} rows`).toBe(true);
      expect(/^[.#]+$/.test(pic.rows.join('')), `${pic.name} chars`).toBe(true);
      const filled = pic.rows.join('').replace(/\./g, '').length;
      const density = filled / (n * n);
      expect(density).toBeGreaterThan(0.15);
      expect(density).toBeLessThan(0.85);
    }
  });

  it('every color picture is square, uses only palette digits, and names a group', () => {
    for (const pic of COLOR_PICTURES) {
      const n = pic.rows.length;
      expect(pic.rows.every((r) => r.length === n), `${pic.name} rows`).toBe(true);
      expect(/^[.12345]+$/.test(pic.rows.join('')), `${pic.name} chars`).toBe(true);
      expect(pic.group.length).toBeGreaterThan(0);
    }
  });

  it('level mapping covers the library in order and returns null outside it', () => {
    expect(bwPictureAt(1)?.name).toBe('Heart');
    expect(bwPictureAt(BW_PICTURES.length)?.name).toBe('Sailboat');
    expect(bwPictureAt(0)).toBeNull();
    expect(bwPictureAt(BW_PICTURES.length + 1)).toBeNull();
    expect(colorPictureAt(1)?.name).toBe('Flower');
    expect(colorPictureAt(COLOR_PICTURES.length)?.name).toBe('Car');
    expect(colorPictureAt(0)).toBeNull();
    expect(colorPictureAt(COLOR_PICTURES.length + 1)).toBeNull();
  });

  it('picture puzzles carry size-based tiers', () => {
    expect(picturePuzzleFromBW(BW_PICTURES[0], 1).tier).toBe('Easy');
    expect(picturePuzzleFromBW(BW_PICTURES[6], 7).tier).toBe('Medium');
    expect(picturePuzzleFromBW(BW_PICTURES[14], 15).tier).toBe('Hard');
    expect(picturePuzzleFromBW(BW_PICTURES[0], 1).size).toBe(5);
  });
});

describe('picture uniqueness (the real-content guarantee)', () => {
  it('every B&W picture has exactly one solution', () => {
    for (const pic of BW_PICTURES) {
      expect(bwPictureIsUnique(pic), pic.name).toBe(true);
    }
  });

  it('every color picture has exactly one solution', () => {
    for (const pic of COLOR_PICTURES) {
      expect(colorPictureIsUnique(pic), pic.name).toBe(true);
    }
  });
});

describe('color clues and solver', () => {
  it('derives colored runs, keeping same-colour runs apart and different colours adjacent', () => {
    // Row: red, empty, red -> two red clues (same colour needs a gap).
    // Row: red, blue adjacent -> two clues, no gap needed.
    const grid = [
      [1, 0, 1],
      [1, 2, 0],
    ];
    const { rowClues } = colorCluesFromGrid(grid);
    expect(rowClues[0]).toEqual([
      { n: 1, c: 1 },
      { n: 1, c: 1 },
    ]);
    expect(rowClues[1]).toEqual([
      { n: 1, c: 1 },
      { n: 1, c: 2 },
    ]);
  });

  it('same-colour runs need a gap; different-colour runs may touch', () => {
    expect(optionsForColorClue([{ n: 1, c: 1 }, { n: 1, c: 1 }], 3)).toEqual([[1, 0, 1]]);
    // Different colours may touch or leave a gap: three placements.
    expect(optionsForColorClue([{ n: 1, c: 1 }, { n: 1, c: 2 }], 3)).toEqual([
      [1, 2, 0],
      [1, 0, 2],
      [0, 1, 2],
    ]);
  });

  it('counts two solutions for an ambiguous 2x2', () => {
    const rowClues = [[{ n: 1, c: 1 }], [{ n: 1, c: 1 }]];
    const colClues = [[{ n: 1, c: 1 }], [{ n: 1, c: 1 }]];
    expect(countColorSolutions(rowClues, colClues, 2, 3)).toBe(2);
  });

  it('parses a color picture into palette digits', () => {
    const grid = parseColorPicture(COLOR_PICTURES[0]);
    expect(grid[0]).toEqual([0, 1, 0, 1, 0]);
    expect(grid[2]).toEqual([0, 1, 2, 1, 0]);
  });
});

describe('auto-cross', () => {
  it('B&W: X-marks the blanks of a completed line, leaves the rest alone', () => {
    const grid = [
      [true, true],
      [true, false],
    ];
    // Row 0 complete (both filled); row 1 not yet.
    const cells = { '0:0': 1, '0:1': 1, '1:0': 1 };
    const out = autoCrossBW(cells, grid);
    expect(out['1:1']).toBe(2);
    expect(out['0:0']).toBe(1);
  });

  it('B&W: a wrongly filled cell blocks auto-cross on its lines', () => {
    const grid = [
      [true, false],
      [false, true],
    ];
    const cells = { '0:0': 1, '0:1': 1 }; // row 0 wrongly filled
    const out = autoCrossBW(cells, grid);
    expect(out['0:1']).toBe(1); // untouched, not X'd
    // Column 0 is genuinely complete, so its blank is X'd; row 0 stays blocked.
    expect(out['1:0']).toBe(2);
  });

  it('color: X-marks blanks of a completed line only when colours match', () => {
    const grid = [
      [1, 2],
      [0, 0],
    ];
    const cells = { '0:0': 1, '0:1': 2 };
    const out = autoCrossColor(cells, grid);
    expect(out['1:0']).toBe(-1);
    expect(out['1:1']).toBe(-1);
    // Wrong colour anywhere blocks every line touching it.
    const grid2 = [
      [1, 2],
      [2, 1],
    ];
    const wrong = autoCrossColor({ '0:0': 1, '0:1': 1 }, grid2);
    expect(Object.keys(wrong)).toEqual(['0:0', '0:1']);
  });
});
