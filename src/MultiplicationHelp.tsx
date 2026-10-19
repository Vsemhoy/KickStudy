import { useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getPercentMultiplication } from './multiplication';
import { formatAmount } from './training';
import type { Question } from './training';

const PLACE_NAMES = ['Единицы', 'Десятки', 'Сотни', 'Тысячи', 'Десятки тысяч', 'Сотни тысяч'];

export function MultiplicationHelp({ question, timesOneLine = null }: { question: Question; timesOneLine?: string | null }) {
  const [expanded, setExpanded] = useState(false);
  const work = getPercentMultiplication(question);
  if (!work) return null;
  const expression = `${formatAmount(work.multiplicandMinor)} × ${work.multiplier}`;
  return (
    <View style={styles.container}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }}
        accessibilityLabel={`Как умножить ${expression}?`}
        onPress={() => setExpanded(current => !current)}
        style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}>
        <View style={styles.label}>
          <Text style={styles.toggleTitle}>Как умножить {expression}?</Text>
          <Text style={styles.hint}>{expanded ? 'Скрыть подробный разбор' : 'Показать по шагам, если пока непонятно'}</Text>
        </View>
        <Text aria-hidden style={styles.chevron}>{expanded ? '−' : '+'}</Text>
      </Pressable>
      {expanded && <View style={styles.content}>
        {work.multiplier === 1 ? <>
          {timesOneLine && <>
            <Text style={styles.sectionTitle}>А не надо умножать {expression} столбиком!</Text>
            <Text style={styles.body}>Пендель: {timesOneLine}</Text>
          </>}
          <Text style={styles.body}>При умножении на 1 число не меняется. Один раз берём {formatAmount(work.multiplicandMinor)} — получаем те же {formatAmount(work.multiplicandMinor)}.</Text>
        </> : <>
        <Text style={styles.body}>1% = {formatAmount(work.multiplicandMinor)} ₽. Чтобы найти {work.multiplier}%, умножаем {formatAmount(work.multiplicandMinor)} на {work.multiplier}.</Text>
        {work.decimalPlaces > 0 && <Text style={styles.body}>
          Сначала считаем без запятой: {work.integerFactor} × {work.multiplier}. В конце отделим справа {work.decimalPlaces === 1 ? 'одну цифру' : 'две цифры'} запятой.
        </Text>}
        <Text accessibilityRole="header" style={styles.sectionTitle}>Умножаем по цифрам справа налево</Text>
        {work.steps.map((step, index) => <View key={step.place} style={styles.step}>
          <Text style={styles.stepTitle}>{index + 1}. {PLACE_NAMES[index] ?? `Разряд ${step.place}`}: {step.digit}</Text>
          <Text style={styles.equation}>{work.integerFactor} × {step.digit} = {step.digitProduct}</Text>
          {step.place > 1 && <>
            <Text style={styles.body}>Здесь {step.digit} означает {step.digit * step.place}, поэтому результат умножаем ещё на {step.place}.</Text>
            <Text style={styles.equation}>{step.digitProduct} × {step.place} = {step.partialProduct}</Text>
          </>}
          {step.digit === 0 && <Text style={styles.body}>Нулевой разряд даёт 0. Следующий разряд остаётся на своём месте.</Text>}
        </View>)}
        <Text accessibilityRole="header" style={styles.sectionTitle}>{work.steps.length > 1 ? 'Складываем результаты столбиком' : 'Записываем результат столбиком'}</Text>
        <ScrollView horizontal contentContainerStyle={styles.columnContainer}>
          <Text selectable style={styles.column} accessibilityLabel={
            `${work.integerFactor} умножить на ${work.multiplier}. ${work.steps.map(step => step.partialProduct).join(' плюс ')} равно ${work.integerProduct}.`
          }>{work.column}</Text>
        </ScrollView>
        {work.decimalPlaces > 0 && <Text style={styles.body}>Возвращаем запятую: {work.integerProduct} ÷ {10 ** work.decimalPlaces} = {formatAmount(work.resultMinor)}.</Text>}
        </>}
        <Text style={styles.result}>{work.multiplier}% = {expression} = {formatAmount(work.resultMinor)} ₽.</Text>
        {question.skill === 'discount' && <Text style={styles.body}>Это размер скидки. К оплате: {formatAmount(work.multiplicandMinor * 100)} − {formatAmount(work.resultMinor)} = {formatAmount(question.answerMinor)} ₽.</Text>}
      </View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderTopWidth: 1, borderTopColor: '#D6D8CD', marginTop: 4 },
  toggle: { flexDirection: 'row', gap: 12, alignItems: 'center', minHeight: 60, paddingVertical: 12 },
  label: { flex: 1, gap: 4 },
  toggleTitle: { color: '#245D46', fontSize: 16, lineHeight: 23, fontWeight: '700' },
  hint: { color: '#626D66', fontSize: 12, lineHeight: 18 },
  chevron: { color: '#245D46', fontSize: 24, width: 24, textAlign: 'center' },
  pressed: { opacity: 0.7 },
  content: { gap: 14, paddingTop: 4 },
  sectionTitle: { fontSize: 16, lineHeight: 23, fontWeight: '700', color: '#202A26' },
  body: { color: '#202A26', fontSize: 14, lineHeight: 21 },
  step: { gap: 7, paddingLeft: 12, borderLeftWidth: 2, borderLeftColor: '#A4BAA9' },
  stepTitle: { color: '#626D66', fontSize: 13, lineHeight: 19, fontWeight: '600' },
  equation: { color: '#202A26', fontSize: 17, lineHeight: 25, fontWeight: '600', fontVariant: ['tabular-nums'] },
  columnContainer: { flexGrow: 1, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  column: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 24, lineHeight: 32, color: '#245D46' },
  result: { color: '#245D46', fontSize: 16, lineHeight: 24, fontWeight: '700' },
});
