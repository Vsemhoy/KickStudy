import test from 'node:test';
import assert from 'node:assert/strict';
import { createCardDiscount, generateQuestion, wholeRubleDiscountRates } from '../src/training.ts';
import { answeredExercises, correctCount, emptyProgress, isCardPending, isCardStage, readProgress, updateProgress } from '../src/progress.ts';
import { pickPendelLine } from '../src/pendel.ts';

function seeded(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

test('baskets mix round and irregular whole-ruble prices, 2–5 items and 25% card events', () => {
  for (const level of ['basic', 'challenge']) {
    const random = seeded(571);
    const counts = new Set();
    let cards = 0;
    let roundPrices = 0;
    let allPrices = 0;
    for (let iteration = 0; iteration < 4000; iteration++) {
      const question = generateQuestion('addition', level, random);
      const prices = question.id.split(':').slice(1).map(Number);
      counts.add(prices.length);
      assert.ok(prices.length >= 2 && prices.length <= 5);
      for (const price of prices) {
        assert.equal(price % 100, 0);
        assert.ok(price >= 2500 && price <= (level === 'basic' ? 59900 : 149900));
        allPrices++;
        roundPrices += Number(price % 1000 === 0);
      }
      const sum = prices.reduce((total, price) => total + price, 0);
      assert.equal(question.answerMinor, sum);
      if (question.cardDiscount) {
        cards++;
        const [, totalRubles, rate] = question.cardDiscount.id.split(':').map(Number);
        assert.equal(totalRubles * 100, sum);
        assert.ok(Number.isInteger(rate) && rate >= 1 && rate <= 25);
        assert.equal(question.cardDiscount.answerMinor, totalRubles * (100 - rate));
        assert.equal(question.cardDiscount.answerMinor % 100, 0);
      }
    }
    assert.deepEqual([...counts].sort(), [2, 3, 4, 5]);
    assert.ok(cards / 4000 > 0.23 && cards / 4000 < 0.27, `${cards} cards`);
    assert.ok(roundPrices / allPrices > 0.29 && roundPrices / allPrices < 0.38, 'roughly a third of prices end in zero');
  }
});

test('card chance remains 25% even when original prices need adjustment; round prices stay round', () => {
  for (const [draw, expectedCard] of [[0, true], [0.249999, true], [0.25, false], [0.999, false]]) {
    // Two items: 30 and 27 rubles. A card needs an adjustment to keep payment whole.
    const draws = [0, 0, 0, 0.5, 2.5 / 575, draw, 0.5];
    const question = generateQuestion('addition', 'basic', () => draws.shift() ?? 0.5);
    assert.equal(!!question.cardDiscount, expectedCard);
    assert.equal(Number(question.id.split(':')[1]), 3000);
    assert.equal(question.answerMinor, expectedCard ? 6000 : 5700);
  }
});

test('discount candidates include only 1–25% rates producing whole-ruble payments', () => {
  assert.deepEqual(wholeRubleDiscountRates(60000), Array.from({ length: 25 }, (_, i) => i + 1));
  assert.deepEqual(wholeRubleDiscountRates(12500), [4, 8, 12, 16, 20, 24]);
  assert.deepEqual(wholeRubleDiscountRates(60400), [25]);
  for (const total of [0, -100, 60100, 12345, 100.5, NaN, Infinity, Number.MAX_SAFE_INTEGER]) {
    assert.deepEqual(wholeRubleDiscountRates(total), []);
    assert.equal(createCardDiscount(total), undefined);
  }
});

const next = { type: 'next', finishedAt: '2026-10-20T18:00:00.000Z' };
const finish = { type: 'finish', finishedAt: next.finishedAt };
function startWithCard(index = 0) {
  const progress = updateProgress(emptyProgress(), { type: 'start', mode: 'shopping', level: 'basic', id: 'card-session' });
  progress.active.questions = Array.from({ length: 10 }, () => generateQuestion('percent', 'basic', () => 0.5));
  progress.active.questions[index] = {
    id: 'addition:6700:12300:41000', skill: 'addition',
    prompt: 'В корзине товары за 67 ₽, 123 ₽, 410 ₽. Сколько всего?',
    answerMinor: 60000, explanation: '67 + 123 + 410 = 600 ₽.',
    cardDiscount: createCardDiscount(60000, () => 0.5),
  };
  return progress;
}

test('card is a second step after checking, survives reload, and counts each answer once', () => {
  let progress = startWithCard();
  assert.equal(isCardStage(progress.active), false);
  assert.deepEqual(updateProgress(progress, { type: 'answer-card', value: 1 }), progress);
  progress = updateProgress(progress, { type: 'answer', value: 60000 });
  assert.equal(isCardPending(progress.active), true);
  assert.equal(progress.answered, 1);
  assert.deepEqual(updateProgress(progress, next), progress);
  progress = readProgress(JSON.stringify(progress));
  const value = progress.active.questions[0].cardDiscount.answerMinor;
  progress = updateProgress(progress, { type: 'answer-card', value });
  assert.equal(isCardPending(progress.active), false);
  assert.equal(progress.answered, 2);
  assert.equal(progress.correct, 2);
  assert.equal(correctCount(progress.active), 2);
  assert.deepEqual(updateProgress(progress, { type: 'answer-card', value }), progress);
  assert.deepEqual(updateProgress(progress, { type: 'answer', value: 60000 }), progress);
  assert.deepEqual(readProgress(JSON.stringify(progress)), progress);
  assert.equal(updateProgress(progress, next).active.cursor, 1);
});

test('a wrong basket answer does not change the discount calculation or its independent score', () => {
  let progress = updateProgress(startWithCard(), { type: 'answer', value: 10000 });
  const card = progress.active.questions[0].cardDiscount;
  assert.equal(isCardPending(progress.active), true);
  assert.equal(card.answerMinor, 52200);
  progress = updateProgress(progress, { type: 'answer-card', value: card.answerMinor });
  progress = updateProgress(progress, finish);
  assert.equal(progress.answered, 2);
  assert.equal(progress.correct, 1);
  assert.equal(correctCount(progress.recent[0]), 1);
  assert.deepEqual(answeredExercises(progress.recent[0]).map(item => item.answer), [10000, 52200]);
  assert.deepEqual(readProgress(JSON.stringify(progress)), progress);
});

test('skipping a basket bypasses its card; skipping a card records its own missed answer', () => {
  const skippedBasket = updateProgress(startWithCard(), { type: 'answer', value: null });
  assert.equal(isCardStage(skippedBasket.active), false);
  assert.equal(updateProgress(skippedBasket, next).active.cursor, 1);
  assert.equal(answeredExercises(skippedBasket.active).length, 1);
  let progress = updateProgress(startWithCard(), { type: 'answer', value: 60000 });
  progress = updateProgress(progress, { type: 'answer-card', value: null });
  assert.equal(progress.answered, 2);
  assert.equal(progress.correct, 1);
  assert.equal(answeredExercises(progress.active)[1].answer, null);
  assert.equal(updateProgress(progress, next).active.cursor, 1);
  assert.deepEqual(readProgress(JSON.stringify(progress)), progress);
});

test('the final basket waits for its card before finishing; result includes both steps', () => {
  let progress = startWithCard(9);
  for (let index = 0; index < 10; index++) {
    progress = updateProgress(progress, { type: 'answer', value: progress.active.questions[index].answerMinor });
    if (index < 9) progress = updateProgress(progress, next);
  }
  assert.equal(progress.active.cursor, 9);
  assert.deepEqual(updateProgress(progress, next), progress);
  progress = updateProgress(progress, { type: 'answer-card', value: progress.active.questions[9].cardDiscount.answerMinor });
  progress = updateProgress(progress, next);
  assert.equal(progress.active, null);
  assert.equal(progress.sessions, 1);
  assert.equal(progress.answered, 11);
  assert.equal(progress.correct, 11);
  assert.equal(answeredExercises(progress.recent[0]).length, 11);
  assert.equal(correctCount(progress.recent[0]), 11);
  assert.deepEqual(readProgress(JSON.stringify(progress)), progress);
});

test('early finish on a pending card keeps only submitted answers', () => {
  let progress = updateProgress(startWithCard(), { type: 'answer', value: 60000 });
  progress = updateProgress(progress, finish);
  assert.equal(progress.active, null);
  assert.equal(progress.answered, 1);
  assert.equal(correctCount(progress.recent[0]), 1);
  assert.equal(answeredExercises(progress.recent[0]).length, 1);
  assert.deepEqual(readProgress(JSON.stringify(progress)), progress);
});

test('storage rejects orphan card answers and advancing past an unanswered second step', () => {
  for (const cardAnswers of [{ 0: 52200 }, { 1: null }, { '-1': 52200 }, { '01': 52200 }, []]) {
    const progress = startWithCard();
    progress.active.cardAnswers = cardAnswers;
    assert.throws(() => readProgress(JSON.stringify(progress)));
  }
  const skipped = updateProgress(startWithCard(), { type: 'answer', value: null });
  skipped.active.cardAnswers = { 0: 52200 };
  assert.throws(() => readProgress(JSON.stringify(skipped)));
  const pending = updateProgress(startWithCard(), { type: 'answer', value: 60000 });
  pending.active.cursor = 1;
  assert.throws(() => readProgress(JSON.stringify(pending)));
});

test('Pendel speaks on about 20% of explanations, including multiplication by one', () => {
  for (const context of ['correct', 'incorrect', 'skipped', 'times-one']) {
    assert.equal(pickPendelLine(context, () => 0.2), null);
    assert.equal(pickPendelLine(context, () => 0.999), null);
    assert.equal(typeof pickPendelLine(context, () => 0.199999), 'string');
    const random = seeded(93);
    let spoken = 0;
    const lines = new Set();
    for (let index = 0; index < 5000; index++) {
      const line = pickPendelLine(context, random);
      if (line) { spoken++; lines.add(line); }
    }
    assert.ok(spoken > 900 && spoken < 1100);
    assert.ok(lines.size >= 8, 'varied lines in each context');
  }
});
