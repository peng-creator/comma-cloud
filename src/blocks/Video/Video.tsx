import {
  Button,
  Col,
  Dropdown,
  List,
  Menu,
  message,
  Popconfirm,
  Switch,
  Tooltip,
} from "antd";
import React, {
  CSSProperties,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import ReactPlayer from "react-player";
import {
  getSubtitlesOfVideo,
  saveSubtitlesOfVideo,
} from "../../service/http/Subtitle";
import { Subtitle } from "../../type/Subtitle";
import { Resizable } from "re-resizable";
import { host } from "../../utils/host";
import { BehaviorSubject } from "rxjs";
import { SubtitleComponent } from "../Subtitle/Subtitle";
import { remoteControlInput$, remoteControlOutput$ } from "../../state/remoteContol";
import { saveRecord } from "../../service/http/Records";
import { playSubtitleRecord$ } from "../../state/video";
import { defaultIntensiveStrategy } from "../../type/SubtitlePlayStrategy";
import { useBehavior, useDebouncedEffect } from "../../state";

export const Video = ({
  filePath,
  subtitle,
  style,
  title,
  zoneId,
  layoutMode,
}: {
  style: CSSProperties;
  filePath: string;
  subtitle?: Subtitle;
  zoneId: string;
  title: string;
  layoutMode: number;
}) => {
  const [subtitles, _setSubtitles] = useState([] as Subtitle[]);
  const ref = useRef<ReactPlayer | null>(null);
  const player = ref.current;
  const [playing, setPlaying] = useState(false);
  const [subtitleLooping, _setSubtitleLooping] = useState<Subtitle | null>(null);
  const [scrollToIndex, _setScrollToIndex] = useState(0);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [videoFocus, setVideoFocus] = useState(false);
  const [ready, setReady] = useState(false);
  const [outSideSubtitlePlayed, setOutSideSubtitlePlayed] = useState(false);

  const [subtitles$] = useState(new BehaviorSubject<Subtitle[]>([]));
  const [loopingSubtitle$] = useState(
    new BehaviorSubject<Subtitle | null>(null)
  );
  const [isPlaying$] = useState(
    new BehaviorSubject<boolean>(playing)
  );
  const [scrollToIndex$] = useState(new BehaviorSubject<number>(0));
  const [startPublishingData, setStartPublishingData] = useState(false);
  const [intensive, setIntensive] = useState(true);
  const [intensive$] = useState(new BehaviorSubject(true));
  const [intensiveStrategy, setIntensiveStrategy] = useState(defaultIntensiveStrategy);
  const [insiveStrategyIndex$] = useState(new BehaviorSubject(0));
  const [seekingBack, setSeekingBack] = useState(false);
  const [insiveStrategyIndex, setInsiveStrategyIndex] = useBehavior(insiveStrategyIndex$, 0);
  const [insiveSubtitle, setInsiveSubtitle] = useState<Subtitle | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [intensiveTimer, setIntensiveTimer] = useState<any>(null);

  const seekTo = useCallback((time: number, unit?: "seconds" | "fraction" ) => {
    player?.seekTo(time, unit);
    setSeekingBack(true);
  }, [player]);

  useEffect(() => {
    if (seekingBack) {
      const timer = setTimeout(() => {setSeekingBack(false)}, 500);
      return () => clearTimeout(timer);
    }
  }, [seekingBack])

  const setSubtitleLooping = (sub: Subtitle | null) => {
    _setSubtitleLooping(sub);
    if (sub !== null) {
      setPlaybackRate(1);
      setInsiveSubtitle(null);
      console.log(`setInsiveStrategyIndex(0)`);
      setInsiveStrategyIndex(0);
      setIntensive(false);
    }
  };

  const setScrollToIndex = useCallback((index: number) => {
    setInsiveSubtitle(null);
    _setScrollToIndex(index);
    const sub = subtitles[index];
    if (sub) {
      seekTo(sub.start / 1000);
    }
    if (intensive) {
      console.log(`debug-001, setInsiveSubtitle(sub):`, sub);
      setInsiveSubtitle(sub);
    }
    console.log(`debug-001, setInsiveStrategyIndex(0)`);
    message.info('setInsiveStrategyIndex to 0');
    setInsiveStrategyIndex(0);
    setPlaybackRate(1);
    console.log(`debug-001, clearInterval: ${intensiveTimer}`);
    clearInterval(intensiveTimer);
  }, [subtitles, intensive, seekTo, intensiveTimer]); 

  useEffect(() => {
    intensive$.next(intensive);
  }, [intensive, intensive$]);

  useEffect(() => {
    message.info(`精听模式已${intensive ? '打开' : '关闭'}`);
    if (intensive) {
      setSubtitleLooping(null);
    }
  }, [intensive]);

  useEffect(() => {
    if (intensive) {
      const playHow = intensiveStrategy[insiveStrategyIndex];
      message.info(`精听循环第 ${insiveStrategyIndex + 1} 遍，${playHow.speed} 倍速`, 1);
    }
  }, [intensive, insiveStrategyIndex]);

  useEffect(() => {
    if (!subtitles || subtitles.length === 0 || !subtitles[scrollToIndex]) {
      return;
    }
    saveRecord({
      file: filePath,
      progress: subtitles[scrollToIndex],
      type: 'video',
    });
    playSubtitleRecord$.next({
      ...subtitles[scrollToIndex],
      file: filePath,
      zoneId,
    });
  }, [scrollToIndex, filePath, subtitles, zoneId]);

  useEffect(() => {
    subtitles$.next(subtitles);
  }, [subtitles, subtitles$]);

  useEffect(() => {
    loopingSubtitle$.next(subtitleLooping);
  }, [subtitleLooping, loopingSubtitle$]);

  useEffect(() => {
    isPlaying$.next(playing);
  }, [isPlaying$, playing]);

  useEffect(() => {
    scrollToIndex$.next(scrollToIndex);
  }, [scrollToIndex, scrollToIndex$]);


  const setSubtitles = useCallback((subtitles: Subtitle[]) => {
    if (subtitles && subtitles.length > 0) {
      _setSubtitles(subtitles);
      saveSubtitlesOfVideo(filePath, subtitles);
    }
  }, [filePath]);

  const publishSubtitles = useCallback(() => {
    remoteControlInput$.next({
      toZoneId: zoneId,
      action: 'setSubtitles',
      data: {
        subtitles,
      }
    });
  }, [zoneId, subtitles]);

  useEffect(() => {
    if (!startPublishingData) {
      return;
    }
    publishSubtitles();
  }, [startPublishingData, publishSubtitles])

  const publishScrollToIndex = useCallback(() => {
    remoteControlInput$.next({
      toZoneId: zoneId,
      action: 'scrollToIndex',
      data: {
        nextScrollToIndex: scrollToIndex,
      }
    });
  }, [zoneId, scrollToIndex]);

  useEffect(() => {
    if (!startPublishingData) {
      return;
    }
    publishScrollToIndex();
  }, [startPublishingData, publishScrollToIndex])

  const publishSubtitleLooping = useCallback(() => {
    remoteControlInput$.next({
      toZoneId: zoneId,
      action: 'loopingSubtitle',
      data: {
        subtitle: subtitleLooping,
      }
    });
  }, [zoneId, subtitleLooping]);

  useEffect(() => {
    if (!startPublishingData) {
      return;
    }
    publishSubtitleLooping();
  }, [startPublishingData, publishSubtitleLooping,])

  const publishPlayingChange = useCallback(() => {
    remoteControlInput$.next({
      toZoneId: zoneId,
      action: 'playingChange',
      data: {
        playing
      }
    }) 
  }, [zoneId, playing]);

  useEffect(() => {
    if (!startPublishingData) {
      return;
    }
    publishPlayingChange();
  }, [startPublishingData, publishPlayingChange]);

  const publishIntensiveChange = useCallback(() => {
    remoteControlInput$.next({
      toZoneId: zoneId,
      action: 'intensiveChange',
      data: {
        intensive
      }
    })
  }, [zoneId, intensive]);

  useEffect(() => {
    if (!startPublishingData) {
      return;
    }
    publishIntensiveChange();
  }, [startPublishingData, publishIntensiveChange]);

  const publishInsiveStrategyIndexChange = useCallback(() => {
    remoteControlInput$.next({
      toZoneId: zoneId,
      action: 'insiveStrategyIndexChange',
      data: {
        insiveStrategyIndex
      }
    });
  }, [zoneId, insiveStrategyIndex]);

  useEffect(() => {
    if (!startPublishingData) {
      return;
    }
    publishInsiveStrategyIndexChange();
  }, [startPublishingData, publishInsiveStrategyIndexChange]);

  useEffect(() => {
    const sp = remoteControlOutput$.subscribe({
      next({toZoneId, action, data,}) {
        if (toZoneId !== zoneId) {
          return;
        }
        if (action === 'seekTime') {
          player?.seekTo(data.time, 'seconds');
        }
        if (action === 'setSubtitles') {
          setSubtitles(data.nextSubtitles);
        }
        if (action === 'scrollToIndex') {
          console.log('setScrollToIndex');
          setScrollToIndex(data.nextScrollToIndex);
        }
        if (action === 'loopingSubtitle') {
          const nextLoopingSubtitle = data.subtitle;
          if (!nextLoopingSubtitle) {
            setSubtitleLooping(null);
            return;
          }
          if (subtitleLooping === null || nextLoopingSubtitle.start !== subtitleLooping.start && data.subtitle.end !== subtitleLooping.end) {
            setSubtitleLooping(nextLoopingSubtitle);
          }
        }
        if (action === 'playingChange') {
          setPlaying(data.playing)
        }
        if (action === 'intensiveChange') {
          setIntensive(data.intensive);
        }
        if (action === 'startControl') {
          console.log('new remote controller, start to feed data');
          // feed the data to remote contoller
          setStartPublishingData(true);
          publishSubtitles();
          publishScrollToIndex();
          publishSubtitleLooping();
          publishPlayingChange();
          publishIntensiveChange();
          publishInsiveStrategyIndexChange();
        }
      },

    });
    return () => sp.unsubscribe();
  }, [player, 
      zoneId, 
      publishSubtitles,
      publishScrollToIndex,
      publishSubtitleLooping,
      publishPlayingChange,
      publishIntensiveChange,
      setScrollToIndex,
    ]);

  useEffect(() => {
    if (outSideSubtitlePlayed) {
      // 此hook自动播放props传入的subtitle, 但只自动播放一次。
      return;
    }
    const player = ref.current;
    if (player === null) {
      return;
    }
    if (!ready) {
      return;
    }
    if (subtitle) {
      seekTo(subtitle.start / 1000, "seconds");
      const currentTime = subtitle.start + 1;
      const subtileFound = subtitles.find(
        (s) => s.start <= currentTime && s.end >= currentTime
      );
      if (subtileFound) {
        const nextScrollToIndex = subtitles.findIndex(
          (s) => s === subtileFound
        );
        console.log('setScrollToIndex');
        setScrollToIndex(nextScrollToIndex);
        // setSubtitleLooping(subtileFound);
        setPlaying(true);
        setOutSideSubtitlePlayed(true);
      }
    }
  }, [subtitle, outSideSubtitlePlayed, ref, ready, subtitles]);

  useEffect(() => {
    const player = ref.current;
    if (player === null) {
      return;
    }
    if (playing && subtitleLooping !== null) {
      let timer = setInterval(() => {
        const currentTime = player.getCurrentTime() * 1000;
        console.log("while looping, currentTime: ", currentTime);
        if (currentTime >= subtitleLooping.end || currentTime <= subtitleLooping.start - 1000) {
          console.log('seekTo to loop start:', subtitleLooping.start / 1000);
          seekTo(subtitleLooping.start / 1000, "seconds");
        }
      }, 50);
      return () => {
        clearInterval(timer);
      };
    }
  }, [playing, ref, subtitleLooping]);

  useEffect(() => {
    console.log("effect executed");
    const player = ref.current;
    if (player === null) {
      return;
    }
    if (subtitleLooping) {
      console.log("subtitleLooping === true");
      return;
    }
    if (intensive) {
      return;
    }
    if (!playing) {
      console.log("playing === false");
      return;
    }
    console.log("playing:", playing);
    console.log("playing && autoPlayBySubtitle === true");
    setPlaybackRate(1);
    let currentSubtitle: Subtitle | null = null;
    let timer = setInterval(() => {
      console.log("timer runing");
      const currentTime = player.getCurrentTime() * 1000;
      if (currentSubtitle === null) {
        console.log("trying to find currentSubtitle");
        const subtileFound = subtitles.find(
          (s) => s.start <= currentTime && s.end >= currentTime
        );
        if (subtileFound) {
          console.log("subtileFound:", subtileFound);
          currentSubtitle = subtileFound;
          console.log('setScrollToIndex');
          _setScrollToIndex(subtitles.findIndex((s) => s === currentSubtitle));
        }
        return;
      }
      if (
        currentTime < currentSubtitle.start - 1 ||
        currentTime > currentSubtitle.end + 1
      ) {
        console.log("currentTime is not in the period of currentSubtitle.");
        console.log("currentTime:", currentTime);
        console.log("currentSubtitle:", currentSubtitle);
        console.log("set currentSubtitle to null");
        currentSubtitle = null;
      }
    }, 50);
    return () => {
      console.log("clear timer");
      clearInterval(timer);
    };
  }, [playing, ref, subtitles, subtitleLooping, intensive]);

  useEffect(() => {
    console.log('debug-001, :', playing, ref, subtitles, subtitleLooping, intensive, intensiveStrategy, insiveStrategyIndex, seekingBack, insiveSubtitle);
    // 精读 effect
    const player = ref.current;
    if (player === null) {
      return;
    }
    if (subtitleLooping) {
      return;
    }
    if (!playing) {
      return;
    }
    if (!intensive) {
      return;
    }
    if (seekingBack) {
      console.log('seekingBack, return intensive!!');
      return;
    }
    const findSubtitleByTime = (time: number) => {
      return subtitles.find(
        (s) => s.start <= time && s.end >= time
      ) || null;
    }
    let timer = setInterval(() => {
      const currentTime = player.getCurrentTime() * 1000;
      if (insiveSubtitle === null) {
        const subtileFound = findSubtitleByTime(currentTime);
        if (subtileFound) {
          console.log('setScrollToIndex');
          setScrollToIndex(subtitles.findIndex((s) => s === subtileFound));
          const nextInsiveStrategyIndex = 0;
          let currentPlayHow = intensiveStrategy[nextInsiveStrategyIndex];
          setPlaybackRate(currentPlayHow.speed);
          console.log(`setInsiveStrategyIndex(${nextInsiveStrategyIndex})`);
          setInsiveStrategyIndex(nextInsiveStrategyIndex);
          console.log('set insiveStrategyIndex to 0, playing:', playing);
        }
        return;
      }
      console.log('check insiveStrategyIndex, currentTime:', currentTime);
      if (currentTime > insiveSubtitle.end - 1 && insiveStrategyIndex < intensiveStrategy.length - 1) {
        console.log('debug-001, currentTime:', currentTime, ' insiveSubtitle:', insiveSubtitle, ' in timer:', timer);
        console.log('insiveStrategyIndex:', insiveStrategyIndex);
        const nextInsiveStrategyIndex = insiveStrategyIndex + 1;
        console.log(`setInsiveStrategyIndex(${nextInsiveStrategyIndex})`);
        setInsiveStrategyIndex(nextInsiveStrategyIndex);
        let currentPlayHow = intensiveStrategy[nextInsiveStrategyIndex];
        setPlaybackRate(currentPlayHow.speed);
        seekTo(insiveSubtitle.start / 1000);
        return;
      }
      if (
        currentTime < insiveSubtitle.start - 1 ||
        currentTime > insiveSubtitle.end + 1
      ) {
        console.log('check insiveStrategyIndex, set currentSubtitle as null, insiveStrategyIndex:', insiveStrategyIndex, "currentTime > currentSubtitle.end - 1", currentTime > insiveSubtitle.end - 1, '&& insiveStrategyIndex < intensiveStrategy.length - 1:', insiveStrategyIndex < intensiveStrategy.length - 1);
        if (insiveStrategyIndex < intensiveStrategy.length - 1) {
          return;
        }
        setInsiveSubtitle(null);
      }
    }, 50);
    console.log('debug-001, setInterval timer:', timer);
    setIntensiveTimer(timer);
    return () => {
      console.log('debug-001, clearInterval timer:', timer);
      clearInterval(timer);
    };
  }, [playing, ref, subtitles, subtitleLooping, intensive, intensiveStrategy, insiveStrategyIndex, seekingBack, insiveSubtitle]);

  useEffect(() => {
    getSubtitlesOfVideo(filePath).then((subtitles) => {
      console.log("got subtitles of ", filePath, " ==> ", subtitles);
      _setSubtitles(subtitles || []);
    });
  }, [filePath]);

  const url = `http://${host}:8080/resource` + filePath;
  console.log("play url:", url);

  return (
    <div
      style={{
        ...style,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: layoutMode === 0 ? 'flex-start' : 'center'
      }}
      ref={wrapperRef}
    >
      <Resizable
        maxWidth="100%"
        minWidth="356px"
        minHeight="200px"
        handleStyles={{
          left: {
            display: "flex",
            alignItems: "center",
            height: "100%",
            width: "25px",
            left: "-12.5px",
          },
          right: {
            display: "flex",
            alignItems: "center",
            height: "100%",
            width: "25px",
            right: "-12.5px",
          },
        }}
        handleComponent={{
          left: (
            <div
              style={{
                width: "25px",
                height: "25px",
                borderRadius: "50%",
                background: "#a976ec",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: "15px",
                  height: "15px",
                  borderRadius: "50%",
                  background: "#ccc",
                }}
              ></div>
            </div>
          ),
          right: (
            <div
              style={{
                width: "25px",
                height: "25px",
                borderRadius: "50%",
                background: "#a976ec",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              {" "}
              <div
                style={{
                  width: "15px",
                  height: "15px",
                  borderRadius: "50%",
                  background: "#ccc",
                }}
              ></div>{" "}
            </div>
          ),
        }}
        enable={{
          right: videoFocus && true,
          left: videoFocus && true,
        }}
        defaultSize={{
          width: "100%",
          height: "auto",
        }}
      >
        <div
          style={{ width: "100%", position: "relative", paddingTop: "56.25%" }}
          tabIndex={0}
          onFocus={() => {
            setVideoFocus(true);
          }}
          onBlur={() => {
            setVideoFocus(false);
          }}
        >
          <ReactPlayer
            ref={ref}
            url={url}
            playing={playing}
            playbackRate={playbackRate}
            onPlaybackRateChange={(rate: number) => {
              setPlaybackRate(rate);
            }}
            width="100%"
            height="100%"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              minHeight: "200px",
            }}
            onReady={() => {
              setReady(true);
            }}
            onPause={() => setPlaying(false)}
            onPlay={() => setPlaying(true)}
            playsinline
            loop
            controls
            onError={(err, data) => {
              console.log("video error:", err);
              console.log("video error data:", data);
            }}
          />
        </div>
      </Resizable>
      <div style={{
        width: '100%',
        flexGrow: 1,
        display: layoutMode === 0 ? 'flex' : 'none',
      }}>
        {player !== null && (
          <SubtitleComponent
            layoutMode={layoutMode}
            fromZoneId={zoneId}
            title={title}
            filePath={filePath}
            subtitles$={subtitles$}
            isPlaying$={isPlaying$}
            seekTo={(time) => seekTo(time, 'seconds')}
            loopingSubtitle$={loopingSubtitle$}
            scrollToIndex$={scrollToIndex$}
            intensive$={intensive$}
            insiveStrategyIndex$={insiveStrategyIndex$}
            onSubtitlesChange={(nextSubtitles: Subtitle[]) => {
              setSubtitles(nextSubtitles);
            }}
            onScrollToIndexChange={(nextScrollToIndex: number) => {
              console.log('setScrollToIndex');
              setScrollToIndex(nextScrollToIndex);
            }}
            onLoopingSubtitleChange={(subtitle: Subtitle | null) => {
              setSubtitleLooping(subtitle);
            }}
            onPlayingChange={(playing: boolean) => {
              setPlaying(playing);
            }}
            onIntensiveChange={(intensive) => {
              setIntensive(intensive);
            }}
          />
        )}
      </div>
    </div>
  );
};
