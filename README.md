# KickStudy
Open-source financial skills trainer. Build fluency in everyday math, budgeting, credit, and taxes through practice, with community-made local content.

## Product concept

The product concept is **ПЕНДЕЛЬ (Pendel)**: a worn-out, foul-mouthed cartoon boot
that pushes you to practice everyday financial skills. Its defining rule is to
mock the costly consequences of not knowing, never humiliate the learner for
making a mistake. Errors get an explanation and more practice; progress gets
gruff respect.

The [product and character concept in Russian](docs/CONCEPT.ru.md) records the
character, original dialogue, proposed start screen, and rules for future copy.
The repository and current prototype still use the name **KickStudy**. Character
integration and the new identity are planned, not implemented in v0.1.

## v0.1 — a small field prototype

Currently implemented: **mental addition, percentages, and discounts**. Budgeting,
credit, taxes, contracts, regional content packs, and adaptive repetition are future
work, not current features. The interface is in Russian; rubles are sample money,
not a tax jurisdiction setting.

- Three training modes, two difficulty levels, 10 generated questions per session.
- Numeric answers, immediate feedback, and worked explanations.
- Optional, collapsed multiplication walkthroughs in percentage and discount
  feedback: digit-by-digit products, place values, column addition, and decimals.
- Local statistics, the last 20 sessions, and a review of mistakes at session end.
- An unfinished session survives reopening, including the last checked answer.
- No account, application server, API keys, AI calls, or analytics in the app.

## Run

Install **Node.js 24 LTS** and use npm (the lockfile is committed).

```sh
npm ci
npm start
```

On Android, install **Expo Go compatible with SDK 57**, connect the phone and
computer to the same local network, and scan the terminal's QR code in Expo Go.
If the store version no longer supports this SDK, use the matching Android version
from [Expo Go downloads](https://expo.dev/go). Windows may ask you to allow Node.js
through the firewall on your private network.

For a quick browser preview:

```sh
npm run web
```

The training logic and progress need no backend. In development, Expo Go initially
loads the app from the computer running Metro; this is not a standalone offline APK.
A production Android build is not included yet. Browser and phone progress are
separate. Clearing app/browser storage deletes progress.

## Check

```sh
npm run check
npx expo export --platform all
```

Tests cover money parsing, thousands of generated calculations, session completion,
duplicate submissions, interrupted sessions, and storage validation. Export checks
JavaScript bundling; it does not replace testing on an Android device.

## Code map

| File | Responsibility |
| --- | --- |
| `App.tsx` | Home, exercise, and results screens |
| `src/training.ts` | Task generators, explanations, money formatting and parsing |
| `src/multiplication.ts` | Exact partial products and column layout for percentage explanations |
| `src/MultiplicationHelp.tsx` | Expandable multiplication walkthrough in feedback and mistake review |
| `src/progress.ts` | Session state and progress validation |
| `src/useProgress.ts` | Local persistence with AsyncStorage |
| `tests/training.test.mjs` | Calculation and session behavior checks |

Money is represented as integer kopecks. Current templates produce exact answers;
there are no implicit rounding rules. A skipped answer counts as incorrect. The
accuracy percentage includes all checked answers, even in unfinished sessions.
This prototype has no time limits and does not yet measure long-term learning.

See [CONTRIBUTING.md](CONTRIBUTING.md) for a small first contribution.

## Быстрый старт по-русски

1. Установи Node.js 24 LTS, выполни `npm ci`, затем `npm start`.
2. Открой QR-код через Expo Go для SDK 57 на Android. Телефон и компьютер должны
   быть в одной локальной сети. Для проверки в браузере используй `npm run web`.
3. Выбери тему и сложность. Введи сумму без знака валюты: `125`, `125,50` или `125.50`.
4. После проверки посмотри разбор. «Пока не знаю» показывает решение и считается
   ошибкой. «На главную» оставляет подход открытым; «Закончить подход сейчас»
   сохраняет результат по уже отвеченным задачам.
5. Если непонятен шаг вроде `13 × 25`, раскрой «Как умножить 13 × 25?» под
   объяснением. Там показаны отдельные произведения `13 × 5` и `13 × 20`, затем
   их сложение столбиком. Подсказка изначально закрыта в каждой задаче.

В v0 есть проценты, сложение цен и скидки. Налоги, кредиты, семейный бюджет и
договоры пока не реализованы. Данные остаются в хранилище текущего приложения
или браузера; синхронизации между устройствами нет.
