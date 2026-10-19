import test from 'node:test';
import assert from 'node:assert/strict';
import { generateQuestion, generateSession, parseAnswer, SESSION_LENGTH } from '../src/training.ts';
import { correctCount, emptyProgress, readProgress, updateProgress } from '../src/progress.ts';

function seeded(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

test('accepts Russian and decimal-point money input without floating-point rounding', () => {
  for (const [input, expected] of [['0', 0], ['0,01', 1], ['0.29', 29], ['125,5', 12550], ['1 234,50', 123450], ['1\u202f234.50', 123450], [' 42 ', 4200]]) {
    assert.equal(parseAnswer(input), expected, input);
  }
});

test('rejects incomplete, negative, scientific, and over-precise input', () => {
  for (const input of ['', ' ', '-1', '1e3', '12abc', '1.001', '1,2,3', '1.', 'NaN', 'Infinity', '1000000000', '1\n2']) {
    assert.equal(parseAnswer(input), null, input);
  }
});

test('thousands of generated monetary answers match independent integer calculations', () => {
  const random = seeded(742);
  for (const level of ['basic', 'challenge']) {
    for (const skill of ['percent', 'addition', 'discount']) {
      for (let iteration = 0; iteration < 1000; iteration++) {
        const question = generateQuestion(skill, level, random);
        const [, ...parameters] = question.id.split(':');
        const values = parameters.map(BigInt);
        const expected = skill === 'addition' ? values.reduce((sum, value) => sum + value, 0n)
          : skill === 'percent' ? values[0] * values[1]
          : values[0] * (100n - values[1]);
        assert.equal(BigInt(question.answerMinor), expected);
        assert.ok(question.answerMinor > 0);
        assert.ok(question.prompt.length > 0 && question.explanation.length > 0);
      }
    }
  }
});

test('sessions cover the chosen skills and contain ten different tasks', () => {
  const random = seeded(19);
  for (const mode of ['mixed', 'percent', 'shopping']) {
    for (const level of ['basic', 'challenge']) {
      for (let index = 0; index < 100; index++) {
        const questions = generateSession(mode, level, random);
        assert.equal(questions.length, SESSION_LENGTH);
        assert.equal(new Set(questions.map(question => question.id)).size, SESSION_LENGTH);
        const skills = [...new Set(questions.map(question => question.skill))].sort();
        assert.deepEqual(skills, mode === 'mixed' ? ['addition', 'discount', 'percent'] : mode === 'percent' ? ['percent'] : ['addition', 'discount']);
      }
    }
  }
});

const start = () => updateProgress(emptyProgress(), { type: 'start', mode: 'percent', level: 'challenge', id: 'session-1' });
const next = { type: 'next', finishedAt: '2026-10-19T19:00:00.000Z' };

test('checked answers survive reload and repeated taps do not count twice', () => {
  let progress = start();
  const value = progress.active.questions[0].answerMinor;
  progress = updateProgress(progress, { type: 'answer', value });
  const restored = readProgress(JSON.stringify(progress));
  assert.equal(restored.active.answers[0], value);
  assert.equal(restored.active.cursor, 0);
  assert.equal(restored.correct, 1);
  assert.deepEqual(updateProgress(restored, { type: 'answer', value }), restored);
  assert.equal(updateProgress(restored, next).active.cursor, 1);
});

test('cannot skip ahead before answering or overwrite an active session', () => {
  const progress = start();
  assert.deepEqual(updateProgress(progress, next), progress);
  assert.deepEqual(updateProgress(progress, { type: 'start', mode: 'percent', level: 'basic', id: 'replacement' }), progress);
});

test('full sessions count correct, wrong and skipped answers and finish exactly once', () => {
  let progress = start();
  for (let index = 0; index < SESSION_LENGTH; index++) {
    const correct = progress.active.questions[index].answerMinor;
    const value = index === 0 ? null : index === 1 ? correct + 1 : correct;
    progress = updateProgress(progress, { type: 'answer', value });
    progress = updateProgress(progress, next);
  }
  assert.equal(progress.active, null);
  assert.equal(progress.answered, 10);
  assert.equal(progress.correct, 8);
  assert.equal(progress.sessions, 1);
  assert.equal(correctCount(progress.recent[0]), 8);
  assert.deepEqual(readProgress(JSON.stringify(progress)), progress);
  assert.deepEqual(updateProgress(progress, next), progress);
  assert.deepEqual(updateProgress(progress, { type: 'finish', finishedAt: next.finishedAt }), progress);
});

test('early finish records only answered questions; empty runs are not counted', () => {
  assert.deepEqual(updateProgress(start(), { type: 'finish', finishedAt: next.finishedAt }), emptyProgress());
  let progress = updateProgress(start(), { type: 'answer', value: null });
  progress = updateProgress(progress, { type: 'finish', finishedAt: next.finishedAt });
  assert.equal(progress.answered, 1);
  assert.equal(progress.sessions, 1);
  assert.equal(progress.recent[0].questions.length, 1);
  assert.equal(progress.recent[0].answers.length, 1);
  assert.equal(correctCount(progress.recent[0]), 0);
  assert.deepEqual(readProgress(JSON.stringify(progress)), progress);
});

test('keeps a bounded history while retaining lifetime counters', () => {
  let progress = emptyProgress();
  for (let index = 0; index < 25; index++) {
    progress = updateProgress(progress, { type: 'start', mode: 'percent', level: 'basic', id: String(index) });
    progress = updateProgress(progress, { type: 'answer', value: progress.active.questions[0].answerMinor });
    progress = updateProgress(progress, { type: 'finish', finishedAt: next.finishedAt });
  }
  assert.equal(progress.recent.length, 20);
  assert.equal(progress.recent[0].id, '24');
  assert.equal(progress.sessions, 25);
  assert.equal(progress.answered, 25);
  assert.equal(progress.correct, 25);
});

test('invalid storage is rejected rather than silently erased', () => {
  assert.deepEqual(readProgress(null), emptyProgress());
  for (const raw of ['{', 'null', '{}', JSON.stringify({ ...emptyProgress(), version: 2 }), JSON.stringify({ ...emptyProgress(), correct: 1 })]) {
    assert.throws(() => readProgress(raw));
  }
  const progress = start();
  progress.active.cursor = 100;
  assert.throws(() => readProgress(JSON.stringify(progress)));
  progress.active.cursor = 0;
  progress.active.questions[0].answerMinor = -1;
  assert.throws(() => readProgress(JSON.stringify(progress)));
});
