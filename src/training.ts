export type Mode = 'mixed' | 'percent' | 'shopping';
export type Level = 'basic' | 'challenge';
export type Skill = 'percent' | 'addition' | 'discount';
export type Random = () => number;

export type Question = {
  id: string;
  skill: Skill;
  prompt: string;
  answerMinor: number;
  explanation: string;
};

export const SESSION_LENGTH = 10;
export const MODE_LABELS: Record<Mode, string> = {
  mixed: 'Всё вперемешку',
  percent: 'Проценты',
  shopping: 'Покупки',
};
export const SKILL_LABELS: Record<Skill, string> = {
  percent: 'Проценты от суммы',
  addition: 'Счёт в магазине',
  discount: 'Цена со скидкой',
};

const pick = <T>(items: readonly T[], random: Random): T =>
  items[Math.floor(random() * items.length)];
const integer = (min: number, max: number, random: Random) =>
  min + Math.floor(random() * (max - min + 1));

// All monetary arithmetic uses integer kopecks. Floating point is only used for display.
export function formatAmount(minor: number): string {
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(minor / 100);
}

export function parseAnswer(input: string): number | null {
  const normalized = input.trim().replace(/[ \u00a0\u202f]/g, '').replace(',', '.');
  if (!/^\d{1,9}(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, fraction = ''] = normalized.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}

export function generateQuestion(skill: Skill, level: Level, random: Random = Math.random): Question {
  const basic = level === 'basic';
  if (skill === 'addition') {
    const count = basic ? 2 : 3;
    const prices = Array.from({ length: count }, () =>
      basic ? integer(3, 35, random) * 1000 : integer(20, 490, random) * 100 + pick([50, 90, 99], random),
    );
    const answerMinor = prices.reduce((sum, price) => sum + price, 0);
    return {
      id: `addition:${prices.join(':')}`,
      skill,
      prompt: `В корзине товары за ${prices.map(price => `${formatAmount(price)} ₽`).join(', ')}. Сколько всего?`,
      answerMinor,
      explanation: `${prices.map(formatAmount).join(' + ')} = ${formatAmount(answerMinor)} ₽. Складывай отдельно рубли и копейки, затем объедини результат.`,
    };
  }

  const amount = basic ? integer(2, 40, random) * 100 : integer(15, 250, random) * 10;
  const rate = basic ? pick([1, 5, 10, 20, 25, 50], random) : pick([5, 12, 15, 18, 25, 35], random);
  // amount is in rubles: amount * rate is the exact percentage in kopecks.
  const partMinor = amount * rate;
  const baseMinor = amount * 100;
  if (skill === 'percent') {
    return {
      id: `percent:${amount}:${rate}`,
      skill,
      prompt: `Сколько составляют ${rate}% от ${formatAmount(baseMinor)} ₽?`,
      answerMinor: partMinor,
      explanation: `1% = ${formatAmount(amount)} ₽. Значит, ${rate}% = ${formatAmount(amount)} × ${rate} = ${formatAmount(partMinor)} ₽.`,
    };
  }
  const answerMinor = baseMinor - partMinor;
  return {
    id: `discount:${amount}:${rate}`,
    skill,
    prompt: `Цена — ${formatAmount(baseMinor)} ₽. Скидка — ${rate}%. Сколько заплатишь?`,
    answerMinor,
    explanation: `Скидка: ${formatAmount(baseMinor)} × ${rate} / 100 = ${formatAmount(partMinor)} ₽. К оплате: ${formatAmount(baseMinor)} − ${formatAmount(partMinor)} = ${formatAmount(answerMinor)} ₽.`,
  };
}

export function generateSession(mode: Mode, level: Level, random: Random = Math.random): Question[] {
  const skills: Skill[] = mode === 'percent' ? ['percent'] : mode === 'shopping' ? ['addition', 'discount'] : ['percent', 'addition', 'discount'];
  const questions: Question[] = [];
  const seen = new Set<string>();
  for (let index = 0; index < SESSION_LENGTH; index++) {
    const skill = skills[index % skills.length];
    let question = generateQuestion(skill, level, random);
    for (let retry = 0; seen.has(question.id) && retry < 100; retry++) {
      question = generateQuestion(skill, level, random);
    }
    seen.add(question.id);
    questions.push(question);
  }
  for (let index = questions.length - 1; index > 0; index--) {
    const other = integer(0, index, random);
    [questions[index], questions[other]] = [questions[other], questions[index]];
  }
  return questions;
}
