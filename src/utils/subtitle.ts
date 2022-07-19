import { Subtitle } from "../type/Subtitle";

export const mergeSubtitles = (subtitleA: Subtitle, subtitleB: Subtitle) => {
  const maxLength = Math.max(
    subtitleA.subtitles.length,
    subtitleB.subtitles.length
  );
  const mergeSubtitles = [];
  for (let i = 0; i < maxLength; i += 1) {
    const a = subtitleA.subtitles[i] || '';
    const b = subtitleB.subtitles[i] || '';
    mergeSubtitles.push(`${a} ${b}`);
  }
  return {
    id: subtitleA.id,
    start: subtitleA.start,
    end: subtitleB.end,
    subtitles: mergeSubtitles,
  };
};
