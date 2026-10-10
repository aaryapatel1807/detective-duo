/* Alibi — 10 fictional crime cards. One detective invents an alibi;
 * the other cross-examines (timed questions), then judges BUSTED or CLEAN.
 */

export interface CrimeCard {
  id: string;
  crime: string;
  time: string;
  place: string;
  detail: string;
}

export const CRIME_CARDS: CrimeCard[] = [
  { id: 'c1', crime: 'The Grand Emerald Heist', time: '11:47 PM', place: 'Marlowe Jewelers, 5th & Vine', detail: 'A 40-carat emerald vanished from a locked display. No forced entry.' },
  { id: 'c2', crime: 'Midnight at the Docks', time: '12:15 AM', place: 'Pier 9 warehouse', detail: 'A shipment of vintage wine was swapped for vinegar. The guard was "asleep".' },
  { id: 'c3', crime: 'The Gallery Forgery', time: '9:30 PM', place: 'Voss Modern Art Gallery', detail: 'A priceless painting was replaced with a copy during the gala. 200 witnesses, zero saw it.' },
  { id: 'c4', crime: 'The Banker\'s Ledger', time: '6:05 PM', place: 'First National, vault level', detail: 'Ledger pages recording a decade of bribes were torn out and burned.' },
  { id: 'c5', crime: 'Poison at the Banquet', time: '8:40 PM', place: 'The Ivory Room, Grand Hotel', detail: 'The mayor\'s soup was laced with sleeping draught. The kitchen staff all vouch for each other.' },
  { id: 'c6', crime: 'The Missing Manuscript', time: '3:20 PM', place: 'Blackwood Publishing, 12th floor', detail: 'A novelist\'s only manuscript disappeared from a locked office between chapters.' },
  { id: 'c7', crime: 'Sabotage at the Speedway', time: '4:55 PM', place: 'Riverside Racetrack, pit lane', detail: 'Brake lines cut on the favorite\'s car, minutes before the final lap.' },
  { id: 'c8', crime: 'The Opera House Blackout', time: '10:02 PM', place: 'The Old Opera House', detail: 'Lights cut mid-aria; the lead soprano\'s diamond choker vanished in the dark.' },
  { id: 'c9', crime: 'The Casino Chip Swap', time: '1:10 AM', place: 'The Gilded Ace Casino', detail: '$50,000 in chips walked out in a coat lining. Cameras "glitched" for 90 seconds.' },
  { id: 'c10', crime: 'The Lighthouse Signal', time: '2:30 AM', place: 'Greyrock Lighthouse', detail: 'The lamp was used to signal a smuggler\'s boat. The keeper swears he was home asleep.' },
];

export function getCrimeCard(id: string): CrimeCard | undefined {
  return CRIME_CARDS.find((c) => c.id === id);
}

export function drawCrime(usedIds: string[]): CrimeCard {
  const pool = CRIME_CARDS.filter((c) => !usedIds.includes(c.id));
  const source = pool.length > 0 ? pool : CRIME_CARDS;
  return source[Math.floor(Math.random() * source.length)];
}
