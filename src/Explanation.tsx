import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { AdditionHelp } from './AdditionHelp';
import { MultiplicationHelp } from './MultiplicationHelp';
import { getPercentMultiplication } from './multiplication';
import { pickPendelLine } from './pendel';
import type { Question } from './training';

export function Explanation({ question, answer }: { question: Question; answer: number | null }) {
  const timesOne = getPercentMultiplication(question)?.multiplier === 1;
  const [line] = useState(() => pickPendelLine(timesOne ? 'times-one' :
    answer === null ? 'skipped' : answer === question.answerMinor ? 'correct' : 'incorrect'));
  return <>
    {!timesOne && line && <Text style={styles.pendel}>Пендель: {line}</Text>}
    <Text style={styles.body}>{question.explanation}</Text>
    <AdditionHelp question={question} />
    <MultiplicationHelp question={question} timesOneLine={timesOne ? line : null} />
  </>;
}

const styles = StyleSheet.create({
  pendel: { fontSize: 15, lineHeight: 23, color: '#245D46', fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 24, color: '#202A26' },
});
