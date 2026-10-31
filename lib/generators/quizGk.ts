/**
 * GK Quiz — general-knowledge multiple choice, Duo Corner.
 *
 * Every question below was written for this game (no quiz bank, trivia
 * site, or app was copied): one question, four options, exactly one
 * correct answer, across science, geography, history, sports, and
 * everyday life. The page drives one question at a time; this module
 * stays pure so tests can replay exact rounds.
 *
 * Solo vs Cosy Bot: both answer the same seeded set. The bot's
 * accuracy rises with level but never reaches 100%, and it answers
 * after a short level-based pause so its turn can be watched.
 * Two-player is pass-and-play: players alternate questions on one
 * device. There is no timer at all — nothing here can end a round
 * or mark an answer wrong on time.
 */
import { rngFromSeed, shuffle } from './rng';

export type QuizCategory =
  | 'science'
  | 'geography'
  | 'history'
  | 'sports'
  | 'everyday';

export const QUIZ_CATEGORIES: QuizCategory[] = [
  'science',
  'geography',
  'history',
  'sports',
  'everyday',
];

export const QUIZ_CATEGORY_LABELS: Record<QuizCategory, string> = {
  science: 'Science',
  geography: 'Geography',
  history: 'History',
  sports: 'Sports',
  everyday: 'Everyday life',
};

export interface QuizBankQuestion {
  id: string;
  category: QuizCategory;
  question: string;
  correct: string;
  wrong: [string, string, string];
}

/** Original question bank: 13 per category, 65 in total. */
export const QUIZ_BANK: QuizBankQuestion[] = [
  // Science
  { id: 'sci-1', category: 'science', question: 'Which planet is known as the Red Planet?', correct: 'Mars', wrong: ['Venus', 'Jupiter', 'Saturn'] },
  { id: 'sci-2', category: 'science', question: 'What gas do plants take in from the air to make their food?', correct: 'Carbon dioxide', wrong: ['Oxygen', 'Nitrogen', 'Hydrogen'] },
  { id: 'sci-3', category: 'science', question: 'How many legs does a spider have?', correct: 'Eight', wrong: ['Six', 'Ten', 'Four'] },
  { id: 'sci-4', category: 'science', question: 'What is the chemical symbol for gold?', correct: 'Au', wrong: ['Ag', 'Gd', 'Go'] },
  { id: 'sci-5', category: 'science', question: 'Which organ pumps blood around the human body?', correct: 'The heart', wrong: ['The liver', 'A lung', 'A kidney'] },
  { id: 'sci-6', category: 'science', question: 'At what temperature does water boil at sea level, in Celsius?', correct: '100°C', wrong: ['90°C', '80°C', '120°C'] },
  { id: 'sci-7', category: 'science', question: 'Which force pulls objects down towards the Earth?', correct: 'Gravity', wrong: ['Magnetism', 'Friction', 'Momentum'] },
  { id: 'sci-8', category: 'science', question: 'What is the main source of energy for life on Earth?', correct: 'The Sun', wrong: ['The Moon', 'The Earth’s core', 'The wind'] },
  { id: 'sci-9', category: 'science', question: 'Which flying animal is a mammal?', correct: 'A bat', wrong: ['An owl', 'A bee', 'A butterfly'] },
  { id: 'sci-10', category: 'science', question: 'How many colours are traditionally counted in a rainbow?', correct: 'Seven', wrong: ['Five', 'Six', 'Nine'] },
  { id: 'sci-11', category: 'science', question: 'Which part of a plant uses sunlight to make food?', correct: 'The leaf', wrong: ['The root', 'The stem', 'The flower'] },
  { id: 'sci-12', category: 'science', question: 'What sweet liquid do bees gather from flowers to turn into honey?', correct: 'Nectar', wrong: ['Sap', 'Dew', 'Pollen'] },
  { id: 'sci-13', category: 'science', question: 'Which instrument is used to measure temperature?', correct: 'A thermometer', wrong: ['A barometer', 'An altimeter', 'A speedometer'] },
  // Geography
  { id: 'geo-1', category: 'geography', question: 'Which is the largest hot desert in the world?', correct: 'The Sahara', wrong: ['The Gobi', 'The Kalahari', 'The Arabian Desert'] },
  { id: 'geo-2', category: 'geography', question: 'What is the capital of Japan?', correct: 'Tokyo', wrong: ['Kyoto', 'Osaka', 'Seoul'] },
  { id: 'geo-3', category: 'geography', question: 'Which river flows through London?', correct: 'The Thames', wrong: ['The Seine', 'The Danube', 'The Rhine'] },
  { id: 'geo-4', category: 'geography', question: 'Brazil is on which continent?', correct: 'South America', wrong: ['Africa', 'North America', 'Asia'] },
  { id: 'geo-5', category: 'geography', question: 'Mount Everest stands on the border of Nepal and which other country?', correct: 'China', wrong: ['India', 'Bhutan', 'Pakistan'] },
  { id: 'geo-6', category: 'geography', question: 'Which is the largest ocean in the world?', correct: 'The Pacific Ocean', wrong: ['The Atlantic Ocean', 'The Indian Ocean', 'The Arctic Ocean'] },
  { id: 'geo-7', category: 'geography', question: 'What is the capital of Australia?', correct: 'Canberra', wrong: ['Sydney', 'Melbourne', 'Perth'] },
  { id: 'geo-8', category: 'geography', question: 'The Eiffel Tower stands in which country?', correct: 'France', wrong: ['Italy', 'Spain', 'Belgium'] },
  { id: 'geo-9', category: 'geography', question: 'The Great Pyramids of Giza stand in which country?', correct: 'Egypt', wrong: ['Kenya', 'Nigeria', 'Morocco'] },
  { id: 'geo-10', category: 'geography', question: 'The Grand Canyon is in which US state?', correct: 'Arizona', wrong: ['Nevada', 'Utah', 'Colorado'] },
  { id: 'geo-11', category: 'geography', question: 'Which is the smallest continent by land area?', correct: 'Australia', wrong: ['Europe', 'Antarctica', 'South America'] },
  { id: 'geo-12', category: 'geography', question: 'Which country has the longest coastline in the world?', correct: 'Canada', wrong: ['Russia', 'Australia', 'Brazil'] },
  { id: 'geo-13', category: 'geography', question: 'What is the capital of Canada?', correct: 'Ottawa', wrong: ['Toronto', 'Vancouver', 'Montreal'] },
  // History
  { id: 'his-1', category: 'history', question: 'Who painted the Mona Lisa?', correct: 'Leonardo da Vinci', wrong: ['Michelangelo', 'Raphael', 'Rembrandt'] },
  { id: 'his-2', category: 'history', question: 'Which ancient civilisation built the Colosseum in Rome?', correct: 'The Romans', wrong: ['The Greeks', 'The Egyptians', 'The Persians'] },
  { id: 'his-3', category: 'history', question: 'Who was the first person to walk on the Moon?', correct: 'Neil Armstrong', wrong: ['Buzz Aldrin', 'Yuri Gagarin', 'Michael Collins'] },
  { id: 'his-4', category: 'history', question: 'Which wall came down in 1989, reuniting a divided city?', correct: 'The Berlin Wall', wrong: ['The Great Wall', 'Hadrian’s Wall', 'The Western Wall'] },
  { id: 'his-5', category: 'history', question: 'Who was the first President of the United States?', correct: 'George Washington', wrong: ['Abraham Lincoln', 'Thomas Jefferson', 'John Adams'] },
  { id: 'his-6', category: 'history', question: 'Ancient Egyptians wrote using which picture-based script?', correct: 'Hieroglyphs', wrong: ['Cuneiform', 'Latin', 'Sanskrit'] },
  { id: 'his-7', category: 'history', question: 'Which famous ship sank on its first voyage in 1912?', correct: 'The Titanic', wrong: ['The Lusitania', 'The Queen Mary', 'The Mayflower'] },
  { id: 'his-8', category: 'history', question: 'Who wrote Romeo and Juliet?', correct: 'William Shakespeare', wrong: ['Charles Dickens', 'Jane Austen', 'Mark Twain'] },
  { id: 'his-9', category: 'history', question: 'The Great Wall was built mainly to guard the northern border of which country?', correct: 'China', wrong: ['Japan', 'Mongolia', 'Korea'] },
  { id: 'his-10', category: 'history', question: 'In which year did humans first land on the Moon?', correct: '1969', wrong: ['1959', '1979', '1989'] },
  { id: 'his-11', category: 'history', question: 'Who was Britain’s prime minister for most of the Second World War?', correct: 'Winston Churchill', wrong: ['Neville Chamberlain', 'Clement Attlee', 'Anthony Eden'] },
  { id: 'his-12', category: 'history', question: 'The ancient Olympic Games began in which Greek city?', correct: 'Olympia', wrong: ['Athens', 'Sparta', 'Delphi'] },
  { id: 'his-13', category: 'history', question: 'Who is credited with the movable-type printing press in Europe?', correct: 'Johannes Gutenberg', wrong: ['Isaac Newton', 'Galileo Galilei', 'Leonardo da Vinci'] },
  // Sports
  { id: 'spo-1', category: 'sports', question: 'How many players does a football (soccer) team have on the field?', correct: '11', wrong: ['9', '10', '12'] },
  { id: 'spo-2', category: 'sports', question: 'In tennis, what is a score of zero called?', correct: 'Love', wrong: ['Ace', 'Deuce', 'Nil'] },
  { id: 'spo-3', category: 'sports', question: 'Which sport is played with a shuttlecock?', correct: 'Badminton', wrong: ['Squash', 'Table tennis', 'Volleyball'] },
  { id: 'spo-4', category: 'sports', question: 'How often are the Summer Olympic Games held?', correct: 'Every 4 years', wrong: ['Every 2 years', 'Every 3 years', 'Every 5 years'] },
  { id: 'spo-5', category: 'sports', question: 'In cricket, how many runs are scored when the ball clears the boundary without bouncing?', correct: 'Six', wrong: ['Four', 'Five', 'Eight'] },
  { id: 'spo-6', category: 'sports', question: 'Which sport is often nicknamed “the beautiful game”?', correct: 'Football (soccer)', wrong: ['Basketball', 'Hockey', 'Rugby'] },
  { id: 'spo-7', category: 'sports', question: 'In basketball, how many points is a free throw worth?', correct: 'One', wrong: ['Two', 'Three', 'Zero'] },
  { id: 'spo-8', category: 'sports', question: 'The marathon takes its name from a legend of which country?', correct: 'Greece', wrong: ['Italy', 'France', 'Egypt'] },
  { id: 'spo-9', category: 'sports', question: 'How many rings are on the Olympic flag?', correct: 'Five', wrong: ['Four', 'Six', 'Seven'] },
  { id: 'spo-10', category: 'sports', question: 'In golf, what is one stroke under par on a hole called?', correct: 'A birdie', wrong: ['An eagle', 'A bogey', 'An albatross'] },
  { id: 'spo-11', category: 'sports', question: 'In which sport would a player perform a slam dunk?', correct: 'Basketball', wrong: ['Volleyball', 'Handball', 'Netball'] },
  { id: 'spo-12', category: 'sports', question: 'About how long is a standard marathon?', correct: '42 kilometres', wrong: ['26 kilometres', '32 kilometres', '50 kilometres'] },
  { id: 'spo-13', category: 'sports', question: 'How many minutes long is a standard football match, excluding extra time?', correct: '90', wrong: ['80', '100', '120'] },
  // Everyday life
  { id: 'eve-1', category: 'everyday', question: 'How many days are there in a leap year?', correct: '366', wrong: ['365', '364', '367'] },
  { id: 'eve-2', category: 'everyday', question: 'How many minutes are there in 2 hours?', correct: '120', wrong: ['100', '90', '150'] },
  { id: 'eve-3', category: 'everyday', question: 'How many months of the year have 31 days?', correct: 'Seven', wrong: ['Five', 'Six', 'Eight'] },
  { id: 'eve-4', category: 'everyday', question: 'What colour do you get by mixing blue and yellow paint?', correct: 'Green', wrong: ['Purple', 'Orange', 'Brown'] },
  { id: 'eve-5', category: 'everyday', question: 'How many sides does a triangle have?', correct: 'Three', wrong: ['Four', 'Five', 'Six'] },
  { id: 'eve-6', category: 'everyday', question: 'Which meal is usually the first one of the day?', correct: 'Breakfast', wrong: ['Dinner', 'Supper', 'Lunch'] },
  { id: 'eve-7', category: 'everyday', question: 'How many cents are there in one dollar?', correct: '100', wrong: ['50', '10', '1000'] },
  { id: 'eve-8', category: 'everyday', question: 'What is 15 + 27?', correct: '42', wrong: ['32', '41', '52'] },
  { id: 'eve-9', category: 'everyday', question: 'Which device is used to take a photograph?', correct: 'A camera', wrong: ['A printer', 'A speaker', 'A keyboard'] },
  { id: 'eve-10', category: 'everyday', question: 'How many wheels does a bicycle have?', correct: 'Two', wrong: ['One', 'Three', 'Four'] },
  { id: 'eve-11', category: 'everyday', question: 'Which season comes after summer?', correct: 'Autumn', wrong: ['Winter', 'Spring', 'Summer'] },
  { id: 'eve-12', category: 'everyday', question: 'What do you use to brush your teeth?', correct: 'A toothbrush', wrong: ['A comb', 'A towel', 'A sponge'] },
  { id: 'eve-13', category: 'everyday', question: 'How many hours are there in a full day?', correct: '24', wrong: ['12', '48', '36'] },
];

export interface QuizRoundQuestion {
  id: string;
  category: QuizCategory;
  question: string;
  /** The four options in seeded order; correctIndex points at the answer. */
  options: string[];
  correctIndex: number;
}

/** Round length grows with the shared tier ladder (Easy 1-10, Medium 11-30, Hard 31-60, Expert 61+). */
export function questionsForLevel(level: number): number {
  if (level <= 10) return 6;
  if (level <= 30) return 8;
  if (level <= 60) return 10;
  return 12;
}

/**
 * Build a round: shuffle each category's questions, deal them out
 * round-robin so every category is represented, then shuffle the
 * dealt set — so both the question order and the option order are
 * seeded (same seed + level = same round).
 */
export function generateQuiz(seed: string, level: number): QuizRoundQuestion[] {
  const count = questionsForLevel(level);
  const rng = rngFromSeed(`quiz-gk|${seed}|${level}`);
  const byCategory = QUIZ_CATEGORIES.map((category) =>
    shuffle(
      QUIZ_BANK.filter((q) => q.category === category),
      rng,
    ),
  );
  const dealt: QuizBankQuestion[] = [];
  let round = 0;
  while (dealt.length < count) {
    let dealtThisRound = false;
    for (const pile of byCategory) {
      if (dealt.length >= count) break;
      const next = pile[round];
      if (next) {
        dealt.push(next);
        dealtThisRound = true;
      }
    }
    if (!dealtThisRound) break;
    round += 1;
  }
  return shuffle(dealt, rng).map((q) => {
    const options = shuffle([q.correct, ...q.wrong], rng);
    return {
      id: q.id,
      category: q.category,
      question: q.question,
      options,
      correctIndex: options.indexOf(q.correct),
    };
  });
}

/** Cosy Bot's accuracy: sharper at higher levels, never perfect. */
export function botAccuracyForLevel(level: number): number {
  if (level <= 10) return 0.45;
  if (level <= 30) return 0.6;
  if (level <= 60) return 0.75;
  return 0.88;
}

/** How long the bot pauses before its answer is revealed (ms). Sharper = quicker. */
export function botDelayForLevel(level: number): number {
  if (level <= 10) return 1400;
  if (level <= 30) return 1100;
  if (level <= 60) return 850;
  return 650;
}

/**
 * The bot's pick for one question: the correct option with
 * probability botAccuracyForLevel(level), otherwise a random wrong
 * option. A rng that returns 0 always answers correctly; one that
 * returns just under 1 always answers wrong.
 */
export function botAnswer(
  question: QuizRoundQuestion,
  level: number,
  rng: () => number,
): number {
  if (rng() < botAccuracyForLevel(level)) return question.correctIndex;
  const wrong = question.options
    .map((_, i) => i)
    .filter((i) => i !== question.correctIndex);
  return wrong[Math.floor(rng() * wrong.length)]!;
}

/** Pass-and-play: questions alternate between the two players, starting with Player 1. */
export function turnForQuestion(index: number): 0 | 1 {
  return index % 2 === 0 ? 0 : 1;
}

export interface QuizScore {
  /** Correct answers so far. */
  score: number;
  /** Longest run of consecutive correct answers. */
  bestStreak: number;
  /** Current run of consecutive correct answers (0 after a wrong answer). */
  currentStreak: number;
}

/**
 * Score a list of answers against a round (null = unanswered/skipped,
 * never counted correct). Streaks count consecutive correct answers
 * in question order.
 */
export function scoreAnswers(
  answers: (number | null)[],
  round: QuizRoundQuestion[],
): QuizScore {
  let score = 0;
  let bestStreak = 0;
  let currentStreak = 0;
  for (let i = 0; i < round.length; i++) {
    if (answers[i] !== null && answers[i] !== undefined && answers[i] === round[i]!.correctIndex) {
      score += 1;
      currentStreak += 1;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }
  return { score, bestStreak, currentStreak };
}

/** Round winner from the two scores, or null on a tie. */
export function quizWinner(scores: [number, number]): 0 | 1 | null {
  if (scores[0] > scores[1]) return 0;
  if (scores[1] > scores[0]) return 1;
  return null;
}
