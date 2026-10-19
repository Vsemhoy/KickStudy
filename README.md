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
The repository and current prototype still use the name **KickStudy**. Pendel's
occasional feedback lines are implemented; the boot artwork and new identity are planned.

## v0.1 — a small field prototype

Currently implemented: **mental addition, percentages, and discounts**. Budgeting,
credit, taxes, contracts, regional content packs, and adaptive repetition are future
work, not current features. The interface is in Russian; rubles are sample money,
not a tax jurisdiction setting.

- Three training modes, two difficulty levels, 10 generated questions per session.
- Numeric answers, immediate feedback, and worked explanations.
- Baskets of 2–5 whole-ruble prices: a mix of round tens and everyday amounts.
  Prices range from 25 to 599 rubles in basic mode, up to 1,499 in challenge mode.
- In 25% of baskets, checking the sum reveals a second step: a discount card for
  1–25%, chosen to leave a whole-ruble payment. Both answers count in statistics.
  Skipping the basket bypasses its card; the second step survives reopening.
- 36 Pendel lines, with a 20% chance per explanation. The other 80% stay plain.
  The answer field receives focus on each new exercise and discount-card step.
- Optional, collapsed multiplication walkthroughs in percentage and discount
  feedback: digit-by-digit products, place values, column addition, and decimals.
- Optional basket-addition walkthroughs: split each price into place values,
  add matching groups, and explain carries before combining the total.
  Available in feedback, before a discount-card question, and in mistake review.
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
For an app that runs away from the computer, build the offline test APK below.
Browser, Expo Go, and the installed APK have separate progress. Clearing app/browser
storage or uninstalling the APK deletes its progress.

## Offline Android APK (Windows)

The APK includes the JavaScript bundle and works without Expo Go, Metro, an account,
or a network connection. Questions, explanations, and progress all stay on the device.

Install Node.js 24, a JDK 17 toolchain, and the Android SDK. The first build needs
internet access to download Gradle and native dependencies. Android SDK components
and their licenses must be installed through SDK Manager. This SDK 57 project uses
Android SDK Platform 36, Build Tools 36.0.0, NDK 27.1.12297006, and CMake 3.22.1.
Some native dependencies also require Build Tools 35.0.0; Gradle can install them
once the SDK license has been accepted.
Then run:

```powershell
npm ci
npm run apk:android
```

The script checks the project, generates `android/`, and builds `assembleRelease`
with the JavaScript bundle embedded. The APK is copied to
`build/apk/kickstudy-0.1.0-preview.apk`. Gradle and generated build files are ignored
by Git. By default the APK supports ARM 32-bit and ARM 64-bit phones.
The minimum Android version is 7.0 (API 24). Local tool caches are excluded from
Metro's source indexing by `metro.config.cjs`.

The script finds `JAVA_HOME` and `ANDROID_HOME`, or common Windows SDK/JDK locations.
You can also pass explicit paths:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-apk.ps1 `
  -JavaPath 'C:\path\to\jdk-17' -SdkPath 'C:\path\to\Android\Sdk'
```

Copy the APK to the phone by USB or download it before going offline. Open it in
the phone's file manager and allow that app to install APKs if Android asks.
After installing, enable airplane mode, launch KickStudy, complete a few questions,
close it, and reopen it to check that progress resumes. Install later builds over
the existing app to keep progress; do not uninstall it between tests.

This is a field-test APK using the generated test signing key. A Google Play release
needs a separate signing setup. Building an APK does not verify behavior on a real phone.

## Check

```sh
npm run check
npx expo export --platform all
```

Tests cover money parsing, thousands of generated calculations, session completion,
duplicate submissions, discount-card steps, round-price and event frequencies,
interrupted sessions, and storage validation. Export checks
JavaScript bundling; it does not replace testing on an Android device.

## Code map

| File | Responsibility |
| --- | --- |
| `App.tsx` | Home, exercise, and results screens |
| `src/training.ts` | Task generators, explanations, money formatting and parsing |
| `src/multiplication.ts` | Exact partial products and column layout for percentage explanations |
| `src/MultiplicationHelp.tsx` | Expandable multiplication walkthrough in feedback and mistake review |
| `src/addition.ts` | Exact place-value groups and carries for basket explanations |
| `src/AdditionHelp.tsx` | Expandable basket-addition walkthrough |
| `src/Explanation.tsx` | Explanation with an occasional character reaction |
| `src/pendel.ts` | Pendel's lines and their display probability |
| `src/progress.ts` | Session state and progress validation |
| `src/useProgress.ts` | Local persistence with AsyncStorage |
| `tests/training.test.mjs` | Calculation and session behavior checks |
| `tests/addition.test.mjs` | Basket place values, chained carries, and saved kopeck prices |
| `tests/shopping.test.mjs` | Baskets, discount-card lifecycle, and character frequency checks |

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
6. Для корзины раскрой «Как сложить цены по разрядам?»: разбери каждую цену,
   сложи сотни, десятки и единицы, затем собери итог. Переносы в следующий разряд
   тоже показаны по шагам.

В v0 есть проценты, сложение цен и скидки. Налоги, кредиты, семейный бюджет и
договоры пока не реализованы. Данные остаются в хранилище текущего приложения
или браузера; синхронизации между устройствами нет.
