import type { Question } from './training.ts';

export type MultiplicationStep = {
  digit: number;
  place: number;
  digitProduct: number;
  partialProduct: number;
};

// The first factor is expressed in hundredths, just like the app's money values.
// For 25% of 1300 rubles, 1% is 1300 kopecks: the worked example is 13 × 25.
export function buildMultiplication(multiplicandMinor: number, multiplier: number) {
  if (!Number.isSafeInteger(multiplicandMinor) || multiplicandMinor < 0 ||
    !Number.isSafeInteger(multiplier) || multiplier < 0 ||
    !Number.isSafeInteger(multiplicandMinor * multiplier)) {
    throw new RangeError('Multiplication needs non-negative, exact monetary values');
  }
  const decimalPlaces = multiplicandMinor % 100 === 0 ? 0 : multiplicandMinor % 10 === 0 ? 1 : 2;
  const integerFactor = multiplicandMinor / (100 / 10 ** decimalPlaces);
  const steps: MultiplicationStep[] = [...String(multiplier)].reverse().map((character, index) => {
    const digit = Number(character);
    const place = 10 ** index;
    const digitProduct = integerFactor * digit;
    return { digit, place, digitProduct, partialProduct: digitProduct * place };
  });
  const integerProduct = steps.reduce((sum, step) => sum + step.partialProduct, 0);
  const width = Math.max(String(integerFactor).length, String(multiplier).length, String(integerProduct).length);
  const row = (value: number, sign = ' ') => `${sign} ${String(value).padStart(width, ' ')}`;
  const rule = '─'.repeat(width + 2);
  const column = [row(integerFactor), row(multiplier, '×'), rule];
  if (steps.length > 1) {
    column.push(...steps.map((step, index) => row(step.partialProduct, index === 0 ? ' ' : '+')), rule);
  }
  column.push(row(integerProduct));
  return { multiplicandMinor, multiplier, integerFactor, decimalPlaces, integerProduct,
    resultMinor: multiplicandMinor * multiplier, steps, column: column.join('\n') };
}

export function getPercentMultiplication(question: Pick<Question, 'skill' | 'id' | 'answerMinor'>) {
  if (question.skill !== 'percent' && question.skill !== 'discount') return null;
  // v0 IDs already contain the original generator parameters. This also supports
  // saved sessions from before the visual explanation, without parsing Russian text.
  const match = /^(percent|discount):(\d+):(\d+)$/.exec(question.id);
  if (!match || match[1] !== question.skill) return null;
  const amountRubles = Number(match[2]);
  const rate = Number(match[3]);
  if (!Number.isSafeInteger(amountRubles) || !Number.isSafeInteger(rate) ||
    !Number.isSafeInteger(amountRubles * 100) || !Number.isSafeInteger(amountRubles * rate)) return null;
  const expectedAnswer = question.skill === 'percent' ? amountRubles * rate : amountRubles * (100 - rate);
  if (expectedAnswer !== question.answerMinor) return null;
  return buildMultiplication(amountRubles, rate);
}
