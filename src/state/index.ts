import { useCallback, useEffect, useState } from 'react';
import { BehaviorSubject, debounceTime, Observable, Subject } from 'rxjs';

export const useObservable = <T, S extends Observable<T>>(
  source: S,
  initailValue: T
): [T] => {
  // const [_source, setSource] = useState(source);
  const [value, setValue] = useState<T>(initailValue);
  useEffect(() => {
    const subscription = source.subscribe({
      next: (newValue) => {
        console.log('debug on set value to useObservable inner state, source:', source, ', new value:', newValue, ', old value:', value, ' changed:', newValue !== value);
        setValue(newValue);
      },
    });
    return () => subscription.unsubscribe();
  }, [source, value]);
  return [value];
};

export const useSubject = <T, S extends Subject<T>>(
  subject: S,
  initailValue: T
): [T, (value: T) => void] => {
  const [value] = useObservable(subject, initailValue);
  return [value, (value: T) => subject.next(value)];
};

export const useBehavior = <T>(
  behaviorSubject: BehaviorSubject<T>,
  initailValue: T
) => {
  return useSubject(behaviorSubject, initailValue);
};
