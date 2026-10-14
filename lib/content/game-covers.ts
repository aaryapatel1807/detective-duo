/* Aggregator: slug -> cover data URI for all 36 games. */
import { COVER_ALIBI } from './game-covers/alibi';
import { COVER_BATTLESHIP } from './game-covers/battleship';
import { COVER_BLACK_STORIES } from './game-covers/black-stories';
import { COVER_BOMB_DEFUSAL } from './game-covers/bomb-defusal';
import { COVER_CIPHER_BREAKER } from './game-covers/cipher-breaker';
import { COVER_CIPHER_DUEL } from './game-covers/cipher-duel';
import { COVER_CODENAMES_DUET } from './game-covers/codenames-duet';
import { COVER_COLORING } from './game-covers/coloring';
import { COVER_CONNECT_4 } from './game-covers/connect-4';
import { COVER_CRIME_MYSTERY } from './game-covers/crime-mystery';
import { COVER_DAILY_PUZZLE } from './game-covers/daily-puzzle';
import { COVER_DRAW_GUESS } from './game-covers/draw-guess';
import { COVER_ESCAPE_ROOM } from './game-covers/escape-room';
import { COVER_FUGITIVE_HUNT } from './game-covers/fugitive-hunt';
import { COVER_GAME_2048 } from './game-covers/game-2048';
import { COVER_GHOST } from './game-covers/ghost';
import { COVER_GUESS_WHO } from './game-covers/guess-who';
import { COVER_HANGMAN_DUEL } from './game-covers/hangman-duel';
import { COVER_HEIST_PLANNER } from './game-covers/heist-planner';
import { COVER_JIGSAW } from './game-covers/jigsaw';
import { COVER_LIARS_DICE } from './game-covers/liars-dice';
import { COVER_LOGIC_GRIDS } from './game-covers/logic-grids';
import { COVER_MEMORY_MATCH } from './game-covers/memory-match';
import { COVER_MIND_MELD } from './game-covers/mind-meld';
import { COVER_MINESWEEPER } from './game-covers/minesweeper';
import { COVER_SAMPLE_TAP } from './game-covers/sample-tap';
import { COVER_SNAKE } from './game-covers/snake';
import { COVER_SPOT_THE_LIAR } from './game-covers/spot-the-liar';
import { COVER_TIC_TAC_TOE } from './game-covers/tic-tac-toe';
import { COVER_TRIVIA_BATTLE } from './game-covers/trivia-battle';
import { COVER_TRUTH_OR_DARE } from './game-covers/truth-or-dare';
import { COVER_TWENTY_QUESTIONS } from './game-covers/twenty-questions';
import { COVER_WORD_DUEL } from './game-covers/word-duel';
import { COVER_WORD_HUNT } from './game-covers/word-hunt';
import { COVER_WORDLE } from './game-covers/wordle';
import { COVER_WOULD_YOU_RATHER } from './game-covers/would-you-rather';

export const GAME_COVERS: Record<string, string> = {
  'alibi': COVER_ALIBI,
  'battleship': COVER_BATTLESHIP,
  'black-stories': COVER_BLACK_STORIES,
  'bomb-defusal': COVER_BOMB_DEFUSAL,
  'cipher-breaker': COVER_CIPHER_BREAKER,
  'cipher-duel': COVER_CIPHER_DUEL,
  'codenames-duet': COVER_CODENAMES_DUET,
  'coloring': COVER_COLORING,
  'connect-4': COVER_CONNECT_4,
  'crime-mystery': COVER_CRIME_MYSTERY,
  'daily-puzzle': COVER_DAILY_PUZZLE,
  'draw-guess': COVER_DRAW_GUESS,
  'escape-room': COVER_ESCAPE_ROOM,
  'fugitive-hunt': COVER_FUGITIVE_HUNT,
  'game-2048': COVER_GAME_2048,
  'ghost': COVER_GHOST,
  'guess-who': COVER_GUESS_WHO,
  'hangman-duel': COVER_HANGMAN_DUEL,
  'heist-planner': COVER_HEIST_PLANNER,
  'jigsaw': COVER_JIGSAW,
  'liars-dice': COVER_LIARS_DICE,
  'logic-grids': COVER_LOGIC_GRIDS,
  'memory-match': COVER_MEMORY_MATCH,
  'mind-meld': COVER_MIND_MELD,
  'minesweeper': COVER_MINESWEEPER,
  'sample-tap': COVER_SAMPLE_TAP,
  'snake': COVER_SNAKE,
  'spot-the-liar': COVER_SPOT_THE_LIAR,
  'tic-tac-toe': COVER_TIC_TAC_TOE,
  'trivia-battle': COVER_TRIVIA_BATTLE,
  'truth-or-dare': COVER_TRUTH_OR_DARE,
  'twenty-questions': COVER_TWENTY_QUESTIONS,
  'word-duel': COVER_WORD_DUEL,
  'word-hunt': COVER_WORD_HUNT,
  'wordle': COVER_WORDLE,
  'would-you-rather': COVER_WOULD_YOU_RATHER,
};
