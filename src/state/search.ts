import { debounceTime, tap, map, } from 'rxjs/operators';
import { bufferWhen, merge, shareReplay, Subject, } from "rxjs";

export const tapWord$ = new Subject<string>();

const sentence$ = new Subject<string>();

sentence$.pipe(debounceTime(100)).subscribe({
  next(s) {
    s.split(/\s/).forEach((w) => {
      tapWord$.next(w);
    });
  },
});

export const searchSentence = (s: string) => {
  sentence$.next(s);
};

let tapCache = '';

const clearCache$ = new Subject<''>();

clearCache$.subscribe({
  next() {
    tapCache = '';
  },
});

export const tapCache$ = merge(
  tapWord$.pipe(
    tap((word) => {
      tapCache += (' ' + word);
    }),
    map(() => tapCache),
  ),
  clearCache$,
).pipe(
  shareReplay(1),
)

export const tapSearch$ = tapWord$.pipe(
  bufferWhen(() => tapWord$.pipe(debounceTime(1500))),
  tap(() => {
    clearCache$.next('');
  }),
  map((words) => {
    return words.join(" ")
        .trim()
        .replace(/^\p{P}+/u, "")
        .replace(/\p{P}+$/u, "");
  }),
  shareReplay(1),
);

export const textSearch$ = new Subject<string>();

export const search$ = merge(tapSearch$, textSearch$).pipe(shareReplay(1));
