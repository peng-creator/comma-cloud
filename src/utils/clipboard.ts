import { message } from 'antd';
import { shareReplay } from 'rxjs';
import { Clipboard } from '@capacitor/clipboard';
import { from, Subject, switchMap, timer, filter } from 'rxjs';

export const writeToClipboard = async (text: string) => {
  await Clipboard.write({
    string: text,
  });
};

export const checkClipboard = async () => {
  const { type, value } = await Clipboard.read();
  return value;
};

let clipboardValue = '';

export const receiveClipboard$ = new Subject<string>();

receiveClipboard$.subscribe({
  next(value) {
    console.log('copy ', value);
    writeToClipboard(value);
    clipboardValue = value;
  }
});

export const outputClipboard$ = timer(0, 1000).pipe(
  switchMap(() => {
    return from(checkClipboard().then((value) => {
      if (value !== clipboardValue) {
        return value;
      }
      return '';
    }).catch((err) => {
      console.error('checkClipboard error: ' + err.toString());
      return '';
    }));
  }),
  filter((value) => value !== undefined && value !== '' && value !== null),
  shareReplay(1),
);

outputClipboard$.subscribe({
  next(value) {
    console.log('timer getting Clipboard value:', value);
    clipboardValue = value;
  }
});
