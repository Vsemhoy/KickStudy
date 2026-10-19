import type { Question } from './training.ts';

const PLACE_NAMES = ['Единицы', 'Десятки', 'Сотни', 'Тысячи', 'Десятки тысяч', 'Сотни тысяч', 'Миллионы'];
const placeName = (placeMinor: number) => placeMinor === 1 ? 'Копейки' :
  PLACE_NAMES[Math.round(Math.log10(placeMinor)) - 2] ?? `Разряд ${placeMinor / 100} ₽`;

export type AdditionCarry = {
  from: string;
  to: string;
  totalMinor: number;
  movedMinor: number;
  remainderMinor: number;
  nextBeforeMinor: number;
  nextAfterMinor: number;
};

export function buildAddition(pricesMinor: readonly number[]) {
  const resultMinor = pricesMinor.reduce((sum, price) => sum + price, 0);
  if (pricesMinor.length < 2 || pricesMinor.length > 5 ||
    pricesMinor.some(price => !Number.isSafeInteger(price) || price < 0) ||
    !Number.isSafeInteger(resultMinor)) {
    throw new RangeError('Addition needs 2–5 non-negative, exact monetary values');
  }
  const places = [100];
  const highestPrice = Math.max(...pricesMinor);
  for (let place = 1000; place <= highestPrice; place *= 10) places.push(place);
  // Older saved baskets may contain kopecks. Keep them exact, as a separate group.
  if (pricesMinor.some(price => price % 100 !== 0)) places.unshift(1);
  const groups = places.map(placeMinor => {
    const base = placeMinor === 1 ? 100 : 10;
    const partsMinor = pricesMinor.map(price => Math.floor(price / placeMinor) % base * placeMinor);
    return { placeMinor, label: placeName(placeMinor), partsMinor,
      totalMinor: partsMinor.reduce((sum, part) => sum + part, 0) };
  });

  const totals = groups.map(group => group.totalMinor);
  const carries: AdditionCarry[] = [];
  for (let index = 0; index < totals.length; index++) {
    const nextPlace = places[index] === 1 ? 100 : places[index] * 10;
    const movedMinor = Math.floor(totals[index] / nextPlace) * nextPlace;
    if (!movedMinor) continue;
    const nextBeforeMinor = totals[index + 1] ?? 0;
    const nextAfterMinor = nextBeforeMinor + movedMinor;
    carries.push({ from: placeName(places[index]), to: placeName(nextPlace),
      totalMinor: totals[index], movedMinor, remainderMinor: totals[index] - movedMinor,
      nextBeforeMinor, nextAfterMinor });
    totals[index] -= movedMinor;
    if (places[index + 1] === undefined) places.push(nextPlace);
    totals[index + 1] = nextAfterMinor;
  }

  // Show large groups first, matching the mental-arithmetic explanation.
  groups.reverse();
  return {
    prices: pricesMinor.map((priceMinor, index) => ({ priceMinor,
      partsMinor: groups.map(group => group.partsMinor[index]) })),
    groups, carries, resultMinor, normalizedPartsMinor: totals.reverse().filter(part => part !== 0),
  };
}

export function getBasketAddition(question: Pick<Question, 'skill' | 'id' | 'answerMinor'>) {
  if (question.skill !== 'addition' || !/^addition:(?:\d+:){1,4}\d+$/.test(question.id)) return null;
  const prices = question.id.split(':').slice(1).map(Number);
  if (prices.some(price => !Number.isSafeInteger(price)) ||
    !Number.isSafeInteger(question.answerMinor) ||
    prices.reduce((sum, price) => sum + price, 0) !== question.answerMinor) return null;
  return buildAddition(prices);
}
