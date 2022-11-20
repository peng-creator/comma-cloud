import { Clipboard } from '@capacitor/clipboard';

export const writeToClipboard = async (text: string) => {
  await Clipboard.write({
    string: text,
  });
};

export const checkClipboard = async () => {
  const { type, value } = await Clipboard.read();
  const p = document.createElement('p');
  p.innerHTML = value;
  return p.textContent;
};

