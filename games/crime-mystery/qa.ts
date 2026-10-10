/* Crime Mystery interrogations + hint extras.
 *
 * Every suspect in every case gets 4 scripted Q&A pairs. Question buttons
 * reveal answers with a typewriter effect. Culprits NEVER confess outright —
 * their answers carry subtle tells (deflection, over-specific detail,
 * knowledge they shouldn't have) that reward close reading.
 *
 * HINT_EXTRAS: bonus 'both' clue (first spent token) + nudges (later tokens).
 */

import type { Clue } from '../../lib/content/cases';
import type { HintExtras, QA } from './types';

export const INTERROGATIONS: Record<string, Record<string, QA[]>> = {
  /* ================= CASE 1: The Empty Theater ================= */
  'quiet-vault': {
    'Victor Kane': [
      {
        q: 'Where were you that night?',
        a: 'Home. All evening. Alone, reading. A quiet night in — ask my bookshelf.',
      },
      {
        q: 'This comp ticket — Section 12, Row C, in your name, redeemed 21:58?',
        a: 'I... gave it to a friend. Can\'t recall who. I give away tickets all the time — it\'s the theater business.',
      },
      {
        q: 'A man in a trench coat bought coffee across the street at 22:40. In a hurry.',
        a: 'Plenty of trench coats in this city, detective. It\'s practically a uniform. Was it MY coat? Everyone\'s coat looks the same at night.',
      },
      {
        q: 'Marcus got a 40-second call at 22:47 — from a burner bought with cash that afternoon.',
        a: 'I don\'t own a burner phone. Check my records — my personal phone never called him that night. You\'re chasing shadows.',
      },
    ],
    'Lena Voss': [
      {
        q: 'Marcus was replacing you next season.',
        a: 'He told me at dinner. I cried into my soup, detective — and then I went on stage and gave the performance of my life. Two hundred people watched me do it.',
      },
      {
        q: 'Where were you at 23:12?',
        a: 'Taking my bow. The second act ended 23:05, the applause ran long. Ask anyone in Section 12 — front row, they\'ll remember.',
      },
      {
        q: 'Did you see Victor that night?',
        a: 'I saw half the city that night — it\'s a theater. Victor? He avoids premieres since the restaurant failed. Said theaters remind him of debts.',
      },
      {
        q: 'The film offer in Mumbai — is that why you weren\'t afraid of being replaced?',
        a: 'Exactly. Marcus replacing me was an inconvenience, not a tragedy. I was already halfway out the stage door.',
      },
    ],
    'Tommy Riggs': [
      {
        q: 'Blue wool fibers from your uniform are on the victim\'s coat.',
        a: 'Intermission! He brushed past me at the lobby doors around nine — I remember, he dropped his program. I never left the lobby after that, the cameras will show you.',
      },
      {
        q: 'You were fired last month.',
        a: 'For the tip jar. Stupid. The head usher took pity — rehired me off the books, tonight of all nights. If the office finds out I\'m finished, so please —',
      },
      {
        q: 'Did you see anyone go to the rear exit?',
        a: 'The lobby was mine all night, detective. Nobody passed me going back there after the second act started. Whoever went out the rear didn\'t come through me.',
      },
      {
        q: 'What did you hear around 23:12?',
        a: 'Applause. The curtain call was still going. Then nothing — then the screaming from the alley. I ran with everyone else.',
      },
    ],
    'Sam Okafor': [
      {
        q: 'Three months\' back pay. That\'s a motive.',
        a: 'It\'s an annoyance. I\'ve been owed before — you don\'t kill the man who signs the checks, detective, you outlive him.',
      },
      {
        q: 'Those lockpick gouges on the rear door — professional opinion?',
        a: 'An insult, that\'s what. Clumsy gouges, wrong angle, no finesse. A child with a screwdriver. Whoever did that never picked a lock in their life — and I would know.',
      },
      {
        q: 'Where were you at 23:12?',
        a: 'Striking the set with the crew — three of them will tell you. I didn\'t leave the stage until half past eleven.',
      },
      {
        q: 'You did time for burglary. As a locksmith.',
        a: 'Two years, served. That\'s why the gouges offend me — people look at me. But a real locksmith doesn\'t leave marks, detective. That door was butchered by an amateur playing burglar.',
      },
    ],
  },

  /* ================= CASE 2: Midnight Express ================= */
  'midnight-express': {
    'Ava D\'Souza': [
      {
        q: 'Where were you 22:00–23:00?',
        a: 'The dining car, darling, the whole time. The waiter remembers me — I sent back the soup twice. Ask him, ask the tables around me.',
      },
      {
        q: 'Your monogrammed scarf was inside the ventilator shaft.',
        a: 'My scarf was STOLEN from my berth that evening! I said nothing — imagine the scandal, a heiress reporting a stolen scarf while a man dies. Someone wanted it found there.',
      },
      {
        q: 'Rustomji was about to expose your counterfeit diamonds.',
        a: 'He was about to TRY. My lawyers were ready, my papers were clean. I wanted him discredited in court, detective — not dead in a berth.',
      },
      {
        q: 'Did you know the conductor?',
        a: 'I know porters from conductors the way I know soup from consommé — barely. He never spoke to me. Why do you ask about HIM?',
      },
    ],
    'Imran Qureshi': [
      {
        q: 'A thread from your uniform is on the ventilator screws.',
        a: 'I serviced that vent at 21:00 — it\'s in my work log! Rattling grille, passenger complaint. I tightened the screws myself, an hour before anything happened.',
      },
      {
        q: 'You served the victim\'s tea at 22:00.',
        a: 'Plain tea, from the pantry urn, in front of the attendant. He was alive and drinking it at half ten — the conductor saw him. The tea was innocent.',
      },
      {
        q: 'Rustomji\'s company sacked your father.',
        a: 'Years ago. My father made his peace; I make the beds. Do I like the Rustomjis? No. Did I gas a man through a vent? I don\'t even know what cyanide smells like.',
      },
      {
        q: 'Did you see the conductor near berth B-14?',
        a: 'He\'s everywhere — it\'s his train. Around quarter past ten? I was two coaches down. Ask the attendant, she tracks us all.',
      },
    ],
    'Dr. Arvind Sen': [
      {
        q: 'You carry cyanide antidote kits.',
        a: 'Because I once watched a poisoning victim die while I fumbled, detective. Never again. The kits are guilt, not equipment.',
      },
      {
        q: 'Where were you at 22:15?',
        a: 'Two berths down, treating an asthma attack — the patient\'s wife held the lamp. Ask her. I was saving a life while someone was taking one.',
      },
      {
        q: 'Rustomji cost you a hospital post.',
        a: 'His testimony, yes — a decade ago. I rebuilt my practice. Revenge has a shelf life, and mine expired years ago.',
      },
      {
        q: 'Bitter almonds — you\'d recognize the smell instantly.',
        a: 'Any doctor would. When they called me to B-14, I knew before I knelt. But knowing the smell and making the vapor are different arts.',
      },
    ],
    'R. Yadav': [
      {
        q: 'Where were you 22:00–22:30?',
        a: 'On rounds. The train doesn\'t run itself, detective — tickets, berths, passengers. I was... around. You know how it is.',
      },
      {
        q: 'Your master-key log shows the vent panel opened at 22:15.',
        a: 'The log — hmm. I check panels all the time. Rattling, dust, passengers complain. It\'s routine. Probably routine.',
      },
      {
        q: 'Only YOU carry that key.',
        a: '...The spare is in the office. Anyone could — no. Look, I opened many panels that night. It\'s my job to open panels.',
      },
      {
        q: 'Rustomji\'s company denied your injury claim.',
        a: 'Paperwork. Denied, appealed, denied again. My pension died in a filing cabinet. But I\'m a railway man, twenty years — I don\'t gas passengers through vents. Ask anyone.',
      },
    ],
  },

  /* ================= CASE 3: The Painted Alibi ================= */
  'the-painted-alibi': {
    'Vera Kaur': [
      {
        q: 'Where were you 21:00–21:30?',
        a: 'In my office, doing inventory. Alone, yes. A curator\'s life is paperwork, detective, not glamour.',
      },
      {
        q: 'Who knew the new dock code?',
        a: 'Only me. I changed it that morning — standard rotation. I told no one. I certainly didn\'t write it down anywhere.',
      },
      {
        q: 'Cadmium-red flakes on your gala shoes — the Bride\'s pigment.',
        a: 'Cadmium red? That\'s... that\'s the Bride\'s pigment. I must have brushed against the wall during hanging. We all handle the art, detective — it\'s a gallery.',
      },
      {
        q: 'A wine glass with fresh lipstick was left on the loading dock.',
        a: 'A woman maintains herself. What does my lipstick have to do with — is there a glass? Someone left a glass on the dock? I never went near the dock.',
      },
    ],
    'Marco Reyes': [
      {
        q: 'You threatened to "take back what\'s mine."',
        a: 'Words, detective! Artists threaten the weather. My early works rot in their storage and it sickens me — but I was at the bar all night, ask anyone.',
      },
      {
        q: 'Do you wear makeup?',
        a: 'Never. Paint under my nails, yes — makeup, no. Why ask about makeup at a time like this?',
      },
      {
        q: 'Did you know the dock code?',
        a: 'The old one, maybe, from years ago. The new one? Vera changes it like exhibitions. Nobody tells the artist anything.',
      },
      {
        q: 'What do you make of the theft?',
        a: 'An inside job, obviously. No alarms, no force, the code. Someone who belongs here carried my Bride out like a coat. It makes me want to weep.',
      },
    ],
    'Tommy Briggs': [
      {
        q: 'Your log says "all clear, 21:15." The cameras were dark.',
        a: 'I... may have dozed off. Twenty minutes. I wrote the log when I woke — standard entries, standard times. I saw nothing because the monitors were dark!',
      },
      {
        q: 'You disabled the camera loop yourself.',
        a: 'To nap in peace! Not to rob the place! Do I look like an art thief? I can\'t tell a Monet from a menu.',
      },
      {
        q: 'Did you hear the dock door?',
        a: 'Nothing. The monitor room is soundproofed and I was — asleep. Whoever used the dock knew the code and moved quietly.',
      },
      {
        q: 'Three months behind on rent, Tommy.',
        a: 'And I\'ll be four months behind if I lose this job over a nap. I didn\'t steal the painting. I barely stole the nap.',
      },
    ],
    'Helena Voss': [
      {
        q: 'You left at 20:00. Why so early?',
        a: 'Galas exhaust me, detective. I said my goodbyes; my driver took me home. The valet will confirm — 20:00 sharp.',
      },
      {
        q: 'Do you wear lipstick?',
        a: 'Always. Crimson, usually. But I was home by half past eight, far from any loading dock.',
      },
      {
        q: 'You\'ve been buying Marco\'s early works.',
        a: 'Quietly, yes. Someone should preserve them. If I wanted the Bride I would simply have bought it — I offered twice.',
      },
      {
        q: 'Who do you think took it?',
        a: 'Someone with a code and a reason. Vera\'s been... strained lately. But that\'s gossip, and I don\'t trade in it.',
      },
    ],
  },

  /* ================= CASE 4: The Midnight Baker ================= */
  'the-midnight-baker': {
    'Sanna Qureshi': [
      {
        q: 'Tell me about the insurance.',
        a: 'What insurance? Rahul handles the paperwork. I bake. If he doubled something, he doubled it without me — I never signed a thing.',
      },
      {
        q: 'The ovens needed a refit you couldn\'t afford.',
        a: 'True. An inspector was due next month. But I would have sold my wedding gold before I burned my own bakery, detective.',
      },
      {
        q: 'Where were you at 3 AM?',
        a: 'Asleep next to my husband. My phone never left the nightstand. Check it — I have nothing to hide.',
      },
      {
        q: 'Who had back-door keys?',
        a: 'Rahul, Asha — she never returned hers — Kabir, and me. Four keys. One of us locked that deadbolt after the fire started.',
      },
    ],
    'Rahul Mehta': [
      {
        q: 'Your gym keycard shows no entry all night.',
        a: 'The... the reader was broken! I used the side door. I work out at 2 AM, it clears my head. Ask — well. Ask the machines.',
      },
      {
        q: 'You doubled the fire insurance six weeks ago.',
        a: 'Prudent business! Sanna never reads the paperwork. The building is worth more as a payout than as a bakery — I mean, in this market, any building is —',
      },
      {
        q: 'You wanted to sell to developers.',
        a: '₹4 crore! For a bakery that clears lakhs! Sanna is sentimental. I\'m practical. That\'s a disagreement, not arson.',
      },
      {
        q: 'What size shoes do you wear?',
        a: 'Eleven. Why — floury footprints? Half of Mumbai wears size eleven, detective. And I was at the gym. The side door. Which was open.',
      },
    ],
    'Asha Devi': [
      {
        q: 'You swore revenge when Sanna fired you.',
        a: 'I swore a lot of things. I was angry and humiliated. Then I got the call-center job and moved on. Revenge doesn\'t pay rent.',
      },
      {
        q: 'You still have a back-door key.',
        a: '...Yes. I forgot to return it. It\'s in my drawer at home, with old bus passes. It\'s never left the drawer.',
      },
      {
        q: 'Where were you 1:00–4:00 AM?',
        a: 'On calls, detective. My supervisor monitors every minute. I talked to angry customers about phone bills while the bakery burned.',
      },
      {
        q: 'What size shoes do you wear?',
        a: 'Six. Small feet, small temper these days. Those size-11 prints aren\'t mine — I\'d be swimming in them.',
      },
    ],
    'Kabir Anand': [
      {
        q: 'You nap behind the bakery between runs.',
        a: 'Between 2 and 3, in the van. It\'s quiet there. That night I heard nothing — no crash, no smell, nothing until the sirens.',
      },
      {
        q: 'Sanna docked your pay twice.',
        a: 'For late deliveries! Fair enough, I was late. You don\'t burn down a bakery over docked pay. You grumble and drive.',
      },
      {
        q: 'Your van GPS puts you across town at 3 AM.',
        a: 'I left at 2:50 for the early depot run. The fire started around 3 — I was already gone. The GPS doesn\'t lie, detective.',
      },
      {
        q: 'Did you see anyone near the back door?',
        a: 'No. But the deadbolt — Sanna always double-locks it from inside when she closes. If it was locked after the fire started, someone with a key did it on their way out.',
      },
    ],
  },

  /* ================= CASE 5: The Poisoned Podcast ================= */
  'the-poisoned-podcast': {
    'Dev Khanna': [
      {
        q: 'Riya was about to fire you.',
        a: 'Was she? I\'d heard rumors. The non-compete would\'ve ended me. But look at the stream — I never left my chair! Minute zero to the collapse, on camera.',
      },
      {
        q: 'You recorded a secret farewell episode.',
        a: 'Sentimentality, not murder. I loved that show. I wanted one last episode in the can, just for me.',
      },
      {
        q: 'Did you touch Riya\'s bottle?',
        a: 'Never. Her bottle, her desk, her rules. I drink from the cooler like a normal person.',
      },
      {
        q: 'Who would want her dead?',
        a: 'Nina wanted her slot — everyone knew. Arjun was furious about tomorrow\'s episode. Me? I just wanted to keep my job.',
      },
    ],
    'Nina Rao': [
      {
        q: 'The camera caught you refilling her bottle.',
        a: 'I\'m the producer! Refilling the host\'s water is literally in my job description. It was an ad break, she was dry, I refilled it. That\'s all.',
      },
      {
        q: 'The sedative in your bag — your prescription.',
        a: 'Post-surgery, yes. I lost half the strip last week — probably at the studio. Anyone could have picked it up. Anyone.',
      },
      {
        q: 'The network offered you Riya\'s slot.',
        a: 'They mentioned it. I hadn\'t decided. Taking over a show is a career move, detective, not a motive for murder — I\'d have gotten the slot anyway when her contract ended.',
      },
      {
        q: 'You knew the bottle was hers from home.',
        a: 'Everyone knew — she carried it everywhere, some wellness thing. The seal was already broken before the show... which is odd, now that you mention it. She never drank unsealed water.',
      },
    ],
    'Arjun Sethi': [
      {
        q: 'You emailed Riya: "you\'ll regret this."',
        a: 'About the episode! She was going to torch my product on air with cherry-picked "science." I was angry, not homicidal. I was in my office, typing in the chat like thousands of others.',
      },
      {
        q: 'Your verified handle was active the minute she drank.',
        a: 'Exactly — I was at my desk. My IP, my handle, my assistant beside me. I couldn\'t have touched the bottle from Bandra.',
      },
      {
        q: 'Did you know about the sedative?',
        a: 'I know about marketing, detective. Ask Nina about prescriptions — half the studio knew she was on something after the surgery.',
      },
      {
        q: 'Who benefits from Riya\'s death?',
        a: 'Nina gets the chair. I lose a show that was about to nuke my brand — which, frankly, dies with her anyway. Nobody wins here.',
      },
    ],
    'Tara Iyer': [
      {
        q: 'You texted Riya "you\'ll regret this."',
        a: 'About the SPLIT, detective. She kept my dog and my record collection. It was a breakup text, not a death threat.',
      },
      {
        q: 'Forty witnesses at a bookshop.',
        a: 'Forty-one, actually. The owner counted. I signed books until 11 — there are photos. I was nowhere near that studio.',
      },
      {
        q: 'Did you know her bottle routine?',
        a: 'I lived with her for two years — I know everything about her routines. Doesn\'t mean I was there.',
      },
      {
        q: 'Any idea who did it?',
        a: 'Watch the ad break footage. Someone in that studio opened her bottle. It wasn\'t me — I was signing books and hating my life choices.',
      },
    ],
  },

  /* ================= CASE 6: The Lighthouse Keeper ================= */
  'the-lighthouse-keeper': {
    'Mara Voss': [
      {
        q: 'You said you slept from midnight. The log says otherwise.',
        a: 'I... I did rounds. I couldn\'t sleep, the storm — I checked the lamp at 2. I lied because assistants aren\'t supposed to freelance the keeper\'s duties. It\'s a small lie.',
      },
      {
        q: 'Your hair ribbon was on the stair rail.',
        a: 'I wear it every day! It could have snagged any time — yesterday, last week. Ribbons snag, detective.',
      },
      {
        q: 'Elias found the missing supply money.',
        a: 'There was no — the accounts were messy, that\'s all. Elias was old and confused about the ledgers. He wasn\'t going to report anyone.',
      },
      {
        q: 'The lamp room was empty 01:00–03:00.',
        a: 'Then the camera is wrong, or... I was on the gallery stairs, checking the storm shutters. At 2:10? I don\'t wear a watch. I don\'t remember exactly where I was every minute of a storm.',
      },
    ],
    'Capt. Henrik Dahl': [
      {
        q: 'Your nephew was asleep 01:00–04:00. Your alibi?',
        a: 'I was on my boat! Where else would I be in a storm? Asleep in my bunk, like any sane captain. The boy sleeps like the dead — that\'s not my fault.',
      },
      {
        q: 'The "birdseed" crates are untaxed liquor.',
        a: '...A man has to eat. Elias knew — he threatened the port authority. But the seals are intact! I never opened them that night. I never went ashore.',
      },
      {
        q: 'Elias threatened to report you.',
        a: 'He threatened everyone, it was his hobby. I\'ve been sailing these waters twenty years — I don\'t kill keepers over paperwork.',
      },
      {
        q: 'Did you go ashore that night?',
        a: 'In that storm? I\'d have drowned. My boat stayed anchored, my crates stayed sealed, and Elias stayed... I\'m sorry. Poor old man.',
      },
    ],
    'Dr. Lena Petrova': [
      {
        q: 'You argued with Elias about the light.',
        a: 'Once, loudly, about the terns. Science, detective, not murder. I take photographs of birds, not revenge.',
      },
      {
        q: 'Your time-lapse caught a figure at 02:10.',
        a: 'I didn\'t notice until the police asked. One frame per ten minutes — a blur on the gallery stairs. I was in my cottage, logging field notes hourly.',
      },
      {
        q: 'Your notes are timestamped hourly all night.',
        a: 'Insomnia and terns. Ask anyone who does fieldwork — we write at all hours. The timestamps are real.',
      },
      {
        q: 'Did you leave your cottage?',
        a: 'No. The storm would have taken the door off. Whoever was on those stairs at 2:10 wasn\'t me — check the frames, I\'m not in any of them.',
      },
    ],
    'Jonas Pike': [
      {
        q: 'You said you never came to the island.',
        a: 'I lied. I rowed over to see him — to reconcile, if you can believe it. We argued about the cottage, about everything. I left before the storm peaked.',
      },
      {
        q: 'Your boat was swamped on the far beach.',
        a: 'Around 23:30 I shoved off. The storm took the boat — nearly took me. I made the mainland by luck and spite.',
      },
      {
        q: 'You inherit the cottage.',
        a: 'I didn\'t know that! Or — I knew, vaguely. But I left him ALIVE, detective. Angry, alive, and dry in his lamp room.',
      },
      {
        q: 'Did you go up the lighthouse stairs?',
        a: 'No. We argued in the lamp room doorway. He never left his coat — it was hanging dry when... You think I pushed him? I was fighting the sea by 2 AM.',
      },
    ],
  },

  /* ================= CASE 7: The Masquerade Murder ================= */
  'the-masquerade-murder': {
    'Anaya Raheja': [
      {
        q: 'You slipped away from the dance floor at 23:05.',
        a: 'For air! Two hundred people, the heat — I stepped to the champagne table, alone, for a moment. Harlequin exaggerates; it was barely five minutes.',
      },
      {
        q: 'You were at the catering setup at 16:00.',
        a: 'Choosing the champagne — it\'s my ball too, detective. A hostess checks details. The invitation corner in the crate? I must have set it down and forgotten it.',
      },
      {
        q: 'Vikram always took the leftmost flute.',
        a: 'Did he? Husbands have habits. I never noticed. ...Everyone in the family knew his little rituals, I suppose.',
      },
      {
        q: 'The divorce papers. The affair. The photographer.',
        a: 'Vikram was going to ruin Saira and me both. A divorce would leave me nothing. But I was DANCING, detective — ask Harlequin. Ask anyone.',
      },
    ],
    'Kabir Raheja': [
      {
        q: 'You were cut out of the will.',
        a: 'Last month, yes. The old man and I... we fought about the company. But I was on the terrace all night — three friends, plus my phone. Check the location.',
      },
      {
        q: 'You hired a PI to follow your father.',
        a: 'To understand the divorce threats! The file is about the AFFAIR, detective — with Saira. I wanted leverage to get back in the will, not a corpse.',
      },
      {
        q: 'Did you know about the leftmost-flute habit?',
        a: 'Everyone in the family knew. It was a joke — "Vikram\'s left." But I was outside from 11, nowhere near the trays.',
      },
      {
        q: 'Who poisoned the champagne?',
        a: 'Someone who was inside at 23:05, knew the habit, and could reach the tray. That\'s not me. I was watching fireworks from the terrace like a good son.',
      },
    ],
    'Saira Khan': [
      {
        q: 'Vikram threatened to ruin you.',
        a: 'He threatened a lot of people — it was his love language. But I was on the east lawn from 22:50, running fireworks. My whole crew will tell you.',
      },
      {
        q: 'Your affair with Anaya.',
        a: 'Yes. And he hired a photographer. We were... we were going to leave, both of us. Now she\'s a widow and I\'m a suspect. Some escape.',
      },
      {
        q: 'Did you know which flute he\'d take?',
        a: 'I\'m not family, detective — I barely knew the man\'s champagne habits. I knew the fireworks order by heart. That\'s where I was.',
      },
      {
        q: 'Could Anaya have done it?',
        a: 'Don\'t. Don\'t ask me that. ...She was dancing most of the night. That\'s all I know. That\'s all I\'ll say.',
      },
    ],
    'Meera Krishnan': [
      {
        q: 'You were being fired on Friday.',
        a: 'For asking about forged documents. Yes. I was scared, not murderous — I\'d already copied the files. Friday would have been his problem, not mine.',
      },
      {
        q: 'You pocketed his spare mask.',
        a: 'A souvenir. Stupid, I know. It\'s clean — test it all you like. I never left the coat check; the attendant watched me fold programs all night.',
      },
      {
        q: 'Did you see Anaya at the champagne table?',
        a: 'I see everyone from the coat check — it\'s my superpower. At 23:05? ...I\'d rather not say. Ask the dance partner. Ask Harlequin.',
      },
      {
        q: 'Who knew his flute habit?',
        a: 'The family. Anaya, Kabir. It was famous — "Vikram\'s left." Anyone close enough, long enough, would know.',
      },
    ],
  },

  /* ================= CASE 8: The Clockmaker's Last Tick ================= */
  'the-clockmakers-last-tick': {
    'Priya Nair': [
      {
        q: 'You came back at 21:02. Why?',
        a: 'My tools — my grandfather\'s tools. I forgot them in the rush of leaving. In at 21:02, out at 21:09, the bell logged it. Ask the bell.',
      },
      {
        q: 'Guru threatened to blacklist you.',
        a: 'He was cruel about the succession, yes. But I was already leaving — my own shop, my own name. Why would I kill a man I was already free of?',
      },
      {
        q: 'The secret commission behind his back.',
        a: 'One watch, for a friend. He found out and... he laughed, actually. Said I had "the hands but not the patience." I hated him a little for that.',
      },
      {
        q: 'You knew the 21:30 ritual.',
        a: 'Everyone in the shop knew — loupe at half past nine, chai at quarter to ten. Iron. But the paste was still tacky at half ten — applied AFTER I left. After.',
      },
    ],
    'Farhan Sheikh': [
      {
        q: 'Your threatening letter: "your hands will shake too."',
        a: 'Poetry, not a plan! I was drunk and ruined. Guru destroyed me in that forgery case — true. But I was toasting dealers at 21:05, on camera, with twelve witnesses.',
      },
      {
        q: 'Twelve witnesses can be bought.',
        a: 'And a timestamped photograph? Buy the photographer too, then the metadata, then the dealer\'s association. I was THERE, detective.',
      },
      {
        q: 'Did you know about the aconite?',
        a: 'I know gears, not botany. Ask the farmhouse people about aconite — it grows wild in those parts, everyone knows.',
      },
      {
        q: 'Who wanted Guru dead?',
        a: 'His son, if rumors are true — the workshop sale fight. Me? I wanted him embarrassed, the way he embarrassed me. Death is so... permanent.',
      },
    ],
    'Lata Zaveri': [
      {
        q: 'You were at your sister\'s all evening.',
        a: 'From seven to half ten. She\'ll tell you, and her doorbell camera doesn\'t lie. I make no secret of it.',
      },
      {
        q: 'You knew Priya came back that night.',
        a: 'The girl called me, crying, afraid it would look bad. I told her the truth would protect her. I said nothing to the police — a mother\'s instinct, misplaced.',
      },
      {
        q: 'The insurance on the workshop.',
        a: 'Modest. Enough to keep the roof on. I loved that old man for forty years, detective — I didn\'t marry an insurance policy.',
      },
      {
        q: 'Did Arjun visit the shop recently?',
        a: 'He says months. But... I found his cigarette case in the workroom bin last week. I didn\'t mention it. He\'s my son.',
      },
    ],
    'Arjun Mehta': [
      {
        q: 'Your Pune ticket is dated the day AFTER the murder.',
        a: 'The booking agent made an error! These apps — you tap once and — it\'s a mistake, not a fabrication.',
      },
      {
        q: 'Your fingerprints are on the workbench drawer.',
        a: 'I... I may have visited weeks ago. Months. Time blurs. Fathers and sons — we circle each other.',
      },
      {
        q: 'The drawer was wiped clean.',
        a: 'Was it? I wouldn\'t know. I haven\'t — look, if my prints are there, they\'re old. Old prints, old visits.',
      },
      {
        q: 'Aconite grows behind your farmhouse.',
        a: 'It grows wild all over the district! Every child there knows the pretty purple flowers. That proves nothing. ...Why are you asking about flowers?',
      },
    ],
  },

  /* ================= CASE 9: The Final Reel ================= */
  'the-final-reel': {
    'Rhea Kapoor': [
      {
        q: 'Vicky was replacing you.',
        a: 'The unsigned contract in his trailer — yes, I knew. I hired a lawyer to walk away with dignity. Death cancels the film, detective — it doesn\'t save my role.',
      },
      {
        q: 'Your trailer door camera: in at 22:05, out at 23:10.',
        a: 'Learning lines. Alone. The camera doesn\'t lie — I never went near rig A.',
      },
      {
        q: 'Did you know the wire would be cut?',
        a: 'I know dialogue, not rigging. Serrated knives, harness keys — that\'s Karan\'s world, not mine.',
      },
      {
        q: 'Who cut the wire?',
        a: 'Someone with a knife, a key, and a reason. Karan logged that rig "all clear" at nine. Ask him what "clear" means.',
      },
    ],
    'Karan Bedi': [
      {
        q: 'You logged rig A "all clear" at 21:00.',
        a: 'Standard inspection. I check every wire, every shackle. It was clear at nine — what happened after isn\'t on my log.',
      },
      {
        q: 'You told crew you were checking rig B 21:30–22:30. Rig B\'s log is empty.',
        a: 'I... did a visual. Quick. Didn\'t log it — we get lazy with paperwork at midnight. The log isn\'t the work, detective.',
      },
      {
        q: 'Wire shavings in your jacket cuff.',
        a: 'I handle wire all day! Shavings get everywhere — cuffs, boots, hair. I\'m the stunt coordinator; wire is my weather.',
      },
      {
        q: 'Your brother\'s clipping. Your kit, open, beside rig A at 23:00.',
        a: 'I keep it to remember why safety matters. Vicky\'s corner-cutting killed him six years ago. My kit is always open on a shoot — ask anyone. ...Why are you looking at me like that?',
      },
    ],
    'Sameer Joshi': [
      {
        q: 'You doubled the production insurance.',
        a: 'Standard for a troubled production! The bond company required it. Vicky\'s death triggers payouts, yes — it also kills the film I\'ve bled for. Nobody doubles insurance to commit murder.',
      },
      {
        q: 'Your LA call: 22:30–23:15, verified.',
        a: 'The studio, the bond company, the whole circus — on speaker, recorded. I was producing, detective, from a chair, three thousand miles of cable away.',
      },
      {
        q: 'Did you know the wire was cut?',
        a: 'I know budgets, not blades. Karan\'s department, Karan\'s knives, Karan\'s logs.',
      },
      {
        q: 'Who benefits from Vicky\'s death?',
        a: 'The insurance company pays, the studio writes it off, and I get... a dead film and a police file. Ask who had a knife and no alibi.',
      },
    ],
    'Nikhil Rao': [
      {
        q: 'You told Vicky "you\'ll pay for that." On set. Witnessed.',
        a: 'At the AWARDS, detective! He stole my shot — my signature move, in dailies, with my name cut out. I meant trophies, not funerals.',
      },
      {
        q: 'Camera village, 21:45–23:10.',
        a: 'With the DIT, frame by frame. Timestamped. I was looking at pictures of the living, not cutting wires.',
      },
      {
        q: 'Did you know about the stunt change?',
        a: 'Vicky doing his own stunt? Madness. I told him the light was wrong for it. He wanted "authentic." He got it.',
      },
      {
        q: 'Who had the opportunity?',
        a: 'Whoever was near rig A between half nine and half ten with a serrated knife. That\'s a short list with one name on it, and it isn\'t mine.',
      },
    ],
  },
};

/* Hint-token extras: bonus 'both' clue (1st token) + nudges (later tokens). */
export const HINT_EXTRAS: Record<string, HintExtras> = {
  'quiet-vault': {
    bonus: {
      id: 'qv-x',
      text: 'FIELD INTEL: The burner from the 22:47 call was bought with cash at 16:20 — the shopkeeper remembers a man in a trench coat who paid without a word.',
      split: 'both',
    },
    nudges: [
      'Nudge: the ticket stub says Victor was there at 21:58. His mouth says he was home. Paper doesn\'t lie; brothers do.',
      'Nudge: the lockpick gouges are amateur hour. Ask who BENEFITS from a fake break-in — and who couldn\'t pick a lock to save his life.',
    ],
  },
  'midnight-express': {
    bonus: {
      id: 'mx-x',
      text: 'FIELD INTEL: The ventilator access panel\'s keyhole has fresh brass scratches — the master key turned there recently, and only one key fits.',
      split: 'both',
    },
    nudges: [
      'Nudge: the scarf was planted. Ask who had a reason to want Ava D\'Souza blamed.',
      'Nudge: the tea was drunk safely at 22:30. The poison came later, through the air. Who controls the air on a train?',
    ],
  },
  'the-painted-alibi': {
    bonus: {
      id: 'pa-x',
      text: 'FIELD INTEL: The keypad audit log shows the dock code entered at 21:18 — during the camera blackout — typed correctly on the FIRST try.',
      split: 'both',
    },
    nudges: [
      'Nudge: the new code was told to exactly one person. The lipstick glass belongs to someone still at the gala at 21:00.',
      'Nudge: cadmium red isn\'t picked up "brushing against a wall." It\'s picked up carrying a canvas.',
    ],
  },
  'the-midnight-baker': {
    bonus: {
      id: 'mb-x',
      text: 'FIELD INTEL: A traffic camera two streets from the bakery caught Rahul\'s car at 2:41 AM — heading TOWARD the bakery, not the gym.',
      split: 'both',
    },
    nudges: [
      'Nudge: the deadbolt was locked from the inside AFTER the fire started. Count the keys. Count the lies.',
      'Nudge: size 11. The gym has no record. The insurance has a signature. Follow the paperwork.',
    ],
  },
  'the-poisoned-podcast': {
    bonus: {
      id: 'pp-x',
      text: 'FIELD INTEL: The studio\'s water-cooler log shows the producer took TWO bottles that evening — one for the host, one she never delivered.',
      split: 'both',
    },
    nudges: [
      'Nudge: three suspects have airtight alibis — on camera, in chat, across town. The fourth was caught on camera doing the ONE thing that mattered.',
      'Nudge: the sedative needed a source with a pharmacy label. Whose name was on it?',
    ],
  },
  'the-lighthouse-keeper': {
    bonus: {
      id: 'lh-x',
      text: 'FIELD INTEL: The assistant\'s cottage bed was never slept in — the blanket still had the morning\'s hospital corners.',
      split: 'both',
    },
    nudges: [
      'Nudge: she says midnight-to-sleep; her handwriting says 02:00. The ribbon says the stairs. The camera says 02:10. Believe the objects.',
      'Nudge: the captain\'s crates stayed sealed and the son left before the storm. Who is left standing on the stairs?',
    ],
  },
  'the-masquerade-murder': {
    bonus: {
      id: 'mm-x',
      text: 'FIELD INTEL: The waiter who served the 23:10 tray remembers the chipped flute placed at the LEFT end — by a woman\'s gloved hand — minutes before he lifted it.',
      split: 'both',
    },
    nudges: [
      'Nudge: three suspects are pinned to witnessed alibis at 23:05. The fourth slipped away from the dance floor for exactly five minutes.',
      'Nudge: the chip was cut that afternoon. Who was at the catering setup at 16:00 "choosing the champagne"?',
    ],
  },
  'the-clockmakers-last-tick': {
    bonus: {
      id: 'cm-x',
      text: 'FIELD INTEL: The back-door bolt was recently oiled — it turns silently now. Only someone who knew the shop\'s squeaks would bother.',
      split: 'both',
    },
    nudges: [
      'Nudge: the paste was applied 21:30–22:00. The apprentice left at 21:09. The arithmetic clears her — who does it leave?',
      'Nudge: a ticket for the wrong day, prints on a wiped drawer, poison from the family farm. Three facts, one name.',
    ],
  },
  'the-final-reel': {
    bonus: {
      id: 'fr-x',
      text: 'FIELD INTEL: The deputy\'s harness key never left its locker that night — sign-out sheet confirms. Only ONE key was in play.',
      split: 'both',
    },
    nudges: [
      'Nudge: three alibis are airtight — door camera, verified call, timestamped dailies. The fourth alibi has no log entry.',
      'Nudge: the \'all clear\' at 21:00 and the cut at 21:30–22:30 were signed by the same hand.',
    ],
  },
};
