import { BehaviorSubject, Subject } from 'rxjs';
import { Subtitle } from '../type/Subtitle';
export type StandaloneSubtitleProps = {
  fromZoneId: string;
  title: string;
  filePath: string; 
  subtitles$: BehaviorSubject<Subtitle[]>;
  seekTo: (time: number) => void;
  playing$: BehaviorSubject<boolean>;
  loopingSubtitle$: BehaviorSubject<Subtitle | null>;
  scrollToIndex$: BehaviorSubject<number>;
  intensive$: BehaviorSubject<boolean>;
  intensiveStrategyIndex$: BehaviorSubject<number>;
  onSubtitlesChange: (nextSubtitles: Subtitle[]) => void;
  onScrollToIndexChange: (nextScrollToIndex: number) => void;
  onLoopingSubtitleChange: (subtitle: Subtitle | null) => void;
  onPlayingChange: (playing: boolean) => void;
  onIntensiveChange: (intensive: boolean) => void;
};

export type FetchStandalonePropsAction = {
  fromZoneId: string;
}

export type OpenStandaloneAction = {
  fromZoneId: string;
  title: string;
  filePath: string; 
}

type ZoneId = string;

export const openStandaloneSubtitle$ = new Subject<OpenStandaloneAction>();
export const fetchStandaloneProps$ = new Subject<FetchStandalonePropsAction>();
export const standaloneSubtitleProps$ = new Subject<StandaloneSubtitleProps>();
export const subtitleReadyToFeedStandaloneProps$ = new Subject<ZoneId>();

export const addSubtitleInput$ = new Subject<Subtitle>();