# Contributing to KickStudy

Keep v0 small and runnable. A useful first contribution is a clearer explanation,
a reproducible bug report, or a tested exercise variant.

Before changing product copy or adding character reactions, read the
[Pendel concept](docs/CONCEPT.ru.md). The boot is provocative and on the learner's
side: jokes target costly mistakes and financial traps, not a person's intelligence
or circumstances. Feedback must still explain the answer. Translations should
preserve that relationship rather than copy insults literally.

1. Follow the setup in [README.md](README.md).
2. Make one focused change. Keep calculation logic in `src/training.ts`, independent
   of React Native and local storage.
3. Add a meaningful calculation or session test when changing that behavior.
4. Run `npm run check` and `npx expo export --platform all`.
5. In the pull request, explain the change, how it was checked, and include a
   screenshot for visible UI changes. State whether you tested on Android or web.

Use integer minor units for money. Specify rounding rules before adding a task that
requires rounding. Do not use generated prose as the source of a financial answer.
Keep new exercises in the existing simple structure until a real use case requires
content packages or another abstraction.

For proposed tax or contract exercises, include the jurisdiction, effective date,
official sources, and a worked example. These topics need content review before
being included in the app.

Do not add service credentials, real financial documents, or user progress to the
repository. Prefer changes that run locally without accounts or paid services.

Bug reports and discussions in Russian or English are welcome.
