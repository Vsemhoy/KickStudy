import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAddition, getBasketAddition } from '../src/addition.ts';
import { generateQuestion } from '../src/training.ts';

test('67 + 123 + 411 is grouped as 500 + 90 + 11, with two carries to 601', () => {
  const work = getBasketAddition({ skill: 'addition', id: 'addition:6700:12300:41100', answerMinor: 60100 });
  assert.deepEqual(work.prices.map(price => price.partsMinor), [
    [0, 6000, 700], [10000, 2000, 300], [40000, 1000, 100],
  ]);
  assert.deepEqual(work.groups.map(group => [group.label, group.totalMinor]), [
    ['Сотни', 50000], ['Десятки', 9000], ['Единицы', 1100],
  ]);
  assert.deepEqual(work.carries, [
    { from: 'Единицы', to: 'Десятки', totalMinor: 1100, movedMinor: 1000, remainderMinor: 100, nextBeforeMinor: 9000, nextAfterMinor: 10000 },
    { from: 'Десятки', to: 'Сотни', totalMinor: 10000, movedMinor: 10000, remainderMinor: 0, nextBeforeMinor: 50000, nextAfterMinor: 60000 },
  ]);
  assert.deepEqual(work.normalizedPartsMinor, [60000, 100]);
  assert.equal(work.resultMinor, 60100);
});

test('round prices keep zero places and do not invent carries', () => {
  const work = buildAddition([12000, 20000, 7000]);
  assert.deepEqual(work.prices.map(price => price.partsMinor), [[10000, 2000, 0], [20000, 0, 0], [0, 7000, 0]]);
  assert.deepEqual(work.carries, []);
  assert.deepEqual(work.normalizedPartsMinor, [30000, 9000]);
  assert.equal(work.resultMinor, 39000);
  assert.equal(buildAddition([0, 0]).resultMinor, 0);
});

test('five prices can carry several tens, hundreds, and a new thousands place', () => {
  const work = buildAddition(Array(5).fill(99900));
  assert.deepEqual(work.carries.map(carry => [carry.totalMinor, carry.movedMinor, carry.remainderMinor]), [
    [4500, 4000, 500], [49000, 40000, 9000], [490000, 400000, 90000],
  ]);
  assert.deepEqual(work.normalizedPartsMinor, [400000, 90000, 9000, 500]);
  assert.equal(work.resultMinor, 499500);
  const thousands = buildAddition([149900, 12100]);
  assert.equal(thousands.groups[0].label, 'Тысячи');
  assert.equal(thousands.resultMinor, 162000);
});

test('older saved baskets with kopecks get exact groups and carry 100 kopecks into a ruble', () => {
  const question = JSON.parse(JSON.stringify({ skill: 'addition', id: 'addition:19950:29990:1999', answerMinor: 51939 }));
  const work = getBasketAddition(question);
  assert.equal(work.groups.at(-1).label, 'Копейки');
  assert.deepEqual(work.groups.at(-1).partsMinor, [50, 90, 99]);
  assert.equal(work.carries[0].movedMinor, 200);
  assert.equal(work.carries[0].remainderMinor, 39);
  assert.deepEqual(work.normalizedPartsMinor, [50000, 1000, 900, 39]);
  assert.equal(work.resultMinor, 51939);
});

test('missing, mismatched, or unsafe parameters do not produce a misleading basket walkthrough', () => {
  for (const question of [
    { skill: 'percent', id: 'addition:6700:12300', answerMinor: 19000 },
    { skill: 'addition', id: 'custom', answerMinor: 19000 },
    { skill: 'addition', id: 'addition:6700', answerMinor: 6700 },
    { skill: 'addition', id: 'addition:6700:12300:', answerMinor: 19000 },
    { skill: 'addition', id: 'addition:6700:-12300', answerMinor: 19000 },
    { skill: 'addition', id: 'addition:6700:12300', answerMinor: 19001 },
    { skill: 'addition', id: 'addition:9007199254740992:100', answerMinor: 100 },
  ]) assert.equal(getBasketAddition(question), null);
  for (const prices of [[], [100], Array(6).fill(100), [-1, 100], [1.5, 100], [Infinity, 100], [Number.MAX_SAFE_INTEGER, 1]]) {
    assert.throws(() => buildAddition(prices), RangeError);
  }
});

test('generated basket decompositions and carries preserve the exact sum at both levels', () => {
  let seed = 925;
  const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  for (const level of ['basic', 'challenge']) {
    for (let index = 0; index < 500; index++) {
      const question = generateQuestion('addition', level, random);
      const work = getBasketAddition(question);
      assert.ok(work);
      const exactSum = question.id.split(':').slice(1).map(BigInt).reduce((sum, price) => sum + price, 0n);
      for (const price of work.prices) {
        assert.equal(price.partsMinor.reduce((sum, part) => sum + BigInt(part), 0n), BigInt(price.priceMinor));
      }
      assert.equal(work.groups.reduce((sum, group) => sum + BigInt(group.totalMinor), 0n), exactSum);
      assert.equal(work.normalizedPartsMinor.reduce((sum, part) => sum + BigInt(part), 0n), exactSum);
      assert.equal(BigInt(work.resultMinor), exactSum);
      for (const carry of work.carries) {
        assert.equal(carry.movedMinor + carry.remainderMinor, carry.totalMinor);
        assert.equal(carry.nextBeforeMinor + carry.movedMinor, carry.nextAfterMinor);
      }
    }
  }
});
