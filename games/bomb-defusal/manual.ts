/* The Expert's defusal manual. These rules mirror logic.ts exactly —
 * the Technician describes the bomb, the Expert reads the rule that applies.
 */

export interface ManualPage {
  id: string;
  title: string;
  body: string[];
}

export const MANUAL_PAGES: ManualPage[] = [
  {
    id: 'wires',
    title: 'Module 1 — Wires',
    body: [
      'There are 5 wires. Read the FIRST rule below that matches. Cut exactly that wire.',
      '1. If there are NO red wires → cut the 2ND wire.',
      '2. Else, if the LAST wire is yellow → cut the FIRST red wire.',
      '3. Else, if there is EXACTLY ONE blue wire → cut the 1ST wire.',
      '4. Else, if there are MORE yellow wires than red wires → cut the LAST wire.',
      '5. Otherwise → cut the 2ND wire.',
      'Ask the Technician: "How many wires, and what colors, left to right?"',
    ],
  },
  {
    id: 'keypad',
    title: 'Module 2 — Keypad',
    body: [
      'Four symbols glow on the keypad. Press them in the order they appear in the master list below — top to bottom, then column two.',
      'MASTER LIST:  Ω   Ψ   Δ   ☰   ♆   ♠   ☼   ☽',
      'Ask the Technician to read out the four symbols, then dictate the press order. One wrong press = a strike, and the sequence resets.',
    ],
  },
  {
    id: 'simon',
    title: 'Module 3 — Simon Lights',
    body: [
      'A sequence of colored lights will flash. The Technician must press the RESPONSE color for each flash, using the key for the CURRENT strike count.',
      '0 STRIKES:  flash RED→press BLUE · BLUE→press GREEN · GREEN→press YELLOW · YELLOW→press RED',
      '1 STRIKE:   flash RED→press YELLOW · BLUE→press RED · GREEN→press BLUE · YELLOW→press GREEN',
      '2 STRIKES:  flash RED→press GREEN · BLUE→press YELLOW · GREEN→press RED · YELLOW→press BLUE',
      'Three rounds: 3 flashes, then 4, then 5. The key LOCKS at the start of each round — a strike mid-round does NOT change it until the next round.',
    ],
  },
  {
    id: 'password',
    title: 'Module 4 — Password Wheels',
    body: [
      'Three letter wheels. Spin each wheel until the three letters form one of these words:',
      'CAT · DOG · PIG · BAT · FOX · HEN · COW · ANT',
      'Exactly one of these words can be spelled — find it, then press SUBMIT.',
      'Ask the Technician: "What letters are on wheel one?" and work through all three.',
    ],
  },
];

export const MANUAL_TIPS = [
  'The Technician must never look at this manual. The Expert must never look at the bomb.',
  'Timer: 5:00. Three strikes and the device detonates.',
  'Defuse all four modules to close the case.',
];
