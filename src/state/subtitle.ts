import { BehaviorSubject, Subject } from 'rxjs';
import { Subtitle } from '../type/Subtitle';

export const openStandaloneSubtitle$ = new Subject<{
  title: string;
  filePath: string; 
  subtitles$: BehaviorSubject<Subtitle[]>;
  seekTo: (time: number) => void;
  isPlaying$: BehaviorSubject<boolean>;
  loopingSubtitle$: BehaviorSubject<Subtitle | null>;
  scrollToIndex$: BehaviorSubject<number>;
  onSubtitlesChange: (nextSubtitles: Subtitle[]) => void;
  onScrollToIndexChange: (nextScrollToIndex: number) => void;
  onLoopingSubtitleChange: (subtitle: Subtitle | null) => void;
  onPlayingChange: (playing: boolean) => void;
}>();
