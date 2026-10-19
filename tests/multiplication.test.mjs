import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMultiplication, getPercentMultiplication } from '../src/multiplication.ts';
import { generateQuestion } from '../src/training.ts';

test('25% of 1300 is explained as 13 × 25, then 65 + 260 = 325', () => {
  const work = getPercentMultiplication({ skill: 'percent', id: 'percent:1300:25', answerMinor: 32500 });
  assert.equal(work.integerFactor, 13);
  assert.equal(work.decimalPlaces, 0);
  assert.deepEqual(work.steps, [
    { digit: 5, place: 1, digitProduct: 65, partialProduct: 65 },
    { digit: 2, place: 10, digitProduct: 26, partialProduct: 260 },
  ]);
  assert.equal(work.resultMinor, 32500);
  assert.equal(work.column, '   13\n×  25\n─────\n   65\n+ 260\n─────\n  325');
});

test('zero digits keep their position and hundreds are multiplied by 100', () => {
  const work = buildMultiplication(1300, 103);
  assert.deepEqual(work.steps.map(step => [step.digit, step.place, step.partialProduct]), [[3, 1, 39], [0, 10, 0], [1, 100, 1300]]);
  assert.equal(work.integerProduct, 1339);
  assert.equal(work.resultMinor, 133900);
  assert.equal(buildMultiplication(1300, 0).resultMinor, 0);
});

test('decimal first factors preserve one or two decimal places exactly', () => {
  const tenths = buildMultiplication(1850, 12);
  assert.equal(tenths.integerFactor, 185);
  assert.equal(tenths.decimalPlaces, 1);
  assert.deepEqual(tenths.steps.map(step => step.partialProduct), [370, 1850]);
  assert.equal(tenths.integerProduct, 2220);
  assert.equal(tenths.resultMinor, 22200);
  const hundredths = buildMultiplication(29, 25);
  assert.equal(hundredths.integerFactor, 29);
  assert.equal(hundredths.decimalPlaces, 2);
  assert.equal(hundredths.integerProduct, 725);
  assert.equal(hundredths.resultMinor, 725);
});

test('single-digit multiplication has one product and no artificial addition', () => {
  const work = buildMultiplication(1300, 5);
  assert.equal(work.steps.length, 1);
  assert.equal(work.column, '  13\n×  5\n────\n  65');
});

test('saved discount questions explain the discount amount, not the final price', () => {
  const question = JSON.parse(JSON.stringify({ skill: 'discount', id: 'discount:1300:25', answerMinor: 97500 }));
  const work = getPercentMultiplication(question);
  assert.equal(work.resultMinor, 32500);
  assert.equal(work.multiplicandMinor * 100 - work.resultMinor, question.answerMinor);
});

test('missing, mismatched, or unsafe generator parameters do not show a misleading explanation', () => {
  for (const question of [
    { skill: 'addition', id: 'addition:1300:25', answerMinor: 1325 },
    { skill: 'percent', id: 'custom-template', answerMinor: 32500 },
    { skill: 'percent', id: 'discount:1300:25', answerMinor: 32500 },
    { skill: 'percent', id: 'percent:1300:25', answerMinor: 325 },
    { skill: 'percent', id: 'percent:9007199254740991:25', answerMinor: 0 },
  ]) assert.equal(getPercentMultiplication(question), null);
  for (const pair of [[-1, 2], [1.5, 2], [100, -1], [100, 1.5], [Infinity, 2], [Number.MAX_SAFE_INTEGER, 2]]) {
    assert.throws(() => buildMultiplication(...pair), RangeError);
  }
});

test('generated percentage and discount explanations add up to their exact answers', () => {
  let seed = 438;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (const skill of ['percent', 'discount']) {
    for (const level of ['basic', 'challenge']) {
      for (let index = 0; index < 300; index++) {
        const question = generateQuestion(skill, level, random);
        const work = getPercentMultiplication(question);
        assert.ok(work);
        const total = work.steps.reduce((sum, step) => sum + step.partialProduct, 0);
        assert.equal(total, work.integerProduct);
        assert.equal(total * (100 / 10 ** work.decimalPlaces), work.resultMinor);
        assert.equal(skill === 'percent' ? work.resultMinor : work.multiplicandMinor * 100 - work.resultMinor, question.answerMinor);
      }
    }
  }
});
