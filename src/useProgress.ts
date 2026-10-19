import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { emptyProgress, readProgress, updateProgress } from './progress';
import type { Action } from './progress';

export const STORAGE_KEY = 'kickstudy.progress.v1';

export function useProgress() {
  const [progress, setProgress] = useState(emptyProgress);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const writes = useRef(Promise.resolve());
  const persisted = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      const loaded = readProgress(raw);
      if (!cancelled) {
        persisted.current = JSON.stringify(loaded);
        setProgress(loaded);
        setReady(true);
      }
    }).catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, [loadAttempt]);

  useEffect(() => {
    if (!ready) return;
    const snapshot = JSON.stringify(progress);
    if (snapshot === persisted.current) return;
    // Serialize writes so a slower earlier answer cannot overwrite a newer one.
    writes.current = writes.current.then(async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, snapshot);
        persisted.current = snapshot;
        setSaveError(false);
      } catch {
        setSaveError(true);
      }
    });
  }, [progress, ready]);

  const dispatch = useCallback((action: Action) => setProgress(current => updateProgress(current, action)), []);
  return { progress, dispatch, ready, loadError, saveError, retryLoad: () => setLoadAttempt(value => value + 1) };
}
