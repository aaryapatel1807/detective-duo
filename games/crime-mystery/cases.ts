/* Crime Mystery case files — flagship bank.
 *
 * The 2 bank cases live in lib/content/cases.ts (read-only import).
 * 7 more are authored here with ESCALATING difficulty:
 *   easy   — cases 3-4 (5-6 clues, one clean chain, one red herring)
 *   medium — cases 5-6 (7-8 clues, alibis that need combining)
 *   hard   — cases 7-9 (10-12 clues, layered red herrings, tangled alibis)
 *
 * Fair-play rule (CONTRACT.md): the culprit must be uniquely deducible from
 * the UNION of all clues + suspects. Splits force the talking: every case
 * has >= 1 'a'-only and >= 1 'b'-only clue, and at least one red herring
 * that the clues themselves defuse.
 */

import {
  CASES as BANK_CASES,
  validateCaseFile,
  type CaseFile,
} from '../../lib/content/cases';

export type { CaseFile };
export { validateCaseFile };

const NEW_CASES: CaseFile[] = [
  /* ---------------- CASE 3 — easy, 5 clues ---------------- */
  {
    id: 'the-painted-alibi',
    title: 'The Painted Alibi',
    difficulty: 'easy',
    location: 'Kala Ghoda Gallery',
    intro:
      'Kala Ghoda Gallery, 11:40 PM. At the closing of the winter gala, Marco Reyes\' "Monsoon Bride" — insured for ₹2 crore — is gone from the east wall. No alarms, no broken glass, no forced entry. Four people stayed late. One of them carried a ₹2 crore canvas out of the loading dock.',
    clues: [
      {
        id: 'pa-1',
        text: 'No forced entry anywhere — the loading-dock door was opened with the correct keypad code.',
        split: 'both',
        card: 'note',
        label: 'NO FORCED ENTRY',
      },
      {
        id: 'pa-2',
        text: 'The dock code was changed that very morning. Only the curator received the new code — she told no one.',
        split: 'a',
        card: 'report',
        label: 'THE NEW CODE',
      },
      {
        id: 'pa-3',
        text: 'A wine glass with fresh lipstick abandoned on the loading dock. The artist never wears makeup — and the donor left the gala at 20:00, her driver confirms.',
        split: 'b',
        card: 'note',
        label: 'THE WINE GLASS',
      },
      {
        id: 'pa-4',
        text: 'The cameras went dark 21:10–21:25. The guard\'s log reads "all clear, 21:15" — written from the monitor room, where he was found asleep.',
        split: 'a',
        card: 'note',
        label: 'THE DARK CAMERAS',
      },
      {
        id: 'pa-5',
        text: 'Cadmium-red flakes — the stolen painting\'s signature pigment — found on the curator\'s gala shoes.',
        split: 'b',
        card: 'report',
        label: 'THE PAINT FLAKES',
      },
    ],
    suspects: [
      {
        name: 'Vera Kaur',
        motive: 'Curator. Quietly drowning in gambling debt; the insurance paperwork was already on her desk.',
        alibi: 'In her office doing inventory 21:00–21:30 — no witness.',
        secret: 'She changed the dock code herself that morning and told no one the new number.',
        portrait: '/crime-mystery/portraits/older-woman.webp',
        descriptor: 'FEMALE · 50s · CURATOR',
      },
      {
        name: 'Marco Reyes',
        motive: 'The artist. Furious the gallery won\'t return his early works; once threatened to "take back what\'s mine."',
        alibi: 'At the bar with patrons 21:00–22:00 — a dozen witnesses.',
        secret: 'He never learned the dock code, old or new.',
        portrait: '/crime-mystery/portraits/young-man.webp',
        descriptor: 'MALE · 20s · ARTIST',
      },
      {
        name: 'Tommy Briggs',
        motive: 'Night guard. Three months behind on rent; the gallery just cut his overtime.',
        alibi: 'Logged "all clear" at 21:15 — from the monitor room, where he was napping.',
        secret: 'He disabled the camera loop himself to nap in peace — then lied about it.',
        portrait: '/crime-mystery/portraits/beanie-man.webp',
        descriptor: 'MALE · 30s · GUARD',
      },
      {
        name: 'Helena Voss',
        motive: 'Wealthy donor. None anyone can find — she adored the painting.',
        alibi: 'Left at 20:00; driver and valet confirm.',
        secret: 'She\'s been quietly buying Marco\'s early works for years.',
        portrait: '/crime-mystery/portraits/scarf-woman.webp',
        descriptor: 'FEMALE · 60s · DONOR',
      },
    ],
    culprit: 'Vera Kaur',
    solution:
      'Vera Kaur is the only person who knew the new dock code — changed that morning, told to no one (pa-2). The lipstick glass on the dock is hers: Marco never wears makeup, Helena left at 20:00 (pa-3). Cadmium-red flakes from the stolen canvas were on her gala shoes (pa-5). Tommy\'s camera blackout was a napping guard\'s cover-up, not a conspiracy (pa-4). Means, opportunity, and paint on her shoes.',
  },

  /* ---------------- CASE 4 — easy, 6 clues ---------------- */
  {
    id: 'the-midnight-baker',
    title: 'The Midnight Baker',
    difficulty: 'easy',
    location: 'Crumb & Craft Bakery, MG Road',
    intro:
      '3:12 AM. "Crumb & Craft" bakery is a blackened shell. The fire brigade calls it arson — kerosene, poured by the flour storeroom. The owner swears it was an accident. Four people had keys to the back door. One of them wanted the building gone.',
    clues: [
      {
        id: 'mb-1',
        text: 'Kerosene traces by the flour storeroom — the fire was set deliberately, around 3:00 AM.',
        split: 'both',
        card: 'report',
        label: 'THE FIRE',
      },
      {
        id: 'mb-2',
        text: 'The fire insurance was doubled six weeks ago. Only the two partners could authorize it — and Sanna says she never signed.',
        split: 'a',
        card: 'note',
        label: 'THE INSURANCE',
      },
      {
        id: 'mb-3',
        text: 'Rahul claims he was at a 24-hour gym all night. His keycard shows no entry — the alibi is a lie.',
        split: 'b',
        card: 'note',
        label: 'THE GYM LIE',
      },
      {
        id: 'mb-4',
        text: 'Size-11 floury footprints lead from the storeroom to the back door. Rahul wears size 11; Asha wears size 6.',
        split: 'a',
        card: 'report',
        label: 'THE FOOTPRINTS',
      },
      {
        id: 'mb-5',
        text: 'The back-door deadbolt was locked from the inside after the fire started — someone locked up behind themselves, with a key.',
        split: 'b',
        card: 'note',
        label: 'THE DEADBOLT',
      },
      {
        id: 'mb-6',
        text: 'Asha\'s call-center supervisor confirms she was on live calls from 1:00 to 4:00 AM.',
        split: 'both',
        card: 'note',
        label: 'THE ALIBI',
      },
    ],
    suspects: [
      {
        name: 'Sanna Qureshi',
        motive: 'Head baker and co-owner. None — the bakery was her life\'s work.',
        alibi: 'Home asleep; husband confirms, phone never left the house.',
        secret: 'The ovens were due a safety refit she couldn\'t afford — she feared an inspection.',
        portrait: '/crime-mystery/portraits/older-woman.webp',
        descriptor: 'FEMALE · 40s · HEAD BAKER',
      },
      {
        name: 'Rahul Mehta',
        motive: 'Business partner. Wanted to sell the building to developers for ₹4 crore; Sanna refused to sign.',
        alibi: 'Claims the 24-hour gym — keycard records say otherwise.',
        secret: 'His phone pings him two streets from the bakery at 2:40 AM.',
        portrait: '/crime-mystery/portraits/suit-man.webp',
        descriptor: 'MALE · 40s · PARTNER',
      },
      {
        name: 'Asha Devi',
        motive: 'Ex-employee, fired last month after a shouting match; swore revenge.',
        alibi: 'Night shift at a call center — supervisor-confirmed, 1:00–4:00 AM.',
        secret: 'She never returned her spare back-door key.',
        portrait: '/crime-mystery/portraits/scarf-woman.webp',
        descriptor: 'FEMALE · 30s · EX-EMPLOYEE',
      },
      {
        name: 'Kabir Anand',
        motive: 'Delivery driver. Sanna docked his pay twice — petty, hardly arson-sized.',
        alibi: 'On his delivery route; van GPS logs him across town at 3:00 AM.',
        secret: 'He naps in his van behind the bakery between runs — and heard nothing that night.',
        portrait: '/crime-mystery/portraits/worker-man.webp',
        descriptor: 'MALE · 30s · DRIVER',
      },
    ],
    culprit: 'Rahul Mehta',
    solution:
      'Rahul Mehta doubled the insurance without Sanna\'s signature (mb-2), lied about the gym — no keycard entry (mb-3) — left size-11 footprints from the storeroom (mb-4), and locked the deadbolt behind him with his partner\'s key (mb-5). Asha has a supervisor-confirmed alibi (mb-6); Kabir\'s van was across town. A partner who wanted to sell, an insurance payout, and flour on his shoes.',
  },

  /* ---------------- CASE 5 — medium, 7 clues ---------------- */
  {
    id: 'the-poisoned-podcast',
    title: 'The Poisoned Podcast',
    difficulty: 'medium',
    location: 'Night Frequency Studio',
    intro:
      'Riya Sen, host of the hit livestream "Night Frequency", collapses 40 minutes into the show — a fast-acting sedative in her water bottle. The studio was locked during broadcast; only four people were inside. The chat watched it happen live.',
    clues: [
      {
        id: 'pp-1',
        text: 'Riya collapsed 40 minutes into the livestream. The hospital found a fast-acting sedative — slipped into her water bottle.',
        split: 'both',
        card: 'report',
        label: 'THE COLLAPSE',
      },
      {
        id: 'pp-2',
        text: 'The control-room camera shows the producer refilling Riya\'s bottle during the ad break at the 25-minute mark.',
        split: 'a',
        card: 'note',
        label: 'THE REFILL',
      },
      {
        id: 'pp-3',
        text: 'The co-host never left his chair — stream video shows him on mic continuously from minute 0 to the collapse.',
        split: 'b',
        card: 'note',
        label: 'THE CO-HOST',
      },
      {
        id: 'pp-4',
        text: 'The sponsor was active in the live chat under his verified handle at the exact minute Riya drank.',
        split: 'a',
        card: 'note',
        label: 'THE SPONSOR',
      },
      {
        id: 'pp-5',
        text: 'The sedative is prescription-only. The producer\'s bag held an empty blister pack with her name on the pharmacy label.',
        split: 'b',
        card: 'report',
        label: 'THE PRESCRIPTION',
      },
      {
        id: 'pp-6',
        text: 'The ex\'s bookshop reading had 40+ attendees and a timestamped signed poster — she was across town all evening.',
        split: 'both',
        card: 'note',
        label: 'THE EX',
      },
      {
        id: 'pp-7',
        text: 'The bottle was Riya\'s own, brought from home — but its cap seal was already broken before the show. Only someone inside the studio could have opened it.',
        split: 'a',
        card: 'note',
        label: 'THE SEAL',
      },
    ],
    suspects: [
      {
        name: 'Dev Khanna',
        motive: 'Co-host. Riya was about to fire him; his contract had a brutal non-compete.',
        alibi: 'On mic the whole stream — visible on camera.',
        secret: 'He\'d already recorded a secret farewell episode.',
        portrait: '/crime-mystery/portraits/young-man.webp',
        descriptor: 'MALE · 20s · CO-HOST',
      },
      {
        name: 'Nina Rao',
        motive: 'Producer. Riya took credit for her segments for two years; the network just offered Nina Riya\'s slot.',
        alibi: 'In the control room — on camera, refilling the bottle.',
        secret: 'Her sedative prescription is real — post-surgery. She "lost" half the strip last week.',
        portrait: '/crime-mystery/portraits/scarf-woman.webp',
        descriptor: 'FEMALE · 30s · PRODUCER',
      },
      {
        name: 'Arjun Sethi',
        motive: 'Sponsor. Riya was going to expose his drink\'s fake clinical trials tomorrow.',
        alibi: 'Typing in live chat from his office — verified handle, IP-confirmed.',
        secret: 'He emailed Riya an hour before: "you\'ll regret this".',
        portrait: '/crime-mystery/portraits/suit-man.webp',
        descriptor: 'MALE · 40s · SPONSOR',
      },
      {
        name: 'Tara Iyer',
        motive: 'Ex co-host. Bitter public split last year.',
        alibi: 'Bookshop reading across town — 40 witnesses, timestamped poster.',
        secret: 'She texted Riya "you\'ll regret this" last week — about the split.',
        portrait: '/crime-mystery/portraits/older-woman.webp',
        descriptor: 'FEMALE · 40s · EX CO-HOST',
      },
    ],
    culprit: 'Nina Rao',
    solution:
      'Nina Rao is the only person with means, motive, and opportunity combined: caught on camera refilling the bottle at the 25-minute mark (pp-2), carrying her own prescription sedative (pp-5), about to inherit Riya\'s slot. Dev never left his chair (pp-3), Arjun was provably typing from his office (pp-4), Tara was across town (pp-6). The broken seal (pp-7) proves the poison went in inside the studio. The "helpful refill" during the ad break was the murder.',
  },

  /* ---------------- CASE 6 — medium, 8 clues ---------------- */
  {
    id: 'the-lighthouse-keeper',
    title: 'The Lighthouse Keeper',
    difficulty: 'medium',
    location: 'Blackrock Island Lighthouse',
    intro:
      'Dawn on Blackrock Island. Old keeper Elias Vane is found at the foot of the lighthouse stairs, neck broken. A storm raged from 23:00 to 04:00 — no boat could land after midnight. Four people were on the island. The stairs don\'t lie, but people do.',
    clues: [
      {
        id: 'lh-1',
        text: 'Elias died in a fall down the lighthouse stairs. The storm raged 23:00–04:00 — no boat could land after midnight.',
        split: 'both',
        card: 'report',
        label: 'THE FALL',
      },
      {
        id: 'lh-2',
        text: 'The lamp-room log shows entries in the assistant\'s handwriting until 02:00 — yet she claims she slept in her cottage from midnight.',
        split: 'a',
        card: 'note',
        label: 'THE LOG',
      },
      {
        id: 'lh-3',
        text: 'The ornithologist\'s time-lapse shows the lamp room empty 01:00–03:00 — and a figure on the gallery stairs at 02:10.',
        split: 'b',
        card: 'report',
        label: 'THE TIME-LAPSE',
      },
      {
        id: 'lh-4',
        text: 'The captain\'s deckhand — his own nephew — admits he was below deck asleep 01:00–04:00. The captain\'s alibi has a three-hour hole.',
        split: 'a',
        card: 'note',
        label: 'THE NEPHEW',
      },
      {
        id: 'lh-5',
        text: 'The estranged son\'s rowboat was found swamped on the far beach — he rowed over and left before the storm peaked, ~23:30.',
        split: 'b',
        card: 'note',
        label: 'THE ROWBOAT',
      },
      {
        id: 'lh-6',
        text: 'Elias\'s oilskin coat hung dry in the lamp room — he never went out into the storm that night.',
        split: 'both',
        card: 'note',
        label: 'THE COAT',
      },
      {
        id: 'lh-7',
        text: 'A woman\'s hair ribbon — the assistant wears one every day — snagged on the stair rail at the top of the fatal flight.',
        split: 'a',
        card: 'report',
        label: 'THE RIBBON',
      },
      {
        id: 'lh-8',
        text: 'The "birdseed" crates held untaxed liquor — the captain\'s smuggling secret — but the customs seals were intact: never opened that night.',
        split: 'b',
        card: 'note',
        label: 'THE CRATES',
      },
    ],
    suspects: [
      {
        name: 'Mara Voss',
        motive: 'Assistant keeper. Skimming supply money for a year; Elias had found the shortfall and was going to report her.',
        alibi: 'Claims she slept in her cottage from midnight — the lamp log disagrees.',
        secret: 'The "midnight relief" log entries are in her handwriting, not Elias\'s.',
        portrait: '/crime-mystery/portraits/scarf-woman.webp',
        descriptor: 'FEMALE · 30s · ASSISTANT',
      },
      {
        name: 'Capt. Henrik Dahl',
        motive: 'Supply-boat captain. Elias threatened to report his liquor smuggling.',
        alibi: 'On his anchored boat — but his only witness slept 01:00–04:00.',
        secret: 'The "birdseed" crates are untaxed liquor.',
        portrait: '/crime-mystery/portraits/flatcap-man.webp',
        descriptor: 'MALE · 50s · CAPTAIN',
      },
      {
        name: 'Dr. Lena Petrova',
        motive: 'Ornithologist. None — she argued with Elias about the light disturbing terns, once, loudly.',
        alibi: 'In her cottage; field notes timestamped hourly.',
        secret: 'Her time-lapse photographed the lighthouse all night — she didn\'t realize what it caught.',
        portrait: '/crime-mystery/portraits/older-woman.webp',
        descriptor: 'FEMALE · 40s · ORNITHOLOGIST',
      },
      {
        name: 'Jonas Pike',
        motive: 'Elias\'s estranged son. Stood to inherit the keeper\'s cottage and land.',
        alibi: 'Claims he never came — his swamped rowboat says otherwise.',
        secret: 'He rowed over to reconcile; they argued, and he left before the storm peaked.',
        portrait: '/crime-mystery/portraits/beanie-man.webp',
        descriptor: 'MALE · 20s · SON',
      },
    ],
    culprit: 'Mara Voss',
    solution:
      'Mara Voss lied about sleeping — her handwriting fills the lamp log until 02:00 (lh-2), her daily ribbon snagged at the top of the fatal stairs (lh-7), and the time-lapse caught a figure there at 02:10 while the lamp room stood empty (lh-3). Jonas left before the storm peaked (lh-5); the captain\'s crates stayed sealed (lh-8). Elias confronted her about the skimmed money — and she pushed him down the stairs she tended.',
  },

  /* ---------------- CASE 7 — hard, 10 clues ---------------- */
  {
    id: 'the-masquerade-murder',
    title: 'The Masquerade Murder',
    difficulty: 'hard',
    location: 'Raheja Masquerade Ball',
    intro:
      'Midnight at the Raheja masquerade ball. Industrialist Vikram Raheja raises his champagne for the toast — and never lowers it. Cyanide in the flute, and only his flute. Two hundred masked guests, four people with reason to want him quiet, and a killer who knew exactly which glass he would take.',
    clues: [
      {
        id: 'mm-1',
        text: 'Vikram died of cyanide in his champagne between 23:15 and 23:30. His was the only poisoned glass on the tray.',
        split: 'both',
        card: 'report',
        label: 'THE TOAST',
      },
      {
        id: 'mm-2',
        text: 'The poisoned flute had a small fresh chip on its base — the killer marked it. Cut within hours of the ball.',
        split: 'a',
        card: 'report',
        label: 'THE CHIP',
      },
      {
        id: 'mm-3',
        text: 'Vikram always took the leftmost flute from any tray — a habit everyone in the family knew.',
        split: 'b',
        card: 'note',
        label: 'THE HABIT',
      },
      {
        id: 'mm-4',
        text: 'The wife\'s dance partner confirms they danced 23:00–23:40 — but she slipped away to the champagne table alone at 23:05.',
        split: 'a',
        card: 'note',
        label: 'THE DANCE',
      },
      {
        id: 'mm-5',
        text: 'The son\'s terrace friends confirm him there 23:00–23:30, and his phone location agrees to the minute.',
        split: 'b',
        card: 'note',
        label: 'THE TERRACE',
      },
      {
        id: 'mm-6',
        text: 'The event planner\'s fireworks crew confirm she was on the east lawn from 22:50 until midnight — never came inside.',
        split: 'a',
        card: 'note',
        label: 'THE FIREWORKS',
      },
      {
        id: 'mm-7',
        text: 'The champagne was poured tableside — the head waiter confirms the toast tray was assembled at 23:10, AFTER the wife\'s 23:05 visit to the table.',
        split: 'b',
        card: 'note',
        label: 'THE TRAY',
      },
      {
        id: 'mm-8',
        text: 'The secretary stayed at the coat check all night, attendant-confirmed — and the spare mask in her bag is clean.',
        split: 'both',
        card: 'note',
        label: 'THE COAT CHECK',
      },
      {
        id: 'mm-9',
        text: 'A torn corner of the wife\'s masquerade invitation was found in the catering crate with the chipped flutes.',
        split: 'a',
        card: 'report',
        label: 'THE INVITATION',
      },
      {
        id: 'mm-10',
        text: 'The wife was seen at the catering setup at 16:00, "choosing the champagne" — hours before any guest arrived.',
        split: 'b',
        card: 'note',
        label: 'THE SETUP',
      },
    ],
    suspects: [
      {
        name: 'Anaya Raheja',
        motive: 'Wife. A divorce would leave her nothing; a widow inherits everything — and Vikram\'s lawyers were drafting papers.',
        alibi: 'Dancing 23:00–23:40 — except one slip to the champagne table at 23:05.',
        secret: 'Affair with the event planner — Vikram had hired a photographer to prove it.',
        portrait: '/crime-mystery/portraits/scarf-woman.webp',
        descriptor: 'FEMALE · 40s · WIFE',
      },
      {
        name: 'Kabir Raheja',
        motive: 'Son. Cut out of the will last month after a blazing row.',
        alibi: 'Terrace with friends 23:00–23:30 — three witnesses plus phone location.',
        secret: 'Hired a PI to follow his father — the file is full of the affair.',
        portrait: '/crime-mystery/portraits/young-man.webp',
        descriptor: 'MALE · 20s · SON',
      },
      {
        name: 'Saira Khan',
        motive: 'Event planner — and Anaya\'s lover. Vikram threatened to expose the affair and ruin her business.',
        alibi: 'Running midnight fireworks on the east lawn 22:50–midnight — crew confirms.',
        secret: 'The affair with Anaya — Vikram\'s leverage over both of them.',
        portrait: '/crime-mystery/portraits/older-woman.webp',
        descriptor: 'FEMALE · 40s · PLANNER',
      },
      {
        name: 'Meera Krishnan',
        motive: 'Secretary. Discovered Vikram forging documents; was going to be fired Friday for "asking questions."',
        alibi: 'At the coat check all night — attendant confirms.',
        secret: 'Pocketed Vikram\'s spare "Raven" mask as a souvenir. It\'s clean.',
        portrait: '/crime-mystery/portraits/scarf-woman.webp',
        descriptor: 'FEMALE · 30s · SECRETARY',
      },
    ],
    culprit: 'Anaya Raheja',
    solution:
      'Anaya Raheja marked a flute at the afternoon setup (her invitation corner in the chipped-flute crate — mm-9; seen "choosing the champagne" at 16:00 — mm-10), knew Vikram would take the leftmost glass — a family habit (mm-3) — and slipped the cyanide in during her 23:05 absence from the dance floor (mm-4), before the tray was assembled at 23:10 (mm-7). Kabir was on the terrace (mm-5), Saira on the east lawn (mm-6), Meera at coat check (mm-8) — every other suspect pinned to a witnessed alibi. A marked glass, a known habit, and five unwitnessed minutes.',
  },

  /* ---------------- CASE 8 — hard, 11 clues ---------------- */
  {
    id: 'the-clockmakers-last-tick',
    title: "The Clockmaker's Last Tick",
    difficulty: 'hard',
    location: "Zaveri's Clock Workshop",
    intro:
      'Master clockmaker Ghanshyam "Guru" Zaveri is found slumped over his workbench at 22:40, surrounded by a hundred ticking clocks. Aconite poisoning — absorbed through the skin around his right eye. His loupe is the only poisoned object in the shop. Four people knew his nightly ritual.',
    clues: [
      {
        id: 'cm-1',
        text: 'Guru died of aconite poisoning around 22:00 — absorbed through the skin around his right eye.',
        split: 'both',
        card: 'report',
        label: 'THE POISONING',
      },
      {
        id: 'cm-2',
        text: 'His loupe\'s eyecup tested positive for aconite paste — the only poisoned object in the entire shop.',
        split: 'a',
        card: 'report',
        label: 'THE LOUPE',
      },
      {
        id: 'cm-3',
        text: 'Guru\'s iron ritual: loupe inspection at 21:30 sharp, chai at 21:45. Everyone in the shop knew it by heart.',
        split: 'b',
        card: 'note',
        label: 'THE RITUAL',
      },
      {
        id: 'cm-4',
        text: 'The apprentice returned at 21:02 for forgotten tools; the bell log shows entry 21:02, exit 21:09. The paste was still tacky at 22:30 — applied between 21:30 and 22:00, after she left.',
        split: 'a',
        card: 'note',
        label: 'THE APPRENTICE',
      },
      {
        id: 'cm-5',
        text: 'The rival was at a dealers\' dinner 19:00–23:00 — twelve witnesses, plus a timestamped photo toasting at 21:05.',
        split: 'b',
        card: 'note',
        label: 'THE RIVAL',
      },
      {
        id: 'cm-6',
        text: 'Guru\'s 21:45 chai sat untouched and cold — he never got past the 21:30 loupe ritual.',
        split: 'both',
        card: 'note',
        label: 'THE CHAI',
      },
      {
        id: 'cm-7',
        text: 'The wife was at her sister\'s 19:00–22:30 — sister-confirmed, doorbell camera agrees.',
        split: 'a',
        card: 'note',
        label: 'THE WIFE',
      },
      {
        id: 'cm-8',
        text: 'The son\'s Pune train ticket — his whole alibi — is dated the day AFTER the murder. Fabricated.',
        split: 'b',
        card: 'report',
        label: 'THE TICKET',
      },
      {
        id: 'cm-9',
        text: 'Aconite grows wild behind the Zaveri family farmhouse, where the son grew up and still visits monthly.',
        split: 'a',
        card: 'note',
        label: 'THE ACONITE',
      },
      {
        id: 'cm-10',
        text: 'The workbench drawer where the loupe was kept had been wiped clean — only the drawer, not the surrounding tools.',
        split: 'both',
        card: 'report',
        label: 'THE DRAWER',
      },
      {
        id: 'cm-11',
        text: 'The son\'s fingerprints are on the wiped workbench drawer — though he claims he hasn\'t visited the shop in months.',
        split: 'b',
        card: 'report',
        label: 'THE PRINTS',
      },
    ],
    suspects: [
      {
        name: 'Priya Nair',
        motive: 'Apprentice. Guru refused to name her successor and threatened to blacklist her.',
        alibi: 'Left 18:00, back 21:02–21:09 for tools — bell-logged, before the paste was applied.',
        secret: 'Took a secret commission behind Guru\'s back — and he found out.',
        portrait: '/crime-mystery/portraits/scarf-woman.webp',
        descriptor: 'FEMALE · 20s · APPRENTICE',
      },
      {
        name: 'Farhan Sheikh',
        motive: 'Rival clockmaker. Guru\'s forgery-case testimony destroyed his reputation.',
        alibi: 'Dealers\' dinner 19:00–23:00 — twelve witnesses, 21:05 photograph.',
        secret: 'Wrote Guru a threatening letter: "your hands will shake too, one day".',
        portrait: '/crime-mystery/portraits/suit-man.webp',
        descriptor: 'MALE · 50s · RIVAL',
      },
      {
        name: 'Lata Zaveri',
        motive: 'Wife. The workshop\'s insurance and the house — but she loved him, by every account.',
        alibi: 'At her sister\'s 19:00–22:30 — sister + doorbell camera.',
        secret: 'Found her son\'s cigarette case in the workroom bin last week — said nothing.',
        portrait: '/crime-mystery/portraits/older-woman.webp',
        descriptor: 'FEMALE · 60s · WIFE',
      },
      {
        name: 'Arjun Mehta',
        motive: 'Estranged son. Fought bitterly over selling the workshop to developers — the inheritance dies with a sale.',
        alibi: 'Claims he was in Pune — on a ticket dated the day after the murder.',
        secret: 'Still visits the family farmhouse monthly — where the aconite grows wild.',
        portrait: '/crime-mystery/portraits/young-man.webp',
        descriptor: 'MALE · 20s · SON',
      },
    ],
    culprit: 'Arjun Mehta',
    solution:
      'Arjun Mehta\'s alibi is a ticket for the wrong day (cm-8); his fingerprints are on the wiped drawer he claims not to have touched in months (cm-11); aconite grows wild at the farmhouse he visits monthly (cm-9). The paste was applied 21:30–22:00 — after the apprentice\'s logged 21:09 exit (cm-4) — timed for the 21:30 loupe ritual the whole shop knew (cm-3); his untouched chai confirms he never got past it (cm-6). The rival was photographed toasting at 21:05 (cm-5), the wife on a doorbell camera (cm-7). A son who knew the ritual, the drawer, and the poison.',
  },

  /* ---------------- CASE 9 — hard, 12 clues ---------------- */
  {
    id: 'the-final-reel',
    title: 'The Final Reel',
    difficulty: 'hard',
    location: 'Film City · Night Shoot',
    intro:
      'Night shoot, Film City. Director Vikram "Vicky" Malhotra insisted on doing his own stunt for the "authentic shot" — and the stunt wire snapped at 23:05, cut 80% through with a serrated blade. Four people wanted him gone. The wire was cut between the 21:00 safety check and the 23:00 call time.',
    clues: [
      {
        id: 'fr-1',
        text: 'The stunt wire was cut 80% through with a serrated blade; it snapped at 23:05 under the director\'s weight.',
        split: 'both',
        card: 'report',
        label: 'THE WIRE',
      },
      {
        id: 'fr-2',
        text: 'The stunt coordinator logged a safety inspection of rig A at 21:00 — "all clear". The cut was made between 21:30 and 22:30.',
        split: 'a',
        card: 'note',
        label: 'THE INSPECTION',
      },
      {
        id: 'fr-3',
        text: 'Only the stunt team carries serrated rigging knives, signed out per person — the coordinator\'s knife was signed out all day.',
        split: 'b',
        card: 'report',
        label: 'THE KNIFE',
      },
      {
        id: 'fr-4',
        text: 'The lead actress\'s trailer door camera shows her entering at 22:05 and not leaving until 23:10.',
        split: 'a',
        card: 'note',
        label: 'THE TRAILER',
      },
      {
        id: 'fr-5',
        text: 'The producer\'s LA call logs show one continuous studio call 22:30–23:15 — verified by the studio end.',
        split: 'b',
        card: 'note',
        label: 'THE CALL',
      },
      {
        id: 'fr-6',
        text: 'The cinematographer was at camera village 21:45–23:10 reviewing dailies — the DIT confirms, with timestamps.',
        split: 'both',
        card: 'note',
        label: 'THE DAILIES',
      },
      {
        id: 'fr-7',
        text: 'The call sheet sent the junior AD off-site for coffee at 22:15 — eleven witnesses at the café confirm she never returned before 23:00.',
        split: 'a',
        card: 'note',
        label: 'THE COFFEE RUN',
      },
      {
        id: 'fr-8',
        text: 'The coordinator told two crew he was "checking rig B" from 21:30 to 22:30 — but rig B\'s log shows no inspection entry that night.',
        split: 'b',
        card: 'note',
        label: 'THE LIE',
      },
      {
        id: 'fr-9',
        text: 'Metal shavings matching the cut wire were found in the cuff of the coordinator\'s jacket.',
        split: 'a',
        card: 'report',
        label: 'THE SHAVINGS',
      },
      {
        id: 'fr-10',
        text: 'The cut was made from above — the cutter stood on the lighting rig, which needs the stunt team\'s harness key. The deputy\'s key never left its locker; only the coordinator\'s was in play.',
        split: 'b',
        card: 'report',
        label: 'THE HARNESS KEY',
      },
      {
        id: 'fr-11',
        text: 'The unsigned replacement contract was still in Vicky\'s trailer — the lead actress had motive, but the door camera clears her.',
        split: 'both',
        card: 'note',
        label: 'THE CONTRACT',
      },
      {
        id: 'fr-12',
        text: 'The coordinator\'s brother died in a Vicky-film stunt accident six years ago; he kept the newspaper clipping in his kit — and his kit was open beside rig A at 23:00.',
        split: 'a',
        card: 'note',
        label: 'THE CLIPPING',
      },
    ],
    suspects: [
      {
        name: 'Rhea Kapoor',
        motive: 'Lead actress. Vicky was replacing her — the unsigned contract sat in his trailer.',
        alibi: 'In her trailer 22:05–23:10 — door camera.',
        secret: 'Hired a lawyer to break her contract — she was going to walk, not kill.',
        portrait: '/crime-mystery/portraits/scarf-woman.webp',
        descriptor: 'FEMALE · 30s · ACTRESS',
      },
      {
        name: 'Karan Bedi',
        motive: 'Stunt coordinator. Vicky cut his safety budget and mocked him — and six years ago, Vicky\'s corner-cutting killed Karan\'s brother.',
        alibi: 'Claims he was checking rig B 21:30–22:30 — rig B\'s log shows no such inspection.',
        secret: 'He inspected rig A himself at 21:00 and logged "all clear" — the last hands on the wire.',
        portrait: '/crime-mystery/portraits/worker-man.webp',
        descriptor: 'MALE · 40s · COORDINATOR',
      },
      {
        name: 'Sameer Joshi',
        motive: 'Producer. The film was catastrophically over budget; Vicky\'s death triggers the completion-bond insurance.',
        alibi: 'On a continuous studio call 22:30–23:15 — verified at both ends.',
        secret: 'Quietly doubled the production insurance three weeks ago.',
        portrait: '/crime-mystery/portraits/suit-man.webp',
        descriptor: 'MALE · 50s · PRODUCER',
      },
      {
        name: 'Nikhil Rao',
        motive: 'Cinematographer. Vicky stole credit for his signature shot; screaming row that morning.',
        alibi: 'At camera village reviewing dailies 21:45–23:10 — DIT-confirmed.',
        secret: 'Told Vicky on set: "you\'ll pay for that." He meant at the awards.',
        portrait: '/crime-mystery/portraits/flatcap-man.webp',
        descriptor: 'MALE · 40s · CINEMATOGRAPHER',
      },
    ],
    culprit: 'Karan Bedi',
    solution:
      'Karan Bedi is the only suspect who survives elimination: Rhea\'s door camera (fr-4), Sameer\'s verified call (fr-5), Nikhil\'s timestamped dailies (fr-6) clear the others. Karan\'s "rig B" alibi has no log entry (fr-8), wire shavings were in his cuff (fr-9), his rigging knife was signed out all day (fr-3), the cut came from above where only his harness key could go (fr-10), and his dead brother\'s clipping sat in his open kit beside rig A (fr-12). He logged the wire "all clear" at 21:00 (fr-2) — then made sure it wasn\'t.',
  },
];

/** All playable cases: the 2 bank starters + the 7 authored here, in escalating order. */
export const ALL_CASES: CaseFile[] = [...BANK_CASES, ...NEW_CASES];

export function getMysteryCase(id: string): CaseFile | undefined {
  return ALL_CASES.find((c) => c.id === id);
}
