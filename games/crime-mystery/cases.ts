/* Crime Mystery case files — flagship bank.
 *
 * Imports the 2 starter cases from lib/content/cases.ts (read-only) and
 * authors 7 more with ESCALATING difficulty:
 *   easy   — cases 3-4 (5-6 clues, one clean chain, one red herring)
 *   medium — cases 5-6 (7-8 clues, alibis that need combining)
 *   hard   — cases 7-9 (10-12 clues, layered red herrings, tangled alibis)
 *
 * Fair-play rule (CONTRACT.md): the culprit must be uniquely deducible from
 * the UNION of all clues + suspects. Splits force the talking: every case
 * has >= 1 'a'-only and >= 1 'b'-only clue.
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
    intro:
      'Kala Ghoda Gallery, 11:40 PM. At the closing of the winter gala, Marco Reyes\' "Monsoon Bride" — insured for ₹2 crore — is gone from the east wall. No alarms, no broken glass, no forced entry. Four people stayed late. One of them carried a ₹2 crore canvas out of the loading dock.',
    clues: [
      {
        id: 'pa-1',
        text: 'No forced entry anywhere — the loading-dock door was opened with the correct keypad code.',
        split: 'both',
      },
      {
        id: 'pa-2',
        text: 'The dock code was changed that very morning. Only the curator was given the new code.',
        split: 'a',
      },
      {
        id: 'pa-3',
        text: 'A wine glass with fresh lipstick was abandoned on the loading dock. The artist never wears makeup, and the donor left the gala at 20:00 — her driver confirms it.',
        split: 'b',
      },
      {
        id: 'pa-4',
        text: 'The cameras went dark from 21:10 to 21:25. The guard\'s log reads "all clear, 21:15" — written from the monitor room, where he was later found asleep.',
        split: 'a',
      },
      {
        id: 'pa-5',
        text: 'Cadmium-red paint flakes — the stolen painting\'s signature pigment — were found on the curator\'s gala shoes.',
        split: 'b',
      },
    ],
    suspects: [
      {
        name: 'Vera Kaur',
        motive: 'Curator of the gallery; quietly drowning in gambling debt, and the insurance paperwork was already on her desk.',
        alibi: 'Says she was in her office doing inventory from 21:00 to 21:30 — no witness.',
        secret: 'She changed the dock keypad code herself that morning and told no one the new number.',
      },
      {
        name: 'Marco Reyes',
        motive: 'The exhibiting artist; furious that the gallery refused to return his early works, he once threatened to "take back what\'s mine".',
        alibi: 'At the bar with patrons from 21:00 to 22:00 — a dozen witnesses.',
        secret: 'He never learned the loading-dock code, old or new.',
      },
      {
        name: 'Tommy Briggs',
        motive: 'Night security guard; three months behind on rent and the gallery just cut his overtime.',
        alibi: 'Logged "all clear" at 21:15 — from the monitor room, where he was napping.',
        secret: 'He disabled the camera loop himself to sneak his nap — then lied about it in the log.',
      },
      {
        name: 'Helena Voss',
        motive: 'Wealthy donor; none that anyone can find — she adored the painting and the gallery.',
        alibi: 'Left the gala at 20:00; her driver and the valet both confirm.',
        secret: 'She has been quietly buying up Marco\'s early works for years.',
      },
    ],
    culprit: 'Vera Kaur',
    solution:
      'Vera Kaur is the only person who knew the new dock code (changed that morning, told to no one else). The "fresh lipstick" glass on the dock is hers — Marco never wears makeup and Helena left at 20:00 — and cadmium-red flakes from the stolen canvas were on her gala shoes. Tommy\'s camera blackout was a napping guard\'s cover-up, not a conspiracy. Means, opportunity, and paint on her shoes.',
  },

  /* ---------------- CASE 4 — easy, 6 clues ---------------- */
  {
    id: 'the-midnight-baker',
    title: 'The Midnight Baker',
    difficulty: 'easy',
    intro:
      '3:12 AM. "Crumb & Craft" bakery on MG Road is a blackened shell. The fire brigade calls it arson — kerosene, poured by the flour storeroom. The owner swears it was an accident. Four people had keys to the back door. One of them wanted the building gone.',
    clues: [
      {
        id: 'mb-1',
        text: 'Kerosene traces by the flour storeroom — the fire was set deliberately, around 3:00 AM.',
        split: 'both',
      },
      {
        id: 'mb-2',
        text: 'The fire insurance was doubled six weeks ago. Only the two partners could authorize it — and the owner says she never signed.',
        split: 'a',
      },
      {
        id: 'mb-3',
        text: 'The business partner claims he was at a 24-hour gym all night. His keycard shows no entry — the alibi is a lie.',
        split: 'b',
      },
      {
        id: 'mb-4',
        text: 'Size-11 floury footprints lead from the storeroom to the back door. The partner wears size 11; the ex-employee wears size 6.',
        split: 'a',
      },
      {
        id: 'mb-5',
        text: 'The back-door deadbolt was locked from the inside after the fire started — someone locked up behind themselves with a key.',
        split: 'b',
      },
      {
        id: 'mb-6',
        text: 'The ex-employee\'s call-center supervisor confirms she was on live calls from 1:00 to 4:00 AM.',
        split: 'both',
      },
    ],
    suspects: [
      {
        name: 'Sanna Qureshi',
        motive: 'Head baker and co-owner; none — the bakery was her life\'s work, and she was asleep at home.',
        alibi: 'Home asleep; her husband confirms, and her phone never left the house.',
        secret: 'The ovens were due a safety refit she could not afford — she feared an inspection.',
      },
      {
        name: 'Rahul Mehta',
        motive: 'Business partner; wanted to sell the building to developers for ₹4 crore, but Sanna refused to sign.',
        alibi: 'Claims the 24-hour gym — keycard records say otherwise.',
        secret: 'His phone location pings him two streets from the bakery at 2:40 AM.',
      },
      {
        name: 'Asha Devi',
        motive: 'Ex-employee, fired last month after a shouting match with Sanna; swore revenge.',
        alibi: 'Night shift at a call center — supervisor-confirmed, 1:00 to 4:00 AM.',
        secret: 'She never returned her spare back-door key.',
      },
      {
        name: 'Kabir Anand',
        motive: 'Delivery driver; Sanna docked his pay twice — petty, and hardly arson-sized.',
        alibi: 'On his delivery route; van GPS logs him across town at 3:00 AM.',
        secret: 'He naps in his van behind the bakery between runs — and heard nothing that night.',
      },
    ],
    culprit: 'Rahul Mehta',
    solution:
      'Rahul Mehta doubled the insurance without Sanna\'s signature, lied about the gym (no keycard entry), left size-11 footprints from the storeroom, and locked the deadbolt behind him with his partner\'s key. Asha had motive but a supervisor-confirmed alibi; Kabir was across town. A partner who wanted to sell, an insurance payout, and flour on his shoes.',
  },

  /* ---------------- CASE 5 — medium, 7 clues ---------------- */
  {
    id: 'the-poisoned-podcast',
    title: 'The Poisoned Podcast',
    difficulty: 'medium',
    intro:
      'Riya Sen, host of the hit livestream "Night Frequency", collapses 40 minutes into the show — a fast-acting sedative in her water bottle. The studio was locked during broadcast; only four people were inside. The chat watched it happen live.',
    clues: [
      {
        id: 'pp-1',
        text: 'Riya collapsed 40 minutes into the live stream. The hospital found a fast-acting sedative in her system — slipped into her water bottle.',
        split: 'both',
      },
      {
        id: 'pp-2',
        text: 'The control-room camera shows the producer refilling Riya\'s bottle during the ad break at the 25-minute mark.',
        split: 'a',
      },
      {
        id: 'pp-3',
        text: 'The co-host never left his chair — the stream video shows him on mic continuously from minute 0 until the collapse.',
        split: 'b',
      },
      {
        id: 'pp-4',
        text: 'The sponsor was active in the live chat under his verified handle at the exact minute Riya drank from the bottle.',
        split: 'a',
      },
      {
        id: 'pp-5',
        text: 'The sedative is prescription-only. The producer\'s bag held an empty blister pack with her name on the pharmacy label — prescribed after her surgery.',
        split: 'b',
      },
      {
        id: 'pp-6',
        text: 'The ex\'s bookshop reading had 40+ attendees and a timestamped signed poster — she was across town all evening.',
        split: 'both',
      },
      {
        id: 'pp-7',
        text: 'The bottle was Riya\'s own, brought from home — but its cap seal was already broken before the show. Only someone inside the studio could have opened it.',
        split: 'a',
      },
    ],
    suspects: [
      {
        name: 'Dev Khanna',
        motive: 'Co-host; Riya was about to fire him, and his contract had a brutal non-compete clause.',
        alibi: 'On mic the whole stream — visible on camera, minute 0 to the collapse.',
        secret: 'He knew about the firing and had already recorded a farewell episode in secret.',
      },
      {
        name: 'Nina Rao',
        motive: 'Producer; Riya took credit for Nina\'s segments for two years, and the network just offered Nina Riya\'s slot.',
        alibi: 'In the control room — the camera shows her there, refilling the bottle.',
        secret: 'The sedative prescription in her bag is real — post-surgery, and she "lost" half the strip last week.',
      },
      {
        name: 'Arjun Sethi',
        motive: 'Sponsor; Riya was going to expose his energy drink\'s fake "clinical trials" in tomorrow\'s episode.',
        alibi: 'Typing in the live chat from his office at the minute she drank — verified handle, IP-confirmed.',
        secret: 'He sent Riya a furious email an hour before the show: "you\'ll regret this".',
      },
      {
        name: 'Tara Iyer',
        motive: 'Riya\'s ex and former co-host; a bitter public split last year.',
        alibi: 'Bookshop reading across town — 40 witnesses and a timestamped poster.',
        secret: 'She texted Riya "you\'ll regret this" last week — about the split, not the show.',
      },
    ],
    culprit: 'Nina Rao',
    solution:
      'Nina Rao is the only person with means, motive, and opportunity combined: caught on camera refilling the bottle at the 25-minute mark, carrying her own prescription sedative, and about to inherit Riya\'s slot. Dev never left his chair, Arjun was provably typing in chat from his office, and Tara was across town. The "helpful refill" during the ad break was the murder.',
  },

  /* ---------------- CASE 6 — medium, 8 clues ---------------- */
  {
    id: 'the-lighthouse-keeper',
    title: 'The Lighthouse Keeper',
    difficulty: 'medium',
    intro:
      'Dawn on Blackrock Island. Old keeper Elias Vane is found at the foot of the lighthouse stairs, neck broken. A storm raged from 23:00 to 04:00 — no boat could land after midnight. Four people were on the island. The stairs don\'t lie, but people do.',
    clues: [
      {
        id: 'lh-1',
        text: 'Elias died in a fall down the lighthouse stairs. The storm raged 23:00–04:00; no boat could land after midnight.',
        split: 'both',
      },
      {
        id: 'lh-2',
        text: 'The lamp-room log shows entries in the assistant\'s handwriting until 02:00 — yet she claims she was asleep in her cottage from midnight.',
        split: 'a',
      },
      {
        id: 'lh-3',
        text: 'The ornithologist\'s time-lapse (one frame per 10 minutes) shows the lamp room empty from 01:00 to 03:00 — and a figure on the gallery stairs at 02:10.',
        split: 'b',
      },
      {
        id: 'lh-4',
        text: 'The captain\'s deckhand — his own nephew — admits he was below deck asleep from 01:00 to 04:00. The captain\'s alibi has a three-hour hole.',
        split: 'a',
      },
      {
        id: 'lh-5',
        text: 'The estranged son\'s rowboat was found swamped on the far beach — he rowed over and left before the storm peaked, around 23:30.',
        split: 'b',
      },
      {
        id: 'lh-6',
        text: 'Elias\'s oilskin coat was hanging dry in the lamp room — he never went out into the storm that night.',
        split: 'both',
      },
      {
        id: 'lh-7',
        text: 'A woman\'s hair ribbon — the assistant wears one every single day — was snagged on the stair rail at the top of the fatal flight.',
        split: 'a',
      },
      {
        id: 'lh-8',
        text: 'The supply crates marked "birdseed" held untaxed liquor — the captain\'s smuggling secret — but the customs seals were intact: the crates were never opened that night.',
        split: 'b',
      },
    ],
    suspects: [
      {
        name: 'Mara Voss',
        motive: 'Assistant keeper; skimming supply money for a year, and Elias had just found the shortfall — he was going to report her.',
        alibi: 'Claims she slept in her cottage from midnight — the lamp log disagrees.',
        secret: 'The "midnight relief" entries in the log are in her handwriting, not Elias\'s.',
      },
      {
        name: 'Capt. Henrik Dahl',
        motive: 'Supply-boat captain; Elias threatened to report his liquor smuggling to the port authority.',
        alibi: 'On his anchored boat — but his only witness, his nephew, was asleep 01:00–04:00.',
        secret: 'The "birdseed" crates on his boat are untaxed liquor.',
      },
      {
        name: 'Dr. Lena Petrova',
        motive: 'Visiting ornithologist; none — she argued with Elias about the light disturbing nesting terns, loudly, once.',
        alibi: 'In her cottage; her field notes are timestamped hourly through the night.',
        secret: 'Her time-lapse camera photographed the lighthouse all night — she didn\'t realize what it caught.',
      },
      {
        name: 'Jonas Pike',
        motive: 'Elias\'s estranged son; stood to inherit the keeper\'s cottage and its land.',
        alibi: 'Claims he never came to the island — his swamped rowboat says otherwise.',
        secret: 'He rowed over that night to reconcile; they argued, and he left before the storm peaked.',
      },
    ],
    culprit: 'Mara Voss',
    solution:
      'Mara Voss lied about sleeping — her own handwriting fills the lamp log until 02:00, her daily hair ribbon was snagged at the top of the fatal stairs, and the time-lapse caught a figure there at 02:10 while the lamp room stood empty. Jonas left before the storm peaked; the captain\'s smuggling crates stayed sealed all night. Elias confronted her about the skimmed supply money — and she pushed him down the stairs she tended.',
  },

  /* ---------------- CASE 7 — hard, 10 clues ---------------- */
  {
    id: 'the-masquerade-murder',
    title: 'The Masquerade Murder',
    difficulty: 'hard',
    intro:
      'Midnight at the Raheja masquerade ball. Industrialist Vikram Raheja raises his champagne for the toast — and never lowers it. Cyanide in the flute, and only his flute. Two hundred masked guests, five people with reason to want him quiet, and a killer who knew exactly which glass he would take.',
    clues: [
      {
        id: 'mm-1',
        text: 'Vikram died of cyanide in his champagne between 23:15 and 23:30. His was the only poisoned glass on the tray.',
        split: 'both',
      },
      {
        id: 'mm-2',
        text: 'The poisoned flute had a small fresh chip on its base — the killer marked it. The chip was cut within hours of the ball.',
        split: 'a',
      },
      {
        id: 'mm-3',
        text: 'Vikram always took the leftmost flute from any tray — a habit everyone in the family knew.',
        split: 'b',
      },
      {
        id: 'mm-4',
        text: 'The wife\'s dance partner confirms they danced 23:00–23:40 — but adds that she slipped away to the champagne table alone at 23:05.',
        split: 'a',
      },
      {
        id: 'mm-5',
        text: 'The son\'s terrace friends confirm him there 23:00–23:30, and his phone location agrees to the minute.',
        split: 'b',
      },
      {
        id: 'mm-6',
        text: 'The event planner\'s fireworks crew confirm she was on the east lawn from 22:50 until midnight — she never came inside.',
        split: 'a',
      },
      {
        id: 'mm-7',
        text: 'The chef never left the kitchen (three staff swear it), and the champagne was poured tableside by waiters — the kitchen never touched the flutes.',
        split: 'b',
      },
      {
        id: 'mm-8',
        text: 'The secretary stayed at the coat check all night, attendant-confirmed — and the spare mask in her bag is clean, no residue.',
        split: 'both',
      },
      {
        id: 'mm-9',
        text: 'A torn corner of the wife\'s masquerade invitation was found in the catering crate with the chipped flutes — she was at the setup that afternoon.',
        split: 'a',
      },
      {
        id: 'mm-10',
        text: 'The wife was seen at the catering setup at 16:00, "choosing the champagne" — hours before any guest arrived.',
        split: 'b',
      },
    ],
    suspects: [
      {
        name: 'Anaya Raheja',
        motive: 'Wife; a divorce would leave her with nothing, but a widow inherits everything — and Vikram\'s lawyers were drafting papers.',
        alibi: 'Dancing 23:00–23:40 — except for one unaccounted slip to the champagne table at 23:05.',
        secret: 'She is having an affair with the event planner — and Vikram had just hired a photographer to prove it.',
      },
      {
        name: 'Kabir Raheja',
        motive: 'Son; cut out of the will last month after a blazing row over the family company.',
        alibi: 'On the terrace with friends 23:00–23:30 — three witnesses plus phone location.',
        secret: 'He hired a private investigator to follow his father — the file is full of the affair.',
      },
      {
        name: 'Saira Khan',
        motive: 'Event planner — and Anaya\'s lover; Vikram threatened to expose the affair and ruin her business.',
        alibi: 'Running the midnight fireworks on the east lawn, 22:50 to midnight — full crew confirms.',
        secret: 'The affair with Anaya — the worst-kept secret of the ball, and Vikram\'s leverage over both of them.',
      },
      {
        name: 'Chef Auguste Dubois',
        motive: 'Caterer; Vikram\'s savage review closed his last restaurant in Paris.',
        alibi: 'In the kitchen all evening — three staff confirm he never left the pass.',
        secret: 'He once spat in Vikram\'s soup at a private dinner. Petty revenge, not murder.',
      },
      {
        name: 'Meera Krishnan',
        motive: 'Secretary; discovered Vikram forging documents and was going to be fired on Friday for "asking questions".',
        alibi: 'At the coat check all night — the attendant confirms she never left her post.',
        secret: 'She pocketed Vikram\'s spare "Raven" mask as a souvenir. It is clean.',
      },
    ],
    culprit: 'Anaya Raheja',
    solution:
      'Anaya Raheja marked a flute at the afternoon setup (her invitation corner in the chipped-flute crate, seen "choosing the champagne" at 16:00), knew Vikram would take the leftmost glass — a family habit — and slipped the cyanide in during her 23:05 absence from the dance floor, before the waiter served the tray at 23:10. Kabir was on the terrace, Saira on the east lawn, the chef in the kitchen, Meera at coat check — every other suspect is pinned to a witnessed alibi. A marked glass, a known habit, and five unwitnessed minutes.',
  },

  /* ---------------- CASE 8 — hard, 11 clues ---------------- */
  {
    id: 'the-clockmakers-last-tick',
    title: "The Clockmaker's Last Tick",
    difficulty: 'hard',
    intro:
      'Master clockmaker Ghanshyam "Guru" Zaveri is found slumped over his workbench at 22:40, surrounded by a hundred ticking clocks. Aconite poisoning — absorbed through the skin around his right eye. His loupe is the only poisoned object in the shop. Five people knew his nightly ritual.',
    clues: [
      {
        id: 'cm-1',
        text: 'Guru died of aconite poisoning around 22:00; the poison entered through the skin around his right eye.',
        split: 'both',
      },
      {
        id: 'cm-2',
        text: 'His loupe\'s eyecup tested positive for aconite paste — the only poisoned object in the entire shop.',
        split: 'a',
      },
      {
        id: 'cm-3',
        text: 'Guru\'s iron ritual: loupe inspection at 21:30 sharp, chai at 21:45. Everyone in the shop knew it by heart.',
        split: 'b',
      },
      {
        id: 'cm-4',
        text: 'The apprentice admits she returned at 21:02 for her forgotten tools; the bell log shows entry 21:02, exit 21:09. The aconite paste was still tacky at 22:30 — applied between 21:30 and 22:00, after she left.',
        split: 'a',
      },
      {
        id: 'cm-5',
        text: 'The rival was at a dealers\' dinner 19:00–23:00 — twelve witnesses, plus a timestamped photo of him toasting at 21:05.',
        split: 'b',
      },
      {
        id: 'cm-6',
        text: 'The debt collector was seen outside at 20:30 while the shop lights were on and Guru was alive; his phone location puts him across town by 21:00.',
        split: 'both',
      },
      {
        id: 'cm-7',
        text: 'The wife was at her sister\'s home 19:00–22:30 — confirmed by the sister and her doorbell camera.',
        split: 'a',
      },
      {
        id: 'cm-8',
        text: 'The son\'s Pune train ticket — his whole alibi — is dated the day AFTER the murder. It is fabricated.',
        split: 'b',
      },
      {
        id: 'cm-9',
        text: 'Aconite grows wild behind the Zaveri family farmhouse, where the son grew up and still visits every month.',
        split: 'a',
      },
      {
        id: 'cm-10',
        text: 'The workbench drawer where the loupe was kept had been wiped clean — only the drawer, not the surrounding tools. Someone hiding prints.',
        split: 'both',
      },
      {
        id: 'cm-11',
        text: 'The son\'s fingerprints are on the wiped workbench drawer — though he claims he hasn\'t visited the shop in months.',
        split: 'b',
      },
    ],
    suspects: [
      {
        name: 'Priya Nair',
        motive: 'Apprentice; Guru refused to name her his successor and threatened to blacklist her if she opened her own shop.',
        alibi: 'Left at 18:00, returned 21:02–21:09 for her tools — bell-logged, before the poison was applied.',
        secret: 'She took a commission behind Guru\'s back last month — and he somehow found out.',
      },
      {
        name: 'Farhan Sheikh',
        motive: 'Rival clockmaker; Guru\'s testimony in a forgery case destroyed his reputation.',
        alibi: 'Dealers\' dinner 19:00–23:00 — twelve witnesses and a 21:05 photograph.',
        secret: 'He wrote Guru a threatening letter last month: "your hands will shake too, one day".',
      },
      {
        name: 'Lata Zaveri',
        motive: 'Wife; the workshop\'s insurance and the house — but she loved the old man, by every account.',
        alibi: 'At her sister\'s 19:00–22:30 — sister-confirmed, doorbell camera agrees.',
        secret: 'She knew the apprentice came back that night — and said nothing, to protect the girl.',
      },
      {
        name: 'Devang Prasad',
        motive: 'Debt collector; Guru owed him ₹5 lakh — and dead men pay no debts, which he knew perfectly well.',
        alibi: 'Seen outside at 20:30, across town by 21:00 — phone-location confirmed.',
        secret: 'He was coming to threaten Guru\'s hands — "the hands that owe me" — but lost his nerve at the door.',
      },
      {
        name: 'Arjun Mehta',
        motive: 'Estranged son; fought bitterly with Guru over selling the workshop to developers — the inheritance dies with a sale.',
        alibi: 'Claims he was in Pune — on a train ticket dated the day after the murder.',
        secret: 'He still visits the family farmhouse monthly — where the aconite grows wild.',
      },
    ],
    culprit: 'Arjun Mehta',
    solution:
      'Arjun Mehta\'s alibi is a fabricated ticket for the wrong day; his fingerprints are on the wiped workbench drawer he claims not to have touched in months; and aconite grows wild at the farmhouse he visits monthly. The paste was applied 21:30–22:00 — after the apprentice\'s logged 21:09 exit — timed for Guru\'s 21:30 loupe ritual, which the whole shop knew. The rival was photographed toasting at 21:05, the wife was on a doorbell camera, and the debt collector needed Guru alive. A son who knew the ritual, the drawer, and the poison.',
  },

  /* ---------------- CASE 9 — hard, 12 clues ---------------- */
  {
    id: 'the-final-reel',
    title: 'The Final Reel',
    difficulty: 'hard',
    intro:
      'Night shoot, Film City. Director Vikram "Vicky" Malhotra insisted on doing his own stunt for the "authentic shot" — and the stunt wire snapped at 23:05, cut 80% through with a serrated blade. Five people wanted him gone. The wire was cut between the 21:00 safety check and the 23:00 call time.',
    clues: [
      {
        id: 'fr-1',
        text: 'The stunt wire was cut 80% through with a serrated blade; it snapped at 23:05 under the director\'s weight.',
        split: 'both',
      },
      {
        id: 'fr-2',
        text: 'The stunt coordinator logged a safety inspection of rig A at 21:00 — "all clear". The cut was made between 21:30 and 22:30.',
        split: 'a',
      },
      {
        id: 'fr-3',
        text: 'Only the stunt team carries serrated rigging knives, signed out per person — the coordinator\'s knife was signed out all day.',
        split: 'b',
      },
      {
        id: 'fr-4',
        text: 'The lead actress\'s trailer door camera shows her entering at 22:05 and not leaving until 23:10.',
        split: 'a',
      },
      {
        id: 'fr-5',
        text: 'The producer\'s LA call logs show one continuous studio call 22:30–23:15 — verified by the studio end.',
        split: 'b',
      },
      {
        id: 'fr-6',
        text: 'The cinematographer was at camera village 21:45–23:10 reviewing dailies — the DIT confirms, with timestamps.',
        split: 'both',
      },
      {
        id: 'fr-7',
        text: 'The junior AD\'s café receipt is stamped 22:31, from a café 15 minutes from the set — she could not have reached the rig in the cut window.',
        split: 'a',
      },
      {
        id: 'fr-8',
        text: 'The coordinator told two crew members he was "checking rig B" from 21:30 to 22:30 — but rig B\'s log shows no inspection entry that night.',
        split: 'b',
      },
      {
        id: 'fr-9',
        text: 'Metal shavings matching the cut wire were found in the cuff of the coordinator\'s jacket.',
        split: 'a',
      },
      {
        id: 'fr-10',
        text: 'The cut was made from above — the cutter stood on the lighting rig, which needs the stunt team\'s harness key. Only the coordinator and his deputy held keys that night; the deputy was on rig B all evening, crew-confirmed.',
        split: 'b',
      },
      {
        id: 'fr-11',
        text: 'The unsigned replacement contract was still in Vicky\'s trailer — the lead actress had motive, but the door camera clears her.',
        split: 'both',
      },
      {
        id: 'fr-12',
        text: 'The coordinator\'s brother died in a Vicky-film stunt accident six years ago; he kept the newspaper clipping in his kit — and his kit was open beside rig A at 23:00.',
        split: 'a',
      },
    ],
    suspects: [
      {
        name: 'Rhea Kapoor',
        motive: 'Lead actress; Vicky was replacing her with a younger star — the new contract sat unsigned in his trailer.',
        alibi: 'In her trailer 22:05–23:10 — door camera, no exits.',
        secret: 'She hired a lawyer to break her contract — she was going to walk, not kill.',
      },
      {
        name: 'Karan Bedi',
        motive: 'Stunt coordinator; Vicky cut his safety budget and mocked him publicly — and six years ago, Vicky\'s corner-cutting killed Karan\'s brother on a stunt.',
        alibi: 'Claims he was checking rig B 21:30–22:30 — rig B\'s log shows no such inspection.',
        secret: 'He inspected rig A himself at 21:00 and logged "all clear" — the last hands on the wire before it was cut.',
      },
      {
        name: 'Sameer Joshi',
        motive: 'Producer; the film was catastrophically over budget, and Vicky\'s death triggers the completion-bond insurance.',
        alibi: 'On a continuous studio call 22:30–23:15 — verified at both ends.',
        secret: 'He quietly doubled the production insurance three weeks ago.',
      },
      {
        name: 'Nikhil Rao',
        motive: 'Cinematographer; Vicky stole credit for his signature shot style, and they had a screaming row that morning in front of the crew.',
        alibi: 'At camera village reviewing dailies 21:45–23:10 — DIT-confirmed with timestamps.',
        secret: 'He told Vicky on set: "you\'ll pay for that." He meant at the awards.',
      },
      {
        name: 'Roshni Verma',
        motive: 'Junior AD; Vicky harassed her for months, and HR buried her complaint.',
        alibi: 'Fetching coffee off-site — café receipt 22:31, fifteen minutes from the set.',
        secret: 'The buried complaint letter — she kept a copy, and a lawyer\'s card.',
      },
    ],
    culprit: 'Karan Bedi',
    solution:
      'Karan Bedi is the only suspect who survives every elimination: Rhea\'s door camera, Sameer\'s verified call, Nikhil\'s timestamped dailies, and Roshni\'s 22:31 café receipt fifteen minutes away all clear the others. Karan\'s "rig B" alibi has no log entry, wire shavings were in his jacket cuff, his rigging knife was signed out all day, the cut came from above where only his harness key could go, and his dead brother\'s clipping sat in his open kit beside rig A. He logged the wire "all clear" at 21:00 — then made sure it wasn\'t.',
  },
];

/** All playable cases: the 2 bank starters + the 7 authored here, in escalating order. */
export const ALL_CASES: CaseFile[] = [...BANK_CASES, ...NEW_CASES];

export function getMysteryCase(id: string): CaseFile | undefined {
  return ALL_CASES.find((c) => c.id === id);
}
