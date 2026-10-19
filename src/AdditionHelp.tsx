import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { getBasketAddition } from './addition';
import { formatAmount } from './training';
import type { Question } from './training';

export function AdditionHelp({ question }: { question: Question }) {
  const [expanded, setExpanded] = useState(false);
  const work = getBasketAddition(question);
  if (!work) return null;
  return (
    <View style={styles.container}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded }} aria-expanded={expanded}
        accessibilityLabel="Как сложить цены по разрядам?"
        onPress={() => setExpanded(current => !current)}
        style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}>
        <View style={styles.label}>
          <Text style={styles.toggleTitle}>Как сложить цены по разрядам?</Text>
          <Text style={styles.hint}>{expanded ? 'Скрыть подробный разбор' : 'Показать по шагам, если пока непонятно'}</Text>
        </View>
        <Text aria-hidden style={styles.chevron}>{expanded ? '−' : '+'}</Text>
      </Pressable>
      {expanded && <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.sectionTitle}>1. Разложим каждую цену</Text>
        <Text style={styles.body}>Все суммы ниже — в рублях. Ноль означает, что в цене нет этого разряда.</Text>
        {work.prices.map((price, index) => <Text key={index} style={styles.equation}>
          {formatAmount(price.priceMinor)} = {price.partsMinor.map(formatAmount).join(' + ')}
        </Text>)}

        <Text accessibilityRole="header" style={styles.sectionTitle}>2. Сложим одинаковые разряды</Text>
        {work.groups.map(group => <View key={group.placeMinor} style={styles.step}>
          <Text style={styles.stepTitle}>{group.label}</Text>
          <Text style={styles.equation}>{group.partsMinor.map(formatAmount).join(' + ')} = {formatAmount(group.totalMinor)} ₽</Text>
        </View>)}

        <Text accessibilityRole="header" style={styles.sectionTitle}>3. Соберём общую сумму</Text>
        {work.carries.length > 0 && <>
          <Text style={styles.equation}>{work.groups.map(group => formatAmount(group.totalMinor)).join(' + ')} ₽</Text>
          <Text style={styles.body}>Часть суммы можно перенести в следующий разряд: например, 10 единиц — это 1 десяток. Общая сумма не меняется.</Text>
          {work.carries.map((carry, index) => <View key={index} style={styles.step}>
            <Text style={styles.stepTitle}>{carry.from} → {carry.to}</Text>
            <Text style={styles.equation}>{formatAmount(carry.totalMinor)} = {formatAmount(carry.movedMinor)} + {formatAmount(carry.remainderMinor)} ₽</Text>
            <Text style={styles.body}>Переносим {formatAmount(carry.movedMinor)} ₽ в следующий разряд. Там: {formatAmount(carry.nextBeforeMinor)} + {formatAmount(carry.movedMinor)} = {formatAmount(carry.nextAfterMinor)} ₽.</Text>
          </View>)}
        </>}
        <Text style={styles.result}>{work.normalizedPartsMinor.length > 1 ? `${work.normalizedPartsMinor.map(formatAmount).join(' + ')} = ` : 'Итого: '}{formatAmount(work.resultMinor)} ₽</Text>
        <Text style={styles.body}>Это сумма всей корзины до скидок.</Text>
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
  result: { color: '#245D46', fontSize: 16, lineHeight: 24, fontWeight: '700' },
});
