import { generateSession } from './training.ts';
import type { Level, Mode, Question } from './training.ts';

export type Answer = number | null;
export type Session = {
  id: string;
  mode: Mode;
  level: Level;
  questions: Question[];
  answers: Answer[];
  cursor: number;
};
export type Result = Omit<Session, 'cursor'> & { finishedAt: string };
export type Progress = {
  version: 1;
  answered: number;
  correct: number;
  sessions: number;
  recent: Result[];
  active: Session | null;
};
export type Action =
  | { type: 'start'; mode: Mode; level: Level; id: string }
  | { type: 'answer'; value: Answer }
  | { type: 'next'; finishedAt: string }
  | { type: 'finish'; finishedAt: string };

export function emptyProgress(): Progress {
  return { version: 1, answered: 0, correct: 0, sessions: 0, recent: [], active: null };
}

export function correctCount(session: Pick<Session, 'answers' | 'questions'>): number {
  return session.answers.filter((answer, index) => answer === session.questions[index].answerMinor).length;
}

function finish(progress: Progress, finishedAt: string): Progress {
  const session = progress.active;
  if (!session) return progress;
  if (!session.answers.length) return { ...progress, active: null };
  const { cursor: _cursor, ...result } = session;
  return {
    ...progress,
    active: null,
    sessions: progress.sessions + 1,
    recent: [{ ...result, questions: result.questions.slice(0, result.answers.length), finishedAt }, ...progress.recent].slice(0, 20),
  };
}

export function updateProgress(progress: Progress, action: Action): Progress {
  const session = progress.active;
  switch (action.type) {
    case 'start':
      if (session) return progress;
      return { ...progress, active: { id: action.id, mode: action.mode, level: action.level, questions: generateSession(action.mode, action.level), answers: [], cursor: 0 } };
    case 'answer':
      // Ignore repeated taps/Enter presses on an already checked question.
      if (!session || session.answers.length > session.cursor) return progress;
      return {
        ...progress,
        answered: progress.answered + 1,
        correct: progress.correct + Number(action.value === session.questions[session.cursor].answerMinor),
        active: { ...session, answers: [...session.answers, action.value] },
      };
    case 'next':
      if (!session || session.answers.length <= session.cursor) return progress;
      if (session.cursor === session.questions.length - 1) return finish(progress, action.finishedAt);
      return { ...progress, active: { ...session, cursor: session.cursor + 1 } };
    case 'finish':
      return finish(progress, action.finishedAt);
  }
}

const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const natural = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const validMode = (value: unknown) => ['mixed', 'percent', 'shopping'].includes(value as string);
const validLevel = (value: unknown) => ['basic', 'challenge'].includes(value as string);
function validQuestion(value: unknown): value is Question {
  return record(value) && typeof value.id === 'string' && typeof value.prompt === 'string' &&
    typeof value.explanation === 'string' && natural(value.answerMinor) &&
    ['percent', 'addition', 'discount'].includes(value.skill as string);
}
function validSession(value: unknown): value is Omit<Session, 'cursor'> & Record<string, unknown> {
  return record(value) && typeof value.id === 'string' && validMode(value.mode) && validLevel(value.level) &&
    Array.isArray(value.questions) && value.questions.length > 0 && value.questions.length <= 10 && value.questions.every(validQuestion) &&
    Array.isArray(value.answers) && value.answers.length <= value.questions.length && value.answers.every(answer => answer === null || natural(answer));
}

// Invalid/unknown versions are reported to the user, never silently overwritten.
export function readProgress(raw: string | null): Progress {
  if (raw === null) return emptyProgress();
  const value: unknown = JSON.parse(raw);
  if (!record(value) || value.version !== 1 || !natural(value.answered) || !natural(value.correct) ||
    value.correct > value.answered || !natural(value.sessions) || !Array.isArray(value.recent) || value.recent.length > 20 ||
    !value.recent.every(result => validSession(result) && record(result) && typeof result.finishedAt === 'string' &&
      Number.isFinite(Date.parse(result.finishedAt)) && result.answers.length === result.questions.length) ||
    !(value.active === null || (validSession(value.active) && record(value.active) && natural(value.active.cursor) &&
      value.active.cursor < value.active.questions.length &&
      (value.active.answers.length === value.active.cursor || value.active.answers.length === value.active.cursor + 1)))) {
    throw new Error('Unsupported or damaged progress data');
  }
  return value as Progress;
}
