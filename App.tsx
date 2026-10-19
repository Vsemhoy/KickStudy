import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator, BackHandler, Keyboard, KeyboardAvoidingView, Platform,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { correctCount } from './src/progress';
import { formatAmount, MODE_LABELS, parseAnswer, SESSION_LENGTH, SKILL_LABELS } from './src/training';
import type { Level, Mode } from './src/training';
import { useProgress } from './src/useProgress';
import { MultiplicationHelp } from './src/MultiplicationHelp';

type Screen = 'home' | 'training' | 'result';
type ButtonProps = { label: string; onPress: () => void; secondary?: boolean; disabled?: boolean };

function Button({ label, onPress, secondary = false, disabled = false }: ButtonProps) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => [styles.button, secondary && styles.secondaryButton, disabled && styles.disabled, pressed && styles.pressed]}>
      <Text style={[styles.buttonText, secondary && styles.secondaryButtonText]}>{label}</Text>
    </Pressable>
  );
}

function Metric({ value, label }: { value: string; label: string }) {
  return <View style={styles.metric}><Text style={styles.metricValue}>{value}</Text><Text style={styles.muted}>{label}</Text></View>;
}

function AppContent() {
  const { progress, dispatch, ready, loadError, saveError, retryLoad } = useProgress();
  const [screen, setScreen] = useState<Screen>('home');
  const [mode, setMode] = useState<Mode>('mixed');
  const [level, setLevel] = useState<Level>('basic');
  const [input, setInput] = useState('');
  const [inputError, setInputError] = useState(false);
  const scroll = useRef<ScrollView>(null);
  const session = progress.active;
  const question = session?.questions[session.cursor];
  const checked = !!session && session.answers.length > session.cursor;
  const result = progress.recent[0];

  useEffect(() => {
    setInput('');
    setInputError(false);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }, [session?.id, session?.cursor, screen]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'home') return false;
      Keyboard.dismiss();
      setScreen('home');
      return true;
    });
    return () => subscription.remove();
  }, [screen]);

  const start = () => {
    dispatch({ type: 'start', mode, level, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });
    setScreen('training');
  };
  const answer = () => {
    if (checked) return;
    const value = parseAnswer(input);
    if (value === null) { setInputError(true); return; }
    Keyboard.dismiss();
    setInputError(false);
    dispatch({ type: 'answer', value });
  };
  const next = () => {
    if (!session || !checked) return;
    dispatch({ type: 'next', finishedAt: new Date().toISOString() });
    if (session.cursor === session.questions.length - 1) setScreen('result');
  };
  const finish = () => {
    Keyboard.dismiss();
    dispatch({ type: 'finish', finishedAt: new Date().toISOString() });
    setScreen(session?.answers.length ? 'result' : 'home');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView ref={scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.brand}>KICK<Text style={styles.brandAccent}>STUDY</Text></Text>
            <Text style={styles.version}>v0.1 · практика</Text>
          </View>

          {!ready ? (
            <View style={styles.card}>
              {loadError ? <>
                <Text style={styles.cardTitle}>Не получилось загрузить прогресс</Text>
                <Text style={styles.body}>Сохранённые данные не изменены. Проверь доступ к хранилищу и попробуй ещё раз.</Text>
                <Button label="Повторить загрузку" onPress={retryLoad} />
              </> : <><ActivityIndicator color={colors.green} /><Text style={styles.muted}>Загружаем прогресс…</Text></>}
            </View>
          ) : <>
            {saveError && <Text accessibilityRole="alert" style={styles.warning}>Не удалось сохранить прогресс. Пока не закрывай приложение: после следующего действия попробуем снова.</Text>}

            {screen === 'home' && <>
              <View style={styles.hero}>
                <Text style={styles.eyebrow}>МАЛЕНЬКАЯ ТРЕНИРОВКА. КАЖДЫЙ ДЕНЬ.</Text>
                <Text accessibilityRole="header" style={styles.title}>Прокачай{ '\n' }чувство чисел.</Text>
                <Text style={styles.body}>Цены, проценты, скидки. 10 задач, чтобы увереннее считать в обычной жизни.</Text>
              </View>

              <View style={styles.metrics}>
                <Metric value={String(progress.answered)} label="Ответы" />
                <Metric value={progress.answered ? `${Math.round(progress.correct / progress.answered * 100)}%` : '—'} label="Точность" />
                <Metric value={String(progress.sessions)} label="Подходы" />
              </View>

              {session ? <View style={styles.card}>
                <Text style={styles.eyebrow}>ТВОЯ ТРЕНИРОВКА СОХРАНЕНА</Text>
                <Text style={styles.cardTitle}>{MODE_LABELS[session.mode]}</Text>
                <Text style={styles.body}>Ответов: {session.answers.length} из {session.questions.length}. Продолжим с того же места.</Text>
                <Button label="Продолжить тренировку →" onPress={() => setScreen('training')} />
              </View> : <View style={styles.card}>
                <Text accessibilityRole="header" style={styles.cardTitle}>Что тренируем?</Text>
                <View style={styles.options}>
                  {([
                    ['mixed', 'Всё вперемешку', 'Проценты, суммы и скидки', '01'],
                    ['percent', 'Проценты', 'Быстро находить часть от суммы', '02'],
                    ['shopping', 'Покупки', 'Складывать цены и считать скидку', '03'],
                  ] as const).map(([value, title, description, number]) => (
                    <Pressable key={value} accessibilityRole="radio" accessibilityLabel={`${title}. ${description}`} accessibilityState={{ checked: mode === value }}
                      onPress={() => setMode(value)} style={({ pressed }) => [styles.option, mode === value && styles.selectedOption, pressed && styles.pressed]}>
                      <Text style={[styles.optionNumber, mode === value && styles.selectedNumber]}>{number}</Text>
                      <View style={styles.flex}><Text style={styles.optionTitle}>{title}</Text><Text style={styles.optionDescription}>{description}</Text></View>
                      <View style={[styles.radio, mode === value && styles.radioSelected]} />
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.fieldLabel}>Сложность</Text>
                <View style={styles.levels}>
                  {([['basic', 'База'], ['challenge', 'Сложнее']] as const).map(([value, label]) => (
                    <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: level === value }} onPress={() => setLevel(value)}
                      style={({ pressed }) => [styles.level, level === value && styles.selectedLevel, pressed && styles.pressed]}>
                      <Text style={[styles.levelText, level === value && styles.selectedLevelText]}>{label}</Text>
                    </Pressable>
                  ))}
                </View>
                <Text style={styles.muted}>{level === 'basic' ? 'Круглые суммы и знакомые проценты.' : 'Неудобные проценты и цены с копейками.'}</Text>
                <Button label="Начать · 10 задач →" onPress={start} />
              </View>}

              {progress.recent.length > 0 && <View style={styles.history}>
                <Text accessibilityRole="header" style={styles.cardTitle}>Последние подходы</Text>
                {progress.recent.slice(0, 3).map(item => <View key={item.id} style={styles.historyRow}>
                  <View style={styles.flex}><Text style={styles.optionTitle}>{MODE_LABELS[item.mode]}</Text><Text style={styles.muted}>{new Date(item.finishedAt).toLocaleDateString('ru-RU')} · {item.level === 'basic' ? 'База' : 'Сложнее'}</Text></View>
                  <Text style={styles.historyScore}>{correctCount(item)}/{item.answers.length}</Text>
                </View>)}
              </View>}
              <Text style={styles.footer}>Без таймера. В своём темпе.{ '\n' }Прогресс хранится только на этом устройстве.{ '\n' }Цены в рублях — учебные примеры.</Text>
            </>}

            {screen === 'training' && session && question && <>
              <Pressable accessibilityRole="button" onPress={() => { Keyboard.dismiss(); setScreen('home'); }} style={styles.back}><Text style={styles.backText}>← На главную</Text></Pressable>
              <View style={styles.progressHeader}><Text style={styles.eyebrow}>{SKILL_LABELS[question.skill]}</Text><Text style={styles.progressCount}>{session.cursor + 1} / {SESSION_LENGTH}</Text></View>
              <View accessible accessibilityRole="progressbar" accessibilityLabel="Решено задач" accessibilityValue={{ min: 0, max: SESSION_LENGTH, now: session.answers.length }} style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${session.answers.length / SESSION_LENGTH * 100}%` }]} />
              </View>
              <View style={styles.questionCard}>
                <Text style={styles.eyebrow}>ПОСЧИТАЙ В УМЕ</Text>
                <Text accessibilityRole="header" style={styles.question}>{question.prompt}</Text>
                {!checked ? <>
                  <Text style={styles.fieldLabel}>Твой ответ в рублях</Text>
                  <TextInput accessibilityLabel="Твой ответ в рублях" placeholder="Например, 125,50" placeholderTextColor={colors.muted} value={input}
                    onChangeText={value => { setInput(value); setInputError(false); }} keyboardType="decimal-pad" returnKeyType="done" autoCorrect={false}
                    maxLength={18} onSubmitEditing={answer} style={[styles.input, inputError && styles.inputInvalid]} />
                  {inputError && <Text accessibilityRole="alert" style={styles.errorText}>Введи число: например, 125 или 125,50.</Text>}
                  <Button label="Проверить" onPress={answer} disabled={!input.trim()} />
                  <Button label="Пока не знаю" secondary onPress={() => { Keyboard.dismiss(); dispatch({ type: 'answer', value: null }); }} />
                </> : <>
                  <View accessibilityLiveRegion="polite" style={[styles.feedback, session.answers[session.cursor] === question.answerMinor ? styles.correct : styles.incorrect]}>
                    <Text style={styles.cardTitle}>{session.answers[session.cursor] === question.answerMinor ? 'Верно!' : 'Разберём вместе'}</Text>
                    <Text style={styles.body}>{session.answers[session.cursor] === null ? 'Ты пропустил задачу.' : `Твой ответ: ${formatAmount(session.answers[session.cursor]!)} ₽.`}</Text>
                    <Text style={styles.answer}>Ответ: {formatAmount(question.answerMinor)} ₽</Text>
                    <Text style={styles.body}>{question.explanation}</Text>
                    <MultiplicationHelp key={`${session.id}:${session.cursor}`} question={question} />
                  </View>
                  <Button label={session.cursor === SESSION_LENGTH - 1 ? 'Посмотреть результат →' : 'Следующая задача →'} onPress={next} />
                </>}
              </View>
              <Button label="Закончить подход сейчас" secondary onPress={finish} />
              <Text style={styles.footer}>Сначала точность, потом скорость.{ '\n' }«Пока не знаю» учитывается как ответ с ошибкой.</Text>
            </>}

            {screen === 'result' && result && <>
              <View style={styles.hero}>
                <Text style={styles.eyebrow}>ПОДХОД ЗАВЕРШЁН</Text>
                <Text accessibilityRole="header" style={styles.title}>{correctCount(result) === result.answers.length ? 'Чистая работа.' : 'Практика в копилку.'}</Text>
                <Text style={styles.body}>{MODE_LABELS[result.mode]} · {result.level === 'basic' ? 'База' : 'Сложнее'}</Text>
              </View>
              <View style={styles.resultCard}>
                <Text style={styles.resultNumber}>{correctCount(result)}<Text style={styles.resultDenominator}> / {result.answers.length}</Text></Text>
                <Text style={styles.body}>правильных ответов</Text>
                <Text style={styles.muted}>{result.answers.length < SESSION_LENGTH ? 'Короткий подход тоже считается. Ответы учтены в статистике.' : 'Ответы учтены в статистике. Можно отдохнуть или сделать ещё подход.'}</Text>
              </View>
              <Button label="Ещё 10 задач →" onPress={() => {
                setMode(result.mode); setLevel(result.level);
                dispatch({ type: 'start', mode: result.mode, level: result.level, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` });
                setScreen('training');
              }} />
              <Button label="На главную" secondary onPress={() => setScreen('home')} />
              {correctCount(result) < result.answers.length && <View style={styles.history}>
                <Text accessibilityRole="header" style={styles.cardTitle}>Что стоит закрепить</Text>
                {result.questions.map((item, index) => result.answers[index] !== item.answerMinor && <View key={`${item.id}-${index}`} style={styles.reviewCard}>
                  <Text style={styles.optionTitle}>{item.prompt}</Text>
                  <Text style={styles.muted}>{result.answers[index] === null ? 'Пропущено' : `Твой ответ: ${formatAmount(result.answers[index]!)} ₽`}</Text>
                  <Text style={styles.answer}>Ответ: {formatAmount(item.answerMinor)} ₽</Text>
                  <Text style={styles.body}>{item.explanation}</Text>
                  <MultiplicationHelp question={item} />
                </View>)}
              </View>}
            </>}
          </>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default function App() {
  return <SafeAreaProvider><AppContent /></SafeAreaProvider>;
}

const colors = { background: '#F5F3ED', paper: '#FFFFFF', ink: '#202A26', muted: '#626D66', green: '#245D46', line: '#DDDCD3', lightGreen: '#EAF2EB', orange: '#FFF0DE' };
const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, width: '100%', maxWidth: 600, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 36, gap: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  brand: { fontSize: 21, fontWeight: '900', letterSpacing: -0.8, color: colors.ink },
  brandAccent: { color: colors.green },
  version: { color: colors.muted, fontSize: 12 },
  hero: { gap: 12, paddingTop: 14, paddingBottom: 4 },
  eyebrow: { color: colors.green, fontSize: 11, fontWeight: '700', letterSpacing: 1.1, flexShrink: 1 },
  title: { fontSize: 37, lineHeight: 42, fontWeight: '800', letterSpacing: -1.5, color: colors.ink },
  body: { fontSize: 16, lineHeight: 24, color: colors.ink },
  muted: { fontSize: 13, lineHeight: 19, color: colors.muted },
  metrics: { flexDirection: 'row', backgroundColor: '#ECEBE3', paddingVertical: 18, borderRadius: 18 },
  metric: { flex: 1, alignItems: 'center', gap: 3 },
  metricValue: { color: colors.ink, fontSize: 25, fontWeight: '700', fontVariant: ['tabular-nums'] },
  card: { backgroundColor: colors.paper, borderRadius: 20, padding: 20, gap: 16, borderWidth: 1, borderColor: colors.line },
  cardTitle: { color: colors.ink, fontSize: 20, fontWeight: '700', lineHeight: 26 },
  options: { gap: 8 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, minHeight: 78, borderWidth: 1, borderColor: colors.line, borderRadius: 12 },
  selectedOption: { backgroundColor: colors.lightGreen, borderColor: colors.green },
  optionNumber: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  selectedNumber: { color: colors.green },
  optionTitle: { color: colors.ink, fontWeight: '600', fontSize: 16, lineHeight: 23 },
  optionDescription: { color: colors.muted, fontSize: 12, lineHeight: 18, marginTop: 3 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: colors.muted },
  radioSelected: { borderWidth: 5, borderColor: colors.green },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: colors.ink },
  levels: { flexDirection: 'row', gap: 8 },
  level: { flex: 1, minHeight: 48, padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  selectedLevel: { backgroundColor: colors.ink, borderColor: colors.ink },
  levelText: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  selectedLevelText: { color: 'white' },
  button: { backgroundColor: colors.green, paddingHorizontal: 18, paddingVertical: 17, minHeight: 54, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: 'white', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  secondaryButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
  secondaryButtonText: { color: colors.green },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.7 },
  history: { gap: 12, marginTop: 8 },
  historyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  historyScore: { color: colors.green, fontSize: 20, fontWeight: '700' },
  footer: { color: colors.muted, fontSize: 12, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  back: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  backText: { fontSize: 15, color: colors.green, fontWeight: '600' },
  progressHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  progressCount: { color: colors.ink, fontSize: 14, fontWeight: '600' },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.green },
  questionCard: { backgroundColor: colors.paper, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 22, gap: 18, marginTop: 8 },
  question: { fontSize: 27, lineHeight: 37, fontWeight: '700', color: colors.ink, marginBottom: 12 },
  input: { minHeight: 64, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 22, color: colors.ink, backgroundColor: colors.background },
  inputInvalid: { borderColor: '#A33C27' },
  errorText: { color: '#A33C27', fontSize: 14, lineHeight: 20 },
  feedback: { padding: 16, borderRadius: 12, gap: 12 },
  correct: { backgroundColor: colors.lightGreen },
  incorrect: { backgroundColor: colors.orange },
  answer: { color: colors.green, fontSize: 18, lineHeight: 26, fontWeight: '700' },
  resultCard: { padding: 24, borderRadius: 20, backgroundColor: colors.lightGreen, gap: 12 },
  resultNumber: { color: colors.green, fontSize: 64, fontWeight: '800', letterSpacing: -2 },
  resultDenominator: { fontSize: 32, color: colors.muted, letterSpacing: 0 },
  reviewCard: { padding: 18, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 16, gap: 10 },
  warning: { backgroundColor: colors.orange, color: '#733A0B', padding: 14, borderRadius: 10, fontSize: 14, lineHeight: 20 },
});
